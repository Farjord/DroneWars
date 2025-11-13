// ========================================
// DRONE STATE UTILITIES
// ========================================
// Handles drone lifecycle events and deployed count tracking
// Extracted from gameLogic.js Phase 9.10 (Step 1)

/**
 * Handle drone destruction
 *
 * Updates the deployed drone count when a drone is destroyed.
 * This count is used to track how many of each drone type are currently on the battlefield.
 *
 * Pure function that returns partial state update object
 *
 * @param {Object} playerState - Current player state
 * @param {Object} destroyedDrone - The drone that was destroyed
 * @returns {Object} Partial state update { deployedDroneCounts } or {} if no update needed
 */
export const onDroneDestroyed = (playerState, destroyedDrone) => {
  if (!playerState.deployedDroneCounts.hasOwnProperty(destroyedDrone.name)) {
    return {};
  }

  const newDeployedCounts = { ...playerState.deployedDroneCounts };
  const droneName = destroyedDrone.name;

  if (newDeployedCounts[droneName] > 0) {
    newDeployedCounts[droneName] -= 1;
  }

  return { deployedDroneCounts: newDeployedCounts };
};

/**
 * Handle drone recall
 *
 * Updates the deployed drone count when a drone is recalled (returned to active pool).
 * This count is used to track how many of each drone type are currently on the battlefield.
 *
 * Pure function that returns partial state update object
 *
 * @param {Object} playerState - Current player state
 * @param {Object} recalledDrone - The drone that was recalled
 * @returns {Object} Partial state update { deployedDroneCounts } or {} if no update needed
 */
export const onDroneRecalled = (playerState, recalledDrone) => {
  if (!playerState.deployedDroneCounts.hasOwnProperty(recalledDrone.name)) {
    return {};
  }

  const newDeployedCounts = { ...playerState.deployedDroneCounts };
  const droneName = recalledDrone.name;

  if (newDeployedCounts[droneName] > 0) {
    newDeployedCounts[droneName] -= 1;
  }

  return { deployedDroneCounts: newDeployedCounts };
};
