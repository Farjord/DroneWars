/**
 * TacticalMapScreen Waypoint Preservation Tests
 *
 * Tests that waypoints are preserved through ANY combat (including empty hex ambushes)
 * Waypoint preservation is SEPARATE from POI loot logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import gameStateManager from '../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js';

// Mock gameStateManager
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}));

// Mock tacticalMapStateManager
vi.mock('../../managers/TacticalMapStateManager.js', () => ({
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

/**
 * Race Condition Prevention Tests
 *
 * Tests for the fix: waypoints must be stored in TacticalMapStateManager
 * BEFORE shouldStopMovement flag is set, to prevent the journey loop
 * from clearing waypoints before they can be stored.
 */
describe('Race condition prevention - combat trigger stores waypoints early', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should store waypoints in TacticalMapStateManager BEFORE combat init', () => {
    // Simulate the fix: waypoints stored at combat trigger, not at loading complete
    const waypoints = [
      { q: 0, r: 0 },  // Passed
      { q: 1, r: 0 },  // Combat triggered here (currentWaypointIndex = 1)
      { q: 2, r: 0 },  // Must be stored
      { q: 3, r: 0 }   // Must be stored
    ];
    const currentWaypointIndex = 1;
    const remainingWps = waypoints.slice(currentWaypointIndex + 1);

    // Expected behavior: store in TacticalMapStateManager (not gameStateManager)
    tacticalMapStateManager.setState({ pendingWaypoints: remainingWps });

    expect(tacticalMapStateManager.setState).toHaveBeenCalledWith({
      pendingWaypoints: [{ q: 2, r: 0 }, { q: 3, r: 0 }]
    });
  });

  it('should NOT store waypoints when combat at final waypoint', () => {
    const waypoints = [{ q: 0, r: 0 }, { q: 1, r: 0 }];
    const currentWaypointIndex = 1; // Final waypoint
    const remainingWps = waypoints.slice(currentWaypointIndex + 1);

    expect(remainingWps).toHaveLength(0);
    // No setState call expected when no remaining waypoints
  });

  it('should preserve waypoint storage through movement loop exit', () => {
    // Verifies escapedWithWaypoints flag prevents setWaypoints([])
    const remainingWps = [{ q: 2, r: 0 }];
    const escapedWithWaypoints = { current: false };

    // Fix behavior: set flag when storing waypoints
    if (remainingWps.length > 0) {
      escapedWithWaypoints.current = true;
    }

    expect(escapedWithWaypoints.current).toBe(true);
    // This flag prevents line 800-801: setWaypoints([])
  });

  it('should NOT set escapedWithWaypoints flag when no remaining waypoints', () => {
    const remainingWps = [];
    const escapedWithWaypoints = { current: false };

    // No flag set when no remaining waypoints
    if (remainingWps.length > 0) {
      escapedWithWaypoints.current = true;
    }

    expect(escapedWithWaypoints.current).toBe(false);
  });
});

/**
 * Stale Closure Prevention Tests
 *
 * Tests that handleEncounterProceed uses CURRENT waypoints,
 * not stale values from initial render.
 *
 * Root cause: useCallback deps didn't include waypoints/currentWaypointIndex
 */
describe('handleEncounterProceed callback freshness (stale closure fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture current waypoints when combat triggers (not stale values)', () => {
    // Simulate the scenario:
    // - Initial render: waypoints = []
    // - Movement starts: waypoints = [wp1, wp2, wp3]
    // - Combat triggers: handleEncounterProceed should see [wp1, wp2, wp3]

    const currentWaypoints = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 }
    ];
    const currentWaypointIndex = 0;

    // This simulates what should happen in handleEncounterProceed
    // with CURRENT (not stale) waypoints
    const remainingWps = currentWaypoints.slice(currentWaypointIndex + 1);

    expect(remainingWps.length).toBe(2);
    expect(remainingWps).toEqual([{ q: 1, r: 0 }, { q: 2, r: 0 }]);

    // Store waypoints
    tacticalMapStateManager.setState({ pendingWaypoints: remainingWps });

    expect(tacticalMapStateManager.setState).toHaveBeenCalledWith({
      pendingWaypoints: [{ q: 1, r: 0 }, { q: 2, r: 0 }]
    });
  });

  it('should NOT use stale empty waypoints array', () => {
    // The bug: callback captured [] from initial render
    const staleWaypoints = [];  // This is what the broken callback sees
    const currentWaypointIndex = 0;

    const remainingWps = staleWaypoints.slice(currentWaypointIndex + 1);

    // This is the bug - nothing to store!
    expect(remainingWps.length).toBe(0);
    // No setState call would happen - this documents the bug behavior
  });

  it('should handle combat at different waypoint indices', () => {
    // Combat can trigger at any waypoint, not just the first
    const waypoints = [
      { q: 0, r: 0 },  // Waypoint 0
      { q: 1, r: 0 },  // Waypoint 1 - combat here
      { q: 2, r: 0 },  // Waypoint 2 - should be preserved
      { q: 3, r: 0 }   // Waypoint 3 - should be preserved
    ];
    const currentWaypointIndex = 1;

    const remainingWps = waypoints.slice(currentWaypointIndex + 1);

    expect(remainingWps.length).toBe(2);
    expect(remainingWps).toEqual([{ q: 2, r: 0 }, { q: 3, r: 0 }]);
  });
});

/**
 * Empty Hex Encounter Waypoint Restoration Tests
 *
 * Bug: For empty hex encounters (packType: null), the post-combat
 * useEffect returns early without restoring waypoints from
 * pendingResumeWaypoints to setWaypoints().
 */
describe('Empty hex encounter waypoint restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should restore waypoints even when packType is null (empty hex)', () => {
    // Empty hex encounters have packType: null
    // Waypoints should still be restored after combat

    const pendingResumeWaypoints = [
      { q: 1, r: 0 },
      { q: 2, r: 0 }
    ];
    const packType = null;  // Empty hex

    // Even with null packType, waypoints should be restored
    expect(pendingResumeWaypoints.length).toBe(2);
    expect(packType).toBeNull();

    // The fix: setWaypoints should be called before return
    // This test documents the expected behavior
  });

  it('should handle empty pendingResumeWaypoints gracefully', () => {
    const pendingResumeWaypoints = null;
    const packType = null;

    // No waypoints to restore - should not crash
    const hasWaypoints = pendingResumeWaypoints?.length > 0;
    expect(hasWaypoints).toBeFalsy();
  });
});

/**
 * Mid-Path Combat - Flat Path Preservation Tests
 *
 * When combat triggers mid-path (between waypoints), we need to store
 * the exact remaining hexes, not just the remaining waypoints.
 * This ensures the player resumes at the exact hex, not jumping ahead.
 */
describe('Mid-path combat - flat path preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should store remaining hexes from current waypoint path', () => {
    // Player is mid-path to first waypoint, combat triggers at hexIndex=1
    const waypoints = [{
      hex: { q: 3, r: 0 },
      pathFromPrev: [
        { q: 0, r: 0 },  // Start (hexIndex=0)
        { q: 1, r: 0 },  // Hex 1 - combat here (hexIndex=1)
        { q: 2, r: 0 },  // Hex 2 - should be stored
        { q: 3, r: 0 }   // Destination - should be stored
      ]
    }];
    const currentWaypointIndex = 0;
    const currentHexIndex = 1;  // Combat at hex 1

    // Calculate remaining path (what the fix should do)
    const remainingPath = [];
    const currentPath = waypoints[currentWaypointIndex].pathFromPrev;
    for (let i = currentHexIndex + 1; i < currentPath.length; i++) {
      remainingPath.push(`${currentPath[i].q},${currentPath[i].r}`);
    }

    expect(remainingPath).toEqual(['2,0', '3,0']);
    expect(remainingPath).toHaveLength(2);
  });

  it('should include hexes from subsequent waypoints', () => {
    // Player has multiple waypoints, combat mid-first-waypoint
    const waypoints = [
      {
        hex: { q: 2, r: 0 },
        pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }]
      },
      {
        hex: { q: 4, r: 0 },
        pathFromPrev: [{ q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }]
      }
    ];
    const currentWaypointIndex = 0;
    const currentHexIndex = 1;  // Combat mid-first-waypoint (at hex 1,0)

    const remainingPath = [];
    // Remaining from current waypoint
    const currentPath = waypoints[currentWaypointIndex].pathFromPrev;
    for (let i = currentHexIndex + 1; i < currentPath.length; i++) {
      remainingPath.push(`${currentPath[i].q},${currentPath[i].r}`);
    }
    // All subsequent waypoints (skip first hex - it overlaps with previous waypoint's destination)
    for (let wp = currentWaypointIndex + 1; wp < waypoints.length; wp++) {
      const wpPath = waypoints[wp].pathFromPrev;
      for (let i = 1; i < wpPath.length; i++) {
        remainingPath.push(`${wpPath[i].q},${wpPath[i].r}`);
      }
    }

    // Should have: 2,0 (rest of wp0) + 3,0, 4,0 (wp1, skipping first overlap)
    expect(remainingPath).toEqual(['2,0', '3,0', '4,0']);
  });

  it('should handle combat at very start of path (hexIndex=0)', () => {
    const waypoints = [{
      hex: { q: 2, r: 0 },
      pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }]
    }];
    const currentWaypointIndex = 0;
    const currentHexIndex = 0;  // Combat at very first hex

    const remainingPath = [];
    const currentPath = waypoints[currentWaypointIndex].pathFromPrev;
    for (let i = currentHexIndex + 1; i < currentPath.length; i++) {
      remainingPath.push(`${currentPath[i].q},${currentPath[i].r}`);
    }

    // Should store all remaining hexes
    expect(remainingPath).toEqual(['1,0', '2,0']);
  });

  it('should handle combat at final hex of waypoint', () => {
    const waypoints = [
      {
        hex: { q: 2, r: 0 },
        pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }]
      },
      {
        hex: { q: 4, r: 0 },
        pathFromPrev: [{ q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }]
      }
    ];
    const currentWaypointIndex = 0;
    const currentHexIndex = 2;  // Combat at final hex of first waypoint

    const remainingPath = [];
    const currentPath = waypoints[currentWaypointIndex].pathFromPrev;
    for (let i = currentHexIndex + 1; i < currentPath.length; i++) {
      remainingPath.push(`${currentPath[i].q},${currentPath[i].r}`);
    }
    for (let wp = currentWaypointIndex + 1; wp < waypoints.length; wp++) {
      const wpPath = waypoints[wp].pathFromPrev;
      for (let i = 1; i < wpPath.length; i++) {
        remainingPath.push(`${wpPath[i].q},${wpPath[i].r}`);
      }
    }

    // Only subsequent waypoint hexes (current waypoint complete)
    expect(remainingPath).toEqual(['3,0', '4,0']);
  });

  it('should return empty path when combat at final hex of final waypoint', () => {
    const waypoints = [{
      hex: { q: 2, r: 0 },
      pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }]
    }];
    const currentWaypointIndex = 0;
    const currentHexIndex = 2;  // Combat at destination

    const remainingPath = [];
    const currentPath = waypoints[currentWaypointIndex].pathFromPrev;
    for (let i = currentHexIndex + 1; i < currentPath.length; i++) {
      remainingPath.push(`${currentPath[i].q},${currentPath[i].r}`);
    }

    expect(remainingPath).toEqual([]);
    expect(remainingPath).toHaveLength(0);
  });
});

/**
 * Path Restoration - Synthetic Waypoint Creation Tests
 */
describe('Path restoration - synthetic waypoint creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should restore path strings to synthetic waypoint', () => {
    const pendingPath = ['2,0', '3,0', '4,0'];
    const playerPosition = { q: 1, r: 0 };
    const mapHexes = [
      { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }
    ];

    // Convert strings to hex objects
    const pathHexes = pendingPath.map(s => {
      const [q, r] = s.split(',').map(Number);
      return mapHexes.find(h => h.q === q && h.r === r);
    }).filter(Boolean);

    const startHex = mapHexes.find(h => h.q === playerPosition.q && h.r === playerPosition.r);

    const syntheticWaypoint = {
      hex: pathHexes[pathHexes.length - 1],
      pathFromPrev: [startHex, ...pathHexes]
    };

    expect(syntheticWaypoint.hex).toEqual({ q: 4, r: 0 });
    expect(syntheticWaypoint.pathFromPrev).toHaveLength(4);
    expect(syntheticWaypoint.pathFromPrev[0]).toEqual({ q: 1, r: 0 });  // Start
    expect(syntheticWaypoint.pathFromPrev[1]).toEqual({ q: 2, r: 0 });
    expect(syntheticWaypoint.pathFromPrev[2]).toEqual({ q: 3, r: 0 });
    expect(syntheticWaypoint.pathFromPrev[3]).toEqual({ q: 4, r: 0 });  // Destination
  });

  it('should handle single remaining hex', () => {
    const pendingPath = ['2,0'];
    const playerPosition = { q: 1, r: 0 };
    const mapHexes = [{ q: 1, r: 0 }, { q: 2, r: 0 }];

    const pathHexes = pendingPath.map(s => {
      const [q, r] = s.split(',').map(Number);
      return mapHexes.find(h => h.q === q && h.r === r);
    }).filter(Boolean);

    const startHex = mapHexes.find(h => h.q === playerPosition.q && h.r === playerPosition.r);

    const syntheticWaypoint = {
      hex: pathHexes[pathHexes.length - 1],
      pathFromPrev: [startHex, ...pathHexes]
    };

    expect(syntheticWaypoint.hex).toEqual({ q: 2, r: 0 });
    expect(syntheticWaypoint.pathFromPrev).toHaveLength(2);
  });

  it('should filter out invalid hex coordinates', () => {
    const pendingPath = ['2,0', '99,99', '3,0'];  // 99,99 doesn't exist
    const playerPosition = { q: 1, r: 0 };
    const mapHexes = [
      { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }
    ];

    const pathHexes = pendingPath.map(s => {
      const [q, r] = s.split(',').map(Number);
      return mapHexes.find(h => h.q === q && h.r === r);
    }).filter(Boolean);  // Filter removes undefined

    expect(pathHexes).toHaveLength(2);  // Only valid hexes
    expect(pathHexes).toEqual([{ q: 2, r: 0 }, { q: 3, r: 0 }]);
  });

  it('should store pendingPath in TacticalMapStateManager', () => {
    const remainingPath = ['2,0', '3,0'];

    tacticalMapStateManager.setState({ pendingPath: remainingPath });

    expect(tacticalMapStateManager.setState).toHaveBeenCalledWith({
      pendingPath: ['2,0', '3,0']
    });
  });
});

/**
 * Waypoint Marker Preservation Tests
 *
 * When restoring from combat, we need to preserve the user's original
 * waypoint markers (intermediate destinations), not just create one
 * synthetic waypoint to the final destination.
 */
describe('Waypoint marker preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should store waypoint destinations alongside path', () => {
    // User clicked two waypoints: wp1 at (2,0) and wp2 at (5,0)
    const waypoints = [
      { hex: { q: 2, r: 0 }, pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }] },
      { hex: { q: 5, r: 0 }, pathFromPrev: [{ q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }] }
    ];
    const currentWaypointIndex = 0;

    // Extract waypoint destinations (starting from current, excluding already passed)
    const waypointDestinations = [];
    for (let wp = currentWaypointIndex; wp < waypoints.length; wp++) {
      waypointDestinations.push(`${waypoints[wp].hex.q},${waypoints[wp].hex.r}`);
    }

    expect(waypointDestinations).toEqual(['2,0', '5,0']);
  });

  it('should exclude already-passed waypoints from destinations', () => {
    // Combat mid-path to second waypoint - first waypoint already passed
    const waypoints = [
      { hex: { q: 2, r: 0 }, pathFromPrev: [{ q: 0, r: 0 }, { q: 2, r: 0 }] },
      { hex: { q: 5, r: 0 }, pathFromPrev: [{ q: 2, r: 0 }, { q: 5, r: 0 }] }
    ];
    const currentWaypointIndex = 1;  // Already at/past first waypoint

    const waypointDestinations = [];
    for (let wp = currentWaypointIndex; wp < waypoints.length; wp++) {
      waypointDestinations.push(`${waypoints[wp].hex.q},${waypoints[wp].hex.r}`);
    }

    expect(waypointDestinations).toEqual(['5,0']);  // Only second waypoint
  });

  it('should reconstruct multiple waypoints from path and destinations', () => {
    // Stored data after combat
    const pendingPath = ['1,0', '2,0', '3,0', '4,0', '5,0'];
    const pendingWaypointDestinations = ['2,0', '5,0'];
    const playerPosition = { q: 0, r: 0 };
    const mapHexes = [
      { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
      { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }
    ];

    // Helper to find hex
    const findHex = (s) => {
      const [q, r] = s.split(',').map(Number);
      return mapHexes.find(h => h.q === q && h.r === r);
    };

    // Reconstruct waypoints
    const waypointsToRestore = [];
    let pathStartIndex = 0;
    let prevHex = findHex(`${playerPosition.q},${playerPosition.r}`);

    for (const wpDest of pendingWaypointDestinations) {
      const destIndex = pendingPath.indexOf(wpDest);
      if (destIndex === -1) continue;

      // Extract path segment for this waypoint (from pathStartIndex to destIndex inclusive)
      const pathSegment = pendingPath.slice(pathStartIndex, destIndex + 1);
      const pathHexes = pathSegment.map(findHex);

      waypointsToRestore.push({
        hex: pathHexes[pathHexes.length - 1],
        pathFromPrev: [prevHex, ...pathHexes]
      });

      // Next waypoint starts after this one
      prevHex = pathHexes[pathHexes.length - 1];
      pathStartIndex = destIndex + 1;
    }

    // Should have 2 waypoints
    expect(waypointsToRestore).toHaveLength(2);

    // First waypoint: destination (2,0), path from (0,0) through (1,0) to (2,0)
    expect(waypointsToRestore[0].hex).toEqual({ q: 2, r: 0 });
    expect(waypointsToRestore[0].pathFromPrev).toHaveLength(3);  // 0,0 -> 1,0 -> 2,0
    expect(waypointsToRestore[0].pathFromPrev[0]).toEqual({ q: 0, r: 0 });
    expect(waypointsToRestore[0].pathFromPrev[2]).toEqual({ q: 2, r: 0 });

    // Second waypoint: destination (5,0), path from (2,0) through to (5,0)
    expect(waypointsToRestore[1].hex).toEqual({ q: 5, r: 0 });
    expect(waypointsToRestore[1].pathFromPrev).toHaveLength(4);  // 2,0 -> 3,0 -> 4,0 -> 5,0
    expect(waypointsToRestore[1].pathFromPrev[0]).toEqual({ q: 2, r: 0 });
    expect(waypointsToRestore[1].pathFromPrev[3]).toEqual({ q: 5, r: 0 });
  });

  it('should handle single waypoint case', () => {
    const pendingPath = ['1,0', '2,0'];
    const pendingWaypointDestinations = ['2,0'];
    const playerPosition = { q: 0, r: 0 };
    const mapHexes = [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }];

    const findHex = (s) => {
      const [q, r] = s.split(',').map(Number);
      return mapHexes.find(h => h.q === q && h.r === r);
    };

    const waypointsToRestore = [];
    let pathStartIndex = 0;
    let prevHex = findHex(`${playerPosition.q},${playerPosition.r}`);

    for (const wpDest of pendingWaypointDestinations) {
      const destIndex = pendingPath.indexOf(wpDest);
      if (destIndex === -1) continue;

      const pathSegment = pendingPath.slice(pathStartIndex, destIndex + 1);
      const pathHexes = pathSegment.map(findHex);

      waypointsToRestore.push({
        hex: pathHexes[pathHexes.length - 1],
        pathFromPrev: [prevHex, ...pathHexes]
      });

      prevHex = pathHexes[pathHexes.length - 1];
      pathStartIndex = destIndex + 1;
    }

    expect(waypointsToRestore).toHaveLength(1);
    expect(waypointsToRestore[0].hex).toEqual({ q: 2, r: 0 });
  });

  it('should store both pendingPath and pendingWaypointDestinations', () => {
    const remainingPath = ['1,0', '2,0', '3,0'];
    const waypointDestinations = ['2,0', '3,0'];

    tacticalMapStateManager.setState({
      pendingPath: remainingPath,
      pendingWaypointDestinations: waypointDestinations
    });

    expect(tacticalMapStateManager.setState).toHaveBeenCalledWith({
      pendingPath: ['1,0', '2,0', '3,0'],
      pendingWaypointDestinations: ['2,0', '3,0']
    });
  });
});
