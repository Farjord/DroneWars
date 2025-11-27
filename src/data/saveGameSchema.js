/**
 * Save Game Schema
 * Defines the structure for single-player save files
 * Version 1.0
 */

import { starterDeck } from './playerDeckData.js';
import fullCardCollection from './cardData.js';

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

export const starterPoolDroneNames = starterDeck.drones.map(d => d.name);

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

  // Single seed for entire single-player game (deterministic map generation)
  gameSeed: Date.now(),

  // Statistics (optional for MVP)
  stats: {
    runsCompleted: 0,
    runsLost: 0,
    totalCreditsEarned: 0,
    totalCombatsWon: 0,
    totalCombatsLost: 0,
  }
};

/**
 * Default inventory - empty at start
 * Starter deck cards exist only in Ship Slot 0
 * This only contains cards acquired through gameplay (loot, crafting, packs)
 */
export const defaultInventory = {};

/**
 * Default drone instances - empty at start
 * Slot 0 drones don't need instances (never damaged)
 * Crafted drones will be added here with instanceId
 */
export const defaultDroneInstances = [];

/**
 * Default ship component instances - empty at start
 * Slot 0 components don't need instances (never damaged)
 * Components in slots 1-5 will be tracked here with hull damage
 * Format: { instanceId, componentId, shipSlotId, currentHull, maxHull }
 */
export const defaultShipComponentInstances = [];

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
  defaultShipSlots,
  starterPoolCards,
  starterPoolDroneNames,
  createDefaultShipSlot,
  createNewSave,
  validateSaveFile,
};
