# Refactor: GameFlowManager.js

## Current State
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

## Problems

### CODE_STANDARDS.md Violations
1. **Size**: 2,671 lines far exceeds the 800-line strong smell threshold
2. **Single responsibility**: File handles phase flow, round initialization, phase requirement checking, quick deploy execution, animation playback orchestration, and action completion handling -- at least 5 distinct concerns
3. **Test location**: All 7 test files are co-located in `src/managers/` instead of `src/managers/__tests__/`

### Dead Code
1. **`processAutomaticDrawPhase()`** (lines 1438-1493): Never called outside this file. `processRoundInitialization()` handles card draw directly in Step 4. No external references found.
2. **`processAutomaticFirstPlayerPhase()`** (lines 1499-1533): Never called outside this file. `processRoundInitialization()` handles first player in Step 2.
3. **`processAutomaticEnergyResetPhase()`** (lines 1539-1722): 284 lines of dead code. Energy reset is handled inside `processRoundInitialization()` Step 3. Contains verbose diagnostic logging that duplicates the live code.
4. **`processGameInitializingPhase()`** (lines 1729-1753): Never called outside this file. Game initialization is handled inside `processRoundInitialization()` Step 1.
5. **`checkSequentialPhaseCompletion()`** (lines 702-728): Marked `@deprecated`, body starts with `return;` making all subsequent code unreachable.

### Missing/Inconsistent Logging
- 27 raw `console.error`/`console.warn` calls should use `debugLog()`
- Mixed logging categories: `PHASE_TRANSITIONS`, `PHASE_MANAGER`, `PHASE_FLOW`, `CASCADE_LOOP`, `GUEST_CASCADE`, `TIMING`, `BROADCAST_TIMING`, `MULTIPLAYER` -- too many overlapping categories for phase transitions

### Code Smell
1. **`processRoundInitialization()`** (lines 1059-1432): 373 lines -- a method this long is itself a candidate for extraction
2. **Duplicated energy reset logic**: `processAutomaticEnergyResetPhase()` duplicates `processRoundInitialization()` Step 3 almost verbatim
3. **Animation playback boilerplate**: Same 5-line pattern (check queue length, check not playing, start playback) repeated ~8 times
4. **Guest/Host/Local branching**: Nearly every method has mode-specific branches, making the control flow hard to follow
5. **`_updateContext` pattern**: `try { this.gameStateManager._updateContext = 'GameFlowManager'; ... } finally { ... = null; }` repeated 4 times
6. **`executeQuickDeploy()`** (lines 2548-2668): 120 lines of deployment logic that belongs in a dedicated quick deploy processor

## Extraction Plan

### 1. Extract Round Initialization Logic
- **What**: `processRoundInitialization()` Steps 1-5 and supporting methods
- **Where**: `src/logic/round/RoundInitializationProcessor.js`
- **Why**: Single responsibility violation. 373 lines of round setup logic (energy reset, first player determination, card draw, rebuild progress, momentum, quick deploy) is a distinct concern from phase flow orchestration. Strategy pattern per CODE_STANDARDS.md.
- **Dependencies**: `RoundManager`, `EffectRouter`, `LaneControlCalculator`, `GameDataService`, `cardDrawUtils`, `DroneAvailabilityManager`. GFM would call `roundInitProcessor.process()` and receive the next phase.

### 2. Extract Phase Requirement Checker
- **What**: `isPhaseRequired()`, `anyPlayerExceedsHandLimit()`, `anyPlayerHasShieldsToAllocate()`, `anyPlayerHasCards()`, `anyPlayerExceedsDroneLimit()`, `playerExceedsHandLimit()`, `playerExceedsDroneLimit()`
- **Where**: `src/logic/phase/PhaseRequirementChecker.js`
- **Why**: Pure query logic with no side effects. 7 methods (~240 lines) that check game state conditions. These are logic functions, not manager orchestration.
- **Dependencies**: `GameDataService`. Stateless -- receives gameState as parameter.

### 3. Extract Quick Deploy Processor
- **What**: `executeQuickDeploy()` (lines 2548-2668)
- **Where**: `src/logic/deployment/QuickDeployProcessor.js`
- **Why**: 120 lines of deployment execution with interleaved AI response -- a distinct concern from phase flow. Imports `DeploymentProcessor` and `fullDroneCollection` directly.
- **Dependencies**: `DeploymentProcessor`, `fullDroneCollection`, `tacticalMapStateManager`, `AIPhaseProcessor`

### 4. Extract Animation Playback Helper
- **What**: The repeated animation queue playback pattern
- **Where**: Private helper method `tryStartPlayback(source)` on GameFlowManager (not a new file -- it's a 5-line dedup)
- **Why**: Same pattern repeated 8+ times. DRY principle.
- **Dependencies**: `this.phaseAnimationQueue`

### 5. Move Tests to `__tests__/`
- **What**: All 7 co-located test files
- **Where**: `src/managers/__tests__/GameFlowManager.test.js`, etc.
- **Why**: Test convention from CODE_STANDARDS.md

## Dead Code Removal

| Method | Lines | Reason |
|-|-|
| `processAutomaticDrawPhase()` | 1438-1493 | Superseded by `processRoundInitialization()` Step 4. No callers. |
| `processAutomaticFirstPlayerPhase()` | 1499-1533 | Superseded by `processRoundInitialization()` Step 2. No callers. |
| `processAutomaticEnergyResetPhase()` | 1539-1722 | Superseded by `processRoundInitialization()` Step 3. No callers. 284 lines of dead code. |
| `processGameInitializingPhase()` | 1729-1753 | Superseded by `processRoundInitialization()` Step 1. No callers. |
| `checkSequentialPhaseCompletion()` | 702-728 | Deprecated. Body starts with `return;`. Unreachable code after line 706. |

**Total dead code: ~570 lines (21% of file)**

## Logging Improvements

### Convert raw console calls to debugLog
All 27 `console.error`/`console.warn` calls should use `debugLog()`. Specific examples:
- Line 443: `console.error('GameFlowManager listener error:')` -> `debugLog('PHASE_TRANSITIONS', 'Listener error:', error)`
- Lines 570, 584: `console.warn('No drones found...')` -> `debugLog('DRONE_SELECTION', '...')`
- Line 2664: `console.error('[Quick Deploy] Error...')` -> `debugLog('QUICK_DEPLOY', 'Error during execution:', error)`

### Category consolidation
- Merge `PHASE_TRANSITIONS`, `PHASE_MANAGER`, `PHASE_FLOW` into `PHASE_TRANSITIONS` (single category for phase flow)
- Keep `GUEST_CASCADE` separate (guest-specific optimistic execution)
- Keep `BROADCAST_TIMING` separate (multiplayer diagnostics)
- Remove `CASCADE_LOOP` (only 2 uses, merge into `PHASE_TRANSITIONS`)

### Noisy logs to reduce
- `processRoundInitialization()` has excessive diagnostic logging (lines 1071-1078, 1345-1358 marked "DIAGNOSTIC") that should be removed or gated behind a verbose flag
- `RESOURCE_RESET` logging at lines 1602-1668 is 66 lines of a single debug payload -- far too verbose for normal operation

## Comment Cleanup

### Stale/noise comments to remove
- Line 121: `// NEW FLOW:` in JSDoc for `processDroneSelection` (banned comment pattern per CODE_STANDARDS)
- Line 294: `// NEW FLOW:` in JSDoc for `processDeckSelection` (banned pattern)
- Line 388-390: `// REMOVED: Legacy hard-coded placement...` (banned `// REMOVED` pattern, references deleted code)
- Line 192-199: Block comment explaining what is NOT set up here -- valid architectural note, keep
- Line 700: `@deprecated` annotation is appropriate, but the dead code beneath should be deleted entirely

### Useful comments to add
- Add a method map / section separator at top of class showing responsibility groups (after extraction, the remaining methods)

## Testing Requirements

### Before Extraction (intent-based tests)
1. **Phase requirement tests**: Test `isPhaseRequired()` for each phase with various game states (round 1 vs round 2+, shields available, hand exceeds limit, etc.)
2. **Round initialization integration test**: Verify `processRoundInitialization()` produces correct state updates (energy, deployment budget, first player, card draw, momentum, rebuild progress)
3. **Quick deploy test**: Verify `executeQuickDeploy()` handles interleaved player/AI deployments correctly

### After Extraction
1. **Unit tests for `PhaseRequirementChecker`**: Move existing phase flow coverage tests, add edge cases
2. **Unit tests for `RoundInitializationProcessor`**: Test each step independently
3. **Unit tests for `QuickDeployProcessor`**: Isolated from GFM
4. **Update existing GFM tests**: Adjust imports after test file relocation

### Test file locations
- `src/logic/phase/__tests__/PhaseRequirementChecker.test.js`
- `src/logic/round/__tests__/RoundInitializationProcessor.test.js`
- `src/logic/deployment/__tests__/QuickDeployProcessor.test.js`
- Move existing: `src/managers/__tests__/GameFlowManager.test.js` (and 6 others)

## Execution Order

1. **Delete dead code** (~570 lines): Remove `processAutomaticDrawPhase`, `processAutomaticFirstPlayerPhase`, `processAutomaticEnergyResetPhase`, `processGameInitializingPhase`, and the unreachable body of `checkSequentialPhaseCompletion`. Commit independently -- no behavior change.

2. **Fix logging**: Convert all 27 `console.error`/`console.warn` to `debugLog()`. Consolidate logging categories. Remove excessive diagnostic logging. Commit.

3. **Clean up comments**: Remove banned comment patterns (`// NEW FLOW`, `// REMOVED`). Commit.

4. **Extract `PhaseRequirementChecker`**: Write intent tests first. Extract 7 methods to `src/logic/phase/PhaseRequirementChecker.js`. Update GFM to delegate. Commit.

5. **Extract `RoundInitializationProcessor`**: Write intent tests first. Extract `processRoundInitialization()` internals. GFM calls processor and handles result. Commit.

6. **Extract `QuickDeployProcessor`**: Write intent tests. Extract `executeQuickDeploy()` to `src/logic/deployment/QuickDeployProcessor.js`. Commit.

7. **DRY animation playback**: Extract `tryStartPlayback()` helper. Replace 8 call sites. Commit.

8. **Move test files**: Relocate all 7 test files to `src/managers/__tests__/`. Update any import paths. Commit.

## Risk Assessment

### What could break
- **Phase flow sequencing**: Extracting round initialization logic must preserve the exact ordering of steps (energy reset before card draw, quick deploy after card draw, etc.)
- **Multiplayer broadcasts**: Guest/Host mode branching in `processRoundInitialization` must be preserved exactly -- broadcast timing is critical
- **Animation queue timing**: Playback initiation points are carefully placed after specific transitions; dedup must preserve call sites

### Drag-and-drop flows to verify
- Card drag-and-drop during action phase (verify turn transitions still work after extraction)
- Drone deployment drag-and-drop (verify deployment phase initiation)
- Shield allocation drag-and-drop (verify phase requirement check)

### How to validate
- Run all 7 existing GFM test suites after each commit
- Run `PhaseFlowCoverage.test.js` to verify phase sequencing
- Manual smoke test: Play a full single-player game (deckSelection through multiple rounds)
- Manual smoke test: Quick deploy flow in Round 1
- Verify no raw `console.log` calls remain after logging step

---

## Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

*To be completed before refactoring begins. This section documents the current behavior, intent, contracts, dependencies, edge cases, and non-obvious design decisions of the code being refactored. Once written, this section is never modified — it serves as the permanent "before" record.*

## Change Log

*Append entries here as refactoring steps are completed.*

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
