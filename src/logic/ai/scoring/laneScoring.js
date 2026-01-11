// ========================================
// LANE SCORING
// ========================================
// Calculates the relative advantage/disadvantage in a lane
// Used to inform deployment and action decisions

import { SCORING_WEIGHTS } from '../aiConstants.js';

/**
 * Calculate drone power contribution to a lane
 * @param {Array} drones - Drones to calculate power for
 * @param {string} laneId - Lane ID for effective stat calculation
 * @param {Object} gameDataService - GameDataService instance
 * @param {Object} options - Optional state overrides for AI evaluation
 * @returns {number} Total power value
 */
const calculateDronePower = (drones, laneId, gameDataService, options = {}) => {
  return drones.reduce((sum, drone) => {
    const stats = gameDataService.getEffectiveStats(drone, laneId, options);

    // Reweighted scoring: Attack (4x) > Cost (2x) > Durability (0.5x)
    const attackValue = ((stats.attack || 0) + (stats.potentialShipDamage || 0)) * SCORING_WEIGHTS.ATTACK_MULTIPLIER;
    const classValue = (drone.class || 0) * SCORING_WEIGHTS.CLASS_MULTIPLIER;
    const durabilityValue = ((drone.hull || 0) + (drone.currentShields || 0)) * SCORING_WEIGHTS.DURABILITY_MULTIPLIER;

    return sum + attackValue + classValue + durabilityValue;
  }, 0);
};

/**
 * Get maximum speed among drones in a lane
 * @param {Array} drones - Drones to check
 * @param {string} laneId - Lane ID for effective stat calculation
 * @param {Object} gameDataService - GameDataService instance
 * @param {Object} options - Optional state overrides for AI evaluation
 * @returns {number} Maximum speed value
 */
const getMaxSpeed = (drones, laneId, gameDataService, options = {}) => {
  if (drones.length === 0) return 0;
  return Math.max(...drones.map(d => gameDataService.getEffectiveStats(d, laneId, options).speed));
};

/**
 * Calculate the AI's advantage/disadvantage in a lane
 *
 * @param {string} laneId - Lane to evaluate (lane1, lane2, lane3)
 * @param {Object} player2State - AI player state
 * @param {Object} player1State - Human player state
 * @param {Object} allSections - Object with player1 and player2 section arrays
 * @param {Function} getShipStatus - Function to get ship section status
 * @param {Object} gameDataService - GameDataService instance for stat calculations
 * @returns {number} Lane score (positive = AI advantage, negative = human advantage)
 */
export const calculateLaneScore = (laneId, player2State, player1State, allSections, getShipStatus, gameDataService) => {
  const aiDronesInLane = player2State.dronesOnBoard[laneId] || [];
  const humanDronesInLane = player1State.dronesOnBoard[laneId] || [];
  const laneIndex = parseInt(laneId.slice(-1)) - 1;

  // Create state override options for AI evaluation
  // This ensures conditional bonuses (like Avenger's +3 attack) are properly calculated
  // when evaluating temp states with hypothetical drone placements
  const aiOptions = {
    playerState: player2State,
    opponentState: player1State,
    placedSections: allSections
  };
  const humanOptions = {
    playerState: player1State,
    opponentState: player2State,
    placedSections: allSections
  };

  // Calculate drone power
  const aiPower = calculateDronePower(aiDronesInLane, laneId, gameDataService, aiOptions);
  const humanPower = calculateDronePower(humanDronesInLane, laneId, gameDataService, humanOptions);
  const baseScore = aiPower - humanPower;

  // Calculate speed advantage
  const aiMaxSpeed = getMaxSpeed(aiDronesInLane, laneId, gameDataService, aiOptions);
  const humanMaxSpeed = getMaxSpeed(humanDronesInLane, laneId, gameDataService, humanOptions);
  const speedScore = (aiMaxSpeed - humanMaxSpeed) * SCORING_WEIGHTS.SPEED_ADVANTAGE_MULTIPLIER;

  // Calculate health modifier based on AI ship section status
  // When AI's section is damaged/critical, their drones have stat penalties
  // making the lane less favorable for them
  let healthModifier = 0;

  const aiSectionName = allSections.player2[laneIndex];
  if (aiSectionName) {
    const aiSectionStatus = getShipStatus(player2State.shipSections[aiSectionName]);
    if (aiSectionStatus === 'damaged') healthModifier -= 20;
    if (aiSectionStatus === 'critical') healthModifier -= 40;
  }

  // NOTE: Per the total damage win condition model, we no longer give bonus
  // for attacking damaged/critical opponent sections. All hull damage contributes
  // equally toward the 60% threshold win condition. Lane control (being able to
  // attack AND defend) is more important than targeting specific weak sections.

  return baseScore + speedScore + healthModifier;
};

/**
 * Analyze the strategic state of a lane
 * @param {number} laneScore - Result from calculateLaneScore
 * @returns {Object} Lane analysis with boolean flags
 */
export const analyzeLaneState = (laneScore) => ({
  isLosingBadly: laneScore < -15,
  isWinningStrongly: laneScore > 15,
  isDominant: laneScore > 20,
  isBalanced: laneScore >= -15 && laneScore <= 15,
});
