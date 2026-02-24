/**
 * deckBuilderHelpers.js
 * Pure utility functions for deck builder data processing
 *
 * Extracted from useDeckBuilderData.js — keyword extraction, targeting text,
 * sorting, and distribution helpers with no React dependencies.
 */

// ========================================
// KEYWORD PROCESSING
// ========================================

/**
 * Format a keyword type string into title case
 * @param {string} type - Raw keyword type (e.g., 'REPEATING_EFFECT')
 * @returns {string} Formatted keyword (e.g., 'Repeating Effect')
 */
export const formatKeyword = (type) => {
  if (!type) return '';
  const formatted = type.replace(/_/g, ' ').toLowerCase();
  return formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

/**
 * Extract keywords from a card effect for filtering/display
 * @param {Object} effect - Card effect object
 * @returns {string[]} Array of keyword strings
 */
export const extractCardKeywords = (effect) => {
  const keywords = [];

  if (effect.type === 'REPEATING_EFFECT') {
    keywords.push(formatKeyword(effect.type));
    if (effect.effects && Array.isArray(effect.effects)) {
      effect.effects.forEach(subEffect => {
        if (subEffect.type) keywords.push(formatKeyword(subEffect.type));
      });
    }
  } else if (effect.type === 'MODIFY_DRONE_BASE' && effect.mod) {
    const stat = effect.mod.stat;
    const value = effect.mod.value;

    if (stat === 'attack') {
      keywords.push(value > 0 ? 'Attack Buff' : 'Attack Debuff');
    } else if (stat === 'speed') {
      keywords.push(value > 0 ? 'Speed Buff' : 'Speed Debuff');
    } else if (stat === 'shields') {
      keywords.push(value > 0 ? 'Shield Buff' : 'Shield Debuff');
    } else if (stat === 'cost') {
      keywords.push(value < 0 ? 'Cost Reduction' : 'Cost Increase');
    } else if (stat === 'limit') {
      keywords.push(value > 0 ? 'Limit Buff' : 'Limit Debuff');
    } else if (stat === 'ability') {
      keywords.push('Ability Grant');
      if (effect.mod.abilityToAdd && effect.mod.abilityToAdd.name) {
        keywords.push(effect.mod.abilityToAdd.name);
      }
    } else {
      keywords.push(formatKeyword(`${stat} Modification`));
    }
  } else if (effect.type === 'MODIFY_STAT' && effect.mod) {
    const stat = effect.mod.stat;
    const value = effect.mod.value;

    if (stat === 'attack') {
      keywords.push(value > 0 ? 'Attack Buff' : 'Attack Debuff');
    } else if (stat === 'speed') {
      keywords.push(value > 0 ? 'Speed Buff' : 'Speed Debuff');
    } else if (stat === 'shields') {
      keywords.push(value > 0 ? 'Shield Buff' : 'Shield Debuff');
    } else {
      keywords.push(value > 0 ? `${stat} Buff` : `${stat} Debuff`);
    }
  } else if (effect.type === 'SEARCH_AND_DRAW') {
    keywords.push(formatKeyword(effect.type));
    keywords.push('Draw');
  } else if (effect.type) {
    keywords.push(formatKeyword(effect.type));
  }

  if (effect.goAgain) keywords.push('Go Again');
  if (effect.damageType === 'PIERCING') keywords.push('Piercing');
  if (effect.mod?.type) keywords.push(formatKeyword(effect.mod.type));

  return keywords;
};

/**
 * Extract targeting text description from a card and its effect
 * @param {Object} card - Card object with optional targeting property
 * @param {Object} effect - Card effect object
 * @returns {string} Human-readable targeting description
 */
export const extractTargetingText = (card, effect) => {
  if (card.targeting) {
    const t = formatKeyword(card.targeting.type);
    if (card.targeting.affinity) {
      const a = card.targeting.affinity.charAt(0) + card.targeting.affinity.slice(1).toLowerCase();
      return `${t} (${a})`;
    }
    return t;
  } else if (effect.type === 'MULTI_MOVE' && effect.source) {
    const sourceLocation = effect.source.location || 'Any';
    const sourceAffinity = effect.source.affinity || 'Any';
    const formattedAffinity = sourceAffinity.charAt(0).toUpperCase() + sourceAffinity.slice(1).toLowerCase();
    return `${formatKeyword(sourceLocation)} (${formattedAffinity})`;
  } else if (effect.type === 'SINGLE_MOVE') {
    return 'Drone (Friendly)';
  }
  return 'N/A';
};

// ========================================
// GENERIC SORT
// ========================================

/**
 * Sort items by a configurable key with secondary sort fallback
 * @param {Array} items - Items to sort
 * @param {Object} sortConfig - { key: string|null, direction: 'ascending'|'descending' }
 * @param {string} secondaryKey - Fallback sort key for tie-breaking
 * @returns {Array} Sorted copy of items
 */
export const sortItems = (items, sortConfig, secondaryKey) => {
  if (sortConfig.key === null) return items;

  const sorted = [...items];
  sorted.sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();

    if (aStr < bStr) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aStr > bStr) return sortConfig.direction === 'ascending' ? 1 : -1;
    return a[secondaryKey].localeCompare(b[secondaryKey]);
  });
  return sorted;
};

// ========================================
// DISTRIBUTION HELPERS
// ========================================

/**
 * Build a stat distribution from items for chart display
 * @param {Array} items - Items with a numeric stat and quantity
 * @param {string} statName - Property name to aggregate
 * @returns {Array<{name: string, count: number}>} Distribution entries sorted by stat value
 */
export const buildDistribution = (items, statName) => {
  const distribution = {};
  items.forEach(item => {
    const value = item[statName] || 0;
    distribution[value] = (distribution[value] || 0) + item.quantity;
  });
  return Object.entries(distribution)
    .map(([value, count]) => ({ name: `${value}`, count }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));
};

/**
 * Build a keyword frequency distribution from items for chart display
 * @param {Array} items - Items with keywords array and quantity
 * @returns {Array<{name: string, value: number}>} Keyword entries sorted by frequency (descending)
 */
export const buildKeywordDistribution = (items) => {
  const distribution = {};
  items.forEach(item => {
    if (item.keywords) {
      item.keywords.forEach(keyword => {
        distribution[keyword] = (distribution[keyword] || 0) + item.quantity;
      });
    }
  });
  return Object.entries(distribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};
