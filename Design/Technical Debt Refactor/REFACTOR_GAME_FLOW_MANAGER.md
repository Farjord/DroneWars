# Refactor: GameFlowManager.js

## BEFORE

### Current State
- **Line count**: 2,671 lines (well above 800-line smell threshold)
- **Location**: `src/managers/GameFlowManager.js`
- **Responsibilities**:
  - Singleton game flow controller owning canonical phase state and transitions
  - Phase classification (simultaneous, sequential, automatic)
  - Pre-game flow (deckSelection -> droneSelection -> placement -> roundInitialization)
  - Round loop flow (mandatoryDiscard -> optionalDiscard -> roundInit -> allocateShields -> mandatoryDroneRemoval -> deployment -> action)
  - Round initialization logic (energy reset, first player, card draw, rebuild progress, momentum, quick deploy) ~lines 1059-1432
  - Phase requirement checks (hand limit, shield allocation, drone limit) ~lines 1822-2060
  - Action completion handling and turn transitions ~lines 238-415
  - Guest/Host/Local mode branching throughout
  - Animation queue playback orchestration
  - Quick deploy execution ~lines 2548-2668
  - Event pub/sub system
  - Drone extraction from deck names
  - Auto-completion of unnecessary commitments

- **Existing test coverage**: 7 co-located test files (NOT in `__tests__/`):
  - `GameFlowManager.test.js`
  - `GameFlowManager.subscription.test.js`
  - `GameFlowManager.resubscribe.test.js`
  - `GameFlowManager.quickDeploy.test.js`
  - `GameFlowManager.integration.test.js`
  - `GameFlowManager.asymmetric.test.js`
  - `PhaseFlowCoverage.test.js`

- **Known dead code**: 4 orphaned automatic phase processors, 1 deprecated method with unreachable code

### Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

#### Architecture Overview

GameFlowManager is a **singleton** class that owns the canonical phase state and orchestrates all phase transitions in the game. It mediates between GameStateManager (state), ActionProcessor (actions/broadcasts), PhaseManager (authoritative phase tracking), and AIPhaseProcessor (AI decisions). Three execution modes: **local** (single-player, full authority), **host** (multiplayer authority, broadcasts to guest), **guest** (optimistic execution, waits for host broadcasts).

#### Exports / Public API

**Class: `GameFlowManager`** (default export)

| Method | Contract |
|-|-|
| `constructor(phaseAnimationQueue?)` | Singleton. Returns existing instance if already created. Initializes phase arrays, state tracking, event listeners array. Stores optional `phaseAnimationQueue` for non-blocking announcements. |
| `initialize(gsm, ap, isMultiplayerFn, aiPhaseProcessor)` | Idempotent (guarded by `isInitialized`). Wires up GSM, ActionProcessor, PhaseManager. Re-initializes AIPhaseProcessor with execution deps in single-player. Calls `setupEventListeners()` and `resubscribe()`. Sets `isInitialized = true`. |
| `setupEventListeners()` | Subscribes to GSM state changes. On each event: calls `checkSequentialPhaseCompletion` (no-op), calls `checkSimultaneousPhaseCompletion` (non-guest only). Also detects guest opponent pass from `passInfo` changes and queues animation. Captures `previousPassInfo` in closure. |
| `resubscribe()` | Unsubscribes existing AP listener, re-subscribes to `action_completed` events. Calls `handleActionCompletion()` on each event. Stores unsubscribe function. |
| `handleActionCompletion(event)` | **Async**. Handles turn transitions after actions. For `playerPass`: guest only does animation playback then returns; host/local checks `bothPassed` → if true, calls `onSequentialPhaseComplete` + broadcasts; if false, starts pass notification playback. For non-pass in guest+P2P mode: early return. For sequential phases with `shouldEndTurn`: calls `processTurnTransition` via AP, broadcasts. For goAgain: broadcasts without transition. |
| `subscribe(listener)` | Adds listener to array. Returns unsubscribe function. |
| `emit(eventType, data)` | Calls all listeners with `{ type: eventType, ...data }`. Catches listener errors (console.error). |
| `getCurrentPhaseInfo()` | Returns `{ currentPhase, gameStage, roundNumber, isPreGame, isRoundLoop, isGameOver }`. |
| `startGameFlow(startingPhase='deckSelection')` | **Async**. Guest guard (returns early). Sets `currentPhase`, syncs `gameStage`/`roundNumber` from GSM. If `deckSelection`: initializes ship placement data. Calls `processPhaseTransition` via AP, applies phase data via `_updateContext` pattern. Emits `phaseTransition`. |
| `onSimultaneousPhaseComplete(phase, data)` | **Async**. Guest guard. Applies commitments via AP. Special handling for `deckSelection` → initializes drone selection data for both players (extracts drones from deck commitments, creates selection trios via SeededRandom). Special handling for `placement` → immediate broadcast to guest, queues ROUND announcement. Determines next phase: if sequential → `initiateSequentialPhase` + broadcast + start playback; if simultaneous → `transitionToPhase` + broadcast + start playback. |
| `checkSequentialPhaseCompletion(state, eventType)` | **DEPRECATED**. Body starts with `return;` — all subsequent code is unreachable dead code. |
| `checkSimultaneousPhaseCompletion(state, eventType)` | Filters for `COMMITMENT_UPDATE` events on simultaneous phases. Checks if both players' commitments are completed. If so: emits `bothPlayersComplete` event, calls `onSimultaneousPhaseComplete`. |
| `onSequentialPhaseComplete(phase, data)` | **Async**. Guest guard. Gets next phase. If `deployment` → `action`: queues DEPLOYMENT COMPLETE announcement. If end of action: queues ACTION PHASE COMPLETE, calls `startNewRound`. Otherwise: `transitionToPhase`. |
| `getNextPhase(currentPhase)` | Delegates to `getNextPreGamePhase` or `getNextRoundPhase` based on `gameStage`. |
| `getNextMilestonePhase(currentPhase)` | Searches forward in phase list for next milestone phase (via `GSM.isMilestonePhase`). Fallback: `'deployment'`. Used by guest validation. |
| `processAutomaticPhase(phase, previousPhase)` | **Async**. Guest mode: syncs `gameStage`/`roundNumber` from GSM. Sets `isProcessingAutomaticPhase = true`. Calls `processPhaseLogicOnly` → `transitionToPhase` with result. In finally: clears flag, tracks optimistic animations for guest, starts animation playback for host/local if landed on non-automatic phase. |
| `processPhaseLogicOnly(phase, previousPhase)` | **Async**. Routes to `processRoundInitialization` for `roundInitialization` phase. Returns next phase name without transitioning. |
| `processAutomaticPhasesUntilCheckpoint(startPhase)` | **Async**. Guest optimistic cascade. Sets `isInCheckpointCascade = true`. Transitions to start phase, then loops: process logic → if no next phase, stop; if next is milestone, transition and stop; else transition and continue. In finally: clears flag, starts animation playback for guest. |
| `processRoundInitialization(previousPhase)` | **Async**. 373 lines. Step 1: transition to roundLoop stage, init round 1 if `roundNumber === 0`. Step 2: first player determination via AP. Step 3: energy/resource reset (effective stats, ready drones, restore shields, set energy/deployment budgets, calculate shields). Step 3b: ON_ROUND_START triggers via RoundManager + EffectRouter. Step 3b2: momentum award (round 2+, lane control based, cap 4). Step 3c: drone rebuild progress via DroneAvailabilityManager. Step 4: card draw via `performAutomaticDraw`. Step 5: quick deploy (round 1 only, if `pendingQuickDeploy` exists). Final: emit event, broadcast to guest, return next phase. |
| `processAutomaticDrawPhase(previousPhase)` | **DEAD CODE**. Never called. Superseded by `processRoundInitialization` Step 4. |
| `processAutomaticFirstPlayerPhase(previousPhase)` | **DEAD CODE**. Never called. Superseded by `processRoundInitialization` Step 2. |
| `processAutomaticEnergyResetPhase(previousPhase)` | **DEAD CODE**. 284 lines. Never called. Superseded by `processRoundInitialization` Step 3. Contains verbose diagnostic logging. |
| `processGameInitializingPhase(previousPhase)` | **DEAD CODE**. Never called. Superseded by `processRoundInitialization` Step 1. |
| `getNextPreGamePhase(currentPhase)` | Returns next phase in `PRE_GAME_PHASES` array. At end of pre-game (`roundInitialization`): delegates to `getNextRequiredPhase`. |
| `getNextRoundPhase(currentPhase)` | Iterates forward in `ROUND_PHASES`, returns first phase where `isPhaseRequired` is true. Returns null at end of round. |
| `getNextRequiredPhase(currentPhase)` | Same as `getNextRoundPhase` but with GUEST_CASCADE logging. Used by guest optimistic cascade. |
| `isPhaseRequired(phase)` | Switch on phase name. `roundInitialization`: false on round 1 (already ran via PRE_GAME_PHASES), true round 2+. `mandatoryDiscard`: checks `anyPlayerExceedsHandLimit`. `optionalDiscard`: false round 1, else `anyPlayerHasCards`. `allocateShields`: checks `anyPlayerHasShieldsToAllocate`. `mandatoryDroneRemoval`: checks `anyPlayerExceedsDroneLimit`. `deployment`: false if `_quickDeployExecutedThisRound && roundNumber === 1` (clears flag), else true. `action`: always true. Default: true. |
| `anyPlayerExceedsHandLimit(gameState)` | Uses GameDataService to get effective hand limits for both players. Returns true if either player's hand count exceeds their limit. |
| `anyPlayerHasShieldsToAllocate(gameState)` | Returns false for round 1. Returns true if `shieldsToAllocate > 0` or `opponentShieldsToAllocate > 0`. |
| `anyPlayerHasCards(gameState)` | Returns true if either player has at least 1 card in hand. |
| `anyPlayerExceedsDroneLimit(gameState)` | Uses GameDataService to get effective CPU limits. Counts non-token drones on board. Returns true if either player exceeds limit. |
| `playerExceedsHandLimit(playerId, gameState)` | Per-player hand limit check using GameDataService. |
| `playerExceedsDroneLimit(playerId, gameState)` | Per-player drone limit check using GameDataService. |
| `isSimultaneousPhase(phase)` | Returns `SIMULTANEOUS_PHASES.includes(phase)`. |
| `isSequentialPhase(phase)` | Returns `SEQUENTIAL_PHASES.includes(phase)`. |
| `isAutomaticPhase(phase)` | Returns `AUTOMATIC_PHASES.includes(phase)`. |
| `initiateSequentialPhase(phase)` | Updates `currentPhase`. Calls `processPhaseTransition` via AP (not `queueAction`). Emits `phaseTransition` with `handoverType: 'simultaneous-to-sequential'`. |
| `transitionToPhase(newPhase, trigger='unknown')` | **Async**. Guest mode: queues announcement only (via `queueAction` with `guestAnnouncementOnly`), returns. Guards against redundant transitions. PhaseManager validates transition. Updates `currentPhase`, sets `gameStage = 'roundLoop'` if entering round phase. For `placement` phase: initializes ship placement data. Calls `queueAction` for phase transition, then `_updateContext` pattern for metadata (gameStage, roundNumber, phaseData). If automatic phase and not in cascade: calls `processAutomaticPhase`. If simultaneous: calls `autoCompleteUnnecessaryCommitments`. Starts animation playback for sequential transitions. |
| `autoCompleteUnnecessaryCommitments(phase)` | **Async**. Only for `allocateShields`, `mandatoryDiscard`, `mandatoryDroneRemoval`. Checks which players need to act. Auto-commits for players who don't. In single-player: triggers AI commitment if AI needs to act but human doesn't. |
| `startNewRound()` | **Async**. Resets `_quickDeployExecutedThisRound`. Captures `firstPasser` from current round. Increments round number via GSM. Queues ROUND announcement. Finds first required phase, transitions to it. |
| `endGame(winnerId)` | Sets `gameStage = 'gameOver'`, `currentPhase = 'gameOver'`. Calls `processPhaseTransition` via AP. Sets game stage and winner via `_updateContext` pattern. Emits `gameEnded`. |
| `reset()` | Resets all local state: `currentPhase`, `gameStage`, `roundNumber`, flags. Clears listeners array. Resets PhaseManager. Emits `gameReset`. |
| `getDebugInfo()` | Returns snapshot of current flow state including phase, stage, round, connected systems. |
| `extractDronesFromDeck(droneNames)` | Maps drone name strings to full drone objects from `fullDroneCollection`. Filters out not-found. Warns per missing drone. |
| `executeQuickDeploy(quickDeploy)` | **Async**. 120 lines. Imports DeploymentProcessor. Iterates deployment order, for each: deploys player drone, updates state immediately, triggers AI single deployment response. After loop: AI finishes remaining deployments. Clears `pendingQuickDeploy` from both GSM and tacticalMapStateManager. On error: clears pending flag to prevent infinite loop. |

#### State Mutations and Their Triggers

| State | Mutated by | Trigger |
|-|-|-|
| `this.currentPhase` | `startGameFlow`, `initiateSequentialPhase`, `transitionToPhase`, `endGame`, `reset` | Phase transitions |
| `this.gameStage` | `startGameFlow`, `processRoundInitialization`, `transitionToPhase`, `endGame`, `reset` | Stage transitions |
| `this.roundNumber` | `startGameFlow`, `processAutomaticPhase` (guest sync), `startNewRound`, `reset` | Round changes (local copy, GSM is source of truth) |
| `this.isProcessingAutomaticPhase` | `processAutomaticPhase` | Set true at start, false in finally |
| `this.isInCheckpointCascade` | `processAutomaticPhasesUntilCheckpoint`, `reset` | Set true at start, false in finally |
| `this._quickDeployExecutedThisRound` | `processRoundInitialization`, `isPhaseRequired`, `startNewRound`, `reset` | Quick deploy lifecycle |
| `this.listeners` | `subscribe`, `reset` | Pub/sub management |
| `this.actionProcessorUnsubscribe` | `resubscribe` | AP subscription lifecycle |
| GSM state (via `_updateContext`) | `startGameFlow`, `onSimultaneousPhaseComplete`, `transitionToPhase`, `startNewRound`, `endGame` | Direct state metadata updates |
| GSM state (via `actionProcessor.queueAction`) | `processRoundInitialization`, `transitionToPhase`, `executeQuickDeploy`, `handleActionCompletion` | Game actions |

#### Side Effects

- **Broadcasts to guest** (host mode): After phase transitions, turn transitions, goAgain actions, round initialization, placement completion. Via `actionProcessor.broadcastStateToGuest(source)`.
- **Animation queue operations**: `phaseAnimationQueue.queueAnimation()` for opponent pass notification. `phaseAnimationQueue.startPlayback(source)` at 8 distinct call sites after various transitions.
- **Events emitted**: `phaseTransition`, `bothPlayersComplete`, `gameEnded`, `gameReset`.
- **Optimistic animation tracking**: Guest mode tracks animations via `gameStateManager.trackOptimisticAnimations()` in `processAutomaticPhase` finally block.
- **AI operations**: `aiPhaseProcessor.executeSingleDeployment()` and `finishDeploymentPhase()` in `executeQuickDeploy`. `actionProcessor.handleAICommitment()` in `autoCompleteUnnecessaryCommitments`.
- **Dynamic imports**: `cardDrawUtils.js`, `GameDataService.js`, `DeploymentProcessor.js` are dynamically imported within methods.
- **tacticalMapStateManager**: `executeQuickDeploy` clears `pendingQuickDeploy` from both GSM and run state.

#### Known Edge Cases

- **Guest mode early returns**: Almost every method has a guest guard. Guest can only queue announcements, not transition state.
- **Singleton pattern**: Constructor returns existing instance. `reset()` clears state but doesn't destroy instance.
- **Pass race condition in guest mode**: `handleActionCompletion` always triggers playback for guest regardless of `bothPassed` because optimistic processing may set `bothPassed=true` before handler runs.
- **`_quickDeployExecutedThisRound` flag**: Set in `processRoundInitialization` Step 5, consumed and cleared in `isPhaseRequired('deployment')`. Prevents deployment phase after quick deploy. Reset in `startNewRound` and `reset`.
- **Redundant transition guard**: `transitionToPhase` blocks if `newPhase === previousPhase`.
- **`_updateContext` pattern**: try/finally to set and clear `gameStateManager._updateContext = 'GameFlowManager'` for 4 state update call sites. Indicates which manager is performing the update.
- **`isInCheckpointCascade` suppression**: During cascade, automatic phases are NOT auto-processed by `transitionToPhase` — the cascade loop handles them explicitly.
- **Dynamic import of GameDataService**: `processRoundInitialization` re-imports GameDataService despite `this.gameDataService` already being set in `initialize`. The dead `processAutomaticEnergyResetPhase` has the same pattern.
- **Round 1 vs Round 2+ branching**: `isPhaseRequired` returns different results for round 1 (skips `roundInitialization`, `optionalDiscard`, `allocateShields`). Energy reset uses `initialDeploymentBudget` for round 1, `deploymentBudget` for round 2+.
- **Animation playback 8 call sites**: All follow same pattern — check queue length > 0 && !isPlaying() → startPlayback(source). Located in: `setupEventListeners` (opponent pass), `handleActionCompletion` (guest pass, host/local single pass), `onSimultaneousPhaseComplete` (sim→seq, sim→sim), `processAutomaticPhase` (host/local after cascade), `processAutomaticPhasesUntilCheckpoint` (guest after cascade), `transitionToPhase` (sequential transition).

## TO DO

### Problems

#### CODE_STANDARDS.md Violations
1. **Size**: 2,671 lines far exceeds the 800-line strong smell threshold
2. **Single responsibility**: File handles phase flow, round initialization, phase requirement checking, quick deploy execution, animation playback orchestration, and action completion handling -- at least 5 distinct concerns
3. **Test location**: All 7 test files are co-located in `src/managers/` instead of `src/managers/__tests__/`

#### Dead Code
1. **`processAutomaticDrawPhase()`** (lines 1438-1493): Never called outside this file. `processRoundInitialization()` handles card draw directly in Step 4. No external references found.
2. **`processAutomaticFirstPlayerPhase()`** (lines 1499-1533): Never called outside this file. `processRoundInitialization()` handles first player in Step 2.
3. **`processAutomaticEnergyResetPhase()`** (lines 1539-1722): 284 lines of dead code. Energy reset is handled inside `processRoundInitialization()` Step 3. Contains verbose diagnostic logging that duplicates the live code.
4. **`processGameInitializingPhase()`** (lines 1729-1753): Never called outside this file. Game initialization is handled inside `processRoundInitialization()` Step 1.
5. **`checkSequentialPhaseCompletion()`** (lines 702-728): Marked `@deprecated`, body starts with `return;` making all subsequent code unreachable.

#### Missing/Inconsistent Logging
- 27 raw `console.error`/`console.warn` calls should use `debugLog()`
- Mixed logging categories: `PHASE_TRANSITIONS`, `PHASE_MANAGER`, `PHASE_FLOW`, `CASCADE_LOOP`, `GUEST_CASCADE`, `TIMING`, `BROADCAST_TIMING`, `MULTIPLAYER` -- too many overlapping categories for phase transitions

#### Code Smell
1. **`processRoundInitialization()`** (lines 1059-1432): 373 lines -- a method this long is itself a candidate for extraction
2. **Duplicated energy reset logic**: `processAutomaticEnergyResetPhase()` duplicates `processRoundInitialization()` Step 3 almost verbatim
3. **Animation playback boilerplate**: Same 5-line pattern (check queue length, check not playing, start playback) repeated ~8 times
4. **Guest/Host/Local branching**: Nearly every method has mode-specific branches, making the control flow hard to follow
5. **`_updateContext` pattern**: `try { this.gameStateManager._updateContext = 'GameFlowManager'; ... } finally { ... = null; }` repeated 4 times
6. **`executeQuickDeploy()`** (lines 2548-2668): 120 lines of deployment logic that belongs in a dedicated quick deploy processor

### Extraction Plan

#### 1. Extract Round Initialization Logic
- **What**: `processRoundInitialization()` Steps 1-5 and supporting methods
- **Where**: `src/managers/RoundInitializationProcessor.js` (it's an orchestrator that coordinates multiple managers, not pure logic)
- **Why**: Single responsibility violation. 373 lines of round setup logic (energy reset, first player determination, card draw, rebuild progress, momentum, quick deploy) is a distinct concern from phase flow orchestration. Strategy pattern per CODE_STANDARDS.md.
- **Dependencies**: `RoundManager`, `EffectRouter`, `LaneControlCalculator`, `GameDataService`, `cardDrawUtils`, `DroneAvailabilityManager`. GFM would call `roundInitProcessor.process()` and receive the next phase.
- **Guest/Host branching**: `RoundInitializationProcessor` receives a `mode` parameter (`'host'` / `'guest'` / `'solo'`) and branches internally. The caller (GFM) determines the mode and passes it — the processor does not inspect `gameState.gameMode` itself.

#### 2. Extract Phase Requirement Checker
- **What**: `isPhaseRequired()`, `anyPlayerExceedsHandLimit()`, `anyPlayerHasShieldsToAllocate()`, `anyPlayerHasCards()`, `anyPlayerExceedsDroneLimit()`, `playerExceedsHandLimit()`, `playerExceedsDroneLimit()`
- **Where**: `src/logic/phase/PhaseRequirementChecker.js`
- **Why**: Pure query logic with no side effects. 7 methods (~240 lines) that check game state conditions. These are logic functions, not manager orchestration.
- **Dependencies**: `GameDataService`. Stateless -- receives gameState as parameter.

#### 3. Extract Quick Deploy Processor
- **What**: `executeQuickDeploy()` (lines 2548-2668)
- **Where**: `src/logic/deployment/QuickDeployProcessor.js`
- **Why**: 120 lines of deployment execution with interleaved AI response -- a distinct concern from phase flow. Imports `DeploymentProcessor` and `fullDroneCollection` directly.
- **Dependencies**: `DeploymentProcessor`, `fullDroneCollection`, `tacticalMapStateManager`, `AIPhaseProcessor`

#### 4. Extract Animation Playback Helper
- **What**: The repeated animation queue playback pattern
- **Where**: Private helper method `tryStartPlayback(source)` on GameFlowManager (not a new file -- it's a 5-line dedup)
- **Why**: Same pattern repeated 8+ times. DRY principle.
- **Dependencies**: `this.phaseAnimationQueue`

#### 5. Move Tests to `__tests__/`
- **What**: All 7 co-located test files
- **Where**: `src/managers/__tests__/GameFlowManager.test.js`, etc.
- **Why**: Test convention from CODE_STANDARDS.md

### Import Direction Diagram

After all extractions, the import graph looks like this (`A → B` means A imports from B):

```
RoundInitializationProcessor → GameStateManager
RoundInitializationProcessor → RoundManager
RoundInitializationProcessor → EffectRouter
RoundInitializationProcessor → LaneControlCalculator
RoundInitializationProcessor → GameDataService
RoundInitializationProcessor → cardDrawUtils

PhaseRequirementChecker      → GameDataService
PhaseRequirementChecker      → (receives gameState as parameter — no singleton import)

QuickDeployProcessor         → DeploymentProcessor
QuickDeployProcessor         → fullDroneCollection
QuickDeployProcessor         → tacticalMapStateManager
QuickDeployProcessor         → AIPhaseProcessor

GameFlowManager              → RoundInitializationProcessor
GameFlowManager              → PhaseRequirementChecker
GameFlowManager              → QuickDeployProcessor
GameFlowManager              → GameStateManager
GameFlowManager              → AIPhaseProcessor
```

**No circular dependencies**: All extracted files import from GameFlowManager's dependencies, not from GFM itself. GFM imports the extracted processors/checkers.

### Dead Code Removal

| Method | Lines | Reason |
|-|-|-|
| `processAutomaticDrawPhase()` | 1438-1493 | Superseded by `processRoundInitialization()` Step 4. No callers. |
| `processAutomaticFirstPlayerPhase()` | 1499-1533 | Superseded by `processRoundInitialization()` Step 2. No callers. |
| `processAutomaticEnergyResetPhase()` | 1539-1722 | Superseded by `processRoundInitialization()` Step 3. No callers. 284 lines of dead code. |
| `processGameInitializingPhase()` | 1729-1753 | Superseded by `processRoundInitialization()` Step 1. No callers. |
| `checkSequentialPhaseCompletion()` | 702-728 | Deprecated. Body starts with `return;`. Unreachable code after line 706. |

**Total dead code: ~570 lines (21% of file)**

### Logging Improvements

#### Convert raw console calls to debugLog
All 27 `console.error`/`console.warn` calls should use `debugLog()`. Specific examples:
- Line 443: `console.error('GameFlowManager listener error:')` -> `debugLog('PHASE_TRANSITIONS', 'Listener error:', error)`
- Lines 570, 584: `console.warn('No drones found...')` -> `debugLog('DRONE_SELECTION', '...')`
- Line 2664: `console.error('[Quick Deploy] Error...')` -> `debugLog('QUICK_DEPLOY', 'Error during execution:', error)`

#### Category consolidation
- Merge `PHASE_TRANSITIONS`, `PHASE_MANAGER`, `PHASE_FLOW` into `PHASE_TRANSITIONS` (single category for phase flow)
- Keep `GUEST_CASCADE` separate (guest-specific optimistic execution)
- Keep `BROADCAST_TIMING` separate (multiplayer diagnostics)
- Remove `CASCADE_LOOP` (only 2 uses, merge into `PHASE_TRANSITIONS`)

#### Noisy logs to reduce
- `processRoundInitialization()` has excessive diagnostic logging (lines 1071-1078, 1345-1358 marked "DIAGNOSTIC") that should be removed or gated behind a verbose flag
- `RESOURCE_RESET` logging at lines 1602-1668 is 66 lines of a single debug payload -- far too verbose for normal operation

### Comment Cleanup

#### Stale/noise comments to remove
- Line 121: `// NEW FLOW:` in JSDoc for `processDroneSelection` (banned comment pattern per CODE_STANDARDS)
- Line 294: `// NEW FLOW:` in JSDoc for `processDeckSelection` (banned pattern)
- Line 388-390: `// REMOVED: Legacy hard-coded placement...` (banned `// REMOVED` pattern, references deleted code)
- Line 192-199: Block comment explaining what is NOT set up here -- valid architectural note, keep
- Line 700: `@deprecated` annotation is appropriate, but the dead code beneath should be deleted entirely

#### Useful comments to add
- Add a method map / section separator at top of class showing responsibility groups (after extraction, the remaining methods)

### Testing Requirements

#### Before Extraction (intent-based tests)
1. **Phase requirement tests**: Test `isPhaseRequired()` for each phase with various game states (round 1 vs round 2+, shields available, hand exceeds limit, etc.)
2. **Round initialization integration test**: Verify `processRoundInitialization()` produces correct state updates (energy, deployment budget, first player, card draw, momentum, rebuild progress)
3. **Quick deploy test**: Verify `executeQuickDeploy()` handles interleaved player/AI deployments correctly

#### After Extraction
1. **Unit tests for `PhaseRequirementChecker`**: Move existing phase flow coverage tests, add edge cases
2. **Unit tests for `RoundInitializationProcessor`**: Test each step independently
3. **Unit tests for `QuickDeployProcessor`**: Isolated from GFM
4. **Update existing GFM tests**: Adjust imports after test file relocation

#### Test file locations
- `src/logic/phase/__tests__/PhaseRequirementChecker.test.js`
- `src/logic/round/__tests__/RoundInitializationProcessor.test.js`
- `src/logic/deployment/__tests__/QuickDeployProcessor.test.js`
- Move existing: `src/managers/__tests__/GameFlowManager.test.js` (and 6 others)

### Execution Order

1. **Delete dead code** (~570 lines): Remove `processAutomaticDrawPhase`, `processAutomaticFirstPlayerPhase`, `processAutomaticEnergyResetPhase`, `processGameInitializingPhase`, and the unreachable body of `checkSequentialPhaseCompletion`. Commit independently -- no behavior change.

2. **Fix logging**: Convert all 27 `console.error`/`console.warn` to `debugLog()`. Consolidate logging categories. Remove excessive diagnostic logging. Commit.

3. **Clean up comments**: Remove banned comment patterns (`// NEW FLOW`, `// REMOVED`). Commit.

4. **Extract `PhaseRequirementChecker`**: Write intent tests first. Extract 7 methods to `src/logic/phase/PhaseRequirementChecker.js`. Update GFM to delegate. Commit.

5. **Extract `RoundInitializationProcessor`**: Write intent tests first. Extract `processRoundInitialization()` internals. GFM calls processor and handles result. Commit.

6. **Extract `QuickDeployProcessor`**: Write intent tests. Extract `executeQuickDeploy()` to `src/logic/deployment/QuickDeployProcessor.js`. Commit.

7. **DRY animation playback**: Extract `tryStartPlayback()` helper. Replace 8 call sites. Commit.

8. **Move test files**: Relocate all 7 test files to `src/managers/__tests__/`. Update any import paths. Commit.

### Risk Assessment

#### What could break
- **Phase flow sequencing**: Extracting round initialization logic must preserve the exact ordering of steps (energy reset before card draw, quick deploy after card draw, etc.)
- **Multiplayer broadcasts**: Guest/Host mode branching in `processRoundInitialization` must be preserved exactly -- broadcast timing is critical
- **Animation queue timing**: Playback initiation points are carefully placed after specific transitions; dedup must preserve call sites

#### Drag-and-drop flows to verify
- Card drag-and-drop during action phase (verify turn transitions still work after extraction)
- Drone deployment drag-and-drop (verify deployment phase initiation)
- Shield allocation drag-and-drop (verify phase requirement check)

#### How to validate
- Run all 7 existing GFM test suites after each commit
- Run `PhaseFlowCoverage.test.js` to verify phase sequencing
- Manual smoke test: Play a full single-player game (deckSelection through multiple rounds)
- Manual smoke test: Quick deploy flow in Round 1
- Verify no raw `console.log` calls remain after logging step

## NOW

### Final State

*To be completed after refactoring.*

### Change Log

*Append entries here as refactoring steps are completed.*

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
