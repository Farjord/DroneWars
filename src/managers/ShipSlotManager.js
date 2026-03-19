// ========================================
// SHIP SLOT MANAGER
// ========================================
// Manages ship slot CRUD, deck management, repair operations,
// and drone/component instance tracking for single-player mode.
// Extracted from GameStateManager — receives GSM via constructor injection.

import { ECONOMY } from '../data/economyData.js';
import { convertComponentsToSectionSlots } from '../logic/migration/saveGameMigrations.js';
import { debugLog } from '../utils/debugLogger.js';

/** Template for an empty drone slot entry */
const EMPTY_DRONE_SLOT = { assignedDrone: null };

/** Template for an empty section slot entry */
const EMPTY_SECTION_SLOT = { componentId: null, damageDealt: 0 };

/**
 * Create a fresh set of 5 empty drone slots
 * @returns {Array<Object>} Array of 5 empty drone slot objects
 */
function createEmptyDroneSlots() {
  return Array.from({ length: 5 }, (_, i) => ({ slotIndex: i, ...EMPTY_DRONE_SLOT }));
}

/**
 * Create fresh empty section slots for all 3 lanes
 * @returns {Object} Section slots with empty entries for l, m, r
 */
function createEmptySectionSlots() {
  return {
    l: { ...EMPTY_SECTION_SLOT },
    m: { ...EMPTY_SECTION_SLOT },
    r: { ...EMPTY_SECTION_SLOT }
  };
}

class ShipSlotManager {
  constructor(gameStateManager) {
    this.gsm = gameStateManager;
  }

  // --- SLOT MANAGEMENT ---

  /**
   * Set default ship slot for deployment
   * @param {number} slotId - Slot ID (0-5)
   */
  setDefaultShipSlot(slotId) {
    if (slotId < 0 || slotId > 5) {
      throw new Error('Invalid slot ID: must be 0-5');
    }

    const slot = this.gsm.state.singlePlayerShipSlots.find(s => s.id === slotId);
    if (!slot || slot.status !== 'active') {
      throw new Error(`Slot ${slotId} is not active`);
    }

    const updatedProfile = {
      ...this.gsm.state.singlePlayerProfile,
      defaultShipSlotId: slotId
    };

    this.gsm.setState({ singlePlayerProfile: updatedProfile });
    debugLog('SP_SHIP', `Default ship slot set to ${slotId}`);
  }

  /**
   * Check if a deck slot is unlocked
   * @param {number} slotId - Slot ID (0-5)
   * @returns {boolean} True if slot is unlocked
   */
  isSlotUnlocked(slotId) {
    const highestUnlocked = this.gsm.state.singlePlayerProfile?.highestUnlockedSlot ?? 0;
    return slotId <= highestUnlocked;
  }

  /**
   * Get the next slot available for unlocking
   * @returns {Object|null} { slotId, cost } or null if all unlocked
   */
  getNextUnlockableSlot() {
    const highestUnlocked = this.gsm.state.singlePlayerProfile?.highestUnlockedSlot ?? 0;
    const nextSlotId = highestUnlocked + 1;
    if (nextSlotId > 5) return null;
    return {
      slotId: nextSlotId,
      cost: ECONOMY.DECK_SLOT_UNLOCK_COSTS[nextSlotId],
    };
  }

  /**
   * Unlock the next deck slot (sequential unlocking enforced)
   * Deducts credits from player profile
   * @returns {Object} { success: boolean, slotId?: number, error?: string }
   */
  unlockNextDeckSlot() {
    const profile = this.gsm.state.singlePlayerProfile;
    const currentHighest = profile.highestUnlockedSlot ?? 0;
    const nextSlotId = currentHighest + 1;

    if (nextSlotId > 5) {
      return { success: false, error: 'All deck slots are already unlocked' };
    }

    const cost = ECONOMY.DECK_SLOT_UNLOCK_COSTS[nextSlotId];

    if (profile.credits < cost) {
      return {
        success: false,
        error: `Insufficient credits. Need ${cost}, have ${profile.credits}`,
      };
    }

    const updatedProfile = {
      ...profile,
      credits: profile.credits - cost,
      highestUnlockedSlot: nextSlotId,
    };

    this.gsm.setState({ singlePlayerProfile: updatedProfile });
    debugLog('SP_SHIP', `Unlocked deck slot ${nextSlotId} for ${cost} credits`);
    return { success: true, slotId: nextSlotId };
  }

  // --- SHIP ASSIGNMENT ---

  /**
   * Assign a ship to an empty slot, consuming it from inventory
   * @param {number} slotId - Slot ID (1-5)
   * @param {string} shipId - Ship ID to assign
   * @returns {Object} { success: boolean, error?: string }
   */
  assignShipToSlot(slotId, shipId) {
    if (slotId === 0) {
      return { success: false, error: 'Cannot modify Slot 0 (immutable starter deck)' };
    }

    const slots = this.gsm.state.singlePlayerShipSlots;
    const slot = slots.find(s => s.id === slotId);

    if (!slot) {
      return { success: false, error: `Slot ${slotId} not found` };
    }

    if (slot.status === 'active') {
      return { success: false, error: `Slot ${slotId} already has a ship assigned` };
    }

    if (!this.isSlotUnlocked(slotId)) {
      return { success: false, error: `Slot ${slotId} is locked` };
    }

    const inventory = { ...this.gsm.state.singlePlayerInventory };
    const available = inventory[shipId] || 0;

    if (available < 1) {
      return { success: false, error: `No ${shipId} available in inventory` };
    }

    // Consume ship from inventory
    inventory[shipId] = available - 1;
    if (inventory[shipId] === 0) delete inventory[shipId];

    // Assign ship to slot
    const updatedSlots = [...slots];
    const slotIndex = updatedSlots.findIndex(s => s.id === slotId);
    updatedSlots[slotIndex] = {
      ...updatedSlots[slotIndex],
      shipId,
      status: 'active',
    };

    this.gsm.setState({
      singlePlayerShipSlots: updatedSlots,
      singlePlayerInventory: inventory,
    });

    debugLog('SP_SHIP', `Assigned ${shipId} to slot ${slotId} (consumed from inventory)`);
    return { success: true };
  }

  // --- DECK CRUD ---

  /**
   * Save deck data to a ship slot
   * @param {number} slotId - Slot ID (1-5, cannot modify 0)
   * @param {Object} deckData - { name, decklist, droneSlots, drones, shipComponents }
   */
  saveShipSlotDeck(slotId, deckData) {
    if (slotId === 0) {
      throw new Error('Cannot modify Slot 0 (immutable starter deck)');
    }

    const { name, decklist, droneSlots, drones, shipComponents } = deckData;
    const slots = [...this.gsm.state.singlePlayerShipSlots];
    const slotIndex = slots.findIndex(s => s.id === slotId);

    if (slotIndex === -1) {
      throw new Error(`Slot ${slotId} not found`);
    }

    // Preserve existing sectionSlots OR convert from shipComponents
    // This ensures componentIds are properly populated for damage persistence
    let existingSectionSlots = slots[slotIndex].sectionSlots
      || convertComponentsToSectionSlots(shipComponents);

    // Update componentIds from shipComponents while preserving damageDealt
    if (shipComponents) {
      existingSectionSlots = { ...existingSectionSlots };
      Object.entries(shipComponents).forEach(([componentId, lane]) => {
        if (existingSectionSlots[lane]) {
          existingSectionSlots[lane] = {
            ...existingSectionSlots[lane],
            componentId
          };
        }
      });
    }

    slots[slotIndex] = {
      ...slots[slotIndex],
      name: name || `Ship ${slotId}`,
      decklist,
      // New format: droneSlots is the source of truth
      droneSlots: droneSlots || slots[slotIndex].droneSlots,
      // Legacy format for backward compatibility
      drones,
      shipComponents,
      sectionSlots: existingSectionSlots,
      // Ship is already assigned at the slot level via assignShipToSlot — preserve it
      status: 'active'
    };

    this.gsm.setState({ singlePlayerShipSlots: slots });
    debugLog('SP_SHIP', `Deck saved to slot ${slotId}`, { deckData });
  }

  /**
   * Delete deck from a ship slot, return ship to inventory
   * @param {number} slotId - Slot ID (1-5, cannot delete 0)
   */
  deleteShipSlotDeck(slotId) {
    if (slotId === 0) {
      throw new Error('Cannot delete Slot 0 (immutable starter deck)');
    }

    const slots = [...this.gsm.state.singlePlayerShipSlots];
    const slotIndex = slots.findIndex(s => s.id === slotId);

    if (slotIndex === -1) {
      throw new Error(`Slot ${slotId} not found`);
    }

    const slot = slots[slotIndex];
    if (slot.status !== 'active') {
      throw new Error(`Slot ${slotId} is not active`);
    }

    // Return ship to inventory if one was assigned
    let updatedInventory = this.gsm.state.singlePlayerInventory;
    if (slot.shipId) {
      updatedInventory = {
        ...updatedInventory,
        [slot.shipId]: (updatedInventory[slot.shipId] || 0) + 1,
      };
      debugLog('SP_SHIP', `Returned ${slot.shipId} to inventory from slot ${slotId}`);
    }

    // Reset slot to empty state
    slots[slotIndex] = {
      id: slotId,
      name: `Ship Slot ${slotId}`,
      status: 'empty',
      isImmutable: false,
      decklist: [],
      droneSlots: createEmptyDroneSlots(),
      // Legacy format for backward compatibility
      drones: [],
      shipComponents: {},
      sectionSlots: createEmptySectionSlots()
    };

    // If this was the default slot, reset to 0
    let updatedProfile = this.gsm.state.singlePlayerProfile;
    if (updatedProfile.defaultShipSlotId === slotId) {
      updatedProfile = { ...updatedProfile, defaultShipSlotId: 0 };
    }

    this.gsm.setState({
      singlePlayerShipSlots: slots,
      singlePlayerProfile: updatedProfile,
      singlePlayerInventory: updatedInventory,
    });

    debugLog('SP_SHIP', `Deck deleted from slot ${slotId}`);
  }

  /**
   * Update drone slot order for a ship slot (for Repair Bay reordering)
   * @param {number} slotId - Ship slot ID (0-5)
   * @param {Array} newDroneSlots - Updated drone slots array
   */
  updateShipSlotDroneOrder(slotId, newDroneSlots) {
    const slots = [...this.gsm.state.singlePlayerShipSlots];
    const slotIndex = slots.findIndex(s => s.id === slotId);

    if (slotIndex === -1) {
      debugLog('SP_SHIP', `⚠️ updateShipSlotDroneOrder: Slot ${slotId} not found`);
      return;
    }

    slots[slotIndex] = {
      ...slots[slotIndex],
      droneSlots: newDroneSlots
    };

    this.gsm.setState({ singlePlayerShipSlots: slots });
    debugLog('STATE_SYNC', `Drone order updated for slot ${slotId}`);
  }

  // --- REPAIR OPERATIONS ---

  /**
   * Repair a damaged section slot (fully repairs all damage)
   * @param {number} slotId - Ship slot ID (1-5, cannot modify 0)
   * @param {string} lane - Lane key ('l', 'm', or 'r')
   * @returns {Object} { success, reason? }
   */
  repairSectionSlot(slotId, lane) {
    if (slotId === 0) {
      return { success: false, reason: 'Cannot modify Slot 0 (immutable starter deck)' };
    }

    const slots = [...this.gsm.state.singlePlayerShipSlots];
    const slotIndex = slots.findIndex(s => s.id === slotId);

    if (slotIndex === -1) {
      return { success: false, reason: `Slot ${slotId} not found` };
    }

    const slot = slots[slotIndex];
    if (!slot.sectionSlots?.[lane]) {
      return { success: false, reason: `Lane ${lane} not found` };
    }

    const damageDealt = slot.sectionSlots[lane].damageDealt || 0;
    if (damageDealt <= 0) {
      return { success: false, reason: 'Section is not damaged' };
    }

    const costPerDamage = ECONOMY.SECTION_DAMAGE_REPAIR_COST || 200;
    const cost = damageDealt * costPerDamage;
    const profile = { ...this.gsm.state.singlePlayerProfile };

    if (profile.credits < cost) {
      return { success: false, reason: `Insufficient credits. Need ${cost}, have ${profile.credits}` };
    }

    profile.credits -= cost;

    // Repair the section (set damageDealt to 0)
    slots[slotIndex] = {
      ...slot,
      sectionSlots: {
        ...slot.sectionSlots,
        [lane]: { ...slot.sectionSlots[lane], damageDealt: 0 }
      }
    };

    this.gsm.setState({
      singlePlayerShipSlots: slots,
      singlePlayerProfile: profile
    });

    debugLog('SP_REPAIR', `Repaired section ${lane} in ship slot ${slotId} for ${cost} credits (${damageDealt} damage)`);
    return { success: true };
  }

  /**
   * Repair a section slot partially (incremental repair)
   * @param {number} slotId - Ship slot ID (1-5)
   * @param {string} lane - Lane identifier ('l', 'm', 'r')
   * @param {number} hpToRepair - Amount of HP to repair (default 1)
   * @returns {{ success: boolean, reason?: string, cost?: number, repairedHP?: number, remainingDamage?: number }}
   */
  repairSectionSlotPartial(slotId, lane, hpToRepair = 1) {
    if (slotId === 0) {
      return { success: false, reason: 'Cannot modify Slot 0 (immutable starter deck)' };
    }

    if (hpToRepair < 1) {
      return { success: false, reason: 'Must repair at least 1 HP' };
    }

    const slots = [...this.gsm.state.singlePlayerShipSlots];
    const slotIndex = slots.findIndex(s => s.id === slotId);

    if (slotIndex === -1) {
      return { success: false, reason: `Slot ${slotId} not found` };
    }

    const slot = slots[slotIndex];
    if (!slot.sectionSlots?.[lane]) {
      return { success: false, reason: `Lane ${lane} not found` };
    }

    const damageDealt = slot.sectionSlots[lane].damageDealt || 0;
    if (damageDealt <= 0) {
      return { success: false, reason: 'Section is not damaged' };
    }

    // Cap repair amount to actual damage
    const actualRepair = Math.min(hpToRepair, damageDealt);
    const costPerDamage = ECONOMY.SECTION_DAMAGE_REPAIR_COST || 200;
    const cost = actualRepair * costPerDamage;
    const profile = { ...this.gsm.state.singlePlayerProfile };

    if (profile.credits < cost) {
      return { success: false, reason: `Insufficient credits. Need ${cost}, have ${profile.credits}` };
    }

    profile.credits -= cost;

    // Reduce damage (partial repair)
    const newDamage = damageDealt - actualRepair;
    slots[slotIndex] = {
      ...slot,
      sectionSlots: {
        ...slot.sectionSlots,
        [lane]: { ...slot.sectionSlots[lane], damageDealt: newDamage }
      }
    };

    this.gsm.setState({
      singlePlayerShipSlots: slots,
      singlePlayerProfile: profile
    });

    debugLog('SP_REPAIR', `Partial repair: ${actualRepair} HP on section ${lane} in slot ${slotId} for ${cost} credits (${newDamage} damage remaining)`);
    return {
      success: true,
      cost,
      repairedHP: actualRepair,
      remainingDamage: newDamage
    };
  }

}

export default ShipSlotManager;
