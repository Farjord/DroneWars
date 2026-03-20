import { describe, it, expect } from 'vitest';
import { getAccessibleFactions, getRegionFaction, isRegionBoundary } from '../factionHelpers';

describe('getAccessibleFactions', () => {
  it('returns faction + NEUTRAL_1 for a faction map', () => {
    expect(getAccessibleFactions('MARK')).toEqual(['MARK', 'NEUTRAL_1']);
  });

  it('returns faction + NEUTRAL_1 for MOVEMENT', () => {
    expect(getAccessibleFactions('MOVEMENT')).toEqual(['MOVEMENT', 'NEUTRAL_1']);
  });

  it('returns only NEUTRAL_1 for a neutral map', () => {
    expect(getAccessibleFactions('NEUTRAL_1')).toEqual(['NEUTRAL_1']);
  });
});

describe('getRegionFaction', () => {
  it('returns MOVEMENT at the center of the MOVEMENT region', () => {
    expect(getRegionFaction(3, 8)).toBe('MOVEMENT');
  });

  it('returns MOVEMENT for a hex within the MOVEMENT territory', () => {
    expect(getRegionFaction(1, 8)).toBe('MOVEMENT');
    expect(getRegionFaction(5, 8)).toBe('MOVEMENT');
  });

  it('returns MARK at the center of the MARK region', () => {
    expect(getRegionFaction(22, 10)).toBe('MARK');
  });

  it('returns MARK for a hex within the MARK territory', () => {
    expect(getRegionFaction(20, 10)).toBe('MARK');
    expect(getRegionFaction(24, 10)).toBe('MARK');
  });

  it('returns NEUTRAL_1 for far corners outside all regions', () => {
    expect(getRegionFaction(0, 0)).toBe('NEUTRAL_1');
    expect(getRegionFaction(25, 0)).toBe('NEUTRAL_1');
  });

  it('returns NEUTRAL_1 for the center of the grid (between regions)', () => {
    expect(getRegionFaction(13, 9)).toBe('NEUTRAL_1');
  });

  it('returns NEUTRAL_1 for a hex just outside territory', () => {
    // MOVEMENT center [3,8] — (11, 8) is distance 8, beyond effective radius at angle 0
    expect(getRegionFaction(11, 8)).toBe('NEUTRAL_1');
  });
});

describe('isRegionBoundary', () => {
  it('returns false for two cells in the same region', () => {
    // Both inside MOVEMENT territory (center [3,8])
    expect(isRegionBoundary(3, 8, 4, 8)).toBe(false);
  });

  it('returns true for adjacent cells crossing a region boundary', () => {
    // (8, 8) is inside MOVEMENT, (9, 8) is outside
    expect(isRegionBoundary(8, 8, 9, 8)).toBe(true);
  });

  it('returns true at the MARK region boundary', () => {
    // (18, 10) is inside MARK, (17, 10) is outside
    expect(isRegionBoundary(17, 10, 18, 10)).toBe(true);
  });

  it('returns false for two cells in the neutral zone', () => {
    expect(isRegionBoundary(12, 9, 13, 9)).toBe(false);
  });
});
