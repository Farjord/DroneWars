// ========================================
// DAMAGE CARD EVALUATORS
// ========================================
// Evaluates DESTROY and DAMAGE card effects

import { SCORING_WEIGHTS, CARD_EVALUATION, INVALID_SCORE } from '../aiConstants.js';

/**
 * Evaluate a DESTROY card
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card
 * @param {Object} context - Evaluation context with player states and services
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDestroyCard = (card, target, context) => {
  const { player1, player2, gameDataService } = context;
  const logic = [];
  let score = 0;

  if (card.effect.scope === 'SINGLE' && target) {
    const resourceValue = (target.hull || 0) + (target.currentShields || 0);
    const targetValue = resourceValue * SCORING_WEIGHTS.RESOURCE_VALUE_MULTIPLIER;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = targetValue - costPenalty;
    logic.push(`✅ Target Value: +${targetValue}`);
    logic.push(`⚠️ Cost: -${costPenalty}`);
  }
  else if (card.effect.scope === 'FILTERED' && target && target.id.startsWith('lane')) {
    const { stat, comparison, value } = card.effect.filter;
    const laneId = target.id;
    const dronesInLane = player1.dronesOnBoard[laneId] || [];
    let totalResourceValue = 0;

    dronesInLane.forEach(drone => {
      // Use effective stats to include upgrades and ability modifiers
      const effectiveStats = gameDataService.getEffectiveStats(drone, laneId);
      const effectiveStatValue = effectiveStats[stat] !== undefined ? effectiveStats[stat] : drone[stat];

      let meetsCondition = false;
      if (comparison === 'GTE' && effectiveStatValue >= value) meetsCondition = true;
      if (comparison === 'LTE' && effectiveStatValue <= value) meetsCondition = true;
      if (meetsCondition) {
        totalResourceValue += (drone.hull || 0) + (drone.currentShields || 0) + (drone.class * 5);
      }
    });

    const filteredValue = totalResourceValue * CARD_EVALUATION.FILTERED_DESTROY_MULTIPLIER;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = filteredValue - costPenalty;
    logic.push(`✅ Filtered Targets: +${filteredValue}`);
    logic.push(`⚠️ Cost: -${costPenalty}`);
  }
  else if (card.effect.scope === 'LANE' && target && target.id.startsWith('lane')) {
    const laneId = target.id;
    const enemyDrones = player1.dronesOnBoard[laneId] || [];
    const friendlyDrones = player2.dronesOnBoard[laneId] || [];

    const calculateWeightedValue = (drones) => {
      return drones.reduce((sum, d) => {
        const baseValue = (d.hull || 0) + (d.currentShields || 0) + (d.class * 5);
        return sum + (d.isExhausted ? baseValue : baseValue * CARD_EVALUATION.READY_DRONE_WEIGHT);
      }, 0);
    };

    const enemyValue = calculateWeightedValue(enemyDrones);
    const friendlyValue = calculateWeightedValue(friendlyDrones);

    const netValue = (enemyValue - friendlyValue) * CARD_EVALUATION.LANE_DESTROY_MULTIPLIER;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;

    score = netValue - costPenalty;

    logic.push(`✅ Net Lane Value: +${netValue.toFixed(0)} (Enemy: ${enemyValue.toFixed(0)}, Friendly: ${friendlyValue.toFixed(0)})`);
    logic.push(`⚠️ Cost: -${costPenalty}`);
  }

  return { score, logic };
};

/**
 * Evaluate a DAMAGE card
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card
 * @param {Object} context - Evaluation context with player states and services
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDamageCard = (card, target, context) => {
  const { player1, gameDataService } = context;
  const logic = [];
  let score = 0;

  if (card.effect.scope === 'FILTERED' && target.id.startsWith('lane') && card.effect.filter) {
    const { stat, comparison, value } = card.effect.filter;
    const dronesInLane = player1.dronesOnBoard[target.id] || [];
    let potentialDamage = 0;
    let targetsHit = 0;
    const laneId = target.id;

    dronesInLane.forEach(drone => {
      const effectiveTarget = gameDataService.getEffectiveStats(drone, laneId);
      let meetsCondition = false;
      if (comparison === 'GTE' && effectiveTarget[stat] >= value) meetsCondition = true;
      if (comparison === 'LTE' && effectiveTarget[stat] <= value) meetsCondition = true;

      if (meetsCondition) {
        targetsHit++;
        potentialDamage += card.effect.value;
      }
    });

    const damageValue = potentialDamage * CARD_EVALUATION.FILTERED_DAMAGE_MULTIPLIER;
    const multiHitBonus = targetsHit > 1 ? targetsHit * CARD_EVALUATION.MULTI_HIT_BONUS_PER_TARGET : 0;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = damageValue + multiHitBonus - costPenalty;

    logic.push(`✅ Filtered Damage: +${damageValue} (${targetsHit} targets)`);
    if (multiHitBonus > 0) logic.push(`✅ Multi-Hit: +${multiHitBonus}`);
    logic.push(`⚠️ Cost: -${costPenalty}`);
  } else {
    // Single target damage
    if (card.effect.damageType === 'PIERCING') {
      const shieldBypassValue = (target.currentShields || 0);
      logic.push(`✅ Piercing: Bypasses ${shieldBypassValue} shields`);
    }

    const damageScore = card.effect.value * CARD_EVALUATION.DAMAGE_MULTIPLIER;
    logic.push(`✅ Base Damage: +${damageScore}`);
    let finalScore = damageScore;

    // Lethal bonus
    if (card.effect.value >= target.hull) {
      const lethalBonus = (target.class * CARD_EVALUATION.LETHAL_CLASS_MULTIPLIER) + CARD_EVALUATION.LETHAL_BASE_BONUS;
      finalScore += lethalBonus;
      logic.push(`✅ Lethal Bonus: +${lethalBonus}`);
    }

    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    finalScore -= costPenalty;
    logic.push(`⚠️ Cost: -${costPenalty}`);

    score = finalScore;
  }

  return { score, logic };
};
