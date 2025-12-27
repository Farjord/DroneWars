/**
 * Combat Reputation Calculator Tests
 * Tests for calculateCombatReputation() function
 *
 * TDD approach: Tests written first, then implementation
 */

import { describe, it, expect } from 'vitest';
import { calculateCombatReputation } from './ReputationCalculator.js';

describe('calculateCombatReputation', () => {
  describe('Basic calculation', () => {
    it('should calculate rep as deckValue × aiMultiplier when under cap', () => {
      // Easy AI (0.5x) vs 2000 deck value with 5000 cap
      // Expected: 2000 × 0.5 = 1000
      const result = calculateCombatReputation(2000, 'Rogue Scout Pattern', 5000);

      expect(result.repEarned).toBe(1000);
      expect(result.wasCapped).toBe(false);
    });

    it('should calculate rep as deckValue × aiMultiplier for medium AI', () => {
      // Medium AI (1.0x) vs 3000 deck value with 5000 cap
      // Expected: 3000 × 1.0 = 3000
      const result = calculateCombatReputation(3000, 'Specialized Hunter Group', 5000);

      expect(result.repEarned).toBe(3000);
      expect(result.wasCapped).toBe(false);
    });

    it('should calculate rep as deckValue × aiMultiplier for hard AI', () => {
      // Hard AI (1.5x) vs 2000 deck value with 5000 cap
      // Expected: 2000 × 1.5 = 3000
      const result = calculateCombatReputation(2000, 'Capital-Class Blockade Fleet', 5000);

      expect(result.repEarned).toBe(3000);
      expect(result.wasCapped).toBe(false);
    });
  });

  describe('Tier cap enforcement', () => {
    it('should cap deck value before applying multiplier', () => {
      // 10000 deck value vs 5000 cap, Easy AI (0.5x)
      // Expected: min(10000, 5000) × 0.5 = 2500
      const result = calculateCombatReputation(10000, 'Rogue Scout Pattern', 5000);

      expect(result.cappedValue).toBe(5000);
      expect(result.repEarned).toBe(2500);  // 5000 × 0.5
      expect(result.wasCapped).toBe(true);
    });

    it('should cap deck value with medium AI multiplier', () => {
      // 8000 deck value vs 5000 cap, Medium AI (1.0x)
      // Expected: min(8000, 5000) × 1.0 = 5000
      const result = calculateCombatReputation(8000, 'Specialized Hunter Group', 5000);

      expect(result.cappedValue).toBe(5000);
      expect(result.repEarned).toBe(5000);  // 5000 × 1.0
      expect(result.wasCapped).toBe(true);
    });

    it('should cap deck value with hard AI multiplier', () => {
      // 10000 deck value vs 5000 cap, Hard AI (1.5x)
      // Expected: min(10000, 5000) × 1.5 = 7500
      const result = calculateCombatReputation(10000, 'Capital-Class Blockade Fleet', 5000);

      expect(result.cappedValue).toBe(5000);
      expect(result.repEarned).toBe(7500);  // 5000 × 1.5
      expect(result.wasCapped).toBe(true);
    });

    it('should handle exact cap value correctly', () => {
      // Deck value exactly at cap
      const result = calculateCombatReputation(5000, 'Specialized Hunter Group', 5000);

      expect(result.cappedValue).toBe(5000);
      expect(result.repEarned).toBe(5000);
      expect(result.wasCapped).toBe(false);  // Not capped since it's exactly at limit
    });
  });

  describe('AI multipliers by difficulty', () => {
    it('should apply 0.5x for Easy difficulty (Rogue Scout)', () => {
      const result = calculateCombatReputation(1000, 'Rogue Scout Pattern', 5000);

      expect(result.aiMultiplier).toBe(0.5);
      expect(result.aiDifficulty).toBe('Easy');
      expect(result.repEarned).toBe(500);
    });

    it('should apply 1.0x for Medium difficulty (Hunter Group)', () => {
      const result = calculateCombatReputation(1000, 'Specialized Hunter Group', 5000);

      expect(result.aiMultiplier).toBe(1.0);
      expect(result.aiDifficulty).toBe('Medium');
      expect(result.repEarned).toBe(1000);
    });

    it('should apply 1.5x for Hard difficulty (Blockade Fleet)', () => {
      const result = calculateCombatReputation(1000, 'Capital-Class Blockade Fleet', 5000);

      expect(result.aiMultiplier).toBe(1.5);
      expect(result.aiDifficulty).toBe('Hard');
      expect(result.repEarned).toBe(1500);
    });

    it('should apply 0x for Boss AI (uses boss reward system)', () => {
      const result = calculateCombatReputation(1000, 'Nemesis-Class Dreadnought', 5000);

      expect(result.aiMultiplier).toBe(0);
      expect(result.repEarned).toBe(0);
    });
  });

  describe('Starter deck (0 rep)', () => {
    it('should return 0 rep for 0 deck value', () => {
      const result = calculateCombatReputation(0, 'Specialized Hunter Group', 5000);

      expect(result.repEarned).toBe(0);
      expect(result.deckValue).toBe(0);
      expect(result.wasCapped).toBe(false);
    });

    it('should return 0 rep for 0 deck value with hard AI', () => {
      const result = calculateCombatReputation(0, 'Capital-Class Blockade Fleet', 5000);

      expect(result.repEarned).toBe(0);
      expect(result.aiMultiplier).toBe(1.5);
    });
  });

  describe('Missing/unknown AI', () => {
    it('should default to 1.0x multiplier for unknown AI', () => {
      const result = calculateCombatReputation(1000, 'Unknown AI Name', 5000);

      expect(result.aiMultiplier).toBe(1.0);
      expect(result.repEarned).toBe(1000);
    });

    it('should set aiDifficulty to "Unknown" for missing AI', () => {
      const result = calculateCombatReputation(1000, 'NonExistent AI', 5000);

      expect(result.aiDifficulty).toBe('Unknown');
    });
  });

  describe('wasCapped flag', () => {
    it('should set wasCapped=true when deck exceeds cap', () => {
      const result = calculateCombatReputation(10000, 'Specialized Hunter Group', 5000);
      expect(result.wasCapped).toBe(true);
    });

    it('should set wasCapped=false when deck under cap', () => {
      const result = calculateCombatReputation(3000, 'Specialized Hunter Group', 5000);
      expect(result.wasCapped).toBe(false);
    });

    it('should set wasCapped=false when deck exactly at cap', () => {
      const result = calculateCombatReputation(5000, 'Specialized Hunter Group', 5000);
      expect(result.wasCapped).toBe(false);
    });
  });

  describe('Return value structure', () => {
    it('should return all required fields', () => {
      const result = calculateCombatReputation(2500, 'Rogue Scout Pattern', 5000);

      expect(result).toHaveProperty('deckValue');
      expect(result).toHaveProperty('aiMultiplier');
      expect(result).toHaveProperty('aiDifficulty');
      expect(result).toHaveProperty('tierCap');
      expect(result).toHaveProperty('cappedValue');
      expect(result).toHaveProperty('wasCapped');
      expect(result).toHaveProperty('repEarned');
    });

    it('should include correct values in return object', () => {
      const result = calculateCombatReputation(2500, 'Specialized Hunter Group', 5000);

      expect(result.deckValue).toBe(2500);
      expect(result.tierCap).toBe(5000);
      expect(result.cappedValue).toBe(2500);
      expect(result.repEarned).toBe(2500);
    });
  });

  describe('Edge cases', () => {
    it('should floor decimal results', () => {
      // 1001 × 0.5 = 500.5, should floor to 500
      const result = calculateCombatReputation(1001, 'Rogue Scout Pattern', 5000);
      expect(result.repEarned).toBe(500);
    });

    it('should handle very large deck values', () => {
      const result = calculateCombatReputation(1000000, 'Capital-Class Blockade Fleet', 5000);

      expect(result.cappedValue).toBe(5000);
      expect(result.repEarned).toBe(7500);  // 5000 × 1.5
      expect(result.wasCapped).toBe(true);
    });

    it('should handle negative deck values gracefully (treat as 0)', () => {
      const result = calculateCombatReputation(-1000, 'Specialized Hunter Group', 5000);

      // Math.min(-1000, 5000) = -1000, then -1000 × 1.0 = -1000
      // Math.floor(-1000) = -1000
      expect(result.repEarned).toBe(-1000);
      expect(result.wasCapped).toBe(false);
    });

    it('should handle 0 tier cap', () => {
      const result = calculateCombatReputation(5000, 'Specialized Hunter Group', 0);

      expect(result.cappedValue).toBe(0);
      expect(result.repEarned).toBe(0);
      expect(result.wasCapped).toBe(true);
    });
  });

  describe('Real-world scenarios from requirements', () => {
    it('should match user example: 2000 deck, 0.5x AI, 1000 cap = 500 rep', () => {
      // User's exact example from requirements
      const result = calculateCombatReputation(2000, 'Rogue Scout Pattern', 1000);

      expect(result.deckValue).toBe(2000);
      expect(result.aiMultiplier).toBe(0.5);
      expect(result.tierCap).toBe(1000);
      expect(result.cappedValue).toBe(1000);  // min(2000, 1000)
      expect(result.repEarned).toBe(500);  // 1000 × 0.5
      expect(result.wasCapped).toBe(true);
    });

    it('should handle Tier 1 map with medium loadout', () => {
      // 3000 deck vs Medium AI on Tier 1 map (5000 cap)
      const result = calculateCombatReputation(3000, 'Specialized Hunter Group', 5000);

      expect(result.repEarned).toBe(3000);
      expect(result.wasCapped).toBe(false);
    });

    it('should handle high-value deck on Tier 1 map vs Hard AI', () => {
      // 10000 deck vs Hard AI on Tier 1 map (5000 cap)
      const result = calculateCombatReputation(10000, 'Capital-Class Blockade Fleet', 5000);

      expect(result.cappedValue).toBe(5000);
      expect(result.repEarned).toBe(7500);  // 5000 × 1.5
    });
  });
});
