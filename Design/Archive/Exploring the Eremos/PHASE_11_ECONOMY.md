# Phase 11: Economy Services

## Overview

Implements centralized economy data, credit management, repair services, and card replication.

**Duration:** 1 day | **Dependencies:** Phase 3, Phase 10

---

## Files Created

1. `src/data/economyData.js` - Centralized economy values
2. `src/logic/economy/CreditManager.js` - Credit transactions with logging
3. `src/logic/economy/RepairService.js` - Ship component and drone repair
4. `src/logic/economy/ReplicatorService.js` - Card replication

## Files Modified

1. `src/components/modals/RepairBayModal.jsx` - Uses RepairService
2. `src/components/modals/ReplicatorModal.jsx` - Uses ReplicatorService
3. `src/logic/singlePlayer/MIARecoveryService.js` - Uses CreditManager + economyData

---

## Key Implementations

### economyData.js

Centralized economy values for easy balancing:

```javascript
export const ECONOMY = {
  // Repair costs
  HULL_REPAIR_COST_PER_HP: 10,
  DRONE_REPAIR_COSTS: {
    Common: 50,
    Uncommon: 100,
    Rare: 200,
    Mythic: 500
  },

  // Replication costs
  REPLICATION_COSTS: {
    Common: 50,
    Uncommon: 150,
    Rare: 400,
    Mythic: 1000
  },

  // Blueprint crafting costs (drones, ship sections, ship cards)
  CRAFT_COSTS: {
    Common: 100,
    Uncommon: 250,
    Rare: 600,
    Mythic: 1500
  },

  // MIA recovery
  MIA_SALVAGE_COST: 500,

  // Starting values
  STARTING_CREDITS: 1000,
};

export default ECONOMY;
```

### CreditManager.js

```javascript
class CreditManager {
  canAfford(amount) {
    const profile = gameStateManager.getState().singlePlayerProfile;
    return profile && profile.credits >= amount;
  }

  getBalance() {
    const profile = gameStateManager.getState().singlePlayerProfile;
    return profile ? profile.credits : 0;
  }

  deduct(amount, reason) {
    // Validates amount and credits
    // Updates state via gameStateManager
    // Logs transaction with debugLog
    return { success: boolean, error?: string, newBalance?: number };
  }

  add(amount, reason) {
    // Validates amount
    // Updates state via gameStateManager
    // Logs transaction with debugLog
    return { success: boolean, error?: string, newBalance?: number };
  }
}

export default new CreditManager();
```

### RepairService.js

```javascript
class RepairService {
  // Hull repair (ship components)
  getHullRepairCost(instance)        // Returns cost based on damage
  getDamagedComponents()             // Returns all damaged components
  getTotalRepairCost()               // Sum of all repair costs
  repairComponent(instanceId)        // Repair single component
  repairAllComponents()              // Repair all damaged components

  // Drone repair
  getDroneRepairCost(droneName)      // Cost by rarity from droneData
  getDamagedDrones()                 // All damaged drones across slots
  repairDrone(shipSlotId, droneIndex)
  repairAllDronesInSlot(shipSlotId)
}

export default new RepairService();
```

### ReplicatorService.js

```javascript
class ReplicatorService {
  getReplicationCost(cardId)         // Cost by rarity from cardData
  getReplicationCostByRarity(rarity) // Direct rarity lookup
  getAllCosts()                      // Returns ECONOMY.REPLICATION_COSTS
  canReplicate(cardId)               // Checks ownership & not Slot 0 card
  getReplicatableCards()             // All cards eligible for replication
  replicate(cardId)                  // Create a copy of owned card
}

export default new ReplicatorService();
```

---

## Economy Values

All values centralized in `src/data/economyData.js`:

### Costs

| Service | Rarity/Type | Cost |
|---------|-------------|------|
| Hull Repair | Per HP | 10 |
| Drone Repair | Common | 50 |
| Drone Repair | Uncommon | 100 |
| Drone Repair | Rare | 200 |
| Drone Repair | Mythic | 500 |
| Card Replication | Common | 50 |
| Card Replication | Uncommon | 150 |
| Card Replication | Rare | 400 |
| Card Replication | Mythic | 1000 |
| MIA Salvage Fee | Flat | 500 |
| Blueprint Crafting | Common | 100 |
| Blueprint Crafting | Uncommon | 250 |
| Blueprint Crafting | Rare | 600 |
| Blueprint Crafting | Mythic | 1500 |

### Income

| Source | Amount | Notes |
|--------|--------|-------|
| Starting Credits | 1000 | New profile |
| Pack Loot | 10-100 | Random per pack |
| Combat Salvage | 0 | No direct credits from combat |

---

## Integration Examples

### RepairBayModal Usage

```javascript
import repairService from '../../logic/economy/RepairService.js';

// Get damaged components
const damaged = repairService.getDamagedComponents();
const totalCost = repairService.getTotalRepairCost();

// Repair single component
const result = repairService.repairComponent(instance.instanceId);
if (!result.success) {
  setFeedback({ type: 'error', message: result.error });
} else {
  setFeedback({ type: 'success', message: `Repaired for ${result.cost} credits` });
}

// Repair all
const result = repairService.repairAllComponents();
```

### ReplicatorModal Usage

```javascript
import replicatorService from '../../logic/economy/ReplicatorService.js';

// Get costs for display
const REPLICATE_COSTS = replicatorService.getAllCosts();

// Get replicatable cards
const cards = replicatorService.getReplicatableCards();

// Replicate a card
const result = replicatorService.replicate(card.id);
if (!result.success) {
  setFeedback({ type: 'error', message: result.error });
} else {
  setFeedback({ type: 'success', message: `Replicated for ${result.cost} credits` });
}
```

### MIARecoveryService Usage

```javascript
import creditManager from '../economy/CreditManager.js';
import { ECONOMY } from '../../data/economyData.js';

// Get salvage cost
const cost = ECONOMY.MIA_SALVAGE_COST;

// Check affordability
if (!creditManager.canAfford(cost)) {
  return { success: false, error: 'Insufficient credits' };
}

// Deduct credits
const result = creditManager.deduct(cost, `MIA Recovery: ${shipSlot.name}`);
```

---

## Design Notes

### Centralized Economy Data

All economy values live in `economyData.js` for easy balancing:
- Change one file to adjust all costs
- No hardcoded values in services or modals
- Services import from economyData, not define their own constants

### Drone Rarity Lookup

`RepairService.getDroneRepairCost()` looks up rarity from `droneData.js`:
- No hardcoded rarity lists
- Automatically uses correct cost when new drones added
- Falls back to Common cost if drone not found

### Slot 0 Card Protection

`ReplicatorService.canReplicate()` blocks Slot 0 cards:
- Starter deck cards have infinite quantity
- Cannot replicate infinite cards
- Filter applied in `getReplicatableCards()`

### Transaction Logging

`CreditManager` logs all transactions via `debugLog('ECONOMY', ...)`:
- Tracks reason for each transaction
- Shows balance before/after
- Useful for debugging economy issues

---

## Validation Checklist

- [x] Credit deduction works correctly
- [x] Insufficient credits blocks transactions
- [x] Hull repair calculates cost correctly (per HP)
- [x] Hull repair restores HP to max
- [x] Drone repair clears damaged flag
- [x] Drone repair costs based on rarity (from droneData)
- [x] Card replication increases inventory
- [x] Card replication costs based on rarity
- [x] Cannot replicate unowned cards
- [x] Cannot replicate Slot 0 (starter deck) cards
- [x] All transactions update game state
- [x] MIARecoveryService uses CreditManager
- [x] All costs from economyData.js (centralized)
- [x] Build passes with no errors

---

**Phase Status:** Implemented
