// ========================================
// SHIP SECTION TARGETING PROCESSOR
// ========================================
// Handles SHIP_SECTION targeting type - targeting ship sections
// Returns ship sections with affinity-based filtering

import BaseTargetingProcessor from '../BaseTargetingProcessor.js';

/**
 * ShipSectionTargetingProcessor - Handles ship section targeting
 *
 * Targeting Type: SHIP_SECTION
 * Dependencies: None
 * Risk Level: LOW
 *
 * Behavior:
 * - Returns all ship sections from targeted player(s)
 * - Filters by affinity (FRIENDLY/ENEMY/ANY)
 * - Each section includes owner property for targeting
 */
class ShipSectionTargetingProcessor extends BaseTargetingProcessor {
  /**
   * Process SHIP_SECTION targeting
   *
   * @param {Object} context - Targeting context
   * @param {string} context.actingPlayerId - Player performing targeting
   * @param {Object} context.player1 - Player 1 state
   * @param {Object} context.player2 - Player 2 state
   * @param {Object} context.definition - Card/ability definition
   * @param {Object} context.definition.targeting - Targeting configuration
   * @param {string} context.definition.targeting.affinity - FRIENDLY/ENEMY/ANY
   * @returns {Array} Array of ship section targets
   */
  process(context) {
    this.logProcessStart(context);

    const { actingPlayerId, definition } = context;
    const { affinity } = definition.targeting;
    const targets = [];

    const actingPlayerState = this.getActingPlayerState(context);
    const opponentPlayerState = this.getOpponentPlayerState(context);
    const opponentId = this.getOpponentPlayerId(actingPlayerId);

    // FRIENDLY or ANY - add acting player's ship sections
    if (affinity === 'FRIENDLY' || affinity === 'ANY') {
      this.processPlayerSections(actingPlayerState, actingPlayerId, targets);
    }

    // ENEMY or ANY - add opponent's ship sections
    if (affinity === 'ENEMY' || affinity === 'ANY') {
      this.processPlayerSections(opponentPlayerState, opponentId, targets);
    }

    this.logProcessComplete(context, targets);
    return targets;
  }

  /**
   * Add all ship sections from a player to the targets array
   *
   * @param {Object} playerState - Player state to process
   * @param {string} playerId - Owner player ID
   * @param {Array} targets - Array to add targets to
   */
  processPlayerSections(playerState, playerId, targets) {
    Object.keys(playerState.shipSections).forEach(sectionName => {
      targets.push({
        ...playerState.shipSections[sectionName],
        id: sectionName,
        name: sectionName,
        owner: playerId
      });
    });
  }
}

export default ShipSectionTargetingProcessor;
