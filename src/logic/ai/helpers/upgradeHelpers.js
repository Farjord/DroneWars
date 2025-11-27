// ========================================
// UPGRADE HELPERS
// ========================================
// Helper functions for upgrade card evaluation

import fullDroneCollection from '../../../data/droneData.js';

/**
 * Get count of deployed drones of a specific type across all lanes
 * @param {Object} playerState - Player state to check
 * @param {string} droneName - Name of drone type
 * @returns {number} Total count of deployed drones
 */
export const getDeployedDroneCount = (playerState, droneName) => {
  return Object.values(playerState.dronesOnBoard)
    .flat()
    .filter(d => d.name === droneName)
    .length;
};

/**
 * Get count of ready (non-exhausted) drones of a specific type
 * @param {Object} playerState - Player state to check
 * @param {string} droneName - Name of drone type
 * @returns {number} Count of ready drones
 */
export const getReadyDroneCountByType = (playerState, droneName) => {
  return Object.values(playerState.dronesOnBoard)
    .flat()
    .filter(d => d.name === droneName && !d.isExhausted)
    .length;
};

/**
 * Get all deployed drones of a specific type with lane info
 * @param {Object} playerState - Player state to check
 * @param {string} droneName - Name of drone type
 * @returns {Array} Array of drones with lane property
 */
export const getDeployedDronesOfType = (playerState, droneName) => {
  return Object.entries(playerState.dronesOnBoard)
    .flatMap(([lane, drones]) =>
      drones.filter(d => d.name === droneName).map(d => ({ ...d, lane }))
    );
};

/**
 * Get current effective deployment limit for a drone type
 * Accounts for limit upgrades already applied
 * @param {Object} playerState - Player state to check
 * @param {string} droneName - Name of drone type
 * @returns {number} Effective limit after upgrades
 */
export const getEffectiveDeploymentLimit = (playerState, droneName) => {
  const baseDrone = fullDroneCollection.find(d => d.name === droneName);
  if (!baseDrone) return 0;

  let limit = baseDrone.limit;

  // Check for limit upgrades in appliedUpgrades
  const upgrades = playerState.appliedUpgrades?.[droneName] || [];
  upgrades.forEach(upg => {
    if (upg.mod?.stat === 'limit') {
      limit += upg.mod.value;
    }
  });

  return limit;
};

/**
 * Get remaining deployment capacity for a drone type
 * @param {Object} playerState - Player state to check
 * @param {string} droneName - Name of drone type
 * @returns {number} Remaining deployments available
 */
export const getRemainingDeploymentCapacity = (playerState, droneName) => {
  const effectiveLimit = getEffectiveDeploymentLimit(playerState, droneName);
  const deployed = playerState.deployedDroneCounts?.[droneName] || 0;
  return Math.max(0, effectiveLimit - deployed);
};

/**
 * Get count of upgrade slots remaining for a drone type
 * @param {Object} playerState - Player state to check
 * @param {string} droneName - Name of drone type
 * @returns {number} Available upgrade slots
 */
export const getRemainingUpgradeSlots = (playerState, droneName) => {
  const baseDrone = fullDroneCollection.find(d => d.name === droneName);
  if (!baseDrone) return 0;

  const appliedCount = (playerState.appliedUpgrades?.[droneName] || []).length;
  return Math.max(0, baseDrone.upgradeSlots - appliedCount);
};

/**
 * Check if drone type has a specific keyword from upgrades
 * @param {Object} playerState - Player state to check
 * @param {string} droneName - Name of drone type
 * @param {string} keyword - Keyword to check for
 * @returns {boolean} True if drone has keyword from upgrade
 */
export const droneHasUpgradedKeyword = (playerState, droneName, keyword) => {
  const upgrades = playerState.appliedUpgrades?.[droneName] || [];
  return upgrades.some(upg =>
    upg.grantedAbilities?.some(ability =>
      ability.effect?.keyword === keyword
    ) ||
    upg.mod?.stat === 'ability' && upg.mod?.abilityToAdd?.effect?.keyword === keyword
  );
};
