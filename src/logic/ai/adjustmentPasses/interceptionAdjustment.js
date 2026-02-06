// ========================================
// INTERCEPTION ADJUSTMENT PASS
// ========================================
// Applies interception-based score adjustments after initial scoring
// - Penalizes attacks by defensive interceptors (attacking exhausts, losing interception ability)
// - Adjusts ship attack scores based on interception risk
// - Bonuses for removing enemy interceptors (drone attacks AND card plays)
//
// Note: Intercepting does NOT exhaust drones - they can intercept multiple times.
// However, ATTACKING still exhausts drones, which means they can no longer intercept.
// This pass evaluates the opportunity cost of using a drone for offense vs defense.

import { INTERCEPTION, PENALTIES, DEFENSE_URGENCY, THRESHOLD_BONUS } from '../aiConstants.js';
import { analyzeInterceptionInLane, calculateThreatsKeptInCheck } from '../scoring/interceptionAnalysis.js';
import { calculateWinRaceAdjustments, getWinRaceDescription } from '../helpers/hullIntegrityHelpers.js';

/**
 * Calculate the best single unblocked ship attack value in a lane.
 * Returns the highest score among blocked slow attackers (max, not sum).
 *
 * @param {string} laneId - Lane to check
 * @param {Object} analysis - Interception analysis for this lane
 * @param {Array} possibleActions - All scored actions
 * @returns {number} - Best single unblocked attack value (0 if none)
 */
const calculateBestUnblockedValue = (laneId, analysis, possibleActions) => {
  let bestValue = 0;

  possibleActions.forEach(a => {
    if (
      a.type === 'attack' &&
      a.targetType === 'section' &&
      a.attacker.lane === laneId &&
      analysis.aiSlowAttackers.includes(a.attacker.id)
    ) {
      const value = Math.max(0, a.score - PENALTIES.INTERCEPTION_RISK);
      if (value > bestValue) {
        bestValue = value;
      }
    }
  });

  return bestValue;
};

/**
 * Check if a given amount of damage would kill the target drone.
 * Handles damage type mechanics: PIERCING bypasses shields, ION can never kill,
 * KINETIC is blocked by shields, SHIELD_BREAKER removes shields at 2:1.
 *
 * @param {number} damage - The damage amount
 * @param {Object} target - The target drone
 * @param {boolean} isPiercing - Whether the damage bypasses shields
 * @param {string} [damageType] - Damage type: NORMAL|PIERCING|SHIELD_BREAKER|ION|KINETIC
 * @returns {boolean} - True if the damage would destroy the target
 */
const isLethal = (damage, target, isPiercing = false, damageType) => {
  const targetHull = target.hull || 0;
  const targetShields = isPiercing ? 0 : (target.currentShields || 0);

  switch (damageType) {
    case 'ION':
      return false;
    case 'KINETIC':
      return targetShields === 0 && damage >= targetHull;
    case 'SHIELD_BREAKER': {
      const effectiveShieldDmg = Math.min(damage * 2, targetShields);
      const dmgUsedOnShields = Math.ceil(effectiveShieldDmg / 2);
      const remainingDmg = damage - dmgUsedOnShields;
      return remainingDmg >= targetHull;
    }
    default:
      return damage >= targetHull + targetShields;
  }
};

/**
 * Apply interception adjustment pass to scored actions
 * Two-pass approach:
 * Pass 1: Defensive interceptor penalties + ship attack adjustments (INTERCEPTION_RISK, UNCHECKED_THREAT)
 * Pass 2: Interceptor removal bonuses for drone attacks AND card plays
 *
 * Pass 1 must finalize ship attack scores before Pass 2 references them.
 *
 * @param {Array} possibleActions - Array of scored actions
 * @param {Object} context - Evaluation context
 * @returns {Array} - Modified possibleActions with interception adjustments
 */
export const applyInterceptionAdjustments = (possibleActions, context) => {
  const { player1, player2, gameDataService, getLaneOfDrone, opponentPlacedSections } = context;

  // Step 1: Analyze interception dynamics for all lanes
  const lanes = ['lane1', 'lane2', 'lane3'];
  const interceptionAnalysis = {};

  lanes.forEach(laneId => {
    interceptionAnalysis[laneId] = analyzeInterceptionInLane(laneId, player1, player2, gameDataService);
  });

  // === PASS 1: Defensive penalties + ship attack adjustments ===
  possibleActions.forEach(action => {
    if (action.type === 'attack') {
      const attackerLane = action.attacker.lane;
      const analysis = interceptionAnalysis[attackerLane];
      const attackerId = action.attacker.id;

      // === DEFENSIVE INTERCEPTOR PENALTY (CONTEXT-AWARE) ===
      if (analysis.aiDefensiveInterceptors.includes(attackerId)) {
        const threatsData = calculateThreatsKeptInCheck(
          action.attacker,
          attackerLane,
          player1,
          player2,
          gameDataService,
          opponentPlacedSections
        );

        if (threatsData.threatsKeptInCheck.length > 0) {
          const {
            totalImpact,
            totalThreatDamage,
            wouldCauseStateTransition,
            currentSectionStatus,
            defenseUrgency,
            damageStateDescription
          } = threatsData;

          // Build threat list for logging
          const threatNames = threatsData.threatsKeptInCheck
            .map(t => `${t.name} (${t.shipThreatDamage} ship dmg)`)
            .join(', ');

          action.logic.push(
            `🔍 Threats in check: ${threatsData.threatsKeptInCheck.length} [${threatNames}]`
          );
          action.logic.push(
            `📊 AI Damage State: ${damageStateDescription} (urgency: ${defenseUrgency}x)`
          );

          // PERCENTAGE-BASED DEFENSE PENALTY
          // Defense urgency scales with how close AI is to losing (60% damage = loss)
          const basePenalty = totalThreatDamage * DEFENSE_URGENCY.BASE_DAMAGE_PENALTY;
          let defensivePenalty = basePenalty * defenseUrgency;

          // Small bonus reduction if no state transition would occur
          if (!wouldCauseStateTransition && currentSectionStatus !== 'critical') {
            // Reduce penalty by 30% if damage wouldn't cross a threshold
            defensivePenalty *= 0.7;
            action.logic.push(`⚔️ No threshold cross: Section stays ${currentSectionStatus}`);
          } else if (wouldCauseStateTransition) {
            // Small extra penalty for crossing thresholds (stat penalties)
            const thresholdPenalty = currentSectionStatus === 'healthy'
              ? THRESHOLD_BONUS.CROSS_TO_DAMAGED
              : THRESHOLD_BONUS.CROSS_TO_CRITICAL;
            defensivePenalty -= thresholdPenalty; // Make more negative
            action.logic.push(`⚠️ Would cross threshold: ${currentSectionStatus}→worse`);
          }

          if (defensivePenalty !== 0) {
            action.score += defensivePenalty;
            action.logic.push(
              `Defense Penalty: ${defensivePenalty.toFixed(0)} (${totalThreatDamage} dmg × ${defenseUrgency}x urgency)`
            );
          }
        }
      }

      // === SHIP ATTACK SPECIFIC ADJUSTMENTS ===
      if (action.targetType === 'section') {
        if (analysis.aiSlowAttackers.includes(attackerId)) {
          // This attacker can be intercepted - risky ship attack
          action.score += PENALTIES.INTERCEPTION_RISK;
          action.logic.push(`⚠️ Interception Risk: ${PENALTIES.INTERCEPTION_RISK}`);
        }

        if (analysis.aiUncheckedThreats.includes(attackerId)) {
          // This attacker is too fast to intercept - unchecked threat bonus
          action.score += INTERCEPTION.UNCHECKED_THREAT_BONUS;
          action.logic.push(`✅ Unchecked Threat: +${INTERCEPTION.UNCHECKED_THREAT_BONUS}`);
        }
      }
    }
  });

  // === PASS 2: Interceptor removal bonuses (drone attacks + card plays) ===
  possibleActions.forEach(action => {
    // --- Drone attacks targeting enemy interceptors ---
    if (action.type === 'attack' && action.targetType === 'drone') {
      const attackerLane = action.attacker.lane;
      const analysis = interceptionAnalysis[attackerLane];
      const targetId = action.target.id;

      if (analysis.enemyInterceptors.includes(targetId)) {
        const effectiveStats = gameDataService.getEffectiveStats(action.attacker, attackerLane);
        const isPiercing = action.attacker.damageType === 'PIERCING';

        if (isLethal(effectiveStats.attack, action.target, isPiercing, action.attacker.damageType)) {
          const bestUnblockedValue = calculateBestUnblockedValue(attackerLane, analysis, possibleActions);

          if (bestUnblockedValue > 0) {
            action.score += bestUnblockedValue;
            action.logic.push(`Interceptor Removal: +${bestUnblockedValue.toFixed(0)}`);
          }
        }
      }
    }

    // --- Card plays targeting enemy interceptors ---
    if (action.type === 'play_card' && action.target && action.target.owner === 'player1') {
      const card = action.card;
      const target = action.target;
      const effectType = card.effect?.type;
      const scope = card.effect?.scope;

      // Only apply to SINGLE-target DESTROY or single-target DAMAGE cards
      // Skip FILTERED/LANE/OVERFLOW/SPLASH - already handled by calculateTargetValue
      if (effectType === 'DESTROY' && scope === 'SINGLE') {
        const laneId = getLaneOfDrone(target.id, player1);
        if (laneId) {
          const analysis = interceptionAnalysis[laneId];
          if (analysis.enemyInterceptors.includes(target.id)) {
            const bestUnblockedValue = calculateBestUnblockedValue(laneId, analysis, possibleActions);

            if (bestUnblockedValue > 0) {
              const cardBonus = Math.round(bestUnblockedValue * INTERCEPTION.INTERCEPTOR_REMOVAL_CARD_PREMIUM);
              action.score += cardBonus;
              action.logic.push(`Interceptor Removal (Destroy): +${cardBonus}`);
            }
          }
        }
      } else if (effectType === 'DAMAGE' && (!scope || scope === 'SINGLE')) {
        const laneId = getLaneOfDrone(target.id, player1);
        if (laneId) {
          const analysis = interceptionAnalysis[laneId];
          if (analysis.enemyInterceptors.includes(target.id) && isLethal(card.effect.value || 0, target, card.effect.damageType === 'PIERCING', card.effect.damageType)) {
            const bestUnblockedValue = calculateBestUnblockedValue(laneId, analysis, possibleActions);

            if (bestUnblockedValue > 0) {
              const cardBonus = Math.round(bestUnblockedValue * INTERCEPTION.INTERCEPTOR_REMOVAL_CARD_PREMIUM);
              action.score += cardBonus;
              action.logic.push(`Interceptor Removal (Lethal Damage): +${cardBonus}`);
            }
          }
        }
      }
    }
  });

  return possibleActions;
};
