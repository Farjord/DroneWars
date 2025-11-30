/**
 * AI Cores Economy Configuration
 *
 * AI Cores are a currency that drops from defeating AI enemies in combat.
 * They are required (in addition to credits) to craft blueprints.
 * This encourages combat engagement over avoiding encounters.
 */

export const AI_CORES = {
  // Drop amounts per tier (from combat victories)
  // Higher tiers reward more cores to incentivize harder fights
  DROPS_BY_TIER: {
    1: { min: 1, max: 1 },   // Tier 1: always 1
    2: { min: 1, max: 2 },   // Tier 2: 1-2
    3: { min: 2, max: 3 }    // Tier 3: 2-3
  },

  // Cost per blueprint rarity
  // Rarer blueprints require more cores to craft
  BLUEPRINT_COSTS: {
    common: 1,
    uncommon: 2,
    rare: 3,
    mythic: 5
  }
};

/**
 * Calculate AI Cores drop amount for a given tier
 * @param {number} tier - The tier of the defeated enemy (1, 2, or 3)
 * @returns {number} - Number of AI Cores to award
 */
export function calculateAICoresDrop(tier) {
  const dropConfig = AI_CORES.DROPS_BY_TIER[tier] || AI_CORES.DROPS_BY_TIER[1];
  const { min, max } = dropConfig;

  if (min === max) {
    return min;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
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
