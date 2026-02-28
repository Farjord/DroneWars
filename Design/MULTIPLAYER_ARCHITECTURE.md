# Multiplayer Architecture

## 1. Core Principle: Guest Independence

The guest processes ALL actions independently and in real-time. The guest must never feel behind the host.

- **Host broadcasts are for authoritative reconciliation**, NOT for driving the guest's experience
- Guest infers phase announcements locally from state transitions
- Guest processes animations optimistically before host confirmation arrives
- Guest maintains its own UI state, including waiting overlays and phase text
- Host state replaces guest state at reconciliation boundaries — the guest never "waits" for the host to know what happened

**Why this matters**: In a P2P card game, network latency is variable. If the guest waited for host confirmation before showing results, every action would feel sluggish. The optimistic model means both players experience instant feedback.

---

## 2. Data Flow

### 2.1 Host Action Flow

```
User Input → ActionProcessor.queueAction()
  → State mutation (GameStateManager)
  → Animations generated (actionAnimations, systemAnimations)
  → broadcastStateToGuest(state, actionAnimations, systemAnimations)
  → Guest receives via STATE_UPDATE channel
```

### 2.2 Guest Action Flow

```
User Input → useActionRouting
  ├── Send to host: p2pManager.sendActionToHost(type, payload)
  └── Process locally (optimistic):
        → ActionProcessor.queueAction() locally
        → Animations generated + played immediately
        → OptimisticActionService.trackAction(animations)

Host processes action → broadcasts state + animations
  → GuestMessageQueueService receives
  → OptimisticActionService.filterAnimations() removes duplicates
  → If all filtered + states match → skip state application
  → If differences exist → apply authoritative host state
```

### 2.3 Simultaneous Phase Flow

```
Both players commit independently:
  Host: PhaseManager.notifyHostAction() → sets commitment
  Guest: sends PHASE_DONE to host → PhaseManager.notifyGuestAction()

PhaseManager.checkReadyToTransition():
  → Both committed? → GameFlowManager transitions
  → broadcastStateToGuest() with new phase state
  → Guest detects phase change via GMQS pattern matching
  → Guest queues local phase announcements
```

---

## 3. Component Responsibilities

| Component | Responsibility |
|-|-|
| P2PManager | WebRTC transport (Trystero/Firebase), room lifecycle, 5 communication channels |
| GuestSyncManager | Wires P2P events to ActionProcessor, owns OptimisticActionService, manages host state application |
| GuestMessageQueueService | Sequential host→guest message processing, OOO detection, resync triggering, animation timing coordination |
| OptimisticActionService | Tracks guest's optimistic animations, filters duplicates from host broadcasts via deep comparison |
| PhaseManager | Authoritative phase transitions (host-only), host/guest commitment tracking, phase categorization |
| GameFlowManager | Phase loop logic, all broadcastStateToGuest() call sites, round management, phase cascade logic |
| ActionProcessor | Action dispatch via queue, `broadcastStateToGuest()` implementation, `processGuestAction()` handler |
| useActionRouting | Routes guest actions: optimistic local processing + send to host. Deployment and action routing |
| useMultiplayerSync | React layer: waiting overlays, phase transition detection from prop changes, render completion signaling |

---

## 4. Synchronization Points

### Phase Categories

| Category | Phases | Behavior |
|-|-|-|
| Simultaneous | droneSelection, deckSelection, placement, mandatoryDiscard, optionalDiscard, allocateShields, mandatoryDroneRemoval | Both players commit atomically; transition when both ready |
| Sequential | deployment, action | Players pass alternately; turn-based within the phase |
| Automatic | roundInitialization | Transitions without player input; host processes and broadcasts |

### Milestone Validation

At phase boundaries, the guest validates its optimistic state against the host's authoritative state. Mismatches are resolved by accepting the host state. The `compareGameStates()` function checks a fixed set of fields for divergence.

---

## 5. Guest Phase Announcement Pattern

The guest independently infers pseudo-phases from state transitions because the host only broadcasts real phase changes, not UI announcements. This pattern-matching lives in `GuestMessageQueueService.processStateUpdate()`.

### Transition Pattern Table

| Pattern | From Phase | To Phase | Queued Announcements |
|-|-|-|-|
| 1 | `action` | any other | OPPONENT_PASSED (if guest passed first), ACTION_PHASE_COMPLETE, ROUND |
| 2 | `placement` | `roundInitialization` (Round 1) | ROUND |
| 2.5 | `deployment` | `action` | OPPONENT_PASSED (if guest passed first), DEPLOYMENT_COMPLETE |
| 3 | any | any (not covered above) | Generic phase text from `phaseTextMap` |

### Pass Detection

Pass announcements use `guestState.passInfo.firstPasser` to avoid redundant announcements. If the guest passed first, the OPPONENT_PASSED announcement is queued so the guest sees the host's pass notification.

### Adding New Phase Transitions

When adding a new phase or changing transition flow, you **must** add a corresponding pattern match in the GMQS `processStateUpdate` method. Without this, the guest will show no phase announcement for the new transition, or worse, fall through to the generic Pattern 3 with incorrect text.

---

## 6. Broadcast Trigger Points

All `broadcastStateToGuest()` call sites in `GameFlowManager.js`:

| Location | Trigger Reason | Context |
|-|-|-|
| `checkSimultaneousPhaseCompletion()` | `'phase_transition_both_passed'` | After simultaneous phase completes, both players committed |
| `detectTurnTransition()` | `'turn_transition'` | After action completes, next player's turn begins |
| `detectTurnTransition()` | `'go_again_action'` | After goAgain action, same player continues |
| `checkSimultaneousPhaseCompletion()` | (no parameter) | Placement phase complete, immediate broadcast before automatic cascade |
| `determineAndExecutePhaseLogic()` | (no parameter) | Simultaneous → Sequential phase transition |
| `determineAndExecutePhaseLogic()` | (no parameter) | Simultaneous → Simultaneous phase transition |
| `processRoundInitializationPhase()` | (no parameter) | After roundInitialization setup completes |

**Rule**: Every state mutation visible to both players must be followed by a broadcast. When adding new features that mutate shared state, ensure a broadcast follows. Missing broadcasts cause guest state to drift silently.

---

## 7. Resync Protocol

### Out-of-Order Detection

Messages carry a `sequenceId` incremented by the host's `broadcastSequence` counter. The guest tracks `lastProcessedSequence`.

1. **Detection**: If `sequenceId > lastProcessedSequence + 1`, message is stored in `pendingOutOfOrderMessages` map
2. **Threshold**: When `pendingOutOfOrderMessages.size > 3`, a full resync is triggered
3. **Trigger**: `triggerResync()` clears all queues, sets `isResyncing = true`, calls `p2pManager.requestFullSync()`
4. **Response**: Host sends full state with `isFullSync: true` flag via STATE_UPDATE channel
5. **Application**: `handleResyncResponse()` applies full state, updates sequence counter, clears resync flag

### Gap Filling

When a gap is filled (e.g., message 5 arrives after 4 was missing), `processPendingMessages()` advances through the pending map sequentially, pushing messages into the processing queue.

---

## 8. TELEPORT_IN Dual-State Protocol

Drone deployment uses a two-phase state application to coordinate reveal timing with animations:

1. **`pendingHostState`**: Modified state with `isTeleporting: true` flags on newly deployed drones. Applied at animation start — drones are invisible (teleporting in)
2. **`pendingFinalHostState`**: Original host state without `isTeleporting` flags. Applied at 70% through the TELEPORT_IN animation via `revealTeleportedDrones()` — drones become visible

The `addTeleportingFlags()` function creates the modified state. Both pending states are cleared in a `finally` block after AnimationManager completes.

**Why two states**: Without this, drones would either appear before the animation starts (jarring pop-in) or remain invisible until the entire animation completes (delayed feedback). The dual-state approach lets the animation control the exact reveal moment.

---

## 9. P2P Communication Channels

| Channel | Direction | Purpose |
|-|-|-|
| STATE_UPDATE | Host → Guest | Broadcasts state + animations; sequenced with broadcastSequence |
| GUEST_ACTION | Guest → Host | Guest optimistic actions sent to host for authoritative processing |
| PING / PONG | Bidirectional | Latency measurement |
| PHASE_DONE | Guest → Host | Phase completion signals for simultaneous phases |
| SYNC_REQ | Guest → Host | Full state resync requests (response via STATE_UPDATE with isFullSync flag) |

---

## 10. "Adding a Feature" Checklist

When adding any feature that affects game state visible to both players:

- [ ] **State mutation broadcasts**: Does the host broadcast after the state change? Check that `broadcastStateToGuest()` is called after the mutation
- [ ] **Guest optimistic processing**: Can the guest process this action locally without waiting for the host? If not, why?
- [ ] **Animation tracking**: If the action produces animations, does `useActionRouting` track them via `OptimisticActionService.trackAction()`?
- [ ] **Animation dedup**: Does `OptimisticActionService.filterAnimations()` correctly match the animation fields? Check that new animation types include the right comparison fields (`animationName`, `targetId`, `targetLane`, `targetPlayer`, `attackerId`, `sourceCardInstanceId`, `abilityId`, `teleportType`)
- [ ] **Phase transitions**: If adding a new phase, is it categorized in PhaseManager (simultaneous/sequential/automatic)?
- [ ] **Guest phase announcements**: If the new phase creates a transition the guest needs to announce, is there a pattern match in GMQS `processStateUpdate`?
- [ ] **State comparison**: If adding new state fields that should be validated, are they included in `compareGameStates()`?
- [ ] **Waiting overlays**: If the phase requires waiting for the opponent, is it handled in `useMultiplayerSync` commitment monitoring?
- [ ] **Pass handling**: If the phase involves passing, does `passInfo.firstPasser` get set correctly for both host and guest?

---

## 11. Code Review Findings

> Review conducted 2026-02-28. All findings are for discussion and future planning — no code changes.

### 11.1 Critical Issues (Race Conditions / State Divergence Risks)

**C1. Sequence counter advances before message is processed**
`GuestMessageQueueService.js:299` — `lastProcessedSequence = sequenceId` is set in `enqueueMessage()` before `processQueue()` finishes. If processing throws, the sequence has already advanced and the message is lost. Counter should advance after successful processing.

**C2. `processGuestAction` is fire-and-forget**
`ActionProcessor.js:646-660` — Returns `{ success: true, processing: true }` immediately. If the queued action fails on the host, the guest never learns. No error-back channel exists. Guest continues with diverged optimistic state until next full resync.

**C3. PhaseManager hardcodes host=player1, guest=player2**
`PhaseManager.js:118,122,156,160` — `notifyHostAction` always sets firstPasser to `'player1'`, `notifyGuestAction` to `'player2'`. If roles ever need flexibility, this breaks silently.

**C4. Non-awaited queue processing**
`GuestMessageQueueService.js:316-319` — `processQueue()` is async but not awaited. `processPendingMessages()` runs immediately after, potentially pushing messages into the queue during active processing.

### 11.2 Dead Code / Historical Artifacts

**D1. Orphaned JSDoc blocks**
`GuestMessageQueueService.js:132-139` — Empty JSDoc blocks for `addTeleportingFlags` and `compareArrays` remain after extraction.

**D2. `processNetworkAction()` is never called**
`ActionProcessor.js:614-626` — Wraps actions with `isNetworkAction: true` but no caller exists. Guest actions arrive via `processGuestAction()`.

**D3. Orphaned `state_sync_requested` handler**
`GuestSyncManager.js:66-74` — Sends `GAME_STATE_SYNC` via `sendData()`, but P2PManager only routes `PING`, `PONG`, and `PHASE_COMPLETED` types. `GAME_STATE_SYNC` hits the `Unknown data type` warning. Sync now goes through `requestFullSync()`/`sendFullSyncResponse()`.

**D4. `render_complete` event emitted but never consumed**
`useMultiplayerSync.js:180` and screen components emit this event. `useGameState.js:33-35` filters it out. No manager subscribes. Remnant of a previous animation-timing approach.

### 11.3 Missing Safety Nets

**S1. No resync timeout**
`GuestMessageQueueService.js:349-374` — `triggerResync()` sets `isResyncing = true`. If the host never responds, this flag stays true forever, blocking future resyncs.

**S2. No validation prevents corrupt state application**
`GuestSyncManager.js:108-172` — `applyHostState()` logs missing fields but still applies the state. No bail-out on corrupt/partial state.

**S3. Broadcasts silently dropped on disconnect**
`ActionProcessor.js:868` — When P2P is disconnected, broadcast silently returns. Pending animations are already cleared via `getAndClearPendingActionAnimations()` and lost forever. No reconnection resync mechanism.

**S4. Optimistic animations accumulate without bounds**
`OptimisticActionService.js:153` — Tracked animations only removed on match. No staleness check or maximum size.

### 11.4 Maintainability Concerns

**M1. Implicit cascade flags**
`GuestMessageQueueService.js:794-821` — `triggerSimultaneousCascade`, `triggerBothPassCascade` are boolean flags set externally, not initialized in the constructor, not documented. Creates invisible coupling.

**M2. Seven broadcast sites with duplicated guard pattern**
`GameFlowManager.js` — Every broadcast site repeats `if (currentState.gameMode === 'host' && this.actionProcessor.p2pManager)`. A `broadcastIfHost()` helper would eliminate duplication and reduce the risk of forgetting the guard.

**M3. Fragile guest phase pattern-matching**
`GuestMessageQueueService.js:568-696` — Nested if/else chains that must be manually extended for each new phase. Highest regression risk area.

**M4. Two parallel state-comparison implementations**
`GuestMessageQueueService.js` has both `compareGameStates` (fixed field set) and `deepCompareStates` (recursive). The fixed-field version silently misses new state fields.

**M5. PhaseManager maintains separate phase state**
`PhaseManager.js:59-67` maintains its own `phaseState.turnPhase`, `currentPlayer` separately from `GameStateManager.state`. If any code path updates one without the other, they diverge silently.

### 11.5 Improvement Opportunities

**O1. Extract BroadcastService** — Move all broadcast logic (guard checks, animation capture, sequencing) into a dedicated service. New features call `broadcastService.broadcastAfterAction()` instead of scattering P2P-aware code.

**O2. Replace implicit flags with explicit state machine** — The cascade/pass flags should be a state object with defined transitions, initialized in the constructor.

**O3. Add multiplayer integration test harness** — Simulate host+guest message exchange without real WebRTC. This is the primary action that would reduce the "scary to touch" feeling.

**O4. Unify state comparison** — Replace both comparison functions with one configurable function. Eliminates the risk of the fixed-field version going stale.

**O5. Add connection health monitoring** — Periodic pings with automatic resync-on-reconnect would address S1 and S3 together.

## 12. Determinism Requirement

All game logic that uses randomness **must** use `SeededRandom` from `src/utils/seededRandom.js` — never `Math.random()`. This ensures Host and Guest compute identical results for the same game state.

### When to use which API

- **`SeededRandom.forCardShuffle(gameState, playerId)`** — For deck reshuffles. The seed incorporates `gameSeed`, `roundNumber`, player offset, and current deck length, so each reshuffle in a game produces a unique sequence.
- **`new SeededRandom(gameSeed + roundNumber * 100 + contextOffset)`** — For non-deck random operations (random discard, random target selection). Use a unique `contextOffset` per operation type (e.g., 5000 for discard, 6000 for marking) to prevent seed collisions.
- **`SeededRandom.fromGameState(gameState)`** — General-purpose, derives seed from multiple synchronized state fields. Use when full game state is available.

### Where `Math.random()` is allowed

`Math.random()` is permitted **only** in UI/visual code that has no effect on game state:
- Particle effects and animations (`src/components/`)
- Background visuals and decorative elements
- Sound variation (pitch/volume jitter)

Any `Math.random()` call in `src/logic/` or `src/managers/` is a bug.
