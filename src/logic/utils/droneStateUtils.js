// ========================================
// DRONE STATE UTILITIES
// ========================================
// Handles drone lifecycle events and deployed count tracking
// Extracted from gameLogic.js Phase 9.10 (Step 1)
// Extended to support drone availability system (PRD: drone_availability_rebuild_system_prd.md)

import {
  onDroneDestroyed as availabilityOnDestroyed,
  onDroneRecalled as availabilityOnRecalled
} from '../availability/DroneAvailabilityManager.js';

/**
 * Handle drone destruction
 *
 * Updates the deployed drone count when a drone is destroyed.
 * Also updates droneAvailability state if present (moves drone to rebuilding).
 * This count is used to track how many of each drone type are currently on the battlefield.
 *
 * Pure function that returns partial state update object
 *
 * @param {Object} playerState - Current player state
 * @param {Object} destroyedDrone - The drone that was destroyed
 * @returns {Object} Partial state update { deployedDroneCounts, droneAvailability? } or {} if no update needed
 */
export const onDroneDestroyed = (playerState, destroyedDrone) => {
  const updates = {};
  const droneName = destroyedDrone.name;

  // Update deployedDroneCounts (existing behavior)
  if (playerState.deployedDroneCounts?.hasOwnProperty(droneName)) {
    const newDeployedCounts = { ...playerState.deployedDroneCounts };
    if (newDeployedCounts[droneName] > 0) {
      newDeployedCounts[droneName] -= 1;
    }
    updates.deployedDroneCounts = newDeployedCounts;
  }

  // Update droneAvailability (new availability system)
  if (playerState.droneAvailability) {
    updates.droneAvailability = availabilityOnDestroyed(playerState.droneAvailability, droneName);
  }

  return updates;
};

/**
 * Handle drone recall
 *
 * Updates the deployed drone count when a drone is recalled (returned to active pool).
 * Also updates droneAvailability state if present (moves drone to ready - immediate availability).
 * This count is used to track how many of each drone type are currently on the battlefield.
 *
 * Pure function that returns partial state update object
 *
 * @param {Object} playerState - Current player state
 * @param {Object} recalledDrone - The drone that was recalled
 * @returns {Object} Partial state update { deployedDroneCounts, droneAvailability? } or {} if no update needed
 */
export const onDroneRecalled = (playerState, recalledDrone) => {
  const updates = {};
  const droneName = recalledDrone.name;

  // Update deployedDroneCounts (existing behavior)
  if (playerState.deployedDroneCounts?.hasOwnProperty(droneName)) {
    const newDeployedCounts = { ...playerState.deployedDroneCounts };
    if (newDeployedCounts[droneName] > 0) {
      newDeployedCounts[droneName] -= 1;
    }
    updates.deployedDroneCounts = newDeployedCounts;
  }

  // Update droneAvailability (new availability system - immediate ready)
  if (playerState.droneAvailability) {
    updates.droneAvailability = availabilityOnRecalled(playerState.droneAvailability, droneName);
  }

  return updates;
};
