/**
 * Card Pack Helpers
 * Logic functions for card pack generation and shop pack management
 * Extracted from src/data/cardPackData.js (Phase D refactor)
 */

import { SHOP_PACK_COSTS, SHOP_ELIGIBLE_PACK_TYPES } from '../../data/cardPackData.js';

/**
 * Create a seeded random number generator
 * Uses Linear Congruential Generator for deterministic results
 * @param {number} seed - Initial seed value
 * @returns {Object} RNG with random() method returning 0-1
 */
export function createSeededRNG(seed) {
  let s = typeof seed === 'number' ? seed : Date.now();
  return {
    random: () => {
      // Linear Congruential Generator (same as LootGenerator)
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    }
  };
}

/**
 * Get pack cost for a given tier
 * @param {number} tier - Tier (1, 2, or 3)
 * @returns {number} Cost in credits
 */
export function getPackCostForTier(tier) {
  return SHOP_PACK_COSTS[`tier${tier}`] || SHOP_PACK_COSTS.tier1;
}

/**
 * Generate a random shop pack based on player progression
 * Uses seeded RNG for deterministic results
 * @param {number} highestTierCompleted - Player's highest completed tier (0-based)
 * @param {number} seed - Random seed for deterministic selection
 * @returns {Object} { packType: string, tier: number, seed: number }
 */
export function generateRandomShopPack(highestTierCompleted, seed = Date.now()) {
  // highestTierCompleted is the value from stats (0 = never completed, 1 = T1 completed, etc.)
  // Available tiers: 1 to max(1, highestTierCompleted), capped at 3
  // If player hasn't completed any tier (0), they can still buy T1 packs
  const maxTier = Math.min(Math.max(1, highestTierCompleted || 1), 3);

  // Use seeded RNG for deterministic selection
  const rng = createSeededRNG(seed);

  // Random tier from 1 to maxTier (inclusive)
  const tier = 1 + Math.floor(rng.random() * maxTier);

  // Random pack type from eligible types
  const packIndex = Math.floor(rng.random() * SHOP_ELIGIBLE_PACK_TYPES.length);
  const packType = SHOP_ELIGIBLE_PACK_TYPES[packIndex];

  return { packType, tier, seed };
}
