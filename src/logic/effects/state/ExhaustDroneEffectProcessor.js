// ========================================
// EXHAUST DRONE EFFECT PROCESSOR
// ========================================
// Handles EXHAUST_DRONE effect type - exhausting ready drones
// Prevents drones from attacking/activating until they are readied

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * ExhaustDroneEffectProcessor - Handles exhausting drones
 *
 * Effect Type: EXHAUST_DRONE
 *
 * Behavior:
 * - Sets target drone's isExhausted flag to true
 * - Prevents drone from attacking or using abilities
 * - Searches all lanes to find the target drone
 * - Inverse operation of READY_DRONE effect
 */
class ExhaustDroneEffectProcessor extends BaseEffectProcessor {
  /**
   * Process EXHAUST_DRONE effect
   *
   * @param {Object} effect - Effect configuration
   * @param {Object} context - Effect execution context
   * @param {string} context.actingPlayerId - Player executing the effect
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.target - Target drone to exhaust
   * @param {string} context.target.id - Unique ID of target drone
   * @param {string} [context.target.owner] - Owner of target drone (defaults to opponent)
   * @returns {Object} Result with updated player states
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, target } = context;

    // Handle missing target gracefully
    if (!target || !target.id) {
      debugLog('EFFECT_PROCESSING', '[EXHAUST_DRONE] ⚠️ No valid target provided', {
        target
      });
      const result = this.createResult(this.clonePlayerStates(playerStates));
      this.logProcessComplete(effect, result, context);
      return result;
    }

    // Clone player states to prevent mutations
    const newPlayerStates = this.clonePlayerStates(playerStates);

    // Determine which player owns the target drone
    // If owner is specified, use it; otherwise default to opponent
    const targetPlayerId = target.owner || (actingPlayerId === 'player1' ? 'player2' : 'player1');
    const targetPlayerState = newPlayerStates[targetPlayerId];

    let droneFound = false;
    let foundInLane = null;

    // Find and exhaust the target drone across all lanes
    for (const lane in targetPlayerState.dronesOnBoard) {
      const droneIndex = targetPlayerState.dronesOnBoard[lane].findIndex(
        d => d.id === target.id
      );

      if (droneIndex !== -1) {
        // Found the drone - exhaust it
        targetPlayerState.dronesOnBoard[lane][droneIndex].isExhausted = true;
        droneFound = true;
        foundInLane = lane;

        debugLog('EFFECT_PROCESSING', `[EXHAUST_DRONE] ${target.id} exhausted in ${lane}`, {
          droneId: target.id,
          lane,
          targetPlayerId
        });
        break;
      }
    }

    if (!droneFound) {
      debugLog('EFFECT_PROCESSING', `[EXHAUST_DRONE] ⚠️ Target drone not found: ${target.id}`, {
        targetId: target.id,
        targetPlayerId
      });
    }

    const result = this.createResult(newPlayerStates);
    this.logProcessComplete(effect, result, context);

    return result;
  }
}

export default ExhaustDroneEffectProcessor;
