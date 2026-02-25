// ========================================
// DAMAGE CARD EVALUATORS
// ========================================
// Evaluates DESTROY and DAMAGE card effects
// Uses unified target scoring for consistent prioritization

import { SCORING_WEIGHTS, CARD_EVALUATION } from '../aiConstants.js';
import { calculateTargetValue } from '../scoring/targetScoring.js';
import { LaneControlCalculator } from '../../combat/LaneControlCalculator.js';

/**
 * Evaluate a DESTROY card
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card
 * @param {Object} context - Evaluation context with player states and services
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDestroyCard = (card, target, context) => {
  const { player1, player2, gameDataService, getLaneOfDrone } = context;
  const logic = [];
  let score = 0;

  if (card.effects[0].scope === 'SINGLE' && target) {
    // Get lane for context-aware scoring
    const lane = getLaneOfDrone ? getLaneOfDrone(target.id, player1) : target.lane;

    // Use unified target scoring (damage = 999 for destroy)
    const { score: targetValue, logic: targetLogic } = calculateTargetValue(target, context, {
      damageAmount: 999,
      isPiercing: false,
      lane
    });

    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = targetValue - costPenalty;

    logic.push(`Target Value: +${targetValue}`);
    logic.push(...targetLogic.map(l => `  ${l}`));
    logic.push(`Cost: -${costPenalty}`);
  }
  else if (card.effects[0]?.targeting?.affectedFilter && target && target.id.startsWith('lane')) {
    const { stat, comparison, value } = card.effects[0].targeting.affectedFilter[0];
    const laneId = target.id;
    const dronesInLane = player1.dronesOnBoard[laneId] || [];
    let totalValue = 0;
    let matchCount = 0;

    dronesInLane.forEach(drone => {
      const effectiveStats = gameDataService.getEffectiveStats(drone, laneId);
      const effectiveStatValue = effectiveStats[stat] !== undefined ? effectiveStats[stat] : drone[stat];

      let meetsCondition = false;
      if (comparison === 'GTE' && effectiveStatValue >= value) meetsCondition = true;
      if (comparison === 'LTE' && effectiveStatValue <= value) meetsCondition = true;

      if (meetsCondition) {
        const { score: droneValue } = calculateTargetValue(drone, context, {
          damageAmount: 999,
          isPiercing: false,
          lane: laneId
        });
        totalValue += droneValue;
        matchCount++;
      }
    });

    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = totalValue - costPenalty;

    logic.push(`Filtered Targets (${matchCount}): +${totalValue}`);
    logic.push(`Cost: -${costPenalty}`);
  }
  else if (card.effects[0].scope === 'LANE' && target && target.id.startsWith('lane')) {
    const laneId = target.id;
    const enemyDrones = player1.dronesOnBoard[laneId] || [];
    const friendlyDrones = player2.dronesOnBoard[laneId] || [];

    // Calculate value of enemy drones we destroy
    let enemyValue = 0;
    enemyDrones.forEach(drone => {
      const { score: droneValue } = calculateTargetValue(drone, context, {
        damageAmount: 999,
        isPiercing: false,
        lane: laneId
      });
      enemyValue += droneValue;
    });

    // Calculate value of friendly drones we lose (same scoring, swapped perspective)
    const friendlyContext = { ...context, player1: player2, player2: player1 };
    let friendlyValue = 0;
    friendlyDrones.forEach(drone => {
      const { score: droneValue } = calculateTargetValue(drone, friendlyContext, {
        damageAmount: 999,
        isPiercing: false,
        lane: laneId
      });
      friendlyValue += droneValue;
    });

    const netValue = enemyValue - friendlyValue;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = netValue - costPenalty;

    logic.push(`Net Lane Value: +${netValue.toFixed(0)} (Enemy: ${enemyValue.toFixed(0)}, Friendly: ${friendlyValue.toFixed(0)})`);
    logic.push(`Cost: -${costPenalty}`);
  }

  return { score, logic };
};

/**
 * Evaluate a DAMAGE card
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card
 * @param {Object} context - Evaluation context with player states and services
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDamageCard = (card, target, context) => {
  const { player1, gameDataService, getLaneOfDrone } = context;
  const logic = [];
  let score = 0;

  if (card.effects[0]?.targeting?.affectedFilter && target.id.startsWith('lane')) {
    const { stat, comparison, value } = card.effects[0].targeting.affectedFilter[0];
    const laneId = target.id;
    const dronesInLane = player1.dronesOnBoard[laneId] || [];
    let totalValue = 0;
    let targetsHit = 0;

    dronesInLane.forEach(drone => {
      const effectiveTarget = gameDataService.getEffectiveStats(drone, laneId);
      let meetsCondition = false;
      if (comparison === 'GTE' && effectiveTarget[stat] >= value) meetsCondition = true;
      if (comparison === 'LTE' && effectiveTarget[stat] <= value) meetsCondition = true;

      if (meetsCondition) {
        targetsHit++;
        const { score: droneValue } = calculateTargetValue(drone, context, {
          damageAmount: card.effects[0].value,
          isPiercing: card.effects[0].damageType === 'PIERCING',
          damageType: card.effects[0].damageType,
          lane: laneId
        });
        totalValue += droneValue;
      }
    });

    const multiHitBonus = targetsHit > 1 ? targetsHit * CARD_EVALUATION.MULTI_HIT_BONUS_PER_TARGET : 0;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = totalValue + multiHitBonus - costPenalty;

    logic.push(`Filtered Damage (${targetsHit} targets): +${totalValue}`);
    if (multiHitBonus > 0) logic.push(`Multi-Hit: +${multiHitBonus}`);
    logic.push(`Cost: -${costPenalty}`);
  } else {
    // Single target damage - use unified scoring
    const lane = getLaneOfDrone ? getLaneOfDrone(target.id, player1) : target.lane;
    const isPiercing = card.effects[0].damageType === 'PIERCING';

    const { score: targetValue, logic: targetLogic } = calculateTargetValue(target, context, {
      damageAmount: card.effects[0].value,
      isPiercing,
      damageType: card.effects[0].damageType,
      lane
    });

    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = targetValue - costPenalty;

    logic.push(`Target Value: +${targetValue}`);
    logic.push(...targetLogic.map(l => `  ${l}`));
    logic.push(`Cost: -${costPenalty}`);
  }

  return { score, logic };
};

/**
 * Evaluate an OVERFLOW_DAMAGE card (e.g., Railgun Strike)
 * Overflow damage passes through to ship sections when drone is killed
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card
 * @param {Object} context - Evaluation context with player states and services
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateOverflowDamageCard = (card, target, context) => {
  const { player1, getLaneOfDrone } = context;
  const logic = [];
  let score = 0;

  const { baseDamage, isPiercing, markedBonus = 0 } = card.effects[0];
  const isMarked = target.isMarked || false;
  const totalDamage = baseDamage + (isMarked ? markedBonus : 0);

  // Get lane for context-aware scoring
  const lane = getLaneOfDrone ? getLaneOfDrone(target.id, player1) : target.lane;

  // Use unified target scoring
  const { score: targetValue, logic: targetLogic } = calculateTargetValue(target, context, {
    damageAmount: totalDamage,
    isPiercing,
    damageType: card.effects[0].damageType,
    lane
  });

  score += targetValue;
  logic.push(`Target Value: +${targetValue}`);
  logic.push(...targetLogic.map(l => `  ${l}`));

  // Marked bonus logging
  if (isMarked && markedBonus > 0) {
    logic.push(`Marked Target: +${markedBonus} bonus damage`);
  }

  // Calculate overflow damage (additional value beyond target scoring)
  const damageToKill = isPiercing ? target.hull : (target.currentShields || 0) + target.hull;
  const willKill = totalDamage >= damageToKill;
  const overflowDamage = willKill ? Math.max(0, totalDamage - damageToKill) : 0;

  if (overflowDamage > 0) {
    const overflowBonus = overflowDamage * CARD_EVALUATION.OVERFLOW_SHIP_DAMAGE_MULTIPLIER;
    score += overflowBonus;
    logic.push(`Overflow to Ship: +${overflowBonus} (${overflowDamage} dmg)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`Cost: -${costPenalty}`);

  return { score, logic };
};

/**
 * Evaluate a SPLASH_DAMAGE card (e.g., Barrage)
 * Deals damage to target and adjacent drones in the same lane
 * @param {Object} card - The card being played
 * @param {Object} target - The primary target drone
 * @param {Object} context - Evaluation context with player states and services
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateSplashDamageCard = (card, target, context) => {
  const { player1, player2, getLaneOfDrone } = context;
  const logic = [];
  let score = 0;

  const laneId = getLaneOfDrone(target.id, player1);
  const enemyDronesInLane = player1.dronesOnBoard[laneId] || [];
  const friendlyDronesInLane = player2.dronesOnBoard[laneId] || [];

  // Check conditional for bonus damage
  const { primaryDamage, splashDamage, conditional } = card.effects[0];
  let bonusDamage = 0;

  if (conditional?.type === 'FRIENDLY_COUNT_IN_LANE') {
    const friendlyCount = friendlyDronesInLane.length;
    if (friendlyCount >= conditional.threshold) {
      bonusDamage = conditional.bonusDamage;
      logic.push(`Bonus Damage: +${bonusDamage} (${friendlyCount} friendly drones)`);
    }
  }

  const effectivePrimaryDamage = primaryDamage + bonusDamage;
  const effectiveSplashDamage = splashDamage + bonusDamage;

  // Score primary target using unified scoring
  const { score: primaryValue, logic: primaryLogic } = calculateTargetValue(target, context, {
    damageAmount: effectivePrimaryDamage,
    isPiercing: false,
    damageType: card.effects[0].damageType,
    lane: laneId
  });

  score += primaryValue;
  logic.push(`Primary Target: +${primaryValue}`);

  // Find adjacent drones
  const targetIndex = enemyDronesInLane.findIndex(d => d.id === target.id);
  const adjacentDrones = [];

  if (targetIndex > 0) {
    adjacentDrones.push(enemyDronesInLane[targetIndex - 1]);
  }
  if (targetIndex < enemyDronesInLane.length - 1) {
    adjacentDrones.push(enemyDronesInLane[targetIndex + 1]);
  }

  // Score splash damage to adjacent drones
  let targetsHit = 1;
  adjacentDrones.forEach(adj => {
    const { score: adjValue } = calculateTargetValue(adj, context, {
      damageAmount: effectiveSplashDamage,
      isPiercing: false,
      damageType: card.effects[0].damageType,
      lane: laneId
    });
    score += adjValue;
    targetsHit++;
  });

  if (adjacentDrones.length > 0) {
    logic.push(`Splash (${adjacentDrones.length} adjacent): included in score`);
  }

  // Multi-hit bonus
  if (targetsHit > 1) {
    const multiHitBonus = targetsHit * CARD_EVALUATION.MULTI_HIT_BONUS_PER_TARGET;
    score += multiHitBonus;
    logic.push(`Multi-Hit: +${multiHitBonus} (${targetsHit} targets)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`Cost: -${costPenalty}`);

  return { score, logic };
};

/**
 * Evaluate a DAMAGE_SCALING card (e.g., Overwhelming Force)
 * Damage scales based on a source (e.g., ready drones in lane)
 * @param {Object} card - The card being played
 * @param {Object} target - The target drone
 * @param {Object} context - Evaluation context with player states and services
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDamageScalingCard = (card, target, context) => {
  const { player1, player2, getLaneOfDrone } = context;
  const logic = [];
  let score = 0;

  const laneId = getLaneOfDrone(target.id, player1);
  const friendlyDronesInLane = player2.dronesOnBoard[laneId] || [];

  // Calculate damage based on source
  let damage = 0;
  const { source } = card.effects[0];

  if (source === 'READY_DRONES_IN_LANE') {
    damage = friendlyDronesInLane.filter(d => !d.isExhausted).length;
    logic.push(`Scaling Damage: ${damage} (${damage} ready friendly drones)`);
  }

  // Use unified target scoring with calculated damage
  const { score: targetValue, logic: targetLogic } = calculateTargetValue(target, context, {
    damageAmount: damage,
    isPiercing: false,
    damageType: card.effects[0].damageType,
    lane: laneId
  });

  score += targetValue;
  logic.push(`Target Value: +${targetValue}`);

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`Cost: -${costPenalty}`);

  return { score, logic };
};

/**
 * Evaluate a DESTROY_UPGRADE card (e.g., System Sabotage)
 * Destroys an upgrade on an enemy drone type
 * @param {Object} card - The card being played
 * @param {Object} target - The target upgrade
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDestroyUpgradeCard = (card, target, context) => {
  const logic = [];
  let score = 0;

  // Calculate upgrade value based on what it provides
  if (target.mod) {
    const { stat, value } = target.mod;
    if (stat === 'attack') {
      score = value * 20;
    } else if (stat === 'speed') {
      score = value * 10;
    } else {
      score = value * 8;
    }
    logic.push(`Upgrade Destroyed: +${score} (${stat} +${value})`);
  } else if (target.keyword) {
    score = 25;
    logic.push(`Upgrade Destroyed: +${score} (${target.keyword} keyword)`);
  } else {
    score = 15;
    logic.push(`Upgrade Destroyed: +${score}`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`Cost: -${costPenalty}`);

  return { score, logic };
};

/**
 * Evaluate a CONDITIONAL_SECTION_DAMAGE card (doctrine cards)
 * Scores based on damage * number of target sections, reduced if shields block kinetic
 * @param {Object} card - The card being played
 * @param {Object} target - The target ship section
 * @param {Object} context - Evaluation context with player states and services
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateConditionalSectionDamageCard = (card, target, context) => {
  const { player1, player2 } = context;
  const logic = [];
  let score = 0;

  const effect = card.effects[0];
  const actingPlayerId = 'player2'; // AI is always player2
  const opponentId = 'player1';

  // Check if lane control condition is met
  const laneControl = LaneControlCalculator.calculateLaneControl(player1, player2);
  let conditionMet = false;

  if (effect.condition.type === 'CONTROL_LANES') {
    conditionMet = LaneControlCalculator.checkLaneControl(
      actingPlayerId, effect.condition.lanes, laneControl, effect.condition.operator || 'ALL'
    );
  } else if (effect.condition.type === 'CONTROL_LANE_EMPTY') {
    // For Overrun, check the specific section's corresponding lane
    const sectionToLane = { 'left': 'lane1', 'middle': 'lane2', 'right': 'lane3' };
    const lane = sectionToLane[target.id];
    if (lane) {
      conditionMet = LaneControlCalculator.checkLaneControlEmpty(
        actingPlayerId, lane, player1, player2, laneControl
      );
    }
  }

  if (!conditionMet) {
    logic.push('Lane control condition NOT met');
    return { score: 0, logic };
  }

  // Determine number of sections that will be hit
  let sectionCount = 1;
  if (effect.targets === 'FLANK_SECTIONS') sectionCount = 2;
  else if (effect.targets === 'ALL_SECTIONS') sectionCount = 3;

  // Base value: damage * sections * damage value weight
  const baseValue = effect.damage * sectionCount * SCORING_WEIGHTS.DAMAGE_VALUE_MULTIPLIER;
  score += baseValue;
  logic.push(`Section Damage: ${effect.damage} x ${sectionCount} sections = +${baseValue}`);

  // Kinetic damage is blocked by shields - reduce value if sections have shields
  if (effect.damageType === 'KINETIC') {
    const opponentSections = player1.shipSections;
    let shieldedCount = 0;
    Object.values(opponentSections).forEach(section => {
      if (section.allocatedShields > 0) shieldedCount++;
    });
    if (shieldedCount > 0) {
      const shieldPenalty = shieldedCount * 5;
      score -= shieldPenalty;
      logic.push(`Kinetic vs Shields: -${shieldPenalty} (${shieldedCount} shielded sections)`);
    }
  }

  // Cost penalty
  const totalCost = card.cost + (card.momentumCost || 0) * 3;
  const costPenalty = totalCost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`Cost: -${costPenalty}`);

  return { score, logic };
};
