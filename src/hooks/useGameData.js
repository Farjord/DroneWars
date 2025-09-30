// ========================================
// USE GAME DATA HOOK
// ========================================
// React hook for accessing GameDataService with automatic state updates
// Provides clean API for components to access computed game data

import { useState, useEffect, useMemo } from 'react';
import GameDataService from '../services/GameDataService.js';
import { useGameState } from './useGameState.js';

/**
 * useGameData - React hook for accessing computed game data
 *
 * Features:
 * - Automatic GameDataService instance management
 * - Integration with existing useGameState hook
 * - Cache performance monitoring
 * - Clean API for components
 *
 * @returns {Object} Game data service and utilities
 */
export const useGameData = () => {
  const { gameStateManager } = useGameState();

  // Create GameDataService instance (memoized to prevent recreation)
  const gameDataService = useMemo(() => {
    if (!gameStateManager) return null;
    return GameDataService.getInstance(gameStateManager);
  }, [gameStateManager]);

  // Track cache stats for debugging/optimization
  const [cacheStats, setCacheStats] = useState(null);

  // Update cache stats periodically
  useEffect(() => {
    if (!gameDataService) return;

    const updateStats = () => {
      setCacheStats(gameDataService.getCacheStats());
    };

    // Update stats initially and then periodically
    updateStats();
    const interval = setInterval(updateStats, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [gameDataService]);

  // Convenience methods that wrap GameDataService functionality
  const getEffectiveStats = (drone, lane) => {
    if (!gameDataService) return { attack: 0, speed: 0, hull: 0, maxShields: 0, cost: 0, baseAttack: 0, baseSpeed: 0, baseCost: 0, keywords: new Set() };
    return gameDataService.getEffectiveStats(drone, lane);
  };

  const getLaneData = (lane) => {
    if (!gameDataService) return { lane, localDrones: [], opponentDrones: [], hasGuardian: false };
    return gameDataService.getLaneData(lane);
  };

  const hasGuardianInLane = (lane, drones = null) => {
    if (!gameDataService) return false;
    return gameDataService.hasGuardianInLane(lane, drones);
  };

  const getPlacedSections = () => {
    if (!gameDataService) return {};
    return gameDataService.getPlacedSectionsForEngine();
  };

  const getEffectiveShipStats = (playerState, placedSections = []) => {
    if (!gameDataService) return {
      totals: { handLimit: 0, discardLimit: 0, energyPerTurn: 0, maxEnergy: 0, shieldsPerTurn: 0, initialDeployment: 0, deploymentBudget: 0, cpuLimit: 0 },
      bySection: {}
    };
    return gameDataService.getEffectiveShipStats(playerState, placedSections);
  };

  const clearCache = () => {
    if (gameDataService) {
      gameDataService.clearCache();
    }
  };

  return {
    // Core service instance
    gameDataService,

    // Convenience methods
    getEffectiveStats,
    getEffectiveShipStats,
    getLaneData,
    hasGuardianInLane,
    getPlacedSections,

    // Cache management
    clearCache,
    cacheStats,

    // Status
    isReady: !!gameDataService
  };
};

export default useGameData;