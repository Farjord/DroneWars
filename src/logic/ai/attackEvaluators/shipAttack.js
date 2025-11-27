// ========================================
// SHIP ATTACK EVALUATOR
// ========================================
// Evaluates drone-on-ship-section attack actions

import { ATTACK_BONUSES, SCORING_WEIGHTS } from '../aiConstants.js';

/**
 * Evaluate a drone-on-ship-section attack
 * @param {Object} attacker - The attacking drone
 * @param {Object} target - The target ship section
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateShipAttack = (attacker, target, context) => {
  const { gameDataService, getShipStatus } = context;
  const logic = [];
  let score = 0;

  const effectiveAttacker = gameDataService.getEffectiveStats(attacker, attacker.lane);
  const attackerAttack = Math.max(0, effectiveAttacker.attack);

  // Base score from attack value
  score = attackerAttack * SCORING_WEIGHTS.DAMAGE_VALUE_MULTIPLIER;
  logic.push(`(Effective Attack: ${attackerAttack} * ${SCORING_WEIGHTS.DAMAGE_VALUE_MULTIPLIER})`);

  // Section status bonuses
  const status = getShipStatus(target);
  if (status === 'damaged') {
    score += ATTACK_BONUSES.DAMAGED_SECTION;
    logic.push(`✅ Damaged Section: +${ATTACK_BONUSES.DAMAGED_SECTION}`);
  }
  if (status === 'critical') {
    score += ATTACK_BONUSES.CRITICAL_SECTION;
    logic.push(`✅ Critical Section: +${ATTACK_BONUSES.CRITICAL_SECTION}`);
  }

  // Shield bonuses
  if (target.allocatedShields === 0) {
    score += ATTACK_BONUSES.NO_SHIELDS;
    logic.push(`✅ No Shields: +${ATTACK_BONUSES.NO_SHIELDS}`);
  } else if (attackerAttack >= target.allocatedShields) {
    score += ATTACK_BONUSES.SHIELD_BREAK;
    logic.push(`✅ Shield Break: +${ATTACK_BONUSES.SHIELD_BREAK}`);
  }

  // High attack bonus
  if (attackerAttack >= 3) {
    score += ATTACK_BONUSES.HIGH_ATTACK;
    logic.push(`✅ High Attack: +${ATTACK_BONUSES.HIGH_ATTACK}`);
  }

  // Piercing damage bonus
  if (attacker.damageType === 'PIERCING') {
    const bonus = target.allocatedShields * SCORING_WEIGHTS.PIERCING_SECTION_MULTIPLIER;
    score += bonus;
    logic.push(`✅ Piercing Damage: +${bonus}`);
  }

  return { score, logic };
};
