/**
 * Slot-Based Damage Utilities
 * Helper functions for calculating hull, damage effects, repair costs, and validation
 */

import { ECONOMY } from '../data/economyData.js';
import { shipComponentCollection } from '../data/shipSectionData.js';
import { getShipById, getDefaultShip } from '../data/shipData.js';
import fullDroneCollection from '../data/droneData.js';

/**
 * Calculate section hull values for a specific lane
 * @param {Object} shipSlot - Ship slot with sectionSlots and shipId
 * @param {string} lane - Lane key: 'l', 'm', or 'r'
 * @returns {Object} { current, max } hull values
 */
export function calculateSectionHull(shipSlot, lane) {
  const sectionSlot = shipSlot.sectionSlots?.[lane];
  if (!sectionSlot || !sectionSlot.componentId) {
    return { current: 0, max: 0 };
  }

  // Get ship card for baseline hull
  const shipCard = getShipById(shipSlot.shipId) || getDefaultShip();
  const laneBaseline = getShipLaneBaselineHull(shipCard, lane);

  // Get component for hull modifier
  const component = shipComponentCollection.find(c => c.id === sectionSlot.componentId);
  const hullModifier = component?.hullModifier || 0;

  const maxHull = laneBaseline + hullModifier;
  const currentHull = Math.max(0, maxHull - (sectionSlot.damageDealt || 0));

  return { current: currentHull, max: maxHull };
}

/**
 * Get ship's baseline hull for a specific lane
 * @param {Object} shipCard - Ship card data
 * @param {string} lane - Lane key: 'l', 'm', or 'r'
 * @returns {number} Baseline hull for that lane
 */
function getShipLaneBaselineHull(shipCard, lane) {
  // Ships may define per-lane hull, or use baseHull for all lanes
  if (shipCard.laneHull) {
    return shipCard.laneHull[lane] || shipCard.baseHull || 10;
  }
  // Use ship's baseHull, default to 10 if not defined
  return shipCard.baseHull || 10;
}

/**
 * Add a drone to the first available slot
 * @param {Array} slots - Current drone slots array
 * @param {string} droneName - Name of drone to add
 * @returns {Array} Updated slots array (new reference)
 */
export function addDroneToSlots(slots, droneName) {
  const newSlots = slots.map(s => ({ ...s }));
  const emptyIndex = newSlots.findIndex(s => s.assignedDrone === null);

  if (emptyIndex !== -1) {
    newSlots[emptyIndex] = { ...newSlots[emptyIndex], assignedDrone: droneName };
  }

  return newSlots;
}

/**
 * Remove a drone from slots (preserves slotDamaged state)
 * @param {Array} slots - Current drone slots array
 * @param {string} droneName - Name of drone to remove
 * @returns {Array} Updated slots array (new reference)
 */
export function removeDroneFromSlots(slots, droneName) {
  const newSlots = slots.map(s => ({ ...s }));
  const droneIndex = newSlots.findIndex(s => s.assignedDrone === droneName);

  if (droneIndex !== -1) {
    newSlots[droneIndex] = { ...newSlots[droneIndex], assignedDrone: null };
  }

  return newSlots;
}

/**
 * Get the drone name from a slot (supports both old and new field names)
 * @param {Object} slot - Drone slot object
 * @returns {string|null} Drone name or null
 */
function getSlotDroneName(slot) {
  return slot?.assignedDrone ?? slot?.droneName ?? null;
}

/**
 * Check if a slot is damaged (supports both old and new field names)
 * @param {Object} slot - Drone slot object
 * @returns {boolean} Whether slot is damaged
 */
function isSlotDamaged(slot) {
  return slot?.slotDamaged ?? slot?.isDamaged ?? false;
}

/**
 * Get effective deployment limit for a drone in a slot
 * @param {Object} shipSlot - Ship slot with droneSlots
 * @param {number} slotIndex - Drone slot index (0-4)
 * @returns {number} Effective limit (reduced by 1 if damaged, min 1)
 */
export function getDroneEffectiveLimit(shipSlot, slotIndex) {
  const droneSlot = shipSlot.droneSlots?.[slotIndex];
  const droneName = getSlotDroneName(droneSlot);

  if (!droneSlot || !droneName) {
    return 0; // Empty slot
  }

  // Find drone data for base limit
  const droneData = fullDroneCollection.find(d => d.name === droneName);
  const baseLimit = droneData?.limit || 1;

  // Apply -1 if slot is damaged
  if (isSlotDamaged(droneSlot)) {
    return Math.max(1, baseLimit - 1);
  }

  return baseLimit;
}

/**
 * Calculate repair cost for a damaged drone slot
 * @returns {number} Flat repair cost
 */
export function calculateDroneSlotRepairCost() {
  return ECONOMY.DRONE_SLOT_REPAIR_COST || 50;
}

/**
 * Calculate repair cost for a damaged section
 * @param {number} damageDealt - Amount of damage dealt to the section
 * @returns {number} Total repair cost
 */
export function calculateSectionRepairCost(damageDealt) {
  if (damageDealt <= 0) return 0;
  return damageDealt * (ECONOMY.SECTION_DAMAGE_REPAIR_COST || 10);
}

/**
 * Validate ship slot configuration
 * @param {Object} shipSlot - Ship slot to validate
 * @returns {Object} { isValid, isIncomplete, isUndeployable, issues }
 */
export function validateShipSlot(shipSlot) {
  const issues = [];
  let isIncomplete = false;
  let isUndeployable = false;

  // Check drone slots for empty (supports both old and new field names)
  const filledDroneSlots = shipSlot.droneSlots?.filter(s => getSlotDroneName(s)) || [];
  if (filledDroneSlots.length < 5) {
    isIncomplete = true;
    issues.push(`Missing ${5 - filledDroneSlots.length} drone(s)`);
  }

  // Check section slots for empty
  const lanes = ['l', 'm', 'r'];
  const destroyedSections = [];

  for (const lane of lanes) {
    const sectionSlot = shipSlot.sectionSlots?.[lane];
    if (!sectionSlot?.componentId) {
      isIncomplete = true;
      issues.push(`Missing component in lane ${lane.toUpperCase()}`);
    } else {
      // Check if section is destroyed
      const hull = calculateSectionHull(shipSlot, lane);
      if (hull.current <= 0) {
        destroyedSections.push(lane);
      }
    }
  }

  // Ship is undeployable if ALL 3 sections are destroyed
  if (destroyedSections.length === 3) {
    isUndeployable = true;
    issues.push('All sections destroyed - ship cannot deploy');
  }

  const isValid = !isIncomplete && !isUndeployable;

  return { isValid, isIncomplete, isUndeployable, issues };
}

/**
 * Build active drone pool with effective limits from ship slot
 * @param {Object} shipSlot - Ship slot with droneSlots
 * @returns {Array} Drone objects with effectiveLimit property
 */
export function buildActiveDronePool(shipSlot) {
  const pool = [];

  if (!shipSlot.droneSlots) return pool;

  shipSlot.droneSlots.forEach((slot, index) => {
    const droneName = getSlotDroneName(slot);
    if (droneName) {
      const droneData = fullDroneCollection.find(d => d.name === droneName);
      if (droneData) {
        pool.push({
          ...droneData,
          slotIndex: slot.slotIndex ?? index,
          slotDamaged: isSlotDamaged(slot),
          effectiveLimit: getDroneEffectiveLimit(shipSlot, index)
        });
      }
    }
  });

  return pool;
}

/**
 * Get drone hand in slot order (for display)
 * @param {Object} shipSlot - Ship slot with droneSlots
 * @returns {Array} Drones in slot order, excluding empty slots
 */
export function getDroneHandOrder(shipSlot) {
  return buildActiveDronePool(shipSlot);
}

/**
 * Sync droneSlots to legacy drones array format
 * @param {Object} shipSlot - Ship slot to sync
 * @returns {Array} Legacy drones array
 */
export function syncDroneSlotsToLegacy(shipSlot) {
  if (!shipSlot.droneSlots) return [];

  return shipSlot.droneSlots
    .filter(slot => getSlotDroneName(slot))
    .map(slot => ({
      name: getSlotDroneName(slot),
      isDamaged: isSlotDamaged(slot)
    }));
}

/**
 * Sync sectionSlots to legacy shipComponents format
 * @param {Object} shipSlot - Ship slot to sync
 * @returns {Object} Legacy shipComponents object
 */
export function syncSectionSlotsToLegacy(shipSlot) {
  if (!shipSlot.sectionSlots) return {};

  const components = {};
  ['l', 'm', 'r'].forEach(lane => {
    const slot = shipSlot.sectionSlots[lane];
    if (slot?.componentId) {
      components[slot.componentId] = lane;
    }
  });

  return components;
}
