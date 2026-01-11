// ========================================
// INTERCEPTION ADJUSTMENT PASS
// ========================================
// Applies interception-based score adjustments after initial scoring
// - Penalizes attacks by defensive interceptors (attacking exhausts, losing interception ability)
// - Adjusts ship attack scores based on interception risk
// - Bonuses for removing enemy interceptors
//
// Note: Intercepting does NOT exhaust drones - they can intercept multiple times.
// However, ATTACKING still exhausts drones, which means they can no longer intercept.
// This pass evaluates the opportunity cost of using a drone for offense vs defense.

import { INTERCEPTION, PENALTIES, DEFENSE_URGENCY, THRESHOLD_BONUS } from '../aiConstants.js';
import { analyzeInterceptionInLane, calculateThreatsKeptInCheck } from '../scoring/interceptionAnalysis.js';
import { calculateWinRaceAdjustments, getWinRaceDescription } from '../helpers/hullIntegrityHelpers.js';

/**
 * Apply interception adjustment pass to scored actions
 * Two-pass approach:
 * 1. Analyze interception dynamics for all lanes
 * 2. Apply interception-based score adjustments (context-aware based on section damage)
 *
 * @param {Array} possibleActions - Array of scored actions
 * @param {Object} context - Evaluation context
 * @returns {Array} - Modified possibleActions with interception adjustments
 */
export const applyInterceptionAdjustments = (possibleActions, context) => {
  const { player1, player2, gameDataService, opponentPlacedSections } = context;

  // Step 1: Analyze interception dynamics for all lanes
  const lanes = ['lane1', 'lane2', 'lane3'];
  const interceptionAnalysis = {};

  lanes.forEach(laneId => {
    interceptionAnalysis[laneId] = analyzeInterceptionInLane(laneId, player1, player2, gameDataService);
  });

  // Step 2: Apply interception-based score adjustments
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

      // === DRONE ATTACK SPECIFIC ADJUSTMENTS ===
      if (action.targetType === 'drone') {
        const targetId = action.target.id;

        // Bonus for removing enemy interceptors (frees up our attacks)
        if (analysis.enemyInterceptors.includes(targetId)) {
          // Calculate value of attacks that would be unblocked by removing this interceptor
          const unblockedValue = possibleActions
            .filter(a =>
              a.type === 'attack' &&
              a.targetType === 'section' &&
              a.attacker.lane === attackerLane &&
              analysis.aiSlowAttackers.includes(a.attacker.id)
            )
            .reduce((sum, a) => sum + Math.max(0, a.score - PENALTIES.INTERCEPTION_RISK), 0);

          if (unblockedValue > 0) {
            action.score += unblockedValue;
            action.logic.push(`🎯 Interceptor Removal: +${unblockedValue.toFixed(0)}`);
          }
        }
      }
    }
  });

  return possibleActions;
};
