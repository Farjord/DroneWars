// ========================================
// DRONE CARD EVALUATORS
// ========================================
// Evaluates READY_DRONE and CREATE_TOKENS card effects

import fullDroneCollection from '../../../data/droneData.js';
import { SCORING_WEIGHTS, CARD_EVALUATION, INVALID_SCORE } from '../aiConstants.js';
import { calculateLaneScore } from '../scoring/laneScoring.js';
import { hasJammerInLane } from '../helpers/jammerHelpers.js';

/**
 * Evaluate a READY_DRONE card
 * Enhanced scoring that evaluates actual impact of readying the drone
 * @param {Object} card - The card being played
 * @param {Object} target - The target drone to ready
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateReadyDroneCard = (card, target, context) => {
  const {
    player1,
    player2,
    gameDataService,
    getLaneOfDrone,
    placedSections,
    allSections,
    getShipStatus
  } = context;
  const logic = [];
  let score = 0;

  const targetLane = getLaneOfDrone(target.id, player2);

  if (!targetLane) {
    // Drone not found on board
    return { score: INVALID_SCORE, logic: ['❌ Target not found on board'] };
  }

  const effectiveTarget = gameDataService.getEffectiveStats(target, targetLane);
  const baseDrone = fullDroneCollection.find(d => d.name === target.name);
  let totalScore = 0;

  // === OFFENSIVE POTENTIAL ===
  const effectiveAttack = Math.max(0, effectiveTarget.attack);
  const laneIndex = parseInt(targetLane.slice(-1)) - 1;
  const enemySectionName = placedSections[laneIndex];

  // Check for ship attack opportunity
  let shipAttackValue = 0;
  if (enemySectionName && player1.shipSections[enemySectionName].hull > 0) {
    const enemyDronesInLane = player1.dronesOnBoard[targetLane] || [];
    const hasGuardian = enemyDronesInLane.some(drone => {
      const effectiveStats = gameDataService.getEffectiveStats(drone, targetLane);
      return effectiveStats.keywords.has('GUARDIAN');
    });

    if (!hasGuardian) {
      let shipDamage = effectiveAttack;

      // Add BONUS_DAMAGE_VS_SHIP if present
      const bonusDamageAbility = baseDrone?.abilities?.find(a =>
        a.type === 'PASSIVE' && a.effect?.type === 'BONUS_DAMAGE_VS_SHIP'
      );
      if (bonusDamageAbility) {
        shipDamage += bonusDamageAbility.effect.value;
      }

      shipAttackValue = shipDamage * CARD_EVALUATION.SHIP_ATTACK_MULTIPLIER;
      logic.push(`✅ Ship Attack: +${shipAttackValue} (${shipDamage} dmg)`);
    }
  }

  // Count enemy drone targets
  const enemyDronesCount = (player1.dronesOnBoard[targetLane] || []).length;
  let droneAttackValue = 0;
  if (enemyDronesCount > 0 && effectiveAttack > 0) {
    droneAttackValue = effectiveAttack * CARD_EVALUATION.DRONE_ATTACK_MULTIPLIER * enemyDronesCount;
    logic.push(`✅ Drone Attacks: +${droneAttackValue} (${effectiveAttack} ATK × ${enemyDronesCount} targets)`);
  }

  totalScore += shipAttackValue + droneAttackValue;

  // === DEFENSIVE POTENTIAL ===
  const effectiveSpeed = effectiveTarget.speed || 0;
  const enemyDronesInLane = player1.dronesOnBoard[targetLane] || [];
  const enemyReadyDrones = enemyDronesInLane.filter(d => !d.isExhausted);

  // Count threats this drone can intercept
  const threatsCanBlock = enemyReadyDrones.filter(enemy => {
    const enemyStats = gameDataService.getEffectiveStats(enemy, targetLane);
    const enemySpeed = enemyStats.speed || 0;
    return effectiveSpeed > enemySpeed;
  });

  if (threatsCanBlock.length > 0) {
    const interceptionValue = threatsCanBlock.length * CARD_EVALUATION.INTERCEPTION_VALUE_PER_THREAT;
    totalScore += interceptionValue;
    logic.push(`🛡️ Interception: +${interceptionValue} (${threatsCanBlock.length} threats)`);
  }

  // === KEYWORD BONUSES ===
  const keywords = effectiveTarget.keywords || new Set();

  if (keywords.has('DEFENDER')) {
    totalScore += CARD_EVALUATION.DEFENDER_KEYWORD_BONUS;
    logic.push(`⭐ DEFENDER: +${CARD_EVALUATION.DEFENDER_KEYWORD_BONUS}`);
  }

  if (keywords.has('GUARDIAN')) {
    totalScore += CARD_EVALUATION.GUARDIAN_KEYWORD_BONUS;
    logic.push(`⭐ GUARDIAN: +${CARD_EVALUATION.GUARDIAN_KEYWORD_BONUS}`);
  }

  // === LANE IMPACT ANALYSIS ===
  const currentLaneScore = calculateLaneScore(targetLane, player2, player1, allSections, getShipStatus, gameDataService);

  // Simulate drone as ready
  const tempAiState = JSON.parse(JSON.stringify(player2));
  const droneInLane = tempAiState.dronesOnBoard[targetLane].find(d => d.id === target.id);
  if (droneInLane) {
    droneInLane.isExhausted = false;
  }

  const projectedLaneScore = calculateLaneScore(targetLane, tempAiState, player1, allSections, getShipStatus, gameDataService);
  const laneImpact = (projectedLaneScore - currentLaneScore) * CARD_EVALUATION.LANE_IMPACT_WEIGHT;

  if (laneImpact > 0) {
    totalScore += laneImpact;
    logic.push(`📊 Lane Impact: +${laneImpact.toFixed(0)}`);

    // Lane flip bonus
    if (currentLaneScore < 0 && projectedLaneScore >= 0) {
      totalScore += CARD_EVALUATION.LANE_FLIP_BONUS;
      logic.push(`🔄 Lane Flip: +${CARD_EVALUATION.LANE_FLIP_BONUS}`);
    }
  }

  // === COST PENALTY ===
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  totalScore -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score: totalScore, logic };
};

/**
 * Evaluate a CREATE_TOKENS card (Jammer deployment)
 * @param {Object} card - The card being played
 * @param {Object} target - The target (usually null)
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateCreateTokensCard = (card, target, context) => {
  const { player2 } = context;
  const logic = [];
  let score = 0;

  // Evaluate Jammers based on CPU value and available lanes
  const allFriendlyDrones = Object.values(player2.dronesOnBoard).flat();
  const totalCPUValue = allFriendlyDrones.reduce((sum, d) => sum + (d.class || 0), 0);
  const highValueDrones = allFriendlyDrones.filter(d => d.class >= 3).length;

  // Count available lanes (lanes without Jammers)
  const lanes = ['lane1', 'lane2', 'lane3'];
  const availableLanes = lanes.filter(laneId => !hasJammerInLane(player2, laneId)).length;
  const scalingFactor = availableLanes / 3;

  if (availableLanes === 0) {
    score = INVALID_SCORE;
    logic.push('❌ No available lanes (all have Jammers)');
  } else {
    const baseScore = CARD_EVALUATION.JAMMER_BASE_VALUE;
    const cpuValueBonus = totalCPUValue * CARD_EVALUATION.JAMMER_CPU_VALUE_MULTIPLIER;
    const highValueBonus = highValueDrones * CARD_EVALUATION.JAMMER_HIGH_VALUE_DRONE_BONUS;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;

    const unscaledScore = baseScore + cpuValueBonus + highValueBonus - costPenalty;
    score = unscaledScore * scalingFactor;

    logic.push(`✅ Base Value: +${baseScore}`);
    logic.push(`✅ CPU Protection: +${cpuValueBonus} (${totalCPUValue} total CPU)`);
    logic.push(`✅ High-Value Drones: +${highValueBonus} (${highValueDrones} drones)`);
    logic.push(`⚠️ Cost: -${costPenalty}`);
    logic.push(`📊 Available Lanes: ${availableLanes}/3 (${(scalingFactor * 100).toFixed(0)}% value)`);
  }

  return { score, logic };
};

/**
 * Evaluate an EXHAUST_DRONE card (EMP Burst)
 * Similar to DESTROY evaluation - targets high-threat ready drones
 * @param {Object} card - The card being played
 * @param {Object} target - The target drone to exhaust
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateExhaustDroneCard = (card, target, context) => {
  const {
    player1,
    player2,
    gameDataService,
    getLaneOfDrone,
    placedSections,
    allSections,
    getShipStatus
  } = context;
  const logic = [];
  let score = 0;

  // Check if target is already exhausted (invalid target)
  if (target.isExhausted) {
    return { score: INVALID_SCORE, logic: ['❌ Target already exhausted'] };
  }

  // Determine which player owns the drone
  const targetLane = getLaneOfDrone(target.id, player1) || getLaneOfDrone(target.id, player2);

  if (!targetLane) {
    return { score: INVALID_SCORE, logic: ['❌ Target not found on board'] };
  }

  // Get effective stats
  const effectiveTarget = gameDataService.getEffectiveStats(target, targetLane);
  const baseDrone = fullDroneCollection.find(d => d.name === target.name);
  let totalScore = 0;

  // === THREAT VALUE (attack potential denied) ===
  const effectiveAttack = Math.max(0, effectiveTarget.attack);
  const attackThreatValue = effectiveAttack * CARD_EVALUATION.EXHAUST_VALUE_MULTIPLIER;

  if (effectiveAttack > 0) {
    totalScore += attackThreatValue;
    logic.push(`✅ Attack Threat: +${attackThreatValue} (${effectiveAttack} ATK denied)`);
  }

  // === INTERCEPTION VALUE (if it's an interceptor) ===
  const keywords = effectiveTarget.keywords || new Set();
  const isInterceptor = target.class === 'Interceptor' || keywords.has('INTERCEPTOR');

  if (isInterceptor) {
    const interceptorValue = 30;
    totalScore += interceptorValue;
    logic.push(`✅ Interceptor: +${interceptorValue} (blocks our attacks)`);
  }

  // === KEYWORD BONUSES (high-value abilities denied) ===
  if (keywords.has('DEFENDER')) {
    totalScore += 15;
    logic.push(`⭐ DEFENDER: +15 (protects their drones)`);
  }

  if (keywords.has('GUARDIAN')) {
    totalScore += 20;
    logic.push(`⭐ GUARDIAN: +20 (protects their ship)`);
  }

  // === ACTIVE ABILITY VALUE ===
  const hasActiveAbility = baseDrone?.abilities?.some(a =>
    a.type === 'ACTIVATED' || (a.type === 'TRIGGERED' && ['ON_ATTACK', 'ON_DAMAGE_DEALT'].includes(a.trigger))
  );

  if (hasActiveAbility) {
    const abilityValue = 20;
    totalScore += abilityValue;
    logic.push(`✅ Active Ability: +${abilityValue} (ability denied)`);
  }

  // === LANE IMPACT ANALYSIS ===
  // Simulate exhausting the drone
  const ownerPlayer = getLaneOfDrone(target.id, player1) ? player1 : player2;
  const tempState = JSON.parse(JSON.stringify(ownerPlayer));
  const droneInLane = tempState.dronesOnBoard[targetLane]?.find(d => d.id === target.id);

  if (droneInLane) {
    droneInLane.isExhausted = true;
  }

  // Calculate lane score impact (for enemy exhaustion, this improves our position)
  const isEnemyDrone = getLaneOfDrone(target.id, player1);
  if (isEnemyDrone) {
    const currentLaneScore = calculateLaneScore(targetLane, player2, player1, allSections, getShipStatus, gameDataService);
    const projectedLaneScore = calculateLaneScore(targetLane, player2, tempState, allSections, getShipStatus, gameDataService);
    const laneImprovement = (projectedLaneScore - currentLaneScore) * 0.5; // Weighted at 50%

    if (laneImprovement > 0) {
      totalScore += laneImprovement;
      logic.push(`📊 Lane Advantage: +${laneImprovement.toFixed(0)}`);
    }
  }

  // === COST PENALTY ===
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  totalScore -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score: totalScore, logic };
};
