// ========================================
// GAME ENGINE UTILITIES
// ========================================
// Shared helper functions for targeting and game logic
// Extracted from gameLogic.js for reuse across modular processors

/** Maximum drones (including tokens) allowed per player per lane */
export const MAX_DRONES_PER_LANE = 5;

/** Maximum Tech drones allowed per player per lane (separate from combat drones) */
export const MAX_TECH_PER_LANE = 5;

/**
 * Count drones pending arrival in a lane from prior effect chain selections.
 * These are "ghost" drones — selected to move but not yet in dronesOnBoard.
 *
 * @param {Array|null} selections - Effect chain selections array
 * @param {string} laneId - Lane ID to count arrivals for
 * @returns {number} Count of pending arrivals
 */
export const countPendingArrivals = (selections, laneId) => {
  if (!selections) return 0;
  return selections.reduce((count, sel) => {
    if (!sel || sel.skipped || sel.destination !== laneId) return count;
    return count + (Array.isArray(sel.target) ? sel.target.length : 1);
  }, 0);
};

/**
 * Check if a lane is at capacity for a given player
 *
 * @param {Object} playerState - Player state to check
 * @param {string} laneId - Lane ID ('lane1', 'lane2', 'lane3')
 * @param {Array|null} selections - Optional effect chain selections for ghost drone counting
 * @returns {boolean} True if lane has >= MAX_DRONES_PER_LANE drones
 */
export const isLaneFull = (playerState, laneId, selections = null) => {
  const realCount = playerState.dronesOnBoard[laneId]?.length || 0;
  const ghostCount = countPendingArrivals(selections, laneId);
  return (realCount + ghostCount) >= MAX_DRONES_PER_LANE;
};

/**
 * Get lane capacity information for a given player
 *
 * @param {Object} playerState - Player state to check
 * @param {string} laneId - Lane ID ('lane1', 'lane2', 'lane3')
 * @param {Array|null} selections - Optional effect chain selections for ghost drone counting
 * @returns {{ count: number, max: number, isFull: boolean }}
 */
export const getLaneCapacity = (playerState, laneId, selections = null) => {
  const realCount = playerState.dronesOnBoard[laneId]?.length || 0;
  const ghostCount = countPendingArrivals(selections, laneId);
  const count = realCount + ghostCount;
  return { count, max: MAX_DRONES_PER_LANE, isFull: count >= MAX_DRONES_PER_LANE };
};

/**
 * Find which lane a drone is in
 *
 * @param {string} droneId - Unique ID of the drone to find
 * @param {Object} playerState - Player state to search
 * @returns {string|null} Lane ID ('lane1', 'lane2', 'lane3') or null if not found
 */
export const getLaneOfDrone = (droneId, playerState) => {
    for (const [lane, drones] of Object.entries(playerState.dronesOnBoard)) {
        if (drones.some(d => d.id === droneId)) {
            return lane;
        }
    }
    // Also search techSlots
    if (playerState.techSlots) {
        for (const [lane, techs] of Object.entries(playerState.techSlots)) {
            if (techs.some(d => d.id === droneId)) {
                return lane;
            }
        }
    }
    return null;
};

/**
 * Check if a drone has the Jammer keyword
 *
 * @param {Object} drone - Drone object to check
 * @returns {boolean} True if drone has Jammer keyword
 */
export const hasJammerKeyword = (drone) => {
    return drone.abilities?.some(ability =>
        ability.effect?.type === 'GRANT_KEYWORD' &&
        ability.effect?.keyword === 'JAMMER'
    );
};

/**
 * Check if a lane has any ready (non-exhausted) Jammer drones
 *
 * @param {Object} playerState - Player state to check
 * @param {string} lane - Lane ID to check ('lane1', 'lane2', 'lane3')
 * @returns {boolean} True if lane has at least one ready Jammer
 */
export const hasJammerInLane = (playerState, lane) => {
    const boardJammer = (playerState.dronesOnBoard[lane] || []).some(drone =>
        hasJammerKeyword(drone) && !drone.isExhausted
    );
    if (boardJammer) return true;
    // Also check techSlots
    return (playerState.techSlots?.[lane] || []).some(drone =>
        hasJammerKeyword(drone) && !drone.isExhausted
    );
};

/**
 * Get all ready Jammer drones from a lane (searches both dronesOnBoard and techSlots)
 *
 * @param {Object} playerState - Player state to search
 * @param {string} lane - Lane ID to search ('lane1', 'lane2', 'lane3')
 * @returns {Array} Array of ready Jammer drones in the lane
 */
export const getJammerDronesInLane = (playerState, lane) => {
    const boardJammers = (playerState.dronesOnBoard[lane] || []).filter(drone =>
        hasJammerKeyword(drone) && !drone.isExhausted
    );
    const techJammers = (playerState.techSlots?.[lane] || []).filter(drone =>
        hasJammerKeyword(drone) && !drone.isExhausted
    );
    return [...boardJammers, ...techJammers];
};

/**
 * Count how many drones of a specific type are in a lane
 *
 * @param {Object} playerState - Player state to check
 * @param {string} droneName - Name of the drone type to count (e.g., "Jammer")
 * @param {string} laneId - Lane ID to check ('lane1', 'lane2', 'lane3')
 * @returns {number} Count of matching drones in the lane
 */
export const countDroneTypeInLane = (playerState, droneName, laneId) => {
    const boardCount = (playerState.dronesOnBoard[laneId] || []).filter(d => d.name === droneName).length;
    const techCount = (playerState.techSlots?.[laneId] || []).filter(d => d.name === droneName).length;
    return boardCount + techCount;
};
