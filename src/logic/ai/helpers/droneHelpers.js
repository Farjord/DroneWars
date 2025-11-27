// ========================================
// DRONE HELPERS
// ========================================
// Utility functions for drone queries and analysis

/**
 * Count drones of a specific type in a lane
 * @param {Object} playerState - Player state to check
 * @param {string} droneName - Name of drone type
 * @param {string} laneId - Lane to check
 * @returns {number} Count of drones with matching name
 */
export const countDroneTypeInLane = (playerState, droneName, laneId) => {
  if (!playerState.dronesOnBoard[laneId]) return 0;
  return playerState.dronesOnBoard[laneId].filter(d => d.name === droneName).length;
};

/**
 * Get all drones across all lanes for a player
 * @param {Object} playerState - Player state to check
 * @returns {Array} Array of all drones with their lane info
 */
export const getAllDronesWithLanes = (playerState) => {
  return Object.entries(playerState.dronesOnBoard).flatMap(([lane, drones]) =>
    drones.map(d => ({ ...d, lane }))
  );
};

/**
 * Get all ready (non-exhausted) drones across all lanes
 * @param {Object} playerState - Player state to check
 * @returns {Array} Array of ready drones with their lane info
 */
export const getReadyDronesWithLanes = (playerState) => {
  return Object.entries(playerState.dronesOnBoard).flatMap(([lane, drones]) =>
    drones.filter(d => !d.isExhausted).map(d => ({ ...d, lane }))
  );
};

/**
 * Get drones in a specific lane
 * @param {Object} playerState - Player state to check
 * @param {string} laneId - Lane ID to check
 * @returns {Array} Array of drones in the lane
 */
export const getDronesInLane = (playerState, laneId) => {
  return playerState.dronesOnBoard[laneId] || [];
};

/**
 * Get ready drones in a specific lane
 * @param {Object} playerState - Player state to check
 * @param {string} laneId - Lane ID to check
 * @returns {Array} Array of ready drones in the lane
 */
export const getReadyDronesInLane = (playerState, laneId) => {
  return (playerState.dronesOnBoard[laneId] || []).filter(d => !d.isExhausted);
};

/**
 * Count total drones on board
 * @param {Object} playerState - Player state to check
 * @returns {number} Total drone count
 */
export const getTotalDroneCount = (playerState) => {
  return Object.values(playerState.dronesOnBoard).flat().length;
};
