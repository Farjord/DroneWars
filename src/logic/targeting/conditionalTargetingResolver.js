// ========================================
// CONDITIONAL TARGETING RESOLVER
// ========================================
// Resolves PRE_TARGETING conditionals that modify targeting restrictions
// before target selection occurs. Called before TargetingRouter.routeTargeting().

import ConditionEvaluator from '../effects/conditional/ConditionEvaluator.js';

const conditionEvaluator = new ConditionEvaluator();

/**
 * Resolve conditional targeting overrides on a card definition.
 * If a PRE_TARGETING conditional's condition is met, merges its
 * targetingOverride onto the effect's targeting config.
 *
 * @param {Object} definition - Card or ability definition
 * @param {string} actingPlayerId - Player playing the card
 * @param {Object} player1 - Player 1 state
 * @param {Object} player2 - Player 2 state
 * @returns {Object} Modified definition (deep copy) if override applied, original otherwise
 */
export function resolveConditionalTargeting(definition, actingPlayerId, player1, player2) {
  const conditionals = definition?.effects?.[0]?.conditionals;
  if (!conditionals) return definition;

  const preTargetingConditionals = conditionals.filter(c => c.timing === 'PRE_TARGETING');
  if (preTargetingConditionals.length === 0) return definition;

  const context = {
    actingPlayerId,
    playerStates: { player1, player2 }
  };

  // First matching PRE_TARGETING conditional wins
  for (const conditional of preTargetingConditionals) {
    if (!conditional.targetingOverride) continue;

    const conditionMet = conditionEvaluator.evaluate(conditional.condition, context);
    if (!conditionMet) continue;

    // Deep copy the definition and apply the targeting override
    const resolved = JSON.parse(JSON.stringify(definition));
    const targeting = resolved.effects[0].targeting;

    Object.assign(targeting, conditional.targetingOverride);

    return resolved;
  }

  return definition;
}
