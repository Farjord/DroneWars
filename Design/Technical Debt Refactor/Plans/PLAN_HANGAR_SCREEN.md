# Plan: HangarScreen.jsx Refactoring

## Intent

Reduce HangarScreen.jsx from 2,204 lines to ~450-500 lines by extracting pure logic, hooks, and UI sub-components while preserving all behavior.

## Extraction Plan

1. **Pre-flight**: Migrate 5 test files to `__tests__/`, populate behavioral baseline
2. **Fix logging**: Replace `console.*` with `debugLog`, reduce noisy sequences
3. **Remove dead code**: Delete unused deckEditor modal placeholder
4. **Extract hex grid utilities** → `hexGrid.js` (geometry, grid generation, coordinate mapping)
5. **Extract useHangarMapState hook** (pan/zoom state, wheel listener, mouse handlers)
6. **Extract useHangarData hook** (hex grid data, map generation, tutorials, memos)
7. **Extract deckSlotFactory.js** (deck creation business logic)
8. **Extract HangarHeader** (header bar with reputation/missions)
9. **Extract HangarHexMap** (SVG hex grid, vignettes, zoom controls, POI arrows)
10. **Extract HangarSidebar** (options/ships toggle panel)
11. **Extract HangarModals** (all modals, tutorials consolidated to data-driven)

## Key Decisions

- **Circular dependency**: `useHangarMapState` needs `hexGridData`, `useHangarData` needs `mapContainerRef`. Resolved by creating `mapContainerRef` in parent and passing to both hooks.
- **Pure function conversion**: `clampPan` and `getOffScreenPOIs` changed from closure-based (reading component state/refs) to explicit parameter functions.
- **Tutorial consolidation**: 5 simple tutorial modals consolidated into data-driven loop; 3 with special dismiss actions kept explicit.
- **hangarImages constant**: Moved from HangarScreen to HangarSidebar since it's the sole consumer.

## Actual Outcomes

- **Final line count**: 568 (74% reduction from 2,204). Above 400 guideline but remaining code is cohesive handler/state orchestration.
- **8 new files created**, 23 new tests written (hexGrid: 15, deckSlotFactory: 8).
- **All 3,709 tests pass** (217 test files, 0 failures, 2 skipped).
- **11 commits** on master, one per extraction step.
- **No behavior altered** — all changes are structural only.
- **Pre-existing test issues found**: 2 test files (boss, mapRegeneration) had `useGameState` mock issues predating this refactor.
