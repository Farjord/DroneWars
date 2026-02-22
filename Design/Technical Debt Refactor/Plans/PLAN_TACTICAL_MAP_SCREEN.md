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

*To be populated during/after implementation.*
