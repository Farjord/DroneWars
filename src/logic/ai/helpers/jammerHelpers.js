// ========================================
// JAMMER DETECTION HELPERS
// ========================================
// Functions for detecting and analyzing Jammer drones
// Jammers block card targeting on non-Jammer drones in the same lane

/**
 * Check if a drone has the Jammer keyword
 * @param {Object} drone - The drone to check
 * @returns {boolean} True if drone has Jammer ability
 */
export const hasJammerKeyword = (drone) => {
  return drone.abilities?.some(ability =>
    ability.effect?.type === 'GRANT_KEYWORD' &&
    ability.effect?.keyword === 'JAMMER'
  );
};

/**
 * Check if a lane has any Jammer drones
 * @param {Object} playerState - Player state to check
 * @param {string} lane - Lane ID to check
 * @returns {boolean} True if lane contains at least one Jammer
 */
export const hasJammerInLane = (playerState, lane) => {
  return (playerState.dronesOnBoard[lane] || []).some(hasJammerKeyword);
};

/**
 * Get all Jammer drones from a specific lane
 * @param {Object} playerState - Player state to check
 * @param {string} lane - Lane ID to check
 * @returns {Array} Array of Jammer drones in the lane
 */
export const getJammerDronesInLane = (playerState, lane) => {
  return (playerState.dronesOnBoard[lane] || []).filter(hasJammerKeyword);
};
