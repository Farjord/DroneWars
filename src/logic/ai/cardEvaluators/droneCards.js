// ========================================
// DRONE CARD EVALUATORS
// ========================================
// Evaluates READY_DRONE and CREATE_TOKENS card effects

import fullDroneCollection from '../../../data/droneData.js';
import { SCORING_WEIGHTS, CARD_EVALUATION, INVALID_SCORE, THRUSTER_INHIBITOR, PROXIMITY_MINE, INHIBITOR_MINE, JITTER_MINE } from '../aiConstants.js';
import { calculateLaneScore } from '../scoring/laneScoring.js';
import { hasJammerInLane } from '../helpers/jammerHelpers.js';
import { countDroneTypeInLane } from '../../utils/gameEngineUtils.js';

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
 * Evaluate a CREATE_TOKENS card
 * Dispatches to Jammer or Rally Beacon evaluator based on token type
 * @param {Object} card - The card being played
 * @param {Object} target - The target (null for Jammers, lane object for Rally Beacon)
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateCreateTokensCard = (card, target, context) => {
  if (card.effects[0].tokenName === 'Rally Beacon') {
    return evaluateRallyBeaconCard(card, target, context);
  }
  if (card.effects[0].tokenName === 'Thruster Inhibitor') {
    return evaluateThrusterInhibitorCard(card, target, context);
  }
  if (card.effects[0].tokenName === 'Proximity Mine') {
    return evaluateProximityMineCard(card, target, context);
  }
  if (card.effects[0].tokenName === 'Inhibitor Mine') {
    return evaluateInhibitorMineCard(card, target, context);
  }
  if (card.effects[0].tokenName === 'Jitter Mine') {
    return evaluateJitterMineCard(card, target, context);
  }
  return evaluateJammerCard(card, target, context);
};

/**
 * Evaluate a Jammer deployment card
 */
const evaluateJammerCard = (card, target, context) => {
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
 * Evaluate a Rally Beacon deployment card
 * Scores based on movement potential, adjacent drones, and movement cards in hand
 * @param {Object} card - The card being played
 * @param {Object} target - Lane target object { id: 'lane1', owner: 'player2' }
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
const evaluateRallyBeaconCard = (card, target, context) => {
  const { player2 } = context;
  const logic = [];
  let score = 0;

  // Target is a lane object from LaneTargetingProcessor
  const targetLane = target?.id;
  if (!targetLane) {
    return { score: INVALID_SCORE, logic: ['❌ No target lane'] };
  }

  // Check if lane already has a Rally Beacon (maxPerLane: 1)
  const dronesInLane = player2.dronesOnBoard[targetLane] || [];
  const hasBeacon = dronesInLane.some(d => d.isToken && d.name === 'Rally Beacon');
  if (hasBeacon) {
    return { score: INVALID_SCORE, logic: ['❌ Lane already has a Rally Beacon'] };
  }

  // Base value
  score += CARD_EVALUATION.RALLY_BEACON_BASE_VALUE;
  logic.push(`✅ Base Value: +${CARD_EVALUATION.RALLY_BEACON_BASE_VALUE}`);

  // Adjacent lane friendly drone count (movement potential into this lane)
  const laneIndex = parseInt(targetLane.slice(-1));
  const adjacentLanes = [];
  if (laneIndex > 1) adjacentLanes.push(`lane${laneIndex - 1}`);
  if (laneIndex < 3) adjacentLanes.push(`lane${laneIndex + 1}`);

  let adjacentDroneCount = 0;
  for (const adjLane of adjacentLanes) {
    const adjDrones = (player2.dronesOnBoard[adjLane] || []).filter(d => !d.isToken);
    adjacentDroneCount += adjDrones.length;
  }
  if (adjacentDroneCount > 0) {
    const adjBonus = adjacentDroneCount * CARD_EVALUATION.RALLY_BEACON_ADJACENT_DRONE_VALUE;
    score += adjBonus;
    logic.push(`✅ Adjacent Drones: +${adjBonus} (${adjacentDroneCount} drones)`);
  }

  // Friendly drones in same lane (can defend beacon)
  const defendingDrones = dronesInLane.filter(d => !d.isToken).length;
  if (defendingDrones > 0) {
    const defBonus = defendingDrones * CARD_EVALUATION.RALLY_BEACON_DEFENDING_DRONE_VALUE;
    score += defBonus;
    logic.push(`🛡️ Defending Drones: +${defBonus} (${defendingDrones} drones)`);
  }

  // Movement cards in hand bonus
  const movementCards = player2.hand.filter(c =>
    c.effect?.type === 'SINGLE_MOVE' || c.effect?.type === 'MULTI_MOVE'
  ).length;
  if (movementCards > 0) {
    const moveBonus = movementCards * CARD_EVALUATION.RALLY_BEACON_MOVEMENT_CARD_BONUS;
    score += moveBonus;
    logic.push(`✅ Movement Cards: +${moveBonus} (${movementCards} in hand)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score, logic };
};

/**
 * Evaluate a Thruster Inhibitor deployment card
 * Scores based on enemy drones locked down in the target lane
 * Card places a token on the OPPONENT's board to block movement out
 * @param {Object} card - The card being played
 * @param {Object} target - Lane target object { id: 'lane1', owner: 'player1' }
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
const evaluateThrusterInhibitorCard = (card, target, context) => {
  const { player1 } = context;
  const logic = [];
  let score = 0;

  // Target is an enemy lane object from LaneTargetingProcessor
  const targetLane = target?.id;
  if (!targetLane) {
    return { score: INVALID_SCORE, logic: ['❌ No target lane'] };
  }

  // Check if lane already has a Thruster Inhibitor (maxPerLane: 1)
  const dronesInLane = player1.dronesOnBoard[targetLane] || [];
  const hasInhibitor = dronesInLane.some(d => d.isToken && d.name === 'Thruster Inhibitor');
  if (hasInhibitor) {
    return { score: INVALID_SCORE, logic: ['❌ Lane already has a Thruster Inhibitor'] };
  }

  // Count non-token enemy drones that would be locked down
  const enemyDrones = dronesInLane.filter(d => !d.isToken);
  if (enemyDrones.length === 0) {
    return { score: INVALID_SCORE, logic: ['❌ No enemy drones in target lane to lock down'] };
  }

  // Base value
  score += THRUSTER_INHIBITOR.BASE_VALUE;
  logic.push(`✅ Base Value: +${THRUSTER_INHIBITOR.BASE_VALUE}`);

  // Value per locked drone
  const lockedValue = enemyDrones.length * THRUSTER_INHIBITOR.LOCKED_DRONE_VALUE;
  score += lockedValue;
  logic.push(`✅ Locked Drones: +${lockedValue} (${enemyDrones.length} drones)`);

  // Bonus for high-class drones being locked
  const highClassDrones = enemyDrones.filter(d => (d.class || 0) >= 3).length;
  if (highClassDrones > 0) {
    const highClassBonus = highClassDrones * THRUSTER_INHIBITOR.HIGH_CLASS_BONUS;
    score += highClassBonus;
    logic.push(`✅ High-Class Lockdown: +${highClassBonus} (${highClassDrones} class 3+ drones)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score, logic };
};

/**
 * Evaluate a Proximity Mine deployment card
 * Scores based on drones in adjacent lanes that might move into the target lane
 * @param {Object} card - The card being played
 * @param {Object} target - Lane target object { id: 'lane1', owner: 'player1' }
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
const evaluateProximityMineCard = (card, target, context) => {
  const { player1 } = context;
  const logic = [];
  let score = 0;

  const targetLane = target?.id;
  if (!targetLane) {
    return { score: INVALID_SCORE, logic: ['❌ No target lane'] };
  }

  // Check if lane already has a Proximity Mine
  const dronesInLane = player1.dronesOnBoard[targetLane] || [];
  const hasMine = dronesInLane.some(d => d.isToken && d.name === 'Proximity Mine');
  if (hasMine) {
    return { score: INVALID_SCORE, logic: ['❌ Lane already has a Proximity Mine'] };
  }

  // Base value
  score += PROXIMITY_MINE.BASE_VALUE;
  logic.push(`✅ Base Value: +${PROXIMITY_MINE.BASE_VALUE}`);

  // Count drones in adjacent lanes that could move into the target lane
  const laneIndex = parseInt(targetLane.slice(-1));
  const adjacentLanes = [];
  if (laneIndex > 1) adjacentLanes.push(`lane${laneIndex - 1}`);
  if (laneIndex < 3) adjacentLanes.push(`lane${laneIndex + 1}`);

  let adjacentDroneCount = 0;
  for (const adjLane of adjacentLanes) {
    const adjDrones = (player1.dronesOnBoard[adjLane] || []).filter(d => !d.isToken && !d.isExhausted);
    adjacentDroneCount += adjDrones.length;
  }

  if (adjacentDroneCount > 0) {
    const adjBonus = adjacentDroneCount * PROXIMITY_MINE.THREAT_PER_ADJACENT_DRONE;
    score += adjBonus;
    logic.push(`✅ Adjacent Moveable Drones: +${adjBonus} (${adjacentDroneCount} drones)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score, logic };
};

/**
 * Evaluate an Inhibitor Mine deployment card
 * Scores based on opponent's undeployed drones and empty lane slots
 * @param {Object} card - The card being played
 * @param {Object} target - Lane target object { id: 'lane1', owner: 'player1' }
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
const evaluateInhibitorMineCard = (card, target, context) => {
  const { player1 } = context;
  const logic = [];
  let score = 0;

  const targetLane = target?.id;
  if (!targetLane) {
    return { score: INVALID_SCORE, logic: ['❌ No target lane'] };
  }

  // Check if lane already has an Inhibitor Mine
  const dronesInLane = player1.dronesOnBoard[targetLane] || [];
  const hasMine = dronesInLane.some(d => d.isToken && d.name === 'Inhibitor Mine');
  if (hasMine) {
    return { score: INVALID_SCORE, logic: ['❌ Lane already has an Inhibitor Mine'] };
  }

  // Base value
  score += INHIBITOR_MINE.BASE_VALUE;
  logic.push(`✅ Base Value: +${INHIBITOR_MINE.BASE_VALUE}`);

  // Value based on how few drones opponent has in this lane (more room for deployment)
  const enemyDronesInLane = dronesInLane.filter(d => !d.isToken).length;
  const emptySlots = Math.max(0, 4 - enemyDronesInLane); // rough estimate of deployment room
  if (emptySlots > 0) {
    const deployThreat = emptySlots * INHIBITOR_MINE.DEPLOYMENT_THREAT_VALUE;
    score += deployThreat;
    logic.push(`✅ Deployment Threat: +${deployThreat} (${emptySlots} empty slots)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score, logic };
};

/**
 * Evaluate a Jitter Mine deployment card
 * Scores based on drones in target lane that haven't attacked yet
 * @param {Object} card - The card being played
 * @param {Object} target - Lane target object { id: 'lane1', owner: 'player1' }
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
const evaluateJitterMineCard = (card, target, context) => {
  const { player1, gameDataService } = context;
  const logic = [];
  let score = 0;

  const targetLane = target?.id;
  if (!targetLane) {
    return { score: INVALID_SCORE, logic: ['❌ No target lane'] };
  }

  // Check if lane already has a Jitter Mine
  const dronesInLane = player1.dronesOnBoard[targetLane] || [];
  const hasMine = dronesInLane.some(d => d.isToken && d.name === 'Jitter Mine');
  if (hasMine) {
    return { score: INVALID_SCORE, logic: ['❌ Lane already has a Jitter Mine'] };
  }

  // Base value
  score += JITTER_MINE.BASE_VALUE;
  logic.push(`✅ Base Value: +${JITTER_MINE.BASE_VALUE}`);

  // Value based on ready drones in the target lane (drones that could attack)
  const readyDrones = dronesInLane.filter(d => !d.isToken && !d.isExhausted);
  for (const drone of readyDrones) {
    const effectiveStats = gameDataService.getEffectiveStats(drone, targetLane);
    const attack = Math.max(0, effectiveStats.attack);
    if (attack > 0) {
      // Higher value for high-attack drones (reducing 4 attack matters more on a 6-attack drone)
      const droneValue = JITTER_MINE.ATTACK_REDUCTION_VALUE + attack * 2;
      score += droneValue;
      logic.push(`✅ ${drone.name}: +${droneValue} (${attack} ATK drone)`);
    }
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

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
