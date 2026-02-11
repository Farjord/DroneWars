// ========================================
// STAT CARD EVALUATORS
// ========================================
// Evaluates MODIFY_STAT and REPEATING_EFFECT card effects

import { SCORING_WEIGHTS, CARD_EVALUATION, INVALID_SCORE } from '../aiConstants.js';
import { calculateLaneScore } from '../scoring/laneScoring.js';
import { hasReadyNotFirstActionDrones } from '../helpers/keywordHelpers.js';
import { LaneControlCalculator } from '../../combat/LaneControlCalculator.js';

/**
 * Evaluate a MODIFY_STAT card
 * @param {Object} card - The card being played
 * @param {Object} target - The target drone or lane
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateModifyStatCard = (card, target, context) => {
  const {
    player1,
    player2,
    gameDataService,
    getLaneOfDrone,
    allSections,
    getShipStatus
  } = context;
  const { mod } = card.effect;
  const logic = [];
  let score = 0;

  // Lane-wide stat modification
  if (card.targeting?.type === 'LANE') {
    const laneId = target.id;
    const dronesInLane = player2.dronesOnBoard[laneId] || [];
    const activeDronesInLane = dronesInLane.filter(drone => !drone.isExhausted);

    if (activeDronesInLane.length === 0) {
      return { score: INVALID_SCORE, logic: ['❌ No Active Drones in Lane - card has no effect'] };
    } else {
      const currentLaneScore = calculateLaneScore(laneId, player2, player1, allSections, getShipStatus, gameDataService);

      // Simulate stat modification
      const tempAiState = JSON.parse(JSON.stringify(player2));
      tempAiState.dronesOnBoard[laneId].forEach(drone => {
        if (!drone.isExhausted) {
          if (!drone.statMods) drone.statMods = [];
          drone.statMods.push(mod);
        }
      });

      const projectedLaneScore = calculateLaneScore(laneId, tempAiState, player1, allSections, getShipStatus, gameDataService);
      const laneImpact = projectedLaneScore - currentLaneScore;
      const impactValue = laneImpact * CARD_EVALUATION.LANE_IMPACT_WEIGHT;
      const multiBuffBonus = activeDronesInLane.length * CARD_EVALUATION.MULTI_BUFF_BONUS_PER_DRONE;

      score = impactValue + multiBuffBonus;
      const impactSign = laneImpact >= 0 ? '+' : '';
      logic.push(`📊 Lane Impact: ${impactSign}${impactValue.toFixed(0)}`);
      logic.push(`✅ Multi-Buff: +${multiBuffBonus}`);
    }
  } else {
    // Single target stat modification
    if (mod.stat === 'attack' && mod.value > 0) {
      // Attack buff on friendly drone
      if (target.isExhausted) {
        score = -1;
        logic.push('⚠️ Invalid (Exhausted)');
      } else {
        const classValue = target.class * CARD_EVALUATION.CLASS_VALUE_MULTIPLIER;
        const attackValue = mod.value * CARD_EVALUATION.ATTACK_BUFF_MULTIPLIER;
        score = classValue + attackValue;
        logic.push(`✅ Target Class: +${classValue}`);
        logic.push(`✅ Attack Buff: +${attackValue}`);
      }
    } else if (mod.stat === 'attack' && mod.value < 0) {
      // Attack debuff on enemy drone
      if (target.isExhausted) {
        score = -1;
        logic.push('⚠️ Invalid (Already Exhausted)');
      } else {
        const targetLane = getLaneOfDrone(target.id, player1);
        const effectiveTarget = gameDataService.getEffectiveStats(target, targetLane);
        const threatValue = effectiveTarget.attack * CARD_EVALUATION.THREAT_REDUCTION_MULTIPLIER;
        score = threatValue;
        logic.push(`✅ Threat Reduction: +${threatValue}`);
      }
    } else if (mod.stat === 'speed' && mod.value > 0) {
      // Speed buff
      if (target.isExhausted) {
        score = -1;
        logic.push('⚠️ Invalid (Exhausted)');
      } else {
        const targetLane = getLaneOfDrone(target.id, player2);
        const opponentsInLane = player1.dronesOnBoard[targetLane] || [];
        const opponentMaxSpeed = opponentsInLane.length > 0
          ? Math.max(...opponentsInLane.map(d => gameDataService.getEffectiveStats(d, targetLane).speed))
          : -1;
        const effectiveTarget = gameDataService.getEffectiveStats(target, targetLane);

        // Check if buff lets us overcome interceptors
        if (effectiveTarget.speed <= opponentMaxSpeed && (effectiveTarget.speed + mod.value) > opponentMaxSpeed) {
          score = CARD_EVALUATION.INTERCEPTOR_OVERCOME_BONUS;
          logic.push(`✅ Interceptor Overcome: +${CARD_EVALUATION.INTERCEPTOR_OVERCOME_BONUS}`);
        } else {
          score = CARD_EVALUATION.SPEED_BUFF_BONUS;
          logic.push(`✅ Speed Buff: +${CARD_EVALUATION.SPEED_BUFF_BONUS}`);
        }
      }
    } else {
      // Generic stat modification
      if (target.isExhausted) {
        score = -1;
        logic.push('⚠️ Invalid (Exhausted)');
      } else {
        score = CARD_EVALUATION.GENERIC_STAT_BONUS;
        logic.push(`✅ Generic Stat: +${CARD_EVALUATION.GENERIC_STAT_BONUS}`);
      }
    }
  }

  // Apply bonuses if score is positive
  if (score > 0) {
    if (mod.type === 'permanent') {
      score *= CARD_EVALUATION.PERMANENT_MOD_MULTIPLIER;
      logic.push(`✅ Permanent Mod: x${CARD_EVALUATION.PERMANENT_MOD_MULTIPLIER}`);
    }
    if (card.effect.goAgain) {
      score += CARD_EVALUATION.GO_AGAIN_BONUS;
      logic.push(`✅ Go Again: +${CARD_EVALUATION.GO_AGAIN_BONUS}`);
      // Add bonus if we have ready drones that benefit from multiple actions
      if (hasReadyNotFirstActionDrones(player2)) {
        score += CARD_EVALUATION.NOT_FIRST_ACTION_ENABLER_BONUS;
        logic.push(`✅ NOT_FIRST_ACTION enabler: +${CARD_EVALUATION.NOT_FIRST_ACTION_ENABLER_BONUS}`);
      }
    }
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score -= costPenalty;
    logic.push(`⚠️ Cost: -${costPenalty}`);
  }

  return { score, logic };
};

/**
 * Evaluate a REPEATING_EFFECT card
 * @param {Object} card - The card being played
 * @param {Object} target - The target (usually null)
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateRepeatingEffectCard = (card, target, context) => {
  const { player1, player2, getShipStatus } = context;
  const logic = [];
  let score = 0;

  let repeatCount = 0;
  const condition = card.effect?.condition || card.condition;

  if (condition === 'OWN_DAMAGED_SECTIONS') {
    // Base of 1, plus additional for each damaged section
    repeatCount = 1;
    for (const sectionName in player2.shipSections) {
      const section = player2.shipSections[sectionName];
      const status = getShipStatus(section);
      if (status === 'damaged' || status === 'critical') {
        repeatCount++;
      }
    }
  } else if (condition === 'LANES_CONTROLLED') {
    // No base - if you control 0 lanes, effect does nothing
    repeatCount = LaneControlCalculator.countLanesControlled('player2', player1, player2);

    if (repeatCount === 0) {
      // Card does nothing useful - very low score
      logic.push('⚠️ No lanes controlled - card does nothing');
      return { score: INVALID_SCORE, logic };
    }

    // Use specific values for lane control effects
    const subEffectType = card.effect?.effects?.[0]?.type;
    let valuePerRepeat = CARD_EVALUATION.REPEAT_VALUE_PER_REPEAT;

    if (subEffectType === 'GAIN_ENERGY') {
      valuePerRepeat = CARD_EVALUATION.LANE_CONTROL_ENERGY_VALUE;
    } else if (subEffectType === 'DRAW') {
      valuePerRepeat = CARD_EVALUATION.LANE_CONTROL_DRAW_VALUE;
    }

    const repeatValue = repeatCount * valuePerRepeat;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = repeatValue - costPenalty;

    logic.push(`✅ Lane Control: +${repeatValue} (${repeatCount} lanes × ${valuePerRepeat})`);
    logic.push(`⚠️ Cost: -${costPenalty}`);

    return { score, logic };
  } else {
    // Unknown condition - default to 1
    repeatCount = 1;
  }

  const repeatValue = repeatCount * CARD_EVALUATION.REPEAT_VALUE_PER_REPEAT;
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score = repeatValue - costPenalty;

  logic.push(`✅ Repeating Effect: +${repeatValue} (${repeatCount} repeats)`);
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score, logic };
};
