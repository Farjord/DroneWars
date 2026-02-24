/**
 * repairHelpers.js
 * Pure domain logic for repair bay operations
 *
 * Extracted from RepairBayScreen.jsx — drone/component lookups,
 * hull calculations, and damage counting with no React dependencies.
 */

import fullDroneCollection from '../../data/droneData.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { getAllShips } from '../../data/shipData.js';

/**
 * Get drone data by name
 * @param {string} droneName - Name of the drone to look up
 * @returns {Object|null} Drone data object or null
 */
export const getDroneByName = (droneName) => {
  return fullDroneCollection.find(d => d.name === droneName) || null;
};

/**
 * Get ship component by ID
 * @param {string} componentId - Component ID to look up
 * @returns {Object|null} Component data object or null
 */
export const getComponentById = (componentId) => {
  return shipComponentCollection.find(c => c.id === componentId) || null;
};

/**
 * Resolve component ID for a lane, falling back to shipComponents if sectionSlots has null
 * This handles legacy data where sectionSlots may have null componentIds but shipComponents has the data
 * @param {Object} slot - Ship slot object
 * @param {string} lane - Lane identifier ('l', 'm', or 'r')
 * @returns {string|null} Component ID or null if not found
 */
export const resolveComponentIdForLane = (slot, lane) => {
  // First try sectionSlots (preferred format)
  if (slot?.sectionSlots?.[lane]?.componentId) {
    return slot.sectionSlots[lane].componentId;
  }

  // Fallback to shipComponents legacy format: { componentId: lane }
  if (slot?.shipComponents) {
    const entry = Object.entries(slot.shipComponents).find(([_, l]) => l === lane);
    if (entry) return entry[0]; // componentId is the key
  }

  return null;
};

/**
 * Calculate section hull from ship and component
 * @param {Object} shipSlot - Ship slot object with sectionSlots and shipId
 * @param {string} lane - Lane identifier ('l', 'm', or 'r')
 * @returns {{current: number, max: number}} Hull values
 */
export const calculateSectionHull = (shipSlot, lane) => {
  const componentId = resolveComponentIdForLane(shipSlot, lane);
  if (!componentId) return { current: 0, max: 0 };

  const component = getComponentById(componentId);
  const sectionSlot = shipSlot?.sectionSlots?.[lane];
  const ship = getAllShips().find(s => s.id === shipSlot.shipId);

  if (!component || !ship) return { current: 0, max: 0 };

  // Base hull from component + ship bonus
  const maxHull = (component.stats?.hull || 0) + (ship.baseHull || 0);
  const damageDealt = sectionSlot.damageDealt || 0;
  const currentHull = Math.max(0, maxHull - damageDealt);

  return { current: currentHull, max: maxHull };
};

/**
 * Count damage in a ship slot (damaged drones and sections)
 * @param {Object} slot - Ship slot object
 * @returns {{drones: number, sections: number, total: number}} Damage counts
 */
export const countDamage = (slot) => {
  if (!slot || slot.status !== 'active') return { drones: 0, sections: 0, total: 0 };

  const damagedDrones = (slot.droneSlots || []).filter(s => s.slotDamaged && s.assignedDrone).length;
  const damagedSections = ['l', 'm', 'r'].filter(lane => {
    const componentId = resolveComponentIdForLane(slot, lane);
    const sectionSlot = slot.sectionSlots?.[lane];
    return componentId && (sectionSlot?.damageDealt || 0) > 0;
  }).length;

  return {
    drones: damagedDrones,
    sections: damagedSections,
    total: damagedDrones + damagedSections,
  };
};
