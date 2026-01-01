/**
 * WaypointManager Tests
 * Tests for centralized waypoint path restoration after combat
 *
 * NOTE: storePathForCombat() has been removed - TransitionManager now handles storage
 * These tests focus on:
 * - Restoring waypoint paths after combat (from TacticalMapStateManager)
 * - Path query and clearing utilities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import waypointManager from './WaypointManager.js';
import tacticalMapStateManager from './TacticalMapStateManager.js';

// Mock TacticalMapStateManager
vi.mock('./TacticalMapStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}));

describe('WaypointManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: no stored path
    tacticalMapStateManager.getState.mockReturnValue({
      playerPosition: { q: 5, r: 5 },
      pendingPath: null,
      pendingWaypointDestinations: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('restorePathAfterCombat', () => {
    it('should reconstruct waypoints from stored path', () => {
      // Setup: Stored path exists (stored by TransitionManager.prepareForCombat)
      tacticalMapStateManager.getState.mockReturnValue({
        playerPosition: { q: 10, r: 10 },
        pendingPath: ['12,12', '15,15', '18,18', '20,20'],
        pendingWaypointDestinations: [
          { hex: { q: 15, r: 15 } },
          { hex: { q: 20, r: 20 } }
        ]
      });

      const restored = waypointManager.restorePathAfterCombat();

      // Should return waypoint array
      expect(restored).toEqual([
        {
          hex: { q: 15, r: 15 },
          pathFromPrev: [
            { q: 10, r: 10 },  // Start from current player position
            { q: 12, r: 12 },
            { q: 15, r: 15 }
          ]
        },
        {
          hex: { q: 20, r: 20 },
          pathFromPrev: [
            { q: 15, r: 15 },  // Start from previous waypoint
            { q: 18, r: 18 },
            { q: 20, r: 20 }
          ]
        }
      ]);

      // Should clear stored path after restoration
      expect(tacticalMapStateManager.setState).toHaveBeenCalledWith({
        pendingPath: null,
        pendingWaypointDestinations: null
      });
    });

    it('should return null when no path stored', () => {
      // Setup: No stored path
      tacticalMapStateManager.getState.mockReturnValue({
        playerPosition: { q: 10, r: 10 },
        pendingPath: null,
        pendingWaypointDestinations: null
      });

      const restored = waypointManager.restorePathAfterCombat();

      // Should return null
      expect(restored).toBeNull();

      // Should NOT call setState
      expect(tacticalMapStateManager.setState).not.toHaveBeenCalled();
    });

    it('should handle single waypoint restoration', () => {
      // Setup: Stored path with single waypoint
      tacticalMapStateManager.getState.mockReturnValue({
        playerPosition: { q: 10, r: 10 },
        pendingPath: ['15,15'],
        pendingWaypointDestinations: [
          { hex: { q: 15, r: 15 } }
        ]
      });

      const restored = waypointManager.restorePathAfterCombat();

      // Should return single waypoint
      expect(restored).toEqual([
        {
          hex: { q: 15, r: 15 },
          pathFromPrev: [
            { q: 10, r: 10 },
            { q: 15, r: 15 }
          ]
        }
      ]);
    });

    it('should restore waypoints with all calculated properties', () => {
      // Setup: mock stored waypoint data with all properties (from TransitionManager)
      tacticalMapStateManager.getState.mockReturnValue({
        playerPosition: { q: 0, r: 0 },
        pendingPath: ['5,5', '10,10'],
        pendingWaypointDestinations: [
          {
            hex: { q: 5, r: 5, type: 'empty' },
            segmentCost: 12.5,
            cumulativeDetection: 25.0,
            segmentEncounterRisk: 8.3,
            cumulativeEncounterRisk: 15.7
          },
          {
            hex: { q: 10, r: 10, type: 'gate' },
            segmentCost: 15.2,
            cumulativeDetection: 40.2,
            segmentEncounterRisk: 10.1,
            cumulativeEncounterRisk: 24.1
          }
        ]
      });

      const restored = waypointManager.restorePathAfterCombat();

      expect(restored).toBeDefined();
      expect(restored.length).toBe(2);

      // Verify first waypoint has all properties
      expect(restored[0]).toMatchObject({
        segmentCost: 12.5,
        cumulativeDetection: 25.0,
        segmentEncounterRisk: 8.3,
        cumulativeEncounterRisk: 15.7
      });

      // Verify second waypoint has all properties
      expect(restored[1]).toMatchObject({
        segmentCost: 15.2,
        cumulativeDetection: 40.2,
        segmentEncounterRisk: 10.1,
        cumulativeEncounterRisk: 24.1
      });
    });
  });

  describe('hasStoredPath', () => {
    it('should return true when path is stored', () => {
      tacticalMapStateManager.getState.mockReturnValue({
        pendingPath: ['10,10'],
        pendingWaypointDestinations: ['10,10']
      });

      expect(waypointManager.hasStoredPath()).toBe(true);
    });

    it('should return false when no path stored', () => {
      tacticalMapStateManager.getState.mockReturnValue({
        pendingPath: null,
        pendingWaypointDestinations: null
      });

      expect(waypointManager.hasStoredPath()).toBe(false);
    });

    it('should return false when pendingPath is empty array', () => {
      tacticalMapStateManager.getState.mockReturnValue({
        pendingPath: [],
        pendingWaypointDestinations: []
      });

      expect(waypointManager.hasStoredPath()).toBe(false);
    });
  });

  describe('clearStoredPath', () => {
    it('should clear stored path in TacticalMapStateManager', () => {
      waypointManager.clearStoredPath();

      expect(tacticalMapStateManager.setState).toHaveBeenCalledWith({
        pendingPath: null,
        pendingWaypointDestinations: null
      });
    });
  });

  describe('getStoredPathInfo', () => {
    it('should return path info for debugging', () => {
      tacticalMapStateManager.getState.mockReturnValue({
        pendingPath: ['10,10', '15,15', '20,20'],
        pendingWaypointDestinations: [
          { hex: { q: 15, r: 15 } },
          { hex: { q: 20, r: 20 } }
        ]
      });

      const info = waypointManager.getStoredPathInfo();

      expect(info).toEqual({
        pathLength: 3,
        waypointCount: 2,
        destinations: [
          { hex: { q: 15, r: 15 } },
          { hex: { q: 20, r: 20 } }
        ]
      });
    });

    it('should return null info when no path stored', () => {
      tacticalMapStateManager.getState.mockReturnValue({
        pendingPath: null,
        pendingWaypointDestinations: null
      });

      const info = waypointManager.getStoredPathInfo();

      expect(info).toEqual({
        pathLength: 0,
        waypointCount: 0,
        destinations: []
      });
    });
  });
});
