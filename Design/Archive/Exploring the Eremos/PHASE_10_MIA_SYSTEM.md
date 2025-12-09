# Phase 10: MIA System

## Overview

Implements MIA detection, recovery options, and scrap functionality.

**Duration:** 1 day | **Dependencies:** Phase 2, Phase 9

---

## Files Created

1. `src/logic/singlePlayer/MIARecoveryService.js`
2. `src/components/modals/MIARecoveryModal.jsx`
3. `src/components/modals/MIARecoveryModal.css`

---

## Key Implementations

### MIARecoveryService.js

```javascript
class MIARecoveryService {
  SALVAGE_COST = 500;  // Placeholder

  recover(shipSlot, playerProfile) {
    if (shipSlot.status !== 'mia') {
      return { success: false, error: 'Ship is not MIA' };
    }

    if (playerProfile.credits < this.SALVAGE_COST) {
      return { success: false, error: 'Insufficient credits' };
    }

    // Deduct credits
    playerProfile.credits -= this.SALVAGE_COST;

    // Restore ship
    shipSlot.status = 'active';
    shipSlot.currentHull = shipSlot.maxHull;  // Fully repaired

    // Clear damaged drones
    shipSlot.drones.forEach(d => d.isDamaged = false);

    gameStateManager.setState({
      singlePlayerProfile: playerProfile,
      singlePlayerShipSlots: [...gameStateManager.state.singlePlayerShipSlots]
    });

    console.log(`Ship ${shipSlot.name} recovered for ${this.SALVAGE_COST} credits`);
    return { success: true, cost: this.SALVAGE_COST };
  }

  scrap(shipSlot, inventory) {
    if (shipSlot.status !== 'mia') {
      return { success: false, error: 'Ship is not MIA' };
    }

    if (shipSlot.isImmutable) {
      return { success: false, error: 'Cannot scrap starter deck' };
    }

    // Remove all cards from inventory
    const cardsRemoved = [];
    shipSlot.decklist.forEach(item => {
      const cardId = item.id;
      const qty = item.quantity;

      if (inventory[cardId]) {
        inventory[cardId] = Math.max(0, inventory[cardId] - qty);
        cardsRemoved.push({ cardId, qty });
      }
    });

    // Remove ship from inventory (if not starter pool)
    if (shipSlot.shipId && !starterPoolShipIds.includes(shipSlot.shipId)) {
      if (inventory[shipSlot.shipId] && inventory[shipSlot.shipId] > 0) {
        inventory[shipSlot.shipId] -= 1;
        if (inventory[shipSlot.shipId] <= 0) {
          delete inventory[shipSlot.shipId];
        }
      }
    }

    // Reset slot
    shipSlot.status = 'empty';
    shipSlot.name = `Ship Slot ${shipSlot.id}`;
    shipSlot.blueprintId = null;
    shipSlot.currentHull = 0;
    shipSlot.maxHull = 0;
    shipSlot.decklist = [];
    shipSlot.drones = [];
    shipSlot.shipComponents = {};
    shipSlot.shipId = null;

    gameStateManager.setState({
      singlePlayerInventory: inventory,
      singlePlayerShipSlots: [...gameStateManager.state.singlePlayerShipSlots]
    });

    console.log(`Ship ${shipSlot.name} scrapped, ${cardsRemoved.length} card types removed`);
    return { success: true, cardsRemoved };
  }
}

export default new MIARecoveryService();
```

### MIARecoveryModal.jsx

```jsx
function MIARecoveryModal({ shipSlot, onClose }) {
  const [showConfirm, setShowConfirm] = useState(null);  // 'recover' | 'scrap'
  const profile = gameStateManager.state.singlePlayerProfile;

  const handleRecover = () => {
    const result = miaRecoveryService.recover(shipSlot, profile);

    if (!result.success) {
      alert(result.error);
      return;
    }

    alert(`Ship recovered for ${result.cost} credits`);
    onClose();
  };

  const handleScrap = () => {
    const result = miaRecoveryService.scrap(shipSlot, gameStateManager.state.singlePlayerInventory);

    if (!result.success) {
      alert(result.error);
      return;
    }

    alert(`Ship scrapped. ${result.cardsRemoved.length} card types removed from inventory.`);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-red-400">Ship MIA</h2>
      <p>Ship Slot #{shipSlot.id}: {shipSlot.name}</p>

      <div className="mia-info">
        <p>The ship failed to return from its last deployment.</p>
        <p>Deck is locked and unavailable until recovered or scrapped.</p>
      </div>

      <div className="recovery-options">
        <section className="option-card">
          <h3>Pay Salvage Fee</h3>
          <p>Recover the ship and restore all systems</p>
          <p className="cost">Cost: {miaRecoveryService.SALVAGE_COST} Credits</p>
          <p className="text-sm text-gray-400">Ship will be fully repaired</p>

          {!showConfirm && (
            <button
              onClick={() => setShowConfirm('recover')}
              disabled={profile.credits < miaRecoveryService.SALVAGE_COST}
              className="btn-primary"
            >
              Pay Salvage
            </button>
          )}

          {showConfirm === 'recover' && (
            <div className="confirm">
              <p>Confirm recovery for {miaRecoveryService.SALVAGE_COST} credits?</p>
              <button onClick={handleRecover}>Confirm</button>
              <button onClick={() => setShowConfirm(null)}>Cancel</button>
            </div>
          )}
        </section>

        <section className="option-card">
          <h3>Scrap Ship</h3>
          <p>Permanently delete the deck and free the slot</p>
          <p className="text-red-400">All cards in this deck will be removed from inventory</p>
          <p className="text-sm text-gray-400">This action cannot be undone</p>

          {!showConfirm && (
            <button
              onClick={() => setShowConfirm('scrap')}
              disabled={shipSlot.isImmutable}
              className="btn-danger"
            >
              Scrap Ship
            </button>
          )}

          {showConfirm === 'scrap' && (
            <div className="confirm">
              <p className="text-red-400">Are you sure? This will permanently delete the deck.</p>
              <button onClick={handleScrap} className="btn-danger">Confirm Scrap</button>
              <button onClick={() => setShowConfirm(null)}>Cancel</button>
            </div>
          )}
        </section>
      </div>

      {shipSlot.isImmutable && (
        <p className="text-yellow-400">⚠ Starter deck cannot be scrapped (only recovered)</p>
      )}
    </Modal>
  );
}

export default MIARecoveryModal;
```

---

## MIA Triggers

1. **Combat Loss** - Player ship destroyed → `CombatOutcomeProcessor.processDefeat()` → `gameStateManager.endRun(false)`
2. **Run Abandonment** - Player chooses to abandon → `ExtractionController.abandonRun()` → `gameStateManager.endRun(false)`
3. **Detection 100%** - Detection meter maxes out → `DetectionManager.triggerMIA()` → `gameStateManager.endRun(false)`

> **Note:** Slot 0 (Starter Deck) is protected from MIA in `GameStateManager.endRun()` - it only loses loot, never goes MIA.

---

## MIA States

| Ship Slot Status | Description | Can Deploy? | Can Edit? |
|-----------------|-------------|-------------|-----------|
| `active` | Normal, available | Yes | Yes (if not immutable) |
| `empty` | No deck configured | No | Yes |
| `mia` | Lost, needs recovery | No | No |

---

## Recovery Options

### Option 1: Pay Salvage
- **Cost:** 500 credits (placeholder)
- **Effect:** Ship restored to `active`, hull at max, drones repaired
- **Use Case:** Preserve deck, willing to pay

### Option 2: Scrap
- **Cost:** Free
- **Effect:** Ship slot freed, all cards removed from inventory, ship card removed from inventory
- **Use Case:** Can't afford salvage, or deck not valuable
- **Note:** Ship cards (non-starter) are permanently lost when scrapping

---

## Special Cases

### Immutable Starter Deck (Slot 0)
- **Can be MIA:** No (protected in `GameStateManager.endRun()`)
- **Can be recovered:** N/A (never goes MIA)
- **Can be scrapped:** No (always returns error)
- **On failure:** Loses loot/credits from run, but deck stays active
- **Rationale:** Prevent player from softlocking by losing starter deck

---

## Validation Checklist

- [x] MIA ships display correctly in hangar (red btn-cancel style, clickable)
- [x] MIA ships cannot deploy (status check in startRun)
- [x] MIA ships cannot be edited (status check)
- [x] MIA recovery modal opens on click
- [x] Pay salvage deducts credits
- [x] Pay salvage restores ship to active
- [x] Pay salvage clears damaged drones
- [x] Scrap removes cards from inventory (by deck quantity)
- [x] Scrap removes ship card from inventory (if non-starter)
- [x] Scrap frees ship slot (resets to empty)
- [x] Scrap shows confirmation
- [x] Starter deck cannot be scrapped (isImmutable check)
- [x] Insufficient credits blocks recovery
- [x] Slot 0 never goes MIA (protected in endRun)

---

**Phase Status:** Implemented
