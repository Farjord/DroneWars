/**
 * AI Cores Economy Configuration
 *
 * AI Cores are a currency that drops from defeating AI enemies in combat.
 * They are required (in addition to credits) to craft blueprints.
 * This encourages combat engagement over avoiding encounters.
 */

export const AI_CORES = {
  // Drop chances by AI difficulty (percentage)
  // Harder AIs have higher drop chance to incentivize harder fights
  DROP_CHANCE_BY_DIFFICULTY: {
    Easy: 30,     // 30% chance to drop
    Normal: 50,   // 50% chance to drop
    Medium: 70,   // 70% chance to drop
    Hard: 90      // 90% chance to drop
  },

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

// Backward-compatible re-exports (logic moved to aiCoresHelpers)
export { calculateAICoresDrop, getAICoresCost } from '../logic/economy/aiCoresHelpers.js';
