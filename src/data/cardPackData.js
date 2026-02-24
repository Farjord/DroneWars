/**
 * Card Pack Data
 * Defines loot pack types and their generation rules
 * Used by LootGenerator to create rewards
 */

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
    description: 'Financial data extraction - high value salvage',
    guaranteedTypes: [],
    additionalCardWeights: {},
    rarityWeights: {
      tier1: {},
      tier2: {},
      tier3: {}
    },
    cardCount: { min: 0, max: 0 },
    // Higher credit range than normal POIs (normal is 50-100)
    creditsRange: { min: 100, max: 300 },
    // Apply zone multiplier for risk/reward scaling
    useZoneMultiplier: true,
    color: '#44ff88',
  },

  // =====================================================
  // SPECIAL REWARD TYPES (non-card packs)
  // =====================================================

  TOKEN_REWARD: {
    name: 'Contraband Cache',
    description: 'Security token and salvage',
    // Guaranteed token (always included)
    guaranteedToken: {
      tokenType: 'security',
      amount: 1,
      source: 'contraband_cache'
    },
    // 25% chance for a random card
    cardChance: 0.25,
    cardRarityWeights: { Common: 70, Uncommon: 25, Rare: 5 },
    // No guaranteed card types (random from pool if card rolls)
    guaranteedTypes: [],
    additionalCardWeights: {},
    // Card count is 0-1 based on cardChance roll
    cardCount: { min: 0, max: 1 },
    // Salvage fills remaining slots (normal range)
    salvageRange: { min: 50, max: 100 },
    color: '#ffaa00',
  },

  // =====================================================
  // BOSS REWARDS
  // =====================================================

  BOSS_REWARD: {
    name: 'Boss Reward',
    description: 'Rewards from defeating a boss AI',
    // Boss rewards are config-driven from aiData.js
    // This entry provides fallback defaults when config is missing
    firstTimeDefaults: {
      credits: 500,
      aiCores: 5,
      reputation: 1000
    },
    repeatDefaults: {
      credits: 250,
      aiCores: 2,
      reputation: 500
    },
    color: '#ff00ff',
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

// =====================================================
// RE-EXPORTS: Logic functions moved to src/logic/cards/cardPackHelpers.js
// Kept here for backward compatibility
// =====================================================
export { createSeededRNG, getPackCostForTier, generateRandomShopPack } from '../logic/cards/cardPackHelpers.js';
