/**
 * salvageItemData.test.js
 * TDD tests for Salvage Item system
 *
 * Salvage items replace flat credit rewards with named collectibles.
 * When a pack rolls a credit value, an item with a matching creditRange is selected.
 * The rolled value becomes the item's creditValue.
 *
 * Requirements:
 * - Items have creditRange { min, max } defining which credit values they can represent
 * - findEligibleItems(value) returns all items where min <= value <= max
 * - selectSalvageItem(value, rng) picks a random eligible item
 * - generateSalvageItemFromValue(value, rng) creates a full loot object
 * - Coverage should span 1-600+ credits with overlapping ranges
 * - More items in low ranges (1-50), fewer in high ranges (300+)
 */

import { describe, it, expect } from 'vitest';
import {
  SALVAGE_ITEMS,
  findEligibleItems,
  selectSalvageItem,
  generateSalvageItemFromValue
} from './salvageItemData.js';

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

describe('Salvage Item Data Structure', () => {
  describe('SALVAGE_ITEMS collection', () => {
    it('should export a non-empty array of salvage items', () => {
      expect(Array.isArray(SALVAGE_ITEMS)).toBe(true);
      expect(SALVAGE_ITEMS.length).toBeGreaterThan(0);
    });

    it('each item should have required properties', () => {
      for (const item of SALVAGE_ITEMS) {
        expect(item.id).toBeDefined();
        expect(typeof item.id).toBe('string');
        expect(item.id.startsWith('SALVAGE_')).toBe(true);

        expect(item.name).toBeDefined();
        expect(typeof item.name).toBe('string');
        expect(item.name.length).toBeGreaterThan(0);

        expect(item.creditRange).toBeDefined();
        expect(typeof item.creditRange.min).toBe('number');
        expect(typeof item.creditRange.max).toBe('number');
        expect(item.creditRange.min).toBeLessThanOrEqual(item.creditRange.max);
        expect(item.creditRange.min).toBeGreaterThan(0);

        expect(item.image).toBeDefined();
        expect(typeof item.image).toBe('string');
        expect(item.image.startsWith('/Credits/')).toBe(true);

        expect(item.description).toBeDefined();
        expect(typeof item.description).toBe('string');
      }
    });

    it('should have unique IDs for all items', () => {
      const ids = SALVAGE_ITEMS.map(item => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique names for all items', () => {
      const names = SALVAGE_ITEMS.map(item => item.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Credit range coverage', () => {
    it('should cover low credit values (1-50)', () => {
      const lowValueItems = SALVAGE_ITEMS.filter(
        item => item.creditRange.min <= 25 && item.creditRange.max >= 10
      );
      expect(lowValueItems.length).toBeGreaterThanOrEqual(5);
    });

    it('should cover mid credit values (50-150)', () => {
      const midValueItems = SALVAGE_ITEMS.filter(
        item => item.creditRange.min <= 100 && item.creditRange.max >= 50
      );
      expect(midValueItems.length).toBeGreaterThanOrEqual(3);
    });

    it('should cover high credit values (150-350)', () => {
      const highValueItems = SALVAGE_ITEMS.filter(
        item => item.creditRange.min <= 250 && item.creditRange.max >= 150
      );
      expect(highValueItems.length).toBeGreaterThanOrEqual(3);
    });

    it('should cover premium credit values (300+)', () => {
      const premiumItems = SALVAGE_ITEMS.filter(
        item => item.creditRange.max >= 300
      );
      expect(premiumItems.length).toBeGreaterThanOrEqual(3);
    });

    it('should have more low-value items than high-value items', () => {
      const lowItems = SALVAGE_ITEMS.filter(item => item.creditRange.max <= 100);
      const highItems = SALVAGE_ITEMS.filter(item => item.creditRange.min >= 200);
      expect(lowItems.length).toBeGreaterThan(highItems.length);
    });

    it('should have no gaps in coverage from 1-600 credits', () => {
      // Check that every credit value from 1 to 600 has at least one eligible item
      for (let value = 1; value <= 600; value++) {
        const eligible = SALVAGE_ITEMS.filter(
          item => value >= item.creditRange.min && value <= item.creditRange.max
        );
        expect(eligible.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('findEligibleItems', () => {
  it('should return items where value is within creditRange', () => {
    const result = findEligibleItems(50);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // All returned items should contain 50 in their range
    for (const item of result) {
      expect(50).toBeGreaterThanOrEqual(item.creditRange.min);
      expect(50).toBeLessThanOrEqual(item.creditRange.max);
    }
  });

  it('should return empty array if no items match (edge case)', () => {
    // Testing with a value outside all ranges (if one exists)
    // Based on our design, all values 1-600+ should be covered
    // so we test with 0 which should return empty
    const result = findEligibleItems(0);
    expect(result).toEqual([]);
  });

  it('should return multiple items when ranges overlap', () => {
    // Many items overlap around common values
    const result = findEligibleItems(40);
    expect(result.length).toBeGreaterThan(1);
  });

  it('should include items at exact min boundary', () => {
    // Find an item and test its exact min
    const testItem = SALVAGE_ITEMS[0];
    const result = findEligibleItems(testItem.creditRange.min);
    expect(result).toContainEqual(testItem);
  });

  it('should include items at exact max boundary', () => {
    // Find an item and test its exact max
    const testItem = SALVAGE_ITEMS[0];
    const result = findEligibleItems(testItem.creditRange.max);
    expect(result).toContainEqual(testItem);
  });
});

describe('selectSalvageItem', () => {
  it('should return an item from the eligible pool', () => {
    const rng = createMockRNG([0.5]);
    const result = selectSalvageItem(50, rng);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(50).toBeGreaterThanOrEqual(result.creditRange.min);
    expect(50).toBeLessThanOrEqual(result.creditRange.max);
  });

  it('should return first eligible item when RNG is 0', () => {
    const rng = createMockRNG([0]);
    const eligible = findEligibleItems(50);
    const result = selectSalvageItem(50, rng);

    expect(result).toEqual(eligible[0]);
  });

  it('should return last eligible item when RNG approaches 1', () => {
    const rng = createMockRNG([0.999]);
    const eligible = findEligibleItems(50);
    const result = selectSalvageItem(50, rng);

    expect(result).toEqual(eligible[eligible.length - 1]);
  });

  it('should return deterministic results with same RNG', () => {
    const rng1 = createMockRNG([0.3]);
    const rng2 = createMockRNG([0.3]);

    const result1 = selectSalvageItem(75, rng1);
    const result2 = selectSalvageItem(75, rng2);

    expect(result1).toEqual(result2);
  });

  it('should find closest item when no exact match (fallback)', () => {
    // Test with a value that might not be covered (if any)
    // Our data should cover 1-600+, but test the fallback anyway
    const rng = createMockRNG([0.5]);
    const result = selectSalvageItem(9999, rng);

    // Should return something rather than null
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });
});

describe('generateSalvageItemFromValue', () => {
  it('should return a complete salvage item loot object', () => {
    const rng = createMockRNG([0.5]);
    const result = generateSalvageItemFromValue(100, rng);

    expect(result.type).toBe('salvageItem');
    expect(result.itemId).toBeDefined();
    expect(typeof result.itemId).toBe('string');
    expect(result.name).toBeDefined();
    expect(typeof result.name).toBe('string');
    expect(result.creditValue).toBe(100);
    expect(result.image).toBeDefined();
    expect(result.description).toBeDefined();
  });

  it('should preserve the exact credit value passed in', () => {
    const rng = createMockRNG([0.5]);

    const result1 = generateSalvageItemFromValue(42, rng);
    expect(result1.creditValue).toBe(42);

    const result2 = generateSalvageItemFromValue(333, createMockRNG([0.5]));
    expect(result2.creditValue).toBe(333);
  });

  it('should return different items for different values', () => {
    const lowValue = generateSalvageItemFromValue(15, createMockRNG([0.5]));
    const highValue = generateSalvageItemFromValue(500, createMockRNG([0.5]));

    // Different credit ranges should yield different items
    expect(lowValue.itemId).not.toBe(highValue.itemId);
  });

  it('should return deterministic results with same RNG', () => {
    const result1 = generateSalvageItemFromValue(100, createMockRNG([0.25]));
    const result2 = generateSalvageItemFromValue(100, createMockRNG([0.25]));

    expect(result1).toEqual(result2);
  });

  it('should handle edge case values gracefully', () => {
    const rng = createMockRNG([0.5]);

    // Very low value
    const lowResult = generateSalvageItemFromValue(1, rng);
    expect(lowResult.type).toBe('salvageItem');
    expect(lowResult.creditValue).toBe(1);

    // Very high value
    const highResult = generateSalvageItemFromValue(600, createMockRNG([0.5]));
    expect(highResult.type).toBe('salvageItem');
    expect(highResult.creditValue).toBe(600);
  });

  it('should have image path starting with /Credits/', () => {
    const rng = createMockRNG([0.5]);
    const result = generateSalvageItemFromValue(100, rng);
    expect(result.image.startsWith('/Credits/')).toBe(true);
  });
});

describe('Statistical distribution', () => {
  it('should distribute selections across eligible items over many iterations', () => {
    // For a value with multiple eligible items, verify distribution
    const iterations = 500;
    const selectedIds = new Map();

    for (let i = 0; i < iterations; i++) {
      // Use a pseudo-random approach for statistical testing
      const rng = { random: () => Math.random() };
      const result = selectSalvageItem(50, rng);
      const count = selectedIds.get(result.id) || 0;
      selectedIds.set(result.id, count + 1);
    }

    // Should have selected multiple different items
    expect(selectedIds.size).toBeGreaterThan(1);

    // Each eligible item should have been selected at least once (probabilistically)
    const eligible = findEligibleItems(50);
    // With 500 iterations and multiple items, unlikely any is never selected
    // But we just check distribution happened
    expect(selectedIds.size).toBeGreaterThanOrEqual(Math.min(eligible.length, 3));
  });
});
