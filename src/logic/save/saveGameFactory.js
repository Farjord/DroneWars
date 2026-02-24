/**
 * Save Game Factory
 * Functions for creating new save game objects and ship slot configurations
 */

import { starterDeck } from '../../data/playerDeckData.js';
import {
  SAVE_VERSION,
  defaultPlayerProfile,
  defaultInventory,
  defaultDiscoveredCards,
} from '../../data/saveGameSchema.js';
import { createEmptyDroneSlots, convertComponentsToSectionSlots } from '../migration/saveGameMigrations.js';

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
      decklist: structuredClone(starterDeck.decklist),
      shipComponents: structuredClone(starterDeck.shipComponents),

      // Slot-based damage format
      droneSlots: structuredClone(starterDeck.droneSlots),
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

    playerProfile: structuredClone(defaultPlayerProfile),
    inventory: structuredClone(defaultInventory),
    droneInstances: [],
    shipComponentInstances: [],
    discoveredCards: structuredClone(defaultDiscoveredCards),
    shipSlots: structuredClone(defaultShipSlots),
    quickDeployments: [],
    currentRunState: null,
  };
}
