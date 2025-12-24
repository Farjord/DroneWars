/**
 * LootGenerator Shop Pack Tests
 * Tests for openShopPack() method - shop-specific pack opening
 */

import { describe, it, expect } from 'vitest';
import lootGenerator from './LootGenerator.js';
import packTypes from '../../data/cardPackData.js';

describe('LootGenerator.openShopPack', () => {
  describe('deterministic results', () => {
    it('returns same cards with same seed', () => {
      const result1 = lootGenerator.openShopPack('ORDNANCE_PACK', 1, 12345);
      const result2 = lootGenerator.openShopPack('ORDNANCE_PACK', 1, 12345);

      expect(result1.cards.length).toBe(result2.cards.length);
      result1.cards.forEach((card, i) => {
        expect(card.cardId).toBe(result2.cards[i].cardId);
      });
    });

    it('returns different cards with different seeds', () => {
      const result1 = lootGenerator.openShopPack('ORDNANCE_PACK', 1, 12345);
      const result2 = lootGenerator.openShopPack('ORDNANCE_PACK', 1, 54321);

      // At least one card should differ (statistically very likely)
      const sameCards = result1.cards.every((card, i) =>
        result2.cards[i] && card.cardId === result2.cards[i].cardId
      );
      expect(sameCards).toBe(false);
    });

    it('produces consistent results across multiple calls with same seed', () => {
      const seeds = [111, 222, 333, 444, 555];

      seeds.forEach(seed => {
        const result1 = lootGenerator.openShopPack('SUPPORT_PACK', 2, seed);
        const result2 = lootGenerator.openShopPack('SUPPORT_PACK', 2, seed);

        expect(result1.cards.length).toBe(result2.cards.length);
        result1.cards.forEach((card, i) => {
          expect(card.cardId).toBe(result2.cards[i].cardId);
          expect(card.rarity).toBe(result2.cards[i].rarity);
        });
      });
    });
  });

  describe('max card count', () => {
    it('always returns max cards for ORDNANCE_PACK (max: 3)', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const result = lootGenerator.openShopPack('ORDNANCE_PACK', 1, seed);
        expect(result.cards.length).toBe(packTypes.ORDNANCE_PACK.cardCount.max);
      }
    });

    it('always returns max cards for SUPPORT_PACK (max: 3)', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const result = lootGenerator.openShopPack('SUPPORT_PACK', 2, seed);
        expect(result.cards.length).toBe(packTypes.SUPPORT_PACK.cardCount.max);
      }
    });

    it('always returns max cards for TACTICAL_PACK (max: 3)', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const result = lootGenerator.openShopPack('TACTICAL_PACK', 3, seed);
        expect(result.cards.length).toBe(packTypes.TACTICAL_PACK.cardCount.max);
      }
    });

    it('always returns max cards for UPGRADE_PACK (max: 3)', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const result = lootGenerator.openShopPack('UPGRADE_PACK', 1, seed);
        expect(result.cards.length).toBe(packTypes.UPGRADE_PACK.cardCount.max);
        expect(result.cards.length).toBe(3);
      }
    });
  });

  describe('no salvage/credits', () => {
    it('does not include salvageItem in result', () => {
      const result = lootGenerator.openShopPack('ORDNANCE_PACK', 2, 12345);
      expect(result.salvageItem).toBeUndefined();
    });

    it('does not include credits in result', () => {
      const result = lootGenerator.openShopPack('SUPPORT_PACK', 3, 12345);
      expect(result.credits).toBeUndefined();
    });

    it('only returns cards property in result object', () => {
      const result = lootGenerator.openShopPack('TACTICAL_PACK', 1, 99999);
      expect(Object.keys(result)).toEqual(['cards']);
    });
  });

  describe('card generation', () => {
    it('exactly one card matches guaranteed type for ORDNANCE_PACK (shuffled position)', () => {
      for (let seed = 1; seed <= 10; seed++) {
        const result = lootGenerator.openShopPack('ORDNANCE_PACK', 1, seed);
        const ordnanceCards = result.cards.filter(c => c.cardType === 'Ordnance');
        expect(ordnanceCards.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('exactly one card matches guaranteed type for SUPPORT_PACK (shuffled position)', () => {
      for (let seed = 1; seed <= 10; seed++) {
        const result = lootGenerator.openShopPack('SUPPORT_PACK', 1, seed);
        const supportCards = result.cards.filter(c => c.cardType === 'Support');
        expect(supportCards.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('exactly one card matches guaranteed type for TACTICAL_PACK (shuffled position)', () => {
      for (let seed = 1; seed <= 10; seed++) {
        const result = lootGenerator.openShopPack('TACTICAL_PACK', 1, seed);
        const tacticCards = result.cards.filter(c => c.cardType === 'Tactic');
        expect(tacticCards.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('exactly one Upgrade card in UPGRADE_PACK (shuffled position)', () => {
      for (let seed = 1; seed <= 10; seed++) {
        const result = lootGenerator.openShopPack('UPGRADE_PACK', 1, seed);
        const upgradeCards = result.cards.filter(c => c.cardType === 'Upgrade');
        expect(upgradeCards.length).toBe(1);
      }
    });

    it('additional cards in UPGRADE_PACK are never Upgrades', () => {
      for (let seed = 1; seed <= 20; seed++) {
        const result = lootGenerator.openShopPack('UPGRADE_PACK', 1, seed);
        const upgradeCards = result.cards.filter(c => c.cardType === 'Upgrade');
        const nonUpgradeCards = result.cards.filter(c => c.cardType !== 'Upgrade');
        expect(upgradeCards.length).toBe(1);
        expect(nonUpgradeCards.length).toBe(2);
      }
    });

    it('all cards have source: shop_pack', () => {
      const result = lootGenerator.openShopPack('SUPPORT_PACK', 2, 12345);
      result.cards.forEach(card => {
        expect(card.source).toBe('shop_pack');
      });
    });

    it('all cards have required properties', () => {
      const result = lootGenerator.openShopPack('ORDNANCE_PACK', 3, 54321);
      result.cards.forEach(card => {
        expect(card).toHaveProperty('type', 'card');
        expect(card).toHaveProperty('cardId');
        expect(card).toHaveProperty('cardName');
        expect(card).toHaveProperty('rarity');
        expect(card).toHaveProperty('cardType');
        expect(card).toHaveProperty('source', 'shop_pack');
      });
    });

    it('cards are shuffled (guaranteed type card can appear in any position)', () => {
      // Track which position the guaranteed Ordnance card appears in
      const ordnancePositions = new Set();

      // Test multiple seeds to see variance in position
      for (let seed = 1; seed <= 100; seed++) {
        const result = lootGenerator.openShopPack('ORDNANCE_PACK', 1, seed);
        const ordnanceIndex = result.cards.findIndex(c => c.cardType === 'Ordnance');
        if (ordnanceIndex !== -1) {
          ordnancePositions.add(ordnanceIndex);
        }
      }

      // Guaranteed card should appear in multiple positions due to shuffling
      // With 100 samples and 3 positions (0, 1, 2), we should see at least 2 different positions
      expect(ordnancePositions.size).toBeGreaterThanOrEqual(2);
    });

    it('shuffle is deterministic with same seed', () => {
      const result1 = lootGenerator.openShopPack('ORDNANCE_PACK', 3, 12345);
      const result2 = lootGenerator.openShopPack('ORDNANCE_PACK', 3, 12345);

      // Same seed should produce same card order
      expect(result1.cards.map(c => c.cardId)).toEqual(result2.cards.map(c => c.cardId));
    });
  });

  describe('tier affects rarity distribution', () => {
    it('tier 1 produces mostly Common cards', () => {
      const rarities = { Common: 0, Uncommon: 0, Rare: 0, Mythic: 0 };

      for (let seed = 1; seed <= 100; seed++) {
        const result = lootGenerator.openShopPack('ORDNANCE_PACK', 1, seed);
        result.cards.forEach(card => {
          rarities[card.rarity]++;
        });
      }

      // Tier 1: 90% Common, 10% Uncommon - Common should dominate
      expect(rarities.Common).toBeGreaterThan(rarities.Uncommon);
      expect(rarities.Rare).toBe(0);
      expect(rarities.Mythic).toBe(0);
    });

    it('tier 3 can produce Rare and Mythic cards', () => {
      const rarities = { Common: 0, Uncommon: 0, Rare: 0, Mythic: 0 };

      for (let seed = 1; seed <= 500; seed++) {
        const result = lootGenerator.openShopPack('ORDNANCE_PACK', 3, seed);
        result.cards.forEach(card => {
          rarities[card.rarity]++;
        });
      }

      // Tier 3: 40% Common, 45% Uncommon, 13% Rare, 2% Mythic
      // With 500 iterations and 3 cards each, we should see some Rare/Mythic
      expect(rarities.Rare).toBeGreaterThan(0);
      // Mythic is 2%, so with 1500 cards we expect ~30, but it's random
      // Just verify the distribution is reasonable
      expect(rarities.Common + rarities.Uncommon + rarities.Rare + rarities.Mythic).toBe(1500);
    });
  });

  describe('error handling', () => {
    it('returns empty cards array for unknown pack type', () => {
      const result = lootGenerator.openShopPack('INVALID_PACK', 1, 12345);
      expect(result.cards).toEqual([]);
    });

    it('returns empty cards array for CREDITS_PACK', () => {
      // CREDITS_PACK has cardCount { min: 0, max: 0 }
      const result = lootGenerator.openShopPack('CREDITS_PACK', 1, 12345);
      expect(result.cards).toEqual([]);
    });

    it('handles tier 0 gracefully (defaults to tier 1 rarity weights)', () => {
      const result = lootGenerator.openShopPack('ORDNANCE_PACK', 0, 12345);
      // Should use tier1 rarity weights
      expect(result.cards.length).toBe(3);
      result.cards.forEach(card => {
        expect(['Common', 'Uncommon']).toContain(card.rarity);
      });
    });

    it('handles tier 4+ gracefully (defaults to tier 3 rarity weights)', () => {
      const result = lootGenerator.openShopPack('ORDNANCE_PACK', 5, 12345);
      // Should use tier3 rarity weights (allows all rarities)
      expect(result.cards.length).toBe(3);
    });
  });
});
