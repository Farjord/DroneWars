// ========================================
// BASE TARGETING PROCESSOR
// ========================================
// Abstract base class for all targeting processors
// Provides common utilities for affinity matching and custom criteria

import { debugLog } from '../../utils/debugLogger.js';
import fullDroneCollection from '../../data/droneData.js';
import { LaneControlCalculator } from '../combat/LaneControlCalculator.js';

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
   * Extended to support stat comparisons with cost targets
   *
   * @param {Object} drone - Drone to check
   * @param {Array} custom - Array of custom criteria (strings or objects)
   * @param {Object} costContext - Optional cost selection context
   * @param {string} lane - Lane where drone is located
   * @param {Object} context - Targeting context with getEffectiveStats function
   * @returns {boolean} True if drone meets all custom criteria
   */
  applyCustomCriteria(drone, custom, costContext = null, lane = null, context = null) {
    if (!custom || custom.length === 0) return true;

    for (const criterion of custom) {
      // Legacy string criteria
      if (typeof criterion === 'string') {
        if (!this.applyStringCriterion(drone, criterion)) {
          return false;
        }
        continue;
      }

      // New object-based criteria
      if (criterion.type === 'STAT_COMPARISON') {
        if (!this.applyStatComparison(drone, criterion, costContext, lane, context)) {
          return false;
        }
        continue;
      }

      // Simple stat comparison (e.g., { stat: 'hull', comparison: 'LTE', value: 1 })
      if (criterion.stat && criterion.comparison && criterion.value !== undefined) {
        if (!this.applySimpleStatCriterion(drone, criterion)) {
          return false;
        }
        continue;
      }

      // Lane control criteria
      if (criterion.type === 'IN_LANE_CONTROLLED_BY') {
        if (!this.applyLaneControlCriterion(drone, criterion, lane, context, true)) {
          return false;
        }
        continue;
      }

      if (criterion.type === 'IN_LANE_NOT_CONTROLLED_BY') {
        if (!this.applyLaneControlCriterion(drone, criterion, lane, context, false)) {
          return false;
        }
        continue;
      }
    }

    return true;
  }

  /**
   * Apply simple stat criterion for targeting validation
   * Used for cards like Executioner that need to filter by stat thresholds
   *
   * @param {Object} drone - Drone to check
   * @param {Object} criterion - { stat, comparison, value }
   * @returns {boolean} True if criterion passes
   */
  applySimpleStatCriterion(drone, criterion) {
    const { stat, comparison, value } = criterion;
    const droneValue = drone[stat];

    if (droneValue === undefined) {
      debugLog('TARGETING_PROCESSING', '⚠️ Drone missing stat for criterion', {
        droneId: drone.id,
        stat
      });
      return false;
    }

    const passes = this.compareValues(droneValue, comparison, value);

    debugLog('TARGETING_PROCESSING',
      passes ? '✅ Simple stat criterion passes' : '❌ Simple stat criterion fails',
      {
        droneId: drone.id,
        stat,
        droneValue,
        comparison,
        targetValue: value,
        passes
      }
    );

    return passes;
  }

  /**
   * Apply legacy string criterion (existing logic)
   *
   * @param {Object} drone - Drone to check
   * @param {string} criterion - String criterion
   * @returns {boolean} True if criterion passes
   */
  applyStringCriterion(drone, criterion) {
    // DAMAGED_HULL - Drone's hull must be less than max hull
    if (criterion === 'DAMAGED_HULL') {
      const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
      return baseDrone && drone.hull < baseDrone.hull;
    }

    // EXHAUSTED - Drone must be exhausted
    if (criterion === 'EXHAUSTED') {
      return drone.isExhausted;
    }

    // MARKED - Drone must be marked
    if (criterion === 'MARKED') {
      return drone.isMarked;
    }

    // NOT_MARKED - Drone must not be marked
    if (criterion === 'NOT_MARKED') {
      return !drone.isMarked;
    }

    return true;
  }

  /**
   * Apply lane control criterion
   *
   * @param {Object} drone - Drone to check
   * @param {Object} criterion - { type, controller }
   * @param {string} lane - Lane where drone is located
   * @param {Object} context - Targeting context with player states
   * @param {boolean} requireControlled - true for IN_LANE_CONTROLLED_BY, false for IN_LANE_NOT_CONTROLLED_BY
   * @returns {boolean} True if criterion passes
   */
  applyLaneControlCriterion(drone, criterion, lane, context, requireControlled) {
    if (!lane || !context) {
      debugLog('TARGETING_PROCESSING', '⚠️ Lane control criterion - missing lane or context', {
        droneId: drone.id,
        hasLane: !!lane,
        hasContext: !!context
      });
      return false;
    }

    // Determine which player to check for control
    let controllerPlayerId;
    if (criterion.controller === 'ACTING_PLAYER') {
      controllerPlayerId = context.actingPlayerId;
    } else if (criterion.controller === 'OPPONENT') {
      controllerPlayerId = this.getOpponentPlayerId(context.actingPlayerId);
    } else {
      debugLog('TARGETING_PROCESSING', '⚠️ Unknown controller type', { controller: criterion.controller });
      return true; // Unknown controller, don't filter
    }

    // Get lanes controlled by the specified player
    const lanesControlled = LaneControlCalculator.getLanesControlled(
      controllerPlayerId,
      context.player1,
      context.player2
    );

    const isInControlledLane = lanesControlled.includes(lane);

    const passes = requireControlled ? isInControlledLane : !isInControlledLane;

    debugLog('TARGETING_PROCESSING',
      passes ? '✅ Lane control criterion passes' : '❌ Lane control criterion fails',
      {
        droneId: drone.id,
        lane,
        controllerPlayerId,
        requireControlled,
        lanesControlled,
        isInControlledLane,
        passes
      }
    );

    return passes;
  }

  /**
   * Apply stat comparison criterion
   *
   * @param {Object} drone - Drone to check
   * @param {Object} criterion - { type, stat, comparison, reference, referenceStat }
   * @param {Object} costContext - Cost selection context
   * @param {string} lane - Lane where drone is located
   * @param {Object} context - Targeting context with getEffectiveStats function
   * @returns {boolean} True if comparison passes
   */
  applyStatComparison(drone, criterion, costContext, lane, context) {
    debugLog('ADDITIONAL_COST_TARGETING', '📊 applyStatComparison called', {
      droneId: drone.id,
      criterion,
      hasCostContext: !!costContext,
      costContextTarget: costContext?.target?.id
    });

    const { stat, comparison, reference, referenceStat } = criterion;

    if (reference === 'COST_TARGET') {
      if (!costContext || !costContext.target) {
        debugLog('ADDITIONAL_COST_TARGETING', '❌ STAT_COMPARISON fails - missing cost target', {
          hasCostContext: !!costContext,
          costContextTarget: costContext?.target
        });
        return false;
      }

      const costTarget = costContext.target;
      const droneValue = this.getEffectiveStat(drone, stat, lane, context);
      const referenceValue = this.getEffectiveStat(costTarget, referenceStat || stat, costContext?.lane, context);
      const passes = this.compareValues(droneValue, comparison, referenceValue);

      debugLog('ADDITIONAL_COST_TARGETING',
        passes ? '✅ STAT_COMPARISON passes' : '❌ STAT_COMPARISON fails',
        {
          droneId: drone.id,
          droneStat: stat,
          droneValue,
          comparison,
          costTargetId: costTarget.id,
          referenceStat: referenceStat || stat,
          referenceValue,
          passes
        }
      );

      return passes;
    }

    debugLog('ADDITIONAL_COST_TARGETING', '⚠️ Unknown reference type', { reference });
    // Future: support other reference types (PLAYER_ENERGY, etc.)
    return true;
  }

  /**
   * Get effective stat value using GameDataService
   *
   * @param {Object} drone - Drone object
   * @param {string} stat - Stat name (attack, speed, hull, etc.)
   * @param {string} lane - Lane where drone is located
   * @param {Object} context - Targeting context with getEffectiveStats function
   * @returns {number} Effective stat value
   */
  getEffectiveStat(drone, stat, lane = null, context = null) {
    // For non-buffable stats, return base value directly
    if (stat !== 'attack' && stat !== 'speed') {
      return drone[stat] || 0;
    }

    // If no getEffectiveStats function provided, fall back to base stat
    if (!context || !context.getEffectiveStats || !lane) {
      debugLog('STAT_CALCULATION', '⚠️ Missing getEffectiveStats or lane, using base stat', {
        droneId: drone.id,
        stat,
        hasContext: !!context,
        hasFunction: !!(context?.getEffectiveStats),
        hasLane: !!lane
      });
      return drone[stat] || 0;
    }

    // Use the proven GameDataService.getEffectiveStats method
    try {
      const effectiveStats = context.getEffectiveStats(drone, lane, {
        playerState: context.player1,
        opponentState: context.player2
      });

      debugLog('STAT_CALCULATION', '✅ Used GameDataService.getEffectiveStats', {
        droneId: drone.id,
        stat,
        lane,
        baseValue: drone[stat],
        effectiveValue: effectiveStats[stat]
      });

      return effectiveStats[stat];
    } catch (error) {
      debugLog('STAT_CALCULATION', '❌ Error calling getEffectiveStats', {
        droneId: drone.id,
        stat,
        error: error.message
      });
      return drone[stat] || 0;
    }
  }

  /**
   * Compare two values based on comparison operator
   *
   * @param {number} value - Value to compare
   * @param {string} operator - Comparison operator (GT, GTE, LT, LTE, EQ)
   * @param {number} reference - Reference value
   * @returns {boolean} Comparison result
   */
  compareValues(value, operator, reference) {
    switch (operator) {
      case 'GT': return value > reference;
      case 'GTE': return value >= reference;
      case 'LT': return value < reference;
      case 'LTE': return value <= reference;
      case 'EQ': return value === reference;
      default: return true;
    }
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
