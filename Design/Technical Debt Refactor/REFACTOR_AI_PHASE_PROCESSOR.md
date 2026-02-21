# Refactor: AIPhaseProcessor.js

## Current State
- **Line count**: 1,414 lines (above 800-line strong smell threshold)
- **Location**: `src/managers/AIPhaseProcessor.js`
- **Singleton**: Exported as `const aiPhaseProcessor = new AIPhaseProcessor()` (line 1412)
- **Responsibilities**:
  - AI simultaneous phase processing (deck selection, drone selection, placement)
  - AI sequential turn execution (deployment, action)
  - AI discard/removal decisions (optional discard, mandatory discard, mandatory drone removal)
  - AI shield allocation
  - AI interception decisions
  - AI quick deploy response (reactive deployment)
  - AI turn scheduling and self-triggering via state subscription
  - Animation blocking detection
  - Drone selection helpers (balanced selection, personality-based)

- **Section map**:
  - Lines 1-91: Constructor, initialize, cleanup
  - Lines 124-190: Drone selection processing (`processDroneSelection`, `extractDronesFromDeck`, `randomlySelectDrones`)
  - Lines 198-290: Personality-based drone selection (`selectDronesForAI`, `selectBalancedDrones`) -- potentially dead
  - Lines 298-386: Deck selection and placement (`processDeckSelection`, `processPlacement`)
  - Lines 397-515: Deployment turn execution (`executeDeploymentTurn`)
  - Lines 522-604: Action turn execution (`executeActionTurn`)
  - Lines 612-669: Optional discard (`executeOptionalDiscardTurn`)
  - Lines 676-733: Mandatory discard (`executeMandatoryDiscardTurn`)
  - Lines 740-818: Mandatory drone removal (`executeMandatoryDroneRemovalTurn`)
  - Lines 826-854: Pass logic (`shouldPass`, `executePass`)
  - Lines 861-922: Shield allocation (`executeShieldAllocationTurn`)
  - Lines 928-1077: Turn scheduling and execution (`checkForAITurn`, `executeTurn`)
  - Lines 1088-1151: Interception decisions (`makeInterceptionDecision`)
  - Lines 1157-1168: Capabilities metadata (`getCapabilities`)
  - Lines 1175-1300: Quick deploy response (`handleQuickDeployResponse`)
  - Lines 1307-1408: Single deployment and finish deployment (`executeSingleDeployment`, `finishDeploymentPhase`)

- **Existing test coverage**: 1 co-located test file (NOT in `__tests__/`):
  - `src/managers/AIPhaseProcessor.test.js`

## Problems

### CODE_STANDARDS.md Violations
1. **Size**: 1,414 lines exceeds the 800-line strong smell threshold
2. **Single responsibility**: File handles at least 4 distinct concerns: simultaneous phase AI, sequential turn AI, turn scheduling/self-triggering, and quick deploy response
3. **Strategy pattern needed**: Many conditional branches per phase type -- CODE_STANDARDS recommends strategy pattern for processors with many conditional branches
4. **Test location**: Test file co-located instead of in `src/managers/__tests__/`

### Dead Code
1. **`selectDronesForAI()`** (lines 198-239): Only called internally by... nothing. `processDroneSelection()` uses `randomlySelectDrones()` instead. The personality-based selection was superseded.
2. **`selectBalancedDrones()`** (lines 248-290): Only called by `selectDronesForAI()` which is itself dead.
3. **`executePass()`** (lines 845-854): Never called anywhere in the codebase (grep finds 0 callers). Deployment and action turns handle pass logic inline via `actionProcessor.queueAction`.
4. **`getCapabilities()`** (lines 1157-1168): Only referenced within this file. No external callers.
5. **`handleQuickDeployResponse()`** (lines 1175-1300): Referenced only as fallback in GFM line 2643-2645 (`else if (aiProcessor.handleQuickDeployResponse)`), but `finishDeploymentPhase()` is the primary path. 125 lines of legacy code.

### Missing/Inconsistent Logging
- 6 raw `console.error`/`console.warn` calls should use `debugLog()`
- Excessive `SHIELD_CLICKS` debug logging in `executeShieldAllocationTurn()` -- 8 debugLog calls for a simple round-robin allocation

### Code Smell
1. **Duplicated pass action construction**: The same `playerPass` action payload is built in 5 separate places (`executeDeploymentTurn` x2, `executeActionTurn` x2, `shouldPass` return path)
2. **Repeated dynamic imports**: `await import('../logic/aiLogic.js')` appears 4 times, `await import('../logic/gameLogic.js')` appears 5 times. Should be top-level imports or cached.
3. **`handleQuickDeployResponse()`** duplicates deployment logic from `executeSingleDeployment()` -- same AI decision + DeploymentProcessor pattern
4. **State subscription in constructor pattern**: AI self-triggers via `gameStateManager.subscribe()` in `initialize()`, coupling turn scheduling to the processor itself
5. **`executeTurn()`** reaches into `this.gameStateManager?.gameFlowManager?.phaseAnimationQueue` (line 1010) -- circular dependency smell

### Banned Comment Patterns
- Line 121: `* NEW FLOW:` in JSDoc (banned `// NEW` variant)
- Line 294: `* NEW FLOW:` in JSDoc
- Line 388-390: `// REMOVED: Legacy hard-coded placement strategy methods` (banned `// REMOVED` pattern)

## Extraction Plan

### 1. Extract AI Simultaneous Phase Strategies
- **What**: `processDeckSelection()`, `processDroneSelection()`, `processPlacement()`, `extractDronesFromDeck()`, `randomlySelectDrones()`
- **Where**: `src/logic/ai/AISimultaneousPhaseStrategy.js`
- **Why**: These are pure AI decision functions for simultaneous phases. They don't need turn scheduling or state subscriptions. Strategy pattern per CODE_STANDARDS.md.
- **Dependencies**: `gameEngine`, `SeededRandom`, `shipComponentsToPlacement`, `GameDataService`

### 2. Extract AI Sequential Turn Strategies
- **What**: `executeDeploymentTurn()`, `executeActionTurn()`, `executeOptionalDiscardTurn()`, `executeMandatoryDiscardTurn()`, `executeMandatoryDroneRemovalTurn()`, `executeShieldAllocationTurn()`, `shouldPass()`
- **Where**: `src/logic/ai/AISequentialTurnStrategy.js`
- **Why**: These are AI decision-making functions for sequential turns. They share a common pattern (get state, make decision via aiBrain, execute via actionProcessor). Strategy pattern.
- **Dependencies**: `aiBrain` (aiLogic), `gameEngine`, `TargetingRouter`, `GameDataService`, `SeededRandom`, `actionProcessor`

### 3. Extract AI Quick Deploy Handler
- **What**: `handleQuickDeployResponse()`, `executeSingleDeployment()`, `finishDeploymentPhase()`
- **Where**: `src/logic/ai/AIQuickDeployHandler.js`
- **Why**: Quick deploy response is a distinct concern from normal turn execution. Uses `DeploymentProcessor` directly instead of `actionProcessor.queueAction`. 230+ lines.
- **Dependencies**: `aiBrain`, `gameEngine`, `DeploymentProcessor`, `GameDataService`

### 4. Keep in AIPhaseProcessor (Orchestrator)
- **What**: `initialize()`, `cleanup()`, `checkForAITurn()`, `executeTurn()`, `makeInterceptionDecision()`, pub/sub management
- **Why**: These are orchestration concerns -- when and how to trigger AI. The processor delegates decisions to extracted strategies.
- **Estimated size after extraction**: ~300-350 lines

## Dead Code Removal

| Method | Lines | Reason |
|-|-|
| `selectDronesForAI()` | 198-239 | Superseded by `randomlySelectDrones()`. No callers. |
| `selectBalancedDrones()` | 248-290 | Only called by dead `selectDronesForAI()`. |
| `executePass()` | 845-854 | Never called. Pass logic is inline in turn methods. |
| `getCapabilities()` | 1157-1168 | No external callers. Self-documenting metadata with no consumers. |
| `handleQuickDeployResponse()` | 1175-1300 | Legacy fallback. `finishDeploymentPhase()` + `executeSingleDeployment()` is the active path. |

**Total dead code: ~270 lines (19% of file)**

## Logging Improvements

### Convert raw console calls to debugLog
- Line 149: `console.error('Failed to extract minimum required drones')` -> `debugLog('AI_DECISIONS', ...)`
- Line 171: `console.warn('Drone not found in drone collection')` -> `debugLog('AI_DECISIONS', ...)`
- Line 1044: `console.warn('Unknown sequential phase')` -> `debugLog('AI_DECISIONS', ...)`
- Line 1074: `console.error('Error executing turn')` -> `debugLog('AI_DECISIONS', ...)`
- Line 1179: `console.error('[AI Quick Deploy] GameStateManager not available')` -> `debugLog('QUICK_DEPLOY', ...)`
- Line 1311: `console.error('[AI Single Deploy] GameStateManager not available')` -> `debugLog('QUICK_DEPLOY', ...)`

### Noisy logs to reduce
- `executeShieldAllocationTurn()`: 8 debugLog calls with `SHIELD_CLICKS` category for a simple round-robin loop. Reduce to entry + exit logs only.
- `checkForAITurn()`: Logs every state change even when no action is taken. Gate behind relevant conditions.
- `TURN_TRANSITION_DEBUG` in `initialize()` subscription (line 71-77): Fires on every state change. Too noisy.

### Categories to standardize
- Use `AI_DECISIONS` for all AI decision-making
- Use `AI_DEPLOYMENT` for deployment-specific logging
- Use `QUICK_DEPLOY` for quick deploy response
- Remove `SHIELD_CLICKS` (debugging artifact)
- Remove `TURN_TRANSITION_DEBUG` from subscription handler

## Comment Cleanup

### Stale/noise comments to remove
- Line 121: `* NEW FLOW: Selects 5 drones from AI's deck of 10 drones` -- remove `NEW FLOW:` prefix
- Line 294: `* NEW FLOW: Returns both deck (40 cards) and drones (10 drones)` -- remove `NEW FLOW:` prefix
- Lines 388-390: `// REMOVED: Legacy hard-coded placement strategy methods...` -- delete entirely (references deleted code)

### Useful comments to add
- Add a brief class-level description of the orchestrator pattern after extraction (AIPhaseProcessor orchestrates, strategies decide)

## Testing Requirements

### Before Extraction (intent-based tests)
1. **AI drone selection test**: Verify `processDroneSelection()` returns exactly 5 drones from a 10-drone deck
2. **AI deck selection test**: Verify `processDeckSelection()` returns deck, drones, and shipComponents
3. **AI deployment turn test**: Verify `executeDeploymentTurn()` either deploys or passes
4. **AI action turn test**: Verify `executeActionTurn()` executes action or passes
5. **AI mandatory discard test**: Verify lowest-cost cards discarded first
6. **AI drone removal test**: Verify removal from strongest lanes, lowest class first
7. **AI shield allocation test**: Verify even distribution across sections
8. **AI interception test**: Verify delegation to `aiBrain.makeInterceptionDecision`

### After Extraction
1. **Unit tests for `AISimultaneousPhaseStrategy`**: Pure function tests with mock game state
2. **Unit tests for `AISequentialTurnStrategy`**: Mock actionProcessor and aiBrain
3. **Unit tests for `AIQuickDeployHandler`**: Mock DeploymentProcessor
4. **Update `AIPhaseProcessor.test.js`**: Adjust for delegated architecture
5. **Move existing test**: `src/managers/__tests__/AIPhaseProcessor.test.js`

### Test file locations
- `src/logic/ai/__tests__/AISimultaneousPhaseStrategy.test.js`
- `src/logic/ai/__tests__/AISequentialTurnStrategy.test.js`
- `src/logic/ai/__tests__/AIQuickDeployHandler.test.js`
- Move: `src/managers/__tests__/AIPhaseProcessor.test.js`

## Execution Order

1. **Delete dead code** (~270 lines): Remove `selectDronesForAI`, `selectBalancedDrones`, `executePass`, `getCapabilities`, `handleQuickDeployResponse`. Remove GFM fallback reference to `handleQuickDeployResponse` (GFM line 2643-2645). Commit.

2. **Fix logging**: Convert 6 `console.error`/`console.warn` to `debugLog()`. Reduce `SHIELD_CLICKS` noise. Remove `TURN_TRANSITION_DEBUG` from subscription. Commit.

3. **Clean up comments**: Remove `NEW FLOW:` prefixes and `// REMOVED:` block. Commit.

4. **Deduplicate pass action construction**: Extract `buildPassAction(phase)` helper to reduce 5 copies to 1. Commit.

5. **Convert dynamic imports to top-level**: Move repeated `await import('../logic/aiLogic.js')` and `await import('../logic/gameLogic.js')` to static imports at top of file. Commit.

6. **Extract `AISimultaneousPhaseStrategy`**: Write intent tests. Extract 5 methods. AIPhaseProcessor delegates. Commit.

7. **Extract `AISequentialTurnStrategy`**: Write intent tests. Extract 7 methods. AIPhaseProcessor delegates. Commit.

8. **Extract `AIQuickDeployHandler`**: Write intent tests. Extract `executeSingleDeployment` and `finishDeploymentPhase`. Commit.

9. **Fix circular dependency**: Remove `this.gameStateManager?.gameFlowManager?.phaseAnimationQueue` access in `executeTurn()`. Inject animation blocking check as a callback during initialization instead. Commit.

10. **Move test file**: Relocate to `src/managers/__tests__/AIPhaseProcessor.test.js`. Commit.

## Risk Assessment

### What could break
- **AI turn timing**: The self-triggering subscription (`checkForAITurn`) is sensitive to timing. Extraction must preserve the 1.5s delay and animation blocking checks.
- **Quick deploy interleaving**: `executeSingleDeployment()` is called from GFM's `executeQuickDeploy()` -- must preserve the exact call signature and state update pattern.
- **Interception flow**: `makeInterceptionDecision()` is called from ActionProcessor during combat resolution. The delegation path must remain synchronous-compatible.
- **Dynamic import removal**: Converting `await import()` to static imports changes module loading order. Must verify no circular dependency issues.

### Drag-and-drop flows to verify
- Player card drag-and-drop during action phase when AI is opponent (verify AI turn triggers correctly after player's turn)
- Drone deployment drag-and-drop (verify AI responds to turn transition)
- Quick deploy template application (verify interleaved AI deployment still works)

### How to validate
- Run existing `AIPhaseProcessor.test.js` after each commit
- Run `GameFlowManager.quickDeploy.test.js` after quick deploy extraction
- Manual smoke test: Full single-player game through multiple rounds
- Manual smoke test: AI interception scenario (attack AI drone that has interceptors)
- Manual smoke test: Quick deploy in Round 1
- Verify no raw `console.log` calls remain after logging step

---

## Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

*To be completed before refactoring begins. This section documents the current behavior, intent, contracts, dependencies, edge cases, and non-obvious design decisions of the code being refactored. Once written, this section is never modified — it serves as the permanent "before" record.*

## Change Log

*Append entries here as refactoring steps are completed.*

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
