# Refactor: AIPhaseProcessor.js

## BEFORE

### Current State
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

### Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

#### Exports / Public API

**Default export**: Singleton instance `aiPhaseProcessor = new AIPhaseProcessor()`.

| Method | Params | Returns | Contract |
|-|-|-|-|
| `initialize(aiPersonalities, dronePool, currentPersonality, actionProcessor?, gameStateManager?)` | AI config + game services | void | Idempotent (skips if `isInitialized`). Cleans up prior subscription. Creates `GameDataService`, `effectiveShipStatsWrapper`. Subscribes to state changes for AI turn detection. |
| `cleanup()` | none | void | Clears `turnTimer`, unsubscribes from state, resets `isProcessing`/`isInitialized`. |
| `processDroneSelection(aiPersonality?)` | optional personality | `Promise<Array>` (5 drones) | Reads AI deck from `commitments.deckSelection.player2`. Maps names→objects via `extractDronesFromDeck`. Selects 5 randomly via `randomlySelectDrones`. Throws if <5 drones extracted. |
| `extractDronesFromDeck(droneNames)` | string[] | drone[] | Maps names to objects from `this.dronePool`. Filters nulls. Warns on missing drones. |
| `randomlySelectDrones(availableDrones, count)` | drones[], number | drone[] | Uses `SeededRandom.fromGameState` for deterministic shuffle, returns first N. |
| `processDeckSelection(aiPersonality?)` | optional personality | `Promise<{deck, drones, shipComponents}>` | Builds deck via `gameEngine.buildDeckFromList` using personality decklist or fallback. Returns 40-card deck, 5-10 drone names, and shipComponents map. |
| `processPlacement(aiPersonality?)` | optional personality | `Promise<string[]>` | Converts `personality.shipComponents` to placement array via `shipComponentsToPlacement`. Falls back to `['bridge', 'powerCell', 'droneControlHub']`. |
| `executeDeploymentTurn(gameState)` | game state | `Promise<void>` | Checks `shouldPass`. If not, calls `aiBrain.handleOpponentTurn` for deployment decision. On deploy success: queues deployment + turnTransition. On deploy failure: forces pass (prevents infinite loop). On pass decision: queues playerPass. |
| `executeActionTurn(gameState)` | game state | `Promise<Object\|null>` | Checks `shouldPass`. Calls `aiBrain.handleOpponentAction`. On pass: queues playerPass, returns null. On action: queues aiAction, returns result (may contain `needsInterceptionDecision`). |
| `executeOptionalDiscardTurn(gameState)` | game state | `Promise<{type, cardsToDiscard, playerId, updatedPlayerState}>` | Discards excess cards above hand limit (lowest cost first). Draws to hand limit via `gameEngine.drawToHandLimit`. Returns updated state. |
| `executeMandatoryDiscardTurn(gameState)` | game state | `Promise<{type, cardsToDiscard, playerId, updatedPlayerState}>` | Discards lowest-cost cards to meet hand limit. Groups by cost, shuffles within group, selects from lowest. |
| `executeMandatoryDroneRemovalTurn(gameState)` | game state | `Promise<{type, dronesToRemove, playerId, updatedPlayerState}>` | Removes drones exceeding CPU limit. Prioritizes: cheapest drones from strongest lanes (lane score = AI power - opponent power). |
| `shouldPass(gameState, phase)` | game state, phase string | boolean | Returns true if `passInfo.player2Passed` is true. Otherwise false. |
| `executeShieldAllocationTurn(gameState)` | game state | `Promise<void>` | Round-robin distributes `opponentShieldsToAllocate` across placed sections via `actionProcessor.processAddShield`. |
| `checkForAITurn(state)` | game state | void | Guards: not processing, local mode, not game over, sequential phase, player2 turn, not passed. Clears existing timer, schedules `executeTurn()` after 1500ms. |
| `executeTurn()` | none | `Promise<void>` | Fetches fresh state. Re-validates: still player2 turn, not passed, sequential phase. Checks animation blocking (phaseAnimationQueue, animationManager). If blocked, reschedules after 500ms. Dispatches to `executeDeploymentTurn` or `executeActionTurn`. Handles interception pause. Schedules continuation if AI still has turn. |
| `makeInterceptionDecision(interceptors, attackDetails)` | interceptors[], attack context | `Promise<{interceptor}>` | Delegates to `aiBrain.makeInterceptionDecision`. Logs decision to game state via `addLogEntry`. |
| `executeSingleDeployment()` | none | `Promise<{success, drone}\|null>` | Gets fresh state. Calls `aiBrain.handleOpponentTurn`. If deploy, uses `DeploymentProcessor.executeDeployment` directly. Updates state. Returns result or null. |
| `finishDeploymentPhase()` | none | `Promise<void>` | Loop: calls `executeSingleDeployment` up to 10 times until null returned. |

**Dead code methods** (no external callers): `selectDronesForAI`, `selectBalancedDrones`, `executePass`, `getCapabilities`, `handleQuickDeployResponse`.

#### State Mutations and Their Triggers

| State | Mutated By | Trigger |
|-|-|-|
| `this.isProcessing` | `executeTurn()` | Set true at start, false in finally block and on interception pause |
| `this.turnTimer` | `checkForAITurn()`, `executeTurn()` | `setTimeout` IDs for 1500ms delay (initial) or 500ms retry (animation blocked) |
| `this.isInitialized` | `initialize()`, `cleanup()` | Set true after init, false on cleanup |
| `this.stateSubscriptionCleanup` | `initialize()`, `cleanup()` | Subscription cleanup function from `gameStateManager.subscribe` |
| `gameStateManager state` | `executeSingleDeployment()` | Direct `setState({player2: ...})` after successful deployment |
| `actionProcessor queue` | `executeDeploymentTurn`, `executeActionTurn`, `executeShieldAllocationTurn` | Via `queueAction()` and `processAddShield()` |

#### Side Effects

- **Timers**: `setTimeout` in `checkForAITurn` (1500ms), `executeTurn` animation retry (500ms), continuation scheduling (100ms)
- **State subscription**: `gameStateManager.subscribe` in `initialize()` — fires `checkForAITurn` on every state change
- **Action queue writes**: `actionProcessor.queueAction` for deployment, pass, turnTransition, aiAction
- **Direct state writes**: `gameStateManager.setState` in `executeSingleDeployment` (quick deploy path only)
- **Log entries**: `gameStateManager.addLogEntry` in `makeInterceptionDecision`, `executeSingleDeployment` log callbacks
- **Dynamic imports**: `aiLogic.js`, `gameLogic.js`, `TargetingRouter.js`, `DeploymentProcessor.js` loaded on demand

#### Known Edge Cases

- **Animation blocking**: `executeTurn` checks both `phaseAnimationQueue.isPlaying()` and `animationManager.isBlocking` before acting. If either is true, reschedules after 500ms. This creates a circular reference: `AIPhaseProcessor → gameStateManager → gameFlowManager → phaseAnimationQueue`.
- **Infinite loop guard**: `executeDeploymentTurn` forces pass on deployment failure to prevent AI repeatedly trying to deploy an undeployable drone.
- **CPU limit fallback**: When deployment fails for any reason (CPU limit, energy, deployment limit), AI passes turn.
- **Interception pause**: When AI attack triggers human interception decision, `isProcessing` is set false and AI turn loop stops until state change re-triggers it.
- **Fresh state pattern**: `executeTurn()` always fetches fresh state, never trusts the delayed callback's captured state.
- **Singleton**: Exported as module-level singleton. `initialize()` is idempotent via `isInitialized` guard.
- **Quick deploy dual path**: `executeSingleDeployment` uses `DeploymentProcessor` directly (not `actionProcessor.queueAction`), bypassing the normal action queue. This is intentional for silent interleaved deployment.

## TO DO

### Problems

#### CODE_STANDARDS.md Violations
1. **Size**: 1,414 lines exceeds the 800-line strong smell threshold
2. **Single responsibility**: File handles at least 4 distinct concerns: simultaneous phase AI, sequential turn AI, turn scheduling/self-triggering, and quick deploy response
3. **Strategy pattern needed**: Many conditional branches per phase type -- CODE_STANDARDS recommends strategy pattern for processors with many conditional branches
4. **Test location**: Test file co-located instead of in `src/managers/__tests__/`

#### Dead Code
1. **`selectDronesForAI()`** (lines 198-239): Only called internally by... nothing. `processDroneSelection()` uses `randomlySelectDrones()` instead. The personality-based selection was superseded.
2. **`selectBalancedDrones()`** (lines 248-290): Only called by `selectDronesForAI()` which is itself dead.
3. **`executePass()`** (lines 845-854): Never called anywhere in the codebase (grep finds 0 callers). Deployment and action turns handle pass logic inline via `actionProcessor.queueAction`.
4. **`getCapabilities()`** (lines 1157-1168): Only referenced within this file. No external callers.
5. **`handleQuickDeployResponse()`** (lines 1175-1300): Referenced only as fallback in GFM line 2643-2645 (`else if (aiProcessor.handleQuickDeployResponse)`), but `finishDeploymentPhase()` is the primary path. 125 lines of legacy code.

#### Missing/Inconsistent Logging
- 6 raw `console.error`/`console.warn` calls should use `debugLog()`
- Excessive `SHIELD_CLICKS` debug logging in `executeShieldAllocationTurn()` -- 8 debugLog calls for a simple round-robin allocation

#### Code Smell
1. **Duplicated pass action construction**: The same `playerPass` action payload is built in 5 separate places (`executeDeploymentTurn` x2, `executeActionTurn` x2, `shouldPass` return path)
2. **Repeated dynamic imports**: `await import('../logic/aiLogic.js')` appears 4 times, `await import('../logic/gameLogic.js')` appears 5 times. Should be top-level imports or cached.
3. **`handleQuickDeployResponse()`** duplicates deployment logic from `executeSingleDeployment()` -- same AI decision + DeploymentProcessor pattern
4. **State subscription in constructor pattern**: AI self-triggers via `gameStateManager.subscribe()` in `initialize()`, coupling turn scheduling to the processor itself
5. **`executeTurn()`** reaches into `this.gameStateManager?.gameFlowManager?.phaseAnimationQueue` (line 1010) -- circular dependency smell

#### Banned Comment Patterns
- Line 121: `* NEW FLOW:` in JSDoc (banned `// NEW` variant)
- Line 294: `* NEW FLOW:` in JSDoc
- Line 388-390: `// REMOVED: Legacy hard-coded placement strategy methods` (banned `// REMOVED` pattern)

### Extraction Plan

#### 1. Extract AI Simultaneous Phase Strategies
- **What**: `processDeckSelection()`, `processDroneSelection()`, `processPlacement()`, `extractDronesFromDeck()`, `randomlySelectDrones()`
- **Where**: `src/logic/ai/AISimultaneousPhaseStrategy.js`
- **Why**: These are pure AI decision functions for simultaneous phases. They don't need turn scheduling or state subscriptions. Strategy pattern per CODE_STANDARDS.md.
- **Dependencies**: `gameEngine`, `SeededRandom`, `shipComponentsToPlacement`, `GameDataService`

#### 2. Extract AI Sequential Turn Strategies
- **What**: `executeDeploymentTurn()`, `executeActionTurn()`, `executeOptionalDiscardTurn()`, `executeMandatoryDiscardTurn()`, `executeMandatoryDroneRemovalTurn()`, `executeShieldAllocationTurn()`, `shouldPass()`
- **Where**: `src/logic/ai/AISequentialTurnStrategy.js`
- **Why**: These are AI decision-making functions for sequential turns. They share a common pattern (get state, make decision via aiBrain, execute via actionProcessor). Strategy pattern.
- **Dependencies**: `aiBrain` (aiLogic), `gameEngine`, `TargetingRouter`, `GameDataService`, `SeededRandom`, `actionProcessor`
- **Size risk**: If `AISequentialTurnStrategy.js` exceeds 400 lines after extraction, split into `AIDeploymentTurnStrategy.js` (deployment turns) and `AIDiscardRemovalTurnStrategy.js` (discard/removal/shield turns).

#### 3. Extract AI Quick Deploy Handler
- **What**: `handleQuickDeployResponse()`, `executeSingleDeployment()`, `finishDeploymentPhase()`
- **Where**: `src/logic/ai/AIQuickDeployHandler.js`
- **Why**: Quick deploy response is a distinct concern from normal turn execution. Uses `DeploymentProcessor` directly instead of `actionProcessor.queueAction`. 230+ lines.
- **Dependencies**: `aiBrain`, `gameEngine`, `DeploymentProcessor`, `GameDataService`

#### 4. Keep in AIPhaseProcessor (Orchestrator)
- **What**: `initialize()`, `cleanup()`, `checkForAITurn()`, `executeTurn()`, `makeInterceptionDecision()`, pub/sub management
- **Why**: These are orchestration concerns -- when and how to trigger AI. The processor delegates decisions to extracted strategies.
- **Estimated size after extraction**: ~300-350 lines

### Import Direction Diagram

After all extractions, the import graph looks like this (`A → B` means A imports from B):

```
AISimultaneousPhaseStrategy → gameEngine
AISimultaneousPhaseStrategy → SeededRandom
AISimultaneousPhaseStrategy → shipComponentsToPlacement
AISimultaneousPhaseStrategy → GameDataService

AISequentialTurnStrategy    → aiLogic (aiBrain)
AISequentialTurnStrategy    → gameEngine
AISequentialTurnStrategy    → TargetingRouter
AISequentialTurnStrategy    → GameDataService
AISequentialTurnStrategy    → actionProcessor

AIQuickDeployHandler        → aiLogic (aiBrain)
AIQuickDeployHandler        → gameEngine
AIQuickDeployHandler        → DeploymentProcessor
AIQuickDeployHandler        → GameDataService

AIPhaseProcessor            → AISimultaneousPhaseStrategy
AIPhaseProcessor            → AISequentialTurnStrategy
AIPhaseProcessor            → AIQuickDeployHandler
AIPhaseProcessor            → GameStateManager
AIPhaseProcessor            → actionProcessor
```

**No circular dependencies**: Extracted strategies import from shared logic/data modules, not from AIPhaseProcessor. AIPhaseProcessor imports the strategies it orchestrates.

### Dead Code Removal

| Method | Lines | Reason |
|-|-|-|
| `selectDronesForAI()` | 198-239 | Superseded by `randomlySelectDrones()`. No callers. |
| `selectBalancedDrones()` | 248-290 | Only called by dead `selectDronesForAI()`. |
| `executePass()` | 845-854 | Never called. Pass logic is inline in turn methods. |
| `getCapabilities()` | 1157-1168 | No external callers. Self-documenting metadata with no consumers. |
| `handleQuickDeployResponse()` | 1175-1300 | Legacy fallback. `finishDeploymentPhase()` + `executeSingleDeployment()` is the active path. |

**Total dead code: ~270 lines (19% of file)**

### Logging Improvements

#### Convert raw console calls to debugLog
- Line 149: `console.error('Failed to extract minimum required drones')` -> `debugLog('AI_DECISIONS', ...)`
- Line 171: `console.warn('Drone not found in drone collection')` -> `debugLog('AI_DECISIONS', ...)`
- Line 1044: `console.warn('Unknown sequential phase')` -> `debugLog('AI_DECISIONS', ...)`
- Line 1074: `console.error('Error executing turn')` -> `debugLog('AI_DECISIONS', ...)`
- Line 1179: `console.error('[AI Quick Deploy] GameStateManager not available')` -> `debugLog('QUICK_DEPLOY', ...)`
- Line 1311: `console.error('[AI Single Deploy] GameStateManager not available')` -> `debugLog('QUICK_DEPLOY', ...)`

#### Noisy logs to reduce
- `executeShieldAllocationTurn()`: 8 debugLog calls with `SHIELD_CLICKS` category for a simple round-robin loop. Reduce to entry + exit logs only.
- `checkForAITurn()`: Logs every state change even when no action is taken. Gate behind relevant conditions.
- `TURN_TRANSITION_DEBUG` in `initialize()` subscription (line 71-77): Fires on every state change. Too noisy.

#### Categories to standardize
- Use `AI_DECISIONS` for all AI decision-making
- Use `AI_DEPLOYMENT` for deployment-specific logging
- Use `QUICK_DEPLOY` for quick deploy response
- Remove `SHIELD_CLICKS` (debugging artifact)
- Remove `TURN_TRANSITION_DEBUG` from subscription handler

### Comment Cleanup

#### Stale/noise comments to remove
- Line 121: `* NEW FLOW: Selects 5 drones from AI's deck of 10 drones` -- remove `NEW FLOW:` prefix
- Line 294: `* NEW FLOW: Returns both deck (40 cards) and drones (10 drones)` -- remove `NEW FLOW:` prefix
- Lines 388-390: `// REMOVED: Legacy hard-coded placement strategy methods...` -- delete entirely (references deleted code)

**Note**: These line numbers should be independently verified before cleanup — they may have been copied from another plan and may not match the actual file.

#### Useful comments to add
- Add a brief class-level description of the orchestrator pattern after extraction (AIPhaseProcessor orchestrates, strategies decide)

### Testing Requirements

#### Before Extraction (intent-based tests)
1. **AI drone selection test**: Verify `processDroneSelection()` returns exactly 5 drones from a 10-drone deck
2. **AI deck selection test**: Verify `processDeckSelection()` returns deck, drones, and shipComponents
3. **AI deployment turn test**: Verify `executeDeploymentTurn()` either deploys or passes
4. **AI action turn test**: Verify `executeActionTurn()` executes action or passes
5. **AI mandatory discard test**: Verify lowest-cost cards discarded first
6. **AI drone removal test**: Verify removal from strongest lanes, lowest class first
7. **AI shield allocation test**: Verify even distribution across sections
8. **AI interception test**: Verify delegation to `aiBrain.makeInterceptionDecision`

#### After Extraction
1. **Unit tests for `AISimultaneousPhaseStrategy`**: Pure function tests with mock game state
2. **Unit tests for `AISequentialTurnStrategy`**: Mock actionProcessor and aiBrain
3. **Unit tests for `AIQuickDeployHandler`**: Mock DeploymentProcessor
4. **Update `AIPhaseProcessor.test.js`**: Adjust for delegated architecture
5. **Move existing test**: `src/managers/__tests__/AIPhaseProcessor.test.js`

#### Test file locations
- `src/logic/ai/__tests__/AISimultaneousPhaseStrategy.test.js`
- `src/logic/ai/__tests__/AISequentialTurnStrategy.test.js`
- `src/logic/ai/__tests__/AIQuickDeployHandler.test.js`
- Move: `src/managers/__tests__/AIPhaseProcessor.test.js`

### Execution Order

1. **Delete dead code** (~270 lines): Remove `selectDronesForAI`, `selectBalancedDrones`, `executePass`, `getCapabilities`. Commit. Then in a **separate atomic commit**: delete `handleQuickDeployResponse` AND remove the GFM fallback reference (GFM line 2643-2645) in the same commit. Add a test verifying GFM doesn't call `handleQuickDeployResponse`.

2. **Fix logging**: Convert 6 `console.error`/`console.warn` to `debugLog()`. Reduce `SHIELD_CLICKS` noise. Remove `TURN_TRANSITION_DEBUG` from subscription. Commit.

3. **Clean up comments**: Remove `NEW FLOW:` prefixes and `// REMOVED:` block. Commit.

4. **Deduplicate pass action construction**: Extract `buildPassAction(phase)` helper to reduce 5 copies to 1. Commit.

5. **Convert dynamic imports to top-level (with dependency check)**: Before converting, run a dependency graph analysis to verify no circular dependencies will be introduced by making `aiLogic.js` and `gameLogic.js` static imports. If circular dependencies exist, keep those specific imports dynamic and document why. Convert the safe ones to static. Commit.

6. **Extract `AISimultaneousPhaseStrategy`**: Write intent tests. Extract 5 methods. AIPhaseProcessor delegates. Commit.

7. **Extract `AISequentialTurnStrategy`**: Write intent tests. Extract 7 methods. AIPhaseProcessor delegates. Commit.

8. **Extract `AIQuickDeployHandler`**: Write intent tests. Extract `executeSingleDeployment` and `finishDeploymentPhase`. Commit.

9. **Fix circular dependency**: Remove `this.gameStateManager?.gameFlowManager?.phaseAnimationQueue` access in `executeTurn()`. Inject animation blocking check as a callback during initialization instead. Commit.

10. **Move test file**: Relocate to `src/managers/__tests__/AIPhaseProcessor.test.js`. Commit.

### Risk Assessment

#### What could break
- **AI turn timing**: The self-triggering subscription (`checkForAITurn`) is sensitive to timing. Extraction must preserve the 1.5s delay and animation blocking checks.
- **Quick deploy interleaving**: `executeSingleDeployment()` is called from GFM's `executeQuickDeploy()` -- must preserve the exact call signature and state update pattern.
- **Interception flow**: `makeInterceptionDecision()` is called from ActionProcessor during combat resolution. The delegation path must remain synchronous-compatible.
- **Dynamic import removal**: Converting `await import()` to static imports changes module loading order. Must verify no circular dependency issues.

#### Drag-and-drop flows to verify
- Player card drag-and-drop during action phase when AI is opponent (verify AI turn triggers correctly after player's turn)
- Drone deployment drag-and-drop (verify AI responds to turn transition)
- Quick deploy template application (verify interleaved AI deployment still works)

#### How to validate
- Run existing `AIPhaseProcessor.test.js` after each commit
- Run `GameFlowManager.quickDeploy.test.js` after quick deploy extraction
- Manual smoke test: Full single-player game through multiple rounds
- Manual smoke test: AI interception scenario (attack AI drone that has interceptors)
- Manual smoke test: Quick deploy in Round 1
- Verify no raw `console.log` calls remain after logging step

## NOW

### Final State

| Metric | Value |
|-|-|
| AIPhaseProcessor.js lines | 406 (orchestrator) |
| AISimultaneousPhaseStrategy.js lines | 151 |
| AISequentialTurnStrategy.js lines | 347 |
| AIQuickDeployHandler.js lines | 114 |
| Test files | 4 files (29 tests total) |

### Change Log

*Append entries here as refactoring steps are completed.*

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
| 1 | 2026-02-21 | Behavioral Baseline + Implementation Plan Doc | N/A | N/A | None |
| 2 | 2026-02-21 | Move test file to `__tests__/` directory | All tests pass | None | None |
| 3 | 2026-02-21 | Remove 4 dead methods (~134 lines): selectDronesForAI, selectBalancedDrones, executePass, getCapabilities | All tests pass | None | None |
| 4 | 2026-02-21 | Remove handleQuickDeployResponse + GFM fallback | All tests pass | GFM fallback simplified to direct call | None |
| 5 | 2026-02-21 | Fix logging: 5 console calls → debugLog, reduce SHIELD_CLICKS noise, remove TURN_TRANSITION_DEBUG | All tests pass | None | None |
| 6 | 2026-02-21 | Remove banned comment patterns (NEW FLOW:, REMOVED:) | All tests pass | None | None |
| 7 | 2026-02-21 | Deduplicate pass action construction via _buildPassAction helper | All tests pass | None | None |
| 8 | 2026-02-21 | Consolidate dynamic imports per method | All tests pass | None | Static conversion aborted — Vite SSR module init order issue with gameLogic.js deep chain |
| 9 | 2026-02-21 | Extract AISimultaneousPhaseStrategy.js (151 lines, 8 tests) | All 16 tests pass | None | None |
| 10 | 2026-02-21 | Extract AISequentialTurnStrategy.js (347 lines, 11 tests) | All 19 tests pass | None | None |
| 11 | 2026-02-21 | Extract AIQuickDeployHandler.js (114 lines, 2 tests) | All 29 tests pass | None | None |
| 12 | 2026-02-21 | Fix circular dependency: isAnimationBlocking callback replaces gameStateManager→gameFlowManager chain | All 29 tests pass | None | None |
