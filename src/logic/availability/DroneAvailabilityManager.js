// ========================================
// DRONE AVAILABILITY MANAGER
// ========================================
// Manages drone availability states and rebuild progression
// Implements the Drone Availability & Rebuild System from PRD
//
// Core state per drone type:
// - copyLimit: Max simultaneous ready copies (from drone.limit + upgrades)
// - rebuildRate: Units rebuilt per round (fractional supported)
// - readyCount: Available to deploy
// - inPlayCount: Currently on board
// - rebuildingCount: Destroyed, returning
// - rebuildProgress: Fractional progress toward next rebuild (0.0 - 0.999)
// - accelerationBonus: Bonus from effects (hook for future abilities)

import { debugLog } from '../../utils/debugLogger.js';

/**
 * Initialize availability state for all drones at combat start
 * All copies start as "ready" (available to deploy)
 *
 * @param {Array} activeDronePool - Array of drone definitions with { name, limit, rebuildRate }
 * @param {Object} appliedUpgrades - Optional upgrade map { droneName: [{ mod: { stat, value } }] }
 * @returns {Object} Availability state keyed by drone name
 */
export const initializeForCombat = (activeDronePool, appliedUpgrades = {}) => {
  const availability = {};

  for (const drone of activeDronePool) {
    // Calculate effective limit with upgrades
    let effectiveLimit = drone.limit;
    const droneUpgrades = appliedUpgrades[drone.name] || [];
    for (const upgrade of droneUpgrades) {
      if (upgrade.mod && upgrade.mod.stat === 'limit') {
        effectiveLimit += upgrade.mod.value;
      }
    }

    availability[drone.name] = {
      copyLimit: effectiveLimit,
      rebuildRate: drone.rebuildRate,
      readyCount: effectiveLimit, // All copies start ready
      inPlayCount: 0,
      rebuildingCount: 0,
      rebuildProgress: 0,
      accelerationBonus: 0
    };

    debugLog('AVAILABILITY', `[${drone.name}] Initialized:`, {
      limit: drone.limit,
      effectiveLimit,
      readyCount: effectiveLimit
    });
  }

  debugLog('AVAILABILITY', 'Full availability state initialized:', Object.keys(availability));
  return availability;
};

/**
 * Process rebuild progress at the start of each round
 * Advances rebuild progress by (rebuildRate + accelerationBonus)
 * Converts completed rebuilds to ready units
 *
 * @param {Object} droneAvailability - Current availability state
 * @returns {Object} Updated availability state (immutable)
 */
export const processRebuildProgress = (droneAvailability) => {
  const updated = {};

  for (const [droneName, state] of Object.entries(droneAvailability)) {
    // Clone the state
    const newState = { ...state };

    // Skip if no drones are rebuilding
    if (newState.rebuildingCount > 0) {
      // Calculate effective rebuild rate including acceleration
      const effectiveRate = newState.rebuildRate + newState.accelerationBonus;

      // Advance rebuild progress
      newState.rebuildProgress += effectiveRate;

      // Convert completed rebuilds to ready units
      while (newState.rebuildProgress >= 1.0 && newState.rebuildingCount > 0) {
        newState.rebuildProgress -= 1.0;
        newState.rebuildingCount -= 1;
        newState.readyCount += 1;
      }

      // NEW MODEL INVARIANT: readyCount + rebuildingCount = copyLimit (production slots)
      // inPlayCount is tracked separately and represents drones on the board
      // No cap needed since we only move units between ready and rebuilding
    }

    updated[droneName] = newState;
  }

  return updated;
};

/**
 * Handle drone deployment
 * Decrements readyCount, increments inPlayCount AND starts rebuilding immediately
 *
 * NEW MODEL: When a drone deploys, its production slot immediately starts rebuilding
 * This maintains invariant: readyCount + rebuildingCount = copyLimit
 *
 * @param {Object} droneAvailability - Current availability state
 * @param {string} droneName - Name of deployed drone
 * @returns {Object} Updated availability state (immutable)
 */
export const onDroneDeployed = (droneAvailability, droneName) => {
  debugLog('AVAILABILITY', `[${droneName}] onDroneDeployed called:`, {
    currentState: droneAvailability[droneName]
  });

  const state = droneAvailability[droneName];
  if (!state) {
    debugLog('AVAILABILITY', `[${droneName}] No state found - returning unchanged`);
    return droneAvailability;
  }

  const updated = { ...droneAvailability };
  updated[droneName] = { ...state };

  // Only deploy if we have ready copies
  if (updated[droneName].readyCount > 0) {
    updated[droneName].readyCount -= 1;
    updated[droneName].inPlayCount += 1;
    updated[droneName].rebuildingCount += 1; // NEW: Start rebuilding immediately
    debugLog('AVAILABILITY', `[${droneName}] Deployed - new state:`, updated[droneName]);
  } else {
    debugLog('AVAILABILITY', `[${droneName}] Cannot deploy - no ready copies`);
  }

  return updated;
};

/**
 * Handle drone destruction
 * Only decrements inPlayCount (rebuild was already started on deployment)
 *
 * NEW MODEL: Rebuilding starts when drone deploys, not when destroyed
 * Destruction just removes the drone from the board
 *
 * @param {Object} droneAvailability - Current availability state
 * @param {string} droneName - Name of destroyed drone
 * @returns {Object} Updated availability state (immutable)
 */
export const onDroneDestroyed = (droneAvailability, droneName) => {
  const state = droneAvailability[droneName];
  if (!state) return droneAvailability;

  const updated = { ...droneAvailability };
  updated[droneName] = { ...state };

  // Only process if we have drones in play
  if (updated[droneName].inPlayCount > 0) {
    updated[droneName].inPlayCount -= 1;
    // NOTE: No rebuildingCount++ - rebuild already started on deploy
  }

  return updated;
};

/**
 * Handle drone recall
 * Decrements inPlayCount, increments readyCount immediately
 * Recalled drones do NOT enter rebuilding state
 *
 * @param {Object} droneAvailability - Current availability state
 * @param {string} droneName - Name of recalled drone
 * @returns {Object} Updated availability state (immutable)
 */
export const onDroneRecalled = (droneAvailability, droneName) => {
  const state = droneAvailability[droneName];
  if (!state) return droneAvailability;

  const updated = { ...droneAvailability };
  updated[droneName] = { ...state };

  // Only process if we have drones in play
  if (updated[droneName].inPlayCount > 0) {
    updated[droneName].inPlayCount -= 1;
    updated[droneName].readyCount += 1;
  }

  return updated;
};

/**
 * Apply acceleration bonus to a drone type
 * Stacks with existing bonuses
 *
 * @param {Object} droneAvailability - Current availability state
 * @param {string} droneName - Name of drone to accelerate
 * @param {number} bonus - Acceleration bonus to add
 * @returns {Object} Updated availability state (immutable)
 */
export const applyAccelerationBonus = (droneAvailability, droneName, bonus) => {
  const state = droneAvailability[droneName];
  if (!state) return droneAvailability;

  const updated = { ...droneAvailability };
  updated[droneName] = { ...state };
  updated[droneName].accelerationBonus += bonus;

  return updated;
};

/**
 * Get the ready count for a drone type
 *
 * @param {Object} droneAvailability - Current availability state
 * @param {string} droneName - Name of drone
 * @returns {number} Number of ready copies (0 if unknown)
 */
export const getReadyCount = (droneAvailability, droneName) => {
  const state = droneAvailability[droneName];
  return state ? state.readyCount : 0;
};

/**
 * Check if a drone type can be deployed
 *
 * @param {Object} droneAvailability - Current availability state
 * @param {string} droneName - Name of drone
 * @returns {boolean} True if at least one copy is ready
 */
export const canDeploy = (droneAvailability, droneName) => {
  return getReadyCount(droneAvailability, droneName) > 0;
};
