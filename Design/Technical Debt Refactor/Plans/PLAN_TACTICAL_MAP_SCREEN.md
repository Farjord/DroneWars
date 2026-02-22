# Implementation Plan: TacticalMapScreen.jsx Refactoring

## Before Metrics (2026-02-22)
- Line count: 3,548
- Raw console.* calls: 118
- Misplaced test files: 6
- Dead state: selectedQuickDeploy (declared, never read)
- Test suite: 3,744 tests passing, 0 failures

## Architecture

Orchestrator component + 7 custom hooks + 2 extracted components + 1 utility extraction.

All useState/useRef remain in orchestrator. Each hook receives focused state slices and returns handlers. Shared refs bundled into single object.

## Execution Steps

| Step | Target | Lines | Risk | Depends On |
|-|-|-|-|-|
| 0 | Pre-work: migrate tests, replace console.*, remove dead code/stale comments | - | Low | - |
| 1 | shipSectionBuilder.js | ~70 | Low | 0 |
| 2 | useTacticalSubscriptions.js | ~300 | Medium | 0 |
| 3 | useTacticalPostCombat.js | ~220 | Medium | 2 |
| 4 | useTacticalWaypoints.js | ~250 | Low | 2 |
| 5 | useTacticalMovement.js | ~340 | HIGH | 2 |
| 6 | useTacticalEncounters.js | ~450 | HIGH | 2, 5 |
| 7 | useTacticalExtraction.js | ~250 | Medium | 2, 6 |
| 8 | useTacticalEscape.js | ~260 | Medium | 2, 5 |
| 9 | useTacticalLoot.js | ~300 | Medium | 2 |
| 10 | TacticalMapHeader.jsx | ~180 | Low | 1 |
| 11 | TacticalMapModals.jsx | ~240 | Low | all |

## Critical Warnings

1. React hooks ordering: All useRef/useState must remain in same call order in orchestrator
2. handleCommenceJourney closure: Closes over waypoints at call time, uses setWaypoints(prev => ...) inside loop
3. Post-combat mount effect order: Must execute AFTER subscription setup
4. useTacticalEncounters at ~450 lines exceeds 400-line guideline — accept, log in FUTURE_IMPROVEMENTS.md

## Actual Outcomes

### Planned vs Actual Line Counts

| File | Planned | Actual | Delta |
|-|-|-|-|
| TacticalMapScreen.jsx (orchestrator) | ~350 | 675 | +325 (state declarations + hook calls larger than estimated) |
| useTacticalSubscriptions.js | ~300 | 310 | +10 |
| useTacticalPostCombat.js | ~220 | 229 | +9 |
| useTacticalWaypoints.js | ~250 | 287 | +37 |
| useTacticalMovement.js | ~340 | 390 | +50 |
| useTacticalEncounters.js | ~450 | 935 | +485 (dedup skipped — behavior risk) |
| useTacticalExtraction.js | ~250 | 297 | +47 |
| useTacticalEscape.js | ~260 | 328 | +68 |
| useTacticalLoot.js | ~300 | 307 | +7 |
| TacticalMapHeader.jsx | ~180 | 151 | -29 |
| TacticalMapModals.jsx | ~240 | 337 | +97 |
| shipSectionBuilder.js | ~70 | 79 | +9 |
| **Total** | **~3,210** | **4,325** | **+1,115** |

### Key Deviations

1. **Orchestrator at 675 (not 350)**: 45 useState + 12 useRef declarations, sharedRefs bundle, 7 hook calls, and destructuring take more space than estimated.
2. **useTacticalEncounters at 935 (not 450)**: Original encounter code was ~840 lines in TacticalMapScreen, not ~450 as estimated. Combat dedup was assessed but skipped — the 5 combat init patterns differ in encounter shape, loading data, and salvage handling. Parameterizing would risk behavior changes.
3. **TacticalMapModals at 337 (not 240)**: More props needed for 15+ modals than estimated.
4. **Total 4,325 vs 3,210**: Overhead from useCallback wrapping, import sections, JSDoc comments, and hook parameter destructuring. Net code quality improved despite higher line count.

### What Worked Well
- Sequential extraction with test verification after each step caught zero regressions
- sharedRefs pattern cleanly passed refs between hooks
- All 3,744 tests pass throughout — zero test modifications needed for hook extractions
- 6 misplaced test files migrated (found 6, plan estimated 4)

### What Could Improve
- Better size estimation (encounter handlers were severely underestimated)
- Combat dedup should be a separate focused task with its own test suite
