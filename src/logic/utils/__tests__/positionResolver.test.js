import { describe, it, expect } from 'vitest';
import {
  getAdjacentIndices,
  getAdjacentFriendlyCount,
  isExposed,
  evaluatePositionCondition
} from '../positionResolver.js';

describe('positionResolver', () => {

  describe('getAdjacentIndices', () => {
    it('returns both neighbors for a middle drone', () => {
      expect(getAdjacentIndices(1, 3)).toEqual([0, 2]);
    });

    it('returns only right neighbor for first drone', () => {
      expect(getAdjacentIndices(0, 3)).toEqual([1]);
    });

    it('returns only left neighbor for last drone', () => {
      expect(getAdjacentIndices(2, 3)).toEqual([1]);
    });

    it('returns empty for a lone drone', () => {
      expect(getAdjacentIndices(0, 1)).toEqual([]);
    });

    it('returns empty for invalid index', () => {
      expect(getAdjacentIndices(-1, 3)).toEqual([]);
      expect(getAdjacentIndices(5, 3)).toEqual([]);
    });

    it('returns empty for zero-length lane', () => {
      expect(getAdjacentIndices(0, 0)).toEqual([]);
    });

    it('handles two-drone lane correctly', () => {
      expect(getAdjacentIndices(0, 2)).toEqual([1]);
      expect(getAdjacentIndices(1, 2)).toEqual([0]);
    });
  });

  describe('getAdjacentFriendlyCount', () => {
    it('returns 2 for middle drone in 3+ lane', () => {
      expect(getAdjacentFriendlyCount(1, 3)).toBe(2);
      expect(getAdjacentFriendlyCount(2, 5)).toBe(2);
    });

    it('returns 1 for edge drone in multi-drone lane', () => {
      expect(getAdjacentFriendlyCount(0, 3)).toBe(1);
      expect(getAdjacentFriendlyCount(2, 3)).toBe(1);
    });

    it('returns 0 for lone drone', () => {
      expect(getAdjacentFriendlyCount(0, 1)).toBe(0);
    });
  });

  describe('isExposed', () => {
    it('edge drones are exposed', () => {
      expect(isExposed(0, 3)).toBe(true);
      expect(isExposed(2, 3)).toBe(true);
    });

    it('middle drone with both neighbors is not exposed', () => {
      expect(isExposed(1, 3)).toBe(false);
    });

    it('lone drone is exposed', () => {
      expect(isExposed(0, 1)).toBe(true);
    });

    it('both drones in a two-drone lane are exposed', () => {
      expect(isExposed(0, 2)).toBe(true);
      expect(isExposed(1, 2)).toBe(true);
    });
  });

  describe('evaluatePositionCondition', () => {
    it('EXPOSED condition returns boolean', () => {
      expect(evaluatePositionCondition('EXPOSED', 0, 3)).toBe(true);
      expect(evaluatePositionCondition('EXPOSED', 1, 3)).toBe(false);
    });

    it('ADJACENT_FRIENDLY_COUNT condition returns count', () => {
      expect(evaluatePositionCondition('ADJACENT_FRIENDLY_COUNT', 1, 3)).toBe(2);
      expect(evaluatePositionCondition('ADJACENT_FRIENDLY_COUNT', 0, 1)).toBe(0);
    });

    it('unknown condition returns null', () => {
      expect(evaluatePositionCondition('UNKNOWN', 0, 3)).toBeNull();
    });
  });
});
