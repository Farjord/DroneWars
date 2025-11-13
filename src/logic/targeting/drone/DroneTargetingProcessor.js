// ========================================
// DRONE TARGETING PROCESSOR
// ========================================
// Handles DRONE and MULTI_DRONE targeting types
// Includes complex Jammer keyword protection logic and custom criteria filtering

import BaseTargetingProcessor from '../BaseTargetingProcessor.js';
import { getLaneOfDrone, hasJammerInLane, getJammerDronesInLane } from '../../utils/gameEngineUtils.js';

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
 * - Location filtering: ANY_LANE vs SAME_LANE (for abilities)
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

    const { actingPlayerId, source, definition } = context;
    const { affinity, location, custom } = definition.targeting;
    const targets = [];

    const isCard = this.isCard(definition);
    const isAbility = this.isAbility(definition);

    // For SAME_LANE abilities, determine source drone's lane
    let userLane = null;
    if (isAbility && location === 'SAME_LANE') {
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
        targets
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
        targets
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
   */
  processPlayerDrones(playerState, playerId, actingPlayerId, userLane, location, custom, isCard, targets) {
    // Check if this is an opponent's card effect targeting
    const isOpponentTargeting = (actingPlayerId !== playerId) && isCard;

    Object.entries(playerState.dronesOnBoard).forEach(([lane, drones]) => {
      // Check location criteria
      const isValidLocation = this.checkLocationCriteria(location, lane, userLane);
      if (!isValidLocation) return;

      // CRITICAL: Jammer protection logic
      // If opponent is targeting with a card effect and lane has ready Jammers,
      // ONLY those Jammers can be targeted (forced targeting)
      if (isOpponentTargeting && hasJammerInLane(playerState, lane)) {
        // Opponent card effects are forced to target only Jammers in this lane
        const jammers = getJammerDronesInLane(playerState, lane);
        jammers.forEach(drone => {
          if (this.applyCustomCriteria(drone, custom)) {
            targets.push({ ...drone, lane, owner: playerId });
          }
        });
      } else {
        // Normal targeting (no Jammer interference or not an opponent card effect)
        drones.forEach(drone => {
          if (this.applyCustomCriteria(drone, custom)) {
            targets.push({ ...drone, lane, owner: playerId });
          }
        });
      }
    });
  }

  /**
   * Check if a lane matches location criteria
   *
   * @param {string} location - ANY_LANE or SAME_LANE
   * @param {string} lane - Lane to check
   * @param {string|null} userLane - Source lane (for SAME_LANE)
   * @returns {boolean} True if lane matches criteria
   */
  checkLocationCriteria(location, lane, userLane) {
    if (location === 'ANY_LANE') return true;
    if (location === 'SAME_LANE') return lane === userLane;
    return false;
  }
}

export default DroneTargetingProcessor;
