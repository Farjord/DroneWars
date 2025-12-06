// ========================================
// CONDITION EVALUATOR
// ========================================
// Modular condition evaluation for the conditional effects system
// Evaluates conditions for both PRE and POST timing conditional effects
//
// Supports:
// - State conditions: TARGET_IS_MARKED, TARGET_IS_EXHAUSTED, TARGET_IS_READY
// - Stat conditions: TARGET_STAT_GTE, TARGET_STAT_LTE, TARGET_STAT_GT, TARGET_STAT_LT
// - Outcome conditions: ON_DESTROY, ON_DAMAGE (require effectResult from POST timing)
//
// Extensible via registerHandler() for custom conditions

import { debugLog } from '../../../utils/debugLogger.js';
import { calculateEffectiveStats } from '../../statsCalculator.js';

/**
 * Evaluates conditions for conditional effects
 * Uses a handler registry pattern for extensibility
 */
class ConditionEvaluator {
  constructor() {
    // Registry of condition handlers
    this.handlers = {
      // State conditions
      TARGET_IS_MARKED: this.evaluateTargetIsMarked.bind(this),
      TARGET_IS_EXHAUSTED: this.evaluateTargetIsExhausted.bind(this),
      TARGET_IS_READY: this.evaluateTargetIsReady.bind(this),

      // Stat comparison conditions
      TARGET_STAT_GTE: this.evaluateTargetStatGTE.bind(this),
      TARGET_STAT_LTE: this.evaluateTargetStatLTE.bind(this),
      TARGET_STAT_GT: this.evaluateTargetStatGT.bind(this),
      TARGET_STAT_LT: this.evaluateTargetStatLT.bind(this),

      // Outcome conditions (POST timing only)
      ON_DESTROY: this.evaluateOnDestroy.bind(this),
      ON_DAMAGE: this.evaluateOnDamage.bind(this)
    };
  }

  /**
   * Evaluate a condition against the current context
   *
   * @param {Object} condition - Condition definition { type, ...params }
   * @param {Object} context - Evaluation context
   * @param {Object} context.target - Target drone/entity
   * @param {Object} context.effectResult - Result from primary effect (for POST conditions)
   * @param {Object} context.playerStates - Current game state
   * @param {Object} context.placedSections - Placed ship sections
   * @returns {boolean} Whether condition is met
   */
  evaluate(condition, context) {
    // Handle null/undefined condition
    if (!condition || !condition.type) {
      debugLog('EFFECT_PROCESSING', '[ConditionEvaluator] Invalid condition: missing or no type');
      return false;
    }

    const handler = this.handlers[condition.type];

    if (!handler) {
      debugLog('EFFECT_PROCESSING', `[ConditionEvaluator] Unknown condition type: ${condition.type}`);
      return false;
    }

    const result = handler(condition, context);

    debugLog('EFFECT_PROCESSING', `[ConditionEvaluator] ${condition.type} evaluated to ${result}`, {
      condition,
      targetId: context.target?.id
    });

    return result;
  }

  /**
   * Register a custom condition handler
   *
   * @param {string} conditionType - Condition type name
   * @param {Function} handler - Handler function (condition, context) => boolean
   */
  registerHandler(conditionType, handler) {
    this.handlers[conditionType] = handler;
    debugLog('EFFECT_PROCESSING', `[ConditionEvaluator] Registered custom handler: ${conditionType}`);
  }

  // ========================================
  // STATE CONDITION HANDLERS
  // ========================================

  /**
   * Check if target is marked
   */
  evaluateTargetIsMarked(condition, context) {
    const target = context.target;
    if (!target) return false;

    return target.isMarked === true;
  }

  /**
   * Check if target is exhausted
   */
  evaluateTargetIsExhausted(condition, context) {
    const target = context.target;
    if (!target) return false;

    return target.isExhausted === true;
  }

  /**
   * Check if target is ready (not exhausted)
   */
  evaluateTargetIsReady(condition, context) {
    const target = context.target;
    if (!target) return false;

    // Undefined isExhausted defaults to ready (false)
    return target.isExhausted !== true;
  }

  // ========================================
  // STAT COMPARISON HANDLERS
  // ========================================

  /**
   * Get stat value from target
   * For attack/speed, uses effective stats (includes buffs/debuffs)
   * For hull and other stats, uses current value directly
   * @private
   */
  getTargetStat(target, stat, context) {
    if (!target) return 0;

    // For attack/speed, use effective stats (includes buffs/debuffs)
    if ((stat === 'attack' || stat === 'speed') && context) {
      const { playerStates, placedSections } = context;

      // Validate we have all required context
      if (playerStates && target.owner && target.lane) {
        const targetPlayerId = target.owner;
        const opponentId = targetPlayerId === 'player1' ? 'player2' : 'player1';

        try {
          const effectiveStats = calculateEffectiveStats(
            target,
            target.lane,
            playerStates[targetPlayerId],
            playerStates[opponentId],
            placedSections || {}
          );

          return effectiveStats[stat] ?? 0;
        } catch (e) {
          // Fall back to base stat if calculation fails
          debugLog('EFFECT_PROCESSING', `[ConditionEvaluator] Failed to calculate effective stats, using base: ${e.message}`);
        }
      }
    }

    // For hull and other stats (or fallback), use current value directly
    const value = target[stat];

    // Treat undefined/null as 0
    if (value === undefined || value === null) {
      return 0;
    }

    return value;
  }

  /**
   * Check if target stat >= threshold
   */
  evaluateTargetStatGTE(condition, context) {
    const target = context.target;
    if (!target) return false;

    const statValue = this.getTargetStat(target, condition.stat, context);
    return statValue >= condition.value;
  }

  /**
   * Check if target stat <= threshold
   */
  evaluateTargetStatLTE(condition, context) {
    const target = context.target;
    if (!target) return false;

    const statValue = this.getTargetStat(target, condition.stat, context);
    return statValue <= condition.value;
  }

  /**
   * Check if target stat > threshold
   */
  evaluateTargetStatGT(condition, context) {
    const target = context.target;
    if (!target) return false;

    const statValue = this.getTargetStat(target, condition.stat, context);
    return statValue > condition.value;
  }

  /**
   * Check if target stat < threshold
   */
  evaluateTargetStatLT(condition, context) {
    const target = context.target;
    if (!target) return false;

    const statValue = this.getTargetStat(target, condition.stat, context);
    return statValue < condition.value;
  }

  // ========================================
  // OUTCOME CONDITION HANDLERS (POST timing)
  // ========================================

  /**
   * Check if target was destroyed by the primary effect
   * Requires effectResult from POST timing
   */
  evaluateOnDestroy(condition, context) {
    const effectResult = context.effectResult;

    if (!effectResult) {
      return false;
    }

    return effectResult.wasDestroyed === true;
  }

  /**
   * Check if any damage was dealt by the primary effect
   * Requires effectResult from POST timing
   */
  evaluateOnDamage(condition, context) {
    const effectResult = context.effectResult;

    if (!effectResult || !effectResult.damageDealt) {
      return false;
    }

    const { shield = 0, hull = 0 } = effectResult.damageDealt;
    const totalDamage = shield + hull;

    return totalDamage > 0;
  }
}

export default ConditionEvaluator;
