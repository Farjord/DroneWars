// ========================================
// HEX HEADING UTILITIES TESTS
// ========================================
// TDD tests for ship heading calculation based on hex positions.
// These tests verify that ships point toward their next waypoint.
//
// FLAT-TOP HEX ORIENTATION - Actual angles from axialToPixel:
// The hex grid is rotated 30 degrees from standard Cartesian coordinates.
//   - "East" (q+1, r+0):      30 degrees (up-right)
//   - "West" (q-1, r+0):     -150 degrees (down-left)
//   - "Southeast" (q+0, r+1): 90 degrees (straight down)
//   - "Northwest" (q+0, r-1): -90 degrees (straight up)
//   - "Northeast" (q+1, r-1): -30 degrees (slightly up-right)
//   - "Southwest" (q-1, r+1): 150 degrees (slightly down-left)

import { describe, it, expect } from 'vitest';
import { calculateHexHeading, getShipHeadingForWaypoints } from './hexHeadingUtils.js';

describe('hexHeadingUtils', () => {
  describe('calculateHexHeading', () => {
    // Test: Given two identical positions, returns 0 (default heading)
    it('should return 0 degrees when positions are identical', () => {
      const heading = calculateHexHeading({ q: 0, r: 0 }, { q: 0, r: 0 });
      expect(heading).toBe(0);
    });

    // Test: Moving "East" (q+1, r+0) in flat-top hex = 30 degrees
    it('should return 30 degrees for hex-East direction (q+1, r+0)', () => {
      const heading = calculateHexHeading({ q: 0, r: 0 }, { q: 1, r: 0 });
      expect(heading).toBeCloseTo(30, 0);
    });

    // Test: Moving "West" (q-1, r+0) in flat-top hex = -150 degrees
    it('should return -150 degrees for hex-West direction (q-1, r+0)', () => {
      const heading = calculateHexHeading({ q: 0, r: 0 }, { q: -1, r: 0 });
      expect(heading).toBeCloseTo(-150, 0);
    });

    // Test: Moving "Southeast" (q+0, r+1) = 90 degrees (straight down)
    it('should return 90 degrees for hex-Southeast direction (q+0, r+1)', () => {
      const heading = calculateHexHeading({ q: 0, r: 0 }, { q: 0, r: 1 });
      expect(heading).toBeCloseTo(90, 0);
    });

    // Test: Moving "Northwest" (q+0, r-1) = -90 degrees (straight up)
    it('should return -90 degrees for hex-Northwest direction (q+0, r-1)', () => {
      const heading = calculateHexHeading({ q: 0, r: 0 }, { q: 0, r: -1 });
      expect(heading).toBeCloseTo(-90, 0);
    });

    // Test: Moving "Northeast" (q+1, r-1) = -30 degrees
    it('should return -30 degrees for hex-Northeast direction (q+1, r-1)', () => {
      const heading = calculateHexHeading({ q: 0, r: 0 }, { q: 1, r: -1 });
      expect(heading).toBeCloseTo(-30, 0);
    });

    // Test: Moving "Southwest" (q-1, r+1) = 150 degrees
    it('should return 150 degrees for hex-Southwest direction (q-1, r+1)', () => {
      const heading = calculateHexHeading({ q: 0, r: 0 }, { q: -1, r: 1 });
      expect(heading).toBeCloseTo(150, 0);
    });

    // Test: Null/undefined target handling - should return 0
    it('should return 0 for null target position', () => {
      const heading = calculateHexHeading({ q: 0, r: 0 }, null);
      expect(heading).toBe(0);
    });

    it('should return 0 for undefined target position', () => {
      const heading = calculateHexHeading({ q: 0, r: 0 }, undefined);
      expect(heading).toBe(0);
    });

    it('should return 0 for null source position', () => {
      const heading = calculateHexHeading(null, { q: 1, r: 0 });
      expect(heading).toBe(0);
    });

    // Test: Works with non-zero starting positions
    it('should calculate correct heading from non-origin position', () => {
      // Moving from (3, 2) to (4, 2) is same as (0,0) to (1,0) = 30 degrees
      const heading = calculateHexHeading({ q: 3, r: 2 }, { q: 4, r: 2 });
      expect(heading).toBeCloseTo(30, 0);
    });

    // Test: Multi-hex distance should calculate same direction
    it('should calculate correct heading for multi-hex distance', () => {
      // Moving 3 hexes in "East" direction = still 30 degrees
      const heading = calculateHexHeading({ q: 0, r: 0 }, { q: 3, r: 0 });
      expect(heading).toBeCloseTo(30, 0);
    });
  });

  describe('getShipHeadingForWaypoints', () => {
    // Test: Empty waypoints returns 0 (default heading)
    it('should return 0 when no waypoints exist', () => {
      const heading = getShipHeadingForWaypoints({ q: 0, r: 0 }, [], null, 0);
      expect(heading).toBe(0);
    });

    it('should return 0 when waypoints is null', () => {
      const heading = getShipHeadingForWaypoints({ q: 0, r: 0 }, null, null, 0);
      expect(heading).toBe(0);
    });

    // Test: Not moving (currentWaypointIndex null) - point to first waypoint hex
    it('should point toward first waypoint when not moving', () => {
      const waypoints = [
        { hex: { q: 1, r: 0 }, pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }] }
      ];
      const heading = getShipHeadingForWaypoints({ q: 0, r: 0 }, waypoints, null, 0);
      // Pointing toward (1, 0) from (0, 0) = 30 degrees in flat-top hex
      expect(heading).toBeCloseTo(30, 0);
    });

    // Test: During movement - point toward next hex in path
    it('should point toward next hex in path during movement', () => {
      const waypoints = [
        {
          hex: { q: 2, r: 0 },
          pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }]
        }
      ];
      // At hex 0 of path, moving toward hex 1 (which is at q:1, r:0)
      const heading = getShipHeadingForWaypoints({ q: 0, r: 0 }, waypoints, 0, 0);
      expect(heading).toBeCloseTo(30, 0); // 30 degrees toward (1, 0)
    });

    // Test: At end of path segment, point to waypoint hex
    it('should point toward waypoint hex when at end of path segment', () => {
      const waypoints = [
        {
          hex: { q: 1, r: 0 },
          pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }]
        }
      ];
      // At last hex of path (index 1 of 2), already at waypoint
      const heading = getShipHeadingForWaypoints({ q: 1, r: 0 }, waypoints, 0, 1);
      // Same position, returns 0
      expect(heading).toBe(0);
    });

    // Test: Multi-waypoint journey, mid-path
    it('should handle multi-waypoint journey correctly', () => {
      const waypoints = [
        {
          hex: { q: 1, r: 0 },
          pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }]
        },
        {
          hex: { q: 1, r: 1 },
          pathFromPrev: [{ q: 1, r: 0 }, { q: 1, r: 1 }]
        }
      ];
      // On second waypoint (index 1), at first hex of path
      const heading = getShipHeadingForWaypoints({ q: 1, r: 0 }, waypoints, 1, 0);
      // Should point toward (1, 1) from (1, 0) = 90 degrees (straight down)
      expect(heading).toBeCloseTo(90, 0);
    });

    // Test: Invalid waypointIndex should fallback to first waypoint
    it('should fallback to first waypoint for out-of-bounds waypoint index', () => {
      const waypoints = [
        { hex: { q: 1, r: 0 }, pathFromPrev: [] }
      ];
      // Out of bounds index 5, falls through to point at first waypoint
      const heading = getShipHeadingForWaypoints({ q: 0, r: 0 }, waypoints, 5, 0);
      expect(heading).toBeCloseTo(30, 0); // Points to (1, 0)
    });

    // Test: Empty pathFromPrev should point to waypoint hex directly
    it('should point directly to waypoint hex when pathFromPrev is empty', () => {
      const waypoints = [
        { hex: { q: 1, r: 0 }, pathFromPrev: [] }
      ];
      const heading = getShipHeadingForWaypoints({ q: 0, r: 0 }, waypoints, 0, 0);
      // Points directly to waypoint hex (1, 0) = 30 degrees
      expect(heading).toBeCloseTo(30, 0);
    });
  });

  // ========================================
  // HEADING PERSISTENCE TESTS
  // ========================================
  // Ship should maintain its last heading when stationary,
  // rather than resetting to 0 (East).

  describe('heading persistence', () => {
    it('should return lastHeading when no waypoints and lastHeading provided', () => {
      const heading = getShipHeadingForWaypoints(
        { q: 0, r: 0 }, // playerPosition
        [],              // no waypoints
        null,            // not moving
        0,               // currentHexIndex
        90               // lastHeading - was facing South
      );
      expect(heading).toBe(90);
    });

    it('should return lastHeading when at destination (same position as waypoint)', () => {
      const waypoints = [
        { hex: { q: 1, r: 0 }, pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }] }
      ];
      // Ship arrived at waypoint (1,0) - same as waypoint hex
      const heading = getShipHeadingForWaypoints(
        { q: 1, r: 0 }, // at destination
        waypoints,
        null,           // not actively moving
        0,
        30              // lastHeading - was facing this way during travel
      );
      expect(heading).toBe(30);
    });

    it('should ignore lastHeading when actively moving (use calculated heading)', () => {
      const waypoints = [
        { hex: { q: 2, r: 0 }, pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }] }
      ];
      // Actively moving through path
      const heading = getShipHeadingForWaypoints(
        { q: 0, r: 0 },
        waypoints,
        0,              // actively moving to waypoint 0
        0,              // at start of path
        -90             // lastHeading should be ignored
      );
      expect(heading).toBeCloseTo(30, 0); // Points to next hex, not lastHeading
    });

    it('should return lastHeading when waypoints is null', () => {
      const heading = getShipHeadingForWaypoints(
        { q: 0, r: 0 },
        null,
        null,
        0,
        45              // lastHeading
      );
      expect(heading).toBe(45);
    });
  });
});
