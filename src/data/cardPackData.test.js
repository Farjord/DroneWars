/**
 * Card Pack Data Tests
 * Tests for shop pack constants and generation helpers
 */

import { describe, it, expect } from 'vitest';
import {
  SHOP_PACK_COSTS,
  SHOP_ELIGIBLE_PACK_TYPES,
  getPackCostForTier,
  generateRandomShopPack,
  createSeededRNG
} from './cardPackData.js';

describe('Shop Pack Constants', () => {
  it('defines correct tier costs', () => {
    expect(SHOP_PACK_COSTS.tier1).toBe(500);
    expect(SHOP_PACK_COSTS.tier2).toBe(1000);
    expect(SHOP_PACK_COSTS.tier3).toBe(2000);
  });

  it('excludes CREDITS_PACK from eligible types', () => {
    expect(SHOP_ELIGIBLE_PACK_TYPES).not.toContain('CREDITS_PACK');
    expect(SHOP_ELIGIBLE_PACK_TYPES).toContain('ORDNANCE_PACK');
    expect(SHOP_ELIGIBLE_PACK_TYPES).toContain('SUPPORT_PACK');
    expect(SHOP_ELIGIBLE_PACK_TYPES).toContain('TACTICAL_PACK');
    expect(SHOP_ELIGIBLE_PACK_TYPES).toContain('UPGRADE_PACK');
    expect(SHOP_ELIGIBLE_PACK_TYPES.length).toBe(4);
  });
});

describe('getPackCostForTier', () => {
  it('returns correct cost for each tier', () => {
    expect(getPackCostForTier(1)).toBe(500);
    expect(getPackCostForTier(2)).toBe(1000);
    expect(getPackCostForTier(3)).toBe(2000);
  });

  it('defaults to tier1 cost for invalid tier', () => {
    expect(getPackCostForTier(0)).toBe(500);
    expect(getPackCostForTier(4)).toBe(500);
    expect(getPackCostForTier(undefined)).toBe(500);
  });
});

describe('createSeededRNG', () => {
  it('produces deterministic results with same seed', () => {
    const rng1 = createSeededRNG(12345);
    const rng2 = createSeededRNG(12345);

    expect(rng1.random()).toBe(rng2.random());
    expect(rng1.random()).toBe(rng2.random());
    expect(rng1.random()).toBe(rng2.random());
  });

  it('produces different results with different seeds', () => {
    const rng1 = createSeededRNG(12345);
    const rng2 = createSeededRNG(54321);

    expect(rng1.random()).not.toBe(rng2.random());
  });

  it('returns values between 0 and 1', () => {
    const rng = createSeededRNG(99999);
    for (let i = 0; i < 100; i++) {
      const value = rng.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('generateRandomShopPack', () => {
  it('returns deterministic result with same seed', () => {
    const result1 = generateRandomShopPack(2, 12345);
    const result2 = generateRandomShopPack(2, 12345);

    expect(result1.packType).toBe(result2.packType);
    expect(result1.tier).toBe(result2.tier);
    expect(result1.seed).toBe(result2.seed);
  });

  it('only allows tier 1 when highestTierCompleted is 0', () => {
    // Test multiple seeds to verify tier is always 1
    for (let seed = 1; seed <= 100; seed++) {
      const result = generateRandomShopPack(0, seed);
      expect(result.tier).toBe(1);
    }
  });

  it('only allows tier 1 when highestTierCompleted is 1', () => {
    // highestTierCompleted 1 means player completed tier 1, so only T1 packs available
    for (let seed = 1; seed <= 100; seed++) {
      const result = generateRandomShopPack(1, seed);
      expect(result.tier).toBe(1);
    }
  });

  it('allows tier 1 or 2 when highestTierCompleted is 2', () => {
    const tiers = new Set();
    for (let seed = 1; seed <= 100; seed++) {
      const result = generateRandomShopPack(2, seed);
      tiers.add(result.tier);
      expect(result.tier).toBeGreaterThanOrEqual(1);
      expect(result.tier).toBeLessThanOrEqual(2);
    }
    // Should have both tiers represented across 100 seeds
    expect(tiers.size).toBe(2);
  });

  it('allows tier 1, 2, or 3 when highestTierCompleted is 3', () => {
    const tiers = new Set();
    for (let seed = 1; seed <= 200; seed++) {
      const result = generateRandomShopPack(3, seed);
      tiers.add(result.tier);
      expect(result.tier).toBeGreaterThanOrEqual(1);
      expect(result.tier).toBeLessThanOrEqual(3);
    }
    // Should have all three tiers represented
    expect(tiers.size).toBe(3);
  });

  it('caps tier at 3 even with higher highestTierCompleted', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const result = generateRandomShopPack(5, seed);
      expect(result.tier).toBeLessThanOrEqual(3);
    }
  });

  it('only returns eligible pack types (not CREDITS_PACK)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const result = generateRandomShopPack(3, seed);
      expect(SHOP_ELIGIBLE_PACK_TYPES).toContain(result.packType);
      expect(result.packType).not.toBe('CREDITS_PACK');
    }
  });

  it('includes the seed in the result', () => {
    const result = generateRandomShopPack(1, 99999);
    expect(result.seed).toBe(99999);
  });

  it('returns all pack types across many seeds', () => {
    const packTypes = new Set();
    for (let seed = 1; seed <= 200; seed++) {
      const result = generateRandomShopPack(3, seed);
      packTypes.add(result.packType);
    }
    // Should have all 4 eligible pack types represented
    expect(packTypes.size).toBe(4);
    expect(packTypes.has('ORDNANCE_PACK')).toBe(true);
    expect(packTypes.has('SUPPORT_PACK')).toBe(true);
    expect(packTypes.has('TACTICAL_PACK')).toBe(true);
    expect(packTypes.has('UPGRADE_PACK')).toBe(true);
  });

  it('handles undefined highestTierCompleted gracefully', () => {
    const result = generateRandomShopPack(undefined, 12345);
    expect(result.tier).toBe(1);
    expect(SHOP_ELIGIBLE_PACK_TYPES).toContain(result.packType);
  });

  it('handles null highestTierCompleted gracefully', () => {
    const result = generateRandomShopPack(null, 12345);
    expect(result.tier).toBe(1);
    expect(SHOP_ELIGIBLE_PACK_TYPES).toContain(result.packType);
  });
});
