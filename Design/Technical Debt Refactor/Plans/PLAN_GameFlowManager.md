# Plan: Refactor GameFlowManager.js

## Context

GameFlowManager.js is #6 in the mandatory bottom-up refactoring sequence. At 2,666 lines it's 3.3x the 800-line smell threshold, with 44 methods spanning 8 distinct responsibilities, ~570 lines of dead code (21%), 28 raw console calls, 7 misplaced test files, and banned comment patterns. Dependencies already refactored: cardData, saveGameSchema, AIPhaseProcessor, ActionProcessor.

The REFACTOR_GAME_FLOW_MANAGER.md has a detailed TO DO section with extraction plan and a completed Behavioral Baseline.

## Session A — Cleanup (5 commits, target: 2,666 → ~2,050 lines)

### A1: Write behavioral baseline + save implementation plan
- Complete the `### Behavioral Baseline` section in REFACTOR_GAME_FLOW_MANAGER.md (all 44 methods' contracts, state mutations, side effects, edge cases)
- Save plan to `Design/Technical Debt Refactor/Plans/PLAN_GameFlowManager.md`
- Docs-only commit

### A2: Delete dead code (~570 lines)
- Remove 4 orphaned automatic phase processors:
  - `processAutomaticDrawPhase()` (1439-1493)
  - `processAutomaticFirstPlayerPhase()` (1500-1533)
  - `processAutomaticEnergyResetPhase()` (1540-1722, 284 lines)
  - `processGameInitializingPhase()` (1730-1753)
- Remove deprecated `checkSequentialPhaseCompletion()` entirely (702-728)
- Remove the call to it at line 145
- Run all 7 GFM test files → 0 failures

### A3: Fix logging
- Convert 27 `console.error`/`console.warn` → `debugLog()` with categories
- Consolidate: merge `PHASE_MANAGER`, `PHASE_FLOW`, `CASCADE_LOOP` into `PHASE_TRANSITIONS`
- Remove verbose DIAGNOSTIC logging blocks (~46 lines)
- Run all 7 GFM test files

### A4: Comment cleanup
- Remove `// NEW FLOW:` at lines 121, 294 (banned pattern)
- Remove `// REMOVED:` at lines 388-390 (banned pattern)
- Run all 7 GFM test files

### A5: Move 7 test files to `__tests__/`
- Move: `GameFlowManager.test.js`, `GameFlowManager.subscription.test.js`, `GameFlowManager.resubscribe.test.js`, `GameFlowManager.quickDeploy.test.js`, `GameFlowManager.integration.test.js`, `GameFlowManager.asymmetric.test.js`, `PhaseFlowCoverage.test.js`
- Update import paths (`'./'` → `'../'`)
- Run moved tests from new location

## Session B — Extractions (4 commits, target: ~2,050 → ~1,380 lines)

### B1: Extract PhaseRequirementChecker → `src/logic/phase/PhaseRequirementChecker.js` (~240 lines)
- Extract 7 stateless methods: `isPhaseRequired`, `anyPlayerExceedsHandLimit`, `anyPlayerHasShieldsToAllocate`, `anyPlayerHasCards`, `anyPlayerExceedsDroneLimit`, `playerExceedsHandLimit`, `playerExceedsDroneLimit`
- Receives `gameState` as parameter, only dependency is `GameDataService`
- Pass `_quickDeployExecutedThisRound` as parameter to `isPhaseRequired`
- GFM keeps thin delegating wrapper
- Write unit tests at `src/logic/phase/__tests__/PhaseRequirementChecker.test.js`
- Run new tests + all existing GFM tests

### B2: Extract RoundInitializationProcessor → `src/managers/RoundInitializationProcessor.js` (~373 lines)
- Extract `processRoundInitialization()` Steps 1-5 body
- Processor receives dependencies via constructor, returns `{ nextPhase, gameStage, quickDeployExecuted }`
- Pass `executeQuickDeploy` as callback (avoids circular dependency with B3)
- GFM becomes thin orchestrator: call processor, update local state from result
- Write unit tests at `src/managers/__tests__/RoundInitializationProcessor.test.js`
- **Risk: HIGH** — 5 sequential steps with intermediate state reads, host-only broadcasts, `_updateContext` pattern

### B3: Extract QuickDeployExecutor → `src/logic/quickDeploy/QuickDeployExecutor.js` (~120 lines)
- Extract `executeQuickDeploy()` + `extractDronesFromDeck()`
- Colocate with existing `QuickDeployService.js` in `src/logic/quickDeploy/`
- Dependencies via constructor: `gameStateManager`, `actionProcessor`, `tacticalMapStateManager`
- Update RoundInitializationProcessor callback to use new executor
- Write unit tests at `src/logic/quickDeploy/__tests__/QuickDeployExecutor.test.js`

### B4: DRY animation playback (8 call sites → 1 helper)
- Add private `tryStartPlayback(source)` method to GFM
- Replace all 8 occurrences of the queue-check-then-play pattern
- Run all GFM tests

## Line Count Projection

| Step | Removed | Running Total |
|-|-|-|
| A2: Dead code | -570 | 2,096 |
| A3: Verbose logging | -46 | 2,050 |
| B1: PhaseRequirementChecker | -200 | 1,850 |
| B2: RoundInitProcessor | -340 | 1,510 |
| B3: QuickDeployExecutor | -100 | 1,410 |
| B4: Animation DRY | -30 | 1,380 |

**~1,380 lines** — above 800-line target. Remaining methods are cohesive phase flow orchestration. Log in FUTURE_IMPROVEMENTS.md if further reduction desired.

## Key Files

| File | Role |
|-|-|
| `src/managers/GameFlowManager.js` | Source file (2,666 lines) |
| `src/managers/PhaseFlowCoverage.test.js` | Largest test (1,329 lines) |
| `Design/Technical Debt Refactor/REFACTOR_GAME_FLOW_MANAGER.md` | Refactor doc |
| `src/logic/quickDeploy/QuickDeployService.js` | Pattern reference for QuickDeployExecutor |
| `src/AppRouter.jsx` | Production consumer |

## Verification

After each commit:
1. Run all GFM test files: `npx vitest run src/managers/GameFlowManager*.test.js src/managers/PhaseFlowCoverage.test.js`
2. Run full suite: `npx vitest run` → 0 failures

After Session B completion:
3. Code review via `superpowers:code-reviewer`
4. Update REFACTOR_GAME_FLOW_MANAGER.md NOW section
5. Update REFACTOR_PLAN.md status

## Actual Outcomes

### Line Count Progression (Actual vs Projected)

| Step | Projected | Actual | Running Total |
|-|-|-|-|
| Starting | 2,666 | 2,666 | 2,666 |
| A2: Dead code | -570 | -356 | 2,310 |
| A3: Verbose logging | -46 | -55 | 2,255 |
| B1: PhaseRequirementChecker | -200 | -136 | 2,119 |
| B2: RoundInitProcessor | -340 | -297 | 1,822 |
| B3: QuickDeployExecutor | -100 | -109 | 1,713 |
| B4: Animation DRY | -30 | -42 | 1,671 |
| **Total** | **-1,286** | **-995** | **1,671** |

**Final: 1,671 lines** (projected 1,380). Delta due to A2 dead code being less than estimated (356 vs 570). The 4 orphaned processors were shorter than measured during planning.

### Deviations from Plan

- **A2**: Plan estimated ~570 lines dead code. Actual was 356 — the orphaned automatic phase processors were shorter than the line ranges suggested (some had been partially trimmed in earlier work).
- **A3**: Plan said 27 console calls; actual was 21 (some removed with dead code in A2).
- **A4**: No-op — banned comment patterns (`// NEW FLOW:`, `// REMOVED:`) were inside the dead code already removed in A2.
- **B1**: Added `_ensurePhaseRequirementChecker()` lazy-init helper (not in plan) — needed for backwards compatibility with tests that create GFM without calling `initialize()`.
- **B3**: `extractDronesFromDeck` kept in GFM (used by deck selection handler, not by quick deploy) — plan had it colocated with QuickDeployExecutor but it's a different concern.

### Test Counts

| Test File | Tests |
|-|-|
| PhaseRequirementChecker.test.js (new) | 15 |
| RoundInitializationProcessor.test.js (new) | 15 |
| QuickDeployExecutor.test.js (new) | 10 |
| Existing GFM tests (7 files) | 133 |
| **Total GFM-related** | **173** |
| **Full suite** | **3,662** |
