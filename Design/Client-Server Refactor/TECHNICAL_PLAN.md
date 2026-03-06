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

## Phase 3: P2PTransport + HostGameServer — COMPLETE

**Files created:**
- `src/server/HostGameServer.js` (78 lines) — Server-side orchestrator for P2P host mode
- `src/server/__tests__/HostGameServer.test.js` — 15 tests passing
- `src/transport/P2PTransport.js` (87 lines) — Transport wrapping P2PManager + MessageQueue
- `src/transport/__tests__/P2PTransport.test.js` — 15 tests passing

**Key decisions:**
- `HostGameServer.processAction()` matches `GameEngine` interface — `LocalTransport` works unchanged
- `P2PTransport` routes `state_update_received` through `MessageQueue`, `action_ack_received` directly to callback
- `onQueueDrained` wired from `MessageQueue` to stored callback for phase animation playback

---

## Phase 3.5: Review Fixes — COMPLETE

Code review (code-reviewer + simplifier agents) found 2 MAJOR behavioral gaps, 2 CRITICAL Phase 4 blockers, and 5 MINOR quality issues. All fixed here.

### Critical fixes
- **C1**: `_executeAnimationPhase` null guard — AP line ~806 calls `this.animationManager.executeWithStateUpdate()` with no null guard. Added `if (!this.animationManager) return;` (prerequisite for Phase 4 server mode)
- **C2**: Phase 4 animationManager wiring documented below

### Major fixes
- **M1**: GameClient now handles action acks via `transport.onActionAck()` → `_onActionAck()`. Rejected actions with `authoritativeState` are applied (preserving local gameMode), preventing guest desync
- **M2**: GameClient now handles queue drain via `transport.onQueueDrained()` → `_onQueueDrained()`. Triggers `phaseAnimationQueue.startPlayback()` with 50ms delay after all queued messages are processed (multiplayer only)

### Minor fixes
- **m1**: Removed dead `_lastResult` assignments from GameClient
- **m2**: Replaced nested ternary in `_queuePhaseAnnouncements` with `PHASE_SUBTITLE_MAP` lookup
- **m3**: Parameterized `guestPlayerId` in HostGameServer constructor (default `'player2'`)
- **m4**: `Transport.onActionAck` now throws like `sendAction`/`onResponse`; `LocalTransport` overrides as no-op
- **m5**: Updated stale comment in GameServer.js

### Deferred items (resolved in Phase 5)
- ~~`GameClient extends GameServer` naming oddity~~ — kept as-is (correct interface inheritance)
- ~~`MessageQueue` in `server/` used by `transport/`~~ — moved to `transport/`
- ~~No `dispose()` on HostGameServer~~ — not needed (no owned resources to clean up)
- ~~`_collectAnimations` dual-format support~~ — flat array path removed (confirmed unused)

---

## Phase 4: Rewire GameServerFactory + App.jsx — COMPLETE

**Files modified:**
- `src/transport/LocalTransport.js` — `sendAction` now awaits callback and returns `result`
- `src/transport/P2PTransport.js` — `sendAction` now returns `{ success: true, pending: true }`
- `src/transport/__tests__/LocalTransport.test.js` — Added return value + await tests (11 tests)
- `src/transport/__tests__/P2PTransport.test.js` — Added return value test (16 tests)
- `src/server/GameServerFactory.js` — Rewritten to create Transport + GameClient
- `src/server/__tests__/GameServerFactory.test.js` — Rewritten for new factory (10 tests)
- `src/App.jsx` — Added `gameServerRef`, removed `server.initialize()`, passed ref to `useAnimationSetup`
- `src/hooks/useAnimationSetup.js` — Accepts `gameServerRef`, sets `animationManager` on `GameClient`

**Key decisions:**
- `gameServerRef` bridges `useAnimationSetup` (called before `useMemo`) to the `GameClient` instance
- `AnimationManager` set on `GameClient` via ref, not passed to constructor (timing: `useEffect` runs after render, by which time `useMemo` has populated the ref)
- `ActionProcessor.animationManager` stays null — all AP methods have null guards from Phase 3.5
- `LocalTransport.sendAction` returns `result` and `await`s callback (timing parity with old `LocalGameServer.submitAction`)
- `P2PTransport.sendAction` returns `{ success: true, pending: true }` (matches old `RemoteGameServer`)

---

## Phase 5: Delete Old Servers + Cleanup — COMPLETE

**Files deleted:**
- `src/server/LocalGameServer.js` — replaced by GameClient + LocalTransport
- `src/server/RemoteGameServer.js` — replaced by GameClient + P2PTransport
- `src/server/__tests__/LocalGameServer.test.js` — tests for deleted class
- `src/server/__tests__/RemoteGameServer.test.js` — tests for deleted class
- `src/utils/stateComparisonUtils.js` — zero imports, was only used by RemoteGameServer

**Files moved:**
- `src/server/MessageQueue.js` → `src/transport/MessageQueue.js`
- `src/server/__tests__/MessageQueue.test.js` → `src/transport/__tests__/MessageQueue.test.js`

**Changes:**
- Guest action routing rewired: `P2PManager` → `HostGameServer.handleGuestAction()` (was `AP.processGuestAction()`)
- `AP.processGuestAction()` deleted — replaced by `HostGameServer.handleGuestAction()`
- `isNetworkAction` flag removed from `AP.processAction()` — guest turn validation now runs through GameEngine
- `P2PManager.setActionProcessor()` removed — replaced by `p2pManager.hostGameServer` set in GameServerFactory
- `_collectAnimations` flat array branch removed (confirmed unused)
- Stale `RemoteGameServer` references updated across comments and tests
- `StateRedactor` import removed from ActionProcessor (was only used by deleted `processGuestAction`)

**Key decisions:**
- D1: `setGameServer(GameClient)` pattern kept — correct interface-based injection, no benefit from replacement
- D2: Guest actions routed through `HostGameServer.handleGuestAction()` which processes via GameEngine with full validation
- D3: `isNetworkAction` bypass removed — guest actions now validated by turn check (correct: they arrive on guest's turn)
- D4: `stateComparisonUtils.js` deleted — zero imports anywhere
- D5: `AP.setAnimationManager` kept — still actively used internally

---

## Critical Files

| File | Phase | Action |
|-|-|-|
| `src/transport/Transport.js` | 1 | Created |
| `src/transport/LocalTransport.js` | 1 | Created |
| `src/transport/__tests__/LocalTransport.test.js` | 1 | Created (8 tests) |
| `src/client/GameClient.js` | 2 | Created |
| `src/client/__tests__/GameClient.test.js` | 2 | Created (35 tests) |
| `src/server/HostGameServer.js` | 3 | Created (15 tests) |
| `src/server/__tests__/HostGameServer.test.js` | 3 | Created |
| `src/transport/P2PTransport.js` | 3 | Created (15 tests) |
| `src/transport/__tests__/P2PTransport.test.js` | 3 | Created |
| `src/server/GameServerFactory.js` | 4 | Rewrite |
| `src/App.jsx` | 4 | Update |
| `src/server/LocalGameServer.js` | 5 | Deleted |
| `src/server/RemoteGameServer.js` | 5 | Deleted |
| `src/utils/stateComparisonUtils.js` | 5 | Deleted |
| `src/transport/MessageQueue.js` | 5 | Moved from server/ |
| `src/network/P2PManager.js` | 5 | Updated (guest action routing) |
| `src/managers/ActionProcessor.js` | 5 | Cleaned (processGuestAction, isNetworkAction removed) |

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
