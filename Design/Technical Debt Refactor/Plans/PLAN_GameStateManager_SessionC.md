# GameStateManager Session C — ShipSlotManager + RunLifecycleManager

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the final two concerns from GameStateManager — ship slot/deck/repair/instance management (~552 lines) and run lifecycle (~452 lines) — completing the GSM refactoring.

**Architecture:** Same constructor-injection pattern as Sessions A+B. Extracted managers receive the GSM singleton, access state via `this.gsm.state` and `this.gsm.setState()`. Thin facade methods remain on GSM for backward compatibility (facade removal is tracked in FUTURE_IMPROVEMENTS.md #9).

**Tech Stack:** Vanilla JS classes, Vitest for tests

---

## Pre-Conditions

- Sessions A+B are committed on master
- GSM is at 2,074 lines with 4 managers already extracted
- All 3,622 tests passing across 212 test files

## What Stays in GSM

After both extractions, GSM retains:
- Constructor + state shape (lines 1-129)
- Manager refs + guest sync facades (lines 131-158)
- Event system: subscribe/emit (lines 160-190)
- getState/get/setState (lines 192-280)
- Pre-game/pre-run validation (lines 282-330)
- Game lifecycle: reset, startGame, endGame, initializeTestMode, clearSinglePlayerContext, transitionToAppState (lines 332-660)
- Thin setters (lines 662-810)
- Logging: addLogEntry, addAIDecisionToHistory (lines 812-854)
- setWinner (lines 856-874)
- Action processing delegation (lines 876-912)
- SP Inventory facades (lines 914-926)
- Tactical Item facades (lines 928-935)
- NEW: ShipSlot facades (~18 lines)
- NEW: RunLifecycle facades (~4 lines)
- resetGameState (lines 1734-1816) — stays, it's game orchestration
- Singleton + HMR (lines 2055-2075)

Estimated post-extraction GSM: ~960 lines (including ~60 lines of new facades).

---

## Task 1: Extract ShipSlotManager

**Files:**
- Create: `src/managers/ShipSlotManager.js`
- Create: `src/managers/__tests__/ShipSlotManager.test.js`
- Modify: `src/managers/GameStateManager.js` (remove methods, add facades + constructor wiring)

### Step 1: Create ShipSlotManager.js

Create `src/managers/ShipSlotManager.js` with all 16 methods cut from GSM lines 945-1496.

**Constructor pattern** (same as SinglePlayerInventoryManager):
```js
import { ECONOMY } from '../data/economyData.js';
import { shipComponentCollection } from '../data/shipSectionData.js';
import { starterPoolCards, starterPoolDroneNames } from '../data/saveGameSchema.js';
import { convertComponentsToSectionSlots } from '../logic/migration/saveGameMigrations.js';
import { debugLog } from '../utils/debugLogger.js';

class ShipSlotManager {
  constructor(gameStateManager) {
    this.gsm = gameStateManager;
  }

  // All 16 methods moved here, replacing:
  //   this.state         → this.gsm.state
  //   this.setState(...)  → this.gsm.setState(...)
  // No other changes to method bodies.
}
```

**Methods to move (exact order from GSM):**

1. `setDefaultShipSlot(slotId)` — lines 945-962
2. `isSlotUnlocked(slotId)` — lines 969-972
3. `getNextUnlockableSlot()` — lines 978-986
4. `unlockNextDeckSlot()` — lines 993-1040
5. `saveShipSlotDeck(slotId, deckData)` — lines 1046-1134
6. `deleteShipSlotDeck(slotId)` — lines 1140-1210
7. `clearSlotInstances(slotId)` — lines 1216-1244
8. `updateShipSlotDroneOrder(slotId, newDroneSlots)` — lines 1250-1270
9. `repairDroneSlot(slotId, position)` — lines 1276-1328
10. `repairSectionSlot(slotId, lane)` — lines 1334-1381
11. `repairSectionSlotPartial(slotId, lane, hpToRepair)` — lines 1387-1440
12. `createDroneInstance(droneName, slotId)` — lines 1446-1466
13. `updateDroneInstance(instanceId, isDamaged)` — lines 1389-1418 (approximate)
14. `findDroneInstance(slotId, droneName)` — approximate
15. `getDroneDamageStateForSlot(slotId)` — approximate
16. `createComponentInstance(componentId, slotId)` — lines 1471-1496

**Singleton + export:**
```js
// No standalone singleton — instantiated by GameStateManager
export default ShipSlotManager;
```

### Step 2: Wire ShipSlotManager in GSM constructor

In `GameStateManager.constructor()`, after the TacticalItemManager line:
```js
// Ship slot manager (extracted — deck CRUD, repair, drone/component instances)
this.shipSlotManager = new ShipSlotManager(this);
```

Add import at top of GSM:
```js
import ShipSlotManager from './ShipSlotManager.js';
```

### Step 3: Replace methods with facades in GSM

Remove lines 937-1496 (the `// DECK MANAGEMENT METHODS` section + all 16 methods). Replace with:

```js
// --- SHIP SLOT FACADES ---
// External callers (HangarScreen, RepairBayScreen, ExtractionDeckBuilder, DroneDamageProcessor) use these.
// Delegation to shipSlotManager.

setDefaultShipSlot(slotId) { this.shipSlotManager.setDefaultShipSlot(slotId); }
isSlotUnlocked(slotId) { return this.shipSlotManager.isSlotUnlocked(slotId); }
getNextUnlockableSlot() { return this.shipSlotManager.getNextUnlockableSlot(); }
unlockNextDeckSlot() { return this.shipSlotManager.unlockNextDeckSlot(); }
saveShipSlotDeck(slotId, deckData) { this.shipSlotManager.saveShipSlotDeck(slotId, deckData); }
deleteShipSlotDeck(slotId) { this.shipSlotManager.deleteShipSlotDeck(slotId); }
clearSlotInstances(slotId) { this.shipSlotManager.clearSlotInstances(slotId); }
updateShipSlotDroneOrder(slotId, newDroneSlots) { this.shipSlotManager.updateShipSlotDroneOrder(slotId, newDroneSlots); }
repairDroneSlot(slotId, position) { return this.shipSlotManager.repairDroneSlot(slotId, position); }
repairSectionSlot(slotId, lane) { return this.shipSlotManager.repairSectionSlot(slotId, lane); }
repairSectionSlotPartial(slotId, lane, hpToRepair) { return this.shipSlotManager.repairSectionSlotPartial(slotId, lane, hpToRepair); }
createDroneInstance(droneName, slotId) { return this.shipSlotManager.createDroneInstance(droneName, slotId); }
updateDroneInstance(instanceId, isDamaged) { this.shipSlotManager.updateDroneInstance(instanceId, isDamaged); }
findDroneInstance(slotId, droneName) { return this.shipSlotManager.findDroneInstance(slotId, droneName); }
getDroneDamageStateForSlot(slotId) { return this.shipSlotManager.getDroneDamageStateForSlot(slotId); }
createComponentInstance(componentId, slotId) { return this.shipSlotManager.createComponentInstance(componentId, slotId); }
```

### Step 4: Remove now-unused imports from GSM

After extraction, these imports are only used by ShipSlotManager methods and can be removed from GSM:
- `convertComponentsToSectionSlots` (from `../logic/migration/saveGameMigrations.js`)

Note: `ECONOMY`, `shipComponentCollection`, `starterPoolCards`, `starterPoolDroneNames` may still be used by startRun/endRun — verify before removing.

### Step 5: Write ShipSlotManager tests

Create `src/managers/__tests__/ShipSlotManager.test.js`. Test through the ShipSlotManager directly (not via GSM facades).

**Test structure:**
```js
import ShipSlotManager from '../ShipSlotManager.js';

// Create a minimal mock GSM for constructor injection
function createMockGSM(stateOverrides = {}) {
  const state = {
    singlePlayerProfile: { highestUnlockedSlot: 1, credits: 1000, defaultShipSlotId: 0 },
    singlePlayerShipSlots: [
      { id: 0, status: 'active', deckCards: [], droneSlots: [], sectionSlots: {} },
      { id: 1, status: 'active', deckCards: [], droneSlots: [], sectionSlots: {} },
      { id: 2, status: 'locked', deckCards: [], droneSlots: [], sectionSlots: {} },
    ],
    singlePlayerDroneInstances: [],
    singlePlayerShipComponentInstances: [],
    ...stateOverrides,
  };
  return {
    state,
    setState: vi.fn((updates) => Object.assign(state, updates)),
  };
}
```

**Tests to write (collapsed, not per-method):**

1. **Slot unlocking**: `unlockNextDeckSlot` deducts credits, increments `highestUnlockedSlot`, returns `{ success, slotId }`. Fails when insufficient credits. Fails when all unlocked.
2. **Slot CRUD**: `saveShipSlotDeck` saves deck data + converts legacy components. `deleteShipSlotDeck` returns cards to inventory, resets default if needed. Neither modifies slot 0.
3. **Repair**: `repairDroneSlot` deducts credits and clears damage flag. `repairSectionSlot` full repair. `repairSectionSlotPartial` partial repair caps at actual damage. All refuse slot 0.
4. **Instance management**: `createDroneInstance` generates unique ID, skips starter pool. `getDroneDamageStateForSlot` returns `{}` for slot 0.
5. **Edge cases**: `setDefaultShipSlot` throws on invalid/inactive slot. `isSlotUnlocked` respects `highestUnlockedSlot`.

### Step 6: Run tests

Run: `npx vitest run`
Expected: All existing tests pass (facades delegate correctly) + new ShipSlotManager tests pass.

### Step 7: Commit

```
Refactor: GameStateManager — extract ShipSlotManager (~552 lines, 16 methods)
```

---

## Task 2: Extract RunLifecycleManager

**Files:**
- Create: `src/managers/RunLifecycleManager.js`
- Create: `src/managers/__tests__/RunLifecycleManager.test.js`
- Modify: `src/managers/GameStateManager.js` (remove startRun/endRun, add facades)

### Step 1: Create RunLifecycleManager.js

Create `src/managers/RunLifecycleManager.js` with `startRun` and `endRun` cut from GSM.

**Imports** (these move FROM GSM to RunLifecycleManager):
```js
import { shipComponentCollection } from '../data/shipSectionData.js';
import { getAllShips, getDefaultShip } from '../data/shipData.js';
import { calculateSectionBaseStats } from '../logic/statsCalculator.js';
import fullCardCollection from '../data/cardData.js';
import ReputationService from '../logic/reputation/ReputationService.js';
import { calculateExtractedCredits } from '../logic/singlePlayer/ExtractionController.js';
import { generateRandomShopPack } from '../data/cardPackData.js';
import { generateMapData } from '../utils/mapGenerator.js';
import tacticalMapStateManager from './TacticalMapStateManager.js';
import transitionManager from './TransitionManager.js';
import { debugLog } from '../utils/debugLogger.js';
```

**Constructor pattern:**
```js
class RunLifecycleManager {
  constructor(gameStateManager) {
    this.gsm = gameStateManager;
  }

  startRun(shipSlotId, mapTier, entryGateId = 0, preGeneratedMap = null, quickDeploy = null) {
    // Body from GSM lines 1506-1727
    // Replace this.state → this.gsm.state
    // Replace this.setState(...) → this.gsm.setState(...)
  }

  endRun(success = true) {
    // Body from GSM lines 1822-2052
    // Replace this.state → this.gsm.state
    // Replace this.setState(...) → this.gsm.setState(...)
  }
}

export default RunLifecycleManager;
```

**Key translation notes:**
- `this.state.singlePlayerShipSlots` → `this.gsm.state.singlePlayerShipSlots`
- `this.state.singlePlayerProfile` → `this.gsm.state.singlePlayerProfile`
- `this.state.singlePlayerInventory` → `this.gsm.state.singlePlayerInventory`
- `this.setState({...})` → `this.gsm.setState({...})`
- `this.state.appState` → `this.gsm.state.appState`

### Step 2: Wire RunLifecycleManager in GSM constructor

In `GameStateManager.constructor()`, after the ShipSlotManager line:
```js
// Run lifecycle manager (extracted — startRun/endRun orchestration)
this.runLifecycleManager = new RunLifecycleManager(this);
```

Add import at top of GSM:
```js
import RunLifecycleManager from './RunLifecycleManager.js';
```

### Step 3: Replace methods with facades in GSM

Remove `startRun` (lines 1498-1727) and `endRun` (lines 1818-2052) from GSM. Replace with:

```js
// --- RUN LIFECYCLE FACADES ---
// External callers (HangarScreen, CombatOutcomeProcessor, ExtractionController, DetectionManager) use these.
// Delegation to runLifecycleManager.

startRun(shipSlotId, mapTier, entryGateId = 0, preGeneratedMap = null, quickDeploy = null) {
  this.runLifecycleManager.startRun(shipSlotId, mapTier, entryGateId, preGeneratedMap, quickDeploy);
}
endRun(success = true) {
  this.runLifecycleManager.endRun(success);
}
```

### Step 4: Remove now-unused imports from GSM

After both extractions, verify and remove these imports from GSM if no longer referenced:
- `shipComponentCollection` (from `../data/shipSectionData.js`) — check if still used
- `getAllShips`, `getDefaultShip` (from `../data/shipData.js`) — only used by startRun
- `calculateSectionBaseStats` (from `../logic/statsCalculator.js`) — only used by startRun
- `fullCardCollection` (from `../data/cardData.js`) — check if still used
- `ReputationService` (from `../logic/reputation/ReputationService.js`) — only used by endRun
- `calculateExtractedCredits` (from `../logic/singlePlayer/ExtractionController.js`) — only used by endRun
- `generateRandomShopPack` (from `../data/cardPackData.js`) — only used by endRun
- `generateMapData` (from `../utils/mapGenerator.js`) — only used by startRun
- `transitionManager` (from `./TransitionManager.js`) — only used by startRun
- `CombatOutcomeProcessor` (from `../logic/singlePlayer/CombatOutcomeProcessor.js`) — check if still used
- `convertComponentsToSectionSlots` — already removed in Task 1 if unused

Keep: `gameEngine`, `startingDecklist`, `ActionProcessor`, `GameDataService`, `fullDroneCollection`, `initializeDroneSelection`, `debugLog`, `starterPoolCards`, `starterPoolDroneNames`, `ECONOMY`, `aiPhaseProcessor`, `tacticalMapStateManager`, `StateValidationService`, `GuestSyncManager`, `SinglePlayerInventoryManager`, `TacticalItemManager`, `ShipSlotManager`, `RunLifecycleManager`.

### Step 5: Write RunLifecycleManager tests

Create `src/managers/__tests__/RunLifecycleManager.test.js`.

**Mock setup:**
```js
import RunLifecycleManager from '../RunLifecycleManager.js';

// Mock external dependencies
vi.mock('../../utils/mapGenerator.js', () => ({
  generateMapData: vi.fn(() => ({
    hexes: [{ q: 0, r: 0 }],
    gates: [{ q: 0, r: 0 }],
    name: 'Test Sector',
    poiCount: 2,
    gateCount: 1,
    baseDetection: 0,
  })),
}));
vi.mock('./TacticalMapStateManager.js', () => ({ default: { startRun: vi.fn(), endRun: vi.fn(), isRunActive: vi.fn(() => true), getState: vi.fn() } }));
vi.mock('./TransitionManager.js', () => ({ default: { forceReset: vi.fn() } }));
vi.mock('../../logic/reputation/ReputationService.js', () => ({ default: { awardReputation: vi.fn(() => ({ repGained: 10, newRep: 10, newLevel: 1 })) } }));
```

**Tests to write:**

1. **startRun happy path**: Validates ship slot, builds runShipSections from sectionSlots, calls `tacticalMapStateManager.startRun`, sets appState='tacticalMap', calls `transitionManager.forceReset`.
2. **startRun token deduction**: When `mapData.requiresToken`, deducts security token. Returns early if insufficient.
3. **startRun fallback sections**: When no sectionSlots or shipComponents, uses default ship card values.
4. **endRun success**: Transfers loot to inventory, adds credits, updates stats, persists hull damage, refreshes shop pack, awards reputation, calls `tacticalMapStateManager.endRun`.
5. **endRun failure (MIA)**: Marks slot as MIA (except slot 0), increments runsLost, no loot transfer.
6. **endRun with no active run**: Returns early, no state changes.

### Step 6: Run tests

Run: `npx vitest run`
Expected: All existing tests pass + new RunLifecycleManager tests pass.

### Step 7: Commit

```
Refactor: GameStateManager — extract RunLifecycleManager (~452 lines, startRun + endRun)
```

---

## Task 3: Final Cleanup + Documentation

### Step 1: Verify GSM line count and import cleanup

- Count GSM lines — target: ~960 (acknowledged as above 400 in FUTURE_IMPROVEMENTS #6)
- Verify no unused imports remain
- Verify no dead code

### Step 2: Code review

Use `superpowers:requesting-code-review` to trigger `superpowers:code-reviewer` for:
- `src/managers/ShipSlotManager.js`
- `src/managers/RunLifecycleManager.js`
- `src/managers/GameStateManager.js` (post-extraction state)

### Step 3: Update REFACTOR_GAME_STATE_MANAGER.md

Add to the **## NOW** section:

**### Final State (Session C — ShipSlotManager + RunLifecycleManager)**
- GSM line count (post-extraction)
- New files: ShipSlotManager.js (line count), RunLifecycleManager.js (line count)
- New test files + test counts
- Total extraction summary: 6 managers extracted, GSM reduction from 3,156 → final count

Add to Change Log table:
- Step 11: Extracted ShipSlotManager
- Step 12: Extracted RunLifecycleManager
- Step 13: Final cleanup, code review, documentation

### Step 4: Update REFACTOR_PLAN.md

Change status from `[~]` to `[x]` with completion date and final notes.

### Step 5: Update FUTURE_IMPROVEMENTS.md

- Update item #6 with actual final line count
- Update item #9 with additional facade count (now includes ShipSlot + RunLifecycle facades)
- Check if item #8 (repairSectionSlotPartial cost discrepancy) was addressed during extraction

### Step 6: Run final test suite

Run: `npx vitest run`
Expected: All tests green. Zero failures.

### Step 7: Final commit

```
Refactor: GameStateManager — Session C complete, documentation updated
```

---

## Risk Notes

| Risk | Mitigation |
|-|-|
| startRun/endRun reference `this.state` ~30 times each | Mechanical find-replace `this.state` → `this.gsm.state`, `this.setState` → `this.gsm.setState` — no logic changes |
| Existing GSM tests call startRun/endRun via GSM | Facades preserve the call path — tests don't need changes |
| endRun accesses singlePlayerInventory/singlePlayerProfile directly | Already fixed in Session B to use immutable build + setState — no direct mutations remain |
| Import cleanup may miss a reference | Run `npx vitest run` after each removal — immediate feedback |

## Actual Outcomes

- **GSM line count**: 1,068 (plan estimated ~960 — difference is ~60 lines of facade methods + JSDoc comments retained on resetGameState and game lifecycle methods)
- **ShipSlotManager**: 577 lines, 23 tests
- **RunLifecycleManager**: 494 lines, 12 tests
- **Full suite**: 3,744 tests passing, 219 test files (up from 3,622/212)
- **Code review findings**: 1 critical (pre-existing repair cost discrepancy, preserved per behavior rules), 2 important (facade signatures simplified, silent token failure acknowledged as pre-existing), 2 suggestions (deprecated `substr` fixed)
- **14 unused imports removed** from GSM after extractions
- **All 3 commits** on master, no push
