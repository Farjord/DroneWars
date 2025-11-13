// ========================================
// ALL MARKED TARGETING PROCESSOR
// ========================================
// Handles ALL_MARKED targeting type - targeting all marked drones
// Used by cards that affect all marked targets simultaneously

import BaseTargetingProcessor from '../BaseTargetingProcessor.js';

/**
 * AllMarkedProcessor - Handles all marked drones targeting
 *
 * Targeting Type: ALL_MARKED
 * Dependencies: dronesOnBoard (isMarked property)
 * Risk Level: LOW
 *
 * Behavior:
 * - Returns all drones that have isMarked = true
 * - Respects affinity (FRIENDLY/ENEMY/ANY)
 * - Searches all lanes for marked drones
 */
class AllMarkedProcessor extends BaseTargetingProcessor {
  /**
   * Process ALL_MARKED targeting
   *
   * @param {Object} context - Targeting context
   * @param {string} context.actingPlayerId - Player performing targeting
   * @param {Object} context.player1 - Player 1 state
   * @param {Object} context.player2 - Player 2 state
   * @param {Object} context.definition - Card/ability definition
   * @param {Object} context.definition.targeting - Targeting configuration
   * @param {string} context.definition.targeting.affinity - FRIENDLY/ENEMY/ANY
   * @returns {Array} Array of all marked drones
   */
  process(context) {
    this.logProcessStart(context);

    const { actingPlayerId, definition } = context;
    const { affinity } = definition.targeting;
    const targets = [];

    // Determine target player based on affinity
    const targetPlayerState = affinity === 'ENEMY'
      ? this.getOpponentPlayerState(context)
      : this.getActingPlayerState(context);

    const targetPlayerId = affinity === 'ENEMY'
      ? this.getOpponentPlayerId(actingPlayerId)
      : actingPlayerId;

    // Search all lanes for marked drones
    Object.entries(targetPlayerState.dronesOnBoard).forEach(([lane, drones]) => {
      drones.forEach(drone => {
        if (drone.isMarked) {
          targets.push({
            ...drone,
            lane,
            owner: targetPlayerId
          });
        }
      });
    });

    this.logProcessComplete(context, targets);
    return targets;
  }
}

export default AllMarkedProcessor;
