// ========================================
// KEYWORD HELPERS
// ========================================
// Functions for detecting keywords and abilities on drones
//
// Note: DEFENDER keyword removed - all drones can now intercept multiple times
// without exhausting. HP/shields naturally limit interception capacity.

import fullDroneCollection from '../../../data/droneData.js';

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

/**
 * Check if a drone has a NOT_FIRST_ACTION conditional ability
 * These drones gain bonuses when they're not the first action of a turn
 * @param {Object} drone - The drone to check
 * @returns {boolean} True if drone has NOT_FIRST_ACTION ability
 */
export const hasNotFirstActionAbility = (drone) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  return baseDrone?.abilities?.some(ability =>
    ability.type === 'PASSIVE' &&
    ability.effect?.type === 'CONDITIONAL_MODIFY_STAT' &&
    ability.effect?.condition?.type === 'NOT_FIRST_ACTION'
  ) || false;
};

/**
 * Check if a player has any ready (non-exhausted) drones with NOT_FIRST_ACTION abilities on the board
 * Used to determine if goAgain cards should get the NOT_FIRST_ACTION_ENABLER_BONUS
 * @param {Object} playerState - The player's state object with dronesOnBoard
 * @returns {boolean} True if player has ready drones with NOT_FIRST_ACTION ability
 */
export const hasReadyNotFirstActionDrones = (playerState) => {
  if (!playerState?.dronesOnBoard) return false;

  for (const lane of ['lane1', 'lane2', 'lane3']) {
    const drones = playerState.dronesOnBoard[lane] || [];
    for (const drone of drones) {
      if (drone.isExhausted) continue; // Skip exhausted drones
      if (hasNotFirstActionAbility(drone)) return true;
    }
  }
  return false;
};

/**
 * Check if a drone has an ON_ROUND_START ability that increases threat
 * These drones generate threat each round and should be protected
 * @param {Object} drone - The drone to check
 * @returns {boolean} True if drone has threat-per-round ability
 */
export const hasThreatOnRoundStart = (drone) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  return baseDrone?.abilities?.some(ability =>
    ability.type === 'TRIGGERED' &&
    ability.trigger === 'ON_ROUND_START' &&
    ability.effect?.type === 'INCREASE_THREAT'
  ) || false;
};

/**
 * Check if a drone increases threat when dealing hull damage to ship sections
 * These drones should prioritize attacking ship sections over drones
 * @param {Object} drone - The drone to check
 * @returns {boolean} True if drone has threat-on-ship-hull-damage ability
 */
export const hasThreatOnShipHullDamage = (drone) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  return baseDrone?.abilities?.some(ability =>
    ability.conditionalEffects?.some(ce =>
      ce.condition?.type === 'ON_SHIP_SECTION_HULL_DAMAGE' &&
      ce.grantedEffect?.type === 'INCREASE_THREAT'
    )
  ) || false;
};
