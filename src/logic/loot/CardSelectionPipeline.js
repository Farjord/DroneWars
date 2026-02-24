/**
 * CardSelectionPipeline
 * Pure functions for the shared card selection pipeline used by pool-based
 * reward methods (Shop, Salvage, POI).
 *
 * Extracted from RewardManager. These functions have NO class/state dependency —
 * they take all required data as parameters and return results.
 *
 * Pipeline stages:
 * 1. weightedRoll()  — generic weighted random selection
 * 2. rollRarity()    — determines card rarity from tier weights
 * 3. rollCardType()  — determines card type from pack config
 * 4. selectCard()    — picks a card from the pool with multi-fallback filtering
 */

import fullCardCollection from '../../data/cardData.js';
import { starterDeck } from '../../data/playerDeckData.js';

// Starter card IDs to exclude (players have infinite copies)
export const STARTER_CARD_IDS = new Set(starterDeck.decklist.map(entry => entry.id));

/**
 * Transform raw card object to collectedLoot format.
 *
 * Cards from cardData.js have {id, name, rarity, ...} properties.
 * But collectedLoot array requires {cardId, cardName, rarity, ...} format.
 * This function transforms at the boundary (single source of truth).
 *
 * @param {Object} card - Raw card from cardData.js with {id, name, rarity, ...}
 * @returns {Object} Card in collectedLoot format with {cardId, cardName, rarity, ...}
 */
export function transformCardForLoot(card) {
  const { id, name, ...rest } = card;
  return {
    cardId: id,
    cardName: name,
    ...rest
  };
}

/**
 * Generic weighted random selection.
 * @param {Object} weights - Map of key → weight (e.g., { Common: 70, Rare: 20, Mythic: 10 })
 * @param {{ random: () => number }} rng - Seeded RNG
 * @returns {string} Selected key
 */
export function weightedRoll(weights, rng) {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let roll = rng.random() * totalWeight;

  for (const [key, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return key;
  }

  return Object.keys(weights)[0];
}

/**
 * Roll rarity using weighted distribution.
 * Thin wrapper over weightedRoll for semantic clarity.
 * @param {Object} weights - Rarity weight map (e.g., { Common: 70, Uncommon: 25, Rare: 5 })
 * @param {{ random: () => number }} rng - Seeded RNG
 * @returns {string} Rolled rarity name
 */
export function rollRarity(weights, rng) {
  return weightedRoll(weights, rng);
}

/**
 * Roll card type from pack configuration.
 * First card in a pack uses guaranteedTypes; additional cards use additionalCardWeights.
 * @param {Object} config - Pack config with guaranteedTypes and additionalCardWeights
 * @param {boolean} isGuaranteed - Whether this is the first (guaranteed) card slot
 * @param {{ random: () => number }} rng - Seeded RNG
 * @returns {string} Card type (e.g., 'Ordnance', 'Support')
 */
export function rollCardType(config, isGuaranteed, rng) {
  if (isGuaranteed && config.guaranteedTypes && config.guaranteedTypes.length > 0) {
    return config.guaranteedTypes[0];
  }
  return weightedRoll(config.additionalCardWeights, rng);
}

/**
 * Select a card from the full card collection with multi-fallback filtering.
 *
 * Fallback chain:
 * 1. Exact type + exact rarity
 * 2. Same type, any allowed rarity
 * 3. Same type, any rarity
 * 4. Any type, requested rarity
 * 5. Any non-starter, non-AI-only card
 *
 * @param {string|null} cardType - Desired card type (null for any)
 * @param {string} rarity - Desired rarity
 * @param {string[]} allowedRarities - List of allowed rarities for fallback
 * @param {{ random: () => number }} rng - Seeded RNG
 * @returns {Object|null} Card in collectedLoot format, or null if pool empty
 */
export function selectCard(cardType, rarity, allowedRarities, rng) {
  const notStarter = (c) => !STARTER_CARD_IDS.has(c.id);
  const notAIOnly = (c) => !c.aiOnly;
  const isAllowedRarity = (c) => allowedRarities.includes(c.rarity || 'Common');

  // Primary: exact type + rarity
  let pool = fullCardCollection.filter(c =>
    c.type === cardType &&
    (c.rarity || 'Common') === rarity &&
    notStarter(c) &&
    notAIOnly(c)
  );

  // Fallback 1: same type, any allowed rarity
  if (pool.length === 0) {
    pool = fullCardCollection.filter(c =>
      c.type === cardType &&
      isAllowedRarity(c) &&
      notStarter(c) &&
      notAIOnly(c)
    );
  }

  // Fallback 2: same type, any rarity
  if (pool.length === 0) {
    pool = fullCardCollection.filter(c =>
      c.type === cardType &&
      notStarter(c) &&
      notAIOnly(c)
    );
  }

  // Fallback 3: any type with requested rarity (when cardType is null or no match)
  if (pool.length === 0) {
    pool = fullCardCollection.filter(c =>
      (c.rarity || 'Common') === rarity &&
      notStarter(c) &&
      notAIOnly(c)
    );
  }

  // Fallback 4: any non-starter, non-AI-only card
  if (pool.length === 0) {
    pool = fullCardCollection.filter(c => notStarter(c) && notAIOnly(c));
  }

  if (pool.length === 0) return null;

  const index = Math.floor(rng.random() * pool.length);
  return transformCardForLoot(pool[index]);
}

/**
 * Roll weighted card count within a min/max range.
 * @param {number} min - Minimum card count
 * @param {number} max - Maximum card count
 * @param {number[]|null} weights - Weight array indexed by (count - min), or null for uniform
 * @param {{ random: () => number }} rng - Seeded RNG
 * @returns {number} Rolled card count
 */
export function rollWeightedCardCount(min, max, weights, rng) {
  if (!weights) {
    return Math.floor(rng.random() * (max - min + 1)) + min;
  }

  const counts = [];
  for (let i = min; i <= max; i++) {
    counts.push(i);
  }

  const weightMap = {};
  counts.forEach((count, index) => {
    weightMap[count] = weights[index] !== undefined ? weights[index] : 1;
  });

  return parseInt(weightedRoll(weightMap, rng));
}
