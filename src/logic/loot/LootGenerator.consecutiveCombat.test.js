/**
 * LootGenerator Consecutive Combat Tests
 * Tests for CREDITS pack type handling to fix consecutive combat issues
 *
 * BUG: EncounterController uses 'CREDITS' as fallback rewardType for ambush encounters,
 * but LootGenerator.openPack only recognizes 'CREDITS_PACK'. This causes:
 * - "Unknown pack type: CREDITS" console error
 * - Empty loot generation
 * - Second empty salvage modal appearing
 */

import { describe, it, expect, vi } from 'vitest';
import lootGenerator from './LootGenerator.js';

describe('LootGenerator - CREDITS pack type handling', () => {
  describe('openPack normalization', () => {
    it('should normalize CREDITS to CREDITS_PACK in openPack', () => {
      // This test reproduces the bug where 'CREDITS' is passed but not recognized
      // Expected: LootGenerator should treat 'CREDITS' the same as 'CREDITS_PACK'
      // CREDITS_PACK returns a salvageItem with creditValue between 50-200
      const result = lootGenerator.openPack('CREDITS', 1);

      expect(result).toBeDefined();

      // CREDITS_PACK should produce a salvageItem with positive creditValue
      // The bug returns { cards: [], credits: 0 } which has NO salvageItem
      expect(result.salvageItem).toBeDefined();
      expect(result.salvageItem).not.toBeNull();
      expect(result.salvageItem.creditValue).toBeGreaterThanOrEqual(50);
      expect(result.salvageItem.creditValue).toBeLessThanOrEqual(200);
    });

    it('should not log warning for CREDITS pack type', () => {
      // The current behavior logs "Unknown pack type: CREDITS"
      // After fix, there should be no warning at all
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      lootGenerator.openPack('CREDITS', 1);

      expect(warnSpy).not.toHaveBeenCalledWith('Unknown pack type: CREDITS');

      warnSpy.mockRestore();
    });

    it('should return consistent results for CREDITS and CREDITS_PACK with same seed', () => {
      // With the same seed, CREDITS and CREDITS_PACK should produce identical results
      const seed = 12345;
      const tier = 1;

      const creditsResult = lootGenerator.openPack('CREDITS', tier, null, null, seed);
      const creditsPackResult = lootGenerator.openPack('CREDITS_PACK', tier, null, null, seed);

      // Both should produce salvage items with the same creditValue
      expect(creditsResult.salvageItem).toBeDefined();
      expect(creditsPackResult.salvageItem).toBeDefined();
      expect(creditsResult.salvageItem.creditValue).toBe(creditsPackResult.salvageItem.creditValue);
    });
  });

  describe('generateSalvageSlots normalization', () => {
    it('should handle CREDITS pack type in generateSalvageSlots', () => {
      // generateSalvageSlots is also used with pack types
      // It should similarly normalize CREDITS to CREDITS_PACK
      const result = lootGenerator.generateSalvageSlots(3, 'CREDITS', 1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
