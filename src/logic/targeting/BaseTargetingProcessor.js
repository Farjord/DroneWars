// ========================================
// BASE TARGETING PROCESSOR
// ========================================
// Abstract base class for all targeting processors
// Provides common utilities for affinity matching and custom criteria

import { debugLog } from '../../utils/debugLogger.js';
import fullDroneCollection from '../../data/droneData.js';

/**
 * BaseTargetingProcessor - Abstract base class for targeting processors
 *
 * All targeting processors must extend this class and implement the process() method.
 *
 * @abstract
 */
class BaseTargetingProcessor {
  /**
   * Process a targeting request and return valid targets
   *
   * @param {Object} context - Targeting context
   * @param {string} context.actingPlayerId - Player performing the targeting
   * @param {Object} context.player1 - Player 1 state
   * @param {Object} context.player2 - Player 2 state
   * @param {Object} context.source - Source of targeting (for abilities)
   * @param {Object} context.definition - Card/ability definition with targeting property
   * @param {Object} context.definition.targeting - Targeting configuration
   * @param {string} context.definition.targeting.type - Targeting type
   * @param {string} context.definition.targeting.affinity - FRIENDLY/ENEMY/ANY
   * @param {string} context.definition.targeting.location - ANY_LANE/SAME_LANE
   * @param {Array} context.definition.targeting.custom - Custom criteria (EXHAUSTED, MARKED, etc.)
   * @returns {Array} Array of valid targets with owner and lane properties
   * @throws {Error} If not implemented in subclass
   */
  process(context) {
    throw new Error(`process() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Check if a target matches the affinity requirement
   *
   * @param {string} affinity - FRIENDLY, ENEMY, or ANY
   * @param {string} targetPlayerId - Owner of the target
   * @param {string} actingPlayerId - Player performing the action
   * @returns {boolean} True if affinity matches
   */
  matchesAffinity(affinity, targetPlayerId, actingPlayerId) {
    if (affinity === 'ANY') return true;
    if (affinity === 'FRIENDLY') return targetPlayerId === actingPlayerId;
    if (affinity === 'ENEMY') return targetPlayerId !== actingPlayerId;
    return false;
  }

  /**
   * Apply custom criteria filtering to a drone
   *
   * @param {Object} drone - Drone to check
   * @param {Array} custom - Array of custom criteria strings
   * @returns {boolean} True if drone meets all custom criteria
   */
  applyCustomCriteria(drone, custom) {
    if (!custom || custom.length === 0) return true;

    // DAMAGED_HULL - Drone's hull must be less than max hull
    if (custom.includes('DAMAGED_HULL')) {
      const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
      if (!baseDrone || drone.hull >= baseDrone.hull) {
        return false;
      }
    }

    // EXHAUSTED - Drone must be exhausted
    if (custom.includes('EXHAUSTED')) {
      if (!drone.isExhausted) {
        return false;
      }
    }

    // MARKED - Drone must be marked
    if (custom.includes('MARKED')) {
      if (!drone.isMarked) {
        return false;
      }
    }

    // NOT_MARKED - Drone must not be marked
    if (custom.includes('NOT_MARKED')) {
      if (drone.isMarked) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get acting player's state
   *
   * @param {Object} context - Targeting context
   * @returns {Object} Acting player's state
   */
  getActingPlayerState(context) {
    return context.actingPlayerId === 'player1' ? context.player1 : context.player2;
  }

  /**
   * Get opponent player's state
   *
   * @param {Object} context - Targeting context
   * @returns {Object} Opponent player's state
   */
  getOpponentPlayerState(context) {
    return context.actingPlayerId === 'player1' ? context.player2 : context.player1;
  }

  /**
   * Get opponent player ID
   *
   * @param {string} actingPlayerId - Acting player ID
   * @returns {string} Opponent player ID
   */
  getOpponentPlayerId(actingPlayerId) {
    return actingPlayerId === 'player1' ? 'player2' : 'player1';
  }

  /**
   * Check if targeting is from a card (not an ability)
   *
   * @param {Object} definition - Card/ability definition
   * @returns {boolean} True if this is a card
   */
  isCard(definition) {
    return typeof definition.cost === 'number';
  }

  /**
   * Check if targeting is from an ability (not a card)
   *
   * @param {Object} definition - Card/ability definition
   * @returns {boolean} True if this is an ability
   */
  isAbility(definition) {
    return !this.isCard(definition);
  }

  /**
   * Extract instigator name for logging
   * @param {Object} context - Targeting context
   * @returns {string} Formatted instigator string
   */
  getInstigatorName(context) {
    const { source, definition } = context;

    // Cards (source is null, has cost property)
    if (this.isCard(definition)) {
      return `${definition.name} (${definition.id})`;
    }

    // Abilities (source is drone/ship, no cost property)
    if (source) {
      // Drone ability
      if (source.name) {
        return `${source.name} - ${definition.name || 'Ability'}`;
      }
      // Ship ability
      if (source.id) {
        return `${source.id} - ${definition.name || 'Ability'}`;
      }
    }

    return 'Unknown';
  }

  /**
   * Log the start of targeting processing
   *
   * @param {Object} context - Targeting context
   */
  logProcessStart(context) {
    debugLog('TARGETING_PROCESSING', `▶️ ${this.constructor.name} starting`, {
      targetingType: context.definition.targeting.type,
      affinity: context.definition.targeting.affinity,
      location: context.definition.targeting.location,
      actingPlayer: context.actingPlayerId,
      isCard: this.isCard(context.definition),
      instigator: this.getInstigatorName(context)
    });
  }

  /**
   * Log the completion of targeting processing
   *
   * @param {Object} context - Targeting context
   * @param {Array} targets - Valid targets found
   */
  logProcessComplete(context, targets) {
    debugLog('TARGETING_PROCESSING', `✅ ${this.constructor.name} completed`, {
      targetingType: context.definition.targeting.type,
      actingPlayer: context.actingPlayerId,
      targetCount: targets.length,
      instigator: this.getInstigatorName(context)
    });
  }
}

export default BaseTargetingProcessor;
