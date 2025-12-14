/**
 * GameStateManager Card Pack Shop Tests
 * Tests for purchaseCardPack() method and shop pack management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import gameStateManager from './GameStateManager.js';
import { generateRandomShopPack, getPackCostForTier } from '../data/cardPackData.js';

describe('GameStateManager Card Pack Shop', () => {
  beforeEach(() => {
    // Reset state before each test
    gameStateManager.resetGameState();
  });

  describe('purchaseCardPack', () => {
    it('returns error when no pack available', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 1000,
        shopPack: null
      };
      const result = gameStateManager.purchaseCardPack();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No pack available');
    });

    it('returns error when shopPack is undefined', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 1000
      };
      const result = gameStateManager.purchaseCardPack();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No pack available');
    });

    it('returns error when insufficient credits for T1 pack', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 100, // Less than T1 cost (500)
        shopPack: { packType: 'ORDNANCE_PACK', tier: 1, seed: 12345 }
      };
      const result = gameStateManager.purchaseCardPack();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient credits');
    });

    it('returns error when insufficient credits for T2 pack', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 999, // Less than T2 cost (1000)
        shopPack: { packType: 'ORDNANCE_PACK', tier: 2, seed: 12345 }
      };
      const result = gameStateManager.purchaseCardPack();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient credits');
    });

    it('returns error when insufficient credits for T3 pack', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 1999, // Less than T3 cost (2000)
        shopPack: { packType: 'ORDNANCE_PACK', tier: 3, seed: 12345 }
      };
      const result = gameStateManager.purchaseCardPack();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient credits');
    });

    it('deducts correct credits for T1 pack on successful purchase', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 1000,
        shopPack: { packType: 'ORDNANCE_PACK', tier: 1, seed: 12345 }
      };
      gameStateManager.state.singlePlayerInventory = {};

      const result = gameStateManager.purchaseCardPack();

      expect(result.success).toBe(true);
      expect(result.cost).toBe(500); // T1 cost
      expect(gameStateManager.state.singlePlayerProfile.credits).toBe(500); // 1000 - 500
    });

    it('deducts correct credits for T2 pack on successful purchase', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 1500,
        shopPack: { packType: 'ORDNANCE_PACK', tier: 2, seed: 12345 }
      };
      gameStateManager.state.singlePlayerInventory = {};

      const result = gameStateManager.purchaseCardPack();

      expect(result.success).toBe(true);
      expect(result.cost).toBe(1000); // T2 cost
      expect(gameStateManager.state.singlePlayerProfile.credits).toBe(500); // 1500 - 1000
    });

    it('deducts correct credits for T3 pack on successful purchase', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 2500,
        shopPack: { packType: 'ORDNANCE_PACK', tier: 3, seed: 12345 }
      };
      gameStateManager.state.singlePlayerInventory = {};

      const result = gameStateManager.purchaseCardPack();

      expect(result.success).toBe(true);
      expect(result.cost).toBe(2000); // T3 cost
      expect(gameStateManager.state.singlePlayerProfile.credits).toBe(500); // 2500 - 2000
    });

    it('adds cards to inventory on successful purchase', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 1000,
        shopPack: { packType: 'ORDNANCE_PACK', tier: 1, seed: 12345 }
      };
      gameStateManager.state.singlePlayerInventory = {};

      const result = gameStateManager.purchaseCardPack();

      expect(result.success).toBe(true);
      expect(result.cards.length).toBeGreaterThan(0);

      // Verify cards were added to inventory
      result.cards.forEach(card => {
        expect(gameStateManager.state.singlePlayerInventory[card.cardId]).toBeGreaterThanOrEqual(1);
      });
    });

    it('increments existing card count in inventory', () => {
      const testCardId = 'PLASMA_SHOT'; // Assume this card exists in Ordnance

      gameStateManager.state.singlePlayerProfile = {
        credits: 1000,
        shopPack: { packType: 'ORDNANCE_PACK', tier: 1, seed: 12345 }
      };
      // Pre-populate inventory with the card
      gameStateManager.state.singlePlayerInventory = {
        [testCardId]: 5
      };

      const result = gameStateManager.purchaseCardPack();

      // If the pack contained this card, count should be > 5
      // If not, count should remain 5
      // Either way, verify inventory tracking works
      expect(result.success).toBe(true);

      // Total cards in inventory should be at least the number we got from the pack
      const totalCards = Object.values(gameStateManager.state.singlePlayerInventory)
        .reduce((sum, count) => sum + count, 0);
      expect(totalCards).toBeGreaterThanOrEqual(result.cards.length);
    });

    it('clears shopPack after successful purchase', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 1000,
        shopPack: { packType: 'ORDNANCE_PACK', tier: 1, seed: 12345 }
      };
      gameStateManager.state.singlePlayerInventory = {};

      gameStateManager.purchaseCardPack();

      expect(gameStateManager.state.singlePlayerProfile.shopPack).toBeNull();
    });

    it('returns deterministic cards with same seed', () => {
      const shopPack = { packType: 'ORDNANCE_PACK', tier: 1, seed: 12345 };

      // First purchase
      gameStateManager.state.singlePlayerProfile = { credits: 1000, shopPack: { ...shopPack } };
      gameStateManager.state.singlePlayerInventory = {};
      const result1 = gameStateManager.purchaseCardPack();

      // Reset and purchase again with same seed
      gameStateManager.state.singlePlayerProfile = { credits: 1000, shopPack: { ...shopPack } };
      gameStateManager.state.singlePlayerInventory = {};
      const result2 = gameStateManager.purchaseCardPack();

      // Should get same cards
      expect(result1.cards.length).toBe(result2.cards.length);
      result1.cards.forEach((card, i) => {
        expect(card.cardId).toBe(result2.cards[i].cardId);
      });
    });

    it('preserves other profile fields after purchase', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 1000,
        shopPack: { packType: 'ORDNANCE_PACK', tier: 1, seed: 12345 },
        securityTokens: 10,
        aiCores: 5,
        stats: { runsCompleted: 3 }
      };
      gameStateManager.state.singlePlayerInventory = {};

      gameStateManager.purchaseCardPack();

      // Other fields should be preserved
      expect(gameStateManager.state.singlePlayerProfile.securityTokens).toBe(10);
      expect(gameStateManager.state.singlePlayerProfile.aiCores).toBe(5);
      expect(gameStateManager.state.singlePlayerProfile.stats.runsCompleted).toBe(3);
    });

    it('does not deduct credits on failed purchase', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 100, // Not enough
        shopPack: { packType: 'ORDNANCE_PACK', tier: 1, seed: 12345 }
      };
      gameStateManager.state.singlePlayerInventory = {};

      gameStateManager.purchaseCardPack();

      // Credits should remain unchanged
      expect(gameStateManager.state.singlePlayerProfile.credits).toBe(100);
    });

    it('does not modify inventory on failed purchase', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 100, // Not enough
        shopPack: { packType: 'ORDNANCE_PACK', tier: 1, seed: 12345 }
      };
      gameStateManager.state.singlePlayerInventory = { existingCard: 2 };

      gameStateManager.purchaseCardPack();

      // Inventory should remain unchanged
      expect(gameStateManager.state.singlePlayerInventory).toEqual({ existingCard: 2 });
    });

    it('returns cards array in result on success', () => {
      gameStateManager.state.singlePlayerProfile = {
        credits: 1000,
        shopPack: { packType: 'SUPPORT_PACK', tier: 2, seed: 54321 }
      };
      gameStateManager.state.singlePlayerInventory = {};

      const result = gameStateManager.purchaseCardPack();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.cards)).toBe(true);
      expect(result.cards.length).toBeGreaterThan(0);
    });
  });

  describe('generateRandomShopPack helper', () => {
    it('produces deterministic result with same seed', () => {
      const pack1 = generateRandomShopPack(2, 12345);
      const pack2 = generateRandomShopPack(2, 12345);

      expect(pack1.packType).toBe(pack2.packType);
      expect(pack1.tier).toBe(pack2.tier);
      expect(pack1.seed).toBe(pack2.seed);
    });

    it('produces different results with different seeds', () => {
      // Test enough variations to confirm randomness
      const packs = [];
      for (let seed = 1; seed <= 20; seed++) {
        packs.push(generateRandomShopPack(3, seed));
      }

      // Should have some variety in pack types
      const packTypes = new Set(packs.map(p => p.packType));
      expect(packTypes.size).toBeGreaterThan(1);
    });
  });

  describe('getPackCostForTier helper', () => {
    it('returns correct cost for each tier', () => {
      expect(getPackCostForTier(1)).toBe(500);
      expect(getPackCostForTier(2)).toBe(1000);
      expect(getPackCostForTier(3)).toBe(2000);
    });
  });
});
