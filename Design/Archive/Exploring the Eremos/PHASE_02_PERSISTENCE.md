# Phase 2: Persistence System

## Overview

Phase 2 implements the save/load system for single-player mode. This includes JSON-based save file serialization, file download/upload functionality, save game schema definition, and MIA protocol detection. The system must prevent save-scumming while providing reliable persistence across sessions.

**What This Phase Accomplishes:**
- JSON save file structure definition
- File download/upload service implementation
- Integration with GameStateManager for SP state
- MIA detection on unexpected exits
- Ship slot management (6 slots, slot 0 immutable)
- Save file validation and error handling

---

## Estimated Time

**1 day** (4-6 hours total)

**Breakdown:**
- Save schema definition: 1 hour
- SaveGameService implementation: 2-3 hours
- GameStateManager integration: 1-2 hours
- Testing and validation: 1 hour

---

## Dependencies

**Requires:**
- Phase 1 (Foundation) - needs saveGameSchema structure, playerDeckData

**Blocks:**
- Phase 3 (Hangar UI) - hangar needs to load/save profiles
- Phase 10 (MIA System) - needs save state tracking
- All gameplay phases indirectly (need persistence)

---

## Files to Create

### 1. `src/data/saveGameSchema.js`

**Purpose:** Define default save file structure and validation schema

```javascript
/**
 * Save Game Schema
 * Defines the structure for single-player save files
 * Version 1.0
 */

import { starterDeck } from './playerDeckData.js';

export const SAVE_VERSION = '1.0';

/**
 * Default player profile (new game)
 */
export const defaultPlayerProfile = {
  saveVersion: SAVE_VERSION,
  createdAt: Date.now(),
  lastPlayedAt: Date.now(),

  // Currency
  credits: 1000,
  securityTokens: 0,

  // Progression - empty at start
  unlockedBlueprints: [],

  // Statistics (optional for MVP)
  stats: {
    runsCompleted: 0,
    runsLost: 0,
    totalCreditsEarned: 0,
    totalCombatsWon: 0,
    totalCombatsLost: 0,
  }
};

### Blueprint System (Clarified)

**Blueprints = Permanent Unlock List**

Blueprints are simply IDs of Ship Components and Drones that the player has discovered:

```javascript
unlockedBlueprints: [
  'BRIDGE_002',              // Unlocked ship component
  'POWERCELL_002',           // Unlocked ship component
  'DRONE_HEAVY_FIGHTER',     // Unlocked drone
]
```

**What They Enable:**
- Player can spend credits to craft any unlocked blueprint
- Once unlocked, blueprints are permanent (survive MIA)
- Similar to card collection, but craftable

**What They Are NOT:**
- NOT ship chassis/templates
- NOT separate data structures with hull/stats
- NO separate blueprint data file needed

**Starting State:**
- Player starts with `unlockedBlueprints: []` (empty)
- Slot 0 pre-built with starter deck (immutable)
- Inventory contains all cards from starter deck

/**
 * Create default ship slot
 */
export function createDefaultShipSlot(id) {
  if (id === 0) {
    // Slot 0: Immutable starter deck
    return {
      id: 0,
      name: 'Starter Deck',
      status: 'active',
      isImmutable: true,

      // Use starter deck configuration
      decklist: JSON.parse(JSON.stringify(starterDeck.decklist)),
      drones: JSON.parse(JSON.stringify(starterDeck.drones)),
      shipComponents: JSON.parse(JSON.stringify(starterDeck.shipComponents)),
    };
  } else {
    // Slots 1-5: Empty slots
    return {
      id,
      name: `Ship Slot ${id}`,
      status: 'empty',
      isImmutable: false,

      decklist: [],
      drones: [],
      shipComponents: {},
    };
  }
}

/**
 * Default ship slots (6 total)
 */
export const defaultShipSlots = Array.from({ length: 6 }, (_, i) =>
  createDefaultShipSlot(i)
);

/**
 * Default inventory - populated with starter deck cards
 * Player starts with all cards from starter deck
 */
export const defaultInventory = (() => {
  const inventory = {};

  // Add action cards from starter deck
  for (const card of starterDeck.decklist) {
    inventory[card.id] = (inventory[card.id] || 0) + card.quantity;
  }

  // Add ship components from starter deck (1 of each)
  for (const componentId of Object.keys(starterDeck.shipComponents)) {
    inventory[componentId] = 1;
  }

  // Add drones from starter deck (count by name)
  for (const drone of starterDeck.drones) {
    inventory[drone.name] = (inventory[drone.name] || 0) + 1;
  }

  return inventory;
})();

/**
 * Default drone instances - empty at start
 * Slot 0 drones don't need instances (never damaged)
 * Crafted drones will be added here with instanceId
 */
export const defaultDroneInstances = [];

/**
 * Default ship component instances - empty at start
 * Slot 0 ship components don't need instances (never damaged)
 * Crafted ship sections in slots 1-5 will be added here with instanceId
 */
export const defaultShipComponentInstances = [];

### Ship Component Instances (Hull Damage Tracking)

**CRITICAL**: Each ship section in slots 1-5 must track hull damage between runs.

**Structure**:
```javascript
shipComponentInstances: [
  {
    id: 'BRIDGE_001',              // Component type ID
    instanceId: 'ship_abc123',     // Unique instance ID
    currentHull: 8,                 // Current hull points
    maxHull: 10,                    // Maximum hull points
    assignedToSlot: 1,              // null if unassigned, 0-5 if in slot
    lane: 'l'                       // Lane assignment (l/m/r)
  },
  {
    id: 'POWERCELL_001',
    instanceId: 'ship_def456',
    currentHull: 10,
    maxHull: 10,
    assignedToSlot: 1,
    lane: 'm'
  }
]
```

**Why Separate Instances?**
- Each deck needs its own ship sections with independent hull tracking
- Slot 0 (starter) is exempt - stores ship components directly (never damaged or auto-repaired)
- Crafted ship sections in slots 1-5 must persist damage
- Enables repair bay UI to show which sections need repair

**Slot 0 Exception**:
```javascript
// Slot 0 stores ship components directly (legacy format)
shipComponents: {
  'BRIDGE_001': 'l',
  'POWERCELL_001': 'm',
  'DRONECONTROL_001': 'r'
}

// Slots 1-5 reference ship component instances
shipComponents: {
  'BRIDGE_001': {instanceId: 'ship_abc123'},
  'POWERCELL_001': {instanceId: 'ship_def456'},
  'DRONECONTROL_001': {instanceId: 'ship_ghi789'}
}
```

/**
 * Starter pool cards - cards with unlimited availability
 * All cards/components/drones from starter deck can be used in all 6 slots
 */
export const starterPoolCards = [
  // All action cards from starter deck
  ...starterDeck.decklist.map(c => c.id),
  // All ship components from starter deck
  ...Object.keys(starterDeck.shipComponents)
];

export const starterPoolDroneNames = starterDeck.drones.map(d => d.name);

/**
 * Create complete save game object
 */
export function createNewSave() {
  return {
    saveVersion: SAVE_VERSION,
    savedAt: Date.now(),

    playerProfile: JSON.parse(JSON.stringify(defaultPlayerProfile)),
    inventory: JSON.parse(JSON.stringify(defaultInventory)),
    droneInstances: [],              // Empty at start
    shipComponentInstances: [],      // NEW: Empty at start
    discoveredCards: [],             // NEW: Empty at start (no cards discovered yet)
    shipSlots: defaultShipSlots.map(slot => JSON.parse(JSON.stringify(slot))),
    currentRunState: null,
  };
}

/**
 * Validate save file structure
 */
export function validateSaveFile(saveData) {
  const errors = [];

  // Check required fields
  if (!saveData.saveVersion) errors.push('Missing saveVersion');
  if (!saveData.playerProfile) errors.push('Missing playerProfile');
  if (!saveData.inventory) errors.push('Missing inventory');
  if (!saveData.droneInstances) errors.push('Missing droneInstances');
  if (!saveData.shipComponentInstances) errors.push('Missing shipComponentInstances');
  if (!saveData.discoveredCards) errors.push('Missing discoveredCards');
  if (!saveData.shipSlots) errors.push('Missing shipSlots');

  // Check version compatibility
  if (saveData.saveVersion !== SAVE_VERSION) {
    errors.push(`Incompatible version: ${saveData.saveVersion} (expected ${SAVE_VERSION})`);
  }

  // Check ship slots
  if (saveData.shipSlots && saveData.shipSlots.length !== 6) {
    errors.push('Invalid ship slot count (expected 6)');
  }

  // Check slot 0 is immutable
  if (saveData.shipSlots && !saveData.shipSlots[0]?.isImmutable) {
    errors.push('Slot 0 must be immutable');
  }

  // Check drone instances structure
  if (saveData.droneInstances && !Array.isArray(saveData.droneInstances)) {
    errors.push('droneInstances must be an array');
  }

  // Check ship component instances structure
  if (saveData.shipComponentInstances && !Array.isArray(saveData.shipComponentInstances)) {
    errors.push('shipComponentInstances must be an array');
  }

  // Check discovered cards structure
  if (saveData.discoveredCards && !Array.isArray(saveData.discoveredCards)) {
    errors.push('discoveredCards must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  SAVE_VERSION,
  defaultPlayerProfile,
  defaultShipSlots,
  defaultInventory,
  defaultDroneInstances,
  starterPoolCards,
  starterPoolDroneNames,
  createNewSave,
  validateSaveFile,
};
```

### Dual Inventory Structure

**CRITICAL:** The save system uses TWO inventory structures:

**1. Master Inventory (Quantities)**
Tracks total quantities owned of each card/component/drone:
```javascript
inventory: {
  // Action cards
  'CARD001': 5,      // Total owned
  'CARD018': 10,

  // Ship components
  'BRIDGE_001': 2,
  'BRIDGE_002': 1,

  // Drones (total owned, NOT instances)
  'DRONE_SCOUT': 3,
  'DRONE_HEAVY': 2
}
```

**2. Drone Instances (Assignment & Damage Tracking)**
Tracks individual drone instances with unique IDs:
```javascript
droneInstances: [
  {
    id: 'DRONE_SCOUT',
    instanceId: 'drone_abc123',
    isDamaged: false,
    assignedToSlot: 1  // null if unassigned, 0-5 if in slot
  },
  {
    id: 'DRONE_HEAVY',
    instanceId: 'drone_def456',
    isDamaged: true,
    assignedToSlot: null  // Available for assignment
  }
]
```

**Why Both?**
- Master inventory: Shows totals for deck builder
- Drone instances: Enables damage tracking and repair mechanics
- Action cards: Can only be in ONE deck at a time (tracked via availability calculation)
- Drones: Assignment tracked via `assignedToSlot` field

### Starter Pool (Unlimited Availability)

ALL cards, drones, and ship components from the starter deck have **unlimited availability** - they can be used in all 6 ship slots simultaneously without being "consumed" from inventory.

**Starter Pool Contents:**

**Action Cards (14 unique):**
- CARD018, CARD019, CARD009, CARD007, CARD012, CARD005, CARD006, CARD015, CARD008, CARD001, CARD002, CARD003, CARD004, CARD016

**Ship Components (3):**
- BRIDGE_001, POWERCELL_001, DRONECONTROL_001

**Drones (5):**
- Scout Drone, Standard Fighter, Heavy Fighter, Guardian Drone, Repair Drone

**Implementation:**
```javascript
// Export from saveGameSchema.js
export const starterPoolCards = [
  ...starterDeck.decklist.map(c => c.id),  // All action cards
  ...Object.keys(starterDeck.shipComponents)  // All ship components
];

export const starterPoolDroneNames = starterDeck.drones.map(d => d.name);
```

### Card Availability Algorithm

**Critical Rule:** Action cards can only be in ONE deck at a time (except starter pool cards).

**Availability Calculation:**

```javascript
// Calculate availability for a card when building a deck
function getAvailableQuantity(cardId, currentSlotId, inventory, allShipSlots) {
  // Starter pool cards are unlimited
  if (starterPoolCards.includes(cardId)) {
    return Infinity;
  }

  // Non-starter cards: total owned minus what's in OTHER slots
  const totalOwned = inventory[cardId] || 0;

  let usedInOtherSlots = 0;
  for (const slot of allShipSlots) {
    if (slot.id === currentSlotId) continue;  // Skip current slot

    // Count in this slot's decklist
    const cardInSlot = slot.decklist.find(c => c.id === cardId);
    if (cardInSlot) {
      usedInOtherSlots += cardInSlot.quantity;
    }
  }

  return totalOwned - usedInOtherSlots;
}

// For ship components (similar logic)
function isComponentAvailable(componentId, currentSlotId, inventory, allShipSlots) {
  if (starterPoolCards.includes(componentId)) {
    return true;  // Unlimited
  }

  // Check if already used in another slot
  for (const slot of allShipSlots) {
    if (slot.id === currentSlotId) continue;
    if (Object.keys(slot.shipComponents).includes(componentId)) {
      return false;  // Already in use
    }
  }

  return (inventory[componentId] || 0) > 0;
}

// For drones (check instances)
function getAvailableDroneInstances(droneName, currentSlotId, droneInstances) {
  // Starter drones are unlimited
  if (starterPoolDroneNames.includes(droneName)) {
    return Infinity;
  }

  // Return instances not assigned to other slots
  return droneInstances.filter(d =>
    d.id === droneName &&
    (d.assignedToSlot === null || d.assignedToSlot === currentSlotId)
  );
}
```

**UI Implications:**
- Deck builder shows "Available: X" count per card
- Repair bay shows damaged drones from `droneInstances`
- Starter pool cards show "Available: ∞"

---

### 2. `src/services/SaveGameService.js`

**Purpose:** Handle save file serialization, download, and upload

```javascript
/**
 * Save Game Service
 * Handles saving and loading single-player game state
 * Uses file download/upload (no backend required)
 */

import { validateSaveFile, SAVE_VERSION } from '../data/saveGameSchema.js';

class SaveGameService {
  constructor() {
    this.currentSave = null;
  }

  /**
   * Serialize game state to JSON
   * @param {Object} playerProfile - Player profile data
   * @param {Object} inventory - Card inventory (master quantities)
   * @param {Array} droneInstances - Drone instances with damage tracking
   * @param {Array} shipComponentInstances - Ship component instances with hull tracking
   * @param {Array} discoveredCards - Array of discovered card IDs
   * @param {Array} shipSlots - Ship slots (6 total)
   * @param {Object|null} currentRunState - Current run state or null
   * @returns {Object} Save data object
   */
  serialize(playerProfile, inventory, droneInstances, shipComponentInstances, discoveredCards, shipSlots, currentRunState = null) {
    const saveData = {
      saveVersion: SAVE_VERSION,
      savedAt: Date.now(),
      playerProfile: {
        ...playerProfile,
        lastPlayedAt: Date.now(),
      },
      inventory: JSON.parse(JSON.stringify(inventory)),  // Deep copy
      droneInstances: JSON.parse(JSON.stringify(droneInstances)),  // Deep copy
      shipComponentInstances: JSON.parse(JSON.stringify(shipComponentInstances)),  // NEW
      discoveredCards: JSON.parse(JSON.stringify(discoveredCards)),                  // NEW
      shipSlots: JSON.parse(JSON.stringify(shipSlots)),  // Deep copy
      currentRunState: currentRunState ? JSON.parse(JSON.stringify(currentRunState)) : null,
    };

    return saveData;
  }

  /**
   * Deserialize JSON to game state
   * @param {Object} saveData - Save data from file
   * @returns {Object} Game state { playerProfile, inventory, droneInstances, shipComponentInstances, discoveredCards, shipSlots, currentRunState }
   */
  deserialize(saveData) {
    // Validate
    const validation = validateSaveFile(saveData);
    if (!validation.valid) {
      throw new Error(`Invalid save file: ${validation.errors.join(', ')}`);
    }

    // Check for MIA condition
    if (saveData.currentRunState !== null) {
      console.warn('Save file has active run state - triggering MIA protocol');
      saveData = this.triggerMIA(saveData);
    }

    return {
      playerProfile: saveData.playerProfile,
      inventory: saveData.inventory,
      droneInstances: saveData.droneInstances,
      shipComponentInstances: saveData.shipComponentInstances || [],  // NEW (with fallback for old saves)
      discoveredCards: saveData.discoveredCards || [],                  // NEW (with fallback for old saves)
      shipSlots: saveData.shipSlots,
      currentRunState: null,  // Always null on load (MIA if was active)
    };
  }

  /**
   * Trigger MIA protocol
   * Called when save file has currentRunState (unexpected exit during run)
   */
  triggerMIA(saveData) {
    const runState = saveData.currentRunState;
    if (!runState) return saveData;

    // Find active ship slot
    const activeSlot = saveData.shipSlots.find(slot => slot.id === runState.shipSlotId);
    if (!activeSlot) return saveData;

    // Mark ship as MIA
    activeSlot.status = 'mia';

    // Wipe collected loot (not transferred to inventory)
    console.log('MIA triggered: Loot lost', runState.collectedLoot);

    // Clear run state
    saveData.currentRunState = null;

    return saveData;
  }

  /**
   * Download save file as JSON
   */
  download(saveData, filename = 'eremos_save.json') {
    try {
      // Convert to JSON string (pretty-printed for readability)
      const jsonString = JSON.stringify(saveData, null, 2);

      // Create blob (no encoding - plain JSON)
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Save file downloaded:', filename);
      return { success: true };
    } catch (error) {
      console.error('Failed to download save:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load save file from upload
   */
  async load(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          // Parse JSON directly (no decoding)
          const saveData = JSON.parse(e.target.result);

          // Deserialize (includes validation and MIA detection)
          const gameState = this.deserialize(saveData);

          console.log('Save file loaded successfully');
          resolve(gameState);
        } catch (error) {
          console.error('Failed to parse save file:', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Quick save to localStorage (for testing/convenience)
   * Note: Not the primary save method per PRD
   */
  quickSave(saveData, slotName = 'quicksave') {
    try {
      const jsonString = JSON.stringify(saveData);
      localStorage.setItem(`eremos_${slotName}`, jsonString);
      console.log('Quick saved to localStorage:', slotName);
      return { success: true };
    } catch (error) {
      console.error('Failed to quick save:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Quick load from localStorage
   */
  quickLoad(slotName = 'quicksave') {
    try {
      const jsonString = localStorage.getItem(`eremos_${slotName}`);
      if (!jsonString) {
        throw new Error('No save found in slot: ' + slotName);
      }

      const saveData = JSON.parse(jsonString);
      const gameState = this.deserialize(saveData);

      console.log('Quick loaded from localStorage:', slotName);
      return gameState;
    } catch (error) {
      console.error('Failed to quick load:', error);
      throw error;
    }
  }

  /**
   * Check if save exists in localStorage
   */
  hasSave(slotName = 'quicksave') {
    return localStorage.getItem(`eremos_${slotName}`) !== null;
  }
}

// Singleton instance
const saveGameService = new SaveGameService();
export default saveGameService;
```

---

## Files to Modify

### 1. `src/managers/GameStateManager.js`

**Add single-player state properties and methods:**

```javascript
// Add to constructor state initialization:
constructor() {
  this.state = {
    // ... existing multiplayer state ...

    // Single-Player State (Extraction Mode)
    singlePlayerProfile: null,              // Player profile data
    singlePlayerInventory: {},              // Card inventory (master quantities)
    singlePlayerDroneInstances: [],         // Drone instances with damage tracking
    singlePlayerShipComponentInstances: [], // NEW: Ship component instances with hull tracking
    discoveredCards: [],                    // NEW: Array of discovered card IDs
    singlePlayerShipSlots: [],              // 6 ship slots
    currentRunState: null,                  // Active run state or null
  };
  // ... rest of constructor
}

// Add new methods:

/**
 * Load single-player save
 */
loadSinglePlayerSave(saveData) {
  this.setState({
    singlePlayerProfile: saveData.playerProfile,
    singlePlayerInventory: saveData.inventory,
    singlePlayerDroneInstances: saveData.droneInstances,
    singlePlayerShipComponentInstances: saveData.shipComponentInstances,
    discoveredCards: saveData.discoveredCards,
    singlePlayerShipSlots: saveData.shipSlots,
    currentRunState: saveData.currentRunState,
  });

  console.log('Single-player save loaded');
}

/**
 * Create new single-player profile
 */
createNewSinglePlayerProfile() {
  const newSave = createNewSave();  // From saveGameSchema
  this.loadSinglePlayerSave(newSave);

  console.log('New single-player profile created');
}

/**
 * Get current save data for serialization
 */
getSaveData() {
  return {
    playerProfile: this.state.singlePlayerProfile,
    inventory: this.state.singlePlayerInventory,
    droneInstances: this.state.singlePlayerDroneInstances,
    shipComponentInstances: this.state.singlePlayerShipComponentInstances,
    discoveredCards: this.state.discoveredCards,
    shipSlots: this.state.singlePlayerShipSlots,
    currentRunState: this.state.currentRunState,
  };
}

/**
 * Start run (create run state)
 */
startRun(shipSlotId, mapTier) {
  const shipSlot = this.state.singlePlayerShipSlots.find(s => s.id === shipSlotId);
  if (!shipSlot) {
    throw new Error('Invalid ship slot ID');
  }
  if (shipSlot.status !== 'active') {
    throw new Error(`Ship slot ${shipSlotId} is not active (status: ${shipSlot.status})`);
  }

  const runState = {
    shipSlotId,
    mapTier,
    instability: 0,
    playerPosition: null,
    collectedLoot: [],
    creditsEarned: 0,
    mapData: null,
  };

  this.setState({ currentRunState: runState });
  console.log('Run started:', runState);
}

/**
 * End run (clear run state, transfer loot)
 */
endRun(success = true) {
  const runState = this.state.currentRunState;
  if (!runState) {
    console.warn('No active run to end');
    return;
  }

  if (success) {
    // Transfer loot to inventory
    runState.collectedLoot.forEach(item => {
      if (item.type === 'card') {
        const cardId = item.cardId;
        this.state.singlePlayerInventory[cardId] =
          (this.state.singlePlayerInventory[cardId] || 0) + 1;
      } else if (item.type === 'blueprint') {
        const blueprintId = item.blueprintId;
        if (!this.state.singlePlayerProfile.unlockedBlueprints.includes(blueprintId)) {
          this.state.singlePlayerProfile.unlockedBlueprints.push(blueprintId);
        }
      }
    });

    // Add credits
    this.state.singlePlayerProfile.credits += runState.creditsEarned;

    // Update stats
    this.state.singlePlayerProfile.stats.runsCompleted++;
    this.state.singlePlayerProfile.stats.totalCreditsEarned += runState.creditsEarned;

    console.log('Run ended successfully - loot transferred');
  } else {
    // MIA: mark slot and update stats
    const shipSlot = this.state.singlePlayerShipSlots.find(
      s => s.id === runState.shipSlotId
    );
    if (shipSlot) {
      shipSlot.status = 'mia';
    }

    this.state.singlePlayerProfile.stats.runsLost++;
    console.log('Run ended - MIA protocol triggered');
  }

  // Clear run state
  this.setState({ currentRunState: null });
}
```

**Import additions at top of file:**
```javascript
import { createNewSave } from '../data/saveGameSchema.js';
```

---

## Implementation Details

### Save File Flow

**Save Process:**
```
Hangar Screen
  ↓
User clicks "Save Game"
  ↓
GameStateManager.getSaveData()
  ↓
SaveGameService.serialize(profile, inventory, slots, runState)
  ↓
SaveGameService.download(saveData, filename)
  ↓
Browser downloads file
```

**Load Process:**
```
Hangar Screen
  ↓
User uploads save file
  ↓
SaveGameService.load(file)
  ↓
Validate + Deserialize + MIA Check
  ↓
GameStateManager.loadSinglePlayerSave(saveData)
  ↓
Hangar refreshes with loaded state
```

### MIA Detection Logic

**Triggers:**
1. **Expected:** Player ship destroyed in combat → `endRun(false)`
2. **Expected:** Instability reaches 100% → `endRun(false)`
3. **Unexpected:** Save file has `currentRunState !== null` on load → MIA protocol

**MIA Protocol:**
```javascript
if (saveData.currentRunState !== null) {
  // Unexpected exit detected
  const shipSlot = findSlot(saveData.currentRunState.shipSlotId);
  shipSlot.status = 'mia';
  saveData.currentRunState = null;
  // Loot is lost
}
```

### Save File Structure Example

```json
{
  "saveVersion": "1.0",
  "savedAt": 1700000000000,
  "playerProfile": {
    "saveVersion": "1.0",
    "createdAt": 1700000000000,
    "lastPlayedAt": 1700000000000,
    "credits": 1500,
    "securityTokens": 2,
    "unlockedBlueprints": ["BRIDGE_002", "DRONE_HEAVY"],
    "stats": {
      "runsCompleted": 5,
      "runsLost": 2,
      "totalCreditsEarned": 3000,
      "totalCombatsWon": 8,
      "totalCombatsLost": 3
    }
  },
  "inventory": {
    "CARD001": 5,
    "CARD002": 3,
    "CARD018": 10,
    "BRIDGE_001": 1,
    "DRONE_SCOUT": 3
  },
  "droneInstances": [
    {
      "id": "DRONE_SCOUT",
      "instanceId": "drone_abc123",
      "isDamaged": false,
      "assignedToSlot": 1
    },
    {
      "id": "DRONE_HEAVY",
      "instanceId": "drone_def456",
      "isDamaged": true,
      "assignedToSlot": null
    }
  ],
  "shipComponentInstances": [
    {
      "id": "BRIDGE_001",
      "instanceId": "ship_abc123",
      "currentHull": 8,
      "maxHull": 10,
      "assignedToSlot": 1,
      "lane": "l"
    },
    {
      "id": "POWERCELL_002",
      "instanceId": "ship_def456",
      "currentHull": 15,
      "maxHull": 15,
      "assignedToSlot": 1,
      "lane": "m"
    }
  ],
  "discoveredCards": [
    "CARD001", "CARD002", "CARD018", "BRIDGE_002", "DRONE_HEAVY"
  ],
  "shipSlots": [
    {
      "id": 0,
      "name": "Starter Deck",
      "status": "active",
      "isImmutable": true,
      "decklist": [{"id": "CARD018", "quantity": 4}],
      "drones": [{"name": "Scout Drone"}],
      "shipComponents": {
        "BRIDGE_001": "l",
        "POWERCELL_001": "m",
        "DRONECONTROL_001": "r"
      }
    },
    {
      "id": 1,
      "name": "Ship Slot 1",
      "status": "empty",
      "isImmutable": false,
      "decklist": [],
      "drones": [],
      "shipComponents": {}
    }
  ],
  "currentRunState": null
}
```

---

## Code Examples

### Creating New Save

```javascript
import saveGameService from '../services/SaveGameService.js';
import gameStateManager from '../managers/GameStateManager.js';

// Create new profile
gameStateManager.createNewSinglePlayerProfile();

// Get save data
const saveData = gameStateManager.getSaveData();

// Download
saveGameService.download(
  saveGameService.serialize(
    saveData.playerProfile,
    saveData.inventory,
    saveData.droneInstances,
    saveData.shipComponentInstances,
    saveData.discoveredCards,
    saveData.shipSlots
  ),
  'my_save.json'
);
```

### Loading Save

```javascript
// File input handler
async function handleFileUpload(file) {
  try {
    const gameState = await saveGameService.load(file);
    gameStateManager.loadSinglePlayerSave(gameState);

    // Navigate to hangar
    gameStateManager.setState({ appState: 'hangar' });

    alert('Save loaded successfully!');
  } catch (error) {
    alert('Failed to load save: ' + error.message);
  }
}
```

### Quick Save/Load (Testing)

```javascript
// Quick save
const saveData = gameStateManager.getSaveData();
saveGameService.quickSave(
  saveGameService.serialize(
    saveData.playerProfile,
    saveData.inventory,
    saveData.droneInstances,
    saveData.shipComponentInstances,
    saveData.discoveredCards,
    saveData.shipSlots
  )
);

// Quick load
const gameState = saveGameService.quickLoad();
gameStateManager.loadSinglePlayerSave(gameState);
```

---

## Validation Checklist

### Phase 2 Complete When:

- [ ] saveGameSchema.js exports all default structures
- [ ] defaultInventory contains all starter deck cards
- [ ] defaultDroneInstances is empty array
- [ ] defaultShipComponentInstances is empty array
- [ ] starterPoolCards list exported from schema
- [ ] starterPoolDroneNames list exported from schema
- [ ] SaveGameService.js implements serialize/deserialize with new fields
- [ ] SaveGameService serialize() accepts shipComponentInstances and discoveredCards
- [ ] SaveGameService deserialize() returns shipComponentInstances and discoveredCards with fallbacks
- [ ] SaveGameService download() creates downloadable file (plain JSON, no Base64)
- [ ] SaveGameService load() parses uploaded file (plain JSON, no Base64 decoding)
- [ ] GameStateManager has SP state properties including shipComponentInstances and discoveredCards
- [ ] singlePlayerDroneInstances property in GameStateManager
- [ ] singlePlayerShipComponentInstances property in GameStateManager
- [ ] discoveredCards property in GameStateManager
- [ ] GameStateManager.createNewSinglePlayerProfile() works
- [ ] GameStateManager.loadSinglePlayerSave() includes all new fields
- [ ] GameStateManager.getSaveData() returns correct structure with all fields
- [ ] MIA detection triggers on unexpected exit
- [ ] Save file validation catches corrupted files
- [ ] Save file validation catches version mismatches
- [ ] Save file validation checks for shipComponentInstances
- [ ] Save file validation checks for discoveredCards
- [ ] Ship slot 0 is always immutable
- [ ] Ship slots have NO blueprintId, NO currentHull, NO maxHull
- [ ] Hull tracking is in shipComponentInstances, not ship slots
- [ ] unlockedBlueprints starts empty
- [ ] Quick save/load works for testing
- [ ] Downloaded save file can be re-uploaded

### Testing Procedures

```javascript
// Test 1: Create new profile
gameStateManager.createNewSinglePlayerProfile();
console.log(gameStateManager.state.singlePlayerProfile.credits);  // 1000

// Test 2: Modify and save
gameStateManager.state.singlePlayerProfile.credits = 5000;
const saveData = gameStateManager.getSaveData();
const serialized = saveGameService.serialize(
  saveData.playerProfile,
  saveData.inventory,
  saveData.droneInstances,
  saveData.shipComponentInstances,
  saveData.discoveredCards,
  saveData.shipSlots
);
saveGameService.download(serialized);

// Test 3: Load file
// Upload the downloaded file
// Verify credits === 5000

// Test 4: MIA detection
gameStateManager.startRun(0, 1);
const saveData = gameStateManager.getSaveData();
const saveWithRun = saveGameService.serialize(
  saveData.playerProfile,
  saveData.inventory,
  saveData.droneInstances,
  saveData.shipComponentInstances,
  saveData.discoveredCards,
  saveData.shipSlots,
  saveData.currentRunState
);
// Reload page, deserialize and verify ship slot status === 'mia'
```

---

## Known Issues

### Issue 1: No Save File Encryption
**Problem:** Save files are plain JSON
**Impact:** Users can easily edit save files (cheating possible)
**Mitigation:** Acceptable for MVP, single-player game
**Future:** Add encryption or backend validation if needed

### Issue 2: No Cloud Sync
**Problem:** Save files are local only
**Impact:** Users can't play across devices
**Mitigation:** File download/upload works for manual transfer
**Future:** Add optional cloud save feature

### Issue 3: Large Save Files
**Problem:** Inventory with many cards could bloat file size
**Impact:** Slow downloads/uploads
**Mitigation:** JSON is human-readable for debugging
**Future:** Optimize JSON structure if needed

---

## Next Steps

**After Phase 2:**
- **Phase 3** (Hangar UI) can implement Save/Load buttons
- **Phase 10** (MIA System) can use MIA detection logic
- All gameplay phases can rely on persistent state

**Immediate Next Phase:** Phase 3 (Hangar UI) or Phase 4 (Map Generation)

---

**Phase Status:** Ready for Implementation
**Blocking:** Phases 3, 10
**Estimated Completion:** Day 3 of development
