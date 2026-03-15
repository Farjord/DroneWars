import { describe, it, expect, vi } from 'vitest';
import { calculateInsertionIndex } from '../insertionIndexCalculator.js';

/**
 * Helper: build a mock lane content element with drone children at given midpoints.
 * Each child has getBoundingClientRect returning { left, width } for midpoint calculation.
 */
function mockLaneElement(droneMidpoints, droneIds = null) {
  const children = droneMidpoints.map((mid, i) => {
    const width = 100;
    const left = mid - width / 2;
    return {
      getAttribute: (attr) => {
        if (attr === 'data-drone-index') return String(i);
        if (attr === 'data-drone-id') return droneIds ? droneIds[i] : `drone-${i}`;
        return null;
      },
      getBoundingClientRect: () => ({ left, width, right: left + width }),
    };
  });

  return {
    querySelectorAll: (selector) => {
      if (selector === '[data-drone-index]') return children;
      return [];
    },
  };
}

describe('calculateInsertionIndex', () => {
  it('returns 0 for empty lane', () => {
    const el = mockLaneElement([]);
    expect(calculateInsertionIndex(500, el)).toBe(0);
  });

  it('returns 0 for null element', () => {
    expect(calculateInsertionIndex(500, null)).toBe(0);
  });

  it('returns 0 when mouse is left of all drones', () => {
    const el = mockLaneElement([200, 400, 600]);
    expect(calculateInsertionIndex(100, el)).toBe(0);
  });

  it('returns drone count when mouse is right of all drones', () => {
    const el = mockLaneElement([200, 400, 600]);
    expect(calculateInsertionIndex(700, el)).toBe(3);
  });

  it('returns 1 when mouse is between first and second drone', () => {
    const el = mockLaneElement([200, 400, 600]);
    expect(calculateInsertionIndex(300, el)).toBe(1);
  });

  it('returns 2 when mouse is between second and third drone', () => {
    const el = mockLaneElement([200, 400, 600]);
    expect(calculateInsertionIndex(500, el)).toBe(2);
  });

  it('returns 0 when mouse is exactly at first drone midpoint', () => {
    // mouseX < midpoint is false when equal, so returns next
    const el = mockLaneElement([200, 400]);
    expect(calculateInsertionIndex(200, el)).toBe(1);
  });

  describe('excludeDroneId', () => {
    it('skips excluded drone element', () => {
      const el = mockLaneElement([200, 400, 600], ['d1', 'd2', 'd3']);
      // Exclude d2 (midpoint 400). Remaining midpoints: [200, 600]
      // Mouse at 300 → between 200 and 600 → index 1
      expect(calculateInsertionIndex(300, el, 'd2')).toBe(1);
    });

    it('returns 0 when all drones excluded', () => {
      const el = mockLaneElement([200], ['d1']);
      expect(calculateInsertionIndex(500, el, 'd1')).toBe(0);
    });
  });
});
