/**
 * Card Pack Data
 * Defines loot pack types and their generation rules
 * Used by LootGenerator to create rewards
 */

import fullCardCollection from './cardData.js';

/**
 * Rarity color constants
 */
export const RARITY_COLORS = {
  Common: '#808080',     // Grey
  Uncommon: '#22c55e',   // Green
  Rare: '#3b82f6',       // Blue
  Mythic: '#a855f7'      // Purple
};

export const packTypes = {
  ORDNANCE_PACK: {
    name: 'Ordnance Pack',
    description: 'Weapons and damage-dealing fittings',

    // Guaranteed card types (minimum 1 of each)
    guaranteedTypes: ['Ordnance'],

    // Weighting for additional cards
    additionalCardWeights: {
      Ordnance: 60,    // 60% chance additional cards are Ordnance
      Support: 20,     // 20% chance Support
      Tactic: 20,      // 20% chance Tactic
      Upgrade: 0       // Never Upgrade in Ordnance packs
    },

    // Rarity weights by tier
    rarityWeights: {
      tier1: { Common: 90, Uncommon: 10 },
      tier2: { Common: 60, Uncommon: 35, Rare: 5 },
      tier3: { Common: 40, Uncommon: 45, Rare: 13, Mythic: 2 }
    },

    // Card count range
    cardCount: { min: 1, max: 3 },

    // Credit bonus range
    creditsRange: { min: 10, max: 100 },

    // Visual
    color: '#ff4444',
  },

  SUPPORT_PACK: {
    name: 'Support Pack',
    description: 'Repair, energy, and utility systems',
    guaranteedTypes: ['Support'],
    additionalCardWeights: {
      Support: 60,
      Ordnance: 15,
      Tactic: 15,
      Upgrade: 10
    },
    rarityWeights: {
      tier1: { Common: 90, Uncommon: 10 },
      tier2: { Common: 60, Uncommon: 35, Rare: 5 },
      tier3: { Common: 40, Uncommon: 45, Rare: 13, Mythic: 2 }
    },
    cardCount: { min: 1, max: 3 },
    creditsRange: { min: 10, max: 100 },
    color: '#44aaff',
  },

  TACTICAL_PACK: {
    name: 'Tactical Pack',
    description: 'Control and disruption protocols',
    guaranteedTypes: ['Tactic'],
    additionalCardWeights: {
      Tactic: 60,
      Ordnance: 15,
      Support: 15,
      Upgrade: 10
    },
    rarityWeights: {
      tier1: { Common: 90, Uncommon: 10 },
      tier2: { Common: 60, Uncommon: 35, Rare: 5 },
      tier3: { Common: 40, Uncommon: 45, Rare: 13, Mythic: 2 }
    },
    cardCount: { min: 1, max: 3 },
    creditsRange: { min: 10, max: 100 },
    color: '#ffaa44',
  },

  UPGRADE_PACK: {
    name: 'Upgrade Pack',
    description: 'Permanent system enhancements',
    guaranteedTypes: ['Upgrade'],
    additionalCardWeights: {
      Upgrade: 0,
      Ordnance: 34,
      Support: 33,
      Tactic: 33
    },
    rarityWeights: {
      tier1: { Common: 90, Uncommon: 10 },
      tier2: { Common: 60, Uncommon: 35, Rare: 5 },
      tier3: { Common: 40, Uncommon: 45, Rare: 13, Mythic: 2 }
    },
    cardCount: { min: 1, max: 3 },
    creditsRange: { min: 10, max: 100 },
    color: '#aa44ff',
  },

  CREDITS_PACK: {
    name: 'Credit Cache',
    description: 'Financial data extraction',
    guaranteedTypes: [],
    additionalCardWeights: {},
    rarityWeights: {
      tier1: {},
      tier2: {},
      tier3: {}
    },
    cardCount: { min: 0, max: 0 },
    creditsRange: { min: 50, max: 200 },
    color: '#44ff88',
  },
};

export default packTypes;

// =====================================================
// SHOP PACK CONFIGURATION
// =====================================================

/**
 * Shop pack costs by tier
 * T1 = 500, T2 = 1000, T3 = 2000 (exponential scaling)
 */
export const SHOP_PACK_COSTS = {
  tier1: 500,
  tier2: 1000,
  tier3: 2000
};

/**
 * Pack types eligible for shop purchase
 * Excludes CREDITS_PACK (purchased packs never contain credits)
 */
export const SHOP_ELIGIBLE_PACK_TYPES = [
  'ORDNANCE_PACK',
  'SUPPORT_PACK',
  'TACTICAL_PACK',
  'UPGRADE_PACK'
];

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
