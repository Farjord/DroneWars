// ========================================
// HEAL CARD EVALUATORS
// ========================================
// Evaluates HEAL_SHIELDS and HEAL_HULL card effects

import { CARD_EVALUATION } from '../aiConstants.js';

/**
 * Evaluate a HEAL_SHIELDS card
 * @param {Object} card - The card being played
 * @param {Object} target - The target drone
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateHealShieldsCard = (card, target, context) => {
  const logic = [];

  const shieldsToHeal = Math.min(card.effect.value, target.currentMaxShields - target.currentShields);
  const score = shieldsToHeal * CARD_EVALUATION.SHIELD_HEAL_VALUE_PER_POINT;
  logic.push(`✅ Shields Healed: +${score} (${shieldsToHeal} shields)`);

  return { score, logic };
};

/**
 * Evaluate a HEAL_HULL card (ship section repair)
 * @param {Object} card - The card being played
 * @param {Object} target - The target ship section
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateHealHullCard = (card, target, context) => {
  const logic = [];

  const score = CARD_EVALUATION.SECTION_HEAL_VALUE;
  logic.push(`✅ Section Heal: +${CARD_EVALUATION.SECTION_HEAL_VALUE}`);

  return { score, logic };
};
