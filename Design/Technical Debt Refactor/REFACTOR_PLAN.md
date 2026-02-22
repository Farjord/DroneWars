# Refactor Plan — Master Tracker

## Status Key
- [ ] Not started
- [~] In progress
- [x] Complete

## Tier 1 — Highest Impact
| # | File | Plan | Status | Notes |
|-|-|-|-|-|
| 1 | App.jsx (7,007) | REFACTOR_APP.md | [ ] | |
| 2 | ActionProcessor.js (4,837→1,005) | REFACTOR_ACTION_PROCESSOR.md | [x] | Complete 2026-02-22. 9 strategy files extracted to src/logic/actions/, strategy registry replaces 37-case switch, 21 tests passing. |
| 3 | TacticalMapScreen.jsx (3,548) | REFACTOR_TACTICAL_MAP_SCREEN.md | [ ] | |
| 4 | GameStateManager.js (3,155→2,074) | REFACTOR_GAME_STATE_MANAGER.md | [~] | Sessions A+B complete 2026-02-22: cleanup, logging, test migration, endRun fix, 4 extractions (StateValidationService, GuestSyncManager, SinglePlayerInventoryManager, TacticalItemManager). Session C pending for ShipSlotManager + RunLifecycleManager. |
| 5 | GameFlowManager.js (2,666→1,671) | REFACTOR_GAME_FLOW_MANAGER.md | [x] | Complete 2026-02-22: Sessions A+B. Cleanup (dead code, logging, test migration) + 3 extractions (PhaseRequirementChecker, RoundInitializationProcessor, QuickDeployExecutor) + DRY animation playback. -995 lines (-37%), 40 new tests. Still above 800-line target — remaining code is cohesive phase flow orchestration. |

## Tier 2 — High Value
| # | File | Plan | Status | Notes |
|-|-|-|-|-|
| 6 | DeckBuilder.jsx (2,583) | REFACTOR_DECK_BUILDER.md | [x] | Complete 2026-02-22. 2,584→386 lines (85% reduction). 10 extractions: 3 popups, 3 modals, 1 data hook, 1 chart component, 2 panel components. 21 tests. |
| 7 | HangarScreen.jsx (2,204) | REFACTOR_HANGAR_SCREEN.md | [x] 2026-02-22 | 2,204→568 lines (74% reduction). 8 extractions: hexGrid.js, useHangarMapState, useHangarData, deckSlotFactory, HangarHeader, HangarHexMap, HangarSidebar, HangarModals. 23 new tests. |
| 8 | saveGameSchema.js (503→140) | REFACTOR_SAVE_GAME_SCHEMA.md | [x] | Complete 2026-02-21. 9 functions extracted to 3 files, 106 tests, pure data file. |
| 9 | AIPhaseProcessor.js (1,414→406) | REFACTOR_AI_PHASE_PROCESSOR.md | [x] | Complete 2026-02-21. 3 strategy modules extracted, 5 dead methods removed, circular dependency fixed, 29 tests. |
| 10 | cardData.js (2,324→1,821) | REFACTOR_CARD_DATA.md | [x] | Complete 2026-02-21. 3 bugs fixed, RARITY_COLORS extracted, 533 tests added. |

## Cross-Cutting Concerns
- [ ] Dead code removal (click-to-act remnants, unused functions)
- [ ] Logging standardization (all files use debugLog)
- [ ] Test migration to __tests__/ (incremental, per-directory)
