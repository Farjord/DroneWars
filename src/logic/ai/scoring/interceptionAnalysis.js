// ========================================
// INTERCEPTION ANALYSIS
// ========================================
// Analyzes interception dynamics in a lane
// Used for attack scoring and interception decision-making

import fullDroneCollection from '../../../data/droneData.js';
import { calculateDroneImpact } from './droneImpact.js';
import { getShipStatus } from '../../statsCalculator.js';
import {
  calculateDamagePercentage,
  calculateDefenseUrgency,
  calculateWinRaceAdvantage,
  getDamageStateDescription
} from '../helpers/hullIntegrityHelpers.js';

/**
 * Analyze interception dynamics in a specific lane
 * Categorizes drones by their ability to intercept or be intercepted
 *
 * @param {string} laneId - Lane to analyze
 * @param {Object} player1 - Player 1 state (opponent)
 * @param {Object} player2 - Player 2 state (AI)
 * @param {Object} gameDataService - GameDataService instance for stat calculations
 * @returns {Object} Object containing interception analysis:
 *   - aiSlowAttackers: AI drones that can be intercepted by enemy
 *   - aiUncheckedThreats: AI drones too fast to be intercepted
 *   - aiDefensiveInterceptors: AI drones that can intercept enemy threats
 *   - enemyInterceptors: Enemy drones that can intercept AI attacks
 */
export const analyzeInterceptionInLane = (laneId, player1, player2, gameDataService) => {
  const aiDrones = player2.dronesOnBoard[laneId] || [];
  const enemyDrones = player1.dronesOnBoard[laneId] || [];

  // Calculate max speeds in lane
  const aiReadyDrones = aiDrones.filter(d => !d.isExhausted);
  const enemyReadyDrones = enemyDrones.filter(d => !d.isExhausted);

  const aiMaxSpeed = aiReadyDrones.length > 0
    ? Math.max(...aiReadyDrones.map(d => gameDataService.getEffectiveStats(d, laneId).speed))
    : 0;
  const enemyMaxSpeed = enemyReadyDrones.length > 0
    ? Math.max(...enemyReadyDrones.map(d => gameDataService.getEffectiveStats(d, laneId).speed))
    : 0;

  // Categorize AI drones
  const aiSlowAttackers = [];
  const aiUncheckedThreats = [];
  const aiDefensiveInterceptors = [];

  aiReadyDrones.forEach(drone => {
    const stats = gameDataService.getEffectiveStats(drone, laneId);
    const droneSpeed = stats.speed || 0;

    // Slow attacker: can be intercepted by enemy (speed <= enemy max speed)
    if (droneSpeed <= enemyMaxSpeed && enemyMaxSpeed > 0) {
      aiSlowAttackers.push(drone.id);
    }

    // Unchecked threat: too fast to be intercepted (speed > enemy max speed)
    if (droneSpeed > enemyMaxSpeed) {
      aiUncheckedThreats.push(drone.id);
    }

    // Defensive interceptor: can intercept enemy threats (equal or faster than at least one enemy)
    const canInterceptEnemy = enemyReadyDrones.some(e => {
      const enemyStats = gameDataService.getEffectiveStats(e, laneId);
      return droneSpeed >= (enemyStats.speed || 0);
    });
    if (canInterceptEnemy) {
      aiDefensiveInterceptors.push(drone.id);
    }
  });

  // Enemy interceptors that can block AI attacks (equal or faster than AI max speed)
  const enemyInterceptors = enemyReadyDrones
    .filter(d => {
      const stats = gameDataService.getEffectiveStats(d, laneId);
      return (stats.speed || 0) >= aiMaxSpeed && aiMaxSpeed > 0;
    })
    .map(d => d.id);

  return {
    aiSlowAttackers,
    aiUncheckedThreats,
    aiDefensiveInterceptors,
    enemyInterceptors
  };
};

/**
 * Calculate total threats that a defensive interceptor is keeping in check
 *
 * CRITICAL: This calculates the ship threat potential of ALL enemy drones that would
 * become free to attack if this defensive interceptor exhausts by ATTACKING.
 *
 * Note: Intercepting does NOT exhaust drones - they can intercept multiple times.
 * However, ATTACKING still exhausts drones, which means they can no longer intercept.
 * This function evaluates the cost of using a drone for offense vs defense.
 *
 * Also determines if these threats would cause a state transition on the AI's ship section,
 * and counts how many sections are already damaged (for context-aware penalty scaling).
 *
 * @param {Object} attacker - The AI drone considering attacking
 * @param {string} laneId - Lane ID where the attacker is located
 * @param {Object} player1 - Enemy player state
 * @param {Object} player2 - AI player state
 * @param {Object} gameDataService - GameDataService instance for stat calculations
 * @param {Array} aiPlacedSections - AI's section placement array (3 section names)
 * @returns {Object} - { totalThreatDamage, totalImpact, threatsKeptInCheck, wouldCauseStateTransition, currentSectionStatus, damagedSectionCount }
 */
export const calculateThreatsKeptInCheck = (attacker, laneId, player1, player2, gameDataService, aiPlacedSections) => {
  const attackerSpeed = gameDataService.getEffectiveStats(attacker, laneId).speed || 0;
  const enemyDrones = player1.dronesOnBoard[laneId] || [];
  const enemyReadyDrones = enemyDrones.filter(d => !d.isExhausted);

  const threatsKeptInCheck = [];
  let totalThreatDamage = 0;
  let totalImpact = 0;

  // Find all enemy drones slower than this attacker (threats being kept in check)
  enemyReadyDrones.forEach(enemy => {
    const enemyStats = gameDataService.getEffectiveStats(enemy, laneId);
    const enemySpeed = enemyStats.speed || 0;

    // If this attacker is equal or faster, it's keeping this enemy in check
    if (attackerSpeed >= enemySpeed) {
      // Calculate ship threat potential (includes BONUS_DAMAGE_VS_SHIP)
      let shipThreatDamage = enemyStats.attack || 0;

      const baseEnemy = fullDroneCollection.find(d => d.name === enemy.name);
      const bonusDamageAbility = baseEnemy?.abilities?.find(a =>
        a.type === 'PASSIVE' && a.effect?.type === 'BONUS_DAMAGE_VS_SHIP'
      );
      if (bonusDamageAbility) {
        shipThreatDamage += bonusDamageAbility.effect.value;
      }

      // Calculate impact using the same formula as calculateDroneImpact
      const impact = calculateDroneImpact(enemy, laneId, gameDataService);

      threatsKeptInCheck.push({
        name: enemy.name,
        shipThreatDamage,
        impact,
        speed: enemySpeed
      });

      totalThreatDamage += shipThreatDamage;
      totalImpact += impact;
    }
  });

  // Get the AI's section in this lane
  const laneIndex = parseInt(laneId.slice(-1)) - 1;
  const sectionName = aiPlacedSections?.[laneIndex];
  const aiSection = sectionName ? player2.shipSections?.[sectionName] : null;

  // Calculate percentage-based defense metrics
  const aiDamagePercent = calculateDamagePercentage(player2);
  const defenseUrgency = calculateDefenseUrgency(aiDamagePercent);
  const damageStateDescription = getDamageStateDescription(player2);

  if (!aiSection) {
    // No section in lane - no defensive value
    return {
      totalThreatDamage,
      totalImpact,
      threatsKeptInCheck,
      wouldCauseStateTransition: false,
      currentSectionStatus: 'healthy',
      damagedSectionCount: 0,
      // New percentage-based metrics
      aiDamagePercent,
      defenseUrgency,
      damageStateDescription
    };
  }

  const currentStatus = getShipStatus(aiSection);
  const currentHull = aiSection.hull;
  const currentShields = aiSection.shields || 0;

  // Calculate potential damage (shields absorb first)
  const effectiveDamage = Math.max(0, totalThreatDamage - currentShields);
  const projectedHull = currentHull - effectiveDamage;

  // Check if this would cause a state transition (still useful for small bonus)
  const wouldTransition = checkWouldTransition(currentStatus, projectedHull, aiSection.thresholds);

  // Count how many sections are ALREADY damaged/critical (kept for backwards compatibility)
  const damagedSectionCount = countDamagedSections(player2, aiPlacedSections);

  return {
    totalThreatDamage,
    totalImpact,
    threatsKeptInCheck,
    wouldCauseStateTransition: wouldTransition,
    currentSectionStatus: currentStatus,
    damagedSectionCount,
    // New percentage-based metrics
    aiDamagePercent,
    defenseUrgency,
    damageStateDescription
  };
};

/**
 * Check if damage would cause a state transition
 * @param {string} currentStatus - Current section status ('healthy', 'damaged', 'critical')
 * @param {number} projectedHull - Hull value after projected damage
 * @param {Object} thresholds - Section thresholds { damaged, critical }
 * @returns {boolean} True if would cause transition to worse state
 */
const checkWouldTransition = (currentStatus, projectedHull, thresholds) => {
  if (!thresholds) return false;

  if (currentStatus === 'healthy' && projectedHull <= thresholds.damaged) {
    return true; // Would become damaged
  }
  if (currentStatus === 'damaged' && projectedHull <= thresholds.critical) {
    return true; // Would become critical
  }
  return false; // No transition (or already critical)
};

/**
 * Count sections already in damaged/critical state
 * @param {Object} playerState - Player state to check
 * @param {Array} placedSections - Array of section names in lane order
 * @returns {number} Count of damaged/critical sections (0, 1, or 2)
 */
const countDamagedSections = (playerState, placedSections) => {
  if (!placedSections || !playerState?.shipSections) return 0;

  let count = 0;
  for (const sectionName of placedSections) {
    if (!sectionName) continue;
    const section = playerState.shipSections[sectionName];
    if (section) {
      const status = getShipStatus(section);
      if (status === 'damaged' || status === 'critical') {
        count++;
      }
    }
  }
  return count;
};
