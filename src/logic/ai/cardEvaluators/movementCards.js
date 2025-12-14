// ========================================
// MOVEMENT CARD EVALUATORS
// ========================================
// Evaluates SINGLE_MOVE card effects

import fullDroneCollection from '../../../data/droneData.js';
import { SCORING_WEIGHTS, CARD_EVALUATION, INVALID_SCORE } from '../aiConstants.js';
import { calculateLaneScore } from '../scoring/laneScoring.js';
import { hasReadyNotFirstActionDrones } from '../helpers/keywordHelpers.js';

/**
 * Evaluate a SINGLE_MOVE card
 * @param {Object} card - The card being played
 * @param {Object} target - Usually null for move cards
 * @param {Object} moveData - The move details { drone, fromLane, toLane }
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateSingleMoveCard = (card, target, moveData, context) => {
  const {
    player1,
    player2,
    gameDataService,
    allSections,
    getShipStatus
  } = context;
  const logic = [];
  let score = 0;

  if (!moveData) {
    return { score: INVALID_SCORE, logic: ['❌ Missing move metadata'] };
  }

  const { drone, fromLane, toLane } = moveData;

  // Calculate lane scores
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

  // No move cost for card-based moves (cards already have energy cost)
  const moveImpact = toLaneImpact + fromLaneImpact;
  score = moveImpact;

  // Check for ON_MOVE abilities (e.g., Phase Jumper)
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  const onMoveAbility = baseDrone?.abilities.find(a => a.type === 'TRIGGERED' && a.trigger === 'ON_MOVE');

  if (onMoveAbility) {
    let abilityBonus = 0;
    onMoveAbility.effects?.forEach(effect => {
      if (effect.type === 'PERMANENT_STAT_MOD') {
        if (effect.mod.stat === 'attack') abilityBonus += (effect.mod.value * CARD_EVALUATION.ON_MOVE_ATTACK_BONUS_PER_POINT);
        if (effect.mod.stat === 'speed') abilityBonus += (effect.mod.value * CARD_EVALUATION.ON_MOVE_SPEED_BONUS_PER_POINT);
      }
    });
    score += abilityBonus;
    logic.push(`✅ OnMove Ability: +${abilityBonus}`);
  }

  logic.push(`✅ Move Impact: +${moveImpact.toFixed(0)} (${drone.name}: ${fromLane}→${toLane})`);

  // Apply card cost
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  // Add goAgain bonus if applicable
  if (card.effect.goAgain) {
    score += CARD_EVALUATION.GO_AGAIN_BONUS;
    logic.push(`✅ Go Again: +${CARD_EVALUATION.GO_AGAIN_BONUS}`);
    // Add bonus if we have ready drones that benefit from multiple actions
    if (hasReadyNotFirstActionDrones(player2)) {
      score += CARD_EVALUATION.NOT_FIRST_ACTION_ENABLER_BONUS;
      logic.push(`✅ NOT_FIRST_ACTION enabler: +${CARD_EVALUATION.NOT_FIRST_ACTION_ENABLER_BONUS}`);
    }
  }

  return { score, logic };
};

/**
 * Evaluate a MULTI_MOVE card (e.g., Reposition)
 * Moves up to N drones from one lane to other lanes
 * Since actual destinations aren't known at evaluation time,
 * we estimate value based on repositioning potential
 * @param {Object} card - The card being played
 * @param {Object} target - The source lane (lane to move FROM)
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateMultiMoveCard = (card, target, context) => {
  const { player2 } = context;
  const logic = [];
  let score = 0;

  // Target is the source lane
  const sourceLaneId = target?.id;
  if (!sourceLaneId || !sourceLaneId.startsWith('lane')) {
    return { score: INVALID_SCORE, logic: ['❌ Invalid lane target'] };
  }

  const dronesInLane = player2.dronesOnBoard[sourceLaneId] || [];
  const maxMoves = card.effect.count || 3;
  const availableMoves = Math.min(dronesInLane.length, maxMoves);

  if (availableMoves === 0) {
    return { score: 0, logic: ['⚠️ No drones in lane to move'] };
  }

  // Base value per drone that can be moved (flexibility value)
  const flexibilityValue = availableMoves * 15;
  score += flexibilityValue;
  logic.push(`✅ Flexibility: +${flexibilityValue} (${availableMoves} drones can move)`);

  // Bonus for drones that aren't exhausted after move (DO_NOT_EXHAUST)
  if (card.effect.properties?.includes('DO_NOT_EXHAUST')) {
    const readyBonus = availableMoves * 10;
    score += readyBonus;
    logic.push(`✅ Stay Ready: +${readyBonus}`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score, logic };
};
