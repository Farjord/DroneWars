// ========================================
// MOVE EVALUATOR
// ========================================
// Evaluates drone movement actions (not card-based moves)

import fullDroneCollection from '../../data/droneData.js';
import { MOVE_EVALUATION, PENALTIES } from './aiConstants.js';
import { calculateLaneScore } from './scoring/laneScoring.js';

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

  // Defensive move bonus - moving to protect a damaged AI section
  const toLaneIndex = parseInt(toLane.slice(-1)) - 1;
  const sectionToDefend = opponentPlacedSections[toLaneIndex];
  if (sectionToDefend) {
    const sectionStatus = getShipStatus(player2.shipSections[sectionToDefend]);
    if ((sectionStatus === 'damaged' || sectionStatus === 'critical') && currentToScore < 0) {
      score += MOVE_EVALUATION.DEFENSIVE_MOVE_BONUS;
      logic.push(`🛡️ Defensive Move: +${MOVE_EVALUATION.DEFENSIVE_MOVE_BONUS}`);
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

  // Offensive move bonus - moving toward a damaged enemy section
  const humanSectionToAttack = placedSections[toLaneIndex];
  if (humanSectionToAttack) {
    const sectionStatus = getShipStatus(player1.shipSections[humanSectionToAttack]);
    if (currentToScore > 0) {
      if (sectionStatus === 'damaged') {
        score += MOVE_EVALUATION.OFFENSIVE_MOVE_DAMAGED;
        logic.push(`✅ Offensive Move: +${MOVE_EVALUATION.OFFENSIVE_MOVE_DAMAGED}`);
      } else if (sectionStatus === 'critical') {
        // Overkill penalty - don't pile onto already-won lanes
        score += PENALTIES.OVERKILL;
        logic.push(`⚠️ Overkill: ${PENALTIES.OVERKILL}`);
      }
    }
  }

  return { score, logic };
};
