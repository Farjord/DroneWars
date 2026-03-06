# Client-Server Refactor — Technical Plan

## Architecture

### Transport Interface

Abstract base class defining the communication contract between `GameClient` and any server:

```javascript
class Transport {
  async sendAction(type, payload) {}   // Send action to server
  onResponse(callback) {}              // Register { state, animations, result } handler
  onActionAck(callback) {}             // Optional: P2P action acknowledgements
  dispose() {}                         // Cleanup
}
```

### Implementations

| Transport | Used By | Wraps | Latency |
|-|-|-|-|
| `LocalTransport` | Single-player, P2P host | `GameEngine` or `HostGameServer` directly | 0ms (in-process) |
| `P2PTransport` | P2P guest | `P2PManager` + `MessageQueue` | Network RTT |
| `FirebaseTransport` | Future cloud mode | Firestore listeners + Cloud Functions | Network RTT |

### GameClient

Extends `GameServer` interface. Single class used by all modes:

- Delegates actions to `Transport.sendAction()`
- Receives `{ state, animations }` via `Transport.onResponse()`
- Plays animations via `AnimationManager`
- Implements `stateProvider` protocol (`applyPendingStateUpdate`, `revealTeleportedDrones`, `getAnimationSource`)
- Handles `TELEPORT_IN` flag injection
- Queues phase announcements (multiplayer only)
- Pushes state to `ClientStateStore`

### HostGameServer

Server-side orchestrator for P2P host mode:

- Wraps `GameEngine` + `BroadcastService`
- `processAction(type, payload)` — processes via GameEngine, broadcasts to guests, returns response
- `handleGuestAction(action)` — processes guest action, broadcasts, sends ack via P2PManager
- Exposes same `processAction` interface as `GameEngine` so `LocalTransport` works unchanged

---

## Phase 1: Transport + LocalTransport — COMPLETE

**Files created:**
- `src/transport/Transport.js` — Abstract base class
- `src/transport/LocalTransport.js` — In-process transport calling `GameEngine.processAction()`
- `src/transport/__tests__/LocalTransport.test.js` — 8 tests passing

**Key decisions:**
- `LocalTransport` takes a `gameEngine` (or `HostGameServer`) and `playerId`
- Applies `StateRedactor.redactForPlayer()` before delivering response
- Response delivered synchronously via callback (no network simulation)

---

## Phase 2: GameClient — COMPLETE

**Files created:**
- `src/client/GameClient.js` — Unified client (202 lines)
- `src/client/__tests__/GameClient.test.js` — 35 tests passing

**Key decisions:**
- Extends `GameServer` abstract interface for drop-in compatibility
- Absorbs `RemoteGameServer`'s phase announcement logic and stateProvider protocol
- Constructor takes: `transport`, `clientStateStore`, `playerId`, `isMultiplayer`, `phaseAnimationQueue`, `animationManager`
- `_onResponse()` handles animation playback with TELEPORT_IN support
- `_collectAnimations()` normalizes both `{ actionAnimations, systemAnimations }` objects and flat arrays

---

## Phase 3: P2PTransport + HostGameServer — PARTIAL

### HostGameServer — Created, needs tests

**File:** `src/server/HostGameServer.js` (77 lines)

- `processAction(type, payload)` — delegates to `GameEngine`, broadcasts via `BroadcastService`
- `handleGuestAction(action)` — processes guest action, broadcasts, sends ack (success or error with authoritative state)
- Same `processAction` signature as `GameEngine` — `LocalTransport` calls it transparently

### P2PTransport — Not yet created

**File to create:** `src/transport/P2PTransport.js`

Wraps `P2PManager` + `MessageQueue` for unreliable P2P channel:

```javascript
class P2PTransport extends Transport {
  constructor(p2pManager) {
    this.p2pManager = p2pManager;
    this.messageQueue = new MessageQueue({ processMessage, onResyncNeeded, ... });
    // Subscribe to P2P events, route to MessageQueue or ack handler
  }

  async sendAction(type, payload) {
    this.p2pManager.sendActionToHost(type, payload);
  }

  onResponse(callback) { this._responseCallback = callback; }
  onActionAck(callback) { this._ackCallback = callback; }
  dispose() { /* cleanup subscriptions */ }
}
```

### Remaining work

1. Write `HostGameServer` tests — processAction flow, guest action handling, error/ack paths
2. Create `P2PTransport.js` — wraps P2PManager + MessageQueue
3. Write `P2PTransport` tests — sendAction, message routing, ack handling, resync

---

## Phase 4: Rewire GameServerFactory + App.jsx

### GameServerFactory changes

```javascript
// Current: creates LocalGameServer or RemoteGameServer based on gameMode
// New: creates Transport + GameClient for all modes

GameServerFactory.create(gameMode, deps) {
  const gameEngine = new GameEngine(gsm, ap, gfm);

  if (gameMode === 'local') {
    const transport = new LocalTransport(gameEngine, { playerId: 'player1' });
    return new GameClient(transport, { clientStateStore, playerId: 'player1' });
  }

  if (gameMode === 'host') {
    const hostServer = new HostGameServer(gameEngine, broadcastService, { p2pManager });
    const transport = new LocalTransport(hostServer, { playerId: 'player1' });
    return new GameClient(transport, { clientStateStore, playerId: 'player1', isMultiplayer: true, ... });
  }

  if (gameMode === 'guest') {
    const transport = new P2PTransport(p2pManager);
    return new GameClient(transport, { clientStateStore, playerId: 'player2', isMultiplayer: true, ... });
  }
}
```

### AP animationManager

- Server mode: `ActionProcessor.animationManager` set to null — animations collected but not played
- Client mode: `GameClient` owns `AnimationManager` for playback
- The `if (this.animationManager)` guards in AP already handle this

### Files affected

| File | Change |
|-|-|
| `src/server/GameServerFactory.js` | Rewrite to create Transport + GameClient |
| `src/App.jsx` | Update initialization to pass animationManager to GameClient |

---

## Phase 5: Delete Old Servers + Cleanup

### Files to delete

| File | Reason |
|-|-|
| `src/server/LocalGameServer.js` | Replaced by GameClient + LocalTransport |
| `src/server/RemoteGameServer.js` | Replaced by GameClient + P2PTransport |
| `src/server/__tests__/LocalGameServer.test.js` | Tests for deleted class |
| `src/server/__tests__/RemoteGameServer.test.js` | Tests for deleted class |

### setGameServer() replacement

Replace `GameStateManager.setGameServer()` with `setSessionConfig({ localPlayerId, isMultiplayer, isPlayerAI })`:
- Removes GSM's dependency on GameServer instance
- Passes only the data GSM actually needs (player identity, mode flags)
- Updates: `AIPhaseProcessor`, `GSM`, `ActionProcessor`, `BroadcastService`

### Cleanup tasks

- Remove `gameMode` branching from client-layer code
- Update any imports referencing deleted files
- Verify no remaining references to `LocalGameServer` or `RemoteGameServer`

---

## Critical Files

| File | Phase | Action |
|-|-|-|
| `src/transport/Transport.js` | 1 | Created |
| `src/transport/LocalTransport.js` | 1 | Created |
| `src/transport/__tests__/LocalTransport.test.js` | 1 | Created (8 tests) |
| `src/client/GameClient.js` | 2 | Created |
| `src/client/__tests__/GameClient.test.js` | 2 | Created (35 tests) |
| `src/server/HostGameServer.js` | 3 | Created (needs tests) |
| `src/server/__tests__/HostGameServer.test.js` | 3 | To create |
| `src/transport/P2PTransport.js` | 3 | To create |
| `src/transport/__tests__/P2PTransport.test.js` | 3 | To create |
| `src/server/GameServerFactory.js` | 4 | Rewrite |
| `src/App.jsx` | 4 | Update |
| `src/server/LocalGameServer.js` | 5 | Delete |
| `src/server/RemoteGameServer.js` | 5 | Delete |
| `src/server/GameStateManager.js` | 5 | Update (setSessionConfig) |

---

## Verification

### Per-phase

- Unit tests for each new/modified file
- `npm test` full suite must pass before committing

### Integration

- Manual test: single-player game (local transport)
- Manual test: P2P host (HostGameServer + local transport)
- Manual test: P2P guest (P2PTransport)

### Regression

- All existing tests pass without modification (except tests for deleted files)
- No `gameMode` branching remains in client layer after Phase 5
