# Refactor: GameStateManager.js

## Current State

- **Line count**: 3,156 lines (4x over the 800-line "strong smell" threshold)
- **Test coverage**: 12 co-located test files (NOT in `__tests__/` subfolder per CODE_STANDARDS)
- **Singleton**: Exported as default singleton with HMR preservation

### Responsibility Map

| Lines | Concern |
|-|-|
| 1-142 | Constructor, state shape, initialization |
| 144-208 | Manager references, P2P integration setup |
| 210-329 | Guest validation & host state application |
| 331-356 | Event system (subscribe/emit) |
| 358-449 | State access & setState with logging |
| 451-1036 | Validation subsystem (7 methods, ~585 lines) |
| 1038-1107 | Pre-game/pre-run validation |
| 1109-1355 | Game lifecycle (reset, startGame, endGame, testMode) |
| 1357-1512 | Thin setters & player identity helpers |
| 1513-1587 | Placed sections helpers, optimistic animation delegation |
| 1589-1716 | Logging, AI decision history, action processing delegation |
| 1717-1878 | Single-player profile/save/inventory/component management |
| 1880-2013 | Tactical items (purchase, use, count) |
| 2015-2249 | Deck/ship slot management (save, delete, unlock, clear) |
| 2250-2574 | Drone/section repair, drone/component instance CRUD |
| 2576-2805 | startRun (~230 lines, builds run state, generates map sections) |
| 2807-2895 | resetGameState |
| 2897-3133 | endRun (~235 lines, summary, loot transfer, damage persistence, reputation) |
| 3136-3156 | Singleton export & HMR preservation |

### Existing Test Files (co-located, need migration to `__tests__/`)

- `GameStateManager.cardPack.test.js`
- `GameStateManager.consecutiveCombat.test.js`
- `GameStateManager.credits.test.js`
- `GameStateManager.droneDamage.test.js`
- `GameStateManager.endRunBroadcast.test.js`
- `GameStateManager.initialization.test.js`
- `GameStateManager.poiOutcome.test.js`
- `GameStateManager.resetGameState.test.js`
- `GameStateManager.save.test.js`
- `GameStateManager.shipDamage.test.js`
- `GameStateManager.startRun.test.js`
- `GameStateManager.tacticalItems.test.js`

## Problems

### CODE_STANDARDS.md Violations

1. **God object**: One file handles 10+ distinct concerns (state validation, guest sync, single-player profile, inventory, deck management, run lifecycle, repair operations, tactical items, AI logging, event system).
2. **Size**: 3,156 lines, nearly 4x the 800-line threshold.
3. **File type impurity**: Contains business logic (run state building, loot transfer, reputation calculation delegation, damage persistence) that belongs in `src/logic/`.
4. **Test location**: All 12 test files are co-located in `src/managers/` instead of `src/managers/__tests__/`.
5. **Managers standard**: "One manager/processor class per file" -- the file also embeds validation, inventory management, repair operations, and run lifecycle logic that are separate concerns.

### Dead Code

1. **Duplicate `updatePassInfo` method** (lines 1456 and 1654) -- identical implementation defined twice. The second shadows the first in practice but both are reachable depending on call site expectations.

### Missing/Inconsistent Logging

1. **56 raw `console.log/warn/error/debug` calls** throughout the file. All should use `debugLog()` with appropriate categories.
2. Logging is inconsistent: core state methods use `debugLog()`, but single-player methods use raw `console.log`.

### Banned Comments

1. Lines 3090, 3096, 3097: `// NEW:` comments violate the "no `// NEW`, `// CHANGED`" rule.

### Code Smells

1. **Direct state mutation in `endRun`**: Lines 2990-3018, 3052, 3063, 3067 directly mutate `this.state.singlePlayerProfile` and `this.state.singlePlayerInventory` instead of using `setState()`. This bypasses the event system and validation.
2. **startRun is 230 lines**: Builds run state, calculates hull from components, generates map -- multiple concerns in one method.
3. **endRun is 235 lines**: Generates summary, transfers loot, persists damage, awards reputation, refreshes shop -- multiple concerns.
4. **Stack trace parsing in production**: `setState()` creates `new Error().stack` on every single state update for validation. This is expensive and fragile.
5. **Validation subsystem is 585 lines**: The 7 validation methods (lines 451-1036) are a self-contained concern that could be a separate validator.

## Extraction Plan

### Extraction 1: SinglePlayerInventoryManager

**What**: All single-player inventory, card discovery, and save/load methods.

**Methods to extract**:
- `createNewSinglePlayerProfile()` (line 1725)
- `loadSinglePlayerSave()` (line 1735)
- `getSaveData()` (line 1777)
- `updateCardDiscoveryState()` (line 1795)
- `addDiscoveredCard()` (line 1819)
- `addToInventory()` (line 1828)
- `addShipComponentInstance()` (line 1846)
- `updateShipComponentHull()` (line 1858)
- `getShipComponentInstance()` (line 1876)

**Where**: `src/managers/SinglePlayerInventoryManager.js`

**Why**: These are a cohesive group managing single-player persistent data, distinct from combat state management. Violates single responsibility and file type purity (business logic in a state manager).

**Dependencies affected**: Components calling `gameStateManager.addToInventory()` etc. would import `singlePlayerInventoryManager` instead. ~10 files affected.

### Extraction 2: ShipSlotManager

**What**: All deck/ship slot CRUD, repair operations, drone instance management.

**Methods to extract**:
- `setDefaultShipSlot()` (line 2023)
- `isSlotUnlocked()` (line 2047)
- `getNextUnlockableSlot()` (line 2056)
- `unlockNextDeckSlot()` (line 2071)
- `saveShipSlotDeck()` (line 2109)
- `deleteShipSlotDeck()` (line 2165)
- `clearSlotInstances()` (line 2237)
- `updateShipSlotDroneOrder()` (line 2257)
- `repairDroneSlot()` (line 2282)
- `repairSectionSlot()` (line 2340)
- `repairSectionSlotPartial()` (line 2398)
- `createDroneInstance()` (line 2468)
- `updateDroneInstance()` (line 2494)
- `findDroneInstance()` (line 2513)
- `getDroneDamageStateForSlot()` (line 2526)
- `createComponentInstance()` (line 2549)

**Where**: `src/managers/ShipSlotManager.js`

**Why**: Ship slot/deck management is a self-contained domain (~530 lines). Includes repair operations, instance tracking, and slot CRUD. Cohesive group with no dependency on PvP game state.

**Dependencies affected**: `HangarScreen.jsx`, `ExtractionDeckBuilder.jsx`, `RepairBayScreen.jsx`, `CombatOutcomeProcessor.js`, `DroneDamageProcessor.js`, and their tests.

### Extraction 3: TacticalItemManager

**What**: Tactical item purchase/use/count and card pack purchase.

**Methods to extract**:
- `purchaseTacticalItem()` (line 1889)
- `useTacticalItem()` (line 1981)
- `getTacticalItemCount()` (line 2011)
- `purchaseCardPack()` (line 1930)

**Where**: `src/managers/TacticalItemManager.js`

**Why**: Self-contained shop/item concern (~130 lines). Independent of game state management.

**Dependencies affected**: `TacticalMapScreen.jsx`, `ShopModal.jsx`, and their tests.

### Extraction 4: StateValidationService

**What**: All validation methods that guard state updates.

**Methods to extract**:
- `validateStateUpdate()` (line 458)
- `validatePlayerStates()` (line 511)
- `validateTurnPhaseTransition()` (line 547)
- `validateActionProcessorUsage()` (line 585)
- `validateFunctionAppropriateForStateUpdate()` (line 832)
- `extractCallerInfo()` (line 942)
- `validateOwnershipBoundaries()` (line 975)
- `logPlayerStateChanges()` (line 727)
- `isInitializationPhase()` (line 815)

**Where**: `src/services/StateValidationService.js`

**Why**: 585 lines of validation/debugging infrastructure that is orthogonal to state management. Pure analysis with no state mutation. Can be injected or called from `setState()`.

**Dependencies affected**: Only `GameStateManager.setState()` calls these -- minimal external impact.

### Extraction 5: RunLifecycleManager

**What**: `startRun()` and `endRun()` with their helper logic.

**Methods to extract**:
- `startRun()` (line 2584) -- 230 lines
- `endRun()` (line 2901) -- 235 lines

**Where**: `src/managers/RunLifecycleManager.js`

**Why**: Run lifecycle is the largest single concern (~465 lines). Contains significant business logic (hull calculation, loot transfer, damage persistence, reputation). These are orchestration methods that should coordinate the extracted managers.

**Dependencies affected**: `HangarScreen.jsx`, `ExtractionController.js`, `CombatOutcomeProcessor.js`, and multiple test files.

### Extraction 6: GuestSyncManager

**What**: Guest/P2P state synchronization methods.

**Methods to extract**:
- `setupP2PIntegration()` (line 160)
- `startValidation()` (line 216)
- `shouldValidateBroadcast()` (line 235)
- `isMilestonePhase()` (line 245)
- `applyHostState()` (line 255)
- `trackOptimisticAnimations()` (line 1558)
- `filterAnimations()` (line 1569)
- `hasRecentOptimisticActions()` (line 1577)
- `clearOptimisticActions()` (line 1585)
- `MILESTONE_PHASES` constant (line 126)
- `validatingState` (line 130)

**Where**: `src/managers/GuestSyncManager.js`

**Why**: Guest synchronization is completely independent of local game state management. Includes its own state (`validatingState`), constants, and service delegation.

**Dependencies affected**: `GuestMessageQueueService.js`, `AppRouter.jsx` (P2P setup).

## Dead Code Removal

| Item | Location | Reason |
|-|-|-|
| Duplicate `updatePassInfo()` | Lines 1654-1657 | Exact duplicate of lines 1456-1458. Second definition is dead because JS classes use last definition. |
| `state_sync_requested` handler | Lines 195-203 | Comment says "deprecated, kept for compatibility" |

## Logging Improvements

### Raw console calls to convert to debugLog

All 56 `console.log/warn/error/debug` calls should be converted to `debugLog()`. Suggested categories:

| Category | Methods |
|-|-|
| `SP_SAVE` | `loadSinglePlayerSave`, `createNewSinglePlayerProfile`, `getSaveData` |
| `SP_INVENTORY` | `addToInventory`, `updateCardDiscoveryState`, `addDiscoveredCard` |
| `SP_SHIP` | `saveShipSlotDeck`, `deleteShipSlotDeck`, `setDefaultShipSlot`, `unlockNextDeckSlot`, ship component methods |
| `SP_REPAIR` | `repairDroneSlot`, `repairSectionSlot`, `repairSectionSlotPartial` |
| `SP_SHOP` | `purchaseTacticalItem`, `useTacticalItem`, `purchaseCardPack` |
| `SP_DRONE` | `createDroneInstance`, `updateDroneInstance`, `findDroneInstance` |
| `EXTRACTION` | `startRun`, `endRun` (partially already uses this) |
| `VALIDATION` | All validation methods (some already use `console.warn` for violations -- these should remain as warnings but use `debugLog('VALIDATION', ...)`) |

### Noisy logs to reduce

- `logPlayerStateChanges()` (lines 727-810): Creates `new Error().stack` for every drone pool change. Consider gating behind a verbose flag.
- `setState()` stack trace parsing (lines 394-410): Creates `new Error()` on every state update. Should be dev-only or behind a flag.

## Comment Cleanup

### Banned comments to remove

- Line 3090: `// NEW: Pass combat reputation`
- Line 3096: `// NEW: Breakdown`
- Line 3097: `// NEW: Breakdown`

### Stale comments to remove

- Line 31: `// PhaseManager dependency removed - using direct phase checks` -- historical note, no longer informative
- Line 94: `// NOTE: currentRunState has been moved to TacticalMapStateManager` -- migration note
- Line 2852: `// NOTE: currentRunState now managed by TacticalMapStateManager` -- duplicate migration note

### Useful comments to keep

- Section separators (`// ========================================`) -- aid navigation in large file
- JSDoc blocks on public methods -- useful API documentation
- Architecture comments in `setState` validation (explain WHY validation exists)

## Testing Requirements

### Before Extraction

1. **Characterization tests for `startRun`**: Test hull calculation from sectionSlots, legacy fallback, default sections, security token deduction, map generation. File: `src/managers/__tests__/GameStateManager.startRun.test.js` (migrate existing).
2. **Characterization tests for `endRun`**: Test loot transfer, damage persistence, MIA protocol, reputation award, shop pack refresh, run summary shape. File: `src/managers/__tests__/GameStateManager.endRun.test.js` (adapt existing `endRunBroadcast` and `credits` tests).
3. **Inventory method tests**: Test `addToInventory`, `updateCardDiscoveryState` state changes. File: `src/managers/__tests__/SinglePlayerInventoryManager.test.js`.
4. **Ship slot CRUD tests**: Test save/delete/unlock/repair flows. File: `src/managers/__tests__/ShipSlotManager.test.js`.

### After Extraction

1. Move all 12 existing co-located test files into `src/managers/__tests__/`.
2. Update imports in each test file to reference new managers.
3. Verify `GameStateManager` tests still pass (methods now delegate to extracted managers).
4. Add integration tests verifying delegation wiring (GameStateManager calls through to extracted manager).

### Test file locations

| Test file | Location |
|-|-|
| GameStateManager.test.js | `src/managers/__tests__/GameStateManager.test.js` |
| SinglePlayerInventoryManager.test.js | `src/managers/__tests__/SinglePlayerInventoryManager.test.js` |
| ShipSlotManager.test.js | `src/managers/__tests__/ShipSlotManager.test.js` |
| TacticalItemManager.test.js | `src/managers/__tests__/TacticalItemManager.test.js` |
| StateValidationService.test.js | `src/services/__tests__/StateValidationService.test.js` |
| RunLifecycleManager.test.js | `src/managers/__tests__/RunLifecycleManager.test.js` |
| GuestSyncManager.test.js | `src/managers/__tests__/GuestSyncManager.test.js` |

## Execution Order

Each step is independently committable with tests green.

1. **Remove duplicate `updatePassInfo`** (line 1654-1657). Remove banned `// NEW` comments (lines 3090, 3096, 3097). Remove stale migration comments.
2. **Convert all 56 raw console calls to `debugLog()`** with appropriate categories. Fix direct state mutations in `endRun` to use `setState()`.
3. **Move existing 12 test files** from `src/managers/` to `src/managers/__tests__/`. Update any relative imports.
4. **Extract `StateValidationService`** (585 lines). GameStateManager.setState calls `stateValidationService.validate()`. Write tests.
5. **Extract `GuestSyncManager`** (~170 lines). GameStateManager delegates P2P/guest methods. Write tests.
6. **Extract `SinglePlayerInventoryManager`** (~160 lines). Owns profile, inventory, discovery, save/load. Write tests.
7. **Extract `TacticalItemManager`** (~130 lines). Owns tactical item and card pack purchase. Write tests.
8. **Extract `ShipSlotManager`** (~530 lines). Owns slot CRUD, repair, drone/component instances. Write tests.
9. **Extract `RunLifecycleManager`** (~465 lines). Orchestrates startRun/endRun using other managers. Write tests.
10. **Final cleanup**: Verify GameStateManager is under 400 lines (core state, event system, game lifecycle, thin delegation). Update all import sites across 73 dependent files.

## Risk Assessment

### What Could Break

| Risk | Severity | Mitigation |
|-|-|-|
| Singleton wiring: extracted managers need access to `gameStateManager.state` and `setState` | High | Pass `gameStateManager` as constructor arg or use shared state reference |
| Direct state mutation in `endRun` (lines 2990-3018) currently works but bypasses events | Medium | Fix mutations to use `setState()` before extraction; verify no UI depends on missing events |
| 73 files import `gameStateManager` -- mass import changes | Medium | Keep facade methods on GameStateManager during transition; deprecate over time |
| Test files reference `gameStateManager` methods directly | Medium | Maintain backward-compatible delegation on GameStateManager until all tests updated |
| HMR singleton preservation | Low | Extracted managers also need HMR preservation if they hold state |
| Stack-trace-based validation breaks after extraction (different file names) | Low | Already handled by `_updateContext` flag; stack-based fallback is secondary |

### How to Validate

1. Run full test suite after each extraction step
2. Manual smoke test: start PvP game, start extraction run, complete combat, extract, verify save/load
3. Verify `console.log` count is 0 in GameStateManager after step 2
4. Verify GameStateManager line count is under 400 after step 10
5. Run existing 12 test files from new `__tests__/` location after step 3
