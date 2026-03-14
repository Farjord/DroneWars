// ========================================
// MARKING EFFECT PROCESSOR
// ========================================
// Handles MARK_DRONE effects — marks a pre-resolved target drone.
// Target resolution (random selection, lane filtering) is handled upstream
// by TriggerProcessor._buildTarget via targetSelection.

import BaseEffectProcessor from './BaseEffectProcessor.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * MarkingEffectProcessor
 * Processes MARK_DRONE effects for the marking system.
 *
 * Marks a specific drone identified by context.target.id.
 * Random target selection for Scanner's ON_DEPLOY is handled by
 * TriggerProcessor._buildTarget → _resolveDronePool → selectTargets.
 *
 * Key features:
 * - Updates drone isMarked property
 * - Silently fails if target not found
 * - No animations (state-only effect)
 */
class MarkingEffectProcessor extends BaseEffectProcessor {
  /**
   * Process marking effect
   *
   * @param {Object} effect - Effect configuration (type: 'MARK_DRONE')
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with newPlayerStates
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    if (effect.type === 'MARK_DRONE') {
      return this.processMarkDrone(effect, context);
    }

    debugLog('MARKING', `⚠️ Unknown marking effect type: ${effect.type}`);
    return this.createResult(context.playerStates);
  }

  /**
   * Mark a specific targeted drone
   * Used by ship abilities that target specific enemy drones
   *
   * @param {Object} effect - Effect configuration
   * @param {Object} context - Effect execution context
   * @param {Object} context.target - Target drone with id property
   * @returns {Object} Result with updated states
   */
  processMarkDrone(effect, context) {
    const { actingPlayerId, playerStates, target } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);

    // Determine opponent (target will be an enemy drone)
    const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    // Find the drone in opponent's lanes
    let droneFound = false;
    for (const lane in newPlayerStates[opponentId].dronesOnBoard) {
      const droneIndex = newPlayerStates[opponentId].dronesOnBoard[lane].findIndex(
        d => d.id === target.id
      );
      if (droneIndex !== -1) {
        // Mark the drone
        newPlayerStates[opponentId].dronesOnBoard[lane][droneIndex].isMarked = true;
        droneFound = true;

        debugLog('MARKING', `✅ Marked drone ${target.id} in ${lane}`, {
          droneId: target.id,
          lane,
          opponentId
        });
        break;
      }
    }

    if (!droneFound) {
      debugLog('MARKING', `⚠️ Target drone not found: ${target.id}`, {
        targetId: target.id,
        opponentId
      });
    }

    return this.createResult(newPlayerStates);
  }
}

export default MarkingEffectProcessor;
