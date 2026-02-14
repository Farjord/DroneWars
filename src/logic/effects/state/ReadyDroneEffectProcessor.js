// ========================================
// READY DRONE EFFECT PROCESSOR
// ========================================
// Handles READY_DRONE effect type - readying exhausted drones
// Allows drones to attack/activate again in the same turn

import BaseEffectProcessor from '../BaseEffectProcessor.js';

/**
 * ReadyDroneEffectProcessor - Handles readying drones
 *
 * Effect Type: READY_DRONE
 *
 * Behavior:
 * - Sets target drone's isExhausted flag to false
 * - Allows drone to attack or use abilities again
 * - Searches all lanes to find the target drone
 */
class ReadyDroneEffectProcessor extends BaseEffectProcessor {
  /**
   * Process READY_DRONE effect
   *
   * @param {Object} effect - Effect configuration
   * @param {Object} context - Effect execution context
   * @param {string} context.actingPlayerId - Player executing the effect
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.target - Target drone to ready
   * @param {string} context.target.id - Unique ID of target drone
   * @returns {Object} Result with updated player states
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, target } = context;

    // Clone player states to prevent mutations
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const actingPlayerState = this.getActingPlayerState(newPlayerStates, actingPlayerId);

    let droneFound = false;
    let foundInLane = null;

    // Find and ready the target drone across all lanes
    for (const lane in actingPlayerState.dronesOnBoard) {
      const droneIndex = actingPlayerState.dronesOnBoard[lane].findIndex(
        d => d.id === target.id
      );

      if (droneIndex !== -1) {
        const drone = actingPlayerState.dronesOnBoard[lane][droneIndex];
        if (drone.doesNotReady) {
          // Consume the doesNotReady flag instead of readying
          drone.doesNotReady = false;
        } else {
          // Ready the drone normally
          drone.isExhausted = false;
        }
        droneFound = true;
        foundInLane = lane;
        break;
      }
    }

    const result = this.createResult(newPlayerStates);

    this.logProcessComplete(effect, result, context);

    return result;
  }
}

export default ReadyDroneEffectProcessor;
