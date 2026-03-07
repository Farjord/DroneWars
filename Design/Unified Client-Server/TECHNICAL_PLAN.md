# Unified Client-Server Technical Plan

## Phase 1: GameEngine Event Emission (non-breaking)

**File**: `src/server/GameEngine.js`

Add client registration and push emission without removing existing return behavior.

### Changes
- Add `_clients` map (playerId -> callback)
- Add `registerClient(playerId, callback)` and `unregisterClient(playerId)`
- Add `_emitToClients()` that iterates registered clients, calls each with `{ state: StateRedactor.redactForPlayer(state, playerId), animations }`
- Call `_emitToClients()` at end of `processAction()`, after computing state+animations
- Keep existing `return { state, animations, result }` -- both paths work simultaneously

**Risk**: Zero. Existing code still works via return values. New event path is additive.

---

## Phase 2+3: Server Animation Removal + LocalTransport Async Push (atomic)

These phases are implemented together because they're interdependent: removing server-side animation playback requires the client to receive animations via push.

### Phase 2: ActionProcessor Changes

**File**: `src/managers/ActionProcessor.js`
- `_executeAnimationPhase()`: Remove `await this.animationManager.executeWithStateUpdate()`. Keep animation collection into `_actionAnimationLog` and BroadcastService capture. The method becomes: collect animations, prepare teleport states, broadcast, done.
- `executeAndCaptureAnimations()`: Remove `await this.animationManager.executeAnimations()`. Keep collection + BroadcastService capture.
- Remove stateProvider methods: `applyPendingStateUpdate()`, `revealTeleportedDrones()`, `getAnimationSource()` -- these move to GameClient (which already has its own copies).
- Remove `pendingStateUpdate`/`pendingFinalState` fields.

### Phase 3: LocalTransport Changes

**File**: `src/transport/LocalTransport.js`
- Constructor: call `this.gameEngine.registerClient(playerId, (response) => this._responseCallback?.(response))`
- `sendAction()`: call `this.gameEngine.processAction(type, payload)` but do NOT use return value for state/animations. Response arrives via registered callback. Return only `result` for ack.
- `dispose()`: call `this.gameEngine.unregisterClient(this.playerId)`
- Stop stripping animations: remove the `animations: { actionAnimations: [], systemAnimations: [] }` override.

### GameClient Confirmation

**File**: `src/client/GameClient.js`
- `_onResponse()` already handles animation playback via `this.animationManager.executeWithStateUpdate()`. This becomes THE animation player for all modes.
- Already has `applyPendingStateUpdate()`, `revealTeleportedDrones()`, `getAnimationSource()`.

---

## Phase 4: Phase Announcements as Server-Emitted Animations

### PhaseTransitionStrategy

**File**: `src/logic/actions/PhaseTransitionStrategy.js`
- Replace `phaseAnimationQueue.queueAnimation(newPhase, phaseText, subtitle, ...)` with pushing `{ animationName: 'PHASE_ANNOUNCEMENT', payload: { phase: newPhase, text: phaseText, subtitle } }` into systemAnimations via `ctx.captureSystemAnimations(...)` or `executeAndCaptureAnimations`.

### DroneActionStrategy

**File**: `src/logic/actions/DroneActionStrategy.js`
- Replace `phaseAnimationQueue.queueAnimation('playerPass', passText, ...)` with `PASS_ANNOUNCEMENT` system animation. Server knows which player passed but does NOT personalize text -- client handles that based on its `playerId`.

### GameClient

**File**: `src/client/GameClient.js`
- Add handling in `_onResponse()` for `PHASE_ANNOUNCEMENT` and `PASS_ANNOUNCEMENT` animation types: queue them into PhaseAnimationQueue.
- Delete `_queuePhaseAnnouncements()` (lines 246-288)
- Delete `_queuePassAnnouncements()` (lines 227-242)
- Delete "YOU PASSED" special case in `submitAction()` (lines 53-64)

---

## Phase 5: Eliminate isMultiplayer Branching in GameClient

**File**: `src/client/GameClient.js`

Remove every `_isMultiplayer` check:
- `submitAction` "YOU PASSED" -> deleted (Phase 4)
- `_onResponse` phase announcement guard -> deleted (Phase 4)
- `getAnimationSource()` -> always return `'SERVER'`
- `_applyState` guest-only `applyHostState()` -> call unconditionally (renamed `syncFromServer`)
- `_onQueueDrained` guard -> phase announcements now from server

Remove `_isMultiplayer` constructor parameter. Remove `isMultiplayer()` method.

### GameStateManager

**File**: `src/managers/GameStateManager.js`
- Rename `applyHostState` -> `syncFromServer`
- Remove player2-only guard (all modes sync from server push)

---

## Phase 6: Simplify/Delete Asymmetric Infrastructure

### Delete
- `src/managers/GuestCascadeRunner.js` -- Guest no longer does optimistic phase processing

### Simplify
- `src/server/HostGameServer.js` -- Thin setup helper, GameEngine's registerClient handles push
- `src/services/BroadcastService.js` -- Reduces to P2P forwarding adapter
- `src/managers/PhaseManager.js` -- Remove `isAuthority` parameter (server always has authority)
- `src/server/GameServerFactory.js` -- Remove `isMultiplayer` and `phaseAnimationQueue` from GameClient construction

### Clean up
- Remove `isMultiplayer()` from `GameServer.js` interface, `GameStateManager.js`, `GameFlowManager.js`

---

## Phase 7: PhaseAnimationQueue Ownership

**File**: `src/managers/ActionProcessor.js`
- Remove `phaseAnimationQueue` from constructor and `getInstance()`
- Remove `getPhaseAnimationQueue` from context object

**File**: `src/client/GameClient.js`
- PhaseAnimationQueue stays here
- Receives `PHASE_ANNOUNCEMENT` and `PASS_ANNOUNCEMENT` events from server responses

---

## Critical Files Summary

| File | Change |
|-|-|
| `src/server/GameEngine.js` | Add registerClient/emitToClients event push |
| `src/transport/LocalTransport.js` | Convert to async push, stop stripping animations |
| `src/client/GameClient.js` | Remove all isMultiplayer branches, universal animation player |
| `src/managers/ActionProcessor.js` | Remove animation playback, keep only collection |
| `src/logic/actions/PhaseTransitionStrategy.js` | Emit PHASE_ANNOUNCEMENT as animation events |
| `src/logic/actions/DroneActionStrategy.js` | Emit PASS_ANNOUNCEMENT as animation events |
| `src/server/GameServerFactory.js` | Unified creation, register P2P as engine client |
| `src/server/HostGameServer.js` | Simplify or delete |
| `src/services/BroadcastService.js` | Simplify to P2P forwarding adapter |
| `src/managers/GuestCascadeRunner.js` | Delete entirely |
| `src/managers/PhaseManager.js` | Remove isAuthority |
| `src/managers/GameStateManager.js` | Rename applyHostState -> syncFromServer |
| `src/managers/GameFlowManager.js` | Remove isMultiplayer checks, GuestCascadeRunner refs |

---

## Verification

After each phase:
1. `npm test` -- all existing tests pass
2. Single-player full game: start, play through rounds, AI works, animations correct
3. Multiplayer: both host and guest see identical announcements, animations
4. Teleport animations: pre-state (isTeleporting flags) and post-state (reveal) work
5. Round transitions: upkeep, discard, deployment, action phases announce correctly
6. No double-animations in any mode
7. No missing animations in any mode
