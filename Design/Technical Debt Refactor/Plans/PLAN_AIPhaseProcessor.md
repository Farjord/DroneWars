# Implementation Plan: AIPhaseProcessor.js Refactor

**Date**: 2026-02-21
**Starting state**: 1,414 lines, 6 tests (co-located), ~270 lines dead code, 6 raw console calls, banned comment patterns
**Target state**: ~300-350 line orchestrator + 3 extracted strategy files, tests in `__tests__/`, clean logging, no dead code

## Steps

1. **Behavioral baseline** — Document exports, state mutations, side effects, edge cases in REFACTOR_AI_PHASE_PROCESSOR.md
2. **Move test file** — `AIPhaseProcessor.test.js` → `src/managers/__tests__/`
3. **Dead code batch 1** — Remove `selectDronesForAI`, `selectBalancedDrones`, `executePass`, `getCapabilities` (~140 lines)
4. **Dead code batch 2** — Remove `handleQuickDeployResponse` (~125 lines) + GFM fallback cleanup
5. **Fix logging** — Convert 6 raw console calls to `debugLog`, reduce SHIELD_CLICKS noise, remove TURN_TRANSITION_DEBUG from subscription
6. **Comment cleanup** — Remove `NEW FLOW:` prefixes and `// REMOVED:` block
7. **Deduplicate pass action** — Extract `_buildPassAction` helper, replace 4+ inline constructions
8. **Static imports** — Convert safe dynamic imports to top-level (after circular dependency check)
9. **Extract AISimultaneousPhaseStrategy** — `processDeckSelection`, `processDroneSelection`, `processPlacement`, `extractDronesFromDeck`, `randomlySelectDrones` → `src/logic/ai/`
10. **Extract AISequentialTurnStrategy** — `executeDeploymentTurn`, `executeActionTurn`, `executeOptionalDiscardTurn`, `executeMandatoryDiscardTurn`, `executeMandatoryDroneRemovalTurn`, `executeShieldAllocationTurn`, `shouldPass` → `src/logic/ai/`
11. **Extract AIQuickDeployHandler** — `executeSingleDeployment`, `finishDeploymentPhase` → `src/logic/ai/`
12. **Fix circular dependency** — Replace `gameStateManager.gameFlowManager.phaseAnimationQueue` with injected `isAnimationBlocking` callback
13. **Code review + documentation** — Run code-reviewer, update Change Log, mark complete in REFACTOR_PLAN.md

## Expected Outcomes

- AIPhaseProcessor.js: ~300-350 lines (orchestrator only)
- AISimultaneousPhaseStrategy.js: ~150-200 lines
- AISequentialTurnStrategy.js: ~350-400 lines (may split if >400)
- AIQuickDeployHandler.js: ~100-150 lines
- All tests in `__tests__/` directories
- Zero raw console calls
- Zero banned comment patterns
- Zero dead code

## Actual Outcomes

**Date completed**: 2026-02-21
**Commits**: 11 (862a001 through 21f86fd)

### Final line counts
| File | Lines | Target | Status |
|-|-|-|-|
| AIPhaseProcessor.js | 406 | 300-350 | Slightly over — retains makeInterceptionDecision (60 lines) which is tightly coupled to orchestrator state |
| AISimultaneousPhaseStrategy.js | 151 | 150-200 | On target |
| AISequentialTurnStrategy.js | 347 | 350-400 | On target |
| AIQuickDeployHandler.js | 114 | 100-150 | On target |

### Test counts
| File | Tests |
|-|-|
| AIPhaseProcessor.test.js | 8 |
| AISimultaneousPhaseStrategy.test.js | 8 |
| AISequentialTurnStrategy.test.js | 11 |
| AIQuickDeployHandler.test.js | 2 |
| **Total** | **29** |

### Deviations from plan
1. **Step 8 (Static imports)**: Aborted. Converting `await import('../logic/gameLogic.js')` to static caused `TypeError: __vite_ssr_import_0__.default is not a constructor` at `new EffectRouter()` due to Vite SSR module initialization ordering. Consolidated 3 redundant dynamic imports per method instead.
2. **Orchestrator size**: 406 lines vs 300-350 target. The `makeInterceptionDecision` method (60 lines) was not extracted because it directly uses `this.gameDataService`, `this.gameStateManager`, and `this.isInitialized` — extracting it would just create pass-through complexity.

### Quality checks
- Zero raw console calls in modified files
- Zero banned comment patterns
- All tests in `__tests__/` directories
- No dead code remaining
- Circular dependency in executeTurn() resolved via isAnimationBlocking callback injection
