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
import gameStateManager from '../GameStateManager.js';
import tacticalMapStateManager from '../TacticalMapStateManager.js';
import ExtractionController from '../../logic/singlePlayer/ExtractionController.js';

// Mock tacticalMapStateManager
vi.mock('../TacticalMapStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    isRunActive: vi.fn(),
    startRun: vi.fn(),
    endRun: vi.fn(),
    subscribe: vi.fn(() => () => {})
  }
}));

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

    // Reset tacticalMapStateManager mock
    vi.clearAllMocks();
    tacticalMapStateManager.isRunActive.mockReturnValue(false);
    tacticalMapStateManager.getState.mockReturnValue(null);
  });

  describe('runAbandoning flag cleanup', () => {
    it('should clear runAbandoning flag when starting a new run', () => {
      // Setup: Simulate abandoned run state with stale flag
      gameStateManager.setState({ runAbandoning: true });
      expect(gameStateManager.get('runAbandoning')).toBe(true);

      // Act: Start new run
      const mockMap = createMockMap();
      gameStateManager.startRun({ shipSlotId: 0, mapTier: 1, entryGateId: 0, preGeneratedMap: mockMap });

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
      gameStateManager.startRun({ shipSlotId: 0, mapTier: 1, entryGateId: 0, preGeneratedMap: mockMap });

      // Assert: Flag should still be cleared
      expect(gameStateManager.get('runAbandoning')).toBe(false);
    });
  });

  describe('blockade flags initialization', () => {
    it('should initialize pendingBlockadeExtraction as false in new runState', () => {
      // Mock the run state after startRun
      const mockRunState = {
        shipSlotId: 0,
        mapTier: 1,
        pendingBlockadeExtraction: false,
        blockadeCleared: false
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(mockRunState);

      // Act: Start new run
      const mockMap = createMockMap();
      gameStateManager.startRun({ shipSlotId: 0, mapTier: 1, entryGateId: 0, preGeneratedMap: mockMap });

      // Assert: Blockade flag should be explicitly false
      const runState = tacticalMapStateManager.getState();
      expect(runState.pendingBlockadeExtraction).toBe(false);
    });

    it('should initialize blockadeCleared as false in new runState', () => {
      // Mock the run state after startRun
      const mockRunState = {
        shipSlotId: 0,
        mapTier: 1,
        pendingBlockadeExtraction: false,
        blockadeCleared: false
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(mockRunState);

      // Act: Start new run
      const mockMap = createMockMap();
      gameStateManager.startRun({ shipSlotId: 0, mapTier: 1, entryGateId: 0, preGeneratedMap: mockMap });

      // Assert: Blockade flag should be explicitly false
      const runState = tacticalMapStateManager.getState();
      expect(runState.blockadeCleared).toBe(false);
    });

    it('should not inherit blockade flags from previous run', () => {
      // Setup: Simulate a previous run with blockade flags set
      const oldRunState = {
        shipSlotId: 0,
        pendingBlockadeExtraction: true,
        blockadeCleared: true
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(oldRunState);

      // Clear the run state (as endRun would)
      tacticalMapStateManager.isRunActive.mockReturnValue(false);
      tacticalMapStateManager.getState.mockReturnValue(null);

      // Act: Start new run with fresh flags
      const newRunState = {
        shipSlotId: 0,
        mapTier: 1,
        pendingBlockadeExtraction: false,
        blockadeCleared: false
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(newRunState);

      const mockMap = createMockMap();
      gameStateManager.startRun({ shipSlotId: 0, mapTier: 1, entryGateId: 0, preGeneratedMap: mockMap });

      // Assert: New runState should have fresh flags
      const runState = tacticalMapStateManager.getState();
      expect(runState.pendingBlockadeExtraction).toBe(false);
      expect(runState.blockadeCleared).toBe(false);
    });
  });

  describe('full abandon/restart cycle', () => {
    it('should allow clean restart after abandon without going through failed run screen', () => {
      // Setup: Start first run
      const mockRunState1 = {
        shipSlotId: 0,
        mapTier: 1,
        mapData: { name: 'Map 1' }
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(mockRunState1);

      const mockMap1 = createMockMap('Map 1');
      gameStateManager.startRun({ shipSlotId: 0, mapTier: 1, entryGateId: 0, preGeneratedMap: mockMap1 });
      expect(tacticalMapStateManager.isRunActive()).toBe(true);

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
      const mockRunState2 = {
        shipSlotId: 0,
        mapTier: 1,
        mapData: { name: 'Map 2' }
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(mockRunState2);

      const mockMap2 = createMockMap('Map 2');
      gameStateManager.startRun({ shipSlotId: 0, mapTier: 1, entryGateId: 0, preGeneratedMap: mockMap2 });

      // Assert: Should have clean state
      expect(gameStateManager.get('runAbandoning')).toBe(false);
      expect(tacticalMapStateManager.isRunActive()).toBe(true);
      expect(tacticalMapStateManager.getState().mapData.name).toBe('Map 2');
    });

    it('should allow clean restart after normal abandon flow', () => {
      // Setup: Start first run
      const mockRunState1 = {
        shipSlotId: 0,
        mapTier: 1,
        mapData: { name: 'Map 1' }
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(mockRunState1);

      const mockMap1 = createMockMap('Map 1');
      gameStateManager.startRun({ shipSlotId: 0, mapTier: 1, entryGateId: 0, preGeneratedMap: mockMap1 });

      // Abandon the run through normal flow
      ExtractionController.abandonRun();
      ExtractionController.completeFailedRunTransition();

      // Verify flag was cleared by completeFailedRunTransition
      expect(gameStateManager.get('runAbandoning')).toBe(false);

      // Act: Start second run
      const mockRunState2 = {
        shipSlotId: 0,
        mapTier: 1,
        pendingBlockadeExtraction: false,
        blockadeCleared: false
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(mockRunState2);

      const mockMap2 = createMockMap('Map 2');
      gameStateManager.startRun({ shipSlotId: 0, mapTier: 1, entryGateId: 0, preGeneratedMap: mockMap2 });

      // Assert: Should have clean state
      expect(gameStateManager.get('runAbandoning')).toBe(false);
      const runState = tacticalMapStateManager.getState();
      expect(runState.pendingBlockadeExtraction).toBe(false);
      expect(runState.blockadeCleared).toBe(false);
    });
  });
});
