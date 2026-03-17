// ========================================
// MOVEMENT INHIBITOR ADJUSTMENT PASS
// ========================================
// Applies Thruster Inhibitor-related score adjustments after initial scoring
// Identifies lanes where AI drones are locked down by a Thruster Inhibitor
// and adjusts move scoring context accordingly.
// Note: TI auto-destructs at round start — AI cannot manually remove it.

import { THRUSTER_INHIBITOR } from '../aiConstants.js';
import { hasMovementInhibitorInLane } from '../../../utils/gameUtils.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * Apply Movement Inhibitor adjustment pass to scored actions
 * - Identify lanes where AI drones are inhibited (opponent has inhibitor)
 * - Calculate value of movement being blocked (used for move deprioritization context)
 *
 * @param {Array} possibleActions - Array of scored actions
 * @param {Object} context - Evaluation context
 * @returns {Array} - Modified possibleActions with inhibitor adjustments
 */
export const applyMovementInhibitorAdjustments = (possibleActions, context) => {
  const { player1, player2 } = context;

  // Identify lanes where AI drones are inhibited (opponent has inhibitor)
  const inhibitedLanes = [];
  for (const laneId of ['lane1', 'lane2', 'lane3']) {
    if (hasMovementInhibitorInLane({player1, player2}, 'player2', laneId)) {
      inhibitedLanes.push(laneId);
    }
  }

  // No inhibitors affecting AI drones - nothing to adjust
  if (inhibitedLanes.length === 0) return possibleActions;

  debugLog('AI_DECISIONS', '[INHIBITOR] Movement inhibitor detected in lanes:', inhibitedLanes);

  // TI auto-destructs at round start — no manual removal actions to boost.
  // Move-blocking is already handled by the inline hasMovementInhibitorInLane checks
  // in moveEvaluator and actionDecision which return -Infinity / skip moves.

  return possibleActions;
};
