# Phase 1: Foundation & Data Layer

## Overview

Phase 1 establishes the data foundation for the entire single-player system. This phase focuses on creating all necessary data files, updating deck validation for 40-card decks, and extracting the starter deck from game logic into a proper data file. This phase blocks most other development as it defines the core data structures.

**What This Phase Accomplishes:**
- Updates deck validation from 30 to 40 cards (both VS Mode and Extraction Mode)
- Updates type limits: Ordnance(15), Support(15), Tactics(15), Upgrade(10)
- Adds rarity fields to cardData.js, droneData.js, and shipData.js
- Creates all data files needed for Extraction Mode
- Extracts starter deck to dedicated data file
- Defines PoI types, card packs, and map configuration
- Extends AI data with Extraction Mode opponents (with mode filtering)
- No UI changes - purely data layer work

---

## Estimated Time

**2 days** (8-12 hours total)

**Breakdown:**
- Day 1: Deck validation + rarity fields (cardData, droneData, shipData) + playerDeckData.js
- Day 2: pointsOfInterestData.js + cardPackData.js + mapData.js + aiData.js extension

---

## Dependencies

**None** - This is the foundation phase

**Blocks:**
- Phase 2 (Persistence) - needs save schema
- Phase 3 (Hangar UI) - needs ship/deck data
- Phase 4 (Map Generation) - needs mapData.js
- Phase 6 (Instability) - needs poiData.js and mapData.js
- Phase 7 (Combat) - needs aiData.js extensions
- Phase 8 (Loot) - needs cardPackData.js

---

## Files to Modify

### 1. `src/components/screens/DeckBuilder.jsx`

**Location:** Line 458
**Current Code:**
```javascript
const isDeckValid = cardCount === 30 && typeValid;
```

**New Code:**
```javascript
const isDeckValid = cardCount === 40 && typeValid;
```

**Type Limits Update** (Line ~450):
```javascript
// Old limits
const typeLimits = {
  Ordnance: 10,
  Tactic: 10,
  Support: 10,
  Upgrade: 6
};

// New limits
const typeLimits = {
  Ordnance: 15,
  Tactic: 15,
  Support: 15,
  Upgrade: 10
};
```

**Card Count Display Update** (Line ~470):
```javascript
// Old
<p>Total: {cardCount}/30 cards</p>

// New
<p>Total: {cardCount}/40 cards</p>
```

**Mode-Based Filtering** (for Extraction Mode):
- Add `mode` prop to DeckBuilder component
- When `mode === 'extraction'`, filter cards by `inventory` and `discoveredCards`
- Card visibility states:
  - **Owned** (qty > 0): Normal display, selectable
  - **Discovered** (qty = 0): Greyed out, show "0 owned"
  - **Undiscovered**: Show "???" placeholder

**Testing:**
- Open DeckBuilder, verify it accepts 40 cards
- Verify new type limits work (15/15/15/10)
- Verify it rejects 39 and 41 cards
- Verify VS Mode deck selection still works

---

### 2. `src/data/cardData.js` - Add Rarity Field

**Purpose:** Add explicit `rarity` field to all 36 cards

**Change to Each Card:**
```javascript
{
  id: 'CARD001',
  name: 'Laser Blast',
  type: 'Ordnance',
  maxInDeck: 4,
  rarity: 'Common',  // NEW FIELD: 'Common' | 'Uncommon' | 'Rare' | 'Mythic'
  // ... rest of card properties
}
```

**Rarity Assignment Guidelines:**
- Use existing `maxInDeck` as initial guide:
  - `maxInDeck: 4` → Usually Common
  - `maxInDeck: 2-3` → Usually Uncommon or Rare
  - `maxInDeck: 1` → Usually Mythic
- Adjust based on card power level and strategic value

**Rarity Colors for UI:**
```javascript
export const RARITY_COLORS = {
  Common: '#808080',     // Grey
  Uncommon: '#22c55e',   // Green
  Rare: '#3b82f6',       // Blue
  Mythic: '#a855f7'      // Purple
};
```

---

### 3. `src/data/droneData.js` - Add Rarity Field

**Purpose:** Add `rarity` field to all 20 drones

**Change to Each Drone:**
```javascript
{
  name: 'Scout Drone',
  class: 'Scout',
  attack: 1,
  hull: 3,
  rarity: 'Common',  // NEW FIELD
  // ... rest of drone properties
}
```

**Suggested Rarity Distribution:**
- Common: Scout Drone, Standard Fighter, Guardian Drone, Repair Drone
- Uncommon: Heavy Fighter, Bomber, Interceptor
- Rare: Aegis Drone, Kamikaze Drone, Swarm Drone
- Mythic: (Special drones if any)

---

### 4. `src/data/shipData.js` - Add Rarity Field

**Purpose:** Add `rarity` field to ship components for blueprint system

**Change to Each Component:**
```javascript
{
  id: 'BRIDGE_001',
  name: 'Standard Bridge',
  type: 'Bridge',
  rarity: 'Common',  // NEW FIELD
  // ... rest of component properties
}
```

**Note:** Ship components will be used for blueprints in Extraction Mode. Rarity affects blueprint drop rates and unlock progression.

---

## Files to Create

### 1. `src/data/playerDeckData.js`

**Purpose:** Extract starter deck from StateInitializer.js into dedicated data file

**Structure:**
```javascript
/**
 * Player Deck Data
 * Defines pre-configured player decks for single-player mode
 */

export const starterDeck = {
  id: 'STARTER_001',
  name: 'Standard Loadout',
  description: 'A balanced configuration designed for reconnaissance operations in The Shallows. Emphasizes versatility and survivability.',
  isImmutable: true,  // Cannot be edited (for Slot 0)

  // 40 Asset Cards
  decklist: [
    { id: 'CARD018', quantity: 4 },  // Desperate Measures
    { id: 'CARD019', quantity: 2 },  // Reposition
    { id: 'CARD009', quantity: 2 },  // Target Lock
    { id: 'CARD007', quantity: 2 },  // Emergency Patch
    { id: 'CARD012', quantity: 2 },  // Armor-Piercing Shot
    { id: 'CARD005', quantity: 4 },  // Adrenaline Rush
    { id: 'CARD006', quantity: 2 },  // Nanobot Repair
    { id: 'CARD015', quantity: 2 },  // Streamline
    { id: 'CARD008', quantity: 2 },  // Shield Recharge
    { id: 'CARD001', quantity: 2 },  // Laser Blast
    { id: 'CARD002', quantity: 4 },  // System Reboot
    { id: 'CARD003', quantity: 4 },  // Out Think
    { id: 'CARD004', quantity: 4 },  // Energy Surge
    { id: 'CARD016', quantity: 4 },  // Static Field
  ],

  // 5 Drones (single-player uses exactly 5, no selection phase)
  drones: [
    { name: 'Scout Drone', isDamaged: false },
    { name: 'Standard Fighter', isDamaged: false },
    { name: 'Heavy Fighter', isDamaged: false },
    { name: 'Guardian Drone', isDamaged: false },
    { name: 'Repair Drone', isDamaged: false },
  ],

  // Ship components (standard layout)
  shipComponents: {
    'BRIDGE_001': 'l',
    'POWERCELL_001': 'm',
    'DRONECONTROL_001': 'r'
  }
};

// Export as array for future expansion (multiple starter decks)
export const playerDecks = [starterDeck];

export default playerDecks;
```

**Card Count Validation:**
Total cards: 4+2+2+2+2+4+2+2+2+2+4+4+4+4 = **40 cards** ✓

**Integration:**
- Update `src/logic/state/StateInitializer.js` to import from this file:
```javascript
import { starterDeck } from '../../data/playerDeckData.js';

// Replace existing hardcoded startingDecklist with:
export const startingDecklist = starterDeck.decklist;
export const startingDroneList = starterDeck.drones.map(d => d.name);
```

---

### 2. `src/data/pointsOfInterestData.js`

**Purpose:** Define PoI types with rewards, security levels, and flavour text

**Structure:**
```javascript
/**
 * Points of Interest Data
 * Defines encounter locations on tactical maps
 * Each PoI type grants specific reward types
 */

export const poiTypes = [
  {
    id: 'POI_MUNITIONS',
    name: 'Munitions Storage Depot',
    description: 'Abandoned ordnance cache',

    // Encounter
    baseSecurity: 15,  // Base % for ambush calculation

    // Rewards
    rewardType: 'ORDNANCE_PACK',

    // Visuals
    image: '/DroneWars/poi/munitions_depot.png',
    color: '#ff4444',

    // Flavour (physical fittings/AI data theme)
    flavourText: 'Structural scans detect intact weapon storage cells. Automated defense protocols dormant.',
  },

  {
    id: 'POI_AUXILIARY',
    name: 'Auxiliary Energy Hub',
    description: 'Derelict power distribution node',
    baseSecurity: 10,
    rewardType: 'SUPPORT_PACK',
    image: '/DroneWars/poi/energy_hub.png',
    color: '#44aaff',
    flavourText: 'Emergency power reserves online. Fusion containment stable. Data cores accessible.',
  },

  {
    id: 'POI_NAVIGATION',
    name: 'Navigation Data Wreck',
    description: 'Crashed reconnaissance vessel',
    baseSecurity: 12,
    rewardType: 'TACTICAL_PACK',
    image: '/DroneWars/poi/navigation_wreck.png',
    color: '#ffaa44',
    flavourText: 'Flight recorder intact. Tactical subroutines preserved in secondary memory.',
  },

  {
    id: 'POI_FABRICATION',
    name: 'Industrial Fabrication Unit',
    description: 'Automated manufacturing station',
    baseSecurity: 18,
    rewardType: 'UPGRADE_PACK',
    image: '/DroneWars/poi/fabrication_unit.png',
    color: '#aa44ff',
    flavourText: 'Assembly arrays idle. Component blueprints stored in manufacturing AI database.',
  },

  {
    id: 'POI_COMMAND',
    name: 'Fleet Command Relay',
    description: 'Abandoned command center',
    baseSecurity: 30,
    rewardType: 'BLUEPRINT_GUARANTEED',
    image: '/DroneWars/poi/fleet_command.png',
    color: '#ff44aa',
    isBoss: true,
    flavourText: 'Capital-class systems detected. Strategic data vault sealed but breachable.',
  },

  {
    id: 'POI_FINANCIAL',
    name: 'Sector Financial Ledger',
    description: 'Banking network terminal',
    baseSecurity: 8,
    rewardType: 'CREDITS',
    image: '/DroneWars/poi/financial_ledger.png',
    color: '#44ff88',
    flavourText: 'Transaction logs corrupted. Credit vouchers extractable from backup nodes.',
  },

  {
    id: 'POI_CONTRABAND',
    name: 'Contraband Intercept Point',
    description: 'Smuggler cache',
    baseSecurity: 20,
    rewardType: 'TOKEN_CHANCE',
    image: '/DroneWars/poi/contraband_cache.png',
    color: '#ffff44',
    flavourText: 'Encrypted cargo manifest. Security bypass codes may be recoverable.',
  }
];

/**
 * Get random PoI type (weighted by tier)
 * @param {number} tier - Map tier (1-3)
 * @returns {object} PoI configuration
 */
export function getRandomPoIType(tier, rng = Math.random) {
  // For MVP (Tier 1 only): Equal distribution except Command is rare
  const weights = poiTypes.map(poi => {
    if (poi.isBoss) return 0.05;  // 5% chance for boss
    return 1;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const roll = rng() * totalWeight;

  let cumulative = 0;
  for (let i = 0; i < poiTypes.length; i++) {
    cumulative += weights[i];
    if (roll <= cumulative) {
      return poiTypes[i];
    }
  }

  return poiTypes[0];  // Fallback
}

/**
 * Get PoI by ID
 */
export function getPoIById(id) {
  return poiTypes.find(poi => poi.id === id);
}

export default poiTypes;
```

---

### 3. `src/data/cardPackData.js`

**Purpose:** Define pack types with card filters, rarity weightings, and type guarantees

**Structure:**
```javascript
/**
 * Card Pack Data
 * Defines loot pack types and their generation rules
 * Used by LootGenerator to create rewards
 */

import fullCardCollection from './cardData.js';

/**
 * Rarity color constants
 */
export const RARITY_COLORS = {
  Common: '#808080',     // Grey
  Uncommon: '#22c55e',   // Green
  Rare: '#3b82f6',       // Blue
  Mythic: '#a855f7'      // Purple
};

export const packTypes = {
  ORDNANCE_PACK: {
    name: 'Ordnance Pack',
    description: 'Weapons and damage-dealing fittings',

    // Guaranteed card types (minimum 1 of each)
    guaranteedTypes: ['Ordnance'],

    // Weighting for additional cards
    additionalCardWeights: {
      Ordnance: 60,    // 60% chance additional cards are Ordnance
      Support: 20,     // 20% chance Support
      Tactic: 20,      // 20% chance Tactic
      Upgrade: 0       // Never Upgrade in Ordnance packs
    },

    // Rarity weights by tier
    rarityWeights: {
      tier1: { Common: 90, Uncommon: 10 },
      tier2: { Common: 60, Uncommon: 35, Rare: 5 },
      tier3: { Common: 40, Uncommon: 45, Rare: 13, Mythic: 2 }
    },

    // Card count range
    cardCount: { min: 1, max: 3 },

    // Credit bonus range
    creditsRange: { min: 10, max: 100 },

    // Visual
    color: '#ff4444',
  },

  SUPPORT_PACK: {
    name: 'Support Pack',
    description: 'Repair, energy, and utility systems',
    guaranteedTypes: ['Support'],
    additionalCardWeights: {
      Support: 60,
      Ordnance: 15,
      Tactic: 15,
      Upgrade: 10
    },
    rarityWeights: {
      tier1: { Common: 90, Uncommon: 10 },
      tier2: { Common: 60, Uncommon: 35, Rare: 5 },
      tier3: { Common: 40, Uncommon: 45, Rare: 13, Mythic: 2 }
    },
    cardCount: { min: 1, max: 3 },
    creditsRange: { min: 10, max: 100 },
    color: '#44aaff',
  },

  TACTICAL_PACK: {
    name: 'Tactical Pack',
    description: 'Control and disruption protocols',
    guaranteedTypes: ['Tactic'],
    additionalCardWeights: {
      Tactic: 60,
      Ordnance: 15,
      Support: 15,
      Upgrade: 10
    },
    rarityWeights: {
      tier1: { Common: 90, Uncommon: 10 },
      tier2: { Common: 60, Uncommon: 35, Rare: 5 },
      tier3: { Common: 40, Uncommon: 45, Rare: 13, Mythic: 2 }
    },
    cardCount: { min: 1, max: 3 },
    creditsRange: { min: 10, max: 100 },
    color: '#ffaa44',
  },

  UPGRADE_PACK: {
    name: 'Upgrade Pack',
    description: 'Permanent system enhancements',
    guaranteedTypes: ['Upgrade'],
    additionalCardWeights: {
      Upgrade: 70,
      Ordnance: 10,
      Support: 10,
      Tactic: 10
    },
    rarityWeights: {
      tier1: { Common: 90, Uncommon: 10 },
      tier2: { Common: 60, Uncommon: 35, Rare: 5 },
      tier3: { Common: 40, Uncommon: 45, Rare: 13, Mythic: 2 }
    },
    cardCount: { min: 1, max: 3 },
    creditsRange: { min: 10, max: 100 },
    color: '#aa44ff',
  },
};

/**
 * Get filtered card pool by type and rarity
 * @param {string[]} types - Card types to include (e.g., ['Ordnance', 'Support'])
 * @param {string} rarity - Card rarity filter (optional)
 */
export function getCardPool(types, rarity) {
  return fullCardCollection.filter(card => {
    const matchesType = types.includes(card.type);
    const matchesRarity = !rarity || card.rarity === rarity;
    return matchesType && matchesRarity;
  });
}

/**
 * Roll card type based on weights
 */
export function rollCardType(weights) {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const roll = Math.random() * totalWeight;

  let cumulative = 0;
  for (const [type, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll <= cumulative) {
      return type;
    }
  }

  return Object.keys(weights)[0];  // Fallback
}

export default packTypes;
```

**Note:** Now using explicit `rarity` field from cardData.js (added in this phase)

---

### 4. `src/data/mapData.js`

**Purpose:** Define map tier configurations (Tier 1 only for MVP)

**Structure:**
```javascript
/**
 * Map Data
 * Defines tactical map configurations by tier
 * MVP: Tier 1 (The Shallows) only
 */

export const mapTiers = [
  {
    tier: 1,
    name: 'The Shallows',
    description: 'Outer perimeter of the Eremos. Low-risk reconnaissance zone with scattered debris fields.',

    // Topology
    radius: 5,  // Hexes from center
    gateCount: 3,  // Extraction points

    // PoI configuration
    poiCount: { min: 6, max: 8 },
    poiDistribution: {
      core: 0.70,   // 70% spawn in core zone (0-40% radius)
      mid: 0.25,    // 25% spawn in mid zone (41-80% radius)
      perimeter: 0.05  // 5% spawn in perimeter (81-100% radius)
    },

    // Spacing rules
    gateBuffer: 3,  // Min hexes from PoI to gate
    poiMinSpacing: 2,  // Min hexes between PoIs
    twinNodeChance: 0.05,  // 5% chance for adjacent PoIs

    // Entry cost
    entryCost: {
      type: 'credits',
      amount: 0  // Free for Tier 1
    },

    // Instability configuration
    instabilityTriggers: {
      movementPerHex: 1.5,  // % per hex moved
      looting: 10,          // % when looting PoI
      combatEnd: 20,        // % after combat resolves
      timePerTurn: 5        // % per turn (optional for MVP)
    },

    // Threat escalation
    threatTables: {
      low: ['AI_SCOUT_1', 'AI_PATROL_1'],           // 0-49% instability
      medium: ['AI_CRUISER_1', 'AI_HUNTER_1'],      // 50-79% instability
      high: ['AI_BLOCKADE_1', 'AI_BLOCKADE_2']      // 80-100% instability
    },

    // Validation
    maxPathCostPercent: 70,  // Max instability cost for critical path

    // Visual
    backgroundColor: '#1a1a2e',
    gridColor: '#16213e',
    dangerZoneColor: '#ff4444',
  }
];

// Future tiers (post-MVP)
/*
{
  tier: 2,
  name: 'The Deep',
  radius: 8,
  gateCount: 4,
  poiCount: { min: 12, max: 15 },
  entryCost: { type: 'credits', amount: 100 },
  instabilityTriggers: {
    movementPerHex: 2.5,
    looting: 10,
    combatEnd: 20,
    timePerTurn: 5
  },
  // ... etc
},
{
  tier: 3,
  name: 'The Core',
  radius: 12,
  gateCount: 5,
  poiCount: { min: 20, max: 25 },
  entryCost: { type: 'tokens', amount: 1 },
  instabilityTriggers: {
    movementPerHex: 3.0,
    looting: 10,
    combatEnd: 20,
    timePerTurn: 5
  },
  // ... etc
}
*/

/**
 * Get map tier configuration
 */
export function getMapTier(tier) {
  return mapTiers.find(t => t.tier === tier);
}

export default mapTiers;
```

---

### 5. Extension: `src/data/aiData.js`

**Purpose:** Add 5 new AI opponents for Extraction Mode and mode filtering

**Changes:**
Add to existing `aiData.js` file:

```javascript
// Existing AI (mark as VS Mode)
{
  id: 'AI_MANTICORE',
  name: 'Manticore - Class II Gunship',
  modes: ['vs'],  // NEW: Only for VS Mode
  // ... rest of existing AI
},

// Add new Extraction Mode AIs:

// TIER 1 - LOW THREAT (0-49% Instability)
{
  id: 'AI_SCOUT_1',
  name: 'Rogue Scout Pattern',
  modes: ['extraction'],  // NEW: Extraction Mode only
  personality: 'Defensive scout with minimal aggression',

  drones: [
    'Scout Drone',
    'Scout Drone',
    'Standard Fighter',
    'Interceptor',
    'Guardian Drone'
  ],

  deck: {
    'CARD001': 3,  // Laser Blast
    'CARD002': 4,  // System Reboot
    'CARD005': 3,  // Adrenaline Rush
    'CARD007': 4,  // Emergency Patch
    'CARD008': 3,  // Shield Recharge
    'CARD009': 2,  // Target Lock
    'CARD015': 3,  // Streamline
    'CARD018': 4,  // Desperate Measures
    'CARD019': 2,  // Reposition
    'CARD003': 4,  // Out Think
    'CARD004': 4,  // Energy Surge
    'CARD016': 4,  // Static Field
  },

  shipComponents: {
    'BRIDGE_001': 'l',
    'POWERCELL_001': 'm',
    'DRONECONTROL_001': 'r'
  },

  difficulty: 'easy'
},

{
  id: 'AI_PATROL_1',
  name: 'Automated Patrol Unit',
  modes: ['extraction'],
  personality: 'Balanced combat AI',

  drones: [
    'Standard Fighter',
    'Standard Fighter',
    'Heavy Fighter',
    'Guardian Drone',
    'Interceptor'
  ],

  deck: {
    'CARD001': 4,  // Laser Blast
    'CARD012': 3,  // Armor-Piercing Shot
    'CARD002': 3,  // System Reboot
    'CARD005': 4,  // Adrenaline Rush
    'CARD006': 2,  // Nanobot Repair
    'CARD007': 3,  // Emergency Patch
    'CARD008': 3,  // Shield Recharge
    'CARD009': 2,  // Target Lock
    'CARD003': 4,  // Out Think
    'CARD004': 4,  // Energy Surge
    'CARD016': 4,  // Static Field
    'CARD018': 4,  // Desperate Measures
  },

  shipComponents: {
    'BRIDGE_001': 'l',
    'POWERCELL_001': 'm',
    'DRONECONTROL_001': 'r'
  },

  difficulty: 'easy'
},

// TIER 2 - MEDIUM THREAT (50-79% Instability)
{
  id: 'AI_CRUISER_1',
  name: 'Heavy Cruiser Defense Pattern',
  modes: ['extraction'],
  personality: 'Aggressive with heavy firepower',

  drones: [
    'Heavy Fighter',
    'Heavy Fighter',
    'Bomber',
    'Guardian Drone',
    'Aegis Drone'
  ],

  deck: {
    'CARD001': 4,  // Laser Blast
    'CARD012': 4,  // Armor-Piercing Shot
    'CARD013': 2,  // Focused Beam (if rare)
    'CARD002': 3,  // System Reboot
    'CARD005': 4,  // Adrenaline Rush
    'CARD006': 3,  // Nanobot Repair
    'CARD007': 2,  // Emergency Patch
    'CARD008': 4,  // Shield Recharge
    'CARD009': 3,  // Target Lock
    'CARD003': 3,  // Out Think
    'CARD004': 4,  // Energy Surge
    'CARD016': 4,  // Static Field
  },

  shipComponents: {
    'BRIDGE_001': 'l',
    'POWERCELL_001': 'm',
    'DRONECONTROL_001': 'r'
  },

  difficulty: 'medium'
},

{
  id: 'AI_HUNTER_1',
  name: 'Specialized Hunter Group',
  modes: ['extraction'],
  personality: 'Fast and aggressive interceptor',

  drones: [
    'Interceptor',
    'Interceptor',
    'Standard Fighter',
    'Bomber',
    'Swarm Drone'
  ],

  deck: {
    'CARD001': 4,  // Laser Blast
    'CARD012': 3,  // Armor-Piercing Shot
    'CARD002': 4,  // System Reboot
    'CARD005': 4,  // Adrenaline Rush
    'CARD006': 2,  // Nanobot Repair
    'CARD007': 3,  // Emergency Patch
    'CARD009': 4,  // Target Lock
    'CARD015': 4,  // Streamline
    'CARD019': 3,  // Reposition
    'CARD003': 3,  // Out Think
    'CARD004': 3,  // Energy Surge
    'CARD016': 3,  // Static Field
  },

  shipComponents: {
    'BRIDGE_001': 'l',
    'POWERCELL_001': 'm',
    'DRONECONTROL_001': 'r'
  },

  difficulty: 'medium'
},

// TIER 3 - HIGH THREAT (80-100% Instability)
{
  id: 'AI_BLOCKADE_1',
  name: 'Capital-Class Blockade Fleet',
  modes: ['extraction'],
  personality: 'Overwhelming force, heavy defenses',

  drones: [
    'Heavy Fighter',
    'Bomber',
    'Bomber',
    'Aegis Drone',
    'Guardian Drone'
  ],

  deck: {
    'CARD001': 4,  // Laser Blast
    'CARD012': 4,  // Armor-Piercing Shot
    'CARD013': 2,  // Focused Beam
    'CARD002': 4,  // System Reboot
    'CARD005': 4,  // Adrenaline Rush
    'CARD006': 4,  // Nanobot Repair
    'CARD007': 3,  // Emergency Patch
    'CARD008': 4,  // Shield Recharge
    'CARD009': 3,  // Target Lock
    'CARD003': 2,  // Out Think
    'CARD004': 3,  // Energy Surge
    'CARD016': 3,  // Static Field
  },

  shipComponents: {
    'BRIDGE_001': 'l',
    'POWERCELL_001': 'm',
    'DRONECONTROL_001': 'r'
  },

  difficulty: 'hard'
},
```

**Mode Filtering:**
```javascript
// Get AIs for Extraction Mode
const extractionAIs = fullAICollection.filter(ai => ai.modes.includes('extraction'));

// Get AIs for VS Mode
const vsAIs = fullAICollection.filter(ai => ai.modes.includes('vs'));

// Get AIs available in both modes
const bothModes = fullAICollection.filter(ai =>
  ai.modes.includes('vs') && ai.modes.includes('extraction')
);
```

**Note:**
- Verify card IDs match actual cardData.js. Adjust deck composition if needed.
- Mark existing VS Mode AIs with `modes: ['vs']`
- New AIs can have `modes: ['extraction']`, `modes: ['vs']`, or `modes: ['vs', 'extraction']` for both

---

## Implementation Details

### Deck Validation Logic

**Current Flow:**
1. DeckBuilder counts total cards
2. Validates type limits (Ordnance: 10, etc.)
3. Checks total === 30
4. Validates drone count === 10

**New Flow:**
1. DeckBuilder counts total cards
2. Validates type limits (unchanged)
3. Checks total === 40
4. Validates drone count based on mode:
   - Multiplayer: 10 drones
   - Single-Player: 5 drones (future phase)

**For Phase 1:** Only change the total card count validation.

### Data File Conventions

**All data files should:**
- Export a default array/object
- Include JSDoc comments
- Use consistent naming (camelCase for exports, PascalCase for files)
- Include helper functions where useful
- Be importable without side effects

**Example:**
```javascript
/**
 * Description
 */

export const dataCollection = [...];

export function helperFunction() { ... }

export default dataCollection;
```

---

## Code Examples

### Importing Starter Deck

**Before (StateInitializer.js):**
```javascript
export const startingDecklist = [
  { id: 'CARD018', quantity: 4 },
  // ... 40 cards hardcoded
];
```

**After (StateInitializer.js):**
```javascript
import { starterDeck } from '../../data/playerDeckData.js';

export const startingDecklist = starterDeck.decklist;
export const startingDroneList = starterDeck.drones.map(d => d.name);
export const startingShipComponents = starterDeck.shipComponents;
```

### Using Ship Data for Blueprints

```javascript
import fullShipData from '../data/shipData.js';

// Get ship components by rarity for blueprint progression
const commonShips = fullShipData.filter(ship => ship.rarity === 'Common');
const rareShips = fullShipData.filter(ship => ship.rarity === 'Rare');

// Ship components used for blueprint system
// Different rarities unlock different ship configurations
console.log(commonShips[0].name);  // "Standard Bridge"
console.log(rareShips[0].rarity);  // "Rare"
```

### Using PoI Data

```javascript
import { getRandomPoIType } from '../data/pointsOfInterestData.js';

// Generate random PoI for Tier 1
const poi = getRandomPoIType(1);
console.log(poi.name);  // "Munitions Storage Depot" (or other)
console.log(poi.baseSecurity);  // 15
console.log(poi.rewardType);  // "ORDNANCE_PACK"
```

---

## Validation Checklist

### Phase 1 Complete When:

- [ ] DeckBuilder.jsx accepts exactly 40 cards
- [ ] DeckBuilder.jsx uses new type limits (15/15/15/10)
- [ ] DeckBuilder.jsx rejects 39 and 41 cards
- [ ] cardData.js has `rarity` field on all 36 cards
- [ ] droneData.js has `rarity` field on all 20 drones
- [ ] shipData.js has `rarity` field on all ship components
- [ ] playerDeckData.js exports starter deck with 40 cards
- [ ] StateInitializer.js imports from playerDeckData.js
- [ ] Existing VS Mode deck selection still works
- [ ] pointsOfInterestData.js has 7 PoI types with image paths
- [ ] cardPackData.js has 4 pack types with guaranteed types & weights
- [ ] cardPackData.js exports RARITY_COLORS constants
- [ ] mapData.js has Tier 1 configuration
- [ ] aiData.js has 5 new Extraction Mode AI opponents
- [ ] aiData.js existing AIs marked with `modes: ['vs']`
- [ ] All new files import without errors
- [ ] Card count in starter deck totals exactly 40
- [ ] No console errors when running app
- [ ] No existing functionality broken

### Testing Commands

```bash
# Start dev server
npm start

# Open DeckBuilder
# 1. Add 40 cards manually
# 2. Verify "Valid" indicator appears
# 3. Remove 1 card, verify "Invalid" appears

# Test multiplayer
# 1. Start local game
# 2. Verify deck selection works
# 3. Verify combat loads without errors

# Import test
# 1. Open browser console
# 2. Check for import errors
# 3. Verify no 404s for new data files
```

---

## Known Issues

### Issue 1: AI Deck Card IDs
**Problem:** Card IDs in AI decks may not match actual cardData.js
**Mitigation:** Manually verify all CARD### IDs exist before testing
**Testing:** Import aiData.js and cross-reference with fullCardCollection

### Issue 2: Rarity Assignment
**Problem:** Need to manually assign appropriate rarities to all cards/drones/ships
**Mitigation:** Use `maxInDeck` as initial guide, adjust based on power level
**Testing:** Review all rarity assignments for balance

---

## Next Steps

**After Phase 1:**
- **Phase 2** (Persistence) becomes unblocked - needs saveGameSchema.js structure
- **Phase 4** (Map Generation) becomes unblocked - needs mapData.js
- **Phase 3** (Hangar UI) can reference ship blueprints and deck data
- **Phase 6** (Instability) can use PoI definitions and instability triggers
- **Phase 7** (Combat) can load new AI opponents
- **Phase 8** (Loot) can generate packs using cardPackData.js

**Immediate Next Phase:** Phase 2 (Persistence System) or Phase 4 (Map Generation) - both are now unblocked

---

## Notes

- No UI changes in this phase - purely data layer
- Multiplayer remains fully functional
- All changes are additive except DeckBuilder validation
- Data files use placeholder values where needed (will tune in Phase 13)
- Focus on structure over balance at this stage

---

**Phase Status:** Ready for Implementation
**Blocking:** Phases 2, 3, 4, 6, 7, 8
**Estimated Completion:** Day 2 of development
