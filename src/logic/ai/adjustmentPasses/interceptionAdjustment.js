// ========================================
// INTERCEPTION ADJUSTMENT PASS
// ========================================
// Applies interception-based score adjustments after initial scoring
// - Penalizes attacks by defensive interceptors
// - Adjusts ship attack scores based on interception risk
// - Bonuses for removing enemy interceptors

import { INTERCEPTION, PENALTIES } from '../aiConstants.js';
import { analyzeInterceptionInLane, calculateThreatsKeptInCheck } from '../scoring/interceptionAnalysis.js';

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
          const { damagedSectionCount, currentSectionStatus, wouldCauseStateTransition, totalImpact, totalThreatDamage } = threatsData;

          // Build threat list for logging
          const threatNames = threatsData.threatsKeptInCheck
            .map(t => `${t.name} (${t.shipThreatDamage} ship dmg)`)
            .join(', ');

          action.logic.push(
            `🔍 Threats in check: ${threatsData.threatsKeptInCheck.length} [${threatNames}]`
          );

          // Context-aware penalty calculation
          let defensivePenalty = 0;

          if (currentSectionStatus === 'critical') {
            // NO penalty - section already critical, nothing to protect
            defensivePenalty = 0;
            action.logic.push(`⚔️ Full Aggro: Section already critical`);
          } else if (!wouldCauseStateTransition) {
            // REDUCED penalty - section stays in same state
            defensivePenalty = totalImpact * INTERCEPTION.REDUCED_DEFENSIVE_PENALTY_MULTIPLIER;
            action.logic.push(`⚔️ Offensive Priority: Section stays ${currentSectionStatus}`);
          } else if (damagedSectionCount === 0) {
            // Would be FIRST section damaged - acceptable, no penalty
            defensivePenalty = 0;
            action.logic.push(`⚔️ Acceptable Risk: Would be 1st section damaged`);
          } else if (damagedSectionCount === 1) {
            // Would be SECOND section damaged - moderate penalty
            defensivePenalty = totalImpact * INTERCEPTION.MODERATE_DEFENSIVE_PENALTY_MULTIPLIER;
            action.logic.push(`⚠️ Moderate Defense: Would be 2nd section damaged`);
          } else {
            // Would be THIRD section damaged - GAME LOSS! Maximum penalty
            defensivePenalty = totalImpact * INTERCEPTION.DEFENSIVE_PENALTY_MULTIPLIER;
            action.logic.push(`🛡️ CRITICAL Defense: Would lose game (3rd section)!`);
          }

          if (defensivePenalty !== 0) {
            action.score += defensivePenalty;
            action.logic.push(
              `Defensive Penalty: ${defensivePenalty.toFixed(0)} (${totalThreatDamage} ship dmg, ${totalImpact.toFixed(0)} impact)`
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
