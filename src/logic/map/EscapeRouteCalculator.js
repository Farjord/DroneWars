/**
 * EscapeRouteCalculator
 * Calculates escape routes using weighted A* pathfinding that minimizes threat cost
 * Used to show players if they can still safely reach extraction gates
 */

import { hexNeighbors, axialDistance } from '../../utils/hexGrid.js';
import DetectionManager from '../detection/DetectionManager.js';
import MovementController from './MovementController.js';

class EscapeRouteCalculator {
  /**
   * Find the lowest-threat path between two hexes using weighted A*
   * Unlike regular A* which finds shortest path, this minimizes total detection cost
   *
   * @param {Object} start - Starting hex with q, r coordinates
   * @param {Object} goal - Goal hex with q, r coordinates
   * @param {Array<Object>} hexes - Array of all hexes on map
   * @param {Object} tierConfig - Tier configuration with detection rates
   * @param {number} mapRadius - Map radius for zone calculation
   * @returns {Object|null} { path: Array<Object>, threatCost: number } or null if no path
   */
  findLowestThreatPath(start, goal, hexes, tierConfig, mapRadius) {
    // Validate inputs
    if (!start || !goal || !hexes || !tierConfig) {
      return null;
    }

    // Check if goal exists in hexes
    const goalHex = hexes.find(h => h.q === goal.q && h.r === goal.r);
    if (!goalHex) {
      return null;
    }

    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map(); // g-score = cumulative threat cost
    const fScore = new Map();

    const startKey = this.hexKey(start);
    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(start, goal, tierConfig));

    let iterations = 0;
    const maxIterations = hexes.length * 2; // Safety limit

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      // Get hex with lowest fScore
      openSet.sort((a, b) =>
        (fScore.get(this.hexKey(a)) || Infinity) -
        (fScore.get(this.hexKey(b)) || Infinity)
      );
      const current = openSet.shift();
      const currentKey = this.hexKey(current);

      // Check if we reached the goal
      if (current.q === goal.q && current.r === goal.r) {
        const path = this.reconstructPath(cameFrom, current, hexes);
        const threatCost = gScore.get(currentKey);
        return { path, threatCost };
      }

      // Explore neighbors
      const neighbors = hexNeighbors(current.q, current.r);
      for (const neighborCoord of neighbors) {
        const neighbor = hexes.find(h => h.q === neighborCoord.q && h.r === neighborCoord.r);

        // Skip if hex doesn't exist (out of bounds)
        if (!neighbor) continue;

        // Calculate threat cost for moving to this neighbor
        const edgeCost = DetectionManager.getHexDetectionCost(neighbor, tierConfig, mapRadius);
        // Safeguard: if edgeCost is undefined/NaN, use default value
        const safeEdgeCost = Number.isFinite(edgeCost) ? edgeCost : 1.5;
        const currentGScore = gScore.get(currentKey);
        const tentativeGScore = (currentGScore ?? 0) + safeEdgeCost;
        const neighborKey = this.hexKey(neighbor);

        if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
          // This path to neighbor is better than any previous one
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal, tierConfig));

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
   * Admissible heuristic for weighted A*
   * Uses minimum possible cost (perimeter zone cost) * distance
   * This ensures we never overestimate the actual cost
   *
   * @param {Object} a - Current hex
   * @param {Object} b - Goal hex
   * @param {Object} tierConfig - Tier configuration
   * @returns {number} Estimated minimum cost to goal
   */
  heuristic(a, b, tierConfig) {
    const distance = axialDistance(a.q, a.r, b.q, b.r);
    // Use minimum zone cost (perimeter = 0.5%) as admissible heuristic
    const minCost = tierConfig?.detectionTriggers?.movementByZone?.perimeter || 0.5;
    return distance * minCost;
  }

  /**
   * Reconstruct path from cameFrom map
   * @param {Map} cameFrom - Map of hex keys to previous hexes
   * @param {Object} current - Goal hex
   * @param {Array<Object>} hexes - All hexes (to get full hex objects)
   * @returns {Array<Object>} Array of hexes from start to goal
   */
  reconstructPath(cameFrom, current, hexes) {
    const path = [current];
    let key = this.hexKey(current);

    while (cameFrom.has(key)) {
      const prev = cameFrom.get(key);
      // Find full hex object from hexes array
      const fullHex = hexes.find(h => h.q === prev.q && h.r === prev.r) || prev;
      path.unshift(fullHex);
      key = this.hexKey(prev);
    }

    return path;
  }

  /**
   * Create unique string key for hex coordinates
   * @param {Object} hex - Hex with q, r coordinates
   * @returns {string} Key in format "q,r"
   */
  hexKey(hex) {
    return `${hex.q},${hex.r}`;
  }

  /**
   * Find the lowest-encounter-chance path between two hexes using weighted A*
   * Unlike findLowestThreatPath which minimizes detection, this minimizes encounter chance
   * Uses the same per-hex encounter chance as MovementController.calculateEncounterRisk()
   *
   * @param {Object} start - Starting hex with q, r coordinates
   * @param {Object} goal - Goal hex with q, r coordinates
   * @param {Array<Object>} hexes - Array of all hexes on map
   * @param {Object} tierConfig - Tier configuration
   * @param {Object} mapData - Map data with encounterByZone
   * @returns {Object|null} { path: Array<Object>, encounterCost: number } or null if no path
   */
  findLowestEncounterPath(start, goal, hexes, tierConfig, mapData) {
    // Validate inputs
    if (!start || !goal || !hexes || !tierConfig) {
      return null;
    }

    // Check if goal exists in hexes
    const goalHex = hexes.find(h => h.q === goal.q && h.r === goal.r);
    if (!goalHex) {
      return null;
    }

    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map(); // g-score = cumulative encounter chance sum
    const fScore = new Map();

    const startKey = this.hexKey(start);
    gScore.set(startKey, 0);
    fScore.set(startKey, this.encounterHeuristic(start, goal));

    let iterations = 0;
    const maxIterations = hexes.length * 2; // Safety limit

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      // Get hex with lowest fScore
      openSet.sort((a, b) =>
        (fScore.get(this.hexKey(a)) || Infinity) -
        (fScore.get(this.hexKey(b)) || Infinity)
      );
      const current = openSet.shift();
      const currentKey = this.hexKey(current);

      // Check if we reached the goal
      if (current.q === goal.q && current.r === goal.r) {
        const path = this.reconstructPath(cameFrom, current, hexes);
        const encounterCost = gScore.get(currentKey);
        return { path, encounterCost };
      }

      // Explore neighbors
      const neighbors = hexNeighbors(current.q, current.r);
      for (const neighborCoord of neighbors) {
        const neighbor = hexes.find(h => h.q === neighborCoord.q && h.r === neighborCoord.r);

        // Skip if hex doesn't exist (out of bounds)
        if (!neighbor) continue;

        // Calculate encounter chance for moving to this neighbor
        const edgeCost = MovementController.getHexEncounterChance(neighbor, tierConfig, mapData);
        // Safeguard: if edgeCost is undefined/NaN, use default value
        const safeEdgeCost = Number.isFinite(edgeCost) ? edgeCost : 5;
        const currentGScore = gScore.get(currentKey);
        const tentativeGScore = (currentGScore ?? 0) + safeEdgeCost;
        const neighborKey = this.hexKey(neighbor);

        if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
          // This path to neighbor is better than any previous one
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + this.encounterHeuristic(neighbor, goal));

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
   * Admissible heuristic for encounter-based A*
   * Uses 0 as we don't know minimum encounter chance ahead of time
   * This ensures we never overestimate (Dijkstra-like behavior)
   *
   * @param {Object} a - Current hex
   * @param {Object} b - Goal hex
   * @returns {number} Estimated minimum cost to goal
   */
  encounterHeuristic(a, b) {
    // Use distance * minimum possible encounter chance (0 for gates/empty perimeter)
    // Since we can't guarantee minimum, use 0 for admissibility (becomes Dijkstra)
    return 0;
  }

  /**
   * Find the nearest extractable gate with lowest threat cost
   * Excludes the insertion gate (where player entered)
   *
   * @param {Object} position - Current position { q, r }
   * @param {Object} mapData - Map data with gates array
   * @param {Object} tierConfig - Tier configuration
   * @param {Object} runState - Run state containing insertionGate
   * @returns {Object|null} { gate, path, threatCost } or null if no gates reachable
   */
  findNearestExtractableGate(position, mapData, tierConfig, runState) {
    if (!mapData?.gates || mapData.gates.length === 0) {
      return null;
    }

    const insertionGate = runState?.insertionGate;
    const mapRadius = mapData.radius || 5;

    let bestResult = null;

    for (const gate of mapData.gates) {
      // Skip insertion gate
      if (insertionGate &&
          gate.q === insertionGate.q &&
          gate.r === insertionGate.r) {
        continue;
      }

      // Find lowest-threat path to this gate
      const pathResult = this.findLowestThreatPath(
        position,
        gate,
        mapData.hexes,
        tierConfig,
        mapRadius
      );

      if (pathResult) {
        if (!bestResult || pathResult.threatCost < bestResult.threatCost) {
          bestResult = {
            gate,
            path: pathResult.path,
            threatCost: pathResult.threatCost
          };
        }
      }
    }

    return bestResult;
  }

  /**
   * Calculate escape routes from current position and after journey
   *
   * @param {Object} currentPosition - Player's current position
   * @param {Object} lastWaypointPosition - Last waypoint position (or current if no waypoints)
   * @param {number} currentDetection - Current detection level (0-100)
   * @param {number} journeyEndDetection - Detection after completing journey
   * @param {Object} mapData - Map data with hexes and gates
   * @param {Object} tierConfig - Tier configuration
   * @param {Object} runState - Run state containing insertionGate
   * @returns {Object} { fromCurrent, afterJourney, noPathExists }
   */
  calculateEscapeRoutes(
    currentPosition,
    lastWaypointPosition,
    currentDetection,
    journeyEndDetection,
    mapData,
    tierConfig,
    runState
  ) {
    // Calculate escape from current position
    const fromCurrentResult = this.findNearestExtractableGate(
      currentPosition,
      mapData,
      tierConfig,
      runState
    );

    // Calculate escape from last waypoint (after journey)
    const afterJourneyResult = this.findNearestExtractableGate(
      lastWaypointPosition,
      mapData,
      tierConfig,
      runState
    );

    // Check if no paths exist
    if (!fromCurrentResult && !afterJourneyResult) {
      return {
        fromCurrent: null,
        afterJourney: null,
        noPathExists: true
      };
    }

    // Build fromCurrent result
    let fromCurrent = null;
    if (fromCurrentResult) {
      const totalAfterEscape = currentDetection + fromCurrentResult.threatCost;
      fromCurrent = {
        threatCost: fromCurrentResult.threatCost,
        totalAfterEscape,
        wouldMIA: totalAfterEscape >= 100,
        gate: fromCurrentResult.gate,
        path: fromCurrentResult.path
      };
    }

    // Build afterJourney result
    let afterJourney = null;
    if (afterJourneyResult) {
      const totalAfterEscape = journeyEndDetection + afterJourneyResult.threatCost;
      afterJourney = {
        threatCost: afterJourneyResult.threatCost,
        totalAfterEscape,
        wouldMIA: totalAfterEscape >= 100,
        gate: afterJourneyResult.gate,
        path: afterJourneyResult.path
      };
    }

    return {
      fromCurrent,
      afterJourney,
      noPathExists: false
    };
  }
}

// Export singleton instance
export default new EscapeRouteCalculator();
