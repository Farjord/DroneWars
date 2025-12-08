// ========================================
// DRONE ATTACK EVALUATOR
// ========================================
// Evaluates drone-on-drone attack actions

import fullDroneCollection from '../../../data/droneData.js';
import { ATTACK_BONUSES, PENALTIES, SCORING_WEIGHTS } from '../aiConstants.js';
import { calculateLaneScore } from '../scoring/laneScoring.js';

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
  let score = 0;

  const effectiveAttacker = gameDataService.getEffectiveStats(attacker, attacker.lane);
  const effectiveTarget = gameDataService.getEffectiveStats(target, attacker.lane);

  // Base score from target class
  score = effectiveTarget.class * ATTACK_BONUSES.BASE_CLASS_MULTIPLIER;
  logic.push(`(Target Class: ${effectiveTarget.class} * ${ATTACK_BONUSES.BASE_CLASS_MULTIPLIER})`);

  // Favorable trade bonus
  if (effectiveAttacker.class < effectiveTarget.class) {
    score += ATTACK_BONUSES.FAVORABLE_TRADE;
    logic.push(`✅ Favorable Trade: +${ATTACK_BONUSES.FAVORABLE_TRADE}`);
  }

  // Ready target bonus
  if (!target.isExhausted) {
    score += ATTACK_BONUSES.READY_TARGET;
    logic.push(`✅ Ready Target: +${ATTACK_BONUSES.READY_TARGET}`);
  }

  // Anti-ship drone penalty (wasting ship-damage potential on drones)
  const baseAttacker = fullDroneCollection.find(d => d.name === attacker.name);
  const isAntiShip = baseAttacker?.abilities.some(ability =>
    ability.type === 'PASSIVE' && ability.effect?.type === 'BONUS_DAMAGE_VS_SHIP'
  );

  if (isAntiShip) {
    score += PENALTIES.ANTI_SHIP_ATTACKING_DRONE;
    logic.push(`⚠️ Anti-Ship Drone: ${PENALTIES.ANTI_SHIP_ATTACKING_DRONE}`);
  }

  // Piercing damage bonus (static or conditional)
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
      logic.push(`✅ Hunter Protocol: Piercing vs marked target`);
    }
  }

  if (isPiercing) {
    const bonus = effectiveTarget.currentShields * SCORING_WEIGHTS.PIERCING_SHIELD_MULTIPLIER;
    score += bonus;
    logic.push(`✅ Piercing Damage: +${bonus}`);
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
    logic.push(`✅ Growth: +${bonus} (gains +${statGain} ${growthAbility.effect.subEffect.mod?.stat || 'stat'})`);
  }

  // Guardian protection check - heavily penalize attacking with Guardians when enemies present
  const isGuardian = effectiveAttacker.keywords.has('GUARDIAN');
  if (isGuardian) {
    const enemyDronesInLane = player1.dronesOnBoard[attacker.lane] || [];
    const enemyReadyDrones = enemyDronesInLane.filter(d => !d.isExhausted);

    if (enemyReadyDrones.length > 0) {
      score += PENALTIES.GUARDIAN_ATTACK_RISK;
      logic.push(`🛡️ Guardian Protection Risk: ${PENALTIES.GUARDIAN_ATTACK_RISK} (${enemyReadyDrones.length} ready enemies)`);
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
    logic.push(`📊 Lane Impact: +${impactBonus}`);

    // Lane flip bonus
    if (currentLaneScore < 0 && projectedLaneScore >= 0) {
      const flipMagnitude = Math.abs(currentLaneScore) + projectedLaneScore;
      const laneFlipBonus = Math.floor(flipMagnitude * ATTACK_BONUSES.LANE_FLIP_WEIGHT);
      score += laneFlipBonus;
      logic.push(`🔄 Lane Flip: +${laneFlipBonus} (${currentLaneScore.toFixed(0)} → ${projectedLaneScore.toFixed(0)})`);
    }
  }

  return { score, logic };
};
