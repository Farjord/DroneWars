// ========================================
// DRONE TARGETING PROCESSOR
// ========================================
// Handles DRONE and MULTI_DRONE targeting types
// Includes complex Jammer keyword protection logic and custom criteria filtering

import BaseTargetingProcessor from '../BaseTargetingProcessor.js';
import { getLaneOfDrone, hasJammerInLane, getJammerDronesInLane } from '../../utils/gameEngineUtils.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * DroneTargetingProcessor - Handles drone targeting
 *
 * Targeting Types: DRONE, MULTI_DRONE
 * Dependencies: dronesOnBoard, getLaneOfDrone, Jammer keyword logic
 * Risk Level: MODERATE (complex Jammer logic)
 *
 * Behavior:
 * - Returns drones matching affinity and location criteria
 * - Applies custom criteria (EXHAUSTED, MARKED, DAMAGED_HULL, NOT_MARKED)
 * - CRITICAL: Jammer protection - opponent card effects targeting a lane with ready Jammers
 *   can ONLY target those Jammers (not other drones in that lane)
 * - Location filtering: ANY_LANE vs SAME_LANE vs OTHER_LANES (for abilities)
 * - Ability source lane detection (drone abilities only)
 */
class DroneTargetingProcessor extends BaseTargetingProcessor {
  /**
   * Process DRONE or MULTI_DRONE targeting
   *
   * @param {Object} context - Targeting context
   * @param {string} context.actingPlayerId - Player performing targeting
   * @param {Object} context.player1 - Player 1 state
   * @param {Object} context.player2 - Player 2 state
   * @param {Object} context.source - Source of targeting (for abilities)
   * @param {Object} context.definition - Card/ability definition
   * @param {Object} context.definition.targeting - Targeting configuration
   * @param {string} context.definition.targeting.affinity - FRIENDLY/ENEMY/ANY
   * @param {string} context.definition.targeting.location - ANY_LANE/SAME_LANE
   * @param {Array} context.definition.targeting.custom - Custom criteria
   * @returns {Array} Array of valid drone targets
   */
  process(context) {
    this.logProcessStart(context);

    const { actingPlayerId, source, definition, costSelection } = context;
    const { affinity, location, custom } = definition.targeting;
    const targets = [];

    const isCard = this.isCard(definition);
    const isAbility = this.isAbility(definition);

    // Extract cost context for stat comparisons and location filtering
    const costContext = costSelection || null;

    // For SAME_LANE or OTHER_LANES abilities, determine source drone's lane
    let userLane = null;
    if (isAbility && (location === 'SAME_LANE' || location === 'OTHER_LANES')) {
      userLane = this.determineSourceLane(context, source);
      if (!userLane) {
        // Can't determine source lane, return empty targets
        this.logProcessComplete(context, targets);
        return targets;
      }
    }

    const actingPlayerState = this.getActingPlayerState(context);
    const opponentPlayerState = this.getOpponentPlayerState(context);
    const opponentId = this.getOpponentPlayerId(actingPlayerId);

    // FRIENDLY or ANY - process acting player's drones
    if (affinity === 'FRIENDLY' || affinity === 'ANY') {
      this.processPlayerDrones(
        actingPlayerState,
        actingPlayerId,
        actingPlayerId,
        userLane,
        location,
        custom,
        isCard,
        targets,
        costContext,
        context
      );
    }

    // ENEMY or ANY - process opponent's drones
    if (affinity === 'ENEMY' || affinity === 'ANY') {
      this.processPlayerDrones(
        opponentPlayerState,
        opponentId,
        actingPlayerId,
        userLane,
        location,
        custom,
        isCard,
        targets,
        costContext,
        context
      );
    }

    this.logProcessComplete(context, targets);
    return targets;
  }

  /**
   * Determine the lane of the source drone for SAME_LANE abilities
   *
   * @param {Object} context - Targeting context
   * @param {Object} source - Source object (drone or ship)
   * @returns {string|null} Lane ID or null if not applicable
   */
  determineSourceLane(context, source) {
    const actingPlayerState = this.getActingPlayerState(context);

    // Check if source is a drone on the board
    const isDroneSource = Object.values(actingPlayerState.dronesOnBoard)
      .flat()
      .some(d => d.id === source.id);

    if (isDroneSource) {
      return getLaneOfDrone(source.id, actingPlayerState);
    }

    // If it's not a drone source (e.g., a ship ability), userLane remains null
    // which is correct for ship abilities that can target ANY_LANE
    return null;
  }

  /**
   * Process all drones from a player's board
   *
   * @param {Object} playerState - Player state to process
   * @param {string} playerId - Owner of these drones
   * @param {string} actingPlayerId - Player performing the targeting
   * @param {string|null} userLane - Source lane for SAME_LANE abilities
   * @param {string} location - ANY_LANE or SAME_LANE
   * @param {Array} custom - Custom criteria
   * @param {boolean} isCard - Whether this is a card (vs ability)
   * @param {Array} targets - Array to add valid targets to
   * @param {Object} costContext - Optional cost selection context for stat comparisons
   * @param {Object} context - Targeting context with getEffectiveStats function
   */
  processPlayerDrones(playerState, playerId, actingPlayerId, userLane, location, custom, isCard, targets, costContext = null, context = null) {
    debugLog('ADDITIONAL_COST_TARGETING', '🔍 processPlayerDrones called', {
      playerId,
      actingPlayerId,
      location,
      hasCostContext: !!costContext,
      costContextLane: costContext?.lane,
      costContextTarget: costContext?.target?.id
    });

    // Check if this is an opponent's card effect targeting
    const isOpponentTargeting = (actingPlayerId !== playerId) && isCard;

    Object.entries(playerState.dronesOnBoard).forEach(([lane, drones]) => {
      debugLog('ADDITIONAL_COST_TARGETING', `🔍 Checking lane ${lane}`, {
        droneCount: drones.length,
        location,
        userLane,
        costContextLane: costContext?.lane
      });

      // Check location criteria
      const isValidLocation = this.checkLocationCriteria(location, lane, userLane, costContext);

      debugLog('ADDITIONAL_COST_TARGETING',
        isValidLocation ? `✅ Lane ${lane} passes location criteria` : `❌ Lane ${lane} fails location criteria`,
        {
          lane,
          location,
          userLane,
          costContextLane: costContext?.lane,
          isValidLocation
        }
      );

      if (!isValidLocation) return;

      // CRITICAL: Jammer protection logic
      // If opponent is targeting with a card effect and lane has ready Jammers,
      // ONLY those Jammers can be targeted (forced targeting)
      if (isOpponentTargeting && hasJammerInLane(playerState, lane)) {
        // Opponent card effects are forced to target only Jammers in this lane
        const jammers = getJammerDronesInLane(playerState, lane);
        jammers.forEach(drone => {
          // Check if this is a movement effect
          const effectType = context?.definition?.effect?.type;
          const isMovementEffect = effectType === 'SINGLE_MOVE' || effectType === 'MULTI_MOVE';

          // Check if EXHAUSTED is explicitly allowed as a custom criterion
          const allowsExhausted = custom && Array.isArray(custom) &&
            custom.some(c => c === 'EXHAUSTED' || (typeof c === 'object' && c.type === 'EXHAUSTED'));

          // For movement effects, skip exhausted drones unless explicitly allowed
          if (isMovementEffect && !allowsExhausted && drone.isExhausted) {
            return; // Skip this drone
          }

          // For movement effects, skip INERT drones
          if (isMovementEffect && context?.getEffectiveStats) {
            const stats = context.getEffectiveStats(drone, lane);
            if (stats.keywords.has('INERT')) return;
          }

          if (this.applyCustomCriteria(drone, custom, costContext, lane, context)) {
            targets.push({ ...drone, lane, owner: playerId });
          }
        });
      } else {
        // Normal targeting (no Jammer interference or not an opponent card effect)
        drones.forEach(drone => {
          // Check if this is a movement effect
          const effectType = context?.definition?.effect?.type;
          const isMovementEffect = effectType === 'SINGLE_MOVE' || effectType === 'MULTI_MOVE';

          // Check if EXHAUSTED is explicitly allowed as a custom criterion
          const allowsExhausted = custom && Array.isArray(custom) &&
            custom.some(c => c === 'EXHAUSTED' || (typeof c === 'object' && c.type === 'EXHAUSTED'));

          // For movement effects, skip exhausted drones unless explicitly allowed
          if (isMovementEffect && !allowsExhausted && drone.isExhausted) {
            return; // Skip this drone
          }

          // For movement effects, skip INERT drones
          if (isMovementEffect && context?.getEffectiveStats) {
            const stats = context.getEffectiveStats(drone, lane);
            if (stats.keywords.has('INERT')) return;
          }

          if (this.applyCustomCriteria(drone, custom, costContext, lane, context)) {
            targets.push({ ...drone, lane, owner: playerId });
          }
        });
      }
    });
  }

  /**
   * Check if a lane matches location criteria
   *
   * @param {string} location - ANY_LANE, SAME_LANE, SAME_LANE_AS_COST, or COST_SOURCE_LANE
   * @param {string} lane - Lane to check
   * @param {string|null} userLane - Source lane (for SAME_LANE)
   * @param {Object} costContext - Cost selection context (for cost-based location filtering)
   * @returns {boolean} True if lane matches criteria
   */
  checkLocationCriteria(location, lane, userLane, costContext = null) {
    debugLog('ADDITIONAL_COST_TARGETING', '📏 checkLocationCriteria called', {
      location,
      lane,
      userLane,
      hasCostContext: !!costContext,
      costContextLane: costContext?.lane,
      costContextSourceLane: costContext?.sourceLane
    });

    if (location === 'ANY_LANE') {
      debugLog('ADDITIONAL_COST_TARGETING', '✅ ANY_LANE - always passes', { lane });
      return true;
    }

    if (location === 'SAME_LANE') {
      const passes = lane === userLane;
      debugLog('ADDITIONAL_COST_TARGETING',
        passes ? '✅ SAME_LANE passes' : '❌ SAME_LANE fails',
        { lane, userLane, passes }
      );
      return passes;
    }

    if (location === 'OTHER_LANES') {
      const passes = lane !== userLane;
      debugLog('ADDITIONAL_COST_TARGETING',
        passes ? '✅ OTHER_LANES passes' : '❌ OTHER_LANES fails',
        { lane, userLane, passes }
      );
      return passes;
    }

    // NEW: Cost-based location filtering
    if (location === 'SAME_LANE_AS_COST') {
      if (!costContext || !costContext.lane) {
        debugLog('ADDITIONAL_COST_TARGETING', '❌ SAME_LANE_AS_COST fails - missing cost context', {
          hasCostContext: !!costContext,
          costContextLane: costContext?.lane
        });
        return false;
      }
      const passes = lane === costContext.lane;
      debugLog('ADDITIONAL_COST_TARGETING',
        passes ? '✅ SAME_LANE_AS_COST passes' : '❌ SAME_LANE_AS_COST fails',
        {
          lane,
          costLane: costContext.lane,
          passes
        }
      );
      return passes;
    }

    if (location === 'COST_SOURCE_LANE') {
      if (!costContext || !costContext.sourceLane) {
        debugLog('ADDITIONAL_COST_TARGETING', '❌ COST_SOURCE_LANE fails - missing cost source lane', {
          hasCostContext: !!costContext,
          costContextSourceLane: costContext?.sourceLane
        });
        return false;
      }
      const passes = lane === costContext.sourceLane;
      debugLog('ADDITIONAL_COST_TARGETING',
        passes ? '✅ COST_SOURCE_LANE passes' : '❌ COST_SOURCE_LANE fails',
        {
          lane,
          costSourceLane: costContext.sourceLane,
          passes
        }
      );
      return passes;
    }

    debugLog('ADDITIONAL_COST_TARGETING', '❌ Unknown location type', { location });
    return false;
  }
}

export default DroneTargetingProcessor;
