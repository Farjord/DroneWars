# Tech Debt Audit — 2026-02-21 (Baseline)

## Summary

| Metric | Count |
|-|-|
| Files over 800 lines | 46 |
| Files 400-799 lines | 32 |
| Tests outside `__tests__/` | 199 of 201 |
| Data files with logic | 9 |
| Naming violations | 0 |
| Source files without tests | 313 of 431 (27% file-level coverage) |

## Critical (800+ lines)

| File | Lines |
|-|-|
| src/App.jsx | 7007 |
| src/managers/ActionProcessor.js | 4837 |
| src/components/screens/TacticalMapScreen.jsx | 3548 |
| src/managers/GameStateManager.js | 3155 |
| src/managers/GameFlowManager.js | 2671 |
| src/components/screens/DeckBuilder.jsx | 2583 |
| src/data/cardData.js | 2324 |
| src/components/screens/HangarScreen.jsx | 2204 |
| src/managers/AIPhaseProcessor.js | 1413 |
| src/components/modals/InventoryModal.jsx | 1270 |
| src/logic/aiLogic.js | 1209 |
| src/managers/GuestMessageQueueService.js | 1125 |
| src/components/screens/modalShowcaseHelpers.js | 1113 |
| src/components/screens/TestingSetupScreen.jsx | 1111 |
| src/managers/RewardManager.js | 1028 |
| src/components/ui/GameHeader.jsx | 994 |
| src/data/droneData.js | 993 |
| src/components/ui/HexInfoPanel.jsx | 970 |
| src/components/ui/HexGridRenderer.jsx | 958 |
| src/components/screens/QuickDeployEditorScreen.jsx | 904 |
| src/hooks/useAnimationSetup.js | 899 |
| src/logic/cards/CardPlayManager.js | 868 |
| src/logic/singlePlayer/CombatOutcomeProcessor.js | 866 |
| src/components/modals/GlossaryModal.jsx | 851 |
| src/utils/glossaryAnalyzer.js | 834 |
| src/logic/combat/AttackProcessor.js | 809 |
| src/logic/singlePlayer/SinglePlayerCombatInitializer.js | 808 |

Note: 19 additional 800+ line files are test files (not listed — tests are expected to be longer).

## Warning (400-799 lines)

| File | Lines |
|-|-|
| src/logic/loot/LootGenerator.js | 747 |
| src/components/screens/RepairBayScreen.jsx | 729 |
| src/components/modals/AIStrategyModal.jsx | 711 |
| src/logic/encounters/EncounterController.js | 693 |
| src/logic/effects/damage/DamageEffectProcessor.js | 684 |
| src/data/descriptions/aiStrategyDescriptions.js | 678 |
| src/managers/TransitionManager.js | 642 |
| src/logic/effects/movement/MovementEffectProcessor.js | 633 |
| src/components/modals/MapOverviewModal.jsx | 618 |
| src/logic/ai/cardEvaluators/droneCards.js | 604 |
| src/components/screens/DeckSelectionScreen.jsx | 602 |
| src/network/P2PManager.js | 593 |
| src/components/modals/ViewDeckModal.jsx | 587 |
| src/managers/AnimationManager.js | 579 |
| src/services/testGameInitializer.js | 577 |

Note: 17 additional 400-799 line files are test files (not listed).

## Misplaced Tests

**199 of 201 test files** are co-located with source files rather than in `__tests__/` subdirectories. Only 2 test files are in `__tests__/` folders.

This is a project-wide pattern, not an isolated issue. Migration should be done incrementally per-directory during related refactoring work.

## Data File Impurity

Files in `src/data/` that contain logic functions alongside data definitions:

| File | Functions |
|-|-|
| saveGameSchema.js | `createEmptyDroneSlots`, `migrateDroneSlotsToNewFormat`, `convertDronesToSlots`, `convertComponentsToSectionSlots`, `migrateShipSlotToNewFormat`, `migrateTacticalItems`, `createDefaultShipSlot`, `createNewSave`, `validateSaveFile` |
| cardPackData.js | `createSeededRNG`, `getPackCostForTier`, `generateRandomShopPack` |
| salvageItemData.js | `findEligibleItems`, `selectSalvageItem`, `generateSalvageItemFromValue` |
| missionData.js | `getMissionById`, `getIntroMissions`, `getMissionsByCategory` |
| tutorialData.js | `getTutorialByScreen`, `getAllTutorialScreenIds`, `createDefaultTutorialDismissals` |
| reputationRewardsData.js | `getLevelData`, `getNewlyUnlockedLevels` |
| aiCoresData.js | `calculateAICoresDrop`, `getAICoresCost` |
| shipData.js | `getShipById`, `getAllShips`, `getDefaultShip` |
| tacticalItemData.js | `getTacticalItemById`, `getTacticalItemsByType`, `getAllTacticalItemIds` |

**Total: 9 data files with 30+ logic functions that should be extracted.**

## File Type Purity

- **Utils/Logic contamination**: None detected — `src/utils/` and `src/logic/` have no React imports.
- **Component naming**: All `.jsx` files in `src/components/` follow PascalCase.
- **modalShowcaseHelpers.js** (1,113 lines) in `src/components/screens/` — utility/helper file mixed with screen components.

## Prioritized Refactoring Targets

### Tier 1 — Highest Impact

1. **App.jsx** (7,007 lines) — The monolith. Extract screens, hooks, state management, routing.
2. **ActionProcessor.js** (4,837 lines) — Strategy pattern candidate. Extract per-action-type processors.
3. **TacticalMapScreen.jsx** (3,548 lines) — Extract sub-components, hooks, map logic.
4. **GameStateManager.js** (3,155 lines) — Extract domain-specific state slices.
5. **GameFlowManager.js** (2,671 lines) — Extract phase-specific handlers.

### Tier 2 — High Value

6. **DeckBuilder.jsx** (2,583 lines) — Extract sub-components and filter logic.
7. **HangarScreen.jsx** (2,204 lines) — Extract sub-components.
8. **saveGameSchema.js** — Extract 9 functions to `src/logic/state/` or `src/logic/migration/`.
9. **AIPhaseProcessor.js** (1,413 lines) — Extract strategy-specific logic.
10. **cardData.js** (2,324 lines) — Review if pure data or needs splitting.

### Tier 3 — Data File Cleanup

11. Extract logic from all 9 impure data files (30+ functions total).

### Tier 4 — Incremental

12. Migrate test files to `__tests__/` subdirectories during related work.
13. Address remaining 400-799 line files during feature work.

## Test Coverage by Directory

| Directory | Tested/Total | Untested |
|-|-|-|
| src/components | 48/179 | 131 |
| src/logic | 41/151 | 110 |
| src/data | 7/25 | 18 |
| src/utils | 8/24 | 16 |
| src/managers | 12/18 | 6 |
| src/services | 2/6 | 4 |
| src/hooks | 0/6 | 6 |
| src/config | 0/4 | 4 |
| src/contexts | 0/1 | 1 |
| src/network | 0/1 | 1 |
| src/theme | 0/1 | 1 |

**Completely untested directories**: config, contexts, hooks, network, theme.
