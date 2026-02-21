/**
 * Save Game Migrations
 * Functions for migrating legacy save file formats to current format
 */

import { getAllTacticalItemIds } from '../../data/tacticalItemData.js';
import { debugLog } from '../../utils/debugLogger.js';

// --- Drone Slot Migrations ---

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

  const hasOldFormat = oldSlots.some(s => s.isDamaged !== undefined || s.droneName !== undefined);
  if (hasOldFormat) {
    debugLog('SAVE', 'Migrating drone slots from old format (isDamaged/droneName)', { slotCount: oldSlots.length });
  }

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

// --- Ship Slot Migrations ---

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
    if (oldSlot.drones) {
      debugLog('SAVE', 'Stripping legacy drones array from already-migrated ship slot', { slotId: oldSlot.id });
    }
    // Remove legacy drones array if present
    const { drones, ...rest } = oldSlot;
    return rest;
  }

  // Migrate from old format
  debugLog('SAVE', 'Migrating ship slot from legacy format to slot-based damage', { slotId: oldSlot.id, hasDrones: !!oldSlot.drones });
  const { drones, ...rest } = oldSlot;
  return {
    ...rest,
    droneSlots: convertDronesToSlots(drones),
    sectionSlots: convertComponentsToSectionSlots(oldSlot.shipComponents),
  };
}

// --- Tactical Item Migrations ---

/**
 * Migrate tactical items for old save files
 * Adds missing tacticalItems to player profile if not present
 * @param {Object} profile - Player profile to migrate
 * @returns {Object} Profile with tacticalItems ensured
 */
export function migrateTacticalItems(profile) {
  const allItemIds = getAllTacticalItemIds();

  // If no tacticalItems at all, create the object
  if (!profile.tacticalItems) {
    debugLog('SAVE', 'Backfilling missing tacticalItems object', { itemCount: allItemIds.length });
    return {
      ...profile,
      tacticalItems: allItemIds.reduce((acc, id) => {
        acc[id] = 0;
        return acc;
      }, {})
    };
  }

  // If tacticalItems exists but might be missing some IDs, add them
  const updatedItems = { ...profile.tacticalItems };
  const missingIds = allItemIds.filter(id => updatedItems[id] === undefined);
  if (missingIds.length > 0) {
    debugLog('SAVE', 'Backfilling missing tactical item IDs', { missingIds });
  }
  missingIds.forEach(id => {
    updatedItems[id] = 0;
  });

  return {
    ...profile,
    tacticalItems: updatedItems
  };
}
