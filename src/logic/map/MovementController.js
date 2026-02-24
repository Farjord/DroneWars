// ========================================
// MOVEMENT CONTROLLER
// ========================================
// Handles player movement on tactical map for Exploring the Eremos mode
// Uses A* pathfinding to calculate valid paths
// Integrates with DetectionManager for movement costs

import PathValidator from './PathValidator.js';
import DetectionManager from '../detection/DetectionManager.js';
import gameStateManager from '../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js';
import { mapTiers } from '../../data/mapData.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * MovementController - Singleton controller for player movement
 *
 * Handles:
 * - Path calculation using A*
 * - Movement validation (path exists, detection check)
 * - Detection cost calculation
 * - Player position updates
 * - Hex arrival triggers (PoI encounters, gate extraction)
 */
class MovementController {
  constructor() {
    // Singleton instance
    if (MovementController.instance) {
      return MovementController.instance;
    }
    MovementController.instance = this;

    // Initialize PathValidator
    this.pathValidator = new PathValidator();
  }

  /**
   * Calculate path from current to target using A*
   * @param {Object} current - Current hex {q, r}
   * @param {Object} target - Target hex {q, r}
   * @param {Array<Object>} hexes - All hexes on map
   * @returns {Array<Object>|null} Path array or null if no path exists
   */
  calculatePath(current, target, hexes) {
    // Use PathValidator's A* implementation
    const path = this.pathValidator.findPath(current, target, hexes);
    return path;
  }

  /**
   * Calculate detection cost for a path using zone-based rates
   * @param {Array<Object>} path - Path from calculatePath
   * @param {Object} tierConfig - Tier configuration from mapData.js
   * @param {number} mapRadius - Map radius for zone calculation (optional)
   * @returns {number} Total detection cost
   */
  calculateDetectionCost(path, tierConfig, mapRadius = 5) {
    if (!path || path.length === 0) return 0;

    // Use DetectionManager's zone-based calculation
    return DetectionManager.calculatePathDetectionCost(path, tierConfig, mapRadius);
  }

  /**
   * Check if move is valid (path exists, detection check)
   * @param {Object} current - Current hex {q, r}
   * @param {Object} target - Target hex {q, r}
   * @param {Array<Object>} hexes - All hexes on map
   * @param {Object} tierConfig - Tier configuration
   * @returns {Object} Validation result { valid, reason?, path?, cost? }
   */
  isValidMove(current, target, hexes, tierConfig) {
    // Can't move to current position
    if (current.q === target.q && current.r === target.r) {
      return { valid: false, reason: 'Already at this location' };
    }

    // Calculate path
    const path = this.calculatePath(current, target, hexes);
    if (!path) {
      return { valid: false, reason: 'No path exists' };
    }

    // Calculate detection cost
    const cost = this.calculateDetectionCost(path, tierConfig);
    const currentDetection = DetectionManager.getCurrentDetection();
    const newDetection = currentDetection + cost;

    // Check if move would trigger MIA
    if (newDetection > 100) {
      return {
        valid: false,
        reason: 'Would trigger MIA (100% detection)',
        path,
        cost
      };
    }

    return { valid: true, path, cost };
  }

  /**
   * Execute player movement to target hex
   * @param {Object} targetHex - Target hex object
   * @param {Object} gameState - Current game state
   * @returns {boolean} Success
   */
  movePlayer(targetHex, gameState) {
    const currentRunState = tacticalMapStateManager.getState();

    if (!currentRunState || !currentRunState.mapData) {
      debugLog('MOVEMENT_EFFECT', '[Movement] Cannot move: No active run');
      return false;
    }

    const { mapData, playerPosition } = currentRunState;
    const tierConfig = mapTiers[mapData.tier - 1];

    // Validate move
    const validation = this.isValidMove(
      playerPosition,
      targetHex,
      mapData.hexes,
      tierConfig
    );

    if (!validation.valid) {
      debugLog('MOVEMENT_EFFECT', `[Movement] Invalid move: ${validation.reason}`);
      return false;
    }

    const { path, cost } = validation;

    debugLog('MOVEMENT_EFFECT', `[Movement] Moving ${path.length - 1} hexes (cost: +${cost.toFixed(1)}% detection)`);

    // Add detection
    DetectionManager.addDetection(cost, 'Movement');

    // Update player position
    tacticalMapStateManager.setState({
      playerPosition: targetHex
    });

    // Handle hex arrival triggers
    this.handleHexArrival(targetHex, gameState);

    return true;
  }

  /**
   * Handle arriving at a hex (trigger encounters, extraction, etc.)
   * @param {Object} hex - Arrived hex
   * @param {Object} gameState - Current game state
   */
  handleHexArrival(hex, gameState) {
    debugLog('MOVEMENT_EFFECT', `[Movement] Arrived at hex (${hex.q}, ${hex.r}) - Type: ${hex.type}`);

    // Phase 6: PoI encounters
    if (hex.type === 'poi') {
      debugLog('MOVEMENT_EFFECT', `[Movement] PoI encounter: ${hex.poiType}`);
      // TODO: Trigger EncounterController
    }

    // Phase 9: Extraction gates
    else if (hex.type === 'gate') {
      debugLog('MOVEMENT_EFFECT', '[Movement] Arrived at extraction gate');
      // TODO: Trigger ExtractionController
    }

    // Empty hex - no special behavior
    else {
      debugLog('MOVEMENT_EFFECT', '[Movement] Empty hex - no encounter');
    }
  }

  /**
   * Get movement preview data for UI
   * @param {Object} current - Current hex
   * @param {Object} target - Target hex
   * @param {Array<Object>} hexes - All hexes
   * @param {Object} tierConfig - Tier configuration
   * @returns {Object} Preview data { path, cost, valid, reason }
   */
  getMovementPreview(current, target, hexes, tierConfig) {
    const validation = this.isValidMove(current, target, hexes, tierConfig);

    const currentDetection = DetectionManager.getCurrentDetection();
    const newDetection = currentDetection + (validation.cost || 0);

    return {
      path: validation.path || null,
      cost: validation.cost || 0,
      valid: validation.valid,
      reason: validation.reason || '',
      currentDetection,
      newDetection,
      distance: validation.path ? validation.path.length - 1 : 0
    };
  }

  /**
   * Get encounter chance for a single hex based on type and zone
   * Uses map's pre-calculated zone encounter rates when available
   * @param {Object} hex - Hex object
   * @param {Object} tierConfig - Tier configuration with encounterChance
   * @param {Object} mapData - Map data with encounterByZone (optional)
   * @returns {number} Encounter chance percentage (0-100)
   */
  getHexEncounterChance(hex, tierConfig, mapData = null) {
    if (hex.type === 'poi') {
      // PoIs use the salvage system, not movement encounters
      // Return 0 - no random encounter risk when moving to a PoI
      return 0;
    }
    if (hex.type === 'gate') {
      return tierConfig?.encounterChance?.gate || 0;
    }

    // Empty hex: use zone-based encounter chance from map data if available
    if (mapData?.encounterByZone && hex.zone) {
      return mapData.encounterByZone[hex.zone] || 5;
    }

    // Fallback to tier config (handle both object and number formats)
    const emptyChance = tierConfig?.encounterChance?.empty;
    if (typeof emptyChance === 'number') {
      return emptyChance;
    }
    // Object format: use midpoint of range as display value
    if (typeof emptyChance === 'object' && emptyChance.min !== undefined) {
      return Math.round((emptyChance.min + emptyChance.max) / 2);
    }
    return 5;
  }

  /**
   * Calculate probability of at least one encounter for a path
   * Uses formula: P(at least one) = 1 - P(no encounters)
   * where P(no encounters) = (1-p1) × (1-p2) × ... for each hex
   *
   * @param {Array<Object>} path - Array of hex objects in path
   * @param {Object} tierConfig - Tier configuration with encounterChance
   * @param {Object} mapData - Map data with encounterByZone (optional)
   * @returns {number} Probability 0-100 of at least one encounter
   */
  calculateEncounterRisk(path, tierConfig, mapData = null) {
    if (!path || path.length <= 1) return 0;

    let pNoEncounter = 1.0;

    // Skip first hex (starting position - already there)
    for (let i = 1; i < path.length; i++) {
      const hex = path[i];
      const chance = this.getHexEncounterChance(hex, tierConfig, mapData) / 100;
      pNoEncounter *= (1 - chance);
    }

    return (1 - pNoEncounter) * 100;
  }
}

// Export singleton instance
export default new MovementController();
