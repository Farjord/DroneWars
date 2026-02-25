// ========================================
// STATUS EFFECT CARD EVALUATORS
// ========================================
// Evaluates status effect cards: Cannot Move, Cannot Attack, Cannot Intercept,
// Does Not Ready, and Clear All Status

import fullDroneCollection from '../../../data/droneData.js';
import { SCORING_WEIGHTS, CARD_EVALUATION, INVALID_SCORE } from '../aiConstants.js';
import { calculateLaneScore } from '../scoring/laneScoring.js';

/**
 * Evaluate APPLY_CANNOT_MOVE card (System Lock)
 * Denies movement and ON_MOVE abilities
 * @param {Object} card - The card being played
 * @param {Object} target - The target enemy drone
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateApplyCannotMoveCard = (card, target, context) => {
  const {
    player1,
    player2,
    gameDataService,
    getLaneOfDrone,
    allSections,
    getShipStatus
  } = context;
  const logic = [];
  let totalScore = 0;

  // Validate target exists
  if (!target) {
    return { score: INVALID_SCORE, logic: ['❌ No target provided'] };
  }

  // Check if target already has this status (invalid)
  if (target.cannotMove) {
    return { score: INVALID_SCORE, logic: ['❌ Target already cannot move'] };
  }

  // Find target's lane
  const targetLane = getLaneOfDrone(target.id, player1);
  if (!targetLane) {
    return { score: INVALID_SCORE, logic: ['❌ Target not found on board'] };
  }

  // Get effective stats
  const effectiveTarget = gameDataService.getEffectiveStats(target, targetLane);
  const baseDrone = fullDroneCollection.find(d => d.name === target.name);

  // === BASE THREAT VALUE (attack potential locked in place) ===
  const effectiveAttack = Math.max(0, effectiveTarget.attack);
  const baseThreat = effectiveAttack * CARD_EVALUATION.STATUS_MOVE_DENY_MULTIPLIER;

  if (effectiveAttack > 0) {
    totalScore += baseThreat;
    logic.push(`✅ Attack Locked: +${baseThreat.toFixed(0)} (${effectiveAttack} ATK)`);
  }

  // === ON_MOVE ABILITY BONUS ===
  const hasOnMoveAbility = baseDrone?.abilities?.some(
    a => a.type === 'TRIGGERED' && a.trigger === 'ON_MOVE'
  );

  if (hasOnMoveAbility) {
    totalScore += CARD_EVALUATION.ON_MOVE_ABILITY_BONUS;
    logic.push(`⭐ ON_MOVE Ability: +${CARD_EVALUATION.ON_MOVE_ABILITY_BONUS}`);
  }

  // === REDUCED VALUE IF EXHAUSTED (can't move this turn anyway) ===
  if (target.isExhausted) {
    totalScore *= 0.5;
    logic.push(`⚠️ Already Exhausted: ×0.5`);
  }

  // === COST PENALTY ===
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  totalScore -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  logic.push(`= Total: ${totalScore.toFixed(1)}`);
  return { score: totalScore, logic };
};

/**
 * Evaluate APPLY_CANNOT_ATTACK card (Weapon Malfunction)
 * Denies attack actions permanently
 * @param {Object} card - The card being played
 * @param {Object} target - The target enemy drone
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateApplyCannotAttackCard = (card, target, context) => {
  const {
    player1,
    player2,
    gameDataService,
    getLaneOfDrone,
    allSections,
    getShipStatus
  } = context;
  const logic = [];
  let totalScore = 0;

  // Validate target exists
  if (!target) {
    return { score: INVALID_SCORE, logic: ['❌ No target provided'] };
  }

  // Check if target already has this status (invalid)
  if (target.cannotAttack) {
    return { score: INVALID_SCORE, logic: ['❌ Target already cannot attack'] };
  }

  // Find target's lane
  const targetLane = getLaneOfDrone(target.id, player1);
  if (!targetLane) {
    return { score: INVALID_SCORE, logic: ['❌ Target not found on board'] };
  }

  // Get effective stats
  const effectiveTarget = gameDataService.getEffectiveStats(target, targetLane);
  const baseDrone = fullDroneCollection.find(d => d.name === target.name);

  // === BASE THREAT VALUE (direct threat denial) ===
  const effectiveAttack = Math.max(0, effectiveTarget.attack);
  const baseThreat = effectiveAttack * CARD_EVALUATION.STATUS_ATTACK_DENY_MULTIPLIER;

  if (effectiveAttack > 0) {
    totalScore += baseThreat;
    logic.push(`✅ Threat Denied: +${baseThreat.toFixed(0)} (${effectiveAttack} ATK)`);
  }

  // === KEYWORD BONUSES ===
  const keywords = effectiveTarget.keywords || new Set();

  if (keywords.has('GUARDIAN')) {
    totalScore += 30;
    logic.push(`⭐ GUARDIAN: +30 (protects ship)`);
  }

  if (keywords.has('DEFENDER')) {
    totalScore += 15;
    logic.push(`⭐ DEFENDER: +15 (protects drones)`);
  }

  // === CLASS BONUS (higher class = higher threat) ===
  if (target.class >= 2) {
    const classBonus = target.class === 2 ? 10 : 15;
    totalScore += classBonus;
    logic.push(`⭐ High Class (${target.class}): +${classBonus}`);
  }

  // === AFTER_ATTACK ABILITY BONUS ===
  const hasAfterAttackAbility = baseDrone?.abilities?.some(
    a => a.effect?.type === 'AFTER_ATTACK'
  );

  if (hasAfterAttackAbility) {
    totalScore += 15;
    logic.push(`⭐ AFTER_ATTACK Ability: +15`);
  }

  // === REDUCED VALUE IF EXHAUSTED (no immediate threat) ===
  if (target.isExhausted) {
    totalScore *= 0.6;
    logic.push(`⚠️ Already Exhausted: ×0.6`);
  }

  // === COST PENALTY ===
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  totalScore -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  logic.push(`= Total: ${totalScore.toFixed(1)}`);
  return { score: totalScore, logic };
};

/**
 * Evaluate APPLY_CANNOT_INTERCEPT card (Sensor Jam)
 * Denies interception capability
 * @param {Object} card - The card being played
 * @param {Object} target - The target enemy drone
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateApplyCannotInterceptCard = (card, target, context) => {
  const {
    player1,
    player2,
    gameDataService,
    getLaneOfDrone
  } = context;
  const logic = [];
  let totalScore = 0;

  // Validate target exists
  if (!target) {
    return { score: INVALID_SCORE, logic: ['❌ No target provided'] };
  }

  // Check if target already has this status (invalid)
  if (target.cannotIntercept) {
    return { score: INVALID_SCORE, logic: ['❌ Target already cannot intercept'] };
  }

  // Find target's lane
  const targetLane = getLaneOfDrone(target.id, player1);
  if (!targetLane) {
    return { score: INVALID_SCORE, logic: ['❌ Target not found on board'] };
  }

  // Get effective stats
  const effectiveTarget = gameDataService.getEffectiveStats(target, targetLane);

  // === BASE INTERCEPTION VALUE (speed-based) ===
  const effectiveSpeed = Math.max(0, effectiveTarget.speed);
  const baseValue = effectiveSpeed * CARD_EVALUATION.STATUS_INTERCEPT_DENY_MULTIPLIER;

  if (effectiveSpeed > 0) {
    totalScore += baseValue;
    logic.push(`✅ Interception Blocked: +${baseValue.toFixed(0)} (${effectiveSpeed} SPD)`);
  }

  // === KEYWORD BONUSES ===
  const keywords = effectiveTarget.keywords || new Set();

  if (keywords.has('ALWAYS_INTERCEPTS')) {
    totalScore += 30;
    logic.push(`⭐ ALWAYS_INTERCEPTS: +30`);
  }

  if (keywords.has('DOGFIGHT')) {
    totalScore += 20;
    logic.push(`⭐ DOGFIGHT: +20 (dangerous interceptor)`);
  }

  // === FRIENDLY ATTACKER BONUS ===
  // Count ready friendly drones in same lane who can attack
  const friendlyDronesInLane = player2.dronesOnBoard[targetLane] || [];
  const readyAttackers = friendlyDronesInLane.filter(d => !d.isExhausted && d.attack > 0);

  if (readyAttackers.length > 0) {
    const attackerBonus = readyAttackers.length * 15;
    totalScore += attackerBonus;
    logic.push(`✅ Enables ${readyAttackers.length} Attacker(s): +${attackerBonus}`);
  }

  // === LOW VALUE IF EXHAUSTED (already can't intercept this turn) ===
  if (target.isExhausted) {
    totalScore *= 0.5;
    logic.push(`⚠️ Already Exhausted: ×0.5`);
  }

  // === COST PENALTY ===
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  totalScore -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  logic.push(`= Total: ${totalScore.toFixed(1)}`);
  return { score: totalScore, logic };
};

/**
 * Evaluate APPLY_DOES_NOT_READY card (Stasis Field)
 * Prevents readying next turn (temporary effect)
 * @param {Object} card - The card being played
 * @param {Object} target - The target enemy drone
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateApplyDoesNotReadyCard = (card, target, context) => {
  const {
    player1,
    gameDataService,
    getLaneOfDrone
  } = context;
  const logic = [];
  let totalScore = 0;

  // Validate target exists
  if (!target) {
    return { score: INVALID_SCORE, logic: ['❌ No target provided'] };
  }

  // Check if target already has this status (invalid)
  if (target.doesNotReady) {
    return { score: INVALID_SCORE, logic: ['❌ Target already has does not ready'] };
  }

  // Find target's lane
  const targetLane = getLaneOfDrone(target.id, player1);
  if (!targetLane) {
    return { score: INVALID_SCORE, logic: ['❌ Target not found on board'] };
  }

  // Get effective stats
  const effectiveTarget = gameDataService.getEffectiveStats(target, targetLane);
  const baseDrone = fullDroneCollection.find(d => d.name === target.name);

  // === BASE THREAT VALUE (one turn delay) ===
  const effectiveAttack = Math.max(0, effectiveTarget.attack);
  const baseThreat = effectiveAttack * CARD_EVALUATION.STATUS_READY_DENY_MULTIPLIER;
  const temporaryThreat = baseThreat * CARD_EVALUATION.STATUS_READY_DURATION_FACTOR;

  if (effectiveAttack > 0) {
    totalScore += temporaryThreat;
    logic.push(`✅ Next Turn Delayed: +${temporaryThreat.toFixed(0)} (${effectiveAttack} ATK)`);
  }

  // === CLASS BONUS ===
  if (target.class >= 2) {
    const classBonus = target.class === 2 ? 8 : 12;
    totalScore += classBonus;
    logic.push(`⭐ High Class (${target.class}): +${classBonus}`);
  }

  // === POWERFUL ABILITY BONUS ===
  const hasPowerfulAbility = baseDrone?.abilities?.some(a =>
    a.type === 'ACTIVATED' ||
    (a.type === 'TRIGGERED' && ['ON_ROUND_START', 'ON_ATTACK'].includes(a.trigger))
  );

  if (hasPowerfulAbility) {
    totalScore += 10;
    logic.push(`⭐ Powerful Ability: +10`);
  }

  // === BONUS IF READY (denies immediate threat) ===
  if (!target.isExhausted) {
    totalScore += 10;
    logic.push(`✅ Currently Ready: +10`);
  } else {
    // Lower value if already exhausted (effect delayed)
    totalScore *= 0.7;
    logic.push(`⚠️ Already Exhausted: ×0.7`);
  }

  // === COST PENALTY ===
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  totalScore -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  logic.push(`= Total: ${totalScore.toFixed(1)}`);
  return { score: totalScore, logic };
};

/**
 * Evaluate CLEAR_ALL_STATUS card (System Restore)
 * Removes all status effects from friendly drone
 * @param {Object} card - The card being played
 * @param {Object} target - The target friendly drone
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
export const evaluateClearAllStatusCard = (card, target, context) => {
  const {
    player2,
    getLaneOfDrone
  } = context;
  const logic = [];
  let totalScore = 0;

  // Validate target exists
  if (!target) {
    return { score: INVALID_SCORE, logic: ['❌ No target provided'] };
  }

  // Find target's lane (should be in player2 - our drones)
  const targetLane = getLaneOfDrone(target.id, player2);
  if (!targetLane) {
    return { score: INVALID_SCORE, logic: ['❌ Target not found on board'] };
  }

  // === COUNT STATUS EFFECTS TO CLEAR ===
  let statusCount = 0;

  if (target.cannotMove) {
    statusCount++;
    totalScore += CARD_EVALUATION.STATUS_CLEAR_VALUE_PER_EFFECT;
    logic.push(`✅ Clears Cannot Move: +${CARD_EVALUATION.STATUS_CLEAR_VALUE_PER_EFFECT}`);
  }

  if (target.cannotAttack) {
    statusCount++;
    totalScore += CARD_EVALUATION.STATUS_CLEAR_VALUE_PER_EFFECT;
    logic.push(`✅ Clears Cannot Attack: +${CARD_EVALUATION.STATUS_CLEAR_VALUE_PER_EFFECT}`);
  }

  if (target.cannotIntercept) {
    statusCount++;
    totalScore += CARD_EVALUATION.STATUS_CLEAR_VALUE_PER_EFFECT;
    logic.push(`✅ Clears Cannot Intercept: +${CARD_EVALUATION.STATUS_CLEAR_VALUE_PER_EFFECT}`);
  }

  if (target.doesNotReady) {
    statusCount++;
    totalScore += CARD_EVALUATION.STATUS_CLEAR_VALUE_PER_EFFECT;
    logic.push(`✅ Clears Does Not Ready: +${CARD_EVALUATION.STATUS_CLEAR_VALUE_PER_EFFECT}`);
  }

  if (target.isMarked) {
    totalScore += CARD_EVALUATION.STATUS_MARKED_CLEAR_BONUS;
    logic.push(`✅ Clears Marked: +${CARD_EVALUATION.STATUS_MARKED_CLEAR_BONUS}`);
    statusCount++;
  }

  // === INVALID IF NO STATUSES TO CLEAR ===
  if (statusCount === 0) {
    return { score: INVALID_SCORE, logic: ['❌ Target has no status effects to clear'] };
  }

  // === HIGH-CLASS DRONE BONUS ===
  if (target.class >= 2) {
    const classBonus = 20;
    totalScore += classBonus;
    logic.push(`⭐ High-Value Drone (Class ${target.class}): +${classBonus}`);
  }

  // === GO_AGAIN BONUS ===
  if (card.effects[0].goAgain) {
    totalScore += 30;
    logic.push(`⭐ Go Again: +30 (extra action)`);
  }

  // === COST PENALTY ===
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
  totalScore -= costPenalty;
  logic.push(`⚠️ Cost: -${costPenalty}`);

  logic.push(`= Total: ${totalScore.toFixed(1)}`);
  return { score: totalScore, logic };
};
