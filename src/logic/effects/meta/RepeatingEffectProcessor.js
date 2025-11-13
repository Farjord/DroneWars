// ========================================
// REPEATING EFFECT PROCESSOR
// ========================================
// Handles REPEATING_EFFECT type (meta-processor)
// Extracts repeating effect logic from gameLogic.js resolveMultiEffect()
// Executes sub-effects multiple times based on dynamic game conditions
//
// Meta-processor: Routes to other effect processors recursively via EffectRouter

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';
import EffectRouter from '../../EffectRouter.js';
import { getShipStatus } from '../../statsCalculator.js';

/**
 * Processor for REPEATING_EFFECT type
 *
 * A meta-processor that executes sub-effects multiple times based on a
 * dynamic game condition. Currently used by "Desperate Measures" card.
 *
 * Supports:
 * - Dynamic repeat count calculation based on game state conditions
 * - Sequential execution of multiple sub-effects per repetition
 * - State accumulation across repetitions
 * - Recursive routing through EffectRouter for sub-effects
 * - Safety limits to prevent infinite loops
 *
 * Current Conditions:
 * - OWN_DAMAGED_SECTIONS: Repeat for each damaged/critical ship section
 *
 * @extends BaseEffectProcessor
 */
class RepeatingEffectProcessor extends BaseEffectProcessor {
  /**
   * Process REPEATING_EFFECT
   *
   * @param {Object} effect - Effect definition
   * @param {string} effect.type - Must be 'REPEATING_EFFECT'
   * @param {Array<Object>} effect.effects - Sub-effects to repeat
   * @param {string} effect.condition - Condition determining repeat count
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player performing the action
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.placedSections - Placed ship sections
   * @param {Object} context.target - Target for sub-effects
   * @param {Object} context.callbacks - Callback functions
   * @param {Object} context.card - Source card
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, localPlayerId = 'player1', gameMode = 'local' } = context;
    let currentStates = this.clonePlayerStates(playerStates);
    const allAdditionalEffects = [];
    const allAnimationEvents = [];

    // Calculate how many times to repeat based on condition
    const repeatCount = this.calculateRepeatCount(effect.condition, currentStates[actingPlayerId]);

    debugLog('EFFECT_PROCESSING', `[REPEATING_EFFECT] ${actingPlayerId} executing ${effect.effects.length} sub-effects × ${repeatCount} times`, {
      condition: effect.condition,
      repeatCount,
      subEffects: effect.effects.map(e => e.type)
    });

    // Safety limit to prevent infinite loops
    const MAX_REPEATS = 10;
    const safeRepeatCount = Math.min(repeatCount, MAX_REPEATS);

    if (safeRepeatCount < repeatCount) {
      debugLog('EFFECT_PROCESSING', `[REPEATING_EFFECT] ⚠️ Capped at ${MAX_REPEATS} repetitions (requested ${repeatCount})`);
    }

    // Execute each sub-effect, repeatCount times
    for (let i = 0; i < safeRepeatCount; i++) {
      debugLog('EFFECT_PROCESSING', `[REPEATING_EFFECT] Repetition ${i + 1}/${safeRepeatCount}`);

      for (const subEffect of effect.effects) {
        // Create updated context with current states
        const subContext = {
          ...context,
          playerStates: currentStates
        };

        // Route sub-effect through EffectRouter (recursive call)
        const effectRouter = new EffectRouter();
        const result = effectRouter.routeEffect(subEffect, subContext);

        // Handle fallback for effects not yet extracted to processors
        if (result === null) {
          debugLog('EFFECT_PROCESSING', `[REPEATING_EFFECT] ⚠️ Sub-effect ${subEffect.type} not yet extracted to processor, skipping`);
          continue; // Skip this sub-effect and continue with next
        }

        // Accumulate state changes
        currentStates = result.newPlayerStates;

        // Accumulate additional effects
        if (result.additionalEffects) {
          allAdditionalEffects.push(...result.additionalEffects);
        }

        // Accumulate animation events
        if (result.animationEvents) {
          allAnimationEvents.push(...result.animationEvents);
        }

        debugLog('EFFECT_PROCESSING', `[REPEATING_EFFECT] Sub-effect ${subEffect.type} executed in repetition ${i + 1}`);
      }
    }

    const result = {
      newPlayerStates: currentStates,
      additionalEffects: allAdditionalEffects,
      animationEvents: allAnimationEvents
    };

    this.logProcessComplete(effect, result, context);
    return result;
  }

  /**
   * Calculate how many times to repeat effects based on condition
   *
   * @private
   * @param {string} condition - Repeat condition type
   * @param {Object} playerState - Current player state
   * @returns {number} Number of times to execute effects
   */
  calculateRepeatCount(condition, playerState) {
    let repeatCount = 1; // Base effect always happens once

    switch (condition) {
      case 'OWN_DAMAGED_SECTIONS': {
        // Count damaged or critical ship sections
        for (const sectionName in playerState.shipSections) {
          const section = playerState.shipSections[sectionName];
          const status = getShipStatus(section);

          if (status === 'damaged' || status === 'critical') {
            repeatCount++;
          }
        }

        debugLog('EFFECT_PROCESSING', `[REPEATING_EFFECT] OWN_DAMAGED_SECTIONS: ${repeatCount - 1} damaged sections found (${repeatCount} total executions)`);
        break;
      }

      // Future conditions can be added here:
      // case 'OPPONENT_DRONES_ON_BOARD':
      // case 'OWN_HAND_SIZE':
      // case 'DESTROYED_DRONES_THIS_TURN':

      default:
        debugLog('EFFECT_PROCESSING', `[REPEATING_EFFECT] ⚠️ Unknown condition: ${condition}, defaulting to 1 execution`);
    }

    return repeatCount;
  }
}

export default RepeatingEffectProcessor;
