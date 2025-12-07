/**
 * Save Game Schema
 * Defines the structure for single-player save files
 * Version 1.0
 */

import { starterDeck } from './playerDeckData.js';
import fullCardCollection from './cardData.js';
import { ECONOMY } from './economyData.js';

export const SAVE_VERSION = '1.0';

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

export const starterPoolDroneNames = starterDeck.droneSlots.filter(s => s.assignedDrone).map(s => s.assignedDrone);

/**
 * Starter pool ship - ship card from starter deck
 * Available in all 6 slots without needing to unlock
 */
export const starterPoolShipIds = [starterDeck.shipId];

/**
 * Default player profile (new game)
 */
export const defaultPlayerProfile = {
  saveVersion: SAVE_VERSION,
  createdAt: Date.now(),
  lastPlayedAt: Date.now(),

  // Currency
  credits: ECONOMY.STARTING_CREDITS,
  securityTokens: 0,
  aiCores: 0,  // Currency from defeating AI enemies, required for blueprint crafting

  // Progression - empty at start
  unlockedBlueprints: [],

  // Single seed for entire single-player game (deterministic map generation)
  gameSeed: Date.now(),

  // Default ship slot for deployment (0-5)
  defaultShipSlotId: 0,

  // Deck slot unlocking - highest slot number unlocked (0 = only starter)
  // Must unlock slots sequentially (Slot 1 before Slot 2, etc.)
  highestUnlockedSlot: 0,

  // Statistics (optional for MVP)
  stats: {
    runsCompleted: 0,
    runsLost: 0,
    totalCreditsEarned: 0,
    totalCombatsWon: 0,
    totalCombatsLost: 0,
    highestTierCompleted: 0,
  },

  // Reputation system - rewards players for risking custom loadouts
  reputation: {
    current: 0,             // Current reputation points
    level: 0,               // Current level (starts at 0)
    unclaimedRewards: [],   // Array of level numbers with unclaimed rewards
  },
};

/**
 * Default inventory - empty at start
 * Starter deck cards exist only in Ship Slot 0
 * This only contains cards acquired through gameplay (loot, crafting, packs)
 */
export const defaultInventory = {};

/**
 * Default drone instances - DEPRECATED (legacy support only)
 * Now using slot-based damage model with droneSlots array
 */
export const defaultDroneInstances = [];

/**
 * Default ship component instances - DEPRECATED (legacy support only)
 * Now using slot-based damage model with sectionSlots object
 */
export const defaultShipComponentInstances = [];

/**
 * Create empty drone slots array with new format
 * @returns {Array} 5 empty slots with { slotIndex, slotDamaged, assignedDrone }
 */
export function createEmptyDroneSlots() {
  return Array.from({ length: 5 }, (_, i) => ({
    slotIndex: i,
    slotDamaged: false,
    assignedDrone: null
  }));
}

/**
 * Migrate drone slots from old format to new format
 * Old format: { droneName, isDamaged }
 * New format: { slotIndex, slotDamaged, assignedDrone }
 * @param {Array} oldSlots - Old format slots or null/undefined
 * @returns {Array} New format slots (5 slots)
 */
export function migrateDroneSlotsToNewFormat(oldSlots) {
  if (!oldSlots) return createEmptyDroneSlots();

  return oldSlots.map((slot, i) => ({
    slotIndex: i,
    // Support both old field names and new field names (idempotent)
    slotDamaged: slot.slotDamaged ?? slot.isDamaged ?? false,
    assignedDrone: slot.assignedDrone ?? slot.droneName ?? null
  }));
}

/**
 * Convert legacy drone array format to new droneSlots format
 * Legacy format: [{ name }] (just drone names)
 * New format: [{ slotIndex, slotDamaged, assignedDrone }]
 * @param {Array} drones - Legacy format: [{ name, isDamaged? }]
 * @returns {Array} New format slots (5 slots)
 */
export function convertDronesToSlots(drones = []) {
  const slots = createEmptyDroneSlots();
  for (let i = 0; i < Math.min(5, drones.length); i++) {
    const drone = drones[i];
    if (drone) {
      slots[i] = {
        slotIndex: i,
        slotDamaged: drone.isDamaged || false,
        assignedDrone: drone.name || null
      };
    }
  }
  return slots;
}

/**
 * Convert old shipComponents format to new sectionSlots format
 * @param {Object} shipComponents - Old format: { componentId: lane }
 * @returns {Object} New format: { lane: { componentId, damageDealt } }
 */
export function convertComponentsToSectionSlots(shipComponents = {}) {
  const sectionSlots = {
    l: { componentId: null, damageDealt: 0 },
    m: { componentId: null, damageDealt: 0 },
    r: { componentId: null, damageDealt: 0 }
  };

  Object.entries(shipComponents).forEach(([componentId, lane]) => {
    if (sectionSlots[lane]) {
      sectionSlots[lane].componentId = componentId;
    }
  });

  return sectionSlots;
}

/**
 * Migrate old ship slot format to new slot-based damage format
 * @param {Object} oldSlot - Ship slot in old format
 * @returns {Object} Ship slot in new format
 */
export function migrateShipSlotToNewFormat(oldSlot) {
  // If already migrated (has droneSlots and sectionSlots), return as-is
  if (oldSlot.droneSlots && oldSlot.sectionSlots) {
    // Remove legacy drones array if present
    const { drones, ...rest } = oldSlot;
    return rest;
  }

  // Migrate from old format
  const { drones, ...rest } = oldSlot;
  return {
    ...rest,
    // Convert old drones array to new droneSlots
    droneSlots: convertDronesToSlots(drones),
    // Convert old shipComponents to new sectionSlots
    sectionSlots: convertComponentsToSectionSlots(oldSlot.shipComponents),
  };
}

/**
 * Default discovered cards - empty at start
 * Cards added when unlocked from card packs
 * Format: { cardId, state: 'owned' | 'discovered' | 'undiscovered' }
 * - 'owned': Player has the card in inventory or Ship Slot 0
 * - 'discovered': Player has seen the card but doesn't own it
 * - 'undiscovered': Player has never seen the card (default for cards not in this array)
 */
export const defaultDiscoveredCards = [];

/**
 * Default quick deployments - empty at start
 * Deck-agnostic deployment templates for turn 1
 * Format: { id, name, createdAt, droneRoster: string[], placements: { droneName, lane }[] }
 * - droneRoster: 5 unique drone names this deployment is designed for
 * - placements: which drones to deploy in which lanes (0=left, 1=middle, 2=right)
 * Maximum 5 quick deployments allowed
 */
export const defaultQuickDeployments = [];

/**
 * Create default ship slot
 * @param {number} id - Slot ID (0-5)
 * @returns {Object} Ship slot configuration
 */
export function createDefaultShipSlot(id) {
  if (id === 0) {
    // Slot 0: Immutable starter deck
    return {
      id: 0,
      name: 'Starter Deck',
      status: 'active',
      isImmutable: true,
      shipId: starterDeck.shipId,

      // Use starter deck configuration
      decklist: JSON.parse(JSON.stringify(starterDeck.decklist)),
      shipComponents: JSON.parse(JSON.stringify(starterDeck.shipComponents)),

      // Slot-based damage format
      droneSlots: JSON.parse(JSON.stringify(starterDeck.droneSlots)),
      sectionSlots: convertComponentsToSectionSlots(starterDeck.shipComponents),
    };
  } else {
    // Slots 1-5: Empty slots
    return {
      id,
      name: `Ship Slot ${id}`,
      status: 'empty',
      isImmutable: false,
      shipId: null,

      decklist: [],
      shipComponents: {},

      // Slot-based damage format
      droneSlots: createEmptyDroneSlots(),
      sectionSlots: {
        l: { componentId: null, damageDealt: 0 },
        m: { componentId: null, damageDealt: 0 },
        r: { componentId: null, damageDealt: 0 }
      },
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
 * Create complete save game object
 * @returns {Object} New save game data
 */
export function createNewSave() {
  return {
    saveVersion: SAVE_VERSION,
    savedAt: Date.now(),

    playerProfile: JSON.parse(JSON.stringify(defaultPlayerProfile)),
    inventory: JSON.parse(JSON.stringify(defaultInventory)),
    droneInstances: [],  // Empty at start
    shipComponentInstances: [],  // Empty at start
    discoveredCards: JSON.parse(JSON.stringify(defaultDiscoveredCards)),
    shipSlots: defaultShipSlots.map(slot => JSON.parse(JSON.stringify(slot))),
    quickDeployments: [],  // Empty at start - deck-agnostic deployment templates
    currentRunState: null,
  };
}

/**
 * Validate save file structure
 * @param {Object} saveData - Save data to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
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

  // Check player profile fields
  if (saveData.playerProfile) {
    if (typeof saveData.playerProfile.gameSeed !== 'number') {
      errors.push('playerProfile.gameSeed must be a number');
    }
    // Validate highestUnlockedSlot if present
    if (saveData.playerProfile.highestUnlockedSlot !== undefined) {
      if (typeof saveData.playerProfile.highestUnlockedSlot !== 'number' ||
          saveData.playerProfile.highestUnlockedSlot < 0 ||
          saveData.playerProfile.highestUnlockedSlot > 5) {
        errors.push('playerProfile.highestUnlockedSlot must be 0-5');
      }
    }
  }

  // Check ship slots
  if (saveData.shipSlots) {
    if (saveData.shipSlots.length !== 6) {
      errors.push('Invalid ship slot count (expected 6)');
    }

    // Check slot 0 is immutable
    if (saveData.shipSlots[0] && !saveData.shipSlots[0].isImmutable) {
      errors.push('Slot 0 must be immutable');
    }
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
  if (saveData.discoveredCards) {
    if (!Array.isArray(saveData.discoveredCards)) {
      errors.push('discoveredCards must be an array');
    } else {
      // Validate each entry has required fields
      for (const entry of saveData.discoveredCards) {
        if (!entry.cardId) {
          errors.push('discoveredCards entry missing cardId');
          break;
        }
        if (!['owned', 'discovered', 'undiscovered'].includes(entry.state)) {
          errors.push(`Invalid discoveredCards state: ${entry.state}`);
          break;
        }
      }
    }
  }

  // Check quick deployments structure (optional - may not exist in older saves)
  if (saveData.quickDeployments !== undefined) {
    if (!Array.isArray(saveData.quickDeployments)) {
      errors.push('quickDeployments must be an array');
    } else if (saveData.quickDeployments.length > 5) {
      errors.push('quickDeployments cannot exceed 5 entries');
    } else {
      // Validate each quick deployment has required fields
      for (const qd of saveData.quickDeployments) {
        if (!qd.id || typeof qd.id !== 'string') {
          errors.push('quickDeployment entry missing or invalid id');
          break;
        }
        if (!qd.name || typeof qd.name !== 'string') {
          errors.push('quickDeployment entry missing or invalid name');
          break;
        }
        if (!Array.isArray(qd.droneRoster) || qd.droneRoster.length !== 5) {
          errors.push('quickDeployment droneRoster must be array of 5 drones');
          break;
        }
        if (!Array.isArray(qd.placements)) {
          errors.push('quickDeployment placements must be an array');
          break;
        }
        // Validate placements
        for (const p of qd.placements) {
          if (!p.droneName || typeof p.lane !== 'number' || p.lane < 0 || p.lane > 2) {
            errors.push('quickDeployment placement invalid (needs droneName and lane 0-2)');
            break;
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  SAVE_VERSION,
  defaultPlayerProfile,
  defaultInventory,
  defaultDroneInstances,
  defaultShipComponentInstances,
  defaultDiscoveredCards,
  defaultQuickDeployments,
  defaultShipSlots,
  starterPoolCards,
  starterPoolDroneNames,
  starterPoolShipIds,
  createDefaultShipSlot,
  createNewSave,
  validateSaveFile,
};
