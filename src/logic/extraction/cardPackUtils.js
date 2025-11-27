// ========================================
// CARD PACK UTILITY FUNCTIONS
// ========================================
// Helper functions for card pack generation and card pool filtering

import fullCardCollection from '../../data/cardData.js';

/**
 * Get filtered card pool by type and rarity
 * @param {string[]} types - Array of card types to include
 * @param {string} [rarity] - Optional rarity filter
 * @returns {Array} Filtered array of cards
 */
export function getCardPool(types, rarity) {
  return fullCardCollection.filter(card => {
    const matchesType = types.includes(card.type);
    const matchesRarity = !rarity || card.rarity === rarity;
    return matchesType && matchesRarity;
  });
}

/**
 * Roll a random card type based on weighted probabilities
 * @param {Object} weights - Object with card type names as keys and weights as values
 * @returns {string} Selected card type
 */
export function rollCardType(weights) {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;

  for (const [type, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) {
      return type;
    }
  }

  // Fallback (should not reach here)
  return Object.keys(weights)[0];
}
