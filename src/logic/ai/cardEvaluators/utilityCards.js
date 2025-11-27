// ========================================
// UTILITY CARD EVALUATORS
// ========================================
// Evaluates DRAW, GAIN_ENERGY, and SEARCH_AND_DRAW card effects

import { CARD_EVALUATION } from '../aiConstants.js';

/**
 * Evaluate a GAIN_ENERGY card
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card (usually null)
 * @param {Object} context - Evaluation context with player states
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateGainEnergyCard = (card, target, context) => {
  const { player2 } = context;
  const logic = [];
  let score = 0;

  const projectedEnergy = player2.energy - card.cost + card.effect.value;
  logic.push(`📊 Projected Energy: ${projectedEnergy}`);

  const newlyPlayableCards = player2.hand.filter(otherCard =>
    otherCard.instanceId !== card.instanceId &&
    player2.energy < otherCard.cost &&
    projectedEnergy >= otherCard.cost
  );

  if (newlyPlayableCards.length > 0) {
    const mostExpensiveTarget = newlyPlayableCards.sort((a, b) => b.cost - a.cost)[0];
    score = CARD_EVALUATION.ENABLES_CARD_BASE + (mostExpensiveTarget.cost * CARD_EVALUATION.ENABLES_CARD_PER_COST);
    logic.push(`✅ Enables '${mostExpensiveTarget.name}': +${score}`);
  } else {
    score = CARD_EVALUATION.LOW_PRIORITY_SCORE;
    logic.push(`⚠️ Low Priority: +${CARD_EVALUATION.LOW_PRIORITY_SCORE}`);
  }

  return { score, logic };
};

/**
 * Evaluate a DRAW card
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card (usually null)
 * @param {Object} context - Evaluation context with player states
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDrawCard = (card, target, context) => {
  const { player2 } = context;
  const logic = [];
  let score = 0;

  const energyAfterPlay = player2.energy - card.cost;

  if (energyAfterPlay > 0) {
    const baseValue = CARD_EVALUATION.DRAW_BASE_VALUE;
    const energyBonus = energyAfterPlay * CARD_EVALUATION.ENERGY_REMAINING_MULTIPLIER;
    score = baseValue + energyBonus;
    logic.push(`✅ Draw Value: +${baseValue}`);
    logic.push(`✅ Energy Left: +${energyBonus}`);
  } else {
    score = CARD_EVALUATION.LOW_PRIORITY_SCORE;
    logic.push(`⚠️ Low Priority: +${CARD_EVALUATION.LOW_PRIORITY_SCORE}`);
  }

  return { score, logic };
};

/**
 * Evaluate a SEARCH_AND_DRAW card
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card (usually null)
 * @param {Object} context - Evaluation context with player states
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateSearchAndDrawCard = (card, target, context) => {
  const { player2 } = context;
  const logic = [];
  let score = 0;

  const energyAfterPlay = player2.energy - card.cost;
  const drawValue = card.effect.drawCount * CARD_EVALUATION.SEARCH_DRAW_VALUE_PER_CARD;
  const searchBonus = card.effect.searchCount * CARD_EVALUATION.SEARCH_BONUS_PER_SEARCH;

  if (energyAfterPlay >= 0) {
    const energyBonus = energyAfterPlay * CARD_EVALUATION.ENERGY_REMAINING_MULTIPLIER;
    score = drawValue + searchBonus + energyBonus;
    logic.push(`✅ Draw Value: +${drawValue}`);
    logic.push(`✅ Search Bonus: +${searchBonus}`);
    logic.push(`✅ Energy Left: +${energyBonus}`);
  } else {
    score = 2;
    logic.push(`⚠️ Low Priority: +2`);
  }

  return { score, logic };
};
