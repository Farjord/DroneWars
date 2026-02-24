# Tech Debt Audit — Post-Phase K Cleanup (2026-02-24)

## Summary

| Metric | Pre-Refactoring (Feb 21) | Post-Audit (Feb 23) | Post-Cleanup (Feb 24) | Change |
|-|-|-|-|-|
| Files over 800 lines | 46 | 27 | ~25 | -2 (dead code + dedup) |
| Files 400-799 lines | 32 | 54 | ~52 | -2 (extractions) |
| Tests outside `__tests__/` | 199 of 201 | 0 of 220 | 0 of 220 | Stable |
| Data files with logic | 9 | 9 | 5 | -4 (PURITY migration) |
| Source files without tests | 313 of 431 (27%) | ~280 of 500 (56%) | ~280 of 510 (55%) | Stable (test coverage not in scope) |
| Total source lines (non-test) | ~140k (est.) | 122,846 | ~121k (est.) | -1.8k from dedup + dead code |
| Audit issues found | — | ~433 | ~433 | Baseline unchanged |
| Audit issues [FIXED] | — | 139 | 240 | +101 this session |
| Phases completed | A-F | A-F | A-K | +5 phases (G,H,I,J,K) |

## Critical (800+ lines) — 27 files

| File | Lines | Notes |
|-|-|-|
| cardData.js | 1821 | Pure data — acceptable |
| GameFlowManager.js | 1673 | FI #11 — cohesive orchestration |
| useDragMechanics.js | 1653 | FI #19 — shared state prevents split |
| App.jsx | 1332 | FI #21 resolved — orchestration root |
| InventoryModal.jsx | 1270 | Complex multi-tab modal |
| aiLogic.js | 1209 | Strategy evaluation engine |
| GuestMessageQueueService.js | 1125 | Multiplayer message queue |
| modalShowcaseHelpers.js | 1113 | Dev-only showcase |
| TestingSetupScreen.jsx | 1111 | Dev-only testing screen |
| GameStateManager.js | 1068 | FI #6 — post-extraction residual |
| RewardManager.js | 1028 | Complex reward logic |
| ActionProcessor.js | 1006 | FI #4,5 — post-strategy-pattern extraction |
| droneData.js | 993 | Pure data — acceptable |
| GameHeader.jsx | 982 | Complex HUD component |
| HexInfoPanel.jsx | 970 | Complex info display |
| HexGridRenderer.jsx | 958 | Hex grid rendering engine |
| useClickHandlers.js | 956 | FI #22 — shared params prevent split |
| useTacticalEncounters.js | 931 | FI #15 — circular dep prevents split |
| QuickDeployEditorScreen.jsx | 904 | Complex editor screen |
| useAnimationSetup.js | 899 | Single 890-line useEffect |
| CardPlayManager.js | 868 | Card play logic engine |
| CombatOutcomeProcessor.js | 866 | Combat resolution |
| GlossaryModal.jsx | 851 | Auto-generated glossary |
| glossaryAnalyzer.js | 834 | Should move to logic/ |
| SinglePlayerCombatInitializer.js | 810 | Combat setup |
| AttackProcessor.js | 809 | Attack resolution engine |
| (27th file near 800) | ~800 | Borderline |

## Misplaced Tests

**0 of 220 test files** outside `__tests__/` — migration complete.

## Data File Impurity

Unchanged from baseline — 9 data files with 30+ logic functions. See baseline audit for details.

## Test Coverage by Directory (Post-Audit)

| Directory | Source Files | Test Files | Untested |
|-|-|-|-|
| src/hooks | 26 | 0 | 26 (100%) |
| src/components/animations | 20 | 0 | 20 (100%) |
| src/components/ui | 75 | 24 | 51 (68%) |
| src/components/modals | 65 | 23 | 42 (65%) |
| src/logic/** | ~150 | ~90 | ~60 (40%) |
| src/data | ~25 | 8 | ~17 (68%) |
| src/managers | 24 | 13 | 11 (46%) |
| src/utils | ~26 | 7 | ~19 (73%) |
| src/services | 6 | 2 | 4 (67%) |
| src/config | 4 | 0 | 4 (100%) |
| src/network | 1 | 0 | 1 (100%) |
| src/contexts | 1 | 0 | 1 (100%) |
| src/theme | 1 | 0 | 1 (100%) |

**High-risk untested:** All 26 hooks (10,413 lines), all 20 animation components, P2PManager, all config files.

## Key Improvements Since Baseline

1. **10-file refactoring complete** — App.jsx 7007→1332, ActionProcessor 4837→1006, TacticalMapScreen 3548→675, GSM 3155→1068, GFM 2671→1673, DeckBuilder 2583→split, HangarScreen 2204→568
2. **Test migration complete** — 151 files moved to `__tests__/`, 0 misplaced
3. **Full codebase audit** — ~500 files reviewed, ~433 issues catalogued in `Design/CODEBASE_AUDIT.md`
4. **7 standards challenges** identified for CODE_STANDARDS.md evolution
