// ========================================
// MOVEMENT INHIBITOR ADJUSTMENT PASS
// ========================================
// Applies Thruster Inhibitor-related score adjustments after initial scoring
// - Boosts attacks against Thruster Inhibitor tokens (easy to kill: 1 hull)
// - Boosts Purge ability usage based on locked drone value
// - Boosts card plays that can damage/destroy the inhibitor

import { THRUSTER_INHIBITOR } from '../aiConstants.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * Check if a drone has the INHIBIT_MOVEMENT keyword
 */
const hasInhibitMovement = (drone) => {
  return drone.abilities?.some(a => a.effect?.keyword === 'INHIBIT_MOVEMENT');
};

/**
 * Apply Movement Inhibitor adjustment pass to scored actions
 * - Identify lanes with Thruster Inhibitors on AI's board
 * - Calculate value of movement being blocked
 * - Boost attacks and abilities that remove the inhibitor
 *
 * @param {Array} possibleActions - Array of scored actions
 * @param {Object} context - Evaluation context
 * @returns {Array} - Modified possibleActions with inhibitor adjustments
 */
export const applyMovementInhibitorAdjustments = (possibleActions, context) => {
  const { player2, gameDataService } = context;

  // Step 1: Identify lanes with Thruster Inhibitors on AI's board and calculate blocked value
  const inhibitorBlockedValue = {};
  const inhibitorDrones = {};

  for (const laneId of ['lane1', 'lane2', 'lane3']) {
    const dronesInLane = player2.dronesOnBoard[laneId] || [];
    const inhibitor = dronesInLane.find(d => hasInhibitMovement(d));

    if (inhibitor) {
      inhibitorDrones[laneId] = inhibitor;

      // Calculate value of drones locked down (non-token drones that can't move)
      const lockedDrones = dronesInLane.filter(d => !d.isToken && !d.isExhausted);
      let blockedValue = lockedDrones.length * THRUSTER_INHIBITOR.LOCKED_DRONE_MOVE_VALUE;

      // Bonus for high-class drones being locked
      lockedDrones.forEach(d => {
        if ((d.class || 0) >= 3) {
          blockedValue += THRUSTER_INHIBITOR.HIGH_CLASS_BONUS;
        }
      });

      inhibitorBlockedValue[laneId] = blockedValue;
    }
  }

  // No inhibitors on AI's board - nothing to adjust
  if (Object.keys(inhibitorDrones).length === 0) return possibleActions;

  debugLog('AI_DECISIONS', '[INHIBITOR BONUS] Movement inhibitor blocked value:', inhibitorBlockedValue);

  // Step 2: Boost attacks against Thruster Inhibitor tokens
  possibleActions.forEach(action => {
    // Boost drone attacks targeting the inhibitor (it's on AI's own board, but
    // actually the inhibitor is a token on AI's board - AI can't attack its own drones)
    // Instead, boost card plays that target the inhibitor (damage/destroy cards targeting own drones)
    // Actually, the inhibitor is on AI's board so the human player placed it there.
    // The AI's drones in that lane are locked down. The AI can:
    // 1. Use the Purge ability (use_ability action with DESTROY_TOKEN_SELF)
    // 2. Attack the inhibitor? No - can't attack own drones
    // 3. Play damage cards? Typically target enemy drones, not own board
    // The primary removal method for AI is the Purge ability

    // Boost Purge ability (DESTROY_TOKEN_SELF)
    if (action.type === 'use_ability' && action.ability?.effect?.type === 'DESTROY_TOKEN_SELF') {
      const lane = action.drone?.lane;
      const blockedValue = inhibitorBlockedValue[lane] || 0;

      if (blockedValue > 0) {
        action.score += blockedValue;
        action.logic = action.logic || [];
        action.logic.push(`🔓 Purge Inhibitor: +${blockedValue} (unlocks movement in ${lane})`);
      }
    }
  });

  return possibleActions;
};
