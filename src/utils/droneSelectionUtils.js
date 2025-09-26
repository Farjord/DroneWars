// ========================================
// DRONE SELECTION UTILITIES
// ========================================
// Standalone utility functions for drone selection phase logic
// Handles initialization and management of drone selection data

/**
 * Initialize drone selection data for the beginning of a game
 * @param {Array} droneCollection - Full collection of available drones
 * @returns {Object} Object containing droneSelectionTrio and droneSelectionPool
 */
export const initializeDroneSelection = (droneCollection) => {
  if (!droneCollection || droneCollection.length === 0) {
    throw new Error('droneCollection must be a non-empty array');
  }

  // Create a shuffled copy of the drone collection
  const shuffledDrones = [...droneCollection].sort(() => 0.5 - Math.random());

  // First 3 drones become the initial trio for selection
  const trio = shuffledDrones.slice(0, 3);

  // Remaining drones go into the pool for future trios
  const pool = shuffledDrones.slice(3);

  console.log(`🎲 Initialized drone selection: ${trio.length} in trio, ${pool.length} in pool`);
  console.log(`🎯 Initial trio: ${trio.map(d => d.name).join(', ')}`);

  return {
    droneSelectionTrio: trio,
    droneSelectionPool: pool
  };
};

/**
 * Advance to the next trio of drones during selection
 * @param {Array} currentPool - Current pool of remaining drones
 * @param {number} trioSize - Number of drones to include in next trio (default: 3)
 * @returns {Object} Object containing new trio and updated pool
 */
export const advanceDroneSelectionTrio = (currentPool, trioSize = 3) => {
  if (!currentPool || currentPool.length === 0) {
    console.warn('⚠️ No drones remaining in pool for next trio');
    return {
      droneSelectionTrio: [],
      droneSelectionPool: []
    };
  }

  // Take next set of drones from the pool
  const newTrio = currentPool.slice(0, trioSize);
  const remainingPool = currentPool.slice(trioSize);

  console.log(`🔄 Advanced drone trio: ${newTrio.map(d => d.name).join(', ')}`);
  console.log(`📦 Remaining in pool: ${remainingPool.length} drones`);

  return {
    droneSelectionTrio: newTrio,
    droneSelectionPool: remainingPool
  };
};

/**
 * Check if there are enough drones remaining for another trio
 * @param {Array} currentPool - Current pool of remaining drones
 * @param {number} trioSize - Required trio size (default: 3)
 * @returns {boolean} True if another trio can be formed
 */
export const canFormNextTrio = (currentPool, trioSize = 3) => {
  return currentPool && currentPool.length >= trioSize;
};

/**
 * Get total number of possible trios from a drone collection
 * @param {Array} droneCollection - Full drone collection
 * @param {number} trioSize - Size of each trio (default: 3)
 * @returns {number} Total number of trios that can be formed
 */
export const getTotalTriosAvailable = (droneCollection, trioSize = 3) => {
  if (!droneCollection || droneCollection.length === 0) {
    return 0;
  }
  return Math.floor(droneCollection.length / trioSize);
};

/**
 * Validate drone selection data structure
 * @param {Object} droneSelectionData - Data object to validate
 * @returns {boolean} True if data is valid
 */
export const validateDroneSelectionData = (droneSelectionData) => {
  if (!droneSelectionData || typeof droneSelectionData !== 'object') {
    return false;
  }

  const { droneSelectionTrio, droneSelectionPool } = droneSelectionData;

  // Check that both properties exist and are arrays
  if (!Array.isArray(droneSelectionTrio) || !Array.isArray(droneSelectionPool)) {
    return false;
  }

  // Check that trio doesn't exceed reasonable size
  if (droneSelectionTrio.length > 5) {
    return false;
  }

  // Check that all drones have required properties
  const allDrones = [...droneSelectionTrio, ...droneSelectionPool];
  return allDrones.every(drone =>
    drone &&
    typeof drone === 'object' &&
    typeof drone.name === 'string' &&
    drone.name.length > 0
  );
};