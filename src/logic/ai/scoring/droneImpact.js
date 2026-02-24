// ========================================
// DRONE IMPACT CALCULATION
// ========================================
// Calculates the game impact/value of a drone
// Used for trade decisions and interception analysis

import { SCORING_WEIGHTS } from '../aiConstants.js';

/**
 * Calculate combat impact score for a drone
 * Uses same weights as calculateLaneScore: Attack (4x) > Class (2x) > Durability (0.5x)
 * This provides a consistent measure of a drone's value across all AI decisions
 *
 * @param {Object} drone - The drone to evaluate
 * @param {string} lane - Lane ID for effective stat calculation
 * @param {Object} gameDataService - GameDataService instance for stat calculations
 * @returns {number} Impact score representing drone's overall game value
 */
export const calculateDroneImpact = (drone, lane, gameDataService) => {
  const stats = gameDataService.getEffectiveStats(drone, lane);

  // Use same weights as calculateLaneScore for consistency
  const attackValue = ((stats.attack || 0) + (stats.potentialShipDamage || 0)) * SCORING_WEIGHTS.ATTACK_MULTIPLIER;
  const classValue = (drone.class || 0) * SCORING_WEIGHTS.CLASS_MULTIPLIER;
  const durabilityValue = ((drone.hull || 0) + (drone.currentShields || 0)) * SCORING_WEIGHTS.DURABILITY_MULTIPLIER;

  return attackValue + classValue + durabilityValue;
};

