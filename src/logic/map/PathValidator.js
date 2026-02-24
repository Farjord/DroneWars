/**
 * Path Validator
 * Validates that all PoIs on a generated map are reachable from all gates
 * Uses A* pathfinding to ensure detection costs are within acceptable limits
 */

import { hexNeighbors, axialDistance } from '../../utils/hexGrid.js';
import { debugLog } from '../../utils/debugLogger.js';

class PathValidator {
  /**
   * Validate that all PoIs are reachable from all gates with acceptable detection cost
   * @param {Object} map - Generated map data with hexes, gates, and pois
   * @param {Object} tierConfig - Tier configuration with detection rules
   * @returns {boolean} True if map is valid, false otherwise
   */
  validateMap(map, tierConfig) {
    // Check if all PoIs are reachable from all gates
    // with detection cost < maxPathCostPercent
    for (const gate of map.gates) {
      for (const poi of map.pois) {
        const path = this.findPath(gate, poi, map.hexes);

        if (!path) {
          debugLog('MOVEMENT_EFFECT', `No path found between gate ${gate.gateId} and PoI ${poi.poiId}`);
          return false;
        }

        const cost = path.length * tierConfig.detectionTriggers.movementPerHex;
        if (cost > tierConfig.maxPathCostPercent) {
          debugLog('MOVEMENT_EFFECT',
            `Path cost ${cost.toFixed(1)}% exceeds max ${tierConfig.maxPathCostPercent}% ` +
            `(gate ${gate.gateId} to PoI ${poi.poiId}, ${path.length} hexes)`
          );
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Find shortest path between two hexes using A* algorithm
   * @param {Object} start - Starting hex with q, r coordinates
   * @param {Object} goal - Goal hex with q, r coordinates
   * @param {Array<Object>} hexes - Array of all hexes on map
   * @returns {Array<Object>|null} Array of hexes in path, or null if no path exists
   */
  findPath(start, goal, hexes) {
    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(this.hexKey(start), 0);
    fScore.set(this.hexKey(start), this.heuristic(start, goal));

    while (openSet.length > 0) {
      // Get hex with lowest fScore
      openSet.sort((a, b) =>
        (fScore.get(this.hexKey(a)) || Infinity) -
        (fScore.get(this.hexKey(b)) || Infinity)
      );
      const current = openSet.shift();

      // Check if we reached the goal
      if (current.q === goal.q && current.r === goal.r) {
        return this.reconstructPath(cameFrom, current);
      }

      // Explore neighbors
      const neighbors = hexNeighbors(current.q, current.r);
      for (const neighborCoord of neighbors) {
        const neighbor = hexes.find(h => h.q === neighborCoord.q && h.r === neighborCoord.r);

        // Skip if hex doesn't exist (out of bounds)
        if (!neighbor) continue;

        const tentativeGScore = (gScore.get(this.hexKey(current)) || Infinity) + 1;
        const neighborKey = this.hexKey(neighbor);

        if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
          // This path to neighbor is better than any previous one
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));

          // Add neighbor to open set if not already there
          if (!openSet.find(h => h.q === neighbor.q && h.r === neighbor.r)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Reconstruct path from cameFrom map
   * @param {Map} cameFrom - Map of hex keys to previous hexes
   * @param {Object} current - Goal hex
   * @returns {Array<Object>} Array of hexes from start to goal
   */
  reconstructPath(cameFrom, current) {
    const path = [current];
    let key = this.hexKey(current);

    while (cameFrom.has(key)) {
      current = cameFrom.get(key);
      path.unshift(current);
      key = this.hexKey(current);
    }

    return path;
  }

  /**
   * Heuristic function for A* (Manhattan distance in hex grid)
   * @param {Object} a - Hex with q, r coordinates
   * @param {Object} b - Hex with q, r coordinates
   * @returns {number} Estimated distance
   */
  heuristic(a, b) {
    return axialDistance(a.q, a.r, b.q, b.r);
  }

  /**
   * Create unique string key for hex coordinates
   * @param {Object} hex - Hex with q, r coordinates
   * @returns {string} Key in format "q,r"
   */
  hexKey(hex) {
    return `${hex.q},${hex.r}`;
  }
}

export default PathValidator;
