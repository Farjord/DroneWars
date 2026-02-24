// ========================================
// DRONE ATTACK EVALUATOR
// ========================================
// Evaluates drone-on-drone attack actions
// Uses unified target scoring as base with drone-specific adjustments

import fullDroneCollection from '../../../data/droneData.js';
import { ATTACK_BONUSES, PENALTIES, THREAT_DRONES } from '../aiConstants.js';
import { calculateLaneScore } from '../scoring/laneScoring.js';
import { calculateTargetValue } from '../scoring/targetScoring.js';
import { hasThreatOnShipHullDamage } from '../helpers/keywordHelpers.js';

/**
 * Evaluate a drone-on-drone attack
 * @param {Object} attacker - The attacking drone
 * @param {Object} target - The target drone
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDroneAttack = (attacker, target, context) => {
  const {
    player1,
    player2,
    gameDataService,
    allSections,
    getShipStatus
  } = context;
  const logic = [];

  const effectiveAttacker = gameDataService.getEffectiveStats(attacker, attacker.lane);
  const baseAttacker = fullDroneCollection.find(d => d.name === attacker.name);

  // Check if attacker has PASSIVE keyword - cannot attack
  if (effectiveAttacker.keywords.has('PASSIVE')) {
    return { score: -Infinity, logic: ['⛔ PASSIVE: Cannot attack'] };
  }

  // Check if attacker is Suppressed - attack will be cancelled but clears status
  if (attacker.isSuppressed) {
    return { score: -15, logic: ['⚠️ Suppressed: attack will be cancelled but clears status'] };
  }

  // Determine if attack is piercing (static or conditional)
  let isPiercing = attacker.damageType === 'PIERCING';

  // Check for conditional piercing (Hunter - gains PIERCING vs marked targets)
  if (!isPiercing) {
    const conditionalPiercingAbility = baseAttacker?.abilities.find(a =>
      a.type === 'PASSIVE' &&
      a.effect?.type === 'CONDITIONAL_KEYWORD' &&
      a.effect?.keyword === 'PIERCING' &&
      a.effect?.condition?.type === 'TARGET_IS_MARKED'
    );

    if (conditionalPiercingAbility && target.isMarked) {
      isPiercing = true;
      logic.push(`Hunter Protocol: Piercing vs marked target`);
    }
  }

  // Use unified target scoring as base
  const { score: targetValue, logic: targetLogic } = calculateTargetValue(target, context, {
    damageAmount: effectiveAttacker.attack,
    isPiercing,
    damageType: attacker.damageType,
    lane: attacker.lane
  });

  let score = targetValue;
  logic.push(`Target Value: +${targetValue}`);
  logic.push(...targetLogic.map(l => `  ${l}`));

  // DRONE-SPECIFIC ADJUSTMENTS (layered on top of unified scoring)

  // Favorable trade bonus (attacker class < target class)
  if (effectiveAttacker.class < target.class) {
    score += ATTACK_BONUSES.FAVORABLE_TRADE;
    logic.push(`Favorable Trade: +${ATTACK_BONUSES.FAVORABLE_TRADE}`);
  }

  // Anti-ship drone penalty (wasting ship-damage potential on drones)
  const isAntiShip = baseAttacker?.abilities.some(ability =>
    ability.type === 'PASSIVE' && ability.effect?.type === 'BONUS_DAMAGE_VS_SHIP'
  );

  if (isAntiShip) {
    score += PENALTIES.ANTI_SHIP_ATTACKING_DRONE;
    logic.push(`Anti-Ship Drone: ${PENALTIES.ANTI_SHIP_ATTACKING_DRONE}`);
  }

  // Threat Transmitter penalty - ability only triggers on ship hull damage
  if (hasThreatOnShipHullDamage(attacker)) {
    score += THREAT_DRONES.SHIP_DAMAGE_DRONE_PENALTY;
    logic.push(`Threat Ability Wasted: ${THREAT_DRONES.SHIP_DAMAGE_DRONE_PENALTY}`);
  }

  // Growth bonus (Gladiator - gains permanent +1 attack after attacking)
  const growthAbility = baseAttacker?.abilities.find(a =>
    a.type === 'PASSIVE' &&
    a.effect?.type === 'AFTER_ATTACK' &&
    a.effect?.subEffect?.type === 'PERMANENT_STAT_MOD'
  );

  if (growthAbility) {
    const statGain = growthAbility.effect.subEffect.mod?.value || 1;
    const bonus = statGain * ATTACK_BONUSES.GROWTH_MULTIPLIER;
    score += bonus;
    logic.push(`Veteran Instincts: +${bonus} (gains +${statGain} ${growthAbility.effect.subEffect.mod?.stat || 'stat'})`);
  }

  // Guardian protection check - heavily penalize attacking with Guardians when enemies present
  const isGuardian = effectiveAttacker.keywords.has('GUARDIAN');
  if (isGuardian) {
    const enemyDronesInLane = player1.dronesOnBoard[attacker.lane] || [];
    const enemyReadyDrones = enemyDronesInLane.filter(d => !d.isExhausted);

    if (enemyReadyDrones.length > 0) {
      score += PENALTIES.GUARDIAN_ATTACK_RISK;
      logic.push(`Guardian Protection Risk: ${PENALTIES.GUARDIAN_ATTACK_RISK} (${enemyReadyDrones.length} ready enemies)`);
    }
  }

  // Interception coverage penalty - penalize attacking with drones providing interception coverage
  // Note: Attacking exhausts drones (even though intercepting no longer does), so we still
  // penalize attacking with drones that are currently blocking enemy ship attackers.
  if (!isGuardian) {
    const enemyDronesInLane = player1.dronesOnBoard[attacker.lane] || [];
    const enemyShipAttackers = enemyDronesInLane.filter(d =>
      !d.isExhausted && effectiveAttacker.speed >= d.speed
    );

    if (enemyShipAttackers.length > 0) {
      // Calculate penalty based on threat level of enemies we're currently blocking
      const threatValue = enemyShipAttackers.reduce((sum, enemy) => {
        const enemyStats = gameDataService.getEffectiveStats(enemy, attacker.lane);
        return sum + (enemyStats.attack || 0) + (enemy.class || 0) * 2;
      }, 0);
      const interceptPenalty = Math.max(
        threatValue * PENALTIES.INTERCEPTION_COVERAGE_MULTIPLIER,
        PENALTIES.INTERCEPTION_COVERAGE_MIN
      );
      score += interceptPenalty;
      logic.push(`Losing Interception Coverage: ${interceptPenalty} (blocking ${enemyShipAttackers.length} attacker(s))`);
    }
  }

  // Lane score analysis
  const attackLane = attacker.lane;
  const currentLaneScore = calculateLaneScore(attackLane, player2, player1, allSections, getShipStatus, gameDataService);

  // Simulate removing the target drone
  const tempHumanState = JSON.parse(JSON.stringify(player1));
  tempHumanState.dronesOnBoard[attackLane] = tempHumanState.dronesOnBoard[attackLane].filter(d => d.id !== target.id);

  const projectedLaneScore = calculateLaneScore(attackLane, player2, tempHumanState, allSections, getShipStatus, gameDataService);
  const laneImpact = projectedLaneScore - currentLaneScore;

  if (laneImpact > 0) {
    const impactBonus = Math.floor(laneImpact * ATTACK_BONUSES.LANE_IMPACT_WEIGHT);
    score += impactBonus;
    logic.push(`Lane Impact: +${impactBonus}`);

    // Lane flip bonus
    if (currentLaneScore < 0 && projectedLaneScore >= 0) {
      const flipMagnitude = Math.abs(currentLaneScore) + projectedLaneScore;
      const laneFlipBonus = Math.floor(flipMagnitude * ATTACK_BONUSES.LANE_FLIP_WEIGHT);
      score += laneFlipBonus;
      logic.push(`Lane Flip: +${laneFlipBonus} (${currentLaneScore.toFixed(0)} → ${projectedLaneScore.toFixed(0)})`);
    }
  }

  // RETALIATE penalty - target will deal damage back if it survives
  const baseTarget = fullDroneCollection.find(d => d.name === target.name);
  const hasRetaliate = baseTarget?.abilities?.some(a =>
    a.effect?.type === 'GRANT_KEYWORD' && a.effect?.keyword === 'RETALIATE'
  );

  if (hasRetaliate) {
    const effectiveTarget = gameDataService.getEffectiveStats(target, target.lane || attacker.lane);
    const targetAttack = effectiveTarget.attack || 0;

    // Calculate if target would survive this attack
    const attackerDamage = effectiveAttacker.attack || 0;
    const targetShields = target.currentShields || 0;
    const targetHull = target.hull || 0;
    const targetHP = isPiercing ? targetHull : (targetShields + targetHull);
    const targetSurvives = targetHP > attackerDamage;

    if (targetSurvives && targetAttack > 0) {
      // Calculate if retaliate would be lethal to attacker
      const attackerShields = attacker.currentShields || 0;
      const attackerHull = attacker.hull || 0;
      const attackerHP = attackerShields + attackerHull;
      const wouldKillAttacker = targetAttack >= attackerHP;

      if (wouldKillAttacker) {
        score += PENALTIES.RETALIATE_LETHAL;
        logic.push(`Retaliate Risk: ${PENALTIES.RETALIATE_LETHAL} (${targetAttack} dmg - LETHAL)`);
      } else {
        const retaliatePenalty = targetAttack * PENALTIES.RETALIATE_DAMAGE_MULTIPLIER;
        score += retaliatePenalty;
        logic.push(`Retaliate Risk: ${retaliatePenalty} (${targetAttack} dmg)`);
      }
    }
  }

  return { score, logic };
};
