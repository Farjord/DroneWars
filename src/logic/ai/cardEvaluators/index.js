// ========================================
// CARD EVALUATORS - INDEX/REGISTRY
// ========================================
// Central registry for card effect evaluators

import { evaluateDestroyCard, evaluateDamageCard, evaluateOverflowDamageCard, evaluateSplashDamageCard, evaluateDamageScalingCard, evaluateDestroyUpgradeCard, evaluateConditionalSectionDamageCard } from './damageCards.js';
import { evaluateGainEnergyCard, evaluateDrawCard, evaluateSearchAndDrawCard, evaluateDrainEnergyCard, evaluateDiscardCard } from './utilityCards.js';
import { evaluateReadyDroneCard, evaluateCreateTokensCard, evaluateExhaustDroneCard } from './droneCards.js';
import { evaluateHealShieldsCard, evaluateHealHullCard, evaluateRestoreSectionShieldsCard } from './healCards.js';
import { evaluateModifyStatCard, evaluateRepeatingEffectCard } from './statCards.js';
import { evaluateSingleMoveCard, evaluateMultiMoveCard } from './movementCards.js';
import { evaluateModifyDroneBaseCard } from './upgradeCards.js';
import { evaluateConditionalEffects } from './conditionalEvaluator.js';
import { evaluateApplyCannotMoveCard, evaluateApplyCannotAttackCard, evaluateApplyCannotInterceptCard, evaluateApplyDoesNotReadyCard, evaluateClearAllStatusCard } from './statusEffectCards.js';
import { evaluateIncreaseThreatCard } from './threatCards.js';
import { debugLog } from '../../../utils/debugLogger.js';

// Re-export all evaluators
export * from './damageCards.js';
export * from './utilityCards.js';
export * from './droneCards.js';
export * from './healCards.js';
export * from './statCards.js';
export * from './movementCards.js';
export * from './upgradeCards.js';
export * from './statusEffectCards.js';
export * from './threatCards.js';

/**
 * Card evaluator registry - maps effect types to evaluation functions
 */
export const cardEvaluatorRegistry = {
  DESTROY: evaluateDestroyCard,
  DAMAGE: evaluateDamageCard,
  OVERFLOW_DAMAGE: evaluateOverflowDamageCard,
  SPLASH_DAMAGE: evaluateSplashDamageCard,
  DAMAGE_SCALING: evaluateDamageScalingCard,
  DESTROY_UPGRADE: evaluateDestroyUpgradeCard,
  GAIN_ENERGY: evaluateGainEnergyCard,
  DRAW: evaluateDrawCard,
  SEARCH_AND_DRAW: evaluateSearchAndDrawCard,
  READY_DRONE: evaluateReadyDroneCard,
  CREATE_TOKENS: evaluateCreateTokensCard,
  HEAL_SHIELDS: evaluateHealShieldsCard,
  HEAL_HULL: evaluateHealHullCard,
  RESTORE_SECTION_SHIELDS: evaluateRestoreSectionShieldsCard,
  MODIFY_STAT: evaluateModifyStatCard,
  REPEATING_EFFECT: evaluateRepeatingEffectCard,
  SINGLE_MOVE: evaluateSingleMoveCard,
  MULTI_MOVE: evaluateMultiMoveCard,
  MODIFY_DRONE_BASE: evaluateModifyDroneBaseCard,
  // New tactics card evaluators
  EXHAUST_DRONE: evaluateExhaustDroneCard,
  DRAIN_ENERGY: evaluateDrainEnergyCard,
  DISCARD: evaluateDiscardCard,
  // Status effect evaluators
  APPLY_CANNOT_MOVE: evaluateApplyCannotMoveCard,
  APPLY_CANNOT_ATTACK: evaluateApplyCannotAttackCard,
  APPLY_CANNOT_INTERCEPT: evaluateApplyCannotInterceptCard,
  APPLY_DOES_NOT_READY: evaluateApplyDoesNotReadyCard,
  CLEAR_ALL_STATUS: evaluateClearAllStatusCard,
  // Doctrine card evaluators
  CONDITIONAL_SECTION_DAMAGE: evaluateConditionalSectionDamageCard,
  // Threat effect evaluators
  INCREASE_THREAT: evaluateIncreaseThreatCard,
};

/**
 * Evaluate a card play action
 * Dispatches to the appropriate evaluator based on card effect type,
 * then adds any conditional effect bonuses
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
    debugLog('AI_DECISIONS', `[AI] No evaluator registered for card effect type: ${effectType}`);
    return { score: 0, logic: [`⚠️ Unknown effect type: ${effectType}`] };
  }

  // Get base evaluation from primary effect
  let baseResult;

  // SINGLE_MOVE needs moveData passed separately
  if (effectType === 'SINGLE_MOVE') {
    baseResult = evaluator(card, target, moveData, context);
  }
  else {
    baseResult = evaluator(card, target, context);
  }

  // Add conditional effect bonuses (modular - works with any base effect)
  const conditionalResult = evaluateConditionalEffects(card, target, context);

  // Combine base score with conditional bonuses
  return {
    score: baseResult.score + conditionalResult.bonusScore,
    logic: [...baseResult.logic, ...conditionalResult.logic]
  };
};

/**
 * Check if an evaluator exists for a given effect type
 * @param {string} effectType - The effect type to check
 * @returns {boolean} - True if evaluator exists
 */
export const hasEvaluator = (effectType) => {
  return effectType in cardEvaluatorRegistry;
};
