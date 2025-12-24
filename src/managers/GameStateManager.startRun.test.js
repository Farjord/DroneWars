/**
 * GameStateManager startRun() Tests
 * TDD: Tests written first to ensure proper state cleanup between runs
 *
 * These tests verify:
 * - runAbandoning flag is cleared when starting new run
 * - Blockade flags are initialized to false in new runState
 * - Combat can initialize after a previous run was abandoned
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import gameStateManager from './GameStateManager.js';
import ExtractionController from '../logic/singlePlayer/ExtractionController.js';

// Mock map data for tests
const createMockMap = (name = 'Test Map') => ({
  name,
  tier: 1,
  hexes: [{ q: 0, r: 0, type: 'empty' }],
  gates: [{ q: 0, r: 0, type: 'gate', gateId: 0 }],
  pois: [],
  poiCount: 0,
  gateCount: 1,
  baseDetection: 0
});

describe('GameStateManager - startRun() State Cleanup', () => {
  beforeEach(() => {
    // Reset to clean state before each test
    gameStateManager.setState({
      appState: 'hangar',
      gameActive: false,
      turnPhase: null,
      gameStage: 'preGame',
      roundNumber: 0,
      currentRunState: null,
      runAbandoning: false,
      showFailedRunScreen: false,
      failedRunType: null,
      // Single player profile with ship slots needed for startRun
      singlePlayerProfile: {
        gameSeed: 12345,
        stats: { runsCompleted: 0, runsLost: 0 }
      },
      singlePlayerShipSlots: [
        {
          id: 0,
          name: 'Starter Ship',
          status: 'active',
          shipId: 'default',
          sectionSlots: {
            bridge: { componentId: null, damage: 0 },
            powerCell: { componentId: null, damage: 0 },
            droneControlHub: { componentId: null, damage: 0 }
          },
          deck: [],
          droneSlots: []
        }
      ],
      singlePlayerShipComponentInstances: []
    });
  });

  describe('runAbandoning flag cleanup', () => {
    it('should clear runAbandoning flag when starting a new run', () => {
      // Setup: Simulate abandoned run state with stale flag
      gameStateManager.setState({ runAbandoning: true });
      expect(gameStateManager.get('runAbandoning')).toBe(true);

      // Act: Start new run
      const mockMap = createMockMap();
      gameStateManager.startRun(0, 1, 0, mockMap, null);

      // Assert: Flag should be cleared
      expect(gameStateManager.get('runAbandoning')).toBe(false);
    });

    it('should clear runAbandoning even if completeFailedRunTransition was not called', () => {
      // Setup: Set runAbandoning but don't call completeFailedRunTransition
      // This simulates a race condition or edge case
      gameStateManager.setState({
        runAbandoning: true,
        appState: 'hangar'  // Somehow got to hangar without clearing flag
      });

      // Act: Start new run
      const mockMap = createMockMap();
      gameStateManager.startRun(0, 1, 0, mockMap, null);

      // Assert: Flag should still be cleared
      expect(gameStateManager.get('runAbandoning')).toBe(false);
    });
  });

  describe('blockade flags initialization', () => {
    it('should initialize pendingBlockadeExtraction as false in new runState', () => {
      // Act: Start new run
      const mockMap = createMockMap();
      gameStateManager.startRun(0, 1, 0, mockMap, null);

      // Assert: Blockade flag should be explicitly false
      const runState = gameStateManager.get('currentRunState');
      expect(runState.pendingBlockadeExtraction).toBe(false);
    });

    it('should initialize blockadeCleared as false in new runState', () => {
      // Act: Start new run
      const mockMap = createMockMap();
      gameStateManager.startRun(0, 1, 0, mockMap, null);

      // Assert: Blockade flag should be explicitly false
      const runState = gameStateManager.get('currentRunState');
      expect(runState.blockadeCleared).toBe(false);
    });

    it('should not inherit blockade flags from previous run', () => {
      // Setup: Simulate a previous run with blockade flags set
      // (This mimics the bug where flags persisted)
      gameStateManager.setState({
        currentRunState: {
          shipSlotId: 0,
          pendingBlockadeExtraction: true,
          blockadeCleared: true
        }
      });

      // Clear the run state (as endRun would)
      gameStateManager.setState({ currentRunState: null });

      // Act: Start new run
      const mockMap = createMockMap();
      gameStateManager.startRun(0, 1, 0, mockMap, null);

      // Assert: New runState should have fresh flags
      const runState = gameStateManager.get('currentRunState');
      expect(runState.pendingBlockadeExtraction).toBe(false);
      expect(runState.blockadeCleared).toBe(false);
    });
  });

  describe('full abandon/restart cycle', () => {
    it('should allow clean restart after abandon without going through failed run screen', () => {
      // Setup: Start first run
      const mockMap1 = createMockMap('Map 1');
      gameStateManager.startRun(0, 1, 0, mockMap1, null);
      expect(gameStateManager.get('currentRunState')).not.toBeNull();

      // Abandon the run (sets runAbandoning: true)
      ExtractionController.abandonRun();
      expect(gameStateManager.get('runAbandoning')).toBe(true);

      // Simulate going to hangar without completeFailedRunTransition
      // (edge case - maybe user closed failed run screen early)
      gameStateManager.setState({
        appState: 'hangar',
        showFailedRunScreen: false
        // Note: runAbandoning still true!
      });

      // Act: Start second run
      const mockMap2 = createMockMap('Map 2');
      gameStateManager.startRun(0, 1, 0, mockMap2, null);

      // Assert: Should have clean state
      expect(gameStateManager.get('runAbandoning')).toBe(false);
      expect(gameStateManager.get('currentRunState')).not.toBeNull();
      expect(gameStateManager.get('currentRunState').mapData.name).toBe('Map 2');
    });

    it('should allow clean restart after normal abandon flow', () => {
      // Setup: Start first run
      const mockMap1 = createMockMap('Map 1');
      gameStateManager.startRun(0, 1, 0, mockMap1, null);

      // Abandon the run through normal flow
      ExtractionController.abandonRun();
      ExtractionController.completeFailedRunTransition();

      // Verify flag was cleared by completeFailedRunTransition
      expect(gameStateManager.get('runAbandoning')).toBe(false);

      // Act: Start second run
      const mockMap2 = createMockMap('Map 2');
      gameStateManager.startRun(0, 1, 0, mockMap2, null);

      // Assert: Should have clean state
      expect(gameStateManager.get('runAbandoning')).toBe(false);
      const runState = gameStateManager.get('currentRunState');
      expect(runState.pendingBlockadeExtraction).toBe(false);
      expect(runState.blockadeCleared).toBe(false);
    });
  });
});
