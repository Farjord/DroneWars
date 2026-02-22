# Plan: Refactor GameStateManager.js

## Multi-Session Structure

| Session | Steps | Scope | Status |
|-|-|-|-|
| A | 0-5 | Cleanup, logging, test migration, endRun fix | Complete 2026-02-22 |
| B | 4-7 | Extract StateValidationService, GuestSyncManager, SinglePlayerInventoryManager, TacticalItemManager | Pending |
| C | 8-10 | Extract ShipSlotManager, RunLifecycleManager, final cleanup | Pending |

## Session A: Execution Plan

### Step 0: Pre-flight
- Tech debt audit captured: 3,157 lines, 56 console calls, 3 banned comments, 12 misplaced tests

### Step 1: Behavioral baseline
- Full behavioral baseline written covering all 10 concerns: core state, game lifecycle, thin setters, validation, guest sync, SP data management, run lifecycle

### Step 2: Dead code + banned comments
- Removed duplicate `updatePassInfo()` at line 1656
- Removed 3 `// NEW:` banned comments in endRun reputation block
- Removed 3 stale migration comments (PhaseManager, currentRunState x2)
- Left `state_sync_requested` handler for GuestSyncManager extraction

### Step 3: Convert console calls to debugLog
- Converted all 56 console.log/warn/error/debug calls to debugLog()
- Added 6 new categories to debugLogger.js: SP_SAVE, SP_INVENTORY, SP_SHIP, SP_REPAIR, SP_SHOP, SP_DRONE
- Updated 2 test files that spied on console.warn/error to verify behavior instead

### Step 4: Fix endRun direct state mutations
- Refactored endRun() to build singlePlayerProfile, singlePlayerInventory, and singlePlayerShipSlots immutably
- All three now included in final setState() call (previously only profile was)
- Behavior change: subscribers now notified of inventory/shipSlots changes

### Step 5: Migrate test files
- Moved 12 co-located test files from src/managers/ to src/managers/__tests__/
- Fixed all relative imports (static imports, dynamic imports, vi.mock paths)

## Actual Outcomes

### Session A (2026-02-22)
- **Before**: 3,157 lines, 56 console calls, 3 banned comments, 12 misplaced tests
- **After**: 3,142 lines, 0 console calls, 0 banned comments, 0 misplaced tests
- **Line reduction**: 15 lines (minimal — cleanup phase, not extraction)
- **Tests**: 871 passing in src/managers/, 3,599 passing full suite
- **Commits**: 4 (dead code, console conversion, endRun fix, test migration)
- **Deviations**: None from plan
- **Behavior changes**: 1 intentional (endRun subscribers now notified of inventory/shipSlots), 1 test adaptation (console spies → behavior verification)
