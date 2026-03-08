# PRD: Unified Client Delivery

## Problem Statement

During the first multiplayer game test after the client-server refactor, the host (player 1) only saw the "ROUND 1" phase announcement but missed "UPKEEP" and "DEPLOYMENT PHASE". The guest (player 2) saw all three correctly.

Root cause: the server has **two separate delivery mechanisms** for pushing state and animations to clients:

1. **`GameEngine._emitToClients`** — pushes to registered callbacks after action processing completes. Used by the local client (host/single-player) via `LocalTransport`.
2. **`BroadcastService.broadcastIfNeeded`** — captures animations during processing and sends via P2P to the remote guest. Called from 11 scattered call sites across ActionProcessor, GameFlowManager, CommitmentStrategy, MiscActionStrategy, and HostGameServer.

A timing bug in `GameFlowManager.checkSimultaneousPhaseCompletion` (line 720) calls `onSimultaneousPhaseComplete` without `await`, causing the phase transition cascade to run as a detached microtask. `_emitToClients` fires before the cascade completes, so the host receives only the first announcement. The guest works because `broadcastIfNeeded` fires incrementally during the cascade.

## User Goal

> "I want to be confident that for 99% of problems, if I've tested them in single player, they will also work in multiplayer."

This is achieved by ensuring the **game logic, animation delivery, and phase transition code has zero multiplayer-specific branching**. The only multiplayer-specific code should be inherently network-related (P2P connection, serialization, disconnect handling).

## Success Criteria

1. **Single delivery path**: `GameEngine._emitToClients` is the only mechanism for delivering `{state, animations}` to all clients. No other code pushes state to clients.
2. **BroadcastService eliminated**: No `broadcastIfNeeded`, `captureAnimations`, `setPendingStates`, or any other BroadcastService method exists in the codebase.
3. **Game logic is mode-agnostic**: ActionProcessor, GameFlowManager, and all strategy files contain zero references to broadcast, P2P, or multiplayer-specific delivery.
4. **Host sees all announcements**: In multiplayer, the host sees ROUND, UPKEEP, and DEPLOYMENT PHASE announcements (matching guest behavior).
5. **All tests pass**: No regressions in the existing test suite.
6. **SP test confidence**: Any bug reproducible in single-player is guaranteed to also be fixed in multiplayer, because the same code path executes.

## Scope

### In Scope

- Eliminate `BroadcastService` class and all references
- Register P2P delivery as a `GameEngine` client (same mechanism as `LocalTransport`)
- Fix timing bug in `GameFlowManager.checkSimultaneousPhaseCompletion`
- Remove `_executeAnimationPhase` and `prepareTeleportStates` from ActionProcessor (only existed for BroadcastService)
- Remove all `executeAnimationPhase` calls from strategies
- Update all affected tests

### Out of Scope

- Transport abstraction changes (LocalTransport/P2PTransport stay as-is)
- AnimationManager changes (already handles single-batch delivery)
- GameClient changes (already unified via `_onResponse`)
- Network-level concerns (P2P connection, reconnection, desync handling)

## Audit Trail

### Log Analysis (First Multiplayer Test)

**Guest (Player 2) — All Correct:**
- INIT_TRACE [1-8]: All 8 steps, correct order
- MP_SYNC_TRACE: seq=1 through seq=18, no gaps
- Phase announcements: RT-GC fires 3 times (roundAnnouncement, UPKEEP, DEPLOYMENT PHASE)
- PAQ playback: RT-17→RT-18/19(x3)→RT-20, all 3 announcements in 5.4s

**Host (Player 1) — One Bug:**
- All other traces correct (INIT, MP_JOIN, MP_GAME, COMMIT, PHASE, ROUND, STATE_CHECKPOINT)
- Phase announcements: RT-GC fires only ONCE (roundAnnouncement). UPKEEP and DEPLOYMENT PHASE never reach GameClient.
- PAQ playback: RT-17 starts with queueLength=1, RT-20 fires after just 1 announcement

### Race Condition Timeline

```
processAction('commitment')
  ├── processCommitment()
  │     ├── store p2 commitment → emit COMMITMENT_UPDATE
  │     └── listener → checkSimultaneousPhaseCompletion()
  │           └── onSimultaneousPhaseComplete() [NOT AWAITED — fire-and-forget]
  │                 ├── transitionToPhase('roundAnnouncement')
  │                 │     └── executeAndCaptureAnimations → push to _actionAnimationLog ✓
  │                 │           └── broadcastIfNeeded → guest gets it ✓
  │                 ├── ...microtask yield... ← _emitToClients fires HERE (race!)
  │                 │     Host receives only roundAnnouncement
  │                 ├── transitionToPhase('roundInitialization')
  │                 │     └── UPKEEP pushed to log (too late for host)
  │                 │           └── broadcastIfNeeded → guest gets it ✓
  │                 └── transitionToPhase('deployment')
  │                       └── DEPLOYMENT PHASE pushed to log (too late for host)
  │                             └── broadcastIfNeeded → guest gets it ✓
```

### Code Review Results

Two independent reviews (architectural + simplicity) both approved the approach:

- **Architecture review**: Confirmed single-emitter pattern via `_emitToClients` with `Promise.all` is the correct industry pattern (observer/pub-sub with async fan-out). Verified mine/attack two-phase animation is safe (host already handles single-batch delivery). Recommended Promise.all error isolation.
- **Simplicity review**: Confirmed BroadcastService elimination is the right granularity. Caught missing `clearQueue` reference. Recommended removing `setP2PManager` entirely.
