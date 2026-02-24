// ========================================
// GAME DATA SERVICE
// ========================================
// Centralized data computation layer for all dynamic game data
// Eliminates scattered calculateEffectiveStats calls across the application
// Provides caching and consistent data access patterns

import { calculateEffectiveStats, calculateEffectiveShipStats } from '../logic/statsCalculator.js';
import gameDataCache from './gameDataCache.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * GameDataService - Centralized computation layer for game data
 *
 * Purpose:
 * - Single source for calculateEffectiveStats and calculateEffectiveShipStats
 * - Eliminates 78 scattered calculation calls across multiple files
 * - Provides caching for expensive calculations
 * - Maintains server-ready architecture principles
 */
class GameDataService {
  // Singleton instance
  static instance = null;

  /**
   * Get singleton instance of GameDataService
   * @param {Object} gameStateManager - GameStateManager instance
   * @returns {GameDataService} Single shared instance
   */
  static getInstance(gameStateManager) {
    if (!GameDataService.instance) {
      GameDataService.instance = new GameDataService(gameStateManager);
    }
    return GameDataService.instance;
  }

  /**
   * Reset singleton instance (for testing and new games)
   */
  static reset() {
    if (GameDataService.instance && GameDataService.instance.stateSubscriptionCleanup) {
      GameDataService.instance.stateSubscriptionCleanup();
    }
    GameDataService.instance = null;
    debugLog('STATE_SYNC', '🎯 GameDataService singleton reset');
  }

  constructor(gameStateManager) {
    // Enforce singleton pattern
    if (GameDataService.instance) {
      debugLog('STATE_SYNC', '⚠️ GameDataService already exists. Use getInstance() instead of new GameDataService()');
      return GameDataService.instance;
    }

    this.gameStateManager = gameStateManager;
    this.cache = gameDataCache;

    // Subscribe to game state changes to invalidate cache
    this.stateSubscriptionCleanup = this.gameStateManager.subscribe(() => {
      this.cache.invalidateAll();
    });

    debugLog('STATE_SYNC', '🎯 GameDataService initialized');
  }

  /**
   * Get effective stats for a drone in a specific lane
   * Replaces direct calculateEffectiveStats calls
   *
   * @param {Object} drone - Drone object with name, stats, etc.
   * @param {string} lane - Lane identifier (lane1, lane2, lane3)
   * @param {Object} options - Optional overrides for AI evaluation scenarios
   * @param {Object} options.playerState - Override player state (for temp/evaluation states)
   * @param {Object} options.opponentState - Override opponent state
   * @param {Object} options.placedSections - Override placed sections
   * @returns {Object} Effective stats with attack, speed, hull, shields, etc.
   */
  getEffectiveStats(drone, lane, options = {}) {
    if (!drone || !lane) {
      return { attack: 0, speed: 0, hull: 0, maxShields: 0, cost: 0, baseAttack: 0, baseSpeed: 0, baseCost: 0, keywords: new Set() };
    }

    // Extract overrides from options
    const { playerState: overridePlayerState, opponentState: overrideOpponentState, placedSections: overridePlacedSections } = options;

    let playerState, opponentState, placedSections;

    // If overrides are provided, use them directly (for AI evaluation scenarios)
    if (overridePlayerState && overrideOpponentState) {
      playerState = overridePlayerState;
      opponentState = overrideOpponentState;
      placedSections = overridePlacedSections || this.getPlacedSectionsForEngine();

      // Get game context for conditional abilities (e.g., NOT_FIRST_ACTION)
      const gameState = this.gameStateManager.getState();
      const gameContext = {
        actionsTakenThisTurn: gameState.actionsTakenThisTurn || 0
      };

      // Calculate effective stats WITHOUT caching (temp states shouldn't be cached)
      return calculateEffectiveStats(
        drone,
        lane,
        playerState,
        opponentState,
        placedSections,
        gameContext
      );
    }

    // Normal path: use live game state with caching

    // Generate cache key
    const cacheKey = this.cache.generateKey('effectiveStats', drone.id || drone.name, lane);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get current game state
    const gameState = this.gameStateManager.getState();
    const localPlayerId = this.gameStateManager.getLocalPlayerId();
    const opponentPlayerId = this.gameStateManager.getOpponentPlayerId();

    const localPlayerState = gameState[localPlayerId];
    const opponentPlayerState = gameState[opponentPlayerId];

    // Get placed sections for engine
    placedSections = this.getPlacedSectionsForEngine();

    // Determine which player owns this drone
    const isDroneOwnedByLocal = this.isDroneOwnedByPlayer(drone, localPlayerState);
    playerState = isDroneOwnedByLocal ? localPlayerState : opponentPlayerState;
    opponentState = isDroneOwnedByLocal ? opponentPlayerState : localPlayerState;

    // Build game context for conditional abilities (e.g., NOT_FIRST_ACTION)
    const gameContext = {
      actionsTakenThisTurn: gameState.actionsTakenThisTurn || 0
    };

    // Calculate effective stats using game engine
    const effectiveStats = calculateEffectiveStats(
      drone,
      lane,
      playerState,
      opponentState,
      placedSections,
      gameContext
    );

    // Cache the result
    this.cache.set(cacheKey, effectiveStats);

    return effectiveStats;
  }

  /**
   * Get effective ship stats for a player with placed sections
   * Replaces direct calculateEffectiveShipStats calls
   *
   * @param {Object} playerState - Player state object with shipSections
   * @param {Array} placedSections - Array of placed section names
   * @returns {Object} Ship stats with totals and bySection data
   */
  getEffectiveShipStats(playerState, placedSections = []) {
    if (!playerState) {
      return {
        totals: { handLimit: 0, discardLimit: 0, energyPerTurn: 0, maxEnergy: 0, shieldsPerTurn: 0, initialDeployment: 0, deploymentBudget: 0, cpuLimit: 0 },
        bySection: {}
      };
    }

    // Generate cache key based on player identity and placed sections
    const playerId = this.getPlayerIdFromState(playerState);
    const sectionsKey = Array.isArray(placedSections) ? placedSections.join(',') : 'none';
    const cacheKey = this.cache.generateKey('effectiveShipStats', playerId, sectionsKey);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate effective ship stats using game engine
    const effectiveShipStats = calculateEffectiveShipStats(playerState, placedSections);

    // Cache the result
    this.cache.set(cacheKey, effectiveShipStats);

    return effectiveShipStats;
  }

  /**
   * Get placed sections in the format expected by game engine
   * Replaces getPlacedSectionsForEngine() helper from App.jsx
   */
  getPlacedSectionsForEngine() {
    const gameState = this.gameStateManager.getState();
    const localPlayerId = this.gameStateManager.getLocalPlayerId();
    const opponentPlayerId = this.gameStateManager.getOpponentPlayerId();

    return {
      [localPlayerId]: localPlayerId === 'player1' ? gameState.placedSections : gameState.opponentPlacedSections,
      [opponentPlayerId]: opponentPlayerId === 'player1' ? gameState.placedSections : gameState.opponentPlacedSections
    };
  }

  /**
   * Check if a drone is owned by a specific player
   * Helper method for determining player/opponent context
   */
  isDroneOwnedByPlayer(drone, playerState) {
    if (!drone || !playerState) return false;

    // Check if drone is in any of the player's lanes
    // Only use ID for matching - name fallback causes cross-player contamination
    for (const lane of ['lane1', 'lane2', 'lane3']) {
      const dronesInLane = playerState.dronesOnBoard[lane] || [];
      if (dronesInLane.some(d => d.id === drone.id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get player ID from player state for cache key generation
   * Helper method for ship stats caching
   */
  getPlayerIdFromState(playerState) {
    const gameState = this.gameStateManager.getState();
    const localPlayerId = this.gameStateManager.getLocalPlayerId();
    const opponentPlayerId = this.gameStateManager.getOpponentPlayerId();

    // Compare by reference to determine which player this is
    if (playerState === gameState[localPlayerId]) {
      return localPlayerId;
    } else if (playerState === gameState[opponentPlayerId]) {
      return opponentPlayerId;
    }

    // Fallback: generate a hash-based identifier
    return `player_${JSON.stringify(playerState.shipSections || {}).length}`;
  }

  /**
   * Get comprehensive lane data with all effective stats pre-computed
   * Useful for UI components that need multiple drone stats
   */
  getLaneData(lane) {
    const gameState = this.gameStateManager.getState();
    const localPlayerId = this.gameStateManager.getLocalPlayerId();
    const opponentPlayerId = this.gameStateManager.getOpponentPlayerId();

    const localPlayerState = gameState[localPlayerId];
    const opponentPlayerState = gameState[opponentPlayerId];

    const localDrones = (localPlayerState.dronesOnBoard[lane] || []).map(drone => ({
      ...drone,
      effectiveStats: this.getEffectiveStats(drone, lane),
      isPlayer: true
    }));

    const opponentDrones = (opponentPlayerState.dronesOnBoard[lane] || []).map(drone => ({
      ...drone,
      effectiveStats: this.getEffectiveStats(drone, lane),
      isPlayer: false
    }));

    return {
      lane,
      localDrones,
      opponentDrones,
      hasGuardian: this.hasGuardianInLane(lane, opponentDrones)
    };
  }

  /**
   * Check if a lane has a Guardian drone
   * Common check used throughout the application
   */
  hasGuardianInLane(lane, drones = null) {
    if (!drones) {
      const laneData = this.getLaneData(lane);
      drones = laneData.opponentDrones;
    }

    return drones.some(drone => {
      const stats = drone.effectiveStats || this.getEffectiveStats(drone, lane);
      return stats.keywords.has('GUARDIAN');
    });
  }

  /**
   * Get effective max shields for a ship section
   * Includes middle lane bonuses for shield capacity
   *
   * @param {string} sectionName - Name of the ship section
   * @param {Object} playerState - Player state object
   * @param {Array} placedSections - Array of placed section names
   * @returns {number} Effective maximum shields for the section
   */
  getEffectiveSectionMaxShields(sectionName, playerState, placedSections = []) {
    if (!playerState || !playerState.shipSections || !playerState.shipSections[sectionName]) {
      return 0;
    }

    const section = playerState.shipSections[sectionName];
    let effectiveMax = section.shields;

    const laneIndex = placedSections.indexOf(sectionName);
    // If the section is in the middle lane and has a shield bonus
    if (laneIndex === 1 && section.middleLaneBonus && section.middleLaneBonus['Shields Per Turn']) {
        // Assume the bonus to shields per turn also increases max shields by the same amount.
        effectiveMax += section.middleLaneBonus['Shields Per Turn'];
    }

    return effectiveMax;
  }

  /**
   * Get cache statistics for performance monitoring
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear all cached data (useful for testing or manual cache reset)
   */
  clearCache() {
    this.cache.invalidateAll();
  }
}

export default GameDataService;