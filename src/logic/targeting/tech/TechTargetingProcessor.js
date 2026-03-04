// ========================================
// TECH TARGETING PROCESSOR
// ========================================
// Handles TECH targeting type for cards that target tech slots
// (e.g., System Purge). No Jammer redirect — Jammer only affects
// DRONE targeting, so TECH targeting bypasses it automatically.

import BaseTargetingProcessor from '../BaseTargetingProcessor.js';

/**
 * TechTargetingProcessor - Handles tech slot targeting
 *
 * Targeting Type: TECH
 * Iterates techSlots for each player matching affinity (ENEMY/FRIENDLY/ANY).
 * Returns tech entries with { ...tech, lane, owner } — same shape as drone targets.
 *
 * @extends BaseTargetingProcessor
 */
class TechTargetingProcessor extends BaseTargetingProcessor {
  /**
   * Process TECH targeting
   *
   * @param {Object} context - Targeting context
   * @param {string} context.actingPlayerId - Player performing targeting
   * @param {Object} context.player1 - Player 1 state
   * @param {Object} context.player2 - Player 2 state
   * @param {Object} context.definition - Card/ability definition
   * @param {Object} context.definition.targeting - Targeting configuration
   * @param {string} context.definition.targeting.affinity - FRIENDLY/ENEMY/ANY
   * @param {string} context.definition.targeting.location - ANY_LANE/SAME_LANE
   * @returns {Array} Array of valid tech targets
   */
  process(context) {
    this.logProcessStart(context);

    const { actingPlayerId, source, definition } = context;
    const { affinity, location } = definition.targeting;
    const targets = [];

    // Determine source lane for SAME_LANE filtering (ability-based targeting)
    let sourceLane = null;
    if (location === 'SAME_LANE' && source) {
      const actingPlayerState = this.getActingPlayerState(context);
      const laneEntries = Object.entries(actingPlayerState.dronesOnBoard || {});
      for (const [lane, drones] of laneEntries) {
        if (drones.some(d => d.id === source.id)) {
          sourceLane = lane;
          break;
        }
      }
    }

    const actingPlayerState = this.getActingPlayerState(context);
    const opponentPlayerState = this.getOpponentPlayerState(context);
    const opponentId = this.getOpponentPlayerId(actingPlayerId);

    if (affinity === 'FRIENDLY' || affinity === 'ANY') {
      this.collectTechTargets(actingPlayerState, actingPlayerId, location, sourceLane, targets);
    }

    if (affinity === 'ENEMY' || affinity === 'ANY') {
      this.collectTechTargets(opponentPlayerState, opponentId, location, sourceLane, targets);
    }

    this.logProcessComplete(context, targets);
    return targets;
  }

  /**
   * Collect all tech from a player's techSlots
   *
   * @param {Object} playerState - Player state
   * @param {string} playerId - Owner of these tech
   * @param {Array} targets - Array to add valid targets to
   */
  collectTechTargets(playerState, playerId, location, sourceLane, targets) {
    if (!playerState.techSlots) return;

    Object.entries(playerState.techSlots).forEach(([lane, techs]) => {
      if (location === 'SAME_LANE' && lane !== sourceLane) return;
      if (location === 'OTHER_LANES' && lane === sourceLane) return;

      techs.forEach(tech => {
        targets.push({ ...tech, lane, owner: playerId });
      });
    });
  }
}

export default TechTargetingProcessor;
