// ========================================
// CARD EVALUATORS - INDEX/REGISTRY
// ========================================
// Central registry for card effect evaluators

import { evaluateDestroyCard, evaluateDamageCard } from './damageCards.js';
import { evaluateGainEnergyCard, evaluateDrawCard, evaluateSearchAndDrawCard } from './utilityCards.js';
import { evaluateReadyDroneCard, evaluateCreateTokensCard } from './droneCards.js';
import { evaluateHealShieldsCard, evaluateHealHullCard } from './healCards.js';
import { evaluateModifyStatCard, evaluateRepeatingEffectCard } from './statCards.js';
import { evaluateSingleMoveCard } from './movementCards.js';
import { evaluateModifyDroneBaseCard } from './upgradeCards.js';

// Re-export all evaluators
export * from './damageCards.js';
export * from './utilityCards.js';
export * from './droneCards.js';
export * from './healCards.js';
export * from './statCards.js';
export * from './movementCards.js';
export * from './upgradeCards.js';

/**
 * Card evaluator registry - maps effect types to evaluation functions
 */
export const cardEvaluatorRegistry = {
  DESTROY: evaluateDestroyCard,
  DAMAGE: evaluateDamageCard,
  GAIN_ENERGY: evaluateGainEnergyCard,
  DRAW: evaluateDrawCard,
  SEARCH_AND_DRAW: evaluateSearchAndDrawCard,
  READY_DRONE: evaluateReadyDroneCard,
  CREATE_TOKENS: evaluateCreateTokensCard,
  HEAL_SHIELDS: evaluateHealShieldsCard,
  HEAL_HULL: evaluateHealHullCard,
  MODIFY_STAT: evaluateModifyStatCard,
  REPEATING_EFFECT: evaluateRepeatingEffectCard,
  SINGLE_MOVE: evaluateSingleMoveCard,
  MODIFY_DRONE_BASE: evaluateModifyDroneBaseCard,
};

/**
 * Evaluate a card play action
 * Dispatches to the appropriate evaluator based on card effect type
 *
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card
 * @param {Object} context - Evaluation context containing player states, services, etc.
 * @param {Object} moveData - Optional move data for SINGLE_MOVE cards
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateCardPlay = (card, target, context, moveData = null) => {
  const effectType = card.effect.type;
  const evaluator = cardEvaluatorRegistry[effectType];

  if (!evaluator) {
    console.warn(`[AI] No evaluator registered for card effect type: ${effectType}`);
    return { score: 0, logic: [`⚠️ Unknown effect type: ${effectType}`] };
  }

  // SINGLE_MOVE needs moveData passed separately
  if (effectType === 'SINGLE_MOVE') {
    return evaluator(card, target, moveData, context);
  }

  // HEAL_HULL needs targeting type check
  if (effectType === 'HEAL_HULL' && card.targeting?.type !== 'SHIP_SECTION') {
    return { score: 0, logic: ['⚠️ Invalid heal target'] };
  }

  return evaluator(card, target, context);
};

/**
 * Check if an evaluator exists for a given effect type
 * @param {string} effectType - The effect type to check
 * @returns {boolean} - True if evaluator exists
 */
export const hasEvaluator = (effectType) => {
  return effectType in cardEvaluatorRegistry;
};
