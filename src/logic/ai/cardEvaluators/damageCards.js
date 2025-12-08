// ========================================
// DAMAGE CARD EVALUATORS
// ========================================
// Evaluates DESTROY and DAMAGE card effects

import { SCORING_WEIGHTS, CARD_EVALUATION, INVALID_SCORE } from '../aiConstants.js';

/**
 * Evaluate a DESTROY card
 * @param {Object} card - The card being played
 * @param {Object} target - The target of the card
 * @param {Object} context - Evaluation context with player states and services
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateDestroyCard = (card, target, context) => {
  const { player1, player2, gameDataService } = context;
  const logic = [];
  let score = 0;

  if (card.effect.scope === 'SINGLE' && target) {
    const resourceValue = (target.hull || 0) + (target.currentShields || 0);
    const targetValue = resourceValue * SCORING_WEIGHTS.RESOURCE_VALUE_MULTIPLIER;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = targetValue - costPenalty;
    logic.push(`✅ Target Value: +${targetValue}`);
    logic.push(`⚠️ Cost: -${costPenalty}`);
  }
  else if (card.effect.scope === 'FILTERED' && target && target.id.startsWith('lane')) {
    const { stat, comparison, value } = card.effect.filter;
    const laneId = target.id;
    const dronesInLane = player1.dronesOnBoard[laneId] || [];
    let totalResourceValue = 0;

    dronesInLane.forEach(drone => {
      // Use effective stats to include upgrades and ability modifiers
      const effectiveStats = gameDataService.getEffectiveStats(drone, laneId);
      const effectiveStatValue = effectiveStats[stat] !== undefined ? effectiveStats[stat] : drone[stat];

      let meetsCondition = false;
      if (comparison === 'GTE' && effectiveStatValue >= value) meetsCondition = true;
      if (comparison === 'LTE' && effectiveStatValue <= value) meetsCondition = true;
      if (meetsCondition) {
        totalResourceValue += (drone.hull || 0) + (drone.currentShields || 0) + (drone.class * 5);
      }
    });

    const filteredValue = totalResourceValue * CARD_EVALUATION.FILTERED_DESTROY_MULTIPLIER;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = filteredValue - costPenalty;
    logic.push(`✅ Filtered Targets: +${filteredValue}`);
    logic.push(`⚠️ Cost: -${costPenalty}`);
  }
  else if (card.effect.scope === 'LANE' && target && target.id.startsWith('lane')) {
    const laneId = target.id;
    const enemyDrones = player1.dronesOnBoard[laneId] || [];
    const friendlyDrones = player2.dronesOnBoard[laneId] || [];

    const calculateWeightedValue = (drones) => {
      return drones.reduce((sum, d) => {
        const baseValue = (d.hull || 0) + (d.currentShields || 0) + (d.class * 5);
        return sum + (d.isExhausted ? baseValue : baseValue * CARD_EVALUATION.READY_DRONE_WEIGHT);
      }, 0);
    };

    const enemyValue = calculateWeightedValue(enemyDrones);
    const friendlyValue = calculateWeightedValue(friendlyDrones);

    const netValue = (enemyValue - friendlyValue) * CARD_EVALUATION.LANE_DESTROY_MULTIPLIER;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;

    score = netValue - costPenalty;

    logic.push(`✅ Net Lane Value: +${netValue.toFixed(0)} (Enemy: ${enemyValue.toFixed(0)}, Friendly: ${friendlyValue.toFixed(0)})`);
    logic.push(`⚠️ Cost: -${costPenalty}`);
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
  const { player1, gameDataService } = context;
  const logic = [];
  let score = 0;

  if (card.effect.scope === 'FILTERED' && target.id.startsWith('lane') && card.effect.filter) {
    const { stat, comparison, value } = card.effect.filter;
    const dronesInLane = player1.dronesOnBoard[target.id] || [];
    let potentialDamage = 0;
    let targetsHit = 0;
    const laneId = target.id;

    dronesInLane.forEach(drone => {
      const effectiveTarget = gameDataService.getEffectiveStats(drone, laneId);
      let meetsCondition = false;
      if (comparison === 'GTE' && effectiveTarget[stat] >= value) meetsCondition = true;
      if (comparison === 'LTE' && effectiveTarget[stat] <= value) meetsCondition = true;

      if (meetsCondition) {
        targetsHit++;
        potentialDamage += card.effect.value;
      }
    });

    const damageValue = potentialDamage * CARD_EVALUATION.FILTERED_DAMAGE_MULTIPLIER;
    const multiHitBonus = targetsHit > 1 ? targetsHit * CARD_EVALUATION.MULTI_HIT_BONUS_PER_TARGET : 0;
    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    score = damageValue + multiHitBonus - costPenalty;

    logic.push(`✅ Filtered Damage: +${damageValue} (${targetsHit} targets)`);
    if (multiHitBonus > 0) logic.push(`✅ Multi-Hit: +${multiHitBonus}`);
    logic.push(`⚠️ Cost: -${costPenalty}`);
  } else {
    // Single target damage
    if (card.effect.damageType === 'PIERCING') {
      const shieldBypassValue = (target.currentShields || 0);
      logic.push(`✅ Piercing: Bypasses ${shieldBypassValue} shields`);
    }

    const damageScore = card.effect.value * CARD_EVALUATION.DAMAGE_MULTIPLIER;
    logic.push(`✅ Base Damage: +${damageScore}`);
    let finalScore = damageScore;

    // Lethal bonus
    if (card.effect.value >= target.hull) {
      const lethalBonus = (target.class * CARD_EVALUATION.LETHAL_CLASS_MULTIPLIER) + CARD_EVALUATION.LETHAL_BASE_BONUS;
      finalScore += lethalBonus;
      logic.push(`✅ Lethal Bonus: +${lethalBonus}`);
    }

    const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    finalScore -= costPenalty;
    logic.push(`⚠️ Cost: -${costPenalty}`);

    score = finalScore;
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
  const logic = [];
  let score = 0;

  // Extract effect properties
  const { baseDamage, isPiercing, markedBonus = 0 } = card.effect;

  // Calculate effective damage (including marked bonus if applicable)
  const isMarked = target.isMarked || false;
  const totalDamage = baseDamage + (isMarked ? markedBonus : 0);

  // Calculate damage needed to kill drone (piercing ignores shields)
  const damageToKill = isPiercing ? target.hull : (target.currentShields || 0) + target.hull;

  // Calculate overflow damage
  const willKill = totalDamage >= damageToKill;
  const overflowDamage = willKill ? Math.max(0, totalDamage - damageToKill) : 0;

  // Base damage value
  const damageValue = totalDamage * CARD_EVALUATION.DAMAGE_MULTIPLIER;
  score += damageValue;
  logic.push(`✅ Damage: +${damageValue} (${totalDamage} × 8)`);

  // Marked bonus logging
  if (isMarked && markedBonus > 0) {
    logic.push(`✅ Marked Target: +${markedBonus} bonus damage`);
  }

  // Lethal bonus
  if (willKill) {
    const lethalBonus = (target.class * CARD_EVALUATION.LETHAL_CLASS_MULTIPLIER) + CARD_EVALUATION.LETHAL_BASE_BONUS;
    score += lethalBonus;
    logic.push(`✅ Lethal: +${lethalBonus} (class ${target.class} × 15 + 50)`);
  }

  // Overflow bonus (ship damage is very valuable)
  if (overflowDamage > 0) {
    const overflowBonus = overflowDamage * CARD_EVALUATION.OVERFLOW_SHIP_DAMAGE_MULTIPLIER;
    score += overflowBonus;
    logic.push(`✅ Overflow to Ship: +${overflowBonus} (${overflowDamage} × 12)`);
  }

  // Piercing bonus (value of bypassing shields)
  if (isPiercing && (target.currentShields || 0) > 0) {
    const piercingBonus = target.currentShields * CARD_EVALUATION.PIERCING_SHIELD_BYPASS_MULTIPLIER;
    score += piercingBonus;
    logic.push(`✅ Piercing: +${piercingBonus} (bypasses ${target.currentShields} shields)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

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

  // Get lane and all enemy drones in lane
  const laneId = getLaneOfDrone(target.id, player1);
  const enemyDronesInLane = player1.dronesOnBoard[laneId] || [];
  const friendlyDronesInLane = player2.dronesOnBoard[laneId] || [];

  // Check conditional for bonus damage
  const { primaryDamage, splashDamage, conditional } = card.effect;
  let bonusDamage = 0;

  if (conditional?.type === 'FRIENDLY_COUNT_IN_LANE') {
    const friendlyCount = friendlyDronesInLane.length;
    if (friendlyCount >= conditional.threshold) {
      bonusDamage = conditional.bonusDamage;
      logic.push(`✅ Bonus Damage: +${bonusDamage} (${friendlyCount} friendly drones in lane)`);
    }
  }

  const effectivePrimaryDamage = primaryDamage + bonusDamage;
  const effectiveSplashDamage = splashDamage + bonusDamage;

  // Find target index to determine adjacent drones
  const targetIndex = enemyDronesInLane.findIndex(d => d.id === target.id);
  const adjacentDrones = [];

  if (targetIndex > 0) {
    adjacentDrones.push(enemyDronesInLane[targetIndex - 1]);
  }
  if (targetIndex < enemyDronesInLane.length - 1) {
    adjacentDrones.push(enemyDronesInLane[targetIndex + 1]);
  }

  // Score primary target damage
  const primaryDamageScore = effectivePrimaryDamage * CARD_EVALUATION.DAMAGE_MULTIPLIER;
  score += primaryDamageScore;
  logic.push(`✅ Primary Damage: +${primaryDamageScore} (${effectivePrimaryDamage} to target)`);

  // Check for lethal on primary target
  if (effectivePrimaryDamage >= target.hull) {
    const lethalBonus = (target.class * CARD_EVALUATION.LETHAL_CLASS_MULTIPLIER) + CARD_EVALUATION.LETHAL_BASE_BONUS;
    score += lethalBonus;
    logic.push(`✅ Lethal on Target: +${lethalBonus}`);
  }

  // Score splash damage to adjacent drones
  let targetsHit = 1; // Primary target
  adjacentDrones.forEach(adj => {
    const splashScore = effectiveSplashDamage * CARD_EVALUATION.DAMAGE_MULTIPLIER;
    score += splashScore;
    targetsHit++;

    // Check for lethal on adjacent
    if (effectiveSplashDamage >= adj.hull) {
      const lethalBonus = (adj.class * CARD_EVALUATION.LETHAL_CLASS_MULTIPLIER) + CARD_EVALUATION.LETHAL_BASE_BONUS;
      score += lethalBonus;
    }
  });

  if (adjacentDrones.length > 0) {
    logic.push(`✅ Splash Damage: +${adjacentDrones.length * effectiveSplashDamage * CARD_EVALUATION.DAMAGE_MULTIPLIER} (${adjacentDrones.length} adjacent)`);
  }

  // Multi-hit bonus
  if (targetsHit > 1) {
    const multiHitBonus = targetsHit * CARD_EVALUATION.MULTI_HIT_BONUS_PER_TARGET;
    score += multiHitBonus;
    logic.push(`✅ Multi-Hit: +${multiHitBonus} (${targetsHit} targets)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

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
  const { player2, getLaneOfDrone } = context;
  const logic = [];
  let score = 0;

  // Get the lane of the target
  const laneId = getLaneOfDrone(target.id, context.player1);
  const friendlyDronesInLane = player2.dronesOnBoard[laneId] || [];

  // Calculate damage based on source
  let damage = 0;
  const { source } = card.effect;

  if (source === 'READY_DRONES_IN_LANE') {
    damage = friendlyDronesInLane.filter(d => !d.isExhausted).length;
    logic.push(`✅ Scaling Damage: ${damage} (${damage} ready friendly drones)`);
  }

  // Score the damage
  const damageScore = damage * CARD_EVALUATION.DAMAGE_MULTIPLIER;
  score += damageScore;

  // Check for lethal
  if (damage >= target.hull) {
    const lethalBonus = (target.class * CARD_EVALUATION.LETHAL_CLASS_MULTIPLIER) + CARD_EVALUATION.LETHAL_BASE_BONUS;
    score += lethalBonus;
    logic.push(`✅ Lethal: +${lethalBonus} (${damage} dmg >= ${target.hull} hull)`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

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
    // Attack upgrades are more valuable to remove
    if (stat === 'attack') {
      score = value * 20;
    } else if (stat === 'speed') {
      score = value * 10;
    } else {
      score = value * 8;
    }
    logic.push(`✅ Upgrade Destroyed: +${score} (${stat} +${value})`);
  } else if (target.keyword) {
    // Keyword upgrades (like PIERCING) have fixed value
    score = 25;
    logic.push(`✅ Upgrade Destroyed: +${score} (${target.keyword} keyword)`);
  } else {
    // Unknown upgrade type, use default value
    score = 15;
    logic.push(`✅ Upgrade Destroyed: +${score}`);
  }

  // Cost penalty
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  score -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  return { score, logic };
};
