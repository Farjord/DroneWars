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
  it('returns MOVEMENT for a hex in the MOVEMENT region', () => {
    expect(getRegionFaction(5, 0)).toBe('MOVEMENT');
  });

  it('returns MOVEMENT for boundary columns of the MOVEMENT region', () => {
    expect(getRegionFaction(2, 0)).toBe('MOVEMENT');
    expect(getRegionFaction(9, 0)).toBe('MOVEMENT');
  });

  it('returns MARK for a hex in the MARK region', () => {
    expect(getRegionFaction(20, 0)).toBe('MARK');
  });

  it('returns MARK for boundary columns of the MARK region', () => {
    expect(getRegionFaction(17, 0)).toBe('MARK');
    expect(getRegionFaction(23, 0)).toBe('MARK');
  });

  it('returns NEUTRAL_1 for a hex outside all defined regions', () => {
    expect(getRegionFaction(12, 0)).toBe('NEUTRAL_1');
  });

  it('returns NEUTRAL_1 for col 0 (before any region)', () => {
    expect(getRegionFaction(0, 0)).toBe('NEUTRAL_1');
  });

  it('returns NEUTRAL_1 for col between regions', () => {
    expect(getRegionFaction(13, 5)).toBe('NEUTRAL_1');
  });
});

describe('isRegionBoundary', () => {
  it('returns false for two cells in the same region', () => {
    expect(isRegionBoundary(3, 0, 4, 0)).toBe(false);
  });

  it('returns true for adjacent cells in different regions', () => {
    // col 9 is MOVEMENT, col 10 is NEUTRAL_1
    expect(isRegionBoundary(9, 0, 10, 0)).toBe(true);
  });

  it('returns true at the MARK region boundary', () => {
    // col 16 is NEUTRAL_1, col 17 is MARK
    expect(isRegionBoundary(16, 0, 17, 0)).toBe(true);
  });

  it('returns false for two cells in the neutral zone', () => {
    expect(isRegionBoundary(12, 0, 13, 0)).toBe(false);
  });
});
