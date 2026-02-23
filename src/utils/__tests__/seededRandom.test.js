/**
 * seededRandom.test.js
 * Tests for SeededRandom deterministic RNG utility
 */

import { describe, it, expect } from 'vitest';
import SeededRandom from '../seededRandom.js';

describe('SeededRandom', () => {
  describe('constructor and basic random()', () => {
    it('should create instance with seed', () => {
      const rng = new SeededRandom(12345);
      expect(rng).toBeDefined();
      expect(rng.seed).toBe(12345);
    });

    it('should generate numbers between 0 and 1', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 100; i++) {
        const value = rng.random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should produce deterministic sequences with same seed', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(12345);

      const sequence1 = [];
      const sequence2 = [];

      for (let i = 0; i < 10; i++) {
        sequence1.push(rng1.random());
        sequence2.push(rng2.random());
      }

      expect(sequence1).toEqual(sequence2);
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(54321);

      const value1 = rng1.random();
      const value2 = rng2.random();

      expect(value1).not.toBe(value2);
    });
  });

  describe('randomInt(min, max)', () => {
    it('should generate integers in range [min, max)', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const value = rng.randomInt(0, 10);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should be deterministic', () => {
      const rng1 = new SeededRandom(999);
      const rng2 = new SeededRandom(999);

      expect(rng1.randomInt(0, 100)).toBe(rng2.randomInt(0, 100));
      expect(rng1.randomInt(5, 15)).toBe(rng2.randomInt(5, 15));
    });
  });

  describe('randomIntInclusive(min, max)', () => {
    it('should generate integers in range [min, max] (inclusive)', () => {
      const rng = new SeededRandom(42);
      const results = new Set();

      // Generate many values to check range
      for (let i = 0; i < 1000; i++) {
        const value = rng.randomIntInclusive(1, 3);
        results.add(value);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(3);
      }

      // Should hit all values in range
      expect(results.has(1)).toBe(true);
      expect(results.has(2)).toBe(true);
      expect(results.has(3)).toBe(true);
    });
  });

  describe('shuffle(array)', () => {
    it('should return a new array (not mutate original)', () => {
      const rng = new SeededRandom(42);
      const original = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(original);

      expect(shuffled).not.toBe(original);
      expect(original).toEqual([1, 2, 3, 4, 5]);
    });

    it('should contain same elements', () => {
      const rng = new SeededRandom(42);
      const original = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(original);

      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should be deterministic with same seed', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(12345);

      const array = ['a', 'b', 'c', 'd', 'e'];

      expect(rng1.shuffle(array)).toEqual(rng2.shuffle(array));
    });

    it('should produce different results with different seeds', () => {
      const rng1 = new SeededRandom(11111);
      const rng2 = new SeededRandom(22222);

      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      // Very unlikely to be equal with different seeds
      expect(rng1.shuffle(array)).not.toEqual(rng2.shuffle(array));
    });
  });

  describe('select(array)', () => {
    it('should return element from array', () => {
      const rng = new SeededRandom(42);
      const array = ['a', 'b', 'c'];

      const result = rng.select(array);
      expect(array).toContain(result);
    });

    it('should return undefined for empty array', () => {
      const rng = new SeededRandom(42);
      expect(rng.select([])).toBeUndefined();
    });

    it('should return undefined for null/undefined', () => {
      const rng = new SeededRandom(42);
      expect(rng.select(null)).toBeUndefined();
      expect(rng.select(undefined)).toBeUndefined();
    });

    it('should be deterministic', () => {
      const rng1 = new SeededRandom(777);
      const rng2 = new SeededRandom(777);

      const array = ['x', 'y', 'z'];
      expect(rng1.select(array)).toBe(rng2.select(array));
    });
  });

  describe('chance(percentage)', () => {
    it('should return true roughly expected percentage of time', () => {
      const rng = new SeededRandom(42);
      let successes = 0;
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        if (rng.chance(30)) successes++;
      }

      const successRate = successes / iterations;
      // Allow 5% margin
      expect(successRate).toBeGreaterThan(0.25);
      expect(successRate).toBeLessThan(0.35);
    });

    it('should always return false for 0%', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 100; i++) {
        expect(rng.chance(0)).toBe(false);
      }
    });

    it('should always return true for 100%', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 100; i++) {
        expect(rng.chance(100)).toBe(true);
      }
    });

    it('should be deterministic', () => {
      const rng1 = new SeededRandom(555);
      const rng2 = new SeededRandom(555);

      for (let i = 0; i < 10; i++) {
        expect(rng1.chance(50)).toBe(rng2.chance(50));
      }
    });
  });

  describe('fromGameState()', () => {
    it('should create RNG from game state', () => {
      const gameState = {
        roundNumber: 3,
        player1: { energy: 5, deck: [1, 2, 3], hand: [4, 5], discardPile: [] },
        player2: { energy: 4, deck: [6, 7], hand: [8], discardPile: [9] }
      };

      const rng = SeededRandom.fromGameState(gameState);
      expect(rng).toBeInstanceOf(SeededRandom);
    });

    it('should produce same seed for same game state', () => {
      const gameState = {
        roundNumber: 5,
        player1: { energy: 3, deck: [1, 2], hand: [3], discardPile: [4] },
        player2: { energy: 2, deck: [5], hand: [6, 7], discardPile: [] }
      };

      const rng1 = SeededRandom.fromGameState(gameState);
      const rng2 = SeededRandom.fromGameState(gameState);

      // Same state should produce same seed
      expect(rng1.random()).toBe(rng2.random());
    });

    it('should handle empty/missing properties gracefully', () => {
      const gameState = {};
      const rng = SeededRandom.fromGameState(gameState);
      expect(rng).toBeInstanceOf(SeededRandom);
      expect(() => rng.random()).not.toThrow();
    });
  });

  describe('forCardShuffle()', () => {
    it('should create RNG for card shuffling', () => {
      const gameState = {
        gameSeed: 12345,
        roundNumber: 2,
        player1: { deck: [1, 2, 3] },
        player2: { deck: [4, 5] }
      };

      const rng = SeededRandom.forCardShuffle(gameState, 'player1');
      expect(rng).toBeInstanceOf(SeededRandom);
    });

    it('should produce different seeds for different players', () => {
      const gameState = {
        gameSeed: 12345,
        roundNumber: 1,
        player1: { deck: [1, 2, 3] },
        player2: { deck: [1, 2, 3] }
      };

      const rng1 = SeededRandom.forCardShuffle(gameState, 'player1');
      const rng2 = SeededRandom.forCardShuffle(gameState, 'player2');

      expect(rng1.random()).not.toBe(rng2.random());
    });

    it('should use fallback seed when gameSeed missing', () => {
      const gameState = {
        roundNumber: 1,
        player1: { deck: [] }
      };

      const rng = SeededRandom.forCardShuffle(gameState, 'player1');
      expect(rng).toBeInstanceOf(SeededRandom);
      expect(() => rng.random()).not.toThrow();
    });
  });
});
