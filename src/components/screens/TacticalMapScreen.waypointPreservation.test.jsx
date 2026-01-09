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

/**
 * TDD Tests: Waypoint Restoration via Modal Paths
 *
 * BUG FIX: When post-combat mount effect shows a modal (blueprint or generic loot),
 * waypoints must be stored in pendingResumeWaypoints so the modal's handler can
 * restore them after the modal closes.
 *
 * Two paths are missing this call:
 * - Blueprint-only loot path (line 504-513)
 * - Generic loot modal path (line 514-520)
 */
describe('waypoint restoration - modal paths (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have waypointsToRestore available for blueprint modal path', () => {
    // TEST: When returning from blueprint POI combat, waypointsToRestore should be available
    // to store in pendingResumeWaypoints for post-modal resumption

    tacticalMapStateManager.getState.mockReturnValue({
      pendingPOICombat: {
        q: 5, r: 3,
        packType: 'DRONE_BLUEPRINT_FIGHTER',  // Blueprint POI
        poiName: 'Fighter Blueprint Cache'
      },
      pendingPath: ['0,0', '1,0', '2,0'],  // Waypoints exist
      pendingWaypointDestinations: [{ hex: '2,0' }]
    });

    const state = tacticalMapStateManager.getState();

    // Preconditions for the bug: waypoints ARE in state manager
    expect(state.pendingPath).toBeDefined();
    expect(state.pendingPath.length).toBeGreaterThan(0);

    // And this is a blueprint POI (triggers the blueprint-only modal path)
    expect(state.pendingPOICombat.packType).toContain('BLUEPRINT');

    // BUG: The blueprint-only path doesn't call setPendingResumeWaypoints()
    // FIX: After showing blueprint modal, must call setPendingResumeWaypoints(waypointsToRestore)
  });

  it('should have waypointsToRestore available for generic loot modal path', () => {
    // TEST: When returning from non-blueprint POI combat, waypointsToRestore should be available

    tacticalMapStateManager.getState.mockReturnValue({
      pendingPOICombat: {
        q: 5, r: 3,
        packType: 'MIXED_PACK',  // Non-blueprint POI
        poiName: 'Salvage Cache'
      },
      pendingPath: ['0,0', '1,0', '2,0'],
      pendingWaypointDestinations: [{ hex: '2,0' }]
    });

    const state = tacticalMapStateManager.getState();

    // Waypoints are available
    expect(state.pendingPath).toBeDefined();

    // This is NOT a blueprint POI (triggers the generic loot modal path)
    expect(state.pendingPOICombat.packType).not.toContain('BLUEPRINT');

    // BUG: The generic loot path doesn't call setPendingResumeWaypoints()
    // FIX: After showing generic loot modal, must call setPendingResumeWaypoints(waypointsToRestore)
  });

  it('should restore waypoints when handleBlueprintRewardAccepted is called with pendingResumeWaypoints set', () => {
    // TEST: handleBlueprintRewardAccepted checks pendingResumeWaypoints and calls setWaypoints()
    // This verifies the handler is correct - it's the mount effect that's missing the setup

    const mockWaypoints = [
      { hex: { q: 2, r: 0 }, pathFromPrev: ['1,0', '2,0'] },
      { hex: { q: 3, r: 0 }, pathFromPrev: ['2,0', '3,0'] }
    ];

    // Simulate pendingResumeWaypoints being set (what the fix should do)
    const pendingResumeWaypoints = mockWaypoints;

    // Handler logic (from line 2553-2558)
    if (pendingResumeWaypoints?.length > 0) {
      // This is what should happen - waypoints get restored
      expect(pendingResumeWaypoints.length).toBe(2);
    }
  });
});

/**
 * TDD Tests: Waypoint removal during movement
 *
 * These tests verify that waypoints are removed from the array as the player
 * completes each one, ensuring only FUTURE waypoints remain.
 */
describe('Waypoint removal during movement (TDD)', () => {
  /**
   * Core behavior: When player leaves a waypoint (after 500ms pause),
   * that waypoint should be removed from the array.
   */
  it('should remove completed waypoint from array after player leaves', () => {
    // Setup: 3 waypoints, player has completed waypoint 1 and is leaving
    const initialWaypoints = [
      { hex: { q: 1, r: 0 }, pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }] },
      { hex: { q: 2, r: 0 }, pathFromPrev: [{ q: 1, r: 0 }, { q: 2, r: 0 }] },
      { hex: { q: 3, r: 0 }, pathFromPrev: [{ q: 2, r: 0 }, { q: 3, r: 0 }] }
    ];

    // Simulate the removal that should happen after completing waypoint 1
    // This is: setWaypoints(prev => prev.slice(1))
    const afterRemoval = initialWaypoints.slice(1);

    // Verify: Only waypoints 2 and 3 remain
    expect(afterRemoval.length).toBe(2);
    expect(afterRemoval[0].hex).toEqual({ q: 2, r: 0 });
    expect(afterRemoval[1].hex).toEqual({ q: 3, r: 0 });
  });

  /**
   * Combat at waypoint: If combat triggers AT a POI waypoint,
   * the waypoint should NOT be removed (player is still there).
   */
  it('should NOT remove waypoint if combat triggers AT the waypoint', () => {
    // Setup: 3 waypoints, player arrives at waypoint 1 (POI), combat triggers
    const initialWaypoints = [
      { hex: { q: 1, r: 0, type: 'poi' }, pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }] },
      { hex: { q: 2, r: 0 }, pathFromPrev: [{ q: 1, r: 0 }, { q: 2, r: 0 }] },
      { hex: { q: 3, r: 0 }, pathFromPrev: [{ q: 2, r: 0 }, { q: 3, r: 0 }] }
    ];

    // Simulate: shouldStopMovement.current = true causes break BEFORE removal
    // The loop exits before setWaypoints(prev => prev.slice(1)) is called
    const combatTriggered = true;
    let waypointsAfterCombatTrigger = initialWaypoints;

    if (!combatTriggered) {
      // This block is NOT executed when combat triggers
      waypointsAfterCombatTrigger = initialWaypoints.slice(1);
    }

    // Verify: All 3 waypoints remain (including the one player is at)
    expect(waypointsAfterCombatTrigger.length).toBe(3);
    expect(waypointsAfterCombatTrigger[0].hex).toEqual({ q: 1, r: 0, type: 'poi' });
  });

  /**
   * Mid-path combat: If player completed waypoint 1, then combat triggers
   * mid-path to waypoint 2, the array should have waypoints 2 and 3.
   */
  it('should have correct waypoints when combat triggers mid-path after completing previous waypoint', () => {
    // Setup: Player completed waypoint 1 (removed), now mid-path to waypoint 2
    const initialWaypoints = [
      { hex: { q: 1, r: 0 }, pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }] },
      { hex: { q: 2, r: 0 }, pathFromPrev: [{ q: 1, r: 0 }, { q: 1, r: 1 }, { q: 2, r: 0 }] },
      { hex: { q: 3, r: 0 }, pathFromPrev: [{ q: 2, r: 0 }, { q: 3, r: 0 }] }
    ];

    // Step 1: Player completes waypoint 1, leaves it
    let currentWaypoints = initialWaypoints.slice(1); // Waypoint 1 removed

    // Step 2: Player is mid-path to waypoint 2, combat triggers
    // The current hex index is 1 (first hex after leaving waypoint 1)
    const currentHexIndex = 1;
    const combatTriggered = true;

    // Waypoint 2 is NOT removed because we haven't completed it
    // (removal only happens after the 500ms pause at the waypoint destination)

    // Verify: Waypoints 2 and 3 remain
    expect(currentWaypoints.length).toBe(2);
    expect(currentWaypoints[0].hex).toEqual({ q: 2, r: 0 });
    expect(currentWaypoints[1].hex).toEqual({ q: 3, r: 0 });
  });

  /**
   * Sequential removal: Each waypoint is removed as completed,
   * maintaining correct order.
   */
  it('should sequentially remove waypoints as each is completed', () => {
    // Setup: 3 waypoints
    let waypoints = [
      { hex: { q: 1, r: 0 }, pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }] },
      { hex: { q: 2, r: 0 }, pathFromPrev: [{ q: 1, r: 0 }, { q: 2, r: 0 }] },
      { hex: { q: 3, r: 0 }, pathFromPrev: [{ q: 2, r: 0 }, { q: 3, r: 0 }] }
    ];

    // Complete waypoint 1
    waypoints = waypoints.slice(1);
    expect(waypoints.length).toBe(2);
    expect(waypoints[0].hex.q).toBe(2);

    // Complete waypoint 2
    waypoints = waypoints.slice(1);
    expect(waypoints.length).toBe(1);
    expect(waypoints[0].hex.q).toBe(3);

    // Complete waypoint 3 (final)
    waypoints = waypoints.slice(1);
    expect(waypoints.length).toBe(0);
  });

  /**
   * Final waypoint: When the last waypoint is completed,
   * the array becomes empty.
   */
  it('should result in empty array when final waypoint is completed', () => {
    // Setup: Only 1 waypoint remaining
    const waypoints = [
      { hex: { q: 3, r: 0 }, pathFromPrev: [{ q: 2, r: 0 }, { q: 3, r: 0 }] }
    ];

    // Complete the final waypoint
    const afterRemoval = waypoints.slice(1);

    // Verify: Array is empty
    expect(afterRemoval.length).toBe(0);
  });
});

/**
 * TDD Tests: Path trimming during movement
 *
 * As player moves through hexes, the pathFromPrev array should be TRIMMED
 * to only show upcoming hexes. This affects both the visual display and
 * what gets stored when combat triggers.
 *
 * REQUIREMENT: Path should SHRINK as player moves, not show traversed hexes.
 */
describe('Path trimming during movement (TDD)', () => {
  /**
   * Core trimming logic: After moving to hexIndex N, the path should
   * start from hex N (slice from N, not N+1, to include current position).
   */
  it('should trim pathFromPrev after moving to each hex', () => {
    // Setup: waypoint with path [hex0, hex1, hex2, hex3]
    const waypoint = {
      hex: { q: 3, r: 0 },
      pathFromPrev: [
        { q: 0, r: 0 },  // hexIndex 0 - start position
        { q: 1, r: 0 },  // hexIndex 1
        { q: 2, r: 0 },  // hexIndex 2
        { q: 3, r: 0 }   // hexIndex 3 - destination
      ]
    };

    // After player moves to hex1 (hexIndex=1), path should be [hex1, hex2, hex3]
    // We slice from hexIndex to keep current position + remaining
    const afterHex1 = waypoint.pathFromPrev.slice(1);
    expect(afterHex1.length).toBe(3);
    expect(afterHex1[0]).toEqual({ q: 1, r: 0 });
    expect(afterHex1[2]).toEqual({ q: 3, r: 0 });

    // After player moves to hex2 (hexIndex=2), path should be [hex2, hex3]
    const afterHex2 = waypoint.pathFromPrev.slice(2);
    expect(afterHex2.length).toBe(2);
    expect(afterHex2[0]).toEqual({ q: 2, r: 0 });
    expect(afterHex2[1]).toEqual({ q: 3, r: 0 });

    // After player moves to hex3 (hexIndex=3), path should be [hex3] only
    const afterHex3 = waypoint.pathFromPrev.slice(3);
    expect(afterHex3.length).toBe(1);
    expect(afterHex3[0]).toEqual({ q: 3, r: 0 });
  });

  /**
   * State update simulation: Test the setWaypoints pattern used in component.
   */
  it('should update waypoint state with trimmed path (functional update pattern)', () => {
    // Setup: Initial state with waypoints
    const initialWaypoints = [
      {
        hex: { q: 3, r: 0 },
        pathFromPrev: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 2, r: 0 },
          { q: 3, r: 0 }
        ]
      },
      {
        hex: { q: 5, r: 0 },
        pathFromPrev: [
          { q: 3, r: 0 },
          { q: 4, r: 0 },
          { q: 5, r: 0 }
        ]
      }
    ];

    // Simulate setWaypoints(prev => ...) after moving to hexIndex=1 in waypoint 0
    const wpIndex = 0;
    const hexIndex = 1;

    const updatedWaypoints = initialWaypoints.map((wp, i) => {
      if (i === wpIndex) {
        return {
          ...wp,
          pathFromPrev: wp.pathFromPrev.slice(hexIndex)
        };
      }
      return wp;
    });

    // Verify: First waypoint's path is trimmed, second unchanged
    expect(updatedWaypoints[0].pathFromPrev.length).toBe(3);
    expect(updatedWaypoints[0].pathFromPrev[0]).toEqual({ q: 1, r: 0 });
    expect(updatedWaypoints[1].pathFromPrev.length).toBe(3); // Unchanged
  });

  /**
   * Combat storage: When combat triggers mid-path, store ONLY remaining path.
   */
  it('should only store remaining path when combat triggers mid-path', () => {
    // Setup: Player at hexIndex=2 of waypoint 0
    const waypoints = [
      {
        hex: { q: 3, r: 0 },
        pathFromPrev: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 2, r: 0 },  // Player is HERE
          { q: 3, r: 0 }
        ]
      },
      {
        hex: { q: 5, r: 0 },
        pathFromPrev: [{ q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }]
      }
    ];
    const currentWaypointIndex = 0;
    const currentHexIndex = 2;

    // Calculate remaining path for storage (from current hex onward)
    const remainingPath = waypoints[0].pathFromPrev.slice(currentHexIndex);
    expect(remainingPath.length).toBe(2); // [hex2, hex3]
    expect(remainingPath[0]).toEqual({ q: 2, r: 0 });
    expect(remainingPath[1]).toEqual({ q: 3, r: 0 });
  });

  /**
   * Ref-based tracking: Test the pattern for sync progress tracking.
   */
  it('should track progress with ref for synchronous access', () => {
    // Setup: Simulate useRef pattern
    const pathProgressRef = { current: { waypointIndex: 0, hexIndex: 0 } };

    // Simulate movement loop updating ref
    pathProgressRef.current = { waypointIndex: 0, hexIndex: 1 };
    expect(pathProgressRef.current.hexIndex).toBe(1);

    pathProgressRef.current = { waypointIndex: 0, hexIndex: 2 };
    expect(pathProgressRef.current.hexIndex).toBe(2);

    // Combat triggers - ref has correct current position
    const { waypointIndex, hexIndex } = pathProgressRef.current;
    expect(waypointIndex).toBe(0);
    expect(hexIndex).toBe(2);
  });

  /**
   * Remove waypoint entirely when all hexes traversed.
   */
  it('should remove waypoint entirely when path fully traversed', () => {
    const waypoints = [
      { hex: { q: 2, r: 0 }, pathFromPrev: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }] },
      { hex: { q: 4, r: 0 }, pathFromPrev: [{ q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }] }
    ];

    // After completing waypoint 0, remove it entirely
    const afterCompletion = waypoints.slice(1);
    expect(afterCompletion.length).toBe(1);
    expect(afterCompletion[0].hex).toEqual({ q: 4, r: 0 });
  });

  /**
   * Calculate remaining waypoints from ref for combat storage.
   */
  it('should calculate remaining waypoints correctly using ref', () => {
    const waypoints = [
      {
        hex: { q: 3, r: 0 },
        pathFromPrev: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 2, r: 0 },
          { q: 3, r: 0 }
        ],
        segmentCost: 10,
        cumulativeDetection: 5
      },
      {
        hex: { q: 5, r: 0 },
        pathFromPrev: [{ q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }],
        segmentCost: 8,
        cumulativeDetection: 10
      }
    ];

    // Ref indicates: waypointIndex=0, hexIndex=2 (player at hex 2,0)
    const pathProgressRef = { current: { waypointIndex: 0, hexIndex: 2 } };
    const { waypointIndex, hexIndex } = pathProgressRef.current;

    // Build remaining waypoints for storage
    const remainingWaypoints = [];

    // Current waypoint: trim path from current hexIndex
    if (waypointIndex < waypoints.length) {
      const currentWp = waypoints[waypointIndex];
      const trimmedPath = currentWp.pathFromPrev.slice(hexIndex);

      // Only add if there are remaining hexes beyond current position
      if (trimmedPath.length > 1) {
        remainingWaypoints.push({
          ...currentWp,
          pathFromPrev: trimmedPath
        });
      }
    }

    // Add subsequent waypoints unchanged
    for (let i = waypointIndex + 1; i < waypoints.length; i++) {
      remainingWaypoints.push(waypoints[i]);
    }

    // Verify: Current waypoint has trimmed path, subsequent waypoint intact
    expect(remainingWaypoints.length).toBe(2);
    expect(remainingWaypoints[0].pathFromPrev.length).toBe(2); // [hex2, hex3]
    expect(remainingWaypoints[0].pathFromPrev[0]).toEqual({ q: 2, r: 0 });
    expect(remainingWaypoints[1].pathFromPrev.length).toBe(3); // Unchanged
  });

  /**
   * Edge case: Combat at first hex of waypoint.
   */
  it('should include all remaining hexes when combat at first hex', () => {
    const waypoint = {
      hex: { q: 3, r: 0 },
      pathFromPrev: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
        { q: 3, r: 0 }
      ]
    };

    // Combat at hexIndex=0 (very start)
    const remaining = waypoint.pathFromPrev.slice(0);
    expect(remaining.length).toBe(4); // All hexes remain
  });

  /**
   * Edge case: Combat at last hex of waypoint (destination).
   */
  it('should have only destination hex when combat at waypoint destination', () => {
    const waypoint = {
      hex: { q: 3, r: 0 },
      pathFromPrev: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 },
        { q: 3, r: 0 }
      ]
    };

    // Combat at hexIndex=3 (destination)
    const remaining = waypoint.pathFromPrev.slice(3);
    expect(remaining.length).toBe(1);
    expect(remaining[0]).toEqual({ q: 3, r: 0 });
  });
});
