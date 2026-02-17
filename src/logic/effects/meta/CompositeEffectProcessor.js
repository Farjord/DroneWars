// ========================================
// COMPOSITE EFFECT PROCESSOR
// ========================================
// Handles COMPOSITE_EFFECT type (meta-processor)
// Executes multiple sub-effects sequentially, accumulating state changes
//
// Meta-processor: Routes to other effect processors recursively via EffectRouter

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';
import EffectRouter from '../../EffectRouter.js';

/**
 * Processor for COMPOSITE_EFFECT type
 *
 * A meta-processor that executes multiple sub-effects sequentially once.
 * Used for cards that need multiple distinct effects (e.g., Mainframe Breach:
 * discard 2 cards AND drain 4 energy).
 *
 * @extends BaseEffectProcessor
 */
class CompositeEffectProcessor extends BaseEffectProcessor {
  /**
   * Process COMPOSITE_EFFECT
   *
   * @param {Object} effect - Effect definition
   * @param {string} effect.type - Must be 'COMPOSITE_EFFECT'
   * @param {Array<Object>} effect.effects - Sub-effects to execute sequentially
   * @param {Object} context - Effect context
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId } = context;
    let currentStates = this.clonePlayerStates(context.playerStates);
    const allAdditionalEffects = [];
    const allAnimationEvents = [];

    debugLog('EFFECT_PROCESSING', `[COMPOSITE_EFFECT] ${actingPlayerId} executing ${effect.effects.length} sub-effects`, {
      subEffects: effect.effects.map(e => e.type)
    });

    for (const subEffect of effect.effects) {
      const subContext = {
        ...context,
        playerStates: currentStates
      };

      const effectRouter = new EffectRouter();
      const result = effectRouter.routeEffect(subEffect, subContext);

      if (result === null) {
        debugLog('EFFECT_PROCESSING', `[COMPOSITE_EFFECT] Sub-effect ${subEffect.type} not yet extracted to processor, skipping`);
        continue;
      }

      currentStates = result.newPlayerStates;

      if (result.additionalEffects) {
        allAdditionalEffects.push(...result.additionalEffects);
      }

      if (result.animationEvents) {
        allAnimationEvents.push(...result.animationEvents);
      }

      debugLog('EFFECT_PROCESSING', `[COMPOSITE_EFFECT] Sub-effect ${subEffect.type} executed`);
    }

    const result = {
      newPlayerStates: currentStates,
      additionalEffects: allAdditionalEffects,
      animationEvents: allAnimationEvents
    };

    this.logProcessComplete(effect, result, context);
    return result;
  }
}

export default CompositeEffectProcessor;
