// ========================================
// BASE EFFECT PROCESSOR
// ========================================
// Abstract base class for all effect processors
// Provides common utilities and enforces processor interface

import { debugLog } from '../../utils/debugLogger.js';

/**
 * BaseEffectProcessor - Abstract base class for effect processors
 *
 * All effect processors must extend this class and implement the process() method.
 *
 * @abstract
 */
class BaseEffectProcessor {
  /**
   * Process an effect and return the result
   *
   * @param {Object} effect - The effect configuration from card data
   * @param {Object} context - Effect execution context
   * @param {string} context.actingPlayerId - Player executing the effect
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.placedSections - Placed ship sections (optional)
   * @param {Object} context.target - Target for the effect (optional)
   * @param {Object} context.callbacks - Callback functions (optional)
   * @returns {Object} Result object with newPlayerStates and additionalEffects
   * @throws {Error} If not implemented in subclass
   */
  process(effect, context) {
    throw new Error(`process() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Deep clone player states to prevent mutations
   *
   * @param {Object} playerStates - Player states to clone
   * @returns {Object} Cloned player states
   */
  clonePlayerStates(playerStates) {
    return {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };
  }

  /**
   * Get the acting player's state from cloned states
   *
   * @param {Object} newPlayerStates - Cloned player states
   * @param {string} actingPlayerId - ID of acting player
   * @returns {Object} Acting player's state
   */
  getActingPlayerState(newPlayerStates, actingPlayerId) {
    return newPlayerStates[actingPlayerId];
  }

  /**
   * Get the target player's state from cloned states
   *
   * @param {Object} newPlayerStates - Cloned player states
   * @param {Object} target - Target object with owner property
   * @param {string} actingPlayerId - ID of acting player (fallback)
   * @returns {Object} Target player's state
   */
  getTargetPlayerState(newPlayerStates, target, actingPlayerId) {
    return newPlayerStates[target?.owner || actingPlayerId];
  }

  /**
   * Create standard success result
   *
   * Auto-detects whether second parameter contains animation events or additional effects
   * by checking for presence of 'type' property (animation events have this, additional effects don't)
   *
   * @param {Object} newPlayerStates - Updated player states
   * @param {Array} animationEventsOrAdditionalEffects - Animation events OR additional effects (default: [])
   * @param {Array} additionalEffects - Additional effects if first array was animations (default: [])
   * @returns {Object} Standard result object with proper property names
   */
  createResult(newPlayerStates, animationEventsOrAdditionalEffects = [], additionalEffects = []) {
    // Auto-detect: animation events have 'type' property, additional effects don't
    const isAnimations = animationEventsOrAdditionalEffects.length > 0 &&
                         animationEventsOrAdditionalEffects[0]?.type;

    return {
      newPlayerStates,
      animationEvents: isAnimations ? animationEventsOrAdditionalEffects : [],
      additionalEffects: isAnimations ? additionalEffects : animationEventsOrAdditionalEffects
    };
  }

  /**
   * Log the start of effect processing
   *
   * @param {Object} effect - Effect being processed
   * @param {Object} context - Effect execution context
   */
  logProcessStart(effect, context) {
    debugLog('EFFECT_PROCESSING', `▶️ ${this.constructor.name} starting`, {
      effectType: effect.type,
      effectValue: effect.value,
      actingPlayer: context.actingPlayerId,
      hasTarget: !!context.target
    });
  }

  /**
   * Log the completion of effect processing
   *
   * @param {Object} effect - Effect that was processed
   * @param {Object} result - Result from processing
   * @param {Object} context - Effect execution context
   */
  logProcessComplete(effect, result, context) {
    debugLog('EFFECT_PROCESSING', `✅ ${this.constructor.name} completed`, {
      effectType: effect.type,
      actingPlayer: context.actingPlayerId,
      hasAdditionalEffects: result.additionalEffects.length > 0,
      additionalEffectsCount: result.additionalEffects.length
    });
  }
}

export default BaseEffectProcessor;
