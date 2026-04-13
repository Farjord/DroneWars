/**
 * Lane Capacity Utility Tests
 * TDD: Tests for MAX_DRONES_PER_LANE, isLaneFull(), getLaneCapacity()
 */

import { describe, it, expect, vi } from 'vitest';

// Mock tech collection so maxPerLane tests are independent of production data values.
// 'Stubbed Mine' has maxPerLane: 1; 'Stubbed Beacon' has maxPerLane: 2.
vi.mock('../../../data/techData.js', () => ({
  default: [
    { name: 'Stubbed Mine', maxPerLane: 1 },
    { name: 'Stubbed Beacon', maxPerLane: 2 },
  ]
}));

import { MAX_DRONES_PER_LANE, MAX_TECH_PER_LANE, isLaneFull, getLaneCapacity, countPendingArrivals, isTechSlotAvailable } from '../gameEngineUtils.js';

describe('countPendingArrivals', () => {
  const sel = (destination, ownerOrNull) => ({
    destination,
    target: ownerOrNull ? { id: 'd1', owner: ownerOrNull } : { id: 'd1' },
  });

  it('counts all arrivals when no owner filter provided', () => {
    const selections = [sel('lane2', 'player1'), sel('lane2', 'player2')];
    expect(countPendingArrivals(selections, 'lane2')).toBe(2);
  });

  it('counts only arrivals for the specified owner', () => {
    const selections = [sel('lane2', 'player1'), sel('lane2', 'player2')];
    expect(countPendingArrivals(selections, 'lane2', 'player1')).toBe(1);
    expect(countPendingArrivals(selections, 'lane2', 'player2')).toBe(1);
  });

  it('does not filter when target has no owner (safe default)', () => {
    const selections = [sel('lane2', null)];
    expect(countPendingArrivals(selections, 'lane2', 'player1')).toBe(1);
  });

  it('skips skipped selections', () => {
    const selections = [{ destination: 'lane2', target: { id: 'd1', owner: 'player1' }, skipped: true }];
    expect(countPendingArrivals(selections, 'lane2', 'player1')).toBe(0);
  });

  it('ignores arrivals to a different lane', () => {
    const selections = [sel('lane1', 'player1')];
    expect(countPendingArrivals(selections, 'lane2', 'player1')).toBe(0);
  });

  it('returns 0 for null selections', () => {
    expect(countPendingArrivals(null, 'lane2')).toBe(0);
    expect(countPendingArrivals(null, 'lane2', 'player1')).toBe(0);
  });
});

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

describe('isTechSlotAvailable', () => {
  // Uses mocked tech collection: 'Stubbed Mine' maxPerLane:1, 'Stubbed Beacon' maxPerLane:2
  const makeState = (lane1 = [], lane2 = [], lane3 = []) => ({
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    techSlots: { lane1, lane2, lane3 },
  });

  it('returns true for an empty tech slot', () => {
    expect(isTechSlotAvailable(makeState(), 'lane1', 'Stubbed Mine')).toBe(true);
  });

  it('returns false when the same tech already exists at maxPerLane (limit 1)', () => {
    const state = makeState([{ id: 't1', name: 'Stubbed Mine', isTech: true }]);
    expect(isTechSlotAvailable(state, 'lane1', 'Stubbed Mine')).toBe(false);
  });

  it('returns true when below maxPerLane limit (limit 2, count 1)', () => {
    const state = makeState([{ id: 't1', name: 'Stubbed Beacon', isTech: true }]);
    expect(isTechSlotAvailable(state, 'lane1', 'Stubbed Beacon')).toBe(true);
  });

  it('returns false when at maxPerLane limit (limit 2, count 2)', () => {
    const state = makeState([
      { id: 't1', name: 'Stubbed Beacon', isTech: true },
      { id: 't2', name: 'Stubbed Beacon', isTech: true },
    ]);
    expect(isTechSlotAvailable(state, 'lane1', 'Stubbed Beacon')).toBe(false);
  });

  it('returns true when a different tech occupies the slot', () => {
    const state = makeState([{ id: 't1', name: 'Stubbed Beacon', isTech: true }]);
    expect(isTechSlotAvailable(state, 'lane1', 'Stubbed Mine')).toBe(true);
  });

  it('returns false when the tech slot is at MAX_TECH_PER_LANE capacity', () => {
    const full = Array.from({ length: MAX_TECH_PER_LANE }, (_, i) => ({ id: `t${i}`, name: 'Stubbed Beacon', isTech: true }));
    expect(isTechSlotAvailable(makeState(full), 'lane1', 'Stubbed Mine')).toBe(false);
  });

  it('returns true when techSlots is missing (graceful fallback)', () => {
    const state = { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } };
    expect(isTechSlotAvailable(state, 'lane1', 'Stubbed Mine')).toBe(true);
  });

  it('returns true for a tech name not in the collection (no maxPerLane applies)', () => {
    const state = makeState([{ id: 't1', name: 'Unknown Tech', isTech: true }]);
    // Unknown tech — no maxPerLane check, only slot count check
    expect(isTechSlotAvailable(state, 'lane1', 'Unknown Tech')).toBe(true);
  });
});
