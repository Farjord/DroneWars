// ========================================
// HULL INTEGRITY AI HELPERS
// ========================================
// Helper functions for percentage-based win condition calculations
// Used by AI to make decisions based on total hull damage model

import WinConditionChecker from '../../game/WinConditionChecker.js';
import { DEFENSE_URGENCY, WIN_RACE, THRESHOLD_BONUS } from '../aiConstants.js';
import { getShipStatus } from '../../statsCalculator.js';

/**
 * Calculate damage percentage for a player
 * @param {Object} playerState - Player state with shipSections
 * @returns {number} Damage percentage (0.0 to 1.0)
 */
export function calculateDamagePercentage(playerState) {
  if (!playerState?.shipSections) return 0;

  const integrity = WinConditionChecker.calculateHullIntegrity(playerState);
  if (integrity.totalMaxHull === 0) return 0;

  return integrity.totalDamageDealt / integrity.totalMaxHull;
}

/**
 * Calculate win race advantage (positive = AI ahead, negative = AI behind)
 * @param {Object} aiState - AI player state (player2)
 * @param {Object} opponentState - Human player state (player1)
 * @returns {number} Damage race advantage (-1.0 to 1.0)
 */
export function calculateWinRaceAdvantage(aiState, opponentState) {
  const aiDamagePercent = calculateDamagePercentage(aiState);
  const opponentDamagePercent = calculateDamagePercentage(opponentState);

  // Positive means AI has dealt more damage (ahead)
  // Negative means AI has taken more damage (behind)
  return opponentDamagePercent - aiDamagePercent;
}

/**
 * Calculate defense urgency multiplier based on AI's damage taken
 * Higher values = more defensive priority
 * @param {number} damagePercent - AI's damage percentage (0.0 to 1.0)
 * @returns {number} Defense urgency multiplier
 */
export function calculateDefenseUrgency(damagePercent) {
  if (damagePercent < DEFENSE_URGENCY.LOW_DAMAGE_THRESHOLD) {
    return DEFENSE_URGENCY.BASELINE_MULTIPLIER;
  }
  if (damagePercent < DEFENSE_URGENCY.MEDIUM_DAMAGE_THRESHOLD) {
    return DEFENSE_URGENCY.MODERATE_MULTIPLIER;
  }
  if (damagePercent < DEFENSE_URGENCY.HIGH_DAMAGE_THRESHOLD) {
    return DEFENSE_URGENCY.HIGH_MULTIPLIER;
  }
  return DEFENSE_URGENCY.CRITICAL_MULTIPLIER;
}

/**
 * Calculate defense penalty for potential damage
 * Scales with urgency (how close AI is to losing)
 * @param {number} potentialDamage - Amount of hull damage threatened
 * @param {Object} aiState - AI player state
 * @returns {number} Defense penalty (negative number)
 */
export function calculateDefensePenalty(potentialDamage, aiState) {
  const damagePercent = calculateDamagePercentage(aiState);
  const urgency = calculateDefenseUrgency(damagePercent);

  return potentialDamage * DEFENSE_URGENCY.BASE_DAMAGE_PENALTY * urgency;
}

/**
 * Apply win race adjustments to offense/defense multipliers
 * @param {Object} aiState - AI player state
 * @param {Object} opponentState - Human player state
 * @returns {Object} { defenseMultiplier, offenseMultiplier }
 */
export function calculateWinRaceAdjustments(aiState, opponentState) {
  const advantage = calculateWinRaceAdvantage(aiState, opponentState);

  if (advantage > WIN_RACE.ADVANTAGE_THRESHOLD) {
    // AI significantly ahead - protect the lead
    return {
      defenseMultiplier: WIN_RACE.AHEAD_DEFENSE_MULTIPLIER,
      offenseMultiplier: WIN_RACE.AHEAD_OFFENSE_MULTIPLIER
    };
  }

  if (advantage < -WIN_RACE.ADVANTAGE_THRESHOLD) {
    // AI significantly behind - be more aggressive
    return {
      defenseMultiplier: WIN_RACE.BEHIND_DEFENSE_MULTIPLIER,
      offenseMultiplier: WIN_RACE.BEHIND_OFFENSE_MULTIPLIER
    };
  }

  // Balanced - no adjustment
  return {
    defenseMultiplier: 1.0,
    offenseMultiplier: 1.0
  };
}

/**
 * Calculate bonus for attacks that cross status thresholds
 * (Small bonus for stat penalties from damaged/critical)
 * @param {Object} section - Ship section being attacked
 * @param {number} damage - Damage to be dealt
 * @returns {number} Threshold crossing bonus
 */
export function calculateThresholdCrossingBonus(section, damage) {
  if (!section || !section.thresholds) return 0;

  const currentStatus = getShipStatus(section);
  const projectedHull = Math.max(0, section.hull - damage);

  // Check what status would result from the damage
  let projectedStatus = 'healthy';
  if (projectedHull <= section.thresholds.critical) {
    projectedStatus = 'critical';
  } else if (projectedHull <= section.thresholds.damaged) {
    projectedStatus = 'damaged';
  }

  // Calculate bonus for crossing thresholds
  let bonus = 0;

  if (currentStatus === 'healthy' && projectedStatus === 'damaged') {
    bonus += THRESHOLD_BONUS.CROSS_TO_DAMAGED;
  }

  if (currentStatus === 'healthy' && projectedStatus === 'critical') {
    bonus += THRESHOLD_BONUS.CROSS_TO_DAMAGED + THRESHOLD_BONUS.CROSS_TO_CRITICAL;
  }

  if (currentStatus === 'damaged' && projectedStatus === 'critical') {
    bonus += THRESHOLD_BONUS.CROSS_TO_CRITICAL;
  }

  return bonus;
}

/**
 * Get a human-readable description of AI's damage state
 * Useful for logging/debugging
 * @param {Object} aiState - AI player state
 * @returns {string} Description like "LOW (15%)", "CRITICAL (58%)"
 */
export function getDamageStateDescription(aiState) {
  const damagePercent = calculateDamagePercentage(aiState);
  const percentDisplay = Math.round(damagePercent * 100);

  if (damagePercent < DEFENSE_URGENCY.LOW_DAMAGE_THRESHOLD) {
    return `LOW (${percentDisplay}%)`;
  }
  if (damagePercent < DEFENSE_URGENCY.MEDIUM_DAMAGE_THRESHOLD) {
    return `MODERATE (${percentDisplay}%)`;
  }
  if (damagePercent < DEFENSE_URGENCY.HIGH_DAMAGE_THRESHOLD) {
    return `HIGH (${percentDisplay}%)`;
  }
  return `CRITICAL (${percentDisplay}%)`;
}

/**
 * Get win race description for logging
 * @param {Object} aiState - AI player state
 * @param {Object} opponentState - Human player state
 * @returns {string} Description like "AHEAD (+15%)", "BEHIND (-8%)"
 */
export function getWinRaceDescription(aiState, opponentState) {
  const advantage = calculateWinRaceAdvantage(aiState, opponentState);
  const percentDisplay = Math.round(advantage * 100);

  if (advantage > WIN_RACE.ADVANTAGE_THRESHOLD) {
    return `AHEAD (+${percentDisplay}%)`;
  }
  if (advantage < -WIN_RACE.ADVANTAGE_THRESHOLD) {
    return `BEHIND (${percentDisplay}%)`;
  }
  return `BALANCED (${percentDisplay > 0 ? '+' : ''}${percentDisplay}%)`;
}
