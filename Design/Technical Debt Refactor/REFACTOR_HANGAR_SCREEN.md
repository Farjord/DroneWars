# Refactor: HangarScreen.jsx

## Current State
- **Line count**: 2,203 lines (2.75x over the 800-line smell threshold)
- **Test coverage**: None. No `__tests__/` folder under `src/components/screens/`.
- **Props**: None (uses `useGameState` hook for all state)

### Section Map
| Lines | Responsibility |
|-|-|
| 1-50 | Imports (50+ imports including 8 tutorial modals) |
| 53-62 | Static assets: `eremosBackground`, `hangarImages` |
| 70-97 | State declarations (~25 useState calls) |
| 99-110 | `mapsWithCoordinates` useMemo |
| 112-121 | Pan/zoom state + refs |
| 124-132 | Destructure singlePlayer state from gameState |
| 135-237 | `generateHexGrid` function (~100 lines of geometry) |
| 240-248 | `getTierColor` helper |
| 250-258 | Music override effect |
| 260-332 | 3 effects: hex grid generation, tutorial check, map generation |
| 337-375 | Boss hex cell generation effect |
| 377-393 | `activeSectors` useMemo |
| 396-501 | Pan/zoom: wheel listener effect, mouse handlers, `clampPan`, `zoomToSector` |
| 503-555 | `getOffScreenPOIs` function |
| 560-585 | `getArrowEdgePosition` function |
| 590-664 | Event handlers: sidebar toggle, slot click, MIA close, star toggle, delete, unlock |
| 667-813 | Deck creation handlers: new deck option, copy starter, empty deck (business logic) |
| 816-952 | Action/map/boss handlers |
| 954-1102 | Deploy, boss loading, close-all, sector navigation, dismiss run summary |
| 1104-1582 | Render: header + main grid (map area with SVG hex grid, vignettes, zoom controls, POI arrows) |
| 1584-1875 | Render: right sidebar (options mode with image buttons, ships mode with slot cards) |
| 1877-2199 | Render: 20+ modals and overlay screens (conditionally rendered) |
| 2200-2203 | Component close + export |

## Problems

### CODE_STANDARDS.md Violations
1. **File size**: 2,203 lines -- well over 800-line threshold
2. **Business logic in component**: Deck creation logic (lines 667-813) including inventory mutation, drone/component instance creation, credit deduction -- all pure game logic that belongs in `src/logic/`
3. **Geometry/math in component**: `generateHexGrid` (lines 151-237), `getOffScreenPOIs` (lines 512-555), `getArrowEdgePosition` (lines 560-585) are pure calculation functions with no React dependency
4. **20+ inline modal renderings**: Lines 1877-2199 render modals inline with verbose tutorial dismiss callback patterns

### Raw console.log Usage (should be debugLog)
- Line 662: `console.warn('Failed to unlock slot:', result.error)`
- Line 891: `console.error('[HangarScreen] Map data not generated yet')`
- Line 916: `console.error('[HangarScreen] No active ship available for deployment')`
- Line 927: `console.error('[HangarScreen] Ship is undeployable - repair sections in deck builder')`
- Line 1000: `console.error('[HangarScreen] Failed to initiate boss combat')`
- Line 1031: `console.error('[HangarScreen] Cannot deploy: missing parameters')`
- Line 1044: `console.error('[HangarScreen] Cannot deploy: ship is undeployable - all sections destroyed')`

### Code Smell
1. **Deck creation business logic**: `handleConfirmCopyStarter` (lines 678-762) manually constructs inventory changes, drone instances, component instances, and calls multiple gameStateManager methods. This is 85 lines of pure business logic that belongs in a service or gameStateManager method.
2. **Repetitive tutorial modal rendering**: Lines 2099-2180 contain 8 nearly identical tutorial modal blocks that differ only by tutorial name and dismiss callback.
3. **Inline IIFE in render**: Lines 1173-1188 use an IIFE `(() => { ... })()` to compute reputation data inside JSX. This should be a memo or extracted component.
4. **Placeholder modal**: Lines 1918-1929 contain a "Deck Editor - Coming in Phase 3.5" placeholder modal.
5. **Duplicate validation logic**: Lines 1707-1722 compute deck validation inline within the ship slot render loop, repeating validation logic that could be precomputed.

## Extraction Plan

### 1. Extract hex grid geometry to utility
- **What**: `generateHexGrid`, `getHexCoordinate`, `getOffScreenPOIs`, `getArrowEdgePosition`, `clampPan`, `GRID_COLS`, `GRID_ROWS`
- **Where**: `src/utils/hexGridUtils.js`
- **Why**: ~200 lines of pure geometry/math. Zero React dependency. Easily testable in isolation.
- **Dependencies**: `SeededRandom`, `mapTiers`

### 2. Extract `useHangarMapState` hook
- **What**: Pan/zoom state (`zoom`, `pan`, `isDragging`, `dragStart`), refs (`mapContainerRef`, `transformRef`, `panRef`), mouse handlers (`handleMapMouseDown`, `handleMapMouseMove`, `handleMapMouseUp`, `handleResetView`), wheel listener effect, `zoomToSector`
- **Where**: `src/hooks/useHangarMapState.js`
- **Why**: ~120 lines of self-contained pan/zoom interaction logic.
- **Dependencies**: Needs `mapContainerRef` (can be created inside hook and returned).

### 3. Extract `useHangarData` hook
- **What**: Hex grid generation effect, map generation effect, boss hex cell effect, tutorial check effect, music override effect, `mapsWithCoordinates` memo, `activeSectors` memo
- **Where**: `src/hooks/useHangarData.js`
- **Why**: ~200 lines of data derivation and effects. Returns computed data needed by the render.
- **Dependencies**: `singlePlayerProfile`, `generateHexGrid`, `generateMapData`, `aiPersonalities`, `SeededRandom`, `MissionService`, `MusicManager`

### 4. Move deck creation business logic to service/manager
- **What**: `handleConfirmCopyStarter` (lines 678-762), `handleConfirmEmptyDeck` (lines 770-809)
- **Where**: `src/logic/singlePlayer/DeckSlotService.js` (new) or extend `gameStateManager` methods
- **Why**: These contain pure business logic -- inventory mutations, credit deduction, instance creation. The component should just call a single service method.
- **Dependencies**: `gameStateManager`, `starterDeck`, `ECONOMY`, `singlePlayerProfile`, etc.

### 5. Extract `HangarHeader` sub-component
- **What**: Lines 1114-1197 -- header with title, help button, stat boxes, reputation track, mission panel
- **Where**: `src/components/ui/HangarHeader.jsx`
- **Why**: Self-contained render section with clear props boundary.
- **Dependencies**: `ReputationService`, `MissionService`, `SoundManager`, `ReputationTrack`, `MissionPanel`

### 6. Extract `HangarHexMap` sub-component
- **What**: Lines 1206-1582 -- the entire map area including SVG hex grid, vignettes, zoom controls, POI arrows
- **Where**: `src/components/ui/HangarHexMap.jsx`
- **Why**: ~380 lines of map rendering. Distinct visual concern.
- **Dependencies**: Pan/zoom state (from hook), `hexGridData`, `generatedMaps`, `bossHexCell`, handlers

### 7. Extract `HangarSidebar` sub-component
- **What**: Lines 1584-1875 -- right sidebar with options/ships toggle, image buttons, ship slot cards
- **Where**: `src/components/ui/HangarSidebar.jsx`
- **Why**: ~290 lines with clear boundary.
- **Dependencies**: `singlePlayerShipSlots`, `singlePlayerProfile`, handlers, `ECONOMY`, `ReputationService`

### 8. Extract `HangarModals` sub-component
- **What**: Lines 1877-2199 -- all 20+ conditional modal renders
- **Where**: `src/components/ui/HangarModals.jsx`
- **Why**: ~320 lines of modal orchestration. Each modal is already its own component; this is just the conditional rendering.
- **Dependencies**: All modal components, state setters, handlers

### 9. Consolidate tutorial modal rendering
- **What**: Lines 2099-2180 -- 8 near-identical tutorial blocks
- **Where**: Refactor into a data-driven approach within `HangarModals`
- **Why**: Reduces ~80 lines to ~15 lines with a `tutorialConfig` map.
- **Dependencies**: Tutorial modal components, `MissionService`

## Dead Code Removal

### Placeholder Modal (lines 1918-1929)
The "Deck Editor - Coming in Phase 3.5" placeholder modal under `activeModal === 'deckEditor'` appears to be dead code. The deck editor is accessed via `appState: 'extractionDeckBuilder'`, not through this modal.

**Action**: Verify no code sets `activeModal` to `'deckEditor'`, then remove.

### No legacy click-to-initiate-action code
HangarScreen is a hub/menu screen, not a game board. No drag-and-drop dead code applies.

## Logging Improvements

### Replace raw console calls with debugLog
All 7 instances listed in Problems section must be converted:
- `console.warn` -> `debugLog('HANGAR', ...)`
- `console.error` -> `debugLog('HANGAR', ...)`

### Categories to use
- `'HANGAR'` for UI state changes, slot operations, modal management
- `'EXTRACTION'` for map/deployment related (already used correctly in most places)
- `'MODE_TRANSITION'` for screen navigation (already used correctly)

### Noisy logs to reduce
- Lines 882-951: `handleMapIconClick` has 10 debugLog calls with emoji prefixes. Reduce to 3-4 essential ones.
- Lines 1006-1055: `handleDeploy` has 8 debugLog calls. Reduce to 3-4.

## Comment Cleanup

### Stale/noise comments to remove
- None found matching banned patterns (`// NEW`, `// MODIFIED`, etc.)

### Useful comments present
- JSDoc-style comments on major functions (`generateHexGrid`, `generateMapsForSession`, etc.) -- keep these
- Section separator comments (`{/* Header Section */}`, `{/* Central Map Area */}`) -- keep these

## Testing Requirements

### Before Extraction (intent-based tests)
- Test `generateHexGrid`: given container dimensions and seed, verify deterministic cell placement, active cell count, minimum spacing
- Test `getOffScreenPOIs`: given mock hex data, zoom, pan, verify correct detection of off-screen cells
- Test `clampPan`: verify clamping at various zoom levels
- Test deck creation logic: verify `handleConfirmCopyStarter` correctly computes inventory changes and credit deduction (test against extracted service)

### After Extraction (unit tests for new files)
- `src/utils/__tests__/hexGridUtils.test.js` -- pure geometry tests
- `src/hooks/__tests__/useHangarMapState.test.js` -- pan/zoom behavior
- `src/logic/singlePlayer/__tests__/DeckSlotService.test.js` -- deck creation business logic

### Test File Locations
- `src/components/screens/__tests__/HangarScreen.test.jsx`
- `src/utils/__tests__/hexGridUtils.test.js`
- `src/hooks/__tests__/useHangarData.test.js`
- `src/logic/singlePlayer/__tests__/DeckSlotService.test.js`

## Execution Order

1. **Fix logging**: Replace all 7 raw `console.*` calls with `debugLog`. Reduce noisy log sequences. _Commit._
2. **Remove dead code**: Delete placeholder "Deck Editor" modal (lines 1918-1929) after confirming it's unreachable. _Commit._
3. **Extract hex grid utilities**: Move `generateHexGrid`, `getHexCoordinate`, `getOffScreenPOIs`, `getArrowEdgePosition`, `clampPan`, grid constants to `src/utils/hexGridUtils.js`. Write tests. _Commit._
4. **Extract `useHangarMapState` hook**: Move pan/zoom state, refs, mouse handlers, wheel effect. _Commit._
5. **Extract `useHangarData` hook**: Move grid generation effect, map generation effect, boss placement effect, tutorial effect, music effect, computed memos. _Commit._
6. **Extract deck creation logic**: Move `handleConfirmCopyStarter` and `handleConfirmEmptyDeck` logic to `DeckSlotService.js`. Component calls service method. Write tests. _Commit._
7. **Extract `HangarHeader`**: Pull header section. _Commit._
8. **Extract `HangarHexMap`**: Pull map area rendering. _Commit._
9. **Extract `HangarSidebar`**: Pull right sidebar. _Commit._
10. **Extract `HangarModals`**: Pull modal section. Consolidate tutorial modals into data-driven pattern. _Commit._
11. **Write integration tests**: Verify screen renders, modals open/close, deploy flow. _Commit._

## Risk Assessment

### What Could Break
- **Pan/zoom interaction**: Extracting mouse handlers + refs to a hook requires careful attention to ref lifecycle. The wheel listener uses `{ passive: false }` which must be preserved.
- **Deck creation logic**: Moving `handleConfirmCopyStarter` to a service requires it to return the new state objects rather than calling `gameStateManager.setState` directly -- or the service must receive gameStateManager.
- **Modal state coordination**: Several modals set/clear `activeModal`, `selectedSlotId`, `selectedMap`, etc. Extracting modals must preserve the shared state coordination via `closeAllModals`.
- **Tutorial dismiss chains**: Some tutorials trigger navigation on dismiss (e.g., `repairBay` tutorial navigates to repair bay). The extracted modal component must still have access to `gameStateManager.setState`.

### Flows to Verify
- Hex grid renders correctly at various container sizes
- Pan/zoom works: mouse drag, scroll wheel, zoom buttons, reset
- POI arrows appear when sectors are off-screen
- Map icon click -> MapOverviewModal opens with correct sector
- Boss hex click -> BossEncounterModal opens
- Ship slot click -> navigates to deck builder (active) / new deck prompt (empty) / MIA recovery (mia)
- Deploy flow: select sector -> map overview -> deploy -> deploying screen -> tactical map
- All 5 action buttons (inventory, replicator, blueprints, shop, repair bay) open correct modals
- Tutorial modals appear on first visit, dismiss correctly
- Save/Load modal opens and works
- Reputation track click -> progress modal -> rewards modal
- Quick deploy flow

### How to Validate
- Manual smoke test of all sidebar interactions in both options and ships modes
- Test deployment flow end-to-end
- Verify hex grid positions are deterministic (same seed = same layout)
- Check that tutorial dismissal state persists correctly
- Run full test suite after each extraction step

---

## Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

*To be completed before refactoring begins. This section documents the current behavior, intent, contracts, dependencies, edge cases, and non-obvious design decisions of the code being refactored. Once written, this section is never modified — it serves as the permanent "before" record.*

## Change Log

*Append entries here as refactoring steps are completed.*

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
