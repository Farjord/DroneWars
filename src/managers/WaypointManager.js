/**
 * WaypointManager
 * Centralized waypoint path storage and restoration
 *
 * Single source of truth for managing waypoint paths before/after combat.
 * Eliminates duplicated path storage logic across TacticalMapScreen.
 *
 * Responsibilities:
 * - Store waypoint paths before combat
 * - Restore waypoint paths after combat
 * - Determine mid-path vs at-POI logic
 * - Manage path persistence via TacticalMapStateManager
 */

import tacticalMapStateManager from './TacticalMapStateManager.js';
import { debugLog } from '../utils/debugLogger.js';

class WaypointManager {
  // NOTE: storePathForCombat() has been removed - TransitionManager now handles waypoint storage
  // All combat entry paths go through TransitionManager.prepareForCombat() which stores waypoints
  // to TacticalMapStateManager.pendingPath and pendingWaypointDestinations

  /**
   * Restore waypoint path after combat
   *
   * Reconstructs waypoint objects from stored pendingPath and pendingWaypointDestinations.
   * Clears stored path after restoration.
   *
   * @returns {Array|null} - Waypoint objects to restore, or null if none stored
   */
  restorePathAfterCombat() {
    const runState = tacticalMapStateManager.getState();

    // Diagnostic logging for debugging waypoint restoration issues
    debugLog('WAYPOINT_MANAGER', 'restorePathAfterCombat:', {
      pendingPathLength: runState?.pendingPath?.length || 0,
      pendingDestinationsLength: runState?.pendingWaypointDestinations?.length || 0
    });

    if (!runState?.pendingPath || runState.pendingPath.length === 0) {
      return null;
    }

    const pendingPath = runState.pendingPath;
    const pendingWaypointDestinations = runState.pendingWaypointDestinations || [];
    const playerPosition = runState.playerPosition;

    // Reconstruct waypoint array
    const waypoints = [];

    // Parse pendingPath into hex objects
    const pathHexes = pendingPath.map(coord => {
      const [q, r] = coord.split(',').map(Number);
      return { q, r };
    });

    // Build waypoints by grouping hexes by destination
    let currentPathHexes = [playerPosition];  // Start from current player position
    let pathIndex = 0;

    // Fallback: if path exists but no waypoint destinations, create synthetic waypoint
    if (pendingPath.length > 0 && pendingWaypointDestinations.length === 0) {
      const lastHex = pathHexes[pathHexes.length - 1];
      debugLog('WAYPOINT_MANAGER', 'Using fallback - creating synthetic waypoint from path', {
        pathLength: pendingPath.length,
        destination: `(${lastHex.q},${lastHex.r})`
      });

      // NOTE: State clearing moved to caller (TacticalMapScreen) to support React StrictMode double-mount

      return [{
        hex: lastHex,
        pathFromPrev: [playerPosition, ...pathHexes],
        segmentCost: pathHexes.length,  // Approximate cost
        cumulativeDetection: 0,
        segmentEncounterRisk: 0,
        cumulativeEncounterRisk: 0
      }];
    }

    for (let i = 0; i < pendingWaypointDestinations.length; i++) {
      const waypointData = pendingWaypointDestinations[i];
      const destination = waypointData.hex;
      const destQ = destination.q;
      const destR = destination.r;

      // Collect hexes until we reach this waypoint's destination
      while (pathIndex < pathHexes.length) {
        const hex = pathHexes[pathIndex];
        currentPathHexes.push(hex);
        pathIndex++;

        // Check if this hex is the destination
        if (hex.q === destQ && hex.r === destR) {
          break;
        }
      }

      // Create waypoint with ALL properties restored
      waypoints.push({
        hex: destination,
        pathFromPrev: [...currentPathHexes],
        segmentCost: waypointData.segmentCost,
        cumulativeDetection: waypointData.cumulativeDetection,
        segmentEncounterRisk: waypointData.segmentEncounterRisk,
        cumulativeEncounterRisk: waypointData.cumulativeEncounterRisk
      });

      // Next waypoint starts from this destination
      currentPathHexes = [destination];
    }

    // NOTE: State clearing moved to caller (TacticalMapScreen) to support React StrictMode double-mount

    debugLog('WAYPOINT_MANAGER', 'Restored path after combat', {
      waypointsRestored: waypoints.length,
      destinations: waypoints.map(wp => `(${wp.hex.q},${wp.hex.r})`).join(' -> ')
    });

    return waypoints;
  }

  /**
   * Check if there is a stored path
   *
   * @returns {boolean} - True if path is stored
   */
  hasStoredPath() {
    const runState = tacticalMapStateManager.getState();
    return !!(runState?.pendingPath && runState.pendingPath.length > 0);
  }

  /**
   * Clear stored path
   *
   * Removes pendingPath and pendingWaypointDestinations from state
   */
  clearStoredPath() {
    tacticalMapStateManager.setState({
      pendingPath: null,
      pendingWaypointDestinations: null
    });

    debugLog('WAYPOINT_MANAGER', 'Cleared stored path');
  }

  /**
   * Get stored path info for debugging
   *
   * @returns {Object} - {pathLength, waypointCount, destinations}
   */
  getStoredPathInfo() {
    const runState = tacticalMapStateManager.getState();

    if (!runState?.pendingPath || runState.pendingPath.length === 0) {
      return {
        pathLength: 0,
        waypointCount: 0,
        destinations: []
      };
    }

    return {
      pathLength: runState.pendingPath.length,
      waypointCount: runState.pendingWaypointDestinations?.length || 0,
      destinations: runState.pendingWaypointDestinations || []
    };
  }
}

// Export singleton instance
const waypointManager = new WaypointManager();
export default waypointManager;
