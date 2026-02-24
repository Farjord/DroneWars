/**
 * AI Cores Helpers
 *
 * Logic functions for AI Cores economy calculations.
 * Extracted from aiCoresData.js to separate data from logic.
 */

import { AI_CORES } from '../../data/aiCoresData.js';

/**
 * Calculate AI Cores drop amount for a given tier and difficulty
 * @param {number} tier - The tier of the defeated enemy (1, 2, or 3)
 * @param {string} difficulty - AI difficulty ('Easy', 'Normal', 'Medium', 'Hard') - optional
 * @param {Object} rng - Optional RNG with random() method (defaults to Math.random)
 * @returns {number} - Number of AI Cores to award (0 if drop fails)
 */
export function calculateAICoresDrop(tier, difficulty = null, rng = null) {
  // Use provided RNG or fall back to Math.random
  const random = rng ? () => rng.random() : Math.random;

  // If difficulty provided, check drop chance first
  if (difficulty) {
    const dropChance = AI_CORES.DROP_CHANCE_BY_DIFFICULTY[difficulty] || 50;
    // Random 0-99 must be less than drop chance to succeed
    if (random() * 100 >= dropChance) {
      return 0;  // Drop failed
    }
  }

  // Drop succeeded - calculate tier-based quantity
  const dropConfig = AI_CORES.DROPS_BY_TIER[tier] || AI_CORES.DROPS_BY_TIER[1];
  const { min, max } = dropConfig;

  if (min === max) {
    return min;
  }

  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Get the AI Cores cost for crafting a blueprint of a given rarity
 * @param {string} rarity - The rarity of the blueprint (common, uncommon, rare, mythic)
 * @returns {number} - Number of AI Cores required to craft
 */
export function getAICoresCost(rarity) {
  const normalizedRarity = rarity?.toLowerCase() || 'common';
  return AI_CORES.BLUEPRINT_COSTS[normalizedRarity] || AI_CORES.BLUEPRINT_COSTS.common;
}
