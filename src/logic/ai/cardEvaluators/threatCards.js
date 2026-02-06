// ========================================
// THREAT CARD EVALUATORS
// ========================================
// Evaluates INCREASE_THREAT card effects (Raise the Alarm, Transmit Threat)

import { CARD_EVALUATION, SCORING_WEIGHTS, INVALID_SCORE } from '../aiConstants.js';

/**
 * Evaluate an INCREASE_THREAT card
 * Handles both flat threat (Raise the Alarm) and per-drone threat (Transmit Threat)
 *
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card (usually null)
 * @param {Object} context - Evaluation context with player states
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateIncreaseThreatCard = (card, target, context) => {
  const { player2 } = context;
  const logic = [];
  let score = 0;

  if (card.effect.perDrone) {
    // Per-drone mode (Transmit Threat): score scales with matching drone count
    let droneCount = 0;
    for (const lane of ['lane1', 'lane2', 'lane3']) {
      const drones = player2.dronesOnBoard?.[lane] || [];
      droneCount += drones.filter(d => d.name === card.effect.perDrone).length;
    }

    if (droneCount === 0) {
      logic.push(`❌ No ${card.effect.perDrone} on board - cannot play`);
      return { score: INVALID_SCORE, logic };
    }

    score = droneCount * CARD_EVALUATION.THREAT_PER_DRONE_VALUE;
    logic.push(`📡 ${droneCount}x ${card.effect.perDrone}: +${score}`);

    // Cost penalty
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score -= costPenalty;
    logic.push(`💰 Cost penalty: -${costPenalty}`);
  } else {
    // Flat mode (Raise the Alarm): high base value - play ASAP
    score = CARD_EVALUATION.THREAT_INCREASE_BASE_VALUE;
    logic.push(`🚨 Flat threat base: +${score}`);

    const perPointBonus = card.effect.value * CARD_EVALUATION.THREAT_INCREASE_PER_POINT;
    score += perPointBonus;
    logic.push(`📈 Threat value (${card.effect.value}): +${perPointBonus}`);

    // Cost penalty
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score -= costPenalty;
    logic.push(`💰 Cost penalty: -${costPenalty}`);

    // Momentum cost penalty
    if (card.momentumCost) {
      const momentumPenalty = card.momentumCost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
      score -= momentumPenalty;
      logic.push(`⚡ Momentum penalty: -${momentumPenalty}`);
    }
  }

  return { score, logic };
};
