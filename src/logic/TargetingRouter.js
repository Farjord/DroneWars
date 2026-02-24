// ========================================
// TARGETING ROUTER
// ========================================
// Routes targeting requests to their corresponding processors
// Part of Phase 2 modular refactoring (LANE, SHIP_SECTION, DRONE, etc.)

import LaneTargetingProcessor from './targeting/lane/LaneTargetingProcessor.js';
import ShipSectionTargetingProcessor from './targeting/ship/ShipSectionTargetingProcessor.js';
import DroneTargetingProcessor from './targeting/drone/DroneTargetingProcessor.js';
import DroneCardTargetingProcessor from './targeting/cards/DroneCardTargetingProcessor.js';
import AppliedUpgradeTargetingProcessor from './targeting/cards/AppliedUpgradeTargetingProcessor.js';
import AllMarkedProcessor from './targeting/drone/AllMarkedProcessor.js';
import CardInHandTargetingProcessor from './targeting/cards/CardInHandTargetingProcessor.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * TargetingRouter - Dispatches targeting requests to modular processors
 *
 * Phase 2 Implementation: All targeting types
 *  - LANE
 *  - SHIP_SECTION
 *  - DRONE
 *  - MULTI_DRONE (uses DroneTargetingProcessor)
 *  - DRONE_CARD
 *  - APPLIED_UPGRADE
 *  - ALL_MARKED
 *  - CARD_IN_HAND
 *
 * Usage:
 *   const router = new TargetingRouter();
 *   const targets = router.routeTargeting(context);
 */
class TargetingRouter {
  constructor() {
    // Phase 2: Initialize processors for all targeting types
    this.processors = {
      LANE: new LaneTargetingProcessor(),
      SHIP_SECTION: new ShipSectionTargetingProcessor(),
      DRONE: new DroneTargetingProcessor(),
      MULTI_DRONE: new DroneTargetingProcessor(), // Uses same processor as DRONE
      DRONE_CARD: new DroneCardTargetingProcessor(),
      APPLIED_UPGRADE: new AppliedUpgradeTargetingProcessor(),
      ALL_MARKED: new AllMarkedProcessor(),
      CARD_IN_HAND: new CardInHandTargetingProcessor()
    };
  }

  /**
   * Route a targeting request to its processor
   *
   * @param {Object} context - Targeting context
   * @param {string} context.actingPlayerId - Player performing the targeting
   * @param {Object} context.player1 - Player 1 state
   * @param {Object} context.player2 - Player 2 state
   * @param {Object} context.source - Source of targeting (for abilities)
   * @param {Object} context.definition - Card/ability definition with targeting property
   * @returns {Array} Array of valid targets
   * @throws {Error} If no processor exists for the targeting type
   */
  routeTargeting(context) {
    const targetingType = context.definition.targeting.type;
    const processor = this.processors[targetingType];

    if (!processor) {
      // No processor found - throw detailed error for debugging
      const errorMsg = `No targeting processor found for type: ${targetingType}`;
      debugLog('TARGETING_ROUTING', errorMsg, {
        targetingType,
        actingPlayer: context.actingPlayerId,
        sourceName: context.source?.name,
        definitionName: context.definition?.name,
        availableProcessors: Object.keys(this.processors)
      });
      throw new Error(errorMsg);
    }

    // Route to modular processor
    debugLog('TARGETING_ROUTING', `✅ Routing ${targetingType} to ${processor.constructor.name}`, {
      targetingType,
      processor: processor.constructor.name,
      actingPlayer: context.actingPlayerId,
      affinity: context.definition.targeting.affinity
    });
    return processor.process(context);
  }

  /**
   * Check if a targeting type is handled by a modular processor
   *
   * @param {string} targetingType - Targeting type to check
   * @returns {boolean} True if processor exists for this type
   */
  hasProcessor(targetingType) {
    return this.processors.hasOwnProperty(targetingType);
  }
}

export default TargetingRouter;
