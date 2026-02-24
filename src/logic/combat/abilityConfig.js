/**
 * abilityConfig.js
 * Ship ability routing configuration
 *
 * Maps ability names to their handler type and abilityType identifier,
 * replacing hardcoded string comparisons in useClickHandlers.js.
 *
 * Handler types:
 * - 'reallocation': Special multi-step shield reallocation flow
 * - 'confirmation': Non-targeted ability, shows confirmation modal
 * - 'targeting': Targeted ability, enters targeting mode
 */

/**
 * @typedef {Object} AbilityHandlerConfig
 * @property {('reallocation'|'confirmation'|'targeting')} handler - Handler type
 * @property {string} abilityType - Identifier passed to ability mode/confirmation state
 */

/** @type {Record<string, AbilityHandlerConfig>} */
export const ABILITY_CONFIG = {
  'Reallocate Shields': { handler: 'reallocation', abilityType: 'reallocateShields' },
  'Recalculate':        { handler: 'confirmation', abilityType: 'recalculate' },
  'Recall':             { handler: 'targeting',     abilityType: 'recall' },
  'Target Lock':        { handler: 'targeting',     abilityType: 'targetLock' },
};

/**
 * Look up the handler config for a given ability
 * @param {Object} ability - Ability object with name property
 * @returns {AbilityHandlerConfig|null} Config if found, null for fallback handling
 */
export const getAbilityHandlerConfig = (ability) => {
  return ABILITY_CONFIG[ability.name] || null;
};
