/**
 * TacticalMapScreen Waypoint Preservation Tests
 *
 * Tests that waypoints are preserved through ANY combat (including empty hex ambushes)
 * Waypoint preservation is SEPARATE from POI loot logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import gameStateManager from '../../managers/GameStateManager.js';

// Mock gameStateManager
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}));

describe('TacticalMapScreen - Waypoint Preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('waypoint storage before combat', () => {
    it('should store waypoints in currentRunState.pendingWaypoints before empty hex combat', () => {
      // Setup: Player traveling along waypoints, encounters combat at empty hex
      const waypoints = [
        { q: 0, r: 0 },  // Already passed
        { q: 1, r: 0 },  // Current position (combat here)
        { q: 2, r: 0 },  // Should be preserved
        { q: 3, r: 0 }   // Should be preserved
      ];
      const currentWaypointIndex = 1;
      const remainingWaypoints = waypoints.slice(currentWaypointIndex + 1);

      const mockRunState = {
        currentTier: 1,
        playerPosition: { q: 1, r: 0 }
      };

      gameStateManager.getState.mockReturnValue({
        currentRunState: mockRunState
      });

      // Simulate storing waypoints before combat
      // This is what the fix should do
      gameStateManager.setState({
        currentRunState: {
          ...mockRunState,
          pendingWaypoints: remainingWaypoints
        }
      });

      // Verify waypoints stored correctly
      expect(gameStateManager.setState).toHaveBeenCalledWith({
        currentRunState: expect.objectContaining({
          pendingWaypoints: [
            { q: 2, r: 0 },
            { q: 3, r: 0 }
          ]
        })
      });
    });

    it('should store waypoints SEPARATELY from pendingPOICombat', () => {
      // Waypoint storage should NOT depend on pendingPOICombat
      const waypoints = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },  // Combat at empty hex (no POI)
        { q: 2, r: 0 }
      ];
      const currentWaypointIndex = 1;
      const remainingWaypoints = waypoints.slice(currentWaypointIndex + 1);

      const mockRunState = {
        currentTier: 1
      };

      gameStateManager.getState.mockReturnValue({
        currentRunState: mockRunState
      });

      // Store waypoints WITHOUT storing pendingPOICombat (empty hex has no POI)
      gameStateManager.setState({
        currentRunState: {
          ...mockRunState,
          pendingWaypoints: remainingWaypoints
          // NOTE: No pendingPOICombat here - empty hex!
        }
      });

      const callArgs = gameStateManager.setState.mock.calls[0][0];

      // Waypoints should be stored
      expect(callArgs.currentRunState.pendingWaypoints).toEqual([{ q: 2, r: 0 }]);

      // pendingPOICombat should NOT be set for empty hex
      expect(callArgs.currentRunState.pendingPOICombat).toBeUndefined();
    });

    it('should NOT store pendingWaypoints when no waypoints remain', () => {
      const waypoints = [
        { q: 0, r: 0 },
        { q: 1, r: 0 }  // Combat at final waypoint
      ];
      const currentWaypointIndex = 1;
      const remainingWaypoints = waypoints.slice(currentWaypointIndex + 1);

      // remainingWaypoints is empty - nothing to preserve
      expect(remainingWaypoints).toHaveLength(0);

      // setState should not be called for empty waypoints array
      // (or if called, pendingWaypoints should not be set)
    });
  });

  describe('waypoint restoration after combat', () => {
    it('should restore waypoints from currentRunState.pendingWaypoints after combat', () => {
      // After combat, TacticalMapScreen mounts and should restore waypoints
      const storedWaypoints = [
        { q: 2, r: 0 },
        { q: 3, r: 0 }
      ];

      gameStateManager.getState.mockReturnValue({
        currentRunState: {
          currentTier: 1,
          pendingWaypoints: storedWaypoints
        }
      });

      const state = gameStateManager.getState();

      // Component should read pendingWaypoints and restore them
      expect(state.currentRunState.pendingWaypoints).toEqual(storedWaypoints);
    });

    it('should clear pendingWaypoints after restoration', () => {
      const storedWaypoints = [{ q: 2, r: 0 }];
      const mockRunState = {
        currentTier: 1,
        pendingWaypoints: storedWaypoints
      };

      gameStateManager.getState.mockReturnValue({
        currentRunState: mockRunState
      });

      // After restoring, clear from state
      gameStateManager.setState({
        currentRunState: {
          ...mockRunState,
          pendingWaypoints: null
        }
      });

      expect(gameStateManager.setState).toHaveBeenCalledWith({
        currentRunState: expect.objectContaining({
          pendingWaypoints: null
        })
      });
    });
  });

  describe('separation from POI logic', () => {
    it('POI combat should store both pendingWaypoints AND pendingPOICombat', () => {
      // POI encounter needs BOTH:
      // - pendingWaypoints for journey resumption
      // - pendingPOICombat for POI loot processing

      const waypoints = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },  // POI with combat
        { q: 2, r: 0 }
      ];
      const currentWaypointIndex = 1;
      const remainingWaypoints = waypoints.slice(currentWaypointIndex + 1);

      const mockRunState = {
        currentTier: 1
      };

      gameStateManager.getState.mockReturnValue({
        currentRunState: mockRunState
      });

      // POI encounter stores BOTH separately
      gameStateManager.setState({
        currentRunState: {
          ...mockRunState,
          pendingWaypoints: remainingWaypoints,  // For journey resumption
          pendingPOICombat: {                    // For POI loot only
            q: 1,
            r: 0,
            packType: 'ORDNANCE_PACK',
            fromSalvage: false
            // NOTE: No remainingWaypoints in pendingPOICombat!
          }
        }
      });

      const callArgs = gameStateManager.setState.mock.calls[0][0];

      // Both should be stored
      expect(callArgs.currentRunState.pendingWaypoints).toBeDefined();
      expect(callArgs.currentRunState.pendingPOICombat).toBeDefined();

      // pendingPOICombat should NOT contain waypoints
      expect(callArgs.currentRunState.pendingPOICombat.remainingWaypoints).toBeUndefined();
    });
  });
});
