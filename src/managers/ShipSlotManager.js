// ========================================
// SHIP SLOT MANAGER
// ========================================
// Manages ship slot CRUD, deck management, repair operations,
// and drone/component instance tracking for single-player mode.
// Extracted from GameStateManager — receives GSM via constructor injection.

import { ECONOMY } from '../data/economyData.js';
import { shipComponentCollection } from '../data/shipSectionData.js';
import { starterPoolCards, starterPoolDroneNames } from '../data/saveGameSchema.js';
import { convertComponentsToSectionSlots } from '../logic/migration/saveGameMigrations.js';
import { debugLog } from '../utils/debugLogger.js';

/** Template for an empty drone slot entry */
const EMPTY_DRONE_SLOT = { slotDamaged: false, assignedDrone: null };

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

  // --- DECK CRUD ---

  /**
   * Save deck data to a ship slot
   * @param {number} slotId - Slot ID (1-5, cannot modify 0)
   * @param {Object} deckData - { name, decklist, droneSlots, drones, shipComponents, shipId }
   */
  saveShipSlotDeck(slotId, deckData) {
    if (slotId === 0) {
      throw new Error('Cannot modify Slot 0 (immutable starter deck)');
    }

    const { name, decklist, droneSlots, drones, shipComponents, shipId } = deckData;
    const slots = [...this.gsm.state.singlePlayerShipSlots];
    const slotIndex = slots.findIndex(s => s.id === slotId);

    if (slotIndex === -1) {
      throw new Error(`Slot ${slotId} not found`);
    }

    // Clear old instances for this slot
    this.clearSlotInstances(slotId);

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
      shipId: shipId || null,
      status: 'active'
    };

    this.gsm.setState({ singlePlayerShipSlots: slots });
    debugLog('SP_SHIP', `Deck saved to slot ${slotId}`, { deckData });
  }

  /**
   * Delete deck from a ship slot, return cards to inventory
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

    // Return non-starter-pool cards to inventory
    const newInventory = { ...this.gsm.state.singlePlayerInventory };
    (slot.decklist || []).forEach(card => {
      if (!starterPoolCards.includes(card.id)) {
        newInventory[card.id] = (newInventory[card.id] || 0) + card.quantity;
      }
    });

    // Clear instances for this slot
    this.clearSlotInstances(slotId);

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
      singlePlayerInventory: newInventory,
      singlePlayerProfile: updatedProfile
    });

    debugLog('SP_SHIP', `Deck deleted from slot ${slotId}, cards returned to inventory`);
  }

  /**
   * Clear drone and component instances for a slot
   * @param {number} slotId - Slot ID
   */
  clearSlotInstances(slotId) {
    const droneInstances = this.gsm.state.singlePlayerDroneInstances.filter(
      i => i.shipSlotId !== slotId
    );
    const componentInstances = this.gsm.state.singlePlayerShipComponentInstances.filter(
      i => i.shipSlotId !== slotId
    );

    this.gsm.setState({
      singlePlayerDroneInstances: droneInstances,
      singlePlayerShipComponentInstances: componentInstances
    });
  }

  /**
   * Update drone slot order for a ship slot (for Repair Bay reordering)
   * Swaps only assignedDrone values; slotDamaged stays with the slot position
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
   * Repair a damaged drone slot
   * @param {number} slotId - Ship slot ID (1-5, cannot modify 0)
   * @param {number} position - Drone slot position (0-4)
   * @returns {Object} { success, reason? }
   */
  repairDroneSlot(slotId, position) {
    if (slotId === 0) {
      return { success: false, reason: 'Cannot modify Slot 0 (immutable starter deck)' };
    }

    const slots = [...this.gsm.state.singlePlayerShipSlots];
    const slotIndex = slots.findIndex(s => s.id === slotId);

    if (slotIndex === -1) {
      return { success: false, reason: `Slot ${slotId} not found` };
    }

    const slot = slots[slotIndex];
    if (!slot.droneSlots?.[position]) {
      return { success: false, reason: `Drone position ${position} not found` };
    }

    // Support both old (isDamaged) and new (slotDamaged) field names
    const droneSlot = slot.droneSlots[position];
    const isCurrentlyDamaged = droneSlot.slotDamaged ?? droneSlot.isDamaged ?? false;

    if (!isCurrentlyDamaged) {
      return { success: false, reason: 'Drone slot is not damaged' };
    }

    const cost = ECONOMY.DRONE_SLOT_REPAIR_COST || 50;
    const profile = { ...this.gsm.state.singlePlayerProfile };

    if (profile.credits < cost) {
      return { success: false, reason: `Insufficient credits. Need ${cost}, have ${profile.credits}` };
    }

    profile.credits -= cost;

    // Repair the slot (set both old and new field names for compatibility)
    slots[slotIndex] = {
      ...slot,
      droneSlots: slot.droneSlots.map((ds, i) =>
        i === position ? { ...ds, slotDamaged: false, isDamaged: false } : ds
      )
    };

    this.gsm.setState({
      singlePlayerShipSlots: slots,
      singlePlayerProfile: profile
    });

    debugLog('SP_REPAIR', `Repaired drone slot ${position} in ship slot ${slotId} for ${cost} credits`);
    return { success: true };
  }

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

  // --- DRONE & COMPONENT INSTANCES ---

  /**
   * Create a drone instance for tracking damage
   * Only for non-starter-pool drones
   * @param {string} droneName - Name of the drone
   * @param {number} slotId - Ship slot ID
   * @returns {string|null} Instance ID or null if starter pool drone
   */
  createDroneInstance(droneName, slotId) {
    // Starter pool drones don't need instances (never damaged)
    if (starterPoolDroneNames.includes(droneName)) {
      return null;
    }

    const instanceId = `DRONE_${crypto.randomUUID()}`;
    const instance = {
      instanceId,
      droneName,
      shipSlotId: slotId,
      isDamaged: false
    };

    const instances = [...this.gsm.state.singlePlayerDroneInstances, instance];
    this.gsm.setState({ singlePlayerDroneInstances: instances });

    debugLog('SP_DRONE', `Created drone instance: ${instanceId} for ${droneName}`);
    return instanceId;
  }

  /**
   * Update drone instance damage state
   * @param {string} instanceId - Instance ID
   * @param {boolean} isDamaged - New damage state
   */
  updateDroneInstance(instanceId, isDamaged) {
    const instances = [...this.gsm.state.singlePlayerDroneInstances];
    const index = instances.findIndex(inst => inst.instanceId === instanceId);

    if (index >= 0) {
      instances[index] = { ...instances[index], isDamaged };
      this.gsm.setState({ singlePlayerDroneInstances: instances });
      debugLog('SP_DRONE', `Drone instance ${instanceId} damage updated to ${isDamaged}`);
    } else {
      debugLog('SP_DRONE', `⚠️ Drone instance ${instanceId} not found`);
    }
  }

  /**
   * Find drone instance by slot ID and drone name
   * @param {number} slotId - Ship slot ID
   * @param {string} droneName - Drone name
   * @returns {Object|null} Drone instance or null if not found
   */
  findDroneInstance(slotId, droneName) {
    return this.gsm.state.singlePlayerDroneInstances.find(
      inst => inst.shipSlotId === slotId && inst.droneName === droneName
    ) || null;
  }

  /**
   * Get damage state for all drones in a specific slot
   * Returns a map of drone name -> isDamaged boolean
   * Slot 0 always returns empty object (starter deck never persists damage)
   * @param {number} slotId - Ship slot ID
   * @returns {Object} Map of drone name to damage state
   */
  getDroneDamageStateForSlot(slotId) {
    // Slot 0 (starter deck) never has persisted damage
    if (slotId === 0) {
      return {};
    }

    const damageState = {};
    this.gsm.state.singlePlayerDroneInstances
      .filter(inst => inst.shipSlotId === slotId)
      .forEach(inst => {
        damageState[inst.droneName] = inst.isDamaged || false;
      });

    return damageState;
  }

  /**
   * Create a ship component instance for tracking hull damage
   * Only for non-starter-pool components
   * @param {string} componentId - Component ID
   * @param {number} slotId - Ship slot ID
   * @returns {string|null} Instance ID or null if starter pool component
   */
  createComponentInstance(componentId, slotId) {
    // Starter pool components don't need instances (never damaged)
    if (starterPoolCards.includes(componentId)) {
      return null;
    }

    const component = shipComponentCollection.find(c => c.id === componentId);
    if (!component) {
      throw new Error(`Component ${componentId} not found`);
    }

    const instanceId = `COMP_${crypto.randomUUID()}`;
    const instance = {
      instanceId,
      componentId,
      shipSlotId: slotId,
      currentHull: component.hull,
      maxHull: component.maxHull || component.hull
    };

    const instances = [...this.gsm.state.singlePlayerShipComponentInstances, instance];
    this.gsm.setState({ singlePlayerShipComponentInstances: instances });

    debugLog('SP_DRONE', `Created component instance: ${instanceId} for ${componentId}`);
    return instanceId;
  }
}

export default ShipSlotManager;
