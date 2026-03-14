// ========================================
// MARKING CARD EVALUATORS
// ========================================
// Evaluates MARK_DRONE card effects (Target Acquisition, Mark Enemy)

import { SCORING_WEIGHTS, DEPLOYMENT_BONUSES, CARD_EVALUATION } from '../aiConstants.js';

/**
 * Evaluate a MARK_DRONE card
 * Handles both multi-target (Target Acquisition) and single-target (Mark Enemy)
 *
 * @param {Object} card - The card being played
 * @param {Object} target - The target drone (null for NONE targeting)
 * @param {Object} context - Evaluation context with player states
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateMarkDroneCard = (card, target, context) => {
  const { player1, player2 } = context;
  const logic = [];
  let score = 0;

  const effect = card.effects[0];
  const isMultiTarget = effect.scope === 'ALL';

  // Count unmarked enemy drones across all lanes
  let unmarkedCount = 0;
  for (const lane of ['lane1', 'lane2', 'lane3']) {
    const drones = player2.dronesOnBoard?.[lane] || [];
    unmarkedCount += drones.filter(d => !d.isMarked).length;
  }

  if (isMultiTarget) {
    // Multi-target: marks up to targetSelection.count
    const maxMarks = effect.targetSelection?.count || 3;
    const actualMarks = Math.min(unmarkedCount, maxMarks);

    score = actualMarks * DEPLOYMENT_BONUSES.MARK_ENEMY_VALUE;
    logic.push(`🎯 Would mark ${actualMarks} drones: +${score}`);
  } else {
    // Single-target (Mark Enemy): score the specific target
    if (target && !target.isMarked) {
      score = DEPLOYMENT_BONUSES.MARK_ENEMY_VALUE;
      logic.push(`🎯 Mark target: +${score}`);
    }
  }

  // Synergy bonus: check if hand contains mark-consuming cards
  const hand = player1.hand || [];
  const synergyCards = hand.filter(c =>
    c.effects?.some(e => e.filter === 'MARKED' || e.condition?.requires === 'MARKED')
  );

  if (synergyCards.length > 0) {
    const synergyBonus = synergyCards.length * CARD_EVALUATION.MARK_SYNERGY_BONUS_PER_CARD;
    score += synergyBonus;
    logic.push(`🔗 Mark synergy (${synergyCards.length} cards): +${synergyBonus}`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`💰 Cost penalty: -${costPenalty}`);

  return { score, logic };
};
