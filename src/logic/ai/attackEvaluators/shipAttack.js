// ========================================
// SHIP ATTACK EVALUATOR
// ========================================
// Evaluates drone-on-ship-section attack actions

import { ATTACK_BONUSES, SCORING_WEIGHTS, THREAT_DRONES } from '../aiConstants.js';
import { hasThreatOnShipHullDamage } from '../helpers/keywordHelpers.js';
import { calculateThresholdCrossingBonus } from '../helpers/hullIntegrityHelpers.js';

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

  // Threshold crossing bonus - small bonus for attacks that inflict stat penalties
  // by pushing section from healthy→damaged or damaged→critical
  // (Per total damage win condition: all damage matters equally, but stat penalties are still valuable)
  const thresholdBonus = calculateThresholdCrossingBonus(target, attackerAttack);
  if (thresholdBonus > 0) {
    score += thresholdBonus;
    logic.push(`✅ Threshold Cross: +${thresholdBonus}`);
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

  // Threat Transmitter bonus - attacking ship triggers threat ability
  if (hasThreatOnShipHullDamage(attacker)) {
    score += THREAT_DRONES.SHIP_DAMAGE_SHIP_ATTACK_BONUS;
    logic.push(`✅ Threat on Ship Damage: +${THREAT_DRONES.SHIP_DAMAGE_SHIP_ATTACK_BONUS}`);
  }

  return { score, logic };
};
