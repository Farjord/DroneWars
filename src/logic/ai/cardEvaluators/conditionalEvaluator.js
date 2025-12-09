// ========================================
// CONDITIONAL EFFECTS EVALUATOR
// ========================================
// Evaluates conditional effects on cards for AI scoring
// This is a modular system - any base effect can have any conditional effect

import { CARD_EVALUATION, SCORING_WEIGHTS } from '../aiConstants.js';

/**
 * Evaluate PRE-timing conditional effects for AI scoring
 * Returns bonus score from conditionals that would trigger
 *
 * @param {Object} card - The card being evaluated
 * @param {Object} target - The target of the card
 * @param {Object} context - Evaluation context
 * @returns {Object} - { bonusScore: number, logic: string[] }
 */
export function evaluateConditionalEffects(card, target, context) {
  if (!card.conditionalEffects?.length) {
    return { bonusScore: 0, logic: [] };
  }

  const logic = [];
  let bonusScore = 0;

  for (const conditional of card.conditionalEffects) {
    let conditionMet = false;

    if (conditional.timing === 'PRE') {
      // PRE conditionals are evaluated based on target state
      conditionMet = evaluateCondition(conditional.condition, target, context);
    } else if (conditional.timing === 'POST') {
      // POST conditionals can be predicted based on base effect outcome
      conditionMet = evaluatePostCondition(conditional.condition, card.effect, target, context);
    }

    if (conditionMet) {
      const effectResult = scoreGrantedEffect(conditional.grantedEffect, target, context);
      bonusScore += effectResult.score;
      logic.push(...effectResult.logic);
    }
  }

  return { bonusScore, logic };
}

/**
 * Evaluate a condition against a target
 *
 * @param {Object} condition - The condition to check
 * @param {Object} target - The target to check against
 * @param {Object} context - Evaluation context
 * @returns {boolean} - Whether the condition is met
 */
function evaluateCondition(condition, target, context) {
  if (!condition || !target) return false;

  const { type } = condition;

  switch (type) {
    case 'TARGET_STAT_LT':
      // stat < value (e.g., hull < 2 for Executioner)
      return getTargetStat(target, condition.stat, context) < condition.value;

    case 'TARGET_STAT_LTE':
      // stat <= value (e.g., hull <= 2 for Finishing Blow)
      return getTargetStat(target, condition.stat, context) <= condition.value;

    case 'TARGET_STAT_GT':
      // stat > value
      return getTargetStat(target, condition.stat, context) > condition.value;

    case 'TARGET_STAT_GTE':
      // stat >= value (e.g., speed >= 5 for Swift Maneuver)
      return getTargetStat(target, condition.stat, context) >= condition.value;

    case 'TARGET_IS_MARKED':
      // Target has marked status (Opportunist Strike)
      return target.isMarked === true;

    case 'TARGET_IS_EXHAUSTED':
      return target.isExhausted === true;

    case 'TARGET_IS_READY':
      return target.isExhausted === false;

    case 'OPPONENT_HAS_MORE_IN_LANE':
      // Check if opponent has more drones in lane (Tactical Shift)
      return evaluateOpponentHasMore(target, context);

    default:
      // Unknown condition type - don't trigger
      console.warn(`[AI] Unknown condition type: ${type}`);
      return false;
  }
}

/**
 * Get a stat value from target, using effective stats if available
 */
function getTargetStat(target, stat, context) {
  // Try to use gameDataService for effective stats if available
  if (context?.gameDataService?.getEffectiveStats && context?.getLaneOfDrone) {
    const lane = context.getLaneOfDrone(target.id, context.player1) ||
                 context.getLaneOfDrone(target.id, context.player2);
    if (lane) {
      const effectiveStats = context.gameDataService.getEffectiveStats(target, lane);
      if (effectiveStats && effectiveStats[stat] !== undefined) {
        return effectiveStats[stat];
      }
    }
  }

  // Fall back to direct stat access
  return target[stat] || 0;
}

/**
 * Check if opponent has more drones in the target's lane
 */
function evaluateOpponentHasMore(target, context) {
  if (!context?.player1 || !context?.player2 || !context?.getLaneOfDrone) {
    return false;
  }

  const lane = context.getLaneOfDrone(target.id, context.player2);
  if (!lane) return false;

  const friendlyCount = (context.player2.dronesOnBoard[lane] || []).length;
  const enemyCount = (context.player1.dronesOnBoard[lane] || []).length;

  return enemyCount > friendlyCount;
}

/**
 * Evaluate a POST timing condition by predicting the outcome of the base effect
 *
 * @param {Object} condition - The POST condition to check
 * @param {Object} baseEffect - The card's primary effect
 * @param {Object} target - The target
 * @param {Object} context - Evaluation context
 * @returns {boolean} - Whether the POST condition will trigger
 */
function evaluatePostCondition(condition, baseEffect, target, context) {
  if (!condition || !baseEffect) return false;

  switch (condition.type) {
    case 'ON_DESTROY':
      // Check if base damage will kill the target
      if (baseEffect.type === 'DAMAGE') {
        const damage = baseEffect.value || 0;
        const effectiveHull = target?.hull || 0;
        const shields = target?.currentShields || 0;
        // Damage kills if it exceeds shields + hull
        return damage >= shields + effectiveHull;
      }
      return false;

    case 'ON_HULL_DAMAGE':
      // Hull damage is dealt when damage exceeds target shields
      if (baseEffect.type !== 'DAMAGE' || (baseEffect.value || 0) <= 0) {
        return false;
      }
      // Predict if hull damage will be dealt
      const damage = baseEffect.value || 0;
      const targetShields = target?.currentShields || 0;
      return damage > targetShields;

    default:
      return false;
  }
}

/**
 * Score a granted effect
 *
 * @param {Object} effect - The granted effect to score
 * @param {Object} target - The target
 * @param {Object} context - Evaluation context
 * @returns {Object} - { score: number, logic: string[] }
 */
function scoreGrantedEffect(effect, target, context) {
  if (!effect) return { score: 0, logic: [] };

  const { type } = effect;

  switch (type) {
    case 'DESTROY':
      return scoreDestroyEffect(target);

    case 'BONUS_DAMAGE':
      return scoreBonusDamage(effect.value);

    case 'GO_AGAIN':
      return scoreGoAgain();

    case 'DRAW':
      return scoreDraw(effect.value || 1);

    case 'GAIN_ENERGY':
      return scoreGainEnergy(effect.value || 1);

    case 'MODIFY_STAT':
      return scoreModifyStat(effect);

    default:
      console.warn(`[AI] Unknown granted effect type: ${type}`);
      return { score: 0, logic: [] };
  }
}

/**
 * Score a DESTROY effect (used by Executioner)
 */
function scoreDestroyEffect(target) {
  const resourceValue = (target.hull || 0) + (target.currentShields || 0);
  const targetValue = resourceValue * SCORING_WEIGHTS.RESOURCE_VALUE_MULTIPLIER;

  // Add lethal bonus since DESTROY always kills
  const lethalBonus = (target.class || 1) * CARD_EVALUATION.LETHAL_CLASS_MULTIPLIER +
                      CARD_EVALUATION.LETHAL_BASE_BONUS;

  const score = targetValue + lethalBonus;

  return {
    score,
    logic: [`✅ Conditional DESTROY: +${score} (${resourceValue} resources + lethal bonus)`]
  };
}

/**
 * Score BONUS_DAMAGE effect
 */
function scoreBonusDamage(value) {
  const score = value * CARD_EVALUATION.DAMAGE_MULTIPLIER;
  return {
    score,
    logic: [`✅ Bonus Damage: +${score} (+${value} damage × 8)`]
  };
}

/**
 * Score GO_AGAIN effect
 */
function scoreGoAgain() {
  return {
    score: CARD_EVALUATION.GO_AGAIN_BONUS,
    logic: [`✅ Conditional Go Again: +${CARD_EVALUATION.GO_AGAIN_BONUS}`]
  };
}

/**
 * Score DRAW effect
 */
function scoreDraw(count) {
  const score = count * CARD_EVALUATION.DRAW_BASE_VALUE;
  return {
    score,
    logic: [`✅ Conditional Draw: +${score} (${count} cards)`]
  };
}

/**
 * Score GAIN_ENERGY effect
 */
function scoreGainEnergy(value) {
  // Energy gain is valuable but less so than direct damage
  const score = value * 5;
  return {
    score,
    logic: [`✅ Conditional Energy: +${score} (+${value} energy)`]
  };
}

/**
 * Score MODIFY_STAT effect
 */
function scoreModifyStat(effect) {
  const { mod } = effect;
  if (!mod) return { score: 0, logic: [] };

  let score = 0;
  if (mod.stat === 'attack' && mod.value > 0) {
    score = mod.value * CARD_EVALUATION.ATTACK_BUFF_MULTIPLIER;
  } else if (mod.stat === 'speed' && mod.value > 0) {
    score = mod.value * CARD_EVALUATION.GENERIC_STAT_BONUS;
  } else {
    score = Math.abs(mod.value) * CARD_EVALUATION.GENERIC_STAT_BONUS;
  }

  return {
    score,
    logic: [`✅ Conditional Stat Mod: +${score} (${mod.stat} ${mod.value > 0 ? '+' : ''}${mod.value})`]
  };
}
