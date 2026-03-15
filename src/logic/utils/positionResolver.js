// ========================================
// POSITION RESOLVER
// ========================================
// Pure functions for lane position awareness.
// Takes index + lane length, returns position facts.
// No game state, no React — foundation for position-based mechanics.

/**
 * Get the indices adjacent to a given position in a lane.
 * @param {number} index - Position index of the drone
 * @param {number} laneLength - Total number of drones in the lane
 * @returns {number[]} Array of adjacent indices
 */
export const getAdjacentIndices = (index, laneLength) => {
  if (laneLength <= 0 || index < 0 || index >= laneLength) return [];
  const indices = [];
  if (index > 0) indices.push(index - 1);
  if (index < laneLength - 1) indices.push(index + 1);
  return indices;
};

/**
 * Count how many adjacent friendly drones exist at a given position.
 * @param {number} droneIndex - Position index of the drone
 * @param {number} laneLength - Total number of drones in the lane
 * @returns {number} Number of adjacent drones (0, 1, or 2)
 */
export const getAdjacentFriendlyCount = (droneIndex, laneLength) => {
  return getAdjacentIndices(droneIndex, laneLength).length;
};

/**
 * Check whether a drone is exposed (fewer than 2 adjacent drones).
 * Edge drones and lone drones are exposed; middle drones with neighbors on both sides are not.
 * @param {number} droneIndex - Position index of the drone
 * @param {number} laneLength - Total number of drones in the lane
 * @returns {boolean} True if the drone is exposed
 */
export const isExposed = (droneIndex, laneLength) => {
  return getAdjacentFriendlyCount(droneIndex, laneLength) < 2;
};

/**
 * Generic dispatcher for data-driven position conditions.
 * @param {string} conditionType - Condition type identifier
 * @param {number} droneIndex - Position index of the drone
 * @param {number} laneLength - Total number of drones in the lane
 * @returns {*} Condition evaluation result (type depends on condition)
 */
export const evaluatePositionCondition = (conditionType, droneIndex, laneLength) => {
  switch (conditionType) {
    case 'EXPOSED':
      return isExposed(droneIndex, laneLength);
    case 'ADJACENT_FRIENDLY_COUNT':
      return getAdjacentFriendlyCount(droneIndex, laneLength);
    default:
      return null;
  }
};
