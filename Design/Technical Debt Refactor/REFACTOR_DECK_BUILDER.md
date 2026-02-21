# Refactor: DeckBuilder.jsx

## BEFORE

### Current State
- **Line count**: 2,584 lines (3x over the 800-line smell threshold)
- **Test coverage**: None. No `__tests__/` folder under `src/components/screens/`.
- **Props**: 27 props on the main component (lines 238-273)

#### Section Map
| Lines | Responsibility |
|-|-|
| 1-35 | Imports (36 imports) |
| 38-66 | `getTypeBackgroundClass`, `getTypeTextClass` helper functions |
| 69-108 | `CardDetailPopup`, `DroneDetailPopup` sub-components |
| 111-235 | `ShipComponentDetailPopup` sub-component |
| 238-273 | `DeckBuilder` component signature (27 props) |
| 274-328 | State declarations (~25 useState calls) |
| 330-421 | `processedCardCollection` useMemo (keyword extraction) |
| 424-462 | `processedDroneCollection`, `activeComponentCollection` useMemo |
| 464-519 | `filterOptions`, `droneFilterOptions` useMemo |
| 522-529 | Cost filter initialization effect |
| 532-602 | Deck counts, drone counts, validation memos |
| 604-632 | Ship component validation memo |
| 635-703 | `handleSaveWithToast` + 3 debug effects (toast debugging) |
| 705-811 | `deckStats`, `droneStats`, `viewDeckData` memos |
| 813-972 | Filter/sort logic: `filteredAndSortedCards`, `filteredAndSortedDrones`, sort handlers, filter chip handlers, reset functions |
| 993-1014 | `renderCustomizedLabel` (pie chart SVG renderer) |
| 1018-1246 | Inline modal components: `ExportModal`, `ImportModal`, `LoadDeckModal` |
| 1248-1288 | Render start: popups + modals |
| 1289-1938 | Left panel render (ship selection, cards table/grid, drones table/grid, ship components table) |
| 1940-2520 | Right panel render (selected ship, deck list, type counts, drone list, ship components, config tab, statistics charts) |
| 2522-2584 | Save button, validation warnings, export |

### Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

*To be completed before refactoring begins. This section documents the current behavior, intent, contracts, dependencies, edge cases, and non-obvious design decisions of the code being refactored. Once written, this section is never modified — it serves as the permanent "before" record.*

## TO DO

### Problems

#### CODE_STANDARDS.md Violations
1. **File size**: 2,584 lines -- over 3x the 800-line threshold
2. **Multiple components in one file**: `CardDetailPopup`, `DroneDetailPopup`, `ShipComponentDetailPopup`, `ExportModal`, `ImportModal`, `LoadDeckModal` are all defined inside DeckBuilder.jsx
3. **Business logic in component**: Card keyword processing (lines 330-421), deck validation (lines 532-632), filter/sort logic (lines 813-972), deck statistics computation (lines 705-811)
4. **Utility functions in component file**: `getTypeBackgroundClass`, `getTypeTextClass` (lines 38-66) belong in a utility file

#### Banned Comments
- Line 531: `// --- MODIFIED: Memoize calculations for performance, now using processedCardCollection ---`
- Line 705: `// --- NEW: Define colors for the Pie Chart ---`
- Line 708: `// --- NEW: Memoize statistics for the charts ---`
- Line 897: `// --- NEW: Handler for sorting ---`
- Line 1528: `{/* --- MODIFIED: Sortable Headers --- */}`
- Line 2042: `{/* --- NEW ICON BUTTON --- */}`

#### Code Smell
1. **Excessive debug logging for toast**: Lines 659-703 contain 3 separate debug effects dedicated to tracking a toast notification, including DOM inspection. This is leftover debugging.
2. **Duplicated ship component table rows**: Lines 1814-1932 repeat nearly identical table row rendering for Bridge, Power Cell, and Drone Control Hub sections -- only the color class differs.
3. **Duplicated chart rendering**: Lines 2296-2520 contain extremely repetitive BarChart blocks (7 near-identical drone stat charts) that differ only by data source and color.
4. **Inline modal components with closure capture**: `ExportModal`, `ImportModal`, `LoadDeckModal` (lines 1018-1246) are defined inside the component body, meaning they re-create on every render and capture stale closures.

### Extraction Plan

#### 1. Extract `useDeckBuilderState` hook
- **What**: All 25+ useState declarations, filter/sort state, panel view state
- **Where**: `src/hooks/useDeckBuilderState.js`
- **Why**: The component has massive state surface area. Grouping related state (filters, sort, panel views, modals) into a single hook cleans up the component body.
- **Dependencies**: None external -- pure state management.
- **State grouping**: Split the 25+ useState calls by concern into 2-3 sub-groups within the hook:
  - **Filter state**: `typeFilters`, `rarityFilters`, `costFilters`, `keywordFilters`, `sortConfig`, `droneFilterConfig` — managed as a single `useReducer` or grouped object
  - **Modal state**: `showExportModal`, `showImportModal`, `showLoadDeckModal`, `showFilterModal`, `showDroneFilter` — boolean flags
  - **Panel state**: `activeLeftTab`, `activeRightTab`, `viewMode`, `droneViewMode`, `showSaveToast` — UI navigation

#### 2. Extract `useDeckBuilderData` hook
- **What**: `processedCardCollection`, `processedDroneCollection`, `activeComponentCollection`, `filterOptions`, `droneFilterOptions`, `filteredAndSortedCards`, `filteredAndSortedDrones`, `deckStats`, `droneStats`, `viewDeckData`, deck/drone/component counts and validation memos
- **Where**: `src/hooks/useDeckBuilderData.js`
- **Why**: ~400 lines of pure data-processing memos. Zero UI concern.
- **Dependencies**: Receives deck, selectedDrones, fullCardCollection, availableDrones, etc. as arguments.

#### 3. Extract popup/detail components to own files
- **What**: `CardDetailPopup`, `DroneDetailPopup`, `ShipComponentDetailPopup`
- **Where**: `src/components/ui/CardDetailPopup.jsx`, `src/components/ui/DroneDetailPopup.jsx`, `src/components/ui/ShipComponentDetailPopup.jsx`
- **Why**: Each is an independent component. `ShipComponentDetailPopup` alone is 125 lines.
- **Dependencies**: `ActionCard`, `DroneCard`, `ShipSection`, `resolveShipSectionStats`, `gameEngine`

#### 4. Move inline modals to own files
- **What**: `ExportModal`, `ImportModal`, `LoadDeckModal`
- **Where**: `src/components/modals/DeckExportModal.jsx`, `src/components/modals/DeckImportModal.jsx`, `src/components/modals/LoadDeckModal.jsx`
- **Why**: Inline component definitions re-create on every render (performance), violate one-modal-per-file rule, and are 230 lines combined.
- **Dependencies**: `convertToAIFormat`, `generateJSObjectLiteral`, `convertFromAIFormat`, `downloadDeckFile`, `vsDecks`, `aiPersonalities`

#### 5. Extract `DeckBuilderLeftPanel` sub-component
- **What**: Lines 1344-1938 -- the entire left panel with ship card view, cards table/grid, drones table/grid, ship components table
- **Where**: `src/components/ui/DeckBuilderLeftPanel.jsx`
- **Why**: This is ~600 lines of render-only code with clear boundaries.
- **Dependencies**: Receives filtered data, handlers, view mode state from parent.

#### 6. Extract `DeckBuilderRightPanel` sub-component
- **What**: Lines 1940-2576 -- the entire right panel with deck list, drone list, ship component layout, statistics, save button
- **Where**: `src/components/ui/DeckBuilderRightPanel.jsx`
- **Why**: Another ~640 lines of render-only code.
- **Dependencies**: Receives deck data, stats, handlers from parent.

#### 7. Extract `DeckStatisticsCharts` sub-component
- **What**: Lines 2272-2520 -- all BarChart/PieChart rendering for deck and drone statistics
- **Where**: `src/components/ui/DeckStatisticsCharts.jsx`
- **Why**: ~250 lines of highly repetitive chart code.
- **Dependencies**: `recharts`, `deckStats`, `droneStats`, `renderCustomizedLabel`

#### 8. Move utility functions
- **What**: `getTypeBackgroundClass`, `getTypeTextClass` (lines 38-66), `COLORS` constant (line 706), `renderCustomizedLabel` (lines 993-1014)
- **Where**: `getTypeBackgroundClass` and `getTypeTextClass` → `src/logic/cardTypeStyles.js` (domain knowledge mapping card types to CSS classes, not generic utils). `COLORS` constant and `renderCustomizedLabel` → `src/utils/deckBuilderUtils.js` (chart-specific utilities).
- **Why**: Pure utility functions with no component dependency.

### Dead Code Removal

#### Excessive Toast Debug Effects (lines 659-703)
Three debug effects (lines 659-703) exist solely to debug a toast notification:
- `showSaveToast` state change logger (line 660)
- Component mount/unmount logger (line 664) -- useful but overly verbose
- DOM inspection effect that queries `.save-toast` and logs computed styles (lines 672-703)

**Action**: Remove the DOM inspection effect entirely. Simplify mount/unmount logger. Keep the state change logger only if needed.

#### No legacy click-to-initiate-action code
DeckBuilder is not a game board -- it's a deck building UI. Click handlers here are all for UI interactions (add/remove cards, open modals, filters). No drag-and-drop dead code applies.

### Logging Improvements

DeckBuilder already uses `debugLog` consistently (no raw `console.log` found). However:
- **Noisy**: `handleSaveWithToast` has 7 debugLog calls (lines 636-656) for a simple save+toast operation. Reduce to 1-2.
- **Toast DOM inspection**: Lines 672-703 should be removed entirely (see Dead Code above).
- **Category**: Uses `'DECK_BUILDER'` consistently -- good.

### Comment Cleanup

#### Banned comments to remove
- Line 531: `// --- MODIFIED: Memoize calculations for performance, now using processedCardCollection ---`
- Line 705: `// --- NEW: Define colors for the Pie Chart ---`
- Line 708: `// --- NEW: Memoize statistics for the charts ---`
- Line 897: `// --- NEW: Handler for sorting ---`
- Line 1528: `{/* --- MODIFIED: Sortable Headers --- */}`
- Line 2042: `{/* --- NEW ICON BUTTON --- */}`

#### Useful section comments to keep
- Line 37: `// Helper functions to get type-based colors for table styling` (good WHY)
- Line 68: `// Card detail popup using the actual ActionCard component` (good WHY)

### Testing Requirements

#### Before Extraction (intent-based tests)
- Test deck count computation: given a deck object, verify `cardCount`, `typeCounts`, `baseCardCounts`
- Test deck validation: verify `isDeckValid` for edge cases (exact count, over limit, type violations)
- Test ship component validation: verify all-assigned, no-conflicts, type coverage
- Test filter/sort integration: verify `filteredAndSortedCards` respects filter and sort config
- Test drone count computation: given selectedDrones, verify counts

#### After Extraction (unit tests for new files)
- `src/hooks/__tests__/useDeckBuilderData.test.js` -- test each memo in isolation
- `src/components/modals/__tests__/DeckExportModal.test.jsx` -- test export flow
- `src/components/modals/__tests__/DeckImportModal.test.jsx` -- test import error handling

#### Test File Locations
- `src/components/screens/__tests__/DeckBuilder.test.jsx`
- `src/hooks/__tests__/useDeckBuilderData.test.js`
- `src/components/modals/__tests__/DeckExportModal.test.jsx`

### Execution Order

1. **Remove dead code**: Delete toast DOM inspection effect (lines 672-703), reduce save toast debug logging. Remove banned comments. _Commit._
2. **Write intent-based tests (Phase 2)**: Create `src/components/screens/__tests__/DeckBuilder.test.jsx` with tests for deck count computation, deck validation, ship component validation, filter/sort integration, and drone count computation. Tests must pass on current code before any extractions. _Commit._
3. **Extract utility functions**: Move `getTypeBackgroundClass`, `getTypeTextClass`, `COLORS`, `renderCustomizedLabel` to `src/utils/deckBuilderUtils.js`. _Commit._
4. **Extract popup components**: Move `CardDetailPopup`, `DroneDetailPopup`, `ShipComponentDetailPopup` to `src/components/ui/`. _Commit._
5. **Extract inline modals**: Move `ExportModal`, `ImportModal`, `LoadDeckModal` to `src/components/modals/`. Pass state/callbacks as props instead of closure capture. _Commit._
6. **Extract `useDeckBuilderData` hook**: Move all data-processing memos (card processing, filter options, counts, validation, stats). _Commit._
7. **Extract `DeckStatisticsCharts`**: Pull chart rendering into its own component. _Commit._
8. **Extract `DeckBuilderLeftPanel`**: Pull left panel render section. _Commit._
9. **Extract `DeckBuilderRightPanel`**: Pull right panel render section. _Commit._
10. **Write tests**: Intent-based tests should have been written BEFORE extractions (Phase 2). This step is for any remaining integration tests verifying the composed component still works after all extractions. _Commit._

### Risk Assessment

#### What Could Break
- **Inline modals use closure-captured state** (`setShowExportModal`, `deck`, `selectedDrones`, etc.). Extracting them to separate files requires threading all state/callbacks as props. Must verify modal open/close still works.
- **Memo dependency chains**: `filteredAndSortedCards` depends on `processedCardCollection` which depends on `fullCardCollection`. Moving these to a hook requires careful dependency injection.
- **ShipComponentDetailPopup** uses `gameEngine` import directly -- ensure the extracted component receives it correctly.

#### Flows to Verify
- Card add/remove quantity buttons (table and grid views)
- Drone add/remove quantity buttons (table and grid views)
- Ship component lane selection (L/M/R)
- Export modal: copy, download
- Import modal: paste + load
- Load deck modal: VS and AI deck loading
- Save button: valid deck, invalid deck (extraction mode), read-only mode
- Filter modal: open, apply, chip removal, reset
- View mode toggle: table vs grid for cards and drones
- Panel navigation: Ship / Ship Sections / Drones / Cards tabs

#### How to Validate
- Manual smoke test of all tab views and both panels
- Verify no regressions in deck builder for both multiplayer and extraction modes
- Run existing test suite (if any related tests exist upstream)
- Check that extraction mode config tab still renders correctly

## NOW

### Final State

*To be completed after refactoring.*

### Change Log

*Append entries here as refactoring steps are completed.*

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
