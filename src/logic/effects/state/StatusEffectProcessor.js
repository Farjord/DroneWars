// ========================================
// STATUS EFFECT PROCESSOR
// ========================================
// Handles status effect types for drone restrictions
// APPLY_CANNOT_MOVE, APPLY_CANNOT_ATTACK, APPLY_CANNOT_INTERCEPT,
// APPLY_DOES_NOT_READY, APPLY_SNARED, APPLY_SUPPRESSED, CLEAR_ALL_STATUS

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * StatusEffectProcessor - Handles applying and clearing status effects on drones
 *
 * Effect Types:
 * - APPLY_CANNOT_MOVE: Prevents all movement (permanent)
 * - APPLY_CANNOT_ATTACK: Prevents attacking (permanent)
 * - APPLY_CANNOT_INTERCEPT: Prevents interception (permanent)
 * - APPLY_DOES_NOT_READY: Stays exhausted next ready phase (removed after attempt)
 * - CLEAR_ALL_STATUS: Clears all status flags including isMarked
 *
 * Behavior:
 * - Searches all lanes to find the target drone
 * - Sets or clears boolean status flags on the drone
 * - Status effects persist until cleared or explicitly removed
 */
class StatusEffectProcessor extends BaseEffectProcessor {
  /**
   * Process status effect
   *
   * @param {Object} effect - Effect configuration
   * @param {string} effect.type - Type of status effect to apply
   * @param {Object} context - Effect execution context
   * @param {string} context.actingPlayerId - Player executing the effect
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.target - Target drone for status effect
   * @param {string} context.target.id - Unique ID of target drone
   * @param {string} [context.target.owner] - Owner of target drone (defaults to opponent)
   * @returns {Object} Result with updated player states
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, target } = context;

    // Handle missing target gracefully
    if (!target || !target.id) {
      debugLog('EFFECT_PROCESSING', `[${effect.type}] ⚠️ No valid target provided`, {
        target
      });
      const result = this.createResult(this.clonePlayerStates(playerStates));
      this.logProcessComplete(effect, result, context);
      return result;
    }

    // Clone player states to prevent mutations
    const newPlayerStates = this.clonePlayerStates(playerStates);

    // Determine which player owns the target drone
    const targetPlayerId = target.owner || (actingPlayerId === 'player1' ? 'player2' : 'player1');
    const targetPlayerState = newPlayerStates[targetPlayerId];

    // Route to appropriate handler based on effect type
    let result;
    switch (effect.type) {
      case 'APPLY_CANNOT_MOVE':
        result = this.applyStatus(effect, newPlayerStates, targetPlayerState, target, 'cannotMove');
        break;
      case 'APPLY_CANNOT_ATTACK':
        result = this.applyStatus(effect, newPlayerStates, targetPlayerState, target, 'cannotAttack');
        break;
      case 'APPLY_CANNOT_INTERCEPT':
        result = this.applyStatus(effect, newPlayerStates, targetPlayerState, target, 'cannotIntercept');
        break;
      case 'APPLY_DOES_NOT_READY':
        result = this.applyStatus(effect, newPlayerStates, targetPlayerState, target, 'doesNotReady');
        break;
      case 'APPLY_SNARED':
        result = this.applyStatus(effect, newPlayerStates, targetPlayerState, target, 'isSnared');
        break;
      case 'APPLY_SUPPRESSED':
        result = this.applyStatus(effect, newPlayerStates, targetPlayerState, target, 'isSuppressed');
        break;
      case 'CLEAR_ALL_STATUS':
        result = this.clearAllStatus(effect, newPlayerStates, targetPlayerState, target, targetPlayerId);
        break;
      default:
        debugLog('EFFECT_PROCESSING', `[STATUS_EFFECT] ⚠️ Unknown effect type: ${effect.type}`);
        result = this.createResult(newPlayerStates);
    }

    this.logProcessComplete(effect, result, context);
    return result;
  }

  /**
   * Apply a status effect to target drone
   *
   * @param {Object} effect - Effect configuration
   * @param {Object} newPlayerStates - Cloned player states
   * @param {Object} targetPlayerState - Target player's state
   * @param {Object} target - Target drone
   * @param {string} statusProperty - Property name to set (e.g., 'cannotMove')
   * @returns {Object} Result with updated states
   */
  applyStatus(effect, newPlayerStates, targetPlayerState, target, statusProperty) {
    let droneFound = false;
    let foundInLane = null;

    // Find and apply status to the target drone across all lanes
    for (const lane in targetPlayerState.dronesOnBoard) {
      const droneIndex = targetPlayerState.dronesOnBoard[lane].findIndex(
        d => d.id === target.id
      );

      if (droneIndex !== -1) {
        // Found the drone - apply status
        targetPlayerState.dronesOnBoard[lane][droneIndex][statusProperty] = true;
        droneFound = true;
        foundInLane = lane;

        debugLog('EFFECT_PROCESSING', `[${effect.type}] ${target.id} status applied in ${lane}`, {
          droneId: target.id,
          lane,
          statusProperty,
          value: true
        });
        break;
      }
    }

    if (!droneFound) {
      debugLog('EFFECT_PROCESSING', `[${effect.type}] ⚠️ Target drone not found: ${target.id}`, {
        targetId: target.id
      });
    }

    return this.createResult(newPlayerStates);
  }

  /**
   * Clear all status effects from target drone
   *
   * @param {Object} effect - Effect configuration
   * @param {Object} newPlayerStates - Cloned player states
   * @param {Object} targetPlayerState - Target player's state
   * @param {Object} target - Target drone
   * @param {string} targetPlayerId - ID of target player
   * @returns {Object} Result with updated states
   */
  clearAllStatus(effect, newPlayerStates, targetPlayerState, target, targetPlayerId) {
    let droneFound = false;
    let foundInLane = null;

    // Find and clear all statuses from the target drone across all lanes
    for (const lane in targetPlayerState.dronesOnBoard) {
      const droneIndex = targetPlayerState.dronesOnBoard[lane].findIndex(
        d => d.id === target.id
      );

      if (droneIndex !== -1) {
        // Found the drone - clear all status flags
        const drone = targetPlayerState.dronesOnBoard[lane][droneIndex];
        drone.cannotMove = false;
        drone.cannotAttack = false;
        drone.cannotIntercept = false;
        drone.doesNotReady = false;
        drone.isMarked = false;
        drone.isSnared = false;
        drone.isSuppressed = false;

        droneFound = true;
        foundInLane = lane;

        debugLog('EFFECT_PROCESSING', `[CLEAR_ALL_STATUS] ${target.id} all statuses cleared in ${lane}`, {
          droneId: target.id,
          lane,
          targetPlayerId
        });
        break;
      }
    }

    if (!droneFound) {
      debugLog('EFFECT_PROCESSING', '[CLEAR_ALL_STATUS] ⚠️ Target drone not found: ${target.id}', {
        targetId: target.id
      });
    }

    return this.createResult(newPlayerStates);
  }
}

export default StatusEffectProcessor;
