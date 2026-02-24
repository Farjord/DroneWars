// ========================================
// SHIP SECTION TARGETING PROCESSOR
// ========================================
// Handles SHIP_SECTION targeting type - targeting ship sections
// Returns ship sections with affinity-based filtering

import BaseTargetingProcessor from '../BaseTargetingProcessor.js';
import { LaneControlCalculator } from '../../combat/LaneControlCalculator.js';

const SECTION_TO_LANE = {
  'left': 'lane1',
  'middle': 'lane2',
  'right': 'lane3'
};

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
 * - Filters by lane control when custom includes 'REQUIRES_LANE_CONTROL'
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

    // Apply lane control filtering if required
    const filteredTargets = this.applyLaneControlFilter(targets, context);

    this.logProcessComplete(context, filteredTargets);
    return filteredTargets;
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

  /**
   * Apply lane control filtering for doctrine cards
   * Only filters when targeting.custom includes 'REQUIRES_LANE_CONTROL'
   *
   * @param {Array} targets - Unfiltered targets
   * @param {Object} context - Targeting context
   * @returns {Array} Filtered targets
   */
  applyLaneControlFilter(targets, context) {
    const { definition, actingPlayerId } = context;
    const targeting = definition.targeting;

    const restrictions = targeting.restrictions || targeting.custom;
    if (!restrictions?.includes('REQUIRES_LANE_CONTROL')) {
      return targets;
    }

    const player1State = context.player1;
    const player2State = context.player2;
    const laneControl = LaneControlCalculator.calculateLaneControl(player1State, player2State);

    // If card has validSections (predetermined targets like Crossfire, Breach, Encirclement)
    if (targeting.validSections) {
      return targets.filter(t => targeting.validSections.includes(t.id));
    }

    // If card has CONTROL_LANE_EMPTY condition (Overrun) - filter dynamically
    if (definition.effect?.condition?.type === 'CONTROL_LANE_EMPTY') {
      return targets.filter(t => {
        const lane = SECTION_TO_LANE[t.id];
        if (!lane) return false;
        return LaneControlCalculator.checkLaneControlEmpty(
          actingPlayerId, lane, player1State, player2State, laneControl
        );
      });
    }

    return targets;
  }
}

export default ShipSectionTargetingProcessor;
