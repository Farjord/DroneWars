// ========================================
// UTILITY CARD EVALUATORS
// ========================================
// Evaluates DRAW, GAIN_ENERGY, and SEARCH_AND_DRAW card effects

import { CARD_EVALUATION, SCORING_WEIGHTS, INVALID_SCORE } from '../aiConstants.js';

/**
 * Evaluate a GAIN_ENERGY card
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card (usually null)
 * @param {Object} context - Evaluation context with player states
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateGainEnergyCard = (card, target, context) => {
  const { player1, player2, getValidTargets } = context;
  const logic = [];
  let score = 0;

  const projectedEnergy = player2.energy - card.cost + card.effects[0].value;
  logic.push(`📊 Projected Energy: ${projectedEnergy}`);

  const newlyPlayableCards = player2.hand.filter(otherCard =>
    otherCard.instanceId !== card.instanceId &&
    player2.energy < otherCard.cost &&
    projectedEnergy >= otherCard.cost
  );

  if (newlyPlayableCards.length > 0) {
    const usableCards = getValidTargets ? newlyPlayableCards.filter(enabledCard => {
      if (!enabledCard.effects?.[0]?.targeting) return true;
      const targets = getValidTargets('player2', null, enabledCard, player1, player2);
      return targets.length > 0;
    }) : newlyPlayableCards;

    if (usableCards.length > 0) {
      const mostExpensive = usableCards.sort((a, b) => b.cost - a.cost)[0];
      score = CARD_EVALUATION.ENABLES_CARD_BASE + (mostExpensive.cost * CARD_EVALUATION.ENABLES_CARD_PER_COST);
      logic.push(`✅ Enables '${mostExpensive.name}': +${score}`);
    } else {
      score = INVALID_SCORE;
      logic.push(`⚠️ Enabled cards have no valid targets - no benefit`);
    }
  } else {
    score = INVALID_SCORE;
    logic.push(`⚠️ No cards enabled by energy gain - no benefit`);
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
  const drawValue = card.effects[0].drawCount * CARD_EVALUATION.SEARCH_DRAW_VALUE_PER_CARD;
  const searchBonus = card.effects[0].searchCount * CARD_EVALUATION.SEARCH_BONUS_PER_SEARCH;

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

/**
 * Evaluate a DRAIN_ENERGY card (Power Drain)
 * Strategy: Sooner the better - always valuable for tempo
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card (usually null)
 * @param {Object} context - Evaluation context with player states
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDrainEnergyCard = (card, target, context) => {
  const { player1, roundNumber } = context;
  const logic = [];

  const energyDrained = card.effects[0].amount;
  let baseValue = energyDrained * CARD_EVALUATION.ENERGY_DENY_MULTIPLIER;

  logic.push(`✅ Energy Drain: +${baseValue} (${energyDrained} energy denied)`);

  // Bonus if opponent has high energy (more impactful)
  if (player1.energy >= 5) {
    const highEnergyBonus = 15;
    baseValue += highEnergyBonus;
    logic.push(`✅ High Energy Target: +${highEnergyBonus} (opponent has ${player1.energy})`);
  }

  // Reduced value if opponent already low on energy
  if (player1.energy <= 2) {
    baseValue *= 0.5;
    logic.push(`⚠️ Low Energy Target: ×0.5 (diminishing returns)`);
  }

  // Early game bonus (play ASAP for tempo advantage)
  const currentRound = roundNumber || 1;
  if (currentRound <= 3) {
    const earlyGameBonus = 10;
    baseValue += earlyGameBonus;
    logic.push(`✅ Early Game: +${earlyGameBonus} (tempo advantage)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  const score = baseValue - costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score, logic };
};

/**
 * Evaluate a STEAL_ENERGY card (Energy Siphon)
 * Strategy: Combines drain + gain value. Higher when opponent has more energy.
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card (usually null)
 * @param {Object} context - Evaluation context with player states
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateStealEnergyCard = (card, target, context) => {
  const { player1, player2 } = context;
  const logic = [];

  const stealAmount = card.effects[0].amount;
  const actualSteal = Math.min(stealAmount, player1.energy);

  if (actualSteal === 0) {
    return { score: INVALID_SCORE, logic: ['❌ Opponent has no energy to steal'] };
  }

  // Drain value (denying opponent) + gain value (tempo for self)
  let baseValue = actualSteal * CARD_EVALUATION.ENERGY_DENY_MULTIPLIER;
  logic.push(`✅ Energy Steal: +${baseValue} (${actualSteal} energy stolen)`);

  // Self-gain bonus: more valuable when we're low on energy
  if (player2.energy <= 2) {
    const lowEnergyBonus = 15;
    baseValue += lowEnergyBonus;
    logic.push(`✅ Low Self Energy: +${lowEnergyBonus} (need energy)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  const score = baseValue - costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score, logic };
};

/**
 * Evaluate a DISCARD card (Mental Disruption)
 * Strategy: Higher value when opponent has more cards and energy
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card (usually null)
 * @param {Object} context - Evaluation context with player states
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDiscardCard = (card, target, context) => {
  const { player1 } = context;
  const logic = [];

  const discardCount = card.effects[0].count;
  const opponentHandSize = player1.hand.length;
  const opponentEnergy = player1.energy;

  // Check if opponent has cards to discard
  if (opponentHandSize === 0) {
    return { score: INVALID_SCORE, logic: ['❌ No cards to discard'] };
  }

  let baseValue = discardCount * CARD_EVALUATION.CARD_VALUE_MULTIPLIER;
  logic.push(`✅ Card Disruption: +${baseValue} (${discardCount} cards)`);

  // Hand size scaling (more cards = more disruption potential)
  if (opponentHandSize >= 5) {
    const fullHandBonus = 20;
    baseValue += fullHandBonus;
    logic.push(`✅ Full Hand: +${fullHandBonus} (${opponentHandSize} cards)`);
  } else if (opponentHandSize <= 2) {
    const lowHandPenalty = -15;
    baseValue += lowHandPenalty;
    logic.push(`⚠️ Few Cards: ${lowHandPenalty} (only ${opponentHandSize} cards)`);
  }

  // Energy scaling (high energy means they can play cards)
  if (opponentEnergy >= 5) {
    const highEnergyBonus = 15;
    baseValue += highEnergyBonus;
    logic.push(`✅ High Energy: +${highEnergyBonus} (can play cards)`);
  } else if (opponentEnergy <= 2) {
    const lowEnergyPenalty = -10;
    baseValue += lowEnergyPenalty;
    logic.push(`⚠️ Low Energy: ${lowEnergyPenalty} (cards less threatening)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  const score = baseValue - costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score, logic };
};
