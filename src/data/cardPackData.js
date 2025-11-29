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
      Upgrade: 70,
      Ordnance: 10,
      Support: 10,
      Tactic: 10
    },
    rarityWeights: {
      tier1: { Common: 90, Uncommon: 10 },
      tier2: { Common: 60, Uncommon: 35, Rare: 5 },
      tier3: { Common: 40, Uncommon: 45, Rare: 13, Mythic: 2 }
    },
    cardCount: { min: 1, max: 1 },
    creditsRange: { min: 10, max: 100 },
    color: '#aa44ff',
  },
};

export default packTypes;
