/**
 * GameStateManager Save/Load Tests - Quick Deployments
 * TDD: Tests written first to verify quickDeployments persistence
 */

import { describe, it, expect, beforeEach } from 'vitest';
import gameStateManager from './GameStateManager.js';

describe('GameStateManager - Quick Deployments Save/Load', () => {
  const mockQuickDeployments = [
    {
      id: 'qd_test_1',
      name: 'Test Deployment 1',
      createdAt: 1700000000000,
      droneRoster: ['Dart', 'Fighter Drone', 'Support Drone', 'Heavy Drone', 'Stealth Drone'],
      placements: [
        { droneName: 'Dart', lane: 0 },
        { droneName: 'Fighter Drone', lane: 1 }
      ]
    },
    {
      id: 'qd_test_2',
      name: 'Test Deployment 2',
      createdAt: 1700000001000,
      droneRoster: ['Dart', 'Fighter Drone', 'Support Drone', 'Heavy Drone', 'Stealth Drone'],
      placements: []
    }
  ];

  const createBaseSaveData = (overrides = {}) => ({
    playerProfile: { credits: 100, gameSeed: 12345 },
    inventory: {},
    droneInstances: [],
    shipComponentInstances: [],
    discoveredCards: [],
    shipSlots: [],
    currentRunState: null,
    ...overrides
  });

  beforeEach(() => {
    // Reset quickDeployments state before each test
    gameStateManager.setState({ quickDeployments: [] });
  });

  describe('loadSinglePlayerSave', () => {
    it('should load quickDeployments from save data', () => {
      const saveData = createBaseSaveData({
        quickDeployments: mockQuickDeployments
      });

      gameStateManager.loadSinglePlayerSave(saveData);

      const state = gameStateManager.getState();
      expect(state.quickDeployments).toEqual(mockQuickDeployments);
      expect(state.quickDeployments).toHaveLength(2);
    });

    it('should default to empty array if quickDeployments missing (backwards compat)', () => {
      const saveData = createBaseSaveData();
      // No quickDeployments field - simulates older save file

      gameStateManager.loadSinglePlayerSave(saveData);

      const state = gameStateManager.getState();
      expect(state.quickDeployments).toEqual([]);
    });
  });

  describe('getSaveData', () => {
    it('should include quickDeployments in save data', () => {
      // Set up state with quick deployments
      gameStateManager.setState({ quickDeployments: mockQuickDeployments });

      const saveData = gameStateManager.getSaveData();

      expect(saveData.quickDeployments).toBeDefined();
      expect(saveData.quickDeployments).toEqual(mockQuickDeployments);
    });

    it('should return empty array when no quick deployments exist', () => {
      gameStateManager.setState({ quickDeployments: [] });

      const saveData = gameStateManager.getSaveData();

      expect(saveData.quickDeployments).toEqual([]);
    });
  });

  describe('round-trip persistence', () => {
    it('should preserve quickDeployments through save/load cycle', () => {
      // Set up initial state with deployments
      gameStateManager.setState({ quickDeployments: mockQuickDeployments });

      // Get save data (simulate saving)
      const saveData = gameStateManager.getSaveData();

      // Clear state (simulate app restart)
      gameStateManager.setState({ quickDeployments: [] });

      // Load save data (simulate loading)
      gameStateManager.loadSinglePlayerSave(saveData);

      // Verify persistence
      const state = gameStateManager.getState();
      expect(state.quickDeployments).toEqual(mockQuickDeployments);
    });
  });
});
