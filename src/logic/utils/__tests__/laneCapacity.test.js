/**
 * Lane Capacity Utility Tests
 * TDD: Tests for MAX_DRONES_PER_LANE, isLaneFull(), getLaneCapacity()
 */

import { describe, it, expect } from 'vitest';
import { MAX_DRONES_PER_LANE, isLaneFull, getLaneCapacity } from '../gameEngineUtils.js';

describe('Lane Capacity Utilities', () => {
  describe('MAX_DRONES_PER_LANE', () => {
    it('should equal 5', () => {
      expect(MAX_DRONES_PER_LANE).toBe(5);
    });
  });

  describe('isLaneFull', () => {
    const createPlayerState = (laneDrones = {}) => ({
      dronesOnBoard: {
        lane1: laneDrones.lane1 || [],
        lane2: laneDrones.lane2 || [],
        lane3: laneDrones.lane3 || [],
      }
    });

    const makeDrones = (count, options = {}) =>
      Array.from({ length: count }, (_, i) => ({
        id: `drone_${i}`,
        name: options.isToken ? 'TestToken' : 'TestDrone',
        isToken: options.isToken || false,
      }));

    it('should return true when lane has 5 drones', () => {
      const state = createPlayerState({ lane1: makeDrones(5) });
      expect(isLaneFull(state, 'lane1')).toBe(true);
    });

    it('should return true when lane has more than 5 drones', () => {
      const state = createPlayerState({ lane1: makeDrones(6) });
      expect(isLaneFull(state, 'lane1')).toBe(true);
    });

    it('should return false when lane has fewer than 5 drones', () => {
      const state = createPlayerState({ lane1: makeDrones(4) });
      expect(isLaneFull(state, 'lane1')).toBe(false);
    });

    it('should count tokens toward the limit', () => {
      const mixed = [
        ...makeDrones(3),
        ...makeDrones(2, { isToken: true }),
      ];
      const state = createPlayerState({ lane1: mixed });
      expect(isLaneFull(state, 'lane1')).toBe(true);
    });

    it('should return false for an empty lane', () => {
      const state = createPlayerState();
      expect(isLaneFull(state, 'lane1')).toBe(false);
    });

    it('should handle missing lane gracefully', () => {
      const state = { dronesOnBoard: {} };
      expect(isLaneFull(state, 'lane1')).toBe(false);
    });
  });

  describe('getLaneCapacity', () => {
    const createPlayerState = (laneDrones = {}) => ({
      dronesOnBoard: {
        lane1: laneDrones.lane1 || [],
        lane2: laneDrones.lane2 || [],
        lane3: laneDrones.lane3 || [],
      }
    });

    const makeDrones = (count) =>
      Array.from({ length: count }, (_, i) => ({
        id: `drone_${i}`,
        name: 'TestDrone',
      }));

    it('should return correct shape { count, max, isFull }', () => {
      const state = createPlayerState({ lane1: makeDrones(3) });
      const result = getLaneCapacity(state, 'lane1');
      expect(result).toEqual({ count: 3, max: 5, isFull: false });
    });

    it('should show isFull true at capacity', () => {
      const state = createPlayerState({ lane1: makeDrones(5) });
      const result = getLaneCapacity(state, 'lane1');
      expect(result).toEqual({ count: 5, max: 5, isFull: true });
    });

    it('should handle empty lane', () => {
      const state = createPlayerState();
      const result = getLaneCapacity(state, 'lane1');
      expect(result).toEqual({ count: 0, max: 5, isFull: false });
    });

    it('should handle missing lane', () => {
      const state = { dronesOnBoard: {} };
      const result = getLaneCapacity(state, 'lane1');
      expect(result).toEqual({ count: 0, max: 5, isFull: false });
    });
  });
});
