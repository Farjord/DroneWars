// ========================================
// MOVE EVALUATOR
// ========================================
// Evaluates drone movement actions (not card-based moves)

import fullDroneCollection from '../../data/droneData.js';
import { MOVE_EVALUATION, DEFENSE_URGENCY } from './aiConstants.js';
import { calculateLaneScore } from './scoring/laneScoring.js';
import { calculateDamagePercentage, calculateDefenseUrgency } from './helpers/hullIntegrityHelpers.js';

/**
 * Evaluate a drone move action
 * @param {Object} drone - The drone to move
 * @param {string} fromLane - Source lane
 * @param {string} toLane - Destination lane
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateMove = (drone, fromLane, toLane, context) => {
  const {
    player1,
    player2,
    gameDataService,
    allSections,
    getShipStatus,
    placedSections,
    opponentPlacedSections
  } = context;
  const logic = [];
  let score = 0;

  // Check if drone has INERT keyword - cannot move
  const effectiveStats = gameDataService.getEffectiveStats(drone, fromLane);
  if (effectiveStats.keywords.has('INERT')) {
    return { score: -Infinity, logic: ['⛔ INERT: Cannot move'] };
  }

  // Check if drone is Snared - move will be cancelled but clears status
  if (drone.isSnared) {
    return { score: -15, logic: ['⚠️ Snared: move will be cancelled but clears status'] };
  }

  // Check for INHIBIT_MOVEMENT keyword preventing moves out of this lane
  const aiDronesInFromLane = player2.dronesOnBoard[fromLane] || [];
  const hasMovementInhibitor = aiDronesInFromLane.some(d =>
    d.abilities?.some(a => a.effect?.keyword === 'INHIBIT_MOVEMENT')
  );
  if (hasMovementInhibitor) {
    return { score: -Infinity, logic: ['⛔ THRUSTER INHIBITOR: Cannot move out of lane'] };
  }

  // Calculate current lane scores
  const currentFromScore = calculateLaneScore(fromLane, player2, player1, allSections, getShipStatus, gameDataService);
  const currentToScore = calculateLaneScore(toLane, player2, player1, allSections, getShipStatus, gameDataService);

  // Simulate the move
  const tempAiState = JSON.parse(JSON.stringify(player2));
  const droneToMove = tempAiState.dronesOnBoard[fromLane].find(d => d.id === drone.id);
  if (droneToMove) {
    tempAiState.dronesOnBoard[fromLane] = tempAiState.dronesOnBoard[fromLane].filter(d => d.id !== drone.id);
    tempAiState.dronesOnBoard[toLane].push(droneToMove);
  }

  const projectedFromScore = calculateLaneScore(fromLane, tempAiState, player1, allSections, getShipStatus, gameDataService);
  const projectedToScore = calculateLaneScore(toLane, tempAiState, player1, allSections, getShipStatus, gameDataService);

  const toLaneImpact = projectedToScore - currentToScore;
  const fromLaneImpact = projectedFromScore - currentFromScore;

  // Base score is impact minus move cost
  score = (toLaneImpact + fromLaneImpact) - MOVE_EVALUATION.BASE_MOVE_COST;

  logic.push(`ToLane Impact: ${toLaneImpact.toFixed(0)}`);
  logic.push(`FromLane Impact: ${fromLaneImpact.toFixed(0)}`);
  logic.push(`Move Cost: -${MOVE_EVALUATION.BASE_MOVE_COST}`);

  // Defensive move bonus - scales with how close AI is to losing (percentage-based)
  // Moving to defend a losing lane becomes more valuable as AI takes more damage
  const toLaneIndex = parseInt(toLane.slice(-1)) - 1;
  if (currentToScore < 0) {
    // AI is losing this lane - consider defensive move value
    const aiDamagePercent = calculateDamagePercentage(player2);
    const defenseUrgency = calculateDefenseUrgency(aiDamagePercent);

    // Defensive bonus scales with urgency (higher when closer to losing)
    const defensiveBonus = Math.round(MOVE_EVALUATION.DEFENSIVE_MOVE_BONUS * (defenseUrgency / DEFENSE_URGENCY.BASELINE_MULTIPLIER));
    if (defenseUrgency > DEFENSE_URGENCY.BASELINE_MULTIPLIER) {
      score += defensiveBonus;
      logic.push(`🛡️ Defensive Move: +${defensiveBonus} (${defenseUrgency}x urgency)`);
    }
  }

  // Check for ON_MOVE abilities
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  const onMoveAbility = baseDrone?.abilities.find(a => a.type === 'TRIGGERED' && a.trigger === 'ON_MOVE');
  if (onMoveAbility) {
    let abilityBonus = 0;
    onMoveAbility.effects?.forEach(effect => {
      if (effect.type === 'PERMANENT_STAT_MOD') {
        if (effect.mod.stat === 'attack') abilityBonus += (effect.mod.value * MOVE_EVALUATION.ON_MOVE_ATTACK_BONUS);
        if (effect.mod.stat === 'speed') abilityBonus += (effect.mod.value * MOVE_EVALUATION.ON_MOVE_SPEED_BONUS);
      }
    });
    score += abilityBonus;
    logic.push(`✅ OnMove Ability: +${abilityBonus}`);
  }

  // NOTE: Per the total damage win condition model, we no longer give bonus
  // for moving toward damaged sections or penalty for critical sections.
  // All hull damage contributes equally toward the 60% threshold.
  // Lane control (being able to attack AND defend) drives move evaluation
  // through the lane score impact calculations above.

  return { score, logic };
};
