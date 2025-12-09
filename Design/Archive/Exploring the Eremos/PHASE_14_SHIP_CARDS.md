# Phase 14: Ship Cards

## Overview

Ship cards define the baseline combat stats and deck composition limits for player vessels. They work alongside Ship Sections to determine final combat values.

**Duration:** 1 day | **Dependencies:** Phase 11 (Economy)

---

## Files Created/Modified

1. `src/data/shipData.js` - Ship card definitions
2. `src/data/saveGameSchema.js` - Added `starterPoolShipIds`
3. `src/utils/singlePlayerDeckUtils.js` - Added `calculateAvailableShips()`
4. `src/components/modals/BlueprintsModal.jsx` - Ship Cards tab in crafting
5. `src/logic/singlePlayer/MIARecoveryService.js` - Ship removal on scrap

---

## Ship Card Properties

| Property | Description |
|----------|-------------|
| id | Unique identifier (e.g., 'SHIP_001') |
| name | Display name |
| rarity | Common, Uncommon, Rare, Mythic |
| baseHull | Starting hull points (before section modifiers) |
| baseShields | Starting shields (before section modifiers) |
| baseThresholds | Damaged/Critical thresholds |
| deckLimits | Card type limits (ordnance, tactic, support, upgrade) |
| description | Flavor text |
| image | Ship artwork path |

---

## Available Ships

| ID | Name | Rarity | Base Hull | Base Shields | Deck Limits |
|----|------|--------|-----------|--------------|-------------|
| SHIP_001 | Reconnaissance Corvette | Common | 10 | 3 | 15/15/15/10 |
| SHIP_002 | Heavy Assault Carrier | Uncommon | 12 | 2 | 20/10/15/5 |
| SHIP_003 | Scout | Common | 6 | 2 | 15/15/15/5 |

> Deck Limits format: Ordnance/Tactic/Support/Upgrade

---

## Starter Pool vs Crafted Ships

| Aspect | Starter Pool (SHIP_001) | Crafted Ships |
|--------|-------------------------|---------------|
| Availability | Unlimited, all 6 slots | Limited by inventory |
| Lost on scrap? | No | Yes |
| Needs crafting? | No | Yes (costs credits) |
| Multiple decks? | Yes | Only if multiple owned |

---

## Ship Card Instance System

Ships work like drones with instance tracking:

```
┌─────────────────────────────────────────────────────┐
│ 1. CRAFT SHIP (BlueprintsModal)                     │
│    → Added to inventory: { "SHIP_002": 1 }          │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 2. ASSIGN TO DECK SLOT (ExtractionDeckBuilder)      │
│    → Slot.shipId = "SHIP_002"                       │
│    → calculateAvailableShips shows 0 available now  │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 3. DECK GOES MIA                                    │
│    → Slot status = 'mia'                            │
│    → Ship still in slot, still in inventory         │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 4a. RECOVER (500 credits)                           │
│    → Slot restored to 'active'                      │
│    → Ship remains in slot and inventory             │
└─────────────────────────────────────────────────────┘
                   OR
┌─────────────────────────────────────────────────────┐
│ 4b. SCRAP (free)                                    │
│    → Ship REMOVED from inventory                    │
│    → Slot reset to 'empty'                          │
│    → Ship is PERMANENTLY LOST                       │
└─────────────────────────────────────────────────────┘
```

---

## Key Implementations

### calculateAvailableShips() - singlePlayerDeckUtils.js

```javascript
export function calculateAvailableShips(targetSlotId, shipSlots, inventory) {
  const allShips = getAllShips();

  // Count ships used in OTHER active slots (not target, not slot 0)
  const usedShips = {};
  shipSlots.forEach(slot => {
    if (slot.id !== targetSlotId && slot.id !== 0 && slot.status === 'active') {
      if (slot.shipId) {
        usedShips[slot.shipId] = (usedShips[slot.shipId] || 0) + 1;
      }
    }
  });

  return allShips.map(ship => {
    const isStarterPool = starterPoolShipIds.includes(ship.id);
    let availableCount;

    if (isStarterPool) {
      availableCount = 99;  // Unlimited
    } else {
      const owned = inventory[ship.id] || 0;
      const usedElsewhere = usedShips[ship.id] || 0;
      availableCount = Math.max(0, owned - usedElsewhere);
    }

    return { ...ship, availableCount, isStarterPool };
  }).filter(ship => ship.availableCount > 0);
}
```

### Ship Crafting - BlueprintsModal.jsx

Ships are crafted from the "Ship Cards" tab in Blueprints modal:
- Cost based on rarity: Common 100, Uncommon 250, Rare 600, Mythic 1500
- Added to inventory with quantity (not unlockedBlueprints)
- Can craft multiple copies of the same ship

### Ship Removal on Scrap - MIARecoveryService.js

```javascript
// In scrap() method:
if (shipSlot.shipId && !starterPoolShipIds.includes(shipSlot.shipId)) {
  if (inventory[shipSlot.shipId] && inventory[shipSlot.shipId] > 0) {
    inventory[shipSlot.shipId] -= 1;
    if (inventory[shipSlot.shipId] <= 0) {
      delete inventory[shipSlot.shipId];
    }
  }
}
```

---

## Deck Building Integration

Ships are selected in the "Ship Cards" tab of DeckBuilder:
- Shows availableCount (inventory minus other slot usage)
- Starter pool ships show unlimited availability
- Non-starter ships show quantity available
- Ship selection affects deck composition limits

---

## Combat Integration

Ship stats combined with Ship Sections in `calculateSectionBaseStats()`:

```
Final Hull = Ship.baseHull + Section.hullModifier
Final Shields = Ship.baseShields + Section.shieldModifier
Thresholds = Ship.baseThresholds
```

The ship card's deck limits are enforced during deck building validation.

---

## Validation Checklist

- [x] Ship cards display in Blueprints modal ("Ship Cards" tab)
- [x] Ship crafting adds to inventory (not unlockedBlueprints)
- [x] Ship crafting costs based on rarity (100/250/600/1500)
- [x] Ship selection shows in DeckBuilder "Ship Cards" tab
- [x] Starter pool ship (SHIP_001) unlimited across all slots
- [x] Non-starter ships limited to one slot at a time
- [x] calculateAvailableShips() correctly counts slot usage
- [x] Ship removal on MIA scrap
- [x] Slot reset clears shipId on scrap
- [x] Ship stats used in combat initialization
- [x] Deck limits enforced based on selected ship

---

**Phase Status:** ✅ Implemented
