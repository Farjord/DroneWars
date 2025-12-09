// ========================================
// UNIFIED TARGET SCORING
// ========================================
// Single "black box" function for evaluating target value
// Used by ALL damage/destroy effects for consistent prioritization

import { TARGET_SCORING } from '../aiConstants.js';
import fullDroneCollection from '../../../data/droneData.js';

const {
  JAMMER_BLOCKING_BASE,
  INTERCEPTION_BLOCKER_BONUS,
  READY_TARGET_BONUS,
  CLASS_0_BONUS,
  CLASS_1_BONUS,
  CLASS_2_BONUS,
  CLASS_3_BONUS,
  LOW_ATTACK_BONUS,
  MED_ATTACK_BONUS,
  HIGH_ATTACK_BONUS,
  GUARDIAN_ABILITY_BONUS,
  DEFENDER_ABILITY_BONUS,
  ANTI_SHIP_ABILITY_BONUS,
  LETHAL_BONUS,
  PIERCING_BYPASS_BONUS,
} = TARGET_SCORING;

/**
 * Universal target value calculator for damage/destroy effects
 * @param {Object} target - The target drone
 * @param {Object} context - Evaluation context (player1, player2, etc.)
 * @param {Object} options - Configuration options
 * @param {number} options.damageAmount - Amount of damage being dealt (999 for destroy)
 * @param {boolean} options.isPiercing - Whether damage ignores shields
 * @param {string} options.lane - Lane context for interception/jammer checks
 * @returns {Object} - { score: number, logic: string[] }
 */
export const calculateTargetValue = (target, context, options = {}) => {
  const {
    damageAmount = 999,
    isPiercing = false,
    lane = null,
  } = options;

  let score = 0;
  const logic = [];

  // 1. JAMMER BLOCKING BONUS (Highest Priority)
  if (target.name === 'Jammer' && !target.isExhausted && lane) {
    const otherEnemiesInLane = (context.player1?.dronesOnBoard?.[lane] || [])
      .filter(d => d.id !== target.id);

    if (otherEnemiesInLane.length > 0) {
      const protectedValue = otherEnemiesInLane.reduce((sum, d) => {
        return sum + (d.class * 3) + (!d.isExhausted ? 10 : 0);
      }, 0);
      const jammerBonus = JAMMER_BLOCKING_BASE + protectedValue;
      score += jammerBonus;
      logic.push(`Jammer Blocking ${otherEnemiesInLane.length} target(s): +${jammerBonus}`);
    }
  }

  // 2. ACTIVE INTERCEPTION BLOCKER BONUS
  if (!target.isExhausted && lane && target.name !== 'Jammer') {
    const friendlyDronesInLane = context.player2?.dronesOnBoard?.[lane] || [];
    const friendlyShipAttackers = friendlyDronesInLane.filter(d =>
      !d.isExhausted && target.speed >= d.speed
    );

    if (friendlyShipAttackers.length > 0) {
      const blockedCount = friendlyShipAttackers.length;
      const interceptorBonus = blockedCount * INTERCEPTION_BLOCKER_BONUS;
      score += interceptorBonus;
      logic.push(`Blocking ${blockedCount} attacker(s): +${interceptorBonus}`);
    }
  }

  // 3. READY STATE BONUS
  if (!target.isExhausted) {
    score += READY_TARGET_BONUS;
    logic.push(`Ready Target: +${READY_TARGET_BONUS}`);
  }

  // 4. THREAT VALUE
  const threatResult = calculateThreatScore(target);
  score += threatResult.value;
  logic.push(...threatResult.logic);

  // 5. DAMAGE EFFICIENCY
  const efficiencyResult = calculateDamageEfficiency(target, damageAmount, isPiercing);
  score += efficiencyResult.value;
  logic.push(...efficiencyResult.logic);

  return { score, logic };
};

/**
 * Calculate how threatening a drone is (flat bonuses by tier)
 */
const calculateThreatScore = (target) => {
  let value = 0;
  const logic = [];

  // Class tier bonus
  const classBonuses = [CLASS_0_BONUS, CLASS_1_BONUS, CLASS_2_BONUS, CLASS_3_BONUS];
  const classBonus = classBonuses[target.class] || 0;
  if (classBonus > 0) {
    value += classBonus;
    logic.push(`Class ${target.class}: +${classBonus}`);
  }

  // Attack tier bonus
  let attackBonus = LOW_ATTACK_BONUS;
  if (target.attack >= 4) attackBonus = HIGH_ATTACK_BONUS;
  else if (target.attack >= 2) attackBonus = MED_ATTACK_BONUS;

  if (attackBonus > 0) {
    value += attackBonus;
    logic.push(`Attack ${target.attack}: +${attackBonus}`);
  }

  // Dangerous abilities
  const abilityBonus = evaluateDangerousAbilities(target);
  if (abilityBonus.value > 0) {
    value += abilityBonus.value;
    logic.push(...abilityBonus.logic);
  }

  return { value, logic };
};

/**
 * Evaluate dangerous ability bonuses
 */
const evaluateDangerousAbilities = (target) => {
  let value = 0;
  const logic = [];

  const baseDrone = fullDroneCollection.find(d => d.name === target.name);
  if (!baseDrone?.abilities) return { value, logic };

  for (const ability of baseDrone.abilities) {
    // GUARDIAN - blocks ship attacks
    if (ability.effect?.type === 'GRANT_KEYWORD' && ability.effect?.keyword === 'GUARDIAN') {
      value += GUARDIAN_ABILITY_BONUS;
      logic.push(`Guardian: +${GUARDIAN_ABILITY_BONUS}`);
    }

    // DEFENDER - doesn't exhaust on intercept
    if (ability.effect?.type === 'GRANT_KEYWORD' && ability.effect?.keyword === 'DEFENDER') {
      value += DEFENDER_ABILITY_BONUS;
      logic.push(`Defender: +${DEFENDER_ABILITY_BONUS}`);
    }

    // BONUS_DAMAGE_VS_SHIP - anti-ship threat
    if (ability.effect?.type === 'BONUS_DAMAGE_VS_SHIP') {
      value += ANTI_SHIP_ABILITY_BONUS;
      logic.push(`Anti-Ship: +${ANTI_SHIP_ABILITY_BONUS}`);
    }
  }

  return { value, logic };
};

/**
 * Calculate damage efficiency (flat bonuses)
 */
const calculateDamageEfficiency = (target, damage, isPiercing) => {
  let value = 0;
  const logic = [];

  const effectiveHull = target.hull || 0;
  const shields = isPiercing ? 0 : (target.currentShields || 0);
  const totalDurability = effectiveHull + shields;

  // Lethal bonus
  if (damage >= totalDurability) {
    value += LETHAL_BONUS;
    logic.push(`Lethal: +${LETHAL_BONUS}`);
  }

  // Piercing bonus when target has shields
  if (isPiercing && target.currentShields > 0) {
    value += PIERCING_BYPASS_BONUS;
    logic.push(`Piercing Bypass: +${PIERCING_BYPASS_BONUS}`);
  }

  return { value, logic };
};
