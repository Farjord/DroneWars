// ========================================
// LANE TARGETING PROCESSOR
// ========================================
// Handles LANE targeting type - targeting entire lanes
// Returns lane IDs with affinity-based filtering and capacity awareness

import BaseTargetingProcessor from '../BaseTargetingProcessor.js';
import { isLaneFull, isTechSlotAvailable } from '../../utils/gameEngineUtils.js';

// Effects that require a free drone slot in the target lane (capacity-filtered)
const DEPLOYMENT_EFFECT_TYPES = new Set(['CREATE_TOKENS']);

/**
 * LaneTargetingProcessor - Handles lane targeting
 * Behavior:
 * - Returns all three lanes ('lane1', 'lane2', 'lane3')
 * - Filters by affinity (FRIENDLY/ENEMY/ANY)
 * - For deployment-type effects (CREATE_TOKENS), excludes full lanes
 */
class LaneTargetingProcessor extends BaseTargetingProcessor {
  /**
   * Process LANE targeting
   *
   * @param {Object} context - Targeting context
   * @param {string} context.actingPlayerId - Player performing targeting
   * @param {Object} context.definition - Card/ability definition with targeting configuration
   * @param {string} context.definition.targeting.affinity - FRIENDLY/ENEMY/ANY
   * @param {Object} [context.player1] - Player 1 state (for capacity checks)
   * @param {Object} [context.player2] - Player 2 state (for capacity checks)
   * @returns {Array} Array of lane targets with id and owner properties
   */
  process(context) {
    this.logProcessStart(context);

    const { actingPlayerId, definition, player1, player2 } = context;
    const { affinity } = definition.targeting;

    const effectType = definition.effects?.[0]?.type ?? definition.effect?.type;
    const requiresOpenDroneSlot = DEPLOYMENT_EFFECT_TYPES.has(effectType);
    const isCreateTech = effectType === 'CREATE_TECH';
    const tokenName = definition.effects?.[0]?.tokenName;

    const opponentId = this.getOpponentPlayerId(actingPlayerId);
    const actingPlayerState = actingPlayerId === 'player1' ? player1 : player2;
    const opponentPlayerState = actingPlayerId === 'player1' ? player2 : player1;

    const targets = [];
    const laneIds = ['lane1', 'lane2', 'lane3'];

    laneIds.forEach(laneId => {
      // FRIENDLY or ANY — lanes owned by acting player
      if (affinity === 'FRIENDLY' || affinity === 'ANY') {
        const laneOk = isCreateTech
          ? !actingPlayerState || isTechSlotAvailable(actingPlayerState, laneId, tokenName)
          : !requiresOpenDroneSlot || !actingPlayerState || !isLaneFull(actingPlayerState, laneId);
        if (laneOk) targets.push({ id: laneId, owner: actingPlayerId, type: 'lane' });
      }

      // ENEMY or ANY — lanes owned by opponent
      if (affinity === 'ENEMY' || affinity === 'ANY') {
        const laneOk = isCreateTech
          ? !opponentPlayerState || isTechSlotAvailable(opponentPlayerState, laneId, tokenName)
          : !requiresOpenDroneSlot || !opponentPlayerState || !isLaneFull(opponentPlayerState, laneId);
        if (laneOk) targets.push({ id: laneId, owner: opponentId, type: 'lane' });
      }
    });

    this.logProcessComplete(context, targets);
    return targets;
  }
}

export default LaneTargetingProcessor;
