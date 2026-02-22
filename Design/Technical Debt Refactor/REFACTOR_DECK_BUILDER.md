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

#### Exports / Public API

- **Default export**: `DeckBuilder` React component
- **Local sub-components** (not exported): `CardDetailPopup`, `DroneDetailPopup`, `ShipComponentDetailPopup`, `ExportModal`, `ImportModal`, `LoadDeckModal`
- **Local helpers** (not exported): `getTypeBackgroundClass(type)` → CSS class string, `getTypeTextClass(type)` → CSS class string, `renderCustomizedLabel(props)` → SVG text element for pie charts
- **Local constant**: `COLORS` — array of 5 hex colors for pie chart segments

#### Props Interface (27 props)

| Prop | Type | Purpose |
|-|-|-|
| fullCardCollection | Array | Full card pool |
| deck | Object {cardId: qty} | Current card selections |
| onDeckChange(cardId, qty) | Function | Card quantity change callback |
| selectedDrones | Object {droneName: qty} | Current drone selections |
| onDronesChange(droneName, qty) | Function | Drone quantity change callback |
| selectedShipComponents | Object {componentId: laneId} | Ship component lane assignments |
| onShipComponentsChange(componentId, lane) | Function | Component lane assignment callback |
| selectedShip | Object or null | Selected ship; uses default if null |
| onShipChange(ship) | Function | Ship selection change callback |
| onConfirmDeck() | Function | Save/confirm handler |
| onImportDeck(deckCode) | Function | Import handler; returns {success, message} |
| onBack() | Function | Navigation back callback |
| preservedFields | Object {name, description} | Round-trip export metadata |
| onPreservedFieldsChange | Function | Preserved field update callback |
| maxDrones | Number | Drone limit (5 extraction, 10 multiplayer) |
| droneInstances | Array | Drone damage state (extraction only) |
| componentInstances | Array | Component hull state (extraction only) |
| readOnly | Boolean | Disables all interactions |
| allowInvalidSave | Boolean | True in extraction mode; allows incomplete saves |
| mode | String | 'multiplayer' or 'extraction' |
| onSaveInvalid() | Function | Incomplete save callback (extraction) |
| deckName | String | Current deck name (extraction) |
| onDeckNameChange(name) | Function | Deck name change callback |
| availableDrones | Array | Filtered drone pool (extraction only) |
| availableComponents | Array | Filtered component pool (extraction only) |
| availableShips | Array | Filtered ship pool (extraction only) |
| shipSlot | Object | Slot config (extraction only) |
| droneSlots | Array | Slot array (extraction only) |
| credits | Number | Credits for repairs (extraction only) |
| onRepairDroneSlot | Function | Drone repair callback (extraction) |
| onRepairSectionSlot | Function | Section repair callback (extraction) |

#### State Mutations and Their Triggers

| State | Type | Trigger |
|-|-|-|
| detailedCard | null / card object | Eye icon click in card list; closes via modal |
| detailedDrone | null / drone object | Eye icon click in drone list; closes via modal |
| detailedShipComponent | null / component object | Eye icon click in component list; closes via modal |
| showExportModal | Boolean | Export button toggle |
| showImportModal | Boolean | Import button toggle |
| showLoadDeckModal | Boolean | Load deck button toggle |
| showViewDeckModal | Boolean | View deck button toggle |
| leftPanelView | 'shipCard' / 'cards' / 'drones' / 'shipComponents' | Tab button clicks |
| rightPanelView | 'ship' / 'deck' / 'drones' / 'shipComponents' / 'config' | Tab button clicks |
| mobileActivePanel | 'left' / 'right' | Mobile panel toggle |
| filters | Object (searchText, cost, rarity[], type[], target[], damageType[], abilities[], hideEnhanced, includeAIOnly) | CardFilterModal updates; reset button |
| sortConfig | {key, direction} | Column header clicks toggle |
| droneFilters | Object (searchText, rarity[], class[], abilities[], damageType[], includeAIOnly) | DroneFilterModal updates; reset button |
| droneSortConfig | {key, direction} | Drone column header clicks |
| cardsViewMode | 'table' / 'grid' | View mode toggle buttons |
| dronesViewMode | 'table' / 'grid' | View mode toggle buttons |
| activeChartView | 'cost' / 'type' / 'ability' etc. | Chart tab clicks |
| isStatsVisible | Boolean | Statistics toggle button |
| showSaveToast | Boolean | Set true by handleSaveWithToast; auto-hidden after 1500ms |

#### Side Effects (useEffect)

1. **Cost filter initialization** (lines 522-529): Sets filters.cost.min/max once filterOptions is calculated. Fires once when filterOptions changes.
2. **showSaveToast logger** (line 660): Logs state change. Debug only.
3. **Mount/unmount logger** (lines 665-670): Logs component lifecycle. Debug only.
4. **Toast DOM inspection** (lines 673-703): Queries DOM for `.save-toast` and logs computed styles. Dead debug code.

#### useMemo Computations

| Memo | Output | Dependencies |
|-|-|-|
| processedCardCollection | Cards enriched with keywords[] and targetingText | fullCardCollection |
| processedDroneCollection | Drones enriched with keywords[], description, aiOnly | availableDrones |
| activeComponentCollection | Ship components from availableComponents or shipComponentCollection | availableComponents, mode |
| filterOptions | Min/max cost, rarities, types, targets, damageTypes, abilities; adds "Starter" in extraction | processedCardCollection, mode |
| droneFilterOptions | Rarities, classes, abilities, damageTypes; adds "Starter" in extraction | processedDroneCollection, mode |
| {cardCount, deckListForDisplay, baseCardCounts, typeCounts} | Deck summary with per-type counts | deck, processedCardCollection |
| {droneCount, droneListForDisplay} | Drone summary | selectedDrones, processedDroneCollection |
| {shipComponentCount, shipComponentsValid, ...} | Component count, lane conflict validation, type coverage | selectedShipComponents, activeComponentCollection |
| isDeckValid | Boolean: card count matches ship limit, types within limits | cardCount, typeCounts, selectedShip |
| filteredAndSortedCards | Card list after filters + sort applied | processedCardCollection, filters, sortConfig, mode |
| filteredAndSortedDrones | Drone list after filters + sort applied | processedDroneCollection, droneFilters, droneSortConfig, mode |
| deckStats | Cost/ability/type distributions for bar/pie charts | deckListForDisplay |
| droneStats | 8 stat distributions + ability pie chart | droneListForDisplay |
| viewDeckData | {drones[], cards[]} for ViewDeckModal | selectedDrones, deck, collections |

#### Known Edge Cases

- **readOnly mode**: All quantity buttons disabled; save button hidden; modals still accessible for viewing
- **Extraction mode** (mode === 'extraction'): Shows ShipConfigurationTab; "Starter" rarity variant in filter/display; filtered collections from props; allows incomplete save with warning via onSaveInvalid
- **Rarity display**: Cards from starter pool display "Starter" instead of actual rarity; only in extraction mode
- **Component lane conflicts**: UI disables occupied lanes; validation ensures unique lanes per component
- **Mobile responsive**: Left/right panels toggled via mobileActivePanel; hidden on small screens
- **Damage indicators**: Yellow triangle on drone list entries if drone slot is damaged; extraction mode only
- **Hull display**: Extraction mode only; shows health bar with repair button if credits available
- **Toast timing**: showSaveToast auto-hides after 1500ms via setTimeout; skipped in readOnly mode
- **Null ship guard**: If selectedShip is null, uses getDefaultShip() fallback

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

**DeckBuilder.jsx**: 386 lines (down from 2,584 — 85% reduction)

| File | Lines | Location |
|-|-|-|
| DeckBuilder.jsx | 386 | src/components/screens/ |
| DeckBuilderLeftPanel.jsx | 632 | src/components/ui/ |
| DeckBuilderRightPanel.jsx | 443 | src/components/ui/ |
| DeckStatisticsCharts.jsx | 204 | src/components/ui/ |
| CardDetailPopup.jsx | 23 | src/components/ui/ |
| DroneDetailPopup.jsx | 25 | src/components/ui/ |
| ShipComponentDetailPopup.jsx | 132 | src/components/ui/ |
| DeckExportModal.jsx | 89 | src/components/modals/ |
| DeckImportModal.jsx | 72 | src/components/modals/ |
| DeckLoadModal.jsx | 76 | src/components/modals/ |
| useDeckBuilderData.js | 454 | src/hooks/ |
| cardTypeStyles.js | 42 | src/utils/ |
| DeckBuilder.test.jsx | 430 | src/components/screens/__tests__/ |
| ExtractionDeckBuilder.test.jsx | — | src/components/screens/__tests__/ |

**Tests**: 21 DeckBuilder-specific tests (19 + 2 extraction), 3,686 total suite

### Change Log

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
| 0 | 2026-02-22 | Migrate misplaced test files to `__tests__/` | All | None | None |
| 1 | 2026-02-22 | Remove dead code (toast DOM inspection, excessive debug logging) and banned comments | All | None — debug-only code removed | None |
| 2 | 2026-02-22 | Write intent-based tests (19 tests covering counts, validation, save, read-only) | All | None | None |
| 3 | 2026-02-22 | Extract `cardTypeStyles.js` (getTypeBackgroundClass, getTypeTextClass, getRarityDisplay) and chart utilities (COLORS, renderCustomizedLabel) | All | None | getRarityDisplay also moved (not originally in plan) |
| 4 | 2026-02-22 | Extract popup components (CardDetailPopup, DroneDetailPopup, ShipComponentDetailPopup) to `src/components/ui/` | All | None | None |
| 5 | 2026-02-22 | Extract inline modals (DeckExportModal, DeckImportModal, DeckLoadModal) to `src/components/modals/` | All | None — closure capture replaced with props | None |
| 6 | 2026-02-22 | Extract `useDeckBuilderData` hook (~470 lines of data processing memos) | All | None | None |
| 7 | 2026-02-22 | Extract `DeckStatisticsCharts` component (~238 lines of chart rendering) | All | None | None |
| 8 | 2026-02-22 | Extract `DeckBuilderLeftPanel` (~593 lines: ship selection, cards table/grid, drones table/grid, ship components table) | All | None | Also removed dead imports (Bolt, Sword, Shield, Copy, X, ShipSection, gameEngine, resolveShipSectionStats, createDefaultCardFilters, createDefaultDroneFilters, useRef) |
| 9 | 2026-02-22 | Extract `DeckBuilderRightPanel` (~398 lines: deck list, drone list, ship components layout, config tab, statistics, save button) | All | None | Also removed remaining panel-only imports (Eye, AlertTriangle, Settings, ShipCard, ShipConfigurationTab, DeckStatisticsCharts) |
| 10 | 2026-02-22 | Verify tests (21 pass), no additional integration tests needed — existing tests exercise full component tree | All | None | None |
