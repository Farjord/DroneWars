/**
 * hexPreview.js
 * Pure domain logic for computing hex movement previews
 *
 * Extracted from HexInfoPanel.jsx — computes movement cost, detection,
 * and validity for a prospective hex move without any React dependencies.
 */

import DetectionManager from '../detection/DetectionManager.js';
import MovementController from './MovementController.js';

/**
 * Compute a movement preview for a target hex
 * @param {Object} params
 * @param {Object} params.inspectedHex - Target hex to preview movement to
 * @param {Object} params.mapData - Full map data (hexes array, tier, etc.)
 * @param {Object} params.tierConfig - Tier configuration for detection costs
 * @param {Array} params.waypoints - Current waypoint list
 * @param {Object} params.playerPosition - Current player {q, r} position
 * @param {number} params.currentDetection - Current detection level (0-100)
 * @param {Array|null} params.previewPath - Pre-computed path from parent (respects pathfinding mode)
 * @param {number} params.mapRadius - Map radius for detection calculations
 * @returns {Object|null} Preview object with path, distance, cost, newDetection, valid, reason, currentDetection
 */
export const getHexPreview = ({
  inspectedHex,
  mapData,
  tierConfig,
  waypoints,
  playerPosition,
  currentDetection,
  previewPath,
  mapRadius,
}) => {
  if (!inspectedHex || !mapData || !tierConfig) return null;

  // Calculate from last waypoint position or player position
  const startPosition = waypoints.length > 0
    ? waypoints[waypoints.length - 1].hex
    : playerPosition;

  // Get current detection level (end of journey or current)
  const startDetection = waypoints.length > 0
    ? waypoints[waypoints.length - 1].cumulativeDetection
    : currentDetection;

  // Use previewPath from parent if provided (respects pathfinding mode)
  if (previewPath && previewPath.length > 0) {
    const detectionCost = previewPath.reduce((cost, hex) => {
      return cost + DetectionManager.getHexDetectionCost(hex, tierConfig, mapRadius);
    }, 0);

    return {
      path: previewPath,
      distance: previewPath.length - 1,
      cost: detectionCost,
      newDetection: startDetection + detectionCost,
      valid: true,
      reason: '',
      currentDetection: startDetection,
    };
  }

  // Fallback: use basic A* when no previewPath provided
  return MovementController.getMovementPreview(
    startPosition,
    inspectedHex,
    mapData.hexes,
    tierConfig,
  );
};
