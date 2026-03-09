# Game Flow Specification

Formal reference for phase lifecycle, turn flow, broadcast/consume pipeline,
announcement sequencing, animation ordering, and trigger resolution.

Use with `FLOW_VERIFICATION` logging (`src/utils/flowVerification.js`) to
produce a numbered trace proving the system follows this spec.

---

## 1. Phase Lifecycle

### Pre-game Sequence
`deckSelection` -> `droneSelection` -> `placement` -> `roundInitialization`

### Round Loop
`mandatoryDiscard` -> `optionalDiscard` -> `roundInitialization` -> `allocateShields` -> `mandatoryDroneRemoval` -> `deployment` -> `action`

### Phase Types
| Type | Behaviour | Examples |
|-|-|-|
| SIMULTANEOUS | Both players commit independently, resolved together | allocateShields, mandatoryDiscard, optionalDiscard |
| SEQUENTIAL | Players take turns (currentPlayer acts, then switches) | deployment, action |
| AUTOMATIC | Server processes without player input | roundInitialization |

### Conditional Skipping
`PhaseRequirementChecker.isPhaseRequired()` gates each phase:
- `mandatoryDiscard`: only if any player's hand exceeds limit
- `optionalDiscard`: only if any player has cards to discard
- `allocateShields`: only if any player has shields to allocate
- `mandatoryDroneRemoval`: only if any player exceeds drone limit

Skipped phases still advance — the cascade moves to the next required phase.

### Round Boundary
Action phase `both_passed` -> `startNewRound()`:
1. Increment round number
2. Queue announcements (ROUND N, UPKEEP, DEPLOYMENT PHASE)
3. Cascade through `roundInitialization` -> first required phase

---

## 2. Action Phase Turn Flow

### Turn Order
- First player set by `firstPlayerOfRound` (determined during `determineFirstPlayer` or `roundInitialization`)
- Player takes action (deploy/attack/card/move/ability) -> animations generated -> turn switches to opponent
- Player can PASS instead -> `PASS_ANNOUNCEMENT` emitted -> opponent continues
- Both players pass -> `onSequentialPhaseComplete()` -> next phase or new round

### Within a Turn
1. Action resolves (state mutation + animation events)
2. Triggers fire (TriggerProcessor)
3. Animations bundled (AnimationSequenceBuilder)
4. Response broadcast (GameEngine -> clients)

---

## 3. Server Broadcast -> Client Consumption

### Server Side (GameEngine.processAction)
1. `startResponseCapture()` opens animation accumulator
2. Action processing mutates state + generates animations
3. `waitForPendingActionCompletion()` ensures cascading transitions finish
4. `getAndClearResponseCapture()` collects `{ actionAnimations, systemAnimations }`
5. `_emitToClients()` pushes redacted state + animations per player

### Client Side (GameClient._onResponse)
1. Receives `{ state, animations }`
2. `_extractAndQueueAnnouncements()` splits:
   - `PHASE_ANNOUNCEMENT` / `PASS_ANNOUNCEMENT` -> `PhaseAnimationQueue`
   - Everything else -> `AnimationManager.executeWithStateUpdate()`
3. **Order guarantee**: array order preserved end-to-end (capture order = playback order)

---

## 4. Announcement Order Guarantee

- `PhaseAnimationQueue` plays FIFO, one at a time, 1800ms each
- Deduplication by `phaseName` (won't queue same phase twice)
- Round transition bundle: `roundAnnouncement` ("ROUND N") -> `roundInitialization` ("UPKEEP") -> `deployment` ("DEPLOYMENT PHASE")
- `PASS_ANNOUNCEMENT` queued when a player passes in sequential phase
- Subtitles ("You Go First" / "Opponent Goes First") calculated dynamically at playback time

---

## 5. Animation Order Guarantee

### AnimationSequenceBuilder Contract (per step)
`actionEvents` -> `STATE_SNAPSHOT` -> `postSnapshotEvents` -> `TRIGGER_CHAIN_PAUSE(400ms)` -> `triggerEvents`

### AnimationManager.executeWithStateUpdate Timing Split
1. Pre-state animations (entities in old DOM) — includes `independent` timing
2. State update (React re-render via `applyPendingStateUpdate`)
3. Post-state animations (entities in new DOM)

### Ordering Principles
- Destructive triggers: events play first (targets visible), then snapshot
- Additive triggers: announcement first, then snapshot (stat values visible), then buff anims

---

## 6. Trigger Resolution Order

### Tier Priority
| Tier | Description |
|-|-|
| 0 | Self-triggers (ON_MOVE, ON_DEPLOY, ON_ATTACK, ON_ROUND_START, ON_INTERCEPT, ON_ATTACKED) |
| 0.5 | Tech triggers in techSlots (for LANE trigger types only) |
| 1 | Actor's lane triggers / Actor's controller triggers |
| 2 | Opponent's lane triggers / Opponent's controller triggers |

### Resolution Rules
- Within same tier: left-to-right (natural array/lane order)
- Cascading: depth-first, `(reactorId, sourceId)` pair guard (fires at most once per chain)
- Max chain depth: 20
- 13 trigger types in 3 categories: Self (6), Controller (3), Lane (4)

---

## 7. FLOW_VERIFICATION Checkpoints

Enable `FLOW_VERIFICATION` in `debugLogger.js` to trace these 12 checkpoints:

| # | Checkpoint | Location | Proves |
|-|-|-|-|
| 1 | SERVER_ACTION_RECEIVED | GameEngine.processAction | Server got the action |
| 2 | CAPTURE_OPENED | ActionProcessor.startResponseCapture | Animation bracket opened |
| 3 | PHASE_ANNOUNCEMENT_EMITTED | PhaseTransitionStrategy.processPhaseTransition | Server emitted announcement |
| 4 | ANIMATION_SEQUENCE_BUILT | AnimationSequenceBuilder.buildAnimationSequence | action->snapshot->pause->trigger order |
| 5 | TRIGGERS_MATCHED | TriggerProcessor.fireTrigger | Trigger tier order + names |
| 6 | SERVER_BROADCASTING | GameEngine.processAction | Broadcast with animation counts |
| 7 | CLIENT_RECEIVED | GameClient._onResponse | Client got state + animations |
| 8 | ANNOUNCEMENTS_SPLIT | GameClient._extractAndQueueAnnouncements | Announcement vs visual split |
| 9 | ANNOUNCEMENT_PLAYING | PhaseAnimationQueue.playNext | Which announcement, queue position |
| 10 | VISUAL_ANIMS_EXECUTING | AnimationManager.executeWithStateUpdate | Pre-state / post-state counts |
| 11 | ROUND_ANNOUNCEMENTS_QUEUED | GameFlowManager._queueRoundStartAnnouncements | Bundle order |
| 12 | PHASE_TRANSITION | GameFlowManager.transitionToPhase | from->to phase name |
