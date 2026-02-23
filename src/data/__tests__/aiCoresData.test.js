/**
 * aiCoresData.test.js
 * TDD tests for AI Cores probabilistic drop system
 *
 * AI Cores should NOT be guaranteed drops. Drop chance varies by AI difficulty:
 * - Easy: 30% drop chance
 * - Normal: 50% drop chance
 * - Medium: 70% drop chance
 * - Hard: 90% drop chance
 *
 * When a drop succeeds, quantity is still tier-based:
 * - Tier 1: 1 core
 * - Tier 2: 1-2 cores
 * - Tier 3: 2-3 cores
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateAICoresDrop, AI_CORES } from '../aiCoresData.js';

/**
 * Create a mock RNG that returns a specific sequence of values
 * @param {number[]} values - Array of values (0-1) to return in sequence
 * @returns {Object} Mock RNG with random() method
 */
function createMockRNG(values) {
  let index = 0;
  return {
    random: () => {
      const value = values[index % values.length];
      index++;
      return value;
    }
  };
}

describe('AI Cores Probabilistic Drop System', () => {
  describe('DROP_CHANCE_BY_DIFFICULTY configuration', () => {
    it('should have drop chances defined for all difficulty levels', () => {
      expect(AI_CORES.DROP_CHANCE_BY_DIFFICULTY).toBeDefined();
      expect(AI_CORES.DROP_CHANCE_BY_DIFFICULTY.Easy).toBe(30);
      expect(AI_CORES.DROP_CHANCE_BY_DIFFICULTY.Normal).toBe(50);
      expect(AI_CORES.DROP_CHANCE_BY_DIFFICULTY.Medium).toBe(70);
      expect(AI_CORES.DROP_CHANCE_BY_DIFFICULTY.Hard).toBe(90);
    });
  });

  describe('calculateAICoresDrop with RNG parameter', () => {
    describe('Easy difficulty (30% drop chance)', () => {
      it('should return 0 when random roll is >= 30%', () => {
        // RNG returns 0.30 (30%) - exactly at threshold, should fail
        const rng = createMockRNG([0.30]);
        const result = calculateAICoresDrop(1, 'Easy', rng);
        expect(result).toBe(0);
      });

      it('should return cores when random roll is < 30%', () => {
        // RNG returns 0.29 (29%) - just under threshold, should succeed
        const rng = createMockRNG([0.29]);
        const result = calculateAICoresDrop(1, 'Easy', rng);
        expect(result).toBeGreaterThan(0);
      });
    });

    describe('Normal difficulty (50% drop chance)', () => {
      it('should return 0 when random roll is >= 50%', () => {
        const rng = createMockRNG([0.50]);
        const result = calculateAICoresDrop(1, 'Normal', rng);
        expect(result).toBe(0);
      });

      it('should return cores when random roll is < 50%', () => {
        const rng = createMockRNG([0.49]);
        const result = calculateAICoresDrop(1, 'Normal', rng);
        expect(result).toBeGreaterThan(0);
      });
    });

    describe('Medium difficulty (70% drop chance)', () => {
      it('should return 0 when random roll is >= 70%', () => {
        const rng = createMockRNG([0.70]);
        const result = calculateAICoresDrop(2, 'Medium', rng);
        expect(result).toBe(0);
      });

      it('should return cores when random roll is < 70%', () => {
        const rng = createMockRNG([0.69]);
        const result = calculateAICoresDrop(2, 'Medium', rng);
        expect(result).toBeGreaterThan(0);
      });
    });

    describe('Hard difficulty (90% drop chance)', () => {
      it('should return 0 when random roll is >= 90%', () => {
        const rng = createMockRNG([0.90]);
        const result = calculateAICoresDrop(3, 'Hard', rng);
        expect(result).toBe(0);
      });

      it('should return cores when random roll is < 90%', () => {
        const rng = createMockRNG([0.89]);
        const result = calculateAICoresDrop(3, 'Hard', rng);
        expect(result).toBeGreaterThan(0);
      });
    });
  });

  describe('Tier-based quantity when drop succeeds', () => {
    it('should return exactly 1 core for Tier 1', () => {
      // First random for drop chance (pass), second would be for quantity
      const rng = createMockRNG([0.01]);
      const result = calculateAICoresDrop(1, 'Hard', rng);
      expect(result).toBe(1);
    });

    it('should return 1-2 cores for Tier 2 based on RNG', () => {
      // Test minimum (roll 0.0 = 1 core)
      const rngMin = createMockRNG([0.01, 0.0]); // Pass drop, then quantity roll
      const resultMin = calculateAICoresDrop(2, 'Hard', rngMin);
      expect(resultMin).toBe(1);

      // Test maximum (roll 0.99 = 2 cores)
      const rngMax = createMockRNG([0.01, 0.99]);
      const resultMax = calculateAICoresDrop(2, 'Hard', rngMax);
      expect(resultMax).toBe(2);
    });

    it('should return 2-3 cores for Tier 3 based on RNG', () => {
      // Test minimum (roll 0.0 = 2 cores)
      const rngMin = createMockRNG([0.01, 0.0]);
      const resultMin = calculateAICoresDrop(3, 'Hard', rngMin);
      expect(resultMin).toBe(2);

      // Test maximum (roll 0.99 = 3 cores)
      const rngMax = createMockRNG([0.01, 0.99]);
      const resultMax = calculateAICoresDrop(3, 'Hard', rngMax);
      expect(resultMax).toBe(3);
    });
  });

  describe('Backward compatibility (no RNG parameter)', () => {
    it('should always return cores when difficulty is not provided (100% drop)', () => {
      // Run many times - should never return 0 when no difficulty
      for (let i = 0; i < 50; i++) {
        const result = calculateAICoresDrop(1);
        expect(result).toBeGreaterThan(0);
      }
    });

    it('should always return cores when difficulty is null (100% drop)', () => {
      for (let i = 0; i < 50; i++) {
        const result = calculateAICoresDrop(1, null);
        expect(result).toBeGreaterThan(0);
      }
    });

    it('should still respect tier-based quantities', () => {
      // Tier 1 should always be 1
      expect(calculateAICoresDrop(1)).toBe(1);

      // Tier 2 should be 1-2
      const tier2Results = [];
      for (let i = 0; i < 50; i++) {
        tier2Results.push(calculateAICoresDrop(2));
      }
      expect(tier2Results.every(r => r >= 1 && r <= 2)).toBe(true);

      // Tier 3 should be 2-3
      const tier3Results = [];
      for (let i = 0; i < 50; i++) {
        tier3Results.push(calculateAICoresDrop(3));
      }
      expect(tier3Results.every(r => r >= 2 && r <= 3)).toBe(true);
    });
  });

  describe('Unknown difficulty handling', () => {
    it('should default to 50% drop chance for unknown difficulty', () => {
      const rng = createMockRNG([0.50]);
      const result = calculateAICoresDrop(1, 'UnknownDifficulty', rng);
      expect(result).toBe(0);
    });

    it('should drop cores at 49% roll for unknown difficulty', () => {
      const rng = createMockRNG([0.49]);
      const result = calculateAICoresDrop(1, 'UnknownDifficulty', rng);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Deterministic results with seeded RNG', () => {
    it('should return same result with same RNG sequence', () => {
      const rng1 = createMockRNG([0.25, 0.5]);
      const rng2 = createMockRNG([0.25, 0.5]);

      const result1 = calculateAICoresDrop(2, 'Hard', rng1);
      const result2 = calculateAICoresDrop(2, 'Hard', rng2);

      expect(result1).toBe(result2);
    });

    it('should return different results with different RNG values', () => {
      // One that fails drop chance
      const rngFail = createMockRNG([0.95]);
      const resultFail = calculateAICoresDrop(1, 'Hard', rngFail);

      // One that succeeds drop chance
      const rngPass = createMockRNG([0.05]);
      const resultPass = calculateAICoresDrop(1, 'Hard', rngPass);

      expect(resultFail).toBe(0);
      expect(resultPass).toBe(1);
    });
  });

  describe('Statistical distribution (integration test)', () => {
    it('Easy difficulty should drop roughly 30% of the time', () => {
      const iterations = 1000;
      let drops = 0;

      for (let i = 0; i < iterations; i++) {
        if (calculateAICoresDrop(1, 'Easy') > 0) {
          drops++;
        }
      }

      const dropRate = drops / iterations;
      // Allow 10% margin of error for statistical variance
      expect(dropRate).toBeGreaterThan(0.20);
      expect(dropRate).toBeLessThan(0.40);
    });

    it('Hard difficulty should drop roughly 90% of the time', () => {
      const iterations = 1000;
      let drops = 0;

      for (let i = 0; i < iterations; i++) {
        if (calculateAICoresDrop(1, 'Hard') > 0) {
          drops++;
        }
      }

      const dropRate = drops / iterations;
      // Allow 5% margin of error for statistical variance
      expect(dropRate).toBeGreaterThan(0.85);
      expect(dropRate).toBeLessThan(0.95);
    });
  });
});
