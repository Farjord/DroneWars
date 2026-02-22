# Refactor: HangarScreen.jsx

## BEFORE

### Current State
- **Line count**: 2,203 lines (2.75x over the 800-line smell threshold)
- **Test coverage**: None. No `__tests__/` folder under `src/components/screens/`.
- **Props**: None (uses `useGameState` hook for all state)

#### Section Map
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

### Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

#### Exports / Public API
- **`HangarScreen`** (default export): React component. No props. Reads all state via `useGameState()` hook. Single consumer: `src/AppRouter.jsx`. Returns the single-player extraction hub UI with hex grid map, sidebar, and modal layer.

#### useState Hooks (27 total)

| Variable | Initial | Purpose |
|-|-|-|
| `sidebarMode` | `'options'` | Toggle options/ships sidebar view |
| `hexGridData` | `null` | Generated hex grid cells + dimensions |
| `generatedMaps` | `[]` | 6 procedural maps for session |
| `activeModal` | `null` | Current modal name string |
| `selectedSlotId` | `null` | Ship slot ID for current action |
| `selectedMap` | `null` | Map data for modal display |
| `selectedCoordinate` | `null` | Hex coordinate string |
| `selectedMiaSlot` | `null` | Ship slot in MIA status |
| `newDeckOption` | `null` | `'empty'` or `'copyFromSlot0'` |
| `deleteConfirmation` | `null` | `{ slotId, slotName }` for delete confirm |
| `copyStarterConfirmation` | `false` | Show copy starter cost confirm |
| `emptyDeckConfirmation` | `false` | Show empty deck cost confirm |
| `hoveredButton` | `null` | Image button key being hovered |
| `showReputationProgress` | `false` | Reputation progress modal |
| `showReputationRewards` | `false` | Reputation reward claim modal |
| `showDeployingScreen` | `false` | Deployment transition screen |
| `deployingData` | `null` | `{ slotId, map, entryGateId, quickDeploy, shipName }` |
| `selectedBossId` | `null` | Boss ID for encounter modal |
| `bossHexCell` | `null` | Boss hex cell data with `isBoss: true` |
| `showBossLoadingScreen` | `false` | Boss encounter transition |
| `bossLoadingData` | `null` | `{ aiName, difficulty, threatLevel, isAmbush, slotId, bossId }` |
| `showMissionTracker` | `false` | Mission tracker modal |
| `showTutorial` | `null` | Current tutorial key string |
| `isHelpIconTutorial` | `false` | Tutorial triggered from help icon |
| `zoom` | `1.5` | Map zoom level (range 1.2–3) |
| `pan` | `{ x: 0, y: 0 }` | Map pan offset pixels |
| `isDragging` | `false` | Map drag in progress |
| `dragStart` | `{ x: 0, y: 0 }` | Mouse position at drag start |

#### useEffect Hooks (7 total)

| Deps | Purpose | Side Effects |
|-|-|-|
| `[showDeployingScreen]` | Override music during deploy transition | `MusicManager.setOverride('deploying')` / `clearOverride()` |
| `[gameSeed, runsCompleted, runsLost]` | Generate hex grid with 100ms delay | Sets `hexGridData` via `generateHexGrid()` |
| `[singlePlayerProfile]` | Check intro tutorial on mount | Sets `showTutorial('intro')` with 500ms delay |
| `[gameSeed, runsCompleted, runsLost]` | Generate 6 procedural maps | Calls `generateMapData()` 6x with offset seeds, sets `generatedMaps` |
| `[hexGridData, gameSeed]` | Place boss hex after grid ready | Uses `SeededRandom(seed + 999)`, sets `bossHexCell` |
| `[]` | Attach wheel listener `{ passive: false }` | Manages zoom/pan on wheel; prevents default scroll |
| `[pan]` | Sync panRef with state | `panRef.current = pan` |

#### useMemo Hooks (2 total)

| Deps | Computes |
|-|-|
| `[hexGridData, generatedMaps]` | Maps with injected `name: 'Sector X-Y'` coordinates |
| `[hexGridData]` | Active sectors sorted top-to-bottom, left-to-right |

#### useRef Hooks (3 total)

| Name | Purpose |
|-|-|
| `mapContainerRef` | DOM ref for map container (dimensions for hex grid, pan clamping) |
| `transformRef` | DOM ref for grid transform (direct style mutation during drag) |
| `panRef` | Track pan during drag without re-renders; synced to state on mouseup |

#### Key Internal Functions

| Function | Params | Returns | Side Effects |
|-|-|-|-|
| `generateHexGrid` | `(w, h, seed, activeCount, totalDeployments)` | `{ allCells, hexWidth, hexHeight, offsetX, offsetY }` | None (pure). Uses `SeededRandom` |
| `getHexCoordinate` | `(col, row)` | String like `'A-1'` | None (pure) |
| `getTierColor` | `(tier)` | Hex color string from `RARITY_COLORS` | None (pure) |
| `clampPan` | `(panX, panY, zoomLevel)` | Clamped `{ x, y }` | None (pure, reads `mapContainerRef`) |
| `zoomToSector` | `(coordinate)` | `undefined` | Sets `zoom` to 2, computes and sets `pan` |
| `getOffScreenPOIs` | `()` | Array of `{ cell, angle, screenX, screenY }` | None (reads state) |
| `getArrowEdgePosition` | `(angle, w, h)` | `{ left, top }` | None (pure) |
| `handleMapMouseDown` | `(e)` | `undefined` | Sets `isDragging`, `dragStart` |
| `handleMapMouseMove` | `(e)` | `undefined` | **Direct DOM mutation**: `transformRef.current.style.transform`; updates `panRef` |
| `handleMapMouseUp` | `()` | `undefined` | Syncs `panRef` → `setPan()`; clears `isDragging` |
| `handleResetView` | `()` | `undefined` | Resets zoom/pan to defaults |
| `handleSlotClick` | `(slot)` | `undefined` | Sound: `ui_click`. Navigates to deck builder (active), opens MIA modal (MIA), opens new deck prompt (empty) |
| `handleStarToggle` | `(e, slotId)` | `undefined` | Calls `gameStateManager.setDefaultShipSlot()` |
| `handleDeleteClick` | `(e, slot)` | `undefined` | Sets `deleteConfirmation` state |
| `handleDeleteConfirm` | `()` | `undefined` | Calls `gameStateManager.deleteShipSlotDeck()` |
| `handleUnlockSlot` | `(e)` | `undefined` | Calls `gameStateManager.unlockNextDeckSlot()` |
| `handleNewDeckOption` | `(option)` | `undefined` | Sets confirmation modals for `'copyFromSlot0'` or `'empty'` |
| `handleConfirmCopyStarter` | `()` | `undefined` | Deducts credits, copies starter deck items to inventory, creates drone/component instances, saves deck, navigates to deck builder |
| `handleConfirmEmptyDeck` | `()` | `undefined` | Deducts credits, creates empty deck, navigates to deck builder |
| `handleActionClick` | `(action)` | `undefined` | Sound: `ui_click`. Records mission progress. Opens modal or navigates to repairBay |
| `handleMapSelected` | `(mapData)` | `undefined` | Checks tutorials. Sets modal/tutorial state |
| `handleMapIconClick` | `(mapIndex, coordinate)` | `undefined` | Sound: `hex_click`. Validates ship slot. Opens mapOverview modal |
| `handleBossHexClick` | `(bossId)` | `undefined` | Opens bossEncounter modal |
| `handleBossChallenge` | `(slotId, bossId)` | `undefined` | Sets boss loading data, shows loading screen |
| `handleBossLoadingComplete` | `()` | Promise | Awaits `SinglePlayerCombatInitializer.initiateBossCombat()` |
| `handleDeploy` | `(slotId, map, entryGateId, quickDeploy)` | `undefined` | Validates params, shows deploying screen |
| `handleDeployingComplete` | `()` | `undefined` | Calls `gameStateManager.startRun()` |
| `closeAllModals` | `()` | `undefined` | Clears all modal/selection state |

#### State Mutations via gameStateManager

| Method | Context |
|-|-|
| `setState({ appState: 'extractionDeckBuilder', extractionDeckSlotId, extractionNewDeckOption: null })` | Navigate to deck builder (3 call sites) |
| `setState({ singlePlayerProfile, singlePlayerInventory, singlePlayerDroneInstances, singlePlayerShipComponentInstances })` | Update inventory after starter deck copy |
| `setState({ singlePlayerProfile })` | Deduct credits for empty deck |
| `setState({ appState: 'repairBay' })` | Navigate to repair bay (2 call sites) |
| `setState({ appState: 'menu' })` | Exit to main menu |
| `setState({ lastRunSummary: null })` | Dismiss run summary |
| `setDefaultShipSlot(slotId)` | Toggle default ship slot |
| `deleteShipSlotDeck(slotId)` | Delete a ship slot deck |
| `unlockNextDeckSlot()` | Unlock next available slot |
| `saveShipSlotDeck(slotId, deckData)` | Persist deck data (copy starter / empty) |
| `startRun(slotId, map, entryGateId, quickDeploy)` | Begin extraction run |

#### Side Effects & Service Calls

| Service | Method | Context |
|-|-|-|
| `MusicManager` | `setOverride('deploying')` / `clearOverride()` | Deploy transition screen |
| `SoundManager` | `play('ui_click')` | Various UI interactions |
| `SoundManager` | `play('hex_click')` | Map icon clicks |
| `SoundManager` | `play('hover_over')` | Image button hover |
| `MissionService` | `isTutorialDismissed(action)` | Check tutorial display state |
| `MissionService` | `recordProgress('SCREEN_VISIT', { screen })` | Log visits for missions |
| `MissionService` | `dismissTutorial(action)` | Mark tutorial dismissed |
| `MissionService` | `skipIntroMissions()` | Skip intro missions |
| `MissionService` | `getActiveCount()` / `getClaimableCount()` | Mission panel stats |
| `ReputationService` | `getLevelData()` | Header reputation display |
| `ReputationService` | `getUnclaimedRewards()` | Check pending rewards |
| `ReputationService` | `getLoadoutValue(slot)` | Slot value display |
| `SinglePlayerCombatInitializer` | `initiateBossCombat(bossId, slotId)` | Start boss fight |

#### Known Edge Cases

| Pattern | Details |
|-|-|
| **Seeded Random** | `SeededRandom(seed + totalDeployments * 1000)` for hex grid; `SeededRandom(seed + 999)` for boss placement. Ensures deterministic but varied layout per session |
| **Direct DOM Mutation** | `transformRef.current.style.transform` during drag for smooth pan (bypasses React re-render). Synced to state on mouseup |
| **Passive Wheel Event** | `{ passive: false }` on wheel listener to allow `preventDefault()` |
| **panRef Pattern** | Ref updated during drag moves, synced to state on mouseup — avoids re-renders during drag |
| **Non-deterministic Instance IDs** | `Date.now() + Math.random().toString(36).substr(2, 9)` for drone/component instances |
| **Timeout Delays** | 100ms for hex grid gen (DOM ready); 500ms for intro tutorial (visual timing) |
| **Tutorial/Modal Overlap** | Tutorial modals can appear on top of other modals; not mutually exclusive with `activeModal` |
| **Validation Before Deploy** | `validateShipSlot()` checks if ship is undeployable (all sections destroyed); returns early |
| **Boss Hex Distance Check** | Boss hex avoids active map cells with minimum distance of 2 cells |
| **IIFE in Render** | Reputation data computation (lines 1173-1188) and deck validation (lines 1707-1722) use inline IIFEs |
| **debugLog IIFE in MapOverviewModal render** | Lines 1895-1902: debugLog fires on every render, not just on modal open |

## TO DO

### Problems

#### CODE_STANDARDS.md Violations
1. **File size**: 2,203 lines -- well over 800-line threshold
2. **Business logic in component**: Deck creation logic (lines 667-813) including inventory mutation, drone/component instance creation, credit deduction -- all pure game logic that belongs in `src/logic/`
3. **Geometry/math in component**: `generateHexGrid` (lines 151-237), `getOffScreenPOIs` (lines 512-555), `getArrowEdgePosition` (lines 560-585) are pure calculation functions with no React dependency
4. **20+ inline modal renderings**: Lines 1877-2199 render modals inline with verbose tutorial dismiss callback patterns

#### Raw console.log Usage (should be debugLog)
- Line 662: `console.warn('Failed to unlock slot:', result.error)`
- Line 891: `console.error('[HangarScreen] Map data not generated yet')`
- Line 916: `console.error('[HangarScreen] No active ship available for deployment')`
- Line 927: `console.error('[HangarScreen] Ship is undeployable - repair sections in deck builder')`
- Line 1000: `console.error('[HangarScreen] Failed to initiate boss combat')`
- Line 1031: `console.error('[HangarScreen] Cannot deploy: missing parameters')`
- Line 1044: `console.error('[HangarScreen] Cannot deploy: ship is undeployable - all sections destroyed')`

#### Code Smell
1. **Deck creation business logic**: `handleConfirmCopyStarter` (lines 678-762) manually constructs inventory changes, drone instances, component instances, and calls multiple gameStateManager methods. This is 85 lines of pure business logic that belongs in a service or gameStateManager method.
2. **Repetitive tutorial modal rendering**: Lines 2099-2180 contain 8 nearly identical tutorial modal blocks that differ only by tutorial name and dismiss callback.
3. **Inline IIFE in render**: Lines 1173-1188 use an IIFE `(() => { ... })()` to compute reputation data inside JSX. This should be a memo or extracted component.
4. **Placeholder modal**: Lines 1918-1929 contain a "Deck Editor - Coming in Phase 3.5" placeholder modal.
5. **Duplicate validation logic**: Lines 1707-1722 compute deck validation inline within the ship slot render loop, repeating validation logic that could be precomputed.

### Extraction Plan

#### 1. Extract hex grid geometry to utility
- **What**: `generateHexGrid`, `getHexCoordinate`, `getOffScreenPOIs`, `getArrowEdgePosition`, `clampPan`, `GRID_COLS`, `GRID_ROWS`
- **Where**: `src/logic/singlePlayer/hexGrid.js` (uses domain-specific SeededRandom and mapTiers — not a generic utility)
- **Why**: ~200 lines of pure geometry/math. Zero React dependency. Easily testable in isolation.
- **Dependencies**: `SeededRandom`, `mapTiers`

#### 2. Extract `useHangarMapState` hook
- **What**: Pan/zoom state (`zoom`, `pan`, `isDragging`, `dragStart`), refs (`mapContainerRef`, `transformRef`, `panRef`), mouse handlers (`handleMapMouseDown`, `handleMapMouseMove`, `handleMapMouseUp`, `handleResetView`), wheel listener effect, `zoomToSector`
- **Where**: `src/hooks/useHangarMapState.js`
- **Why**: ~120 lines of self-contained pan/zoom interaction logic.
- **Dependencies**: Needs `mapContainerRef` (can be created inside hook and returned).

#### 3. Extract `useHangarData` hook
- **What**: Hex grid generation effect, map generation effect, boss hex cell effect, tutorial check effect, music override effect, `mapsWithCoordinates` memo, `activeSectors` memo
- **Where**: `src/hooks/useHangarData.js`
- **Why**: ~200 lines of data derivation and effects. Returns computed data needed by the render.
- **Dependencies**: `singlePlayerProfile`, `generateHexGrid`, `generateMapData`, `aiPersonalities`, `SeededRandom`, `MissionService`, `MusicManager`

#### 4. Move deck creation business logic to service/manager
- **What**: `handleConfirmCopyStarter` (lines 678-762), `handleConfirmEmptyDeck` (lines 770-809)
- **Where**: `src/logic/singlePlayer/deckSlotFactory.js` (camelCase per CODE_STANDARDS — it creates deck slot data, not a service class)
- **Why**: These contain pure business logic -- inventory mutations, credit deduction, instance creation. The component should just call a single service method.
- **Dependencies**: `gameStateManager`, `starterDeck`, `ECONOMY`, `singlePlayerProfile`, etc.

#### 5. Extract `HangarHeader` sub-component
- **What**: Lines 1114-1197 -- header with title, help button, stat boxes, reputation track, mission panel
- **Where**: `src/components/ui/HangarHeader.jsx`
- **Why**: Self-contained render section with clear props boundary.
- **Dependencies**: `ReputationService`, `MissionService`, `SoundManager`, `ReputationTrack`, `MissionPanel`

#### 6. Extract `HangarHexMap` sub-component
- **What**: Lines 1206-1582 -- the entire map area including SVG hex grid, vignettes, zoom controls, POI arrows
- **Where**: `src/components/ui/HangarHexMap.jsx`
- **Why**: ~380 lines of map rendering. Distinct visual concern.
- **Dependencies**: Pan/zoom state (from hook), `hexGridData`, `generatedMaps`, `bossHexCell`, handlers

#### 7. Extract `HangarSidebar` sub-component
- **What**: Lines 1584-1875 -- right sidebar with options/ships toggle, image buttons, ship slot cards
- **Where**: `src/components/ui/HangarSidebar.jsx`
- **Why**: ~290 lines with clear boundary.
- **Dependencies**: `singlePlayerShipSlots`, `singlePlayerProfile`, handlers, `ECONOMY`, `ReputationService`

#### 8. Extract `HangarModals` sub-component
- **What**: Lines 1877-2199 -- all 20+ conditional modal renders
- **Where**: `src/components/ui/HangarModals.jsx`
- **Why**: ~320 lines of modal orchestration. Each modal is already its own component; this is just the conditional rendering.
- **Dependencies**: All modal components, state setters, handlers

#### 9. Consolidate tutorial modal rendering
- **What**: Lines 2099-2180 -- 8 near-identical tutorial blocks
- **Where**: Refactor into a data-driven approach within `HangarModals`
- **Why**: Reduces ~80 lines to ~15 lines with a `tutorialConfig` map.
- **Dependencies**: Tutorial modal components, `MissionService`

### Dead Code Removal

#### Placeholder Modal (lines 1918-1929)
The "Deck Editor - Coming in Phase 3.5" placeholder modal under `activeModal === 'deckEditor'` appears to be dead code. The deck editor is accessed via `appState: 'extractionDeckBuilder'`, not through this modal.

**Action**: Verify no code sets `activeModal` to `'deckEditor'`, then remove.

#### No legacy click-to-initiate-action code
HangarScreen is a hub/menu screen, not a game board. No drag-and-drop dead code applies.

### Logging Improvements

#### Replace raw console calls with debugLog
All 7 instances listed in Problems section must be converted:
- `console.warn` -> `debugLog('HANGAR', ...)`
- `console.error` -> `debugLog('HANGAR', ...)`

#### Categories to use
- `'HANGAR'` for UI state changes, slot operations, modal management
- `'EXTRACTION'` for map/deployment related (already used correctly in most places)
- `'MODE_TRANSITION'` for screen navigation (already used correctly)

#### Noisy logs to reduce
- Lines 882-951: `handleMapIconClick` has 10 debugLog calls with emoji prefixes. Reduce to 3-4 essential ones.
- Lines 1006-1055: `handleDeploy` has 8 debugLog calls. Reduce to 3-4.

### Comment Cleanup

#### Stale/noise comments to remove
- None found matching banned patterns (`// NEW`, `// MODIFIED`, etc.)

#### Useful comments present
- JSDoc-style comments on major functions (`generateHexGrid`, `generateMapsForSession`, etc.) -- keep these
- Section separator comments (`{/* Header Section */}`, `{/* Central Map Area */}`) -- keep these

### Testing Requirements

#### Before Extraction (intent-based tests)
- Test `generateHexGrid`: given container dimensions and seed, verify deterministic cell placement, active cell count, minimum spacing
- Test `getOffScreenPOIs`: given mock hex data, zoom, pan, verify correct detection of off-screen cells
- Test `clampPan`: verify clamping at various zoom levels
- Test deck creation logic: verify `handleConfirmCopyStarter` correctly computes inventory changes and credit deduction (test against extracted service)

#### After Extraction (unit tests for new files)
- `src/logic/singlePlayer/__tests__/hexGrid.test.js` -- pure geometry tests
- `src/hooks/__tests__/useHangarMapState.test.js` -- pan/zoom behavior
- `src/logic/singlePlayer/__tests__/deckSlotFactory.test.js` -- deck creation business logic

#### Test File Locations
- `src/components/screens/__tests__/HangarScreen.test.jsx`
- `src/logic/singlePlayer/__tests__/hexGrid.test.js`
- `src/hooks/__tests__/useHangarData.test.js`
- `src/logic/singlePlayer/__tests__/deckSlotFactory.test.js`

### Execution Order

1. **Fix logging**: Replace all 7 raw `console.*` calls with `debugLog`. Reduce noisy log sequences. _Commit._
2. **Remove dead code**: Delete placeholder "Deck Editor" modal (lines 1918-1929) after confirming it's unreachable. _Commit._
3. **Write intent-based tests (Phase 2)**: Create `src/components/screens/__tests__/HangarScreen.test.jsx` with tests for `generateHexGrid`, `getOffScreenPOIs`, `clampPan`, and deck creation logic. Tests must pass on current code before any extractions. _Commit._
4. **Extract hex grid utilities**: Move `generateHexGrid`, `getHexCoordinate`, `getOffScreenPOIs`, `getArrowEdgePosition`, `clampPan`, grid constants to `src/logic/singlePlayer/hexGrid.js`. Write tests. _Commit._
5. **Extract `useHangarMapState` hook**: Move pan/zoom state, refs, mouse handlers, wheel effect. _Commit._
6. **Extract `useHangarData` hook**: Move grid generation effect, map generation effect, boss placement effect, tutorial effect, music effect, computed memos. _Commit._
7. **Extract deck creation logic**: Move `handleConfirmCopyStarter` and `handleConfirmEmptyDeck` logic to `deckSlotFactory.js`. Component calls factory function. Write tests. _Commit._
8. **Extract `HangarHeader`**: Pull header section. _Commit._
9. **Extract `HangarHexMap`**: Pull map area rendering. _Commit._
10. **Extract `HangarSidebar`**: Pull right sidebar. _Commit._
11. **Extract `HangarModals`**: Pull modal section. Consolidate tutorial modals into data-driven pattern. _Commit._
12. **Write integration tests**: Verify screen renders, modals open/close, deploy flow. _Commit._

### Risk Assessment

#### What Could Break
- **Pan/zoom interaction**: Extracting mouse handlers + refs to a hook requires careful attention to ref lifecycle. The wheel listener uses `{ passive: false }` which must be preserved.
- **Deck creation logic**: Moving `handleConfirmCopyStarter` to a service requires it to return the new state objects rather than calling `gameStateManager.setState` directly -- or the service must receive gameStateManager.
- **Modal state coordination**: Several modals set/clear `activeModal`, `selectedSlotId`, `selectedMap`, etc. Extracting modals must preserve the shared state coordination via `closeAllModals`.
- **Tutorial dismiss chains**: Some tutorials trigger navigation on dismiss (e.g., `repairBay` tutorial navigates to repair bay). The extracted modal component must still have access to `gameStateManager.setState`.

#### Flows to Verify
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

#### How to Validate
- Manual smoke test of all sidebar interactions in both options and ships modes
- Test deployment flow end-to-end
- Verify hex grid positions are deterministic (same seed = same layout)
- Check that tutorial dismissal state persists correctly
- Run full test suite after each extraction step

## NOW

### Final State

**HangarScreen.jsx**: 568 lines (was 2,204 — 74% reduction)

**New files created:**
| File | Lines | Purpose |
|-|-|-|
| src/logic/singlePlayer/hexGrid.js | ~130 | Hex grid geometry utilities |
| src/hooks/useHangarMapState.js | ~122 | Pan/zoom interaction hook |
| src/hooks/useHangarData.js | ~130 | Data derivation hook |
| src/logic/singlePlayer/deckSlotFactory.js | ~85 | Deck creation business logic |
| src/components/ui/HangarHeader.jsx | ~100 | Header sub-component |
| src/components/ui/HangarHexMap.jsx | ~340 | Hex map sub-component |
| src/components/ui/HangarSidebar.jsx | ~270 | Sidebar sub-component |
| src/components/ui/HangarModals.jsx | ~310 | Modals container component |

**Test files:**
| File | Tests |
|-|-|
| src/logic/singlePlayer/__tests__/hexGrid.test.js | 15 |
| src/logic/singlePlayer/__tests__/deckSlotFactory.test.js | 8 |
| src/components/screens/__tests__/HangarScreen.test.jsx | 16 |
| src/components/screens/__tests__/HangarScreen.boss.test.jsx | 5 |
| src/components/screens/__tests__/HangarScreen.deploy.test.jsx | 7 |
| src/components/screens/__tests__/HangarScreen.mapRegeneration.test.jsx | 4 |
| src/components/screens/__tests__/HangarScreen.shipSlotId.test.jsx | 12 |

All 3,709 tests pass (217 test files, 0 failures).

### Change Log

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
| 0a | 2026-02-22 | Migrate 5 test files to __tests__/ | All | None | Fixed pre-existing import path issues |
| 0b | 2026-02-22 | Populate Behavioral Baseline | N/A | N/A | None |
| 1 | 2026-02-22 | Fix logging: 7 console.* → debugLog, reduce noisy sequences | All | None | None |
| 2 | 2026-02-22 | Remove dead deckEditor modal placeholder | All | None | None |
| 3 | 2026-02-22 | Write hex grid tests (15 tests) | N/A | N/A | None |
| 4 | 2026-02-22 | Extract hexGrid.js (~130 lines) | All | clampPan/getOffScreenPOIs now pure functions | By design |
| 5 | 2026-02-22 | Extract useHangarMapState hook (~120 lines) | All | None | mapContainerRef created in parent to break circular dep |
| 6 | 2026-02-22 | Extract useHangarData hook (~200 lines) | All | None | mapContainerRef passed from parent |
| 7 | 2026-02-22 | Extract deckSlotFactory.js (~100 lines, 8 tests) | All | None | shipSlotId tests updated to read from new file |
| 8 | 2026-02-22 | Extract HangarHeader component (~85 lines) | All | None | None |
| 9 | 2026-02-22 | Extract HangarHexMap component (~362 lines) | All | None | Added setZoom to hook return |
| 10 | 2026-02-22 | Extract HangarSidebar component (~290 lines) | All | None | hangarImages moved to sidebar |
| 11 | 2026-02-22 | Extract HangarModals component (~310 lines) | All | None | 5 simple tutorials consolidated to data-driven |
