// ========================================
// HEX HEADING UTILITIES
// ========================================
// Calculates ship heading angles from hex axial coordinates.
// Uses flat-top hex orientation (matches HexGridRenderer).
//
// Heading reference (0 degrees = East/right, positive = clockwise):
//   - 0: East
//   - 90: South
//   - 180/-180: West
//   - -90/270: North

import { axialToPixel } from './hexGrid.js';

/**
 * Calculate heading angle between two hex positions.
 * Uses axialToPixel for accurate angle calculation in flat-top orientation.
 *
 * @param {Object|null} from - Starting hex {q, r}
 * @param {Object|null} to - Target hex {q, r}
 * @returns {number} Angle in degrees (0 = East, positive = clockwise)
 */
export function calculateHexHeading(from, to) {
  // Handle null/undefined inputs
  if (!from || !to) {
    return 0;
  }

  // Same position - return default heading (East)
  if (from.q === to.q && from.r === to.r) {
    return 0;
  }

  // Convert to pixel coordinates for accurate angle calculation
  // Using hexSize of 1 since we only need the direction, not magnitude
  const fromPixel = axialToPixel(from.q, from.r, 1);
  const toPixel = axialToPixel(to.q, to.r, 1);

  const dx = toPixel.x - fromPixel.x;
  const dy = toPixel.y - fromPixel.y;

  // atan2 returns radians, convert to degrees
  // atan2(y, x) gives angle from positive x-axis (East)
  const radians = Math.atan2(dy, dx);
  const degrees = radians * (180 / Math.PI);

  return degrees;
}

/**
 * Get ship heading based on current position and waypoints.
 * Determines what direction the ship should face based on movement state.
 *
 * @param {Object} playerPosition - Current hex {q, r}
 * @param {Array|null} waypoints - Array of waypoint objects with hex and pathFromPrev
 * @param {number|null} currentWaypointIndex - Index during movement, null if stationary
 * @param {number} currentHexIndex - Current hex index within path (during movement)
 * @param {number} lastHeading - Last known heading to use when stationary (default: 0)
 * @returns {number} Heading angle in degrees
 */
export function getShipHeadingForWaypoints(
  playerPosition,
  waypoints,
  currentWaypointIndex,
  currentHexIndex = 0,
  lastHeading = 0
) {
  // No waypoints - use last heading instead of resetting to East
  if (!waypoints || waypoints.length === 0) {
    return lastHeading;
  }

  // During movement - point toward next hex in path
  if (currentWaypointIndex !== null && currentWaypointIndex < waypoints.length) {
    const currentWaypoint = waypoints[currentWaypointIndex];
    const path = currentWaypoint.pathFromPrev;

    // If we have a path and aren't at the end, point to next hex
    if (path && path.length > 0 && currentHexIndex < path.length - 1) {
      return calculateHexHeading(playerPosition, path[currentHexIndex + 1]);
    }

    // At end of path segment or no path - check if at destination
    if (playerPosition.q === currentWaypoint.hex.q &&
        playerPosition.r === currentWaypoint.hex.r) {
      return lastHeading;
    }
    return calculateHexHeading(playerPosition, currentWaypoint.hex);
  }

  // Not moving - check if at last waypoint position (journey endpoint)
  // After completing a journey, player is at the LAST waypoint, not the first
  const lastWaypoint = waypoints[waypoints.length - 1];
  if (playerPosition.q === lastWaypoint.hex.q &&
      playerPosition.r === lastWaypoint.hex.r) {
    return lastHeading;
  }
  return calculateHexHeading(playerPosition, lastWaypoint.hex);
}
