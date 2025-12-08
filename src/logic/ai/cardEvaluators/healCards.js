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
 * Evaluate a HEAL_HULL card
 * Handles both drone hull repair and ship section repair
 * @param {Object} card - The card being played
 * @param {Object} target - The target (drone or ship section)
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateHealHullCard = (card, target, context) => {
  const logic = [];
  let score = 0;

  // Check if targeting a drone (has hull and maxHull properties)
  if (target.hull !== undefined && target.maxHull !== undefined) {
    // Drone hull healing
    const hullToHeal = Math.min(card.effect.value, target.maxHull - target.hull);

    if (hullToHeal <= 0) {
      logic.push('⚠️ Drone at full hull');
      return { score: 0, logic };
    }

    // Value hull healing - keeping a drone alive is valuable
    // Use similar value to shields but slightly higher since hull is more precious
    const hullValue = hullToHeal * (CARD_EVALUATION.SHIELD_HEAL_VALUE_PER_POINT + 3);
    score = hullValue;
    logic.push(`✅ Drone Hull: +${hullValue} (${hullToHeal} hull restored)`);

    // Add go-again bonus if present
    if (card.effect.goAgain) {
      score += CARD_EVALUATION.GO_AGAIN_BONUS;
      logic.push(`✅ Go Again: +${CARD_EVALUATION.GO_AGAIN_BONUS}`);
    }
  } else {
    // Ship section repair (original behavior)
    score = CARD_EVALUATION.SECTION_HEAL_VALUE;
    logic.push(`✅ Section Heal: +${CARD_EVALUATION.SECTION_HEAL_VALUE}`);
  }

  return { score, logic };
};

/**
 * Evaluate a RESTORE_SECTION_SHIELDS card (ship section shield restore)
 * @param {Object} card - The card being played
 * @param {Object} target - The target ship section
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateRestoreSectionShieldsCard = (card, target, context) => {
  const logic = [];

  // Ship sections have shields (max) and allocatedShields (current)
  const maxShields = target.shields || 0;
  const currentShields = target.allocatedShields || 0;
  const missingShields = maxShields - currentShields;

  // Can only restore up to the card's value or missing shields, whichever is less
  const shieldsToRestore = Math.min(card.effect.value, missingShields);

  if (shieldsToRestore <= 0) {
    logic.push('⚠️ Section at full shields');
    return { score: 0, logic };
  }

  const score = shieldsToRestore * CARD_EVALUATION.SHIELD_HEAL_VALUE_PER_POINT;
  logic.push(`✅ Section Shields: +${score} (${shieldsToRestore} shields restored)`);

  return { score, logic };
};
