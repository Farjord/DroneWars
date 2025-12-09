// ========================================
// CONDITIONAL EFFECT PROCESSOR
// ========================================
// Meta-processor for conditional effects on cards
// Handles both PRE (before primary effect) and POST (after primary effect) timing
//
// PRE timing: Check conditions before primary effect executes
//   - BONUS_DAMAGE: Adds to primary effect's damage value
//   - DESTROY: Queues destruction effect
//   - Other effects: Queued as additional effects
//
// POST timing: Check conditions after primary effect resolves
//   - ON_DESTROY: Check if target was destroyed
//   - ON_HULL_DAMAGE: Check if hull damage was dealt (not shield damage)
//   - Granted effects routed through EffectRouter

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import ConditionEvaluator from './ConditionEvaluator.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * Processor for conditional effects on cards
 * A meta-processor that evaluates conditions and routes granted effects
 *
 * @extends BaseEffectProcessor
 */
class ConditionalEffectProcessor extends BaseEffectProcessor {
  constructor() {
    super();
    this.conditionEvaluator = new ConditionEvaluator();
  }

  /**
   * Process PRE conditionals before the primary effect executes
   * Called by CardPlayManager before executing the primary effect
   *
   * @param {Array} conditionalEffects - Array of conditional effect definitions
   * @param {Object} primaryEffect - The card's primary effect (may be modified)
   * @param {Object} context - Effect context
   * @returns {Object} Result with modifiedEffect, newPlayerStates, animationEvents, additionalEffects
   */
  processPreConditionals(conditionalEffects, primaryEffect, context) {
    debugLog('EFFECT_PROCESSING', '[ConditionalEffectProcessor] Processing PRE conditionals', {
      conditionalCount: conditionalEffects?.length || 0,
      primaryEffectType: primaryEffect?.type
    });

    // Handle null/undefined/empty conditionalEffects
    if (!conditionalEffects || conditionalEffects.length === 0) {
      return {
        modifiedEffect: primaryEffect,
        newPlayerStates: this.clonePlayerStates(context.playerStates),
        animationEvents: [],
        additionalEffects: []
      };
    }

    // Clone primary effect to avoid mutation
    let modifiedEffect = primaryEffect ? { ...primaryEffect } : null;
    let currentStates = this.clonePlayerStates(context.playerStates);
    const allAnimationEvents = [];
    const allAdditionalEffects = [];

    // Filter to only PRE timing conditionals
    const preConditionals = conditionalEffects.filter(c => c.timing === 'PRE');

    for (const conditional of preConditionals) {
      debugLog('EFFECT_PROCESSING', `[ConditionalEffectProcessor] Evaluating PRE condition: ${conditional.id}`, {
        conditionType: conditional.condition?.type
      });

      // Evaluate the condition
      const conditionMet = this.conditionEvaluator.evaluate(conditional.condition, {
        ...context,
        playerStates: currentStates
      });

      if (!conditionMet) {
        debugLog('EFFECT_PROCESSING', `[ConditionalEffectProcessor] PRE condition NOT met: ${conditional.id}`);
        continue;
      }

      debugLog('EFFECT_PROCESSING', `[ConditionalEffectProcessor] PRE condition MET: ${conditional.id}`, {
        grantedEffectType: conditional.grantedEffect?.type
      });

      // Process the granted effect based on type
      const grantedEffect = conditional.grantedEffect;

      if (grantedEffect.type === 'BONUS_DAMAGE') {
        // BONUS_DAMAGE modifies the primary effect's value
        if (modifiedEffect && typeof modifiedEffect.value === 'number') {
          modifiedEffect.value += grantedEffect.value;
          debugLog('EFFECT_PROCESSING', `[ConditionalEffectProcessor] Applied BONUS_DAMAGE: +${grantedEffect.value} (new total: ${modifiedEffect.value})`);
        }
      } else {
        // Other granted effects are queued as additional effects
        allAdditionalEffects.push({
          ...grantedEffect,
          _conditionalId: conditional.id // Track source for debugging
        });
        debugLog('EFFECT_PROCESSING', `[ConditionalEffectProcessor] Queued granted effect: ${grantedEffect.type}`);
      }
    }

    return {
      modifiedEffect,
      newPlayerStates: currentStates,
      animationEvents: allAnimationEvents,
      additionalEffects: allAdditionalEffects
    };
  }

  /**
   * Process POST conditionals after the primary effect has resolved
   * Called by CardPlayManager after executing the primary effect
   *
   * @param {Array} conditionalEffects - Array of conditional effect definitions
   * @param {Object} context - Effect context including effectResult
   * @param {Object} effectResult - Result from primary effect (wasDestroyed, damageDealt, etc.)
   * @returns {Object} Result with newPlayerStates, animationEvents, additionalEffects, grantsGoAgain
   */
  processPostConditionals(conditionalEffects, context, effectResult) {
    debugLog('EFFECT_PROCESSING', '[ConditionalEffectProcessor] Processing POST conditionals', {
      conditionalCount: conditionalEffects?.length || 0,
      wasDestroyed: effectResult?.wasDestroyed,
      damageDealt: effectResult?.damageDealt
    });

    // Handle null/undefined/empty conditionalEffects
    if (!conditionalEffects || conditionalEffects.length === 0) {
      return {
        newPlayerStates: this.clonePlayerStates(context.playerStates),
        animationEvents: [],
        additionalEffects: [],
        grantsGoAgain: false
      };
    }

    let currentStates = this.clonePlayerStates(context.playerStates);
    const allAnimationEvents = [];
    const allAdditionalEffects = [];
    let grantsGoAgain = false;

    // Create context with effectResult for POST condition evaluation
    const postContext = {
      ...context,
      playerStates: currentStates,
      effectResult
    };

    // Filter to only POST timing conditionals
    const postConditionals = conditionalEffects.filter(c => c.timing === 'POST');

    for (const conditional of postConditionals) {
      debugLog('EFFECT_PROCESSING', `[ConditionalEffectProcessor] Evaluating POST condition: ${conditional.id}`, {
        conditionType: conditional.condition?.type
      });

      // Evaluate the condition with effectResult available
      const conditionMet = this.conditionEvaluator.evaluate(conditional.condition, postContext);

      if (!conditionMet) {
        debugLog('EFFECT_PROCESSING', `[ConditionalEffectProcessor] POST condition NOT met: ${conditional.id}`);
        continue;
      }

      debugLog('EFFECT_PROCESSING', `[ConditionalEffectProcessor] POST condition MET: ${conditional.id}`, {
        grantedEffectType: conditional.grantedEffect?.type
      });

      // Process the granted effect
      const grantedEffect = conditional.grantedEffect;

      if (grantedEffect.type === 'GO_AGAIN') {
        // GO_AGAIN sets a flag rather than queuing an effect
        grantsGoAgain = true;
        debugLog('EFFECT_PROCESSING', '[ConditionalEffectProcessor] Granted GO_AGAIN');
      } else {
        // Other granted effects are queued as additional effects
        // They will be routed through EffectRouter by CardPlayManager
        allAdditionalEffects.push({
          ...grantedEffect,
          _conditionalId: conditional.id // Track source for debugging
        });
        debugLog('EFFECT_PROCESSING', `[ConditionalEffectProcessor] Queued POST granted effect: ${grantedEffect.type}`);
      }
    }

    return {
      newPlayerStates: currentStates,
      animationEvents: allAnimationEvents,
      additionalEffects: allAdditionalEffects,
      grantsGoAgain
    };
  }
}

export default ConditionalEffectProcessor;
