# Implementation: Unified Client Delivery

## Current Architecture

```
Server produces animations
├── _emitToClients (end-of-action) → LocalTransport → GameClient._onResponse [HOST]
└── broadcastIfNeeded (11 call sites) → P2P → P2PTransport → GameClient._onResponse [GUEST]
```

Two delivery mechanisms, different timing, different animation batching. BroadcastService manages its own animation accumulation (`captureAnimations`), state priority (`setPendingStates`), and authority guard (`_isHost()`).

## Target Architecture

```
Server produces animations
└── _emitToClients (end-of-action)
    └── for each registered client: redact(state, playerId) → callback({state, animations})
```

One delivery mechanism. Both local and remote clients register via `GameEngine.registerClient()`. The server doesn't know or care what the callbacks do — one passes data in-process, one serializes over P2P.

## Implementation Steps

### Step 1: Timing Fix

**File:** `src/managers/GameFlowManager.js`

Line 720 — store the async promise so `waitForPendingActionCompletion` catches it:

```javascript
// Before (fire-and-forget):
this.onSimultaneousPhaseComplete(currentPhase, phaseCommitments);

// After (awaited via _pendingActionCompletion):
this._pendingActionCompletion = this.onSimultaneousPhaseComplete(currentPhase, phaseCommitments);
```

**Why:** `GameEngine.processAction` calls `gameFlowManager.waitForPendingActionCompletion()` which awaits `_pendingActionCompletion`. This ensures the full phase cascade completes before `_emitToClients` fires.

### Step 2: Register P2P Client via HostGameServer

**File:** `src/server/HostGameServer.js`

- Remove `broadcastService` parameter from constructor
- Register a P2P callback in GameEngine for the guest player
- Remove `broadcastIfNeeded` calls from `processAction` (line 26) and `handleGuestAction` (line 41)

```javascript
constructor(gameEngine, { p2pManager = null, guestPlayerId = 'player2' } = {}) {
  this.gameEngine = gameEngine;
  this.p2pManager = p2pManager;
  this.guestPlayerId = guestPlayerId;

  // Register P2P delivery as a GameEngine client
  if (p2pManager) {
    this.gameEngine.registerClient(guestPlayerId, ({ state, animations }) => {
      if (!p2pManager.isConnected) return;
      p2pManager.broadcastState(
        state,
        animations?.actionAnimations || [],
        animations?.systemAnimations || []
      );
    });
  }
}
```

### Step 3: Promise.all in _emitToClients

**File:** `src/server/GameEngine.js`

Change sequential await to parallel delivery with error isolation:

```javascript
async _emitToClients(state, animations) {
  const promises = [];
  for (const [playerId, callback] of this._clients) {
    const redactedState = StateRedactor.redactForPlayer(state, playerId);
    promises.push(
      Promise.resolve(callback({ state: redactedState, animations }))
        .catch(err => debugLog('STATE_SYNC', `Client ${playerId} delivery failed`, { error: err.message }))
    );
  }
  await Promise.all(promises);
}
```

**Why Promise.all:** Both callbacks fire simultaneously. P2P returns immediately (~1ms), local blocks for animation playback (~1800ms). `Promise.all` waits for both, preserving back-pressure. Error isolation prevents P2P failure from blocking local delivery.

### Step 4: Remove All broadcastIfNeeded Calls

| File | Line | Trigger |
|-|-|-|
| `src/managers/ActionProcessor.js` | 753 | `bypass_animation` |
| `src/managers/ActionProcessor.js` | 831 | `animation_phase` |
| `src/managers/GameFlowManager.js` | 343 | `round_transition_both_passed` / `phase_transition_both_passed` |
| `src/managers/GameFlowManager.js` | 601 | `placement_commitments_applied` |
| `src/managers/GameFlowManager.js` | 635 | `simultaneous_to_sequential` |
| `src/managers/GameFlowManager.js` | 661 | `simultaneous_to_simultaneous` |
| `src/managers/GameFlowManager.js` | 946 | `round_initialization` |
| `src/logic/actions/CommitmentStrategy.js` | 159 | `commitment` |
| `src/logic/actions/MiscActionStrategy.js` | 50 | `${statusType}Consumption` |

### Step 5: Clean Up ActionProcessor

**File:** `src/managers/ActionProcessor.js`

Remove BroadcastService infrastructure:

| What | Lines | Action |
|-|-|-|
| `import BroadcastService` | top | Remove import |
| `import { addTeleportingFlags }` | 9 | Remove import |
| `this.broadcastService = new BroadcastService(...)` | 160 | Remove |
| `this.p2pManager` field | 169 | Remove |
| `broadcastService.captureAnimations(...)` in `executeAndCaptureAnimations` | 750 | Remove (keep `_actionAnimationLog` push at 747) |
| `broadcastService.broadcastIfNeeded(...)` in `executeAndCaptureAnimations` | 753 | Remove |
| `broadcastService.captureAnimations(...)` in `captureAnimationsForBroadcast` | 301 | Remove (keep `_actionAnimationLog` push at 282) |
| `_executeAnimationPhase` method | 817-833 | Remove entire method |
| `prepareTeleportStates` method | 771-808 | Remove entire method |
| `getAndClearPendingActionAnimations` | 756-758 | Remove |
| `getAndClearPendingSystemAnimations` | 760-762 | Remove |
| `setP2PManager` method | 366-369 | Remove entirely |
| `clearQueue` → `this.broadcastService.reset()` | ~905 | Remove the reset() call |
| `executeAnimationPhase` in context | 233 | Remove from context object |
| `broadcastService` in context | 312 | Remove from context object |

### Step 6: Remove executeAnimationPhase From Strategies

| File | Lines | Change |
|-|-|-|
| `src/logic/actions/DroneActionStrategy.js` | 63-68 | Remove `newPlayerStates` computation + `executeAnimationPhase` call |
| `src/logic/actions/CombatActionStrategy.js` | 142-178 | Remove mine/attack phase split + all `executeAnimationPhase` calls |
| `src/logic/actions/CombatActionStrategy.js` | ~516 | Remove `executeAnimationPhase` call |
| `src/logic/actions/CardActionStrategy.js` | 127, 147 | Remove both `executeAnimationPhase` calls |
| `src/logic/actions/ShipAbilityStrategy.js` | 77 | Remove `executeAnimationPhase` call |

**Mine/attack safety note:** The mine/attack two-phase split (CombatActionStrategy lines 147-178) existed solely for intermediate-state broadcasting via BroadcastService. With unified delivery, all animations arrive as a single batch. `AnimationManager.executeWithStateUpdate` already handles this correctly — it splits by timing (`pre-state` mine destruction plays while mine exists in DOM, then state update removes it, then `post-state` attack animations play). This is exactly how the host/single-player already works.

### Step 7: Delete BroadcastService

- Delete `src/services/BroadcastService.js`
- Delete `src/services/__tests__/BroadcastService.test.js`

### Step 8: Update Wiring

**`src/server/GameServerFactory.js:19`:**
```javascript
// Before:
const hostServer = new HostGameServer(gameEngine, actionProcessor.broadcastService, { p2pManager });
// After:
const hostServer = new HostGameServer(gameEngine, { p2pManager });
```

**`src/AppRouter.jsx:114`:**
```javascript
// Remove this line:
gameStateManager.actionProcessor.broadcastService.setGameServer(server);
```

**`src/managers/GameStateManager.js:145`:**
```javascript
// Remove this line (setP2PManager no longer exists):
this.actionProcessor.setP2PManager(p2pManager);
```

### Step 9: Update Tests

| Test File | Changes |
|-|-|
| `src/server/__tests__/HostGameServer.test.js` | Remove `broadcastIfNeeded` mock, update constructor calls |
| `src/server/__tests__/GameServerFactory.test.js` | Remove `broadcastService` from mock AP |
| `src/server/__tests__/GameEngine.test.js` | Remove `broadcastService` mocks |
| `src/managers/__tests__/GameFlowManager.test.js` | Remove `broadcastService: { broadcastIfNeeded: vi.fn() }` (3 places) |
| `src/managers/__tests__/PhaseFlowCoverage.test.js` | Remove `broadcastService` mock |
| `src/managers/__tests__/ActionProcessor.test.js` | Remove `broadcastService` tests (capture/clear/pending) |
| `src/test/helpers/phaseTestHelpers.js` | Remove `broadcastService` mocks (lines 183, 319) |

## Verification

1. `npx vitest run` — all tests pass
2. Single-player game: deployment works, animations play, phase announcements show
3. Multiplayer game to deployment phase:
   - Host sees 3 announcements (ROUND, UPKEEP, DEPLOYMENT PHASE)
   - Guest sees same 3 announcements
4. Full multiplayer round: attacks, deployments, abilities animate correctly for both players
5. Teleport animations work (deploy a drone with teleport ability)

## Risk Assessment

**Medium risk** — touches ~20 files but changes are uniform (remove BroadcastService references). The core logic change is small (timing fix + P2P client registration + Promise.all).

**Verified safe:**
- Mine/attack two-phase: host/SP already handles single-batch delivery via AnimationManager timing split
- Teleport states: GameClient already handles `addTeleportingFlags` client-side
- Async chain: `GameEngine` → `gameFlowManager.waitForPendingActionCompletion()` → `this._pendingActionCompletion` — correct field, correct object

## Files Summary

| File | Change Type |
|-|-|
| `src/managers/GameFlowManager.js` | Timing fix + remove 5 broadcast calls + comments |
| `src/server/GameEngine.js` | Promise.all in _emitToClients |
| `src/server/HostGameServer.js` | Register P2P client, remove broadcastService |
| `src/server/GameServerFactory.js` | Remove broadcastService from HostGameServer args |
| `src/managers/ActionProcessor.js` | Remove BroadcastService, _executeAnimationPhase, prepareTeleportStates |
| `src/managers/GameStateManager.js` | Remove setP2PManager call |
| `src/logic/actions/DroneActionStrategy.js` | Remove executeAnimationPhase call |
| `src/logic/actions/CombatActionStrategy.js` | Remove executeAnimationPhase calls + mine/attack split |
| `src/logic/actions/CardActionStrategy.js` | Remove executeAnimationPhase calls |
| `src/logic/actions/ShipAbilityStrategy.js` | Remove executeAnimationPhase call |
| `src/logic/actions/CommitmentStrategy.js` | Remove broadcastIfNeeded call |
| `src/logic/actions/MiscActionStrategy.js` | Remove broadcastIfNeeded call |
| `src/AppRouter.jsx` | Remove broadcastService wiring |
| `src/services/BroadcastService.js` | **DELETE** |
| `src/services/__tests__/BroadcastService.test.js` | **DELETE** |
| 7 test files | Remove broadcastService mocks |
