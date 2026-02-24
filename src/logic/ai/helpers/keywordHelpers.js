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
const hasKeyword = (drone, keyword) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  return baseDrone?.abilities?.some(ability =>
    ability.effect?.type === 'GRANT_KEYWORD' &&
    ability.effect?.keyword === keyword
  ) || false;
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
