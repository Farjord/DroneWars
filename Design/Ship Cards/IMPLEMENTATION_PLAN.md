# Ship Card System - Implementation Plan

## Overview

This document outlines the technical implementation of the Ship Card system. The implementation is designed to be backward compatible, allowing existing game flows to continue working while new functionality is added.

---

## Phase 1: Data Structures (Non-Breaking)

### 1.1 Create `src/data/shipCardData.js`

Create a new data file for Ship Card definitions:

```javascript
// src/data/shipCardData.js

const shipCardCollection = [
  {
    id: 'SHIP_001',
    name: 'Reconnaissance Corvette',
    rarity: 'Common',
    faction: null,
    description: 'A balanced ship designed for reconnaissance operations.',
    image: '/DroneWars/img/ships/corvette.png',

    // BASELINE COMBAT VALUES
    baseHull: 10,
    baseShields: 3,
    baseThresholds: {
      damaged: 5,
      critical: 0
    },

    // DECK COMPOSITION LIMITS
    deckLimits: {
      totalCards: 40,
      ordnanceLimit: 15,
      tacticLimit: 15,
      supportLimit: 15,
      upgradeLimit: 10
    },

    // FUTURE PROPERTIES
    factionCardAllowances: {},
    shipBonus: null,
  },
  // Additional ships...
];

// Helper functions
export const getShipCardById = (shipId) =>
  shipCardCollection.find(ship => ship.id === shipId) || null;

export const getAllShipCards = () => shipCardCollection;

export const DEFAULT_SHIP_ID = 'SHIP_001';

export const getDefaultShip = () => getShipCardById(DEFAULT_SHIP_ID);

export { shipCardCollection };
export default shipCardCollection;
```

### 1.2 Update `src/data/shipData.js`

Add modifier fields to all ship sections. Keep existing absolute values for backward compatibility during transition:

**Before:**
```javascript
{
  id: 'BRIDGE_001',
  type: 'Bridge',
  name: 'Standard Command Bridge',
  hull: 10,
  maxHull: 10,
  shields: 3,
  thresholds: { damaged: 5, critical: 0 },
  // ...
}
```

**After:**
```javascript
{
  id: 'BRIDGE_001',
  type: 'Bridge',
  name: 'Standard Command Bridge',

  // NEW: Modifier-based values
  hullModifier: 0,
  shieldsModifier: 0,
  thresholdModifiers: {
    damaged: 0,
    critical: 0
  },

  // DEPRECATED: Keep for backward compatibility during transition
  hull: 10,
  maxHull: 10,
  shields: 3,
  allocatedShields: 3,
  thresholds: { damaged: 5, critical: 0 },

  // UNCHANGED
  stats: { ... },
  middleLaneBonus: { ... },
  ability: { ... },
  // ...
}
```

---

## Phase 2: Calculation Logic

### 2.1 Update `src/logic/statsCalculator.js`

Add a new function to compute section base stats from Ship + Section:

```javascript
/**
 * Calculate the effective base stats for a ship section
 * Combines Ship Card baselines with Section modifiers
 *
 * @param {Object} shipCard - Ship card with baseHull, baseShields, baseThresholds
 * @param {Object} sectionTemplate - Section template with modifiers
 * @returns {Object} Computed stats { hull, maxHull, shields, thresholds }
 */
export const calculateSectionBaseStats = (shipCard, sectionTemplate) => {
  // Handle legacy sections without modifiers (default to 0)
  const hullMod = sectionTemplate.hullModifier ?? 0;
  const shieldsMod = sectionTemplate.shieldsModifier ?? 0;
  const thresholdMods = sectionTemplate.thresholdModifiers ?? { damaged: 0, critical: 0 };

  const finalHull = Math.max(1, shipCard.baseHull + hullMod);
  const finalShields = Math.max(0, shipCard.baseShields + shieldsMod);
  const finalThresholds = {
    damaged: Math.max(0, shipCard.baseThresholds.damaged + thresholdMods.damaged),
    critical: Math.max(0, shipCard.baseThresholds.critical + thresholdMods.critical)
  };

  return {
    hull: finalHull,
    maxHull: finalHull,
    shields: finalShields,
    thresholds: finalThresholds
  };
};
```

**Note:** Existing functions (`getShipStatus`, `calculateEffectiveShipStats`) do not need changes - they read from `section.hull` and `section.thresholds` which will be computed values at runtime.

---

## Phase 3: State Initialization

### 3.1 Update `src/logic/state/StateInitializer.js`

Modify `initialPlayerState()` to accept ship card and compute section stats:

```javascript
import { getShipCardById, getDefaultShip } from '../../data/shipCardData.js';
import { shipComponentCollection } from '../../data/shipData.js';
import { calculateSectionBaseStats } from '../statsCalculator.js';

/**
 * Create initial player state with ship card configuration
 *
 * @param {string} name - Player name
 * @param {Array} decklist - Card list
 * @param {string} playerId - 'player1' or 'player2'
 * @param {number|null} gameSeed - RNG seed
 * @param {string|null} shipCardId - Selected ship card ID (optional)
 * @param {Array|null} selectedSectionIds - Selected section IDs (optional)
 */
initialPlayerState(name, decklist, playerId = 'player1', gameSeed = null, shipCardId = null, selectedSectionIds = null) {
  // Get ship card (default if not specified)
  const shipCard = shipCardId ? getShipCardById(shipCardId) : getDefaultShip();

  // Determine sections to use
  const defaultSectionKeys = ['bridge', 'powerCell', 'droneControlHub'];
  const sectionIds = selectedSectionIds || defaultSectionKeys.map(key =>
    shipComponentCollection.find(c => c.key === key)?.id
  ).filter(Boolean);

  // Build ship sections with computed base stats
  const shipSections = {};
  sectionIds.forEach(sectionId => {
    const sectionTemplate = shipComponentCollection.find(c => c.id === sectionId);
    if (sectionTemplate) {
      const baseStats = calculateSectionBaseStats(shipCard, sectionTemplate);
      shipSections[sectionTemplate.key || sectionTemplate.id] = {
        ...sectionTemplate,
        // Computed values from Ship + Section
        hull: baseStats.hull,
        maxHull: baseStats.maxHull,
        shields: baseStats.shields,
        thresholds: baseStats.thresholds,
        allocatedShields: baseStats.shields
      };
    }
  });

  // Calculate effective stats using computed sections
  const baseStats = calculateEffectiveShipStats({ shipSections }, []).totals;

  return {
    name: name,
    shipCardId: shipCard.id,  // Track which ship is in use
    shipSections: shipSections,
    energy: 0,
    initialDeploymentBudget: baseStats.initialDeployment,
    deploymentBudget: 0,
    hand: [],
    deck: this.buildDeckFromList(decklist, playerId, gameSeed),
    discardPile: [],
    activeDronePool: [],
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    deployedDroneCounts: {},
    totalDronesDeployed: 0,
    appliedUpgrades: {},
  };
}
```

### 3.2 Update `src/managers/GameStateManager.js`

Pass ship configuration through to state initialization:

```javascript
// In constructor or initial state
this.state = {
  // ... existing state ...
  selectedShipCard: null,
  opponentSelectedShipCard: null,
};

// In startGame() method
startGame(gameMode = 'local', player1Config = {}, player2Config = {}) {
  // ... existing setup ...

  const gameState = {
    // ... existing fields ...

    player1: {
      ...gameEngine.initialPlayerState(
        player1Config.name || 'Player 1',
        player1Config.decklist || startingDecklist,
        'player1',
        gameSeed,
        player1Config.shipCardId || null,      // NEW
        player1Config.sectionIds || null       // NEW
      ),
      ...player1Config
    },

    player2: {
      ...gameEngine.initialPlayerState(
        player2Config.name || 'Player 2',
        player2Config.decklist || startingDecklist,
        'player2',
        gameSeed,
        player2Config.shipCardId || null,      // NEW
        player2Config.sectionIds || null       // NEW
      ),
      ...player2Config
    },

    // ... rest of state ...
  };
}
```

---

## Phase 4: Deck Builder Integration

### 4.1 Update `src/components/screens/DeckBuilder.jsx`

#### Add Ship Card Props

```javascript
const DeckBuilder = ({
  selectedDrones,
  fullCardCollection,
  deck,
  onDeckChange,
  onDronesChange,
  selectedShipComponents,
  onShipComponentsChange,
  onConfirmDeck,
  onImportDeck,
  onBack,
  selectedShipCard,      // NEW: Ship card object
  onShipCardChange       // NEW: Callback for ship selection
}) => {
```

#### Replace Hardcoded Limits

**Before:**
```javascript
const typeLimits = { Ordnance: 15, Tactic: 15, Support: 15, Upgrade: 10 };
const isDeckValid = cardCount === 40 && typeValid;
```

**After:**
```javascript
// Get limits from selected ship card (with fallback)
const defaultLimits = {
  totalCards: 40,
  ordnanceLimit: 15,
  tacticLimit: 15,
  supportLimit: 15,
  upgradeLimit: 10
};
const deckLimits = selectedShipCard?.deckLimits || defaultLimits;

// Use ship card limits for validation
const typeLimits = {
  Ordnance: deckLimits.ordnanceLimit,
  Tactic: deckLimits.tacticLimit,
  Support: deckLimits.supportLimit,
  Upgrade: deckLimits.upgradeLimit
};

// Validate against ship's total cards requirement
const isDeckValid = cardCount === deckLimits.totalCards && typeValid;
```

#### Add Ship Selection UI

Add a ship selection panel (can be integrated into existing ship components panel or as a new tab):

```jsx
// Ship Card Selection Panel
<div className="ship-selection-panel">
  <h3>Select Ship</h3>
  <div className="ship-grid">
    {getAllShipCards().map(ship => (
      <div
        key={ship.id}
        className={`ship-card ${selectedShipCard?.id === ship.id ? 'selected' : ''}`}
        onClick={() => onShipCardChange(ship)}
      >
        <img src={ship.image} alt={ship.name} />
        <h4>{ship.name}</h4>
        <div className="ship-stats">
          <span>Hull: {ship.baseHull}</span>
          <span>Shields: {ship.baseShields}</span>
        </div>
        <div className="deck-limits">
          <span>Ord: {ship.deckLimits.ordnanceLimit}</span>
          <span>Tac: {ship.deckLimits.tacticLimit}</span>
          <span>Sup: {ship.deckLimits.supportLimit}</span>
          <span>Upg: {ship.deckLimits.upgradeLimit}</span>
        </div>
      </div>
    ))}
  </div>
</div>
```

#### Display Current Limits

Update the deck stats display to show ship-specific limits:

```jsx
<div className="deck-limits-display">
  <h3>Deck Limits ({selectedShipCard?.name || 'Standard'})</h3>
  <div className="limit-row">
    <span>Total: {cardCount}/{deckLimits.totalCards}</span>
  </div>
  <div className="limit-row">
    <span className={typeCounts.Ordnance > deckLimits.ordnanceLimit ? 'over-limit' : ''}>
      Ordnance: {typeCounts.Ordnance}/{deckLimits.ordnanceLimit}
    </span>
  </div>
  <div className="limit-row">
    <span className={typeCounts.Tactic > deckLimits.tacticLimit ? 'over-limit' : ''}>
      Tactics: {typeCounts.Tactic}/{deckLimits.tacticLimit}
    </span>
  </div>
  <div className="limit-row">
    <span className={typeCounts.Support > deckLimits.supportLimit ? 'over-limit' : ''}>
      Support: {typeCounts.Support}/{deckLimits.supportLimit}
    </span>
  </div>
  <div className="limit-row">
    <span className={typeCounts.Upgrade > deckLimits.upgradeLimit ? 'over-limit' : ''}>
      Upgrade: {typeCounts.Upgrade}/{deckLimits.upgradeLimit}
    </span>
  </div>
</div>
```

---

## Phase 5: App.jsx Integration

### 5.1 Add Ship Card State

```javascript
// In App component state
const [selectedShipCard, setSelectedShipCard] = useState(getDefaultShip());

// Pass to DeckBuilder
<DeckBuilder
  // ... existing props ...
  selectedShipCard={selectedShipCard}
  onShipCardChange={setSelectedShipCard}
/>
```

### 5.2 Pass Ship Card to Game Start

```javascript
// When starting a game
startGame('local', {
  name: playerName,
  decklist: deck,
  shipCardId: selectedShipCard?.id,
  sectionIds: selectedShipComponents.map(c => c.id)
}, {
  // AI config
});
```

---

## File-by-File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/data/shipCardData.js` | **NEW** | Ship card collection with baselines and deck limits |
| `src/data/shipData.js` | **MODIFY** | Add modifier fields to all sections |
| `src/logic/statsCalculator.js` | **MODIFY** | Add `calculateSectionBaseStats()` function |
| `src/logic/state/StateInitializer.js` | **MODIFY** | Accept ship card, compute section stats |
| `src/managers/GameStateManager.js` | **MODIFY** | Pass ship config through to init |
| `src/components/screens/DeckBuilder.jsx` | **MODIFY** | Ship selection UI, dynamic deck limits |
| `src/App.jsx` | **MODIFY** | Ship card state, pass to DeckBuilder and game start |

---

## Files to Review (No Changes Expected)

| File | Reason |
|------|--------|
| `src/logic/shields/ShieldManager.js` | Uses `section.shields` from state - should work as-is |
| `src/logic/combat/AttackProcessor.js` | Uses `section.hull` from state - should work as-is |
| `src/services/GameDataService.js` | Computes stats from state - should work as-is |

---

## Migration Strategy

### Step 1: Add Ship Cards (Non-Breaking)
- Create `shipCardData.js` with 6+ ships
- Add modifier fields to `shipData.js` (all default to 0)
- Add `calculateSectionBaseStats()` to `statsCalculator.js`
- **Test:** Verify existing game still works

### Step 2: Wire Up Initialization (Backward Compatible)
- Update `StateInitializer.initialPlayerState()` with optional ship parameter
- Default to `SHIP_001` when no ship specified
- Update `GameStateManager` to pass config through
- **Test:** Verify game works with default ship

### Step 3: DeckBuilder Integration
- Add ship card state to `App.jsx`
- Update `DeckBuilder.jsx` with ship selection and dynamic limits
- Pass ship card to game start
- **Test:** Verify deck limits change based on ship selection

### Step 4: Polish
- Add ship card artwork
- Add ship stat comparison UI
- Create varied sections with non-zero modifiers
- **Test:** Full end-to-end gameplay with different ships

---

## Testing Checklist

### Unit Tests
- [ ] `calculateSectionBaseStats()` with various ship/section combinations
- [ ] Positive, negative, and zero modifiers
- [ ] Edge cases (modifiers resulting in 0 or negative values)

### Integration Tests
- [ ] Player initialization with different ship cards
- [ ] Deck validation with different ship limits
- [ ] Combat damage using computed hull/thresholds
- [ ] Shield allocation using computed shields

### UI Tests
- [ ] DeckBuilder displays correct limits for selected ship
- [ ] Deck validation responds to ship changes
- [ ] Ship selection persists through game flow
- [ ] Invalid decks prevented from confirmation

### Regression Tests
- [ ] Existing games work without ship selection (default ship)
- [ ] AI uses default ship correctly
- [ ] Multiplayer syncs ship selection
- [ ] Save/load preserves ship selection

---

## Implementation Order

1. **Create `shipCardData.js`** - Define data structure and all 6 ships
2. **Update `shipData.js`** - Add modifier fields to all sections
3. **Add `calculateSectionBaseStats()`** - New function in statsCalculator
4. **Update `StateInitializer.js`** - Wire up ship card to player init
5. **Update `GameStateManager.js`** - Pass ship config through
6. **Update `App.jsx`** - Add ship card state
7. **Update `DeckBuilder.jsx`** - Ship selection UI and dynamic limits
8. **Test end-to-end** - Verify all flows work
9. **Polish UI** - Ship comparison, artwork, tooltips
