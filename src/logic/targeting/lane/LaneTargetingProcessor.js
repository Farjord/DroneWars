// ========================================
// LANE TARGETING PROCESSOR
// ========================================
// Handles LANE targeting type - targeting entire lanes
// Returns lane IDs with affinity-based filtering

import BaseTargetingProcessor from '../BaseTargetingProcessor.js';

/**
 * LaneTargetingProcessor - Handles lane targeting
 * Behavior:
 * - Returns all three lanes ('lane1', 'lane2', 'lane3')
 * - Filters by affinity (FRIENDLY/ENEMY/ANY)
 * - Each lane includes owner property for targeting
 */
class LaneTargetingProcessor extends BaseTargetingProcessor {
  /**
   * Process LANE targeting
   *
   * @param {Object} context - Targeting context
   * @param {string} context.actingPlayerId - Player performing targeting
   * @param {Object} context.definition - Card/ability definition
   * @param {Object} context.definition.targeting - Targeting configuration
   * @param {string} context.definition.targeting.affinity - FRIENDLY/ENEMY/ANY
   * @returns {Array} Array of lane targets with id and owner properties
   */
  process(context) {
    this.logProcessStart(context);

    const { actingPlayerId, definition } = context;
    const { affinity } = definition.targeting;
    const targets = [];

    const laneIds = ['lane1', 'lane2', 'lane3'];

    // Process each lane
    laneIds.forEach(laneId => {
      // FRIENDLY or ANY - add lanes owned by acting player
      if (affinity === 'FRIENDLY' || affinity === 'ANY') {
        targets.push({ id: laneId, owner: actingPlayerId });
      }

      // ENEMY or ANY - add lanes owned by opponent
      if (affinity === 'ENEMY' || affinity === 'ANY') {
        const opponentId = this.getOpponentPlayerId(actingPlayerId);
        targets.push({ id: laneId, owner: opponentId });
      }
    });

    this.logProcessComplete(context, targets);
    return targets;
  }
}

export default LaneTargetingProcessor;
