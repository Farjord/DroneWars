// ========================================
// KEYWORD HELPERS
// ========================================
// Functions for detecting keywords and abilities on drones

import fullDroneCollection from '../../../data/droneData.js';

/**
 * Check if a drone has the DEFENDER keyword
 * DEFENDER drones don't exhaust when intercepting, allowing multiple interceptions
 * @param {Object} drone - The drone to check
 * @returns {boolean} True if drone has DEFENDER keyword
 */
export const hasDefenderKeyword = (drone) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  return baseDrone?.abilities?.some(ability =>
    ability.effect?.type === 'GRANT_KEYWORD' &&
    ability.effect?.keyword === 'DEFENDER'
  ) || false;
};

/**
 * Check if a drone has a specific keyword
 * @param {Object} drone - The drone to check
 * @param {string} keyword - The keyword to look for
 * @returns {boolean} True if drone has the keyword
 */
export const hasKeyword = (drone, keyword) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  return baseDrone?.abilities?.some(ability =>
    ability.effect?.type === 'GRANT_KEYWORD' &&
    ability.effect?.keyword === keyword
  ) || false;
};

/**
 * Check if a drone has the GUARDIAN keyword
 * GUARDIAN drones block attacks on ship sections
 * @param {Object} drone - The drone to check
 * @returns {boolean} True if drone has GUARDIAN keyword
 */
export const hasGuardianKeyword = (drone) => {
  return hasKeyword(drone, 'GUARDIAN');
};

/**
 * Check if a drone has the ALWAYS_INTERCEPTS keyword
 * @param {Object} drone - The drone to check
 * @returns {boolean} True if drone has ALWAYS_INTERCEPTS keyword
 */
export const hasAlwaysInterceptsKeyword = (drone) => {
  return hasKeyword(drone, 'ALWAYS_INTERCEPTS');
};

/**
 * Check if a drone is an anti-ship drone (has BONUS_DAMAGE_VS_SHIP ability)
 * @param {Object} drone - The drone to check
 * @returns {boolean} True if drone has anti-ship ability
 */
export const isAntiShipDrone = (drone) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  return baseDrone?.abilities?.some(ability =>
    ability.type === 'PASSIVE' && ability.effect?.type === 'BONUS_DAMAGE_VS_SHIP'
  ) || false;
};

/**
 * Get the bonus ship damage value for a drone
 * @param {Object} drone - The drone to check
 * @returns {number} Bonus damage value, or 0 if none
 */
export const getBonusShipDamage = (drone) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  const ability = baseDrone?.abilities?.find(a =>
    a.type === 'PASSIVE' && a.effect?.type === 'BONUS_DAMAGE_VS_SHIP'
  );
  return ability?.effect?.value || 0;
};

/**
 * Check if a drone has an ON_MOVE triggered ability
 * @param {Object} drone - The drone to check
 * @returns {Object|null} The ON_MOVE ability if present, null otherwise
 */
export const getOnMoveAbility = (drone) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  return baseDrone?.abilities?.find(a =>
    a.type === 'TRIGGERED' && a.trigger === 'ON_MOVE'
  ) || null;
};

/**
 * Get all keywords from a drone's abilities
 * @param {Object} drone - The drone to check
 * @returns {Set<string>} Set of keyword strings
 */
export const getDroneKeywords = (drone) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  const keywords = new Set();

  baseDrone?.abilities?.forEach(ability => {
    if (ability.effect?.type === 'GRANT_KEYWORD' && ability.effect?.keyword) {
      keywords.add(ability.effect.keyword);
    }
  });

  return keywords;
};

/**
 * Check if a drone has the DOGFIGHT keyword
 * DOGFIGHT drones deal damage to attackers when intercepting
 * @param {Object} drone - The drone to check
 * @returns {boolean} True if drone has DOGFIGHT keyword
 */
export const hasDogfightKeyword = (drone) => {
  return hasKeyword(drone, 'DOGFIGHT');
};

/**
 * Check if a drone has the RETALIATE keyword
 * RETALIATE drones deal damage back to attackers when they survive an attack
 * @param {Object} drone - The drone to check
 * @returns {boolean} True if drone has RETALIATE keyword
 */
export const hasRetaliateKeyword = (drone) => {
  return hasKeyword(drone, 'RETALIATE');
};
