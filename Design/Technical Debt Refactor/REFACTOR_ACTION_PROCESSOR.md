# Refactor: ActionProcessor.js

## Current State

- **File**: `src/managers/ActionProcessor.js`
- **Line count**: 4,838
- **Responsibilities**: Singleton action queue/lock system, 40+ process methods, animation orchestration, P2P broadcasting, teleport state management, commitment system, AI routing, win condition checking
- **Existing test coverage**: None. No `src/managers/__tests__/` directory exists. Zero tests for any ActionProcessor method.

### Section Map

| Section | Lines | Description |
|-|-|-|
| Imports | 1-34 | 35 imports from across the codebase |
| Singleton + Constructor | 36-115 | Singleton pattern, action locks, pending state tracking |
| Event system | 117-146 | subscribe/emit pattern for action completion |
| Setter methods | 148-179 | setP2PManager, setPhaseManager, setAIPhaseProcessor, setAnimationManager |
| Queue system | 187-243 | queueAction, processQueue (serial processing) |
| Action router | 249-563 | processAction — giant switch with 35 cases, validation, lock management, event emission |
| Combat actions | 568-835 | processAttack — interception, animation orchestration, mine two-phase |
| Movement | 840-1058 | processMove — keywords (RAPID, INFILTRATE, INERT), snare, mines, rally beacon |
| Ability | 1063-1190 | processAbility — drone ability resolution |
| Deployment | 1195-1314 | processDeployment — drone deployment with teleport animation |
| Card play | 1319-1502 | processCardPlay — target resolution, additional effects, conditionals |
| Additional cost cards | 1509-1702 | processAdditionalCostCardPlay, processAdditionalCostEffectSelectionComplete |
| Movement completion | 1704-1970 | processMovementCompletion — card-based movement with mines and conditionals |
| Search and draw | 1978-2076 | processSearchAndDrawCompletion — search card modal completion |
| Ship abilities | 2081-2378 | processShipAbility, processShipAbilityCompletion, processRecallAbility, processTargetLockAbility, processRecalculateAbility, processRecalculateComplete, processReallocateShieldsAbility, processReallocateShieldsComplete |
| Validation helper | 2275-2294 | validateShipAbilityActivationLimit |
| Win condition | 2385-2447 | checkWinCondition, processForceWin |
| Turn/phase transitions | 2452-2689 | processTurnTransition, processPhaseTransition |
| Round management | 2694-2768 | processRoundStart |
| Shield reallocation | 2776-2894 | processReallocateShields (action phase shields) |
| AI routing | 2899-3085 | processAiAction, processAiDecision (DEAD CODE) |
| Utility methods | 3088-3099 | isActionInProgress, getQueueLength |
| Network/P2P | 3105-3152 | processNetworkAction, processGuestAction |
| Animation helpers | 3154-3459 | executeGoAgainAnimation, executeAndCaptureAnimations, getAndClearPending*, prepareTeleportStates, addTeleportingFlags, applyPendingStateUpdate, getAnimationSource, revealTeleportedDrones, broadcastStateToGuest |
| Player pass | 3464-3608 | processPlayerPass |
| AI ship placement | 3613-3651 | processAiShipPlacement |
| Optional discard | 3657-3743 | processOptionalDiscard |
| First player | 3749-3780 | processFirstPlayerDetermination |
| Commitment system | 3782-4257 | getPhaseCommitmentStatus, clearPhaseCommitments, processCommitment, handleAICommitment, applyPhaseCommitments |
| State pass-through | 4264-4476 | processDraw, processEnergyReset, processRoundStartTriggers, processRebuildProgress, processMomentumAward |
| Drone destruction | 4484-4549 | processDestroyDrone |
| Debug tools | 4556-4586 | processDebugAddCardsToHand |
| Shield allocation | 4593-4689 | processAddShield, processResetShields |
| Status consumption | 4724-4835 | processSnaredConsumption, processSuppressedConsumption |
| Queue management | 4694-4717 | clearQueue |

### All process* Methods

| # | Method | Lines | Action Type |
|-|-|-|-|
| 1 | processQueue | 209-243 | Internal queue loop |
| 2 | processAction | 249-563 | Router/dispatcher |
| 3 | processAttack | 568-835 | attack |
| 4 | processMove | 840-1058 | move |
| 5 | processAbility | 1063-1190 | ability |
| 6 | processDeployment | 1195-1314 | deployment |
| 7 | processCardPlay | 1319-1502 | cardPlay |
| 8 | processAdditionalCostCardPlay | 1509-1625 | additionalCostCardPlay |
| 9 | processAdditionalCostEffectSelectionComplete | 1636-1702 | additionalCostEffectSelectionComplete |
| 10 | processMovementCompletion | 1704-1970 | movementCompletion |
| 11 | processSearchAndDrawCompletion | 1978-2076 | searchAndDrawCompletion |
| 12 | processShipAbility | 2081-2167 | shipAbility |
| 13 | processShipAbilityCompletion | 2174-2213 | shipAbilityCompletion |
| 14 | processRecallAbility | 2219-2241 | recallAbility |
| 15 | processTargetLockAbility | 2247-2266 | targetLockAbility |
| 16 | processRecalculateAbility | 2300-2322 | recalculateAbility |
| 17 | processRecalculateComplete | 2327-2337 | recalculateComplete |
| 18 | processReallocateShieldsAbility | 2343-2358 | reallocateShieldsAbility |
| 19 | processReallocateShieldsComplete | 2364-2378 | reallocateShieldsComplete |
| 20 | processForceWin | 2422-2447 | (dev tool, not queued) |
| 21 | processTurnTransition | 2452-2513 | turnTransition |
| 22 | processPhaseTransition | 2518-2689 | phaseTransition |
| 23 | processRoundStart | 2694-2768 | roundStart |
| 24 | processReallocateShields | 2776-2894 | reallocateShields |
| 25 | processAiAction | 2899-2970 | aiAction |
| 26 | processAiDecision | 2978-3085 | DEAD CODE |
| 27 | processNetworkAction | 3105-3117 | (network wrapper) |
| 28 | processGuestAction | 3124-3152 | (network wrapper) |
| 29 | processPlayerPass | 3464-3608 | playerPass |
| 30 | processAiShipPlacement | 3613-3651 | aiShipPlacement |
| 31 | processOptionalDiscard | 3657-3743 | optionalDiscard |
| 32 | processFirstPlayerDetermination | 3749-3780 | processFirstPlayerDetermination |
| 33 | processCommitment | 3843-4005 | commitment |
| 34 | processDraw | 4264-4286 | draw |
| 35 | processEnergyReset | 4293-4389 | energyReset |
| 36 | processRoundStartTriggers | 4397-4416 | roundStartTriggers |
| 37 | processRebuildProgress | 4425-4446 | rebuildProgress |
| 38 | processMomentumAward | 4454-4476 | momentumAward |
| 39 | processDestroyDrone | 4484-4549 | destroyDrone |
| 40 | processDebugAddCardsToHand | 4556-4586 | debugAddCardsToHand |
| 41 | processAddShield | 4593-4641 | addShield |
| 42 | processResetShields | 4648-4689 | resetShields |
| 43 | processSnaredConsumption | 4724-4776 | snaredConsumption |
| 44 | processSuppressedConsumption | 4783-4835 | suppressedConsumption |

## Problems

### CODE_STANDARDS.md Violations

1. **God-object**: Single class with 44 methods and 4,838 lines. CODE_STANDARDS says 800+ is "almost certainly doing too much." This file is 6x over.
2. **Strategy pattern not applied**: CODE_STANDARDS explicitly names ActionProcessor as a strategy pattern candidate: "Use strategy pattern for processors with many conditional branches (like ActionProcessor)."
3. **Giant switch statement**: `processAction()` (lines 249-563) has a 35-case switch dispatching to methods. Classic strategy pattern smell.
4. **Mixed concerns**: Animation orchestration, P2P broadcasting, teleport state management, commitment system, AI routing, and action processing all live in one class.

### Dead Code

1. **`processAiDecision`** (lines 2978-3085): Comment on line 2974 explicitly says "This method is legacy/dead code — never called in current architecture." 108 lines of dead code.

### Missing/Inconsistent Logging

- 16 raw `console.log`/`console.warn`/`console.error` calls that should use `debugLog()` (see Logging Improvements below).

### Code Smell

1. **Animation boilerplate duplication**: The pattern of mapping animation events, capturing for broadcast, preparing teleport states, and executing with state update is repeated nearly identically in processAttack, processAbility, processDeployment, processCardPlay, processShipAbility (at least 5 times). ~30 lines of boilerplate per occurrence.
2. **Deep JSON clone spam**: `JSON.parse(JSON.stringify(...))` appears 8+ times. Should use a shared utility.
3. **`_updateContext` try/finally pattern**: The pattern of `this.gameStateManager._updateContext = 'ActionProcessor'` with try/finally cleanup is repeated 15+ times. Should be a helper.
4. **processSnaredConsumption and processSuppressedConsumption** (lines 4724-4835): Nearly identical 112-line methods differing only in flag name (`isSnared` vs `isSuppressed`) and log text. Clear duplication.

## Extraction Plan

### 1. Animation Orchestration Helper (internal extraction)

- **What**: Extract the repeated animation mapping/capture/teleport/execute boilerplate into a private helper method on ActionProcessor.
- **Where**: Stays in `src/managers/ActionProcessor.js` as a private helper (e.g., `_executeActionWithAnimations(result, gameMode)`)
- **Why**: Eliminates ~150 lines of duplicated boilerplate across processAttack, processAbility, processDeployment, processCardPlay, processShipAbility. Single responsibility within the file.
- **Dependencies**: animationManager, pendingActionAnimations, pendingStateUpdate, pendingFinalState, broadcastStateToGuest, prepareTeleportStates

### 2. Combat Action Strategy — `CombatActionStrategy.js`

- **What**: Extract `processAttack` (268 lines), `processMove` (219 lines), `processAbility` (128 lines)
- **Where**: `src/managers/strategies/CombatActionStrategy.js`
- **Why**: Strategy pattern per CODE_STANDARDS. These three methods handle all direct drone-to-drone interactions and share common patterns (animation orchestration, win condition checks, go-again logic).
- **Dependencies**: resolveAttack, calculateAiInterception, calculateEffectiveStats, AbilityResolver, LaneControlCalculator, processMineTrigger, checkRallyBeaconGoAgain, gameEngine.applyOnMoveEffects/updateAuras

### 3. Card Action Strategy — `CardActionStrategy.js`

- **What**: Extract `processCardPlay` (184 lines), `processAdditionalCostCardPlay` (117 lines), `processAdditionalCostEffectSelectionComplete` (67 lines), `processMovementCompletion` (267 lines), `processSearchAndDrawCompletion` (99 lines)
- **Where**: `src/managers/strategies/CardActionStrategy.js`
- **Why**: Strategy pattern. All five methods handle card-play flows and share the same callback/state/animation patterns.
- **Dependencies**: gameEngine.resolveCardPlay/payCardCosts/finishCardPlay, CardPlayManager, MovementEffectProcessor, ConditionalEffectProcessor, EffectRouter

### 4. Ship Ability Strategy — `ShipAbilityStrategy.js`

- **What**: Extract `processShipAbility`, `processShipAbilityCompletion`, `processRecallAbility`, `processTargetLockAbility`, `processRecalculateAbility`, `processRecalculateComplete`, `processReallocateShieldsAbility`, `processReallocateShieldsComplete`, `validateShipAbilityActivationLimit` (9 methods, ~300 lines total)
- **Where**: `src/managers/strategies/ShipAbilityStrategy.js`
- **Why**: Strategy pattern. All are ship-section ability variants sharing the same validate-resolve-update pattern.
- **Dependencies**: AbilityResolver, RecallAbilityProcessor, TargetLockAbilityProcessor, RecalculateAbilityProcessor, ReallocateShieldsAbilityProcessor, shipComponentCollection

### 5. Phase & Turn Strategy — `PhaseTransitionStrategy.js`

- **What**: Extract `processTurnTransition` (62 lines), `processPhaseTransition` (172 lines), `processRoundStart` (75 lines), `processFirstPlayerDetermination` (32 lines)
- **Where**: `src/managers/strategies/PhaseTransitionStrategy.js`
- **Why**: Strategy pattern. Phase/turn/round lifecycle is a cohesive concern separate from gameplay actions.
- **Dependencies**: gameEngine.calculateTurnTransition, RoundManager, firstPlayerUtils, PhaseManager, phaseAnimationQueue

### 6. Commitment Strategy — `CommitmentStrategy.js`

- **What**: Extract `processCommitment` (163 lines), `handleAICommitment` (130 lines), `applyPhaseCommitments` (109 lines), `getPhaseCommitmentStatus` (20 lines), `clearPhaseCommitments` (25 lines)
- **Where**: `src/managers/strategies/CommitmentStrategy.js`
- **Why**: Commitment system is a self-contained concern for simultaneous phase management. Reduces ActionProcessor by ~450 lines.
- **Dependencies**: aiPhaseProcessor, PhaseManager, gameEngine, initializeDroneAvailability

### 7. State Pass-Through Strategy — `StateUpdateStrategy.js`

- **What**: Extract `processDraw`, `processEnergyReset`, `processRoundStartTriggers`, `processRebuildProgress`, `processMomentumAward` (5 methods, ~215 lines total)
- **Where**: `src/managers/strategies/StateUpdateStrategy.js`
- **Why**: These methods are trivial state-forwarding wrappers. Grouping them reduces noise in the core file.
- **Dependencies**: gameStateManager only

### 8. Utility Actions Strategy — `UtilityActionStrategy.js`

- **What**: Extract `processDestroyDrone`, `processOptionalDiscard`, `processPlayerPass`, `processAiShipPlacement`, `processAiAction`, `processReallocateShields`, `processAddShield`, `processResetShields`, `processSnaredConsumption`, `processSuppressedConsumption`, `processDebugAddCardsToHand`, `processForceWin` (12 methods, ~700 lines)
- **Where**: `src/managers/strategies/UtilityActionStrategy.js`
- **Why**: Miscellaneous actions that don't fit the other strategy groups. Consider further splitting if this file exceeds 400 lines after extraction.
- **Dependencies**: gameEngine, ShieldManager, phaseAnimationQueue, PhaseManager

### 9. Network/Broadcast Helper — `NetworkBroadcastHelper.js`

- **What**: Extract `processNetworkAction`, `processGuestAction`, `broadcastStateToGuest`, `getAndClearPendingActionAnimations`, `getAndClearPendingSystemAnimations` (5 methods, ~150 lines)
- **Where**: `src/managers/helpers/NetworkBroadcastHelper.js`
- **Why**: P2P broadcasting is a cross-cutting concern. Extraction makes ActionProcessor testable without mocking network code.
- **Dependencies**: p2pManager, gameStateManager, pendingActionAnimations, pendingSystemAnimations

### 10. Teleport State Helper — stays in ActionProcessor or merges into animation helper

- **What**: `prepareTeleportStates`, `addTeleportingFlags`, `applyPendingStateUpdate`, `revealTeleportedDrones`, `getAnimationSource` (5 methods, ~150 lines)
- **Where**: Keep in ActionProcessor as a cohesive animation-state group, or merge with extraction #1 if combined size stays under 200 lines.
- **Why**: Tightly coupled to AnimationManager callback contract. Moving these to a separate file would require complex callback wiring for marginal benefit.

### Strategy Registration Pattern

After extractions, ActionProcessor's `processAction` switch becomes a strategy dispatcher:

```javascript
// In constructor
this.strategies = {
  attack: new CombatActionStrategy(this),
  move: new CombatActionStrategy(this),
  ability: new CombatActionStrategy(this),
  cardPlay: new CardActionStrategy(this),
  // ... etc
};

// In processAction
const strategy = this.strategies[type];
if (strategy) {
  result = await strategy.execute(type, payload);
} else {
  throw new Error(`Unknown action type: ${type}`);
}
```

Each strategy receives a reference to the ActionProcessor (or a context object) for accessing shared state (gameStateManager, animationManager, etc.).

## Dead Code Removal

| Code | Lines | Reason |
|-|-|-|
| `processAiDecision` | 2978-3085 | Explicitly marked dead in its own comment. Duplicates processAiAction. |
| Debug `console.error` in processAiShipPlacement | 3622, 3634 | `console.error('CRITICAL')` calls are debug leftovers, not real error handling. |

## Logging Improvements

### Raw console calls to convert to debugLog

| Line | Current | Suggested Replacement |
|-|-|-|
| 64 | `console.warn('ActionProcessor already exists...')` | `debugLog('STATE_SYNC', 'ActionProcessor already exists...')` |
| 143 | `console.error('ActionProcessor listener error:', error)` | `debugLog('STATE_SYNC', 'ActionProcessor listener error:', error)` |
| 231 | `console.error('Action processing error:', error)` | `debugLog('STATE_SYNC', 'Action processing error:', error)` |
| 3128 | `console.warn('processGuestAction should only be called by host')` | `debugLog('STATE_SYNC', 'processGuestAction called on non-host')` |
| 3146 | `console.error('[HOST] Error processing guest action:', error)` | `debugLog('STATE_SYNC', '[HOST] Error processing guest action:', error)` |
| 3252 | `console.warn('[prepareTeleportStates] Incomplete newPlayerStates...')` | `debugLog('ANIMATIONS', 'prepareTeleportStates: Incomplete newPlayerStates')` |
| 3622 | `console.error('CRITICAL - Setting opponentPlacedSections...')` | Remove entirely (debug leftover) |
| 3634 | `console.error('CRITICAL - After setState...')` | Remove entirely (debug leftover) |
| 3985 | `console.error('AI commitment error:', error)` | `debugLog('COMMITMENTS', 'AI commitment error:', error)` |
| 4135 | `console.warn('No AI handler for phase:', phase)` | `debugLog('COMMITMENTS', 'No AI handler for phase:', phase)` |
| 4139 | `console.error('AI commitment error:', error)` | `debugLog('COMMITMENTS', 'AI commitment error:', error)` |
| 4154 | `console.warn('No commitments found for phase:', phase)` | `debugLog('COMMITMENTS', 'No commitments found for phase:', phase)` |
| 4253 | `console.warn('No commitment application logic...')` | `debugLog('COMMITMENTS', 'No commitment application logic for phase:', phase)` |
| 4616 | `console.warn('Shield allocation failed:', result.error)` | `debugLog('ENERGY', 'Shield allocation failed:', result.error)` |
| 4664 | `console.warn('Shield reset failed:', result.error)` | `debugLog('ENERGY', 'Shield reset failed:', result.error)` |

### Verbose debug logging to trim

The `processEnergyReset` method (lines 4293-4389) has 60+ lines of verbose debug logging for a straightforward state pass-through. The RESOURCE_RESET debug blocks (lines 4299-4359) should be condensed to a single log call.

Similarly, the `processAction` finally block (lines 490-562) has 5 separate debug log calls that could be condensed to 2.

### No new categories needed

Existing categories (STATE_SYNC, COMBAT, CARDS, ENERGY, COMMITMENTS, ANIMATIONS, PHASE_TRANSITIONS, PASS_LOGIC, DEPLOYMENT) adequately cover all action types.

## Comment Cleanup

### Stale / noise comments to remove

- Line 4: `// Centralized action processing system to prevent race conditions.` — fine to keep, but lines 1-3 decorative `// ========================================` should be removed per comment standards (section separators are allowed but ASCII decoration is noise).
- Line 188: `// DEBUG: Prove queueAction is called` — debug-era comment
- Line 210: `// DEBUG: Prove processQueue is called` — debug-era comment
- Line 252: `// DEBUG: Prove processAction is called` — debug-era comment
- Line 508: `// DEBUG: Log finally block execution to diagnose why emission might not happen` — stale debug comment
- Line 517: `// TURN TRANSITION DEBUG: Diagnose event chain breakdown` — stale debug comment
- Line 2974-2976: Comment describing processAiDecision as dead code — remove with the dead code

### Comments that should stay

- Line 5: `// All game actions must go through this processor to ensure serialization.` — explains WHY (architectural constraint)
- Line 957: `// --- Phase 1: Commit movement...` — section separator in complex method
- Line 1282-1285: TELEPORT_IN timing explanation — documents non-obvious animation sequencing

## Testing Requirements

### Intent-based Tests to Write BEFORE Extraction

These tests lock in current behavior so extraction can be validated:

**File: `src/managers/__tests__/ActionProcessor.test.js`**

1. **Queue serialization**: Actions queued during processing are executed after current action completes
2. **Action locking**: Duplicate action types are rejected while locked
3. **Pass validation**: Actions blocked after player has passed
4. **Turn validation**: Wrong-player actions rejected in sequential phases
5. **Event emission**: action_completed event fires for player action types with correct payload
6. **Action counter**: actionsTakenThisTurn increments for qualifying action types

**File: `src/managers/__tests__/ActionProcessor.combat.test.js`**

7. **processAttack**: Returns shouldEndTurn correctly for go-again attacks
8. **processMove**: RAPID keyword prevents exhaustion; INERT blocks movement; snare consumed on move attempt
9. **processAbility**: Activation limit enforced

**File: `src/managers/__tests__/ActionProcessor.cards.test.js`**

10. **processCardPlay**: Target resolution finds drones, ship sections, pool drones, and lane targets
11. **processMovementCompletion**: Card costs paid, POST conditionals evaluated, finishCardPlay discards card

**File: `src/managers/__tests__/ActionProcessor.commitments.test.js`**

12. **processCommitment**: Stores commitment, triggers AI auto-commit in local mode, returns bothPlayersComplete
13. **applyPhaseCommitments**: Correctly transfers commitment data to game state for each phase type

### Tests to Update AFTER Extraction

After strategies are extracted, update imports in all test files above. Strategy-specific tests can be moved to strategy-specific test files (e.g., `src/managers/strategies/__tests__/CombatActionStrategy.test.js`).

## Execution Order

Each step is independently committable. After each: extract/clean, test, code review, fix issues, update this plan doc, commit, push.

### Phase 1: Foundation (no behavior changes)

1. **Remove dead code**: Delete `processAiDecision` (lines 2978-3085). Remove debug `console.error` calls in `processAiShipPlacement` (lines 3622, 3634). Run existing tests.

2. **Fix raw console calls**: Convert all 15 `console.log`/`console.warn`/`console.error` calls to `debugLog()` with appropriate categories (see Logging Improvements table). No behavior change.

3. **Clean comments**: Remove debug-era comments (lines 188, 210, 252, 508, 517). Remove decorative `========` separators. No behavior change.

4. **Deduplicate status consumption**: Merge `processSnaredConsumption` and `processSuppressedConsumption` into a single `processStatusConsumption` method parameterized by status type. Update the switch cases in processAction.

5. **Extract animation boilerplate helper**: Create `_executeActionWithAnimations(animations, newPlayerStates)` private method. Refactor processAttack, processAbility, processDeployment, processCardPlay, processShipAbility to use it. Estimated savings: ~120 lines.

6. **Extract `_withUpdateContext` helper**: Replace the 15+ try/finally `_updateContext` blocks with a helper: `_withUpdateContext(fn)`. Estimated savings: ~45 lines.

### Phase 2: Write Tests

7. **Write core tests**: Create `src/managers/__tests__/ActionProcessor.test.js` with tests 1-6 from Testing Requirements. Tests must pass on current code.

8. **Write combat tests**: Create `src/managers/__tests__/ActionProcessor.combat.test.js` with tests 7-9.

9. **Write card tests**: Create `src/managers/__tests__/ActionProcessor.cards.test.js` with tests 10-11.

10. **Write commitment tests**: Create `src/managers/__tests__/ActionProcessor.commitments.test.js` with tests 12-13.

### Phase 3: Strategy Extractions

11. **Extract CombatActionStrategy**: Move processAttack, processMove, processAbility to `src/managers/strategies/CombatActionStrategy.js`. Update processAction to delegate. All tests green.

12. **Extract CardActionStrategy**: Move processCardPlay, processAdditionalCostCardPlay, processAdditionalCostEffectSelectionComplete, processMovementCompletion, processSearchAndDrawCompletion to `src/managers/strategies/CardActionStrategy.js`. All tests green.

13. **Extract ShipAbilityStrategy**: Move all 9 ship ability methods to `src/managers/strategies/ShipAbilityStrategy.js`. All tests green.

14. **Extract PhaseTransitionStrategy**: Move processTurnTransition, processPhaseTransition, processRoundStart, processFirstPlayerDetermination to `src/managers/strategies/PhaseTransitionStrategy.js`. All tests green.

15. **Extract CommitmentStrategy**: Move processCommitment, handleAICommitment, applyPhaseCommitments, getPhaseCommitmentStatus, clearPhaseCommitments to `src/managers/strategies/CommitmentStrategy.js`. All tests green.

16. **Extract StateUpdateStrategy**: Move processDraw, processEnergyReset, processRoundStartTriggers, processRebuildProgress, processMomentumAward to `src/managers/strategies/StateUpdateStrategy.js`. All tests green.

17. **Extract UtilityActionStrategy**: Move remaining process methods to `src/managers/strategies/UtilityActionStrategy.js`. If file exceeds 400 lines, split further. All tests green.

18. **Extract NetworkBroadcastHelper**: Move P2P methods to `src/managers/helpers/NetworkBroadcastHelper.js`. All tests green.

### Phase 4: Finalization

19. **Implement strategy registry**: Replace the 35-case switch in processAction with a strategy map lookup. All tests green.

20. **Trim verbose logging**: Condense processEnergyReset debug logging and processAction finally block logging. All tests green.

21. **Final review**: Verify ActionProcessor core is under 400 lines. Verify each strategy file is under 400 lines. Verify all tests pass. Update this document with final line counts.

## Risk Assessment

### What Could Break

- **Animation sequencing**: The interplay between pendingStateUpdate, pendingFinalState, and AnimationManager callbacks is fragile. Strategy methods need access to these shared fields through a well-defined interface.
- **Singleton state**: Strategies must share the same gameStateManager, animationManager, and p2pManager instances. Passing context incorrectly could cause null references.
- **Action locks**: The lock/unlock mechanism in processAction's try/finally must still wrap strategy execution. If a strategy throws before the finally block runs, locks could deadlock.
- **Event emission**: The action_completed event in processAction's finally block depends on this.lastActionResult. Strategies must correctly return results for this to work.

### Drag-and-Drop Flows to Verify

After each extraction step, manually test:
1. Drag drone to deploy (processDeployment) — teleport animation plays correctly
2. Drag drone to attack (processAttack) — attack animation + interception modal works
3. Drag drone to move (processMove) — mine triggers play in correct order
4. Drag card to target (processCardPlay) — card reveal animation plays
5. Drag card requiring movement selection (processMovementCompletion) — full movement flow completes

### How to Validate

1. All existing tests pass after each step
2. New tests pass after each step
3. Manual playthrough: complete one full game in local mode after each phase
4. Manual playthrough: complete one round in host/guest P2P mode after Phase 3
5. Check browser console for any raw `console.log/warn/error` calls (should be zero)
