// ========================================
// ADJUSTMENT PASSES - INDEX
// ========================================
// Re-exports all adjustment pass functions

export * from './jammerAdjustment.js';
export * from './interceptionAdjustment.js';

/**
 * Apply all adjustment passes to scored actions
 * @param {Array} possibleActions - Array of scored actions
 * @param {Object} context - Evaluation context
 * @returns {Array} - Modified possibleActions with all adjustments applied
 */
export const applyAllAdjustments = (possibleActions, context) => {
  const { applyJammerAdjustments } = require('./jammerAdjustment.js');
  const { applyInterceptionAdjustments } = require('./interceptionAdjustment.js');

  // Apply in order: Jammer first, then Interception
  let adjustedActions = applyJammerAdjustments(possibleActions, context);
  adjustedActions = applyInterceptionAdjustments(adjustedActions, context);

  return adjustedActions;
};
