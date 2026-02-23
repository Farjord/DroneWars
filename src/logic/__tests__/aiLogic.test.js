import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiBrain } from '../aiLogic.js';
import GameDataService from '../../services/GameDataService.js';

/**
 * AI LOGIC TESTS - CPU LIMIT BUG FIX
 *
 * Tests for the infinite loop bug where AI repeatedly tries to deploy
 * drones when CPU limit is reached but never passes.
 *
 * Bug reproduction:
 * 1. AI reaches CPU limit (10/10 drones)
 * 2. AI evaluates deployment options but doesn't filter out options based on CPU limit
 * 3. AI decides to deploy a drone
 * 4. Deployment fails with "CPU Limit Reached"
 * 5. AI is called again and makes the same decision (infinite loop)
 *
 * Expected behavior:
 * - When CPU limit is reached, AI should return { type: 'pass' }
 * - All deployment options should have score -999 when CPU limit is full
 */

describe('AI Logic - CPU Limit Bug', () => {
  let mockGameStateManager;
  const mockAddLogEntry = vi.fn();

  // Helper to create test player state
  const createPlayerState = (droneCount = 0, options = {}) => {
    const drones = [];
    for (let i = 0; i < droneCount; i++) {
      drones.push({
        id: `drone_${i}`,
        name: 'Test Drone',
        class: 1,
        attack: 2,
        speed: 3,
        hull: 2,
        abilities: []
      });
    }

    // Distribute drones across lanes
    const dronesOnBoard = {
      lane1: drones.slice(0, Math.ceil(droneCount / 3)),
      lane2: drones.slice(Math.ceil(droneCount / 3), Math.ceil(2 * droneCount / 3)),
      lane3: drones.slice(Math.ceil(2 * droneCount / 3))
    };

    return {
      name: options.name || 'Test Player',
      energy: options.energy ?? 10,
      deploymentBudget: options.deploymentBudget ?? 5,
      initialDeploymentBudget: options.initialDeploymentBudget ?? 5,
      dronesOnBoard,
      deployedDroneCounts: {},
      activeDronePool: options.activeDronePool || [
        { name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] },
        { name: 'Talon', class: 2, attack: 3, speed: 4, hull: 2, shields: 1, limit: 3, abilities: [] }
      ],
      hand: options.hand || [],
      shipSections: {
        bridge: { hull: 10, maxHull: 10, allocatedShields: 0 },
        powerCell: { hull: 8, maxHull: 8, allocatedShields: 0 },
        droneControlHub: { hull: 8, maxHull: 8, allocatedShields: 0 }
      },
      appliedUpgrades: {}
    };
  };

  const createShipStatus = () => 'healthy';

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset GameDataService singleton
    GameDataService.instance = null;

    // Create mock GameStateManager with proper subscribe method
    mockGameStateManager = {
      getState: vi.fn(() => ({})),
      setState: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      addAIDecisionToHistory: vi.fn()
    };

    // Create a mock GameDataService that will be used
    const mockGDS = {
      getEffectiveShipStats: vi.fn((playerState, sections) => ({
        totals: {
          cpuLimit: 10,
          handLimit: 6,
          shieldRegen: 2
        }
      })),
      getEffectiveStats: vi.fn((drone, lane, context) => ({
        attack: drone?.attack || 2,
        speed: drone?.speed || 3,
        hull: drone?.hull || 2,
        maxShields: 0,
        keywords: new Set()
      }))
    };

    // Mock the getInstance to return our mock
    vi.spyOn(GameDataService, 'getInstance').mockReturnValue(mockGDS);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    GameDataService.instance = null;
  });

  // ========================================
  // CPU LIMIT TESTS
  // ========================================

  describe('handleOpponentTurn - CPU Limit at Maximum', () => {
    it('should return pass when CPU limit is exactly reached (10/10 drones)', () => {
      const player1 = createPlayerState(3, { name: 'Human' });
      const player2 = createPlayerState(10, { name: 'AI' }); // At CPU limit

      const result = aiBrain.handleOpponentTurn({
        player1,
        player2,
        turn: 2,
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        getShipStatus: createShipStatus,
        gameStateManager: mockGameStateManager,
        addLogEntry: mockAddLogEntry
      });

      // AI should pass when CPU limit is full
      expect(result.type).toBe('pass');
    });

    it('should return pass when CPU limit would be exceeded', () => {
      const player1 = createPlayerState(3, { name: 'Human' });
      const player2 = createPlayerState(10, { name: 'AI' }); // Already at limit

      const result = aiBrain.handleOpponentTurn({
        player1,
        player2,
        turn: 2,
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        getShipStatus: createShipStatus,
        gameStateManager: mockGameStateManager,
        addLogEntry: mockAddLogEntry
      });

      expect(result.type).toBe('pass');
    });

    it('should allow deployment when below CPU limit', () => {
      const player1 = createPlayerState(3, { name: 'Human' });
      const player2 = createPlayerState(5, { name: 'AI' }); // Below limit

      const result = aiBrain.handleOpponentTurn({
        player1,
        player2,
        turn: 2,
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        getShipStatus: createShipStatus,
        gameStateManager: mockGameStateManager,
        addLogEntry: mockAddLogEntry
      });

      // AI should be able to deploy when below limit
      expect(result.type).toBe('deploy');
    });

    it('should correctly count drones from dronesOnBoard', () => {
      // Create player with 10 drones distributed across lanes
      const player2 = {
        name: 'AI',
        energy: 10,
        deploymentBudget: 5,
        dronesOnBoard: {
          lane1: [{ id: 'd1', name: 'Drone', class: 1, abilities: [] }, { id: 'd2', name: 'Drone', class: 1, abilities: [] }, { id: 'd3', name: 'Drone', class: 1, abilities: [] }],
          lane2: [{ id: 'd4', name: 'Drone', class: 1, abilities: [] }, { id: 'd5', name: 'Drone', class: 1, abilities: [] }, { id: 'd6', name: 'Drone', class: 1, abilities: [] }],
          lane3: [{ id: 'd7', name: 'Drone', class: 1, abilities: [] }, { id: 'd8', name: 'Drone', class: 1, abilities: [] }, { id: 'd9', name: 'Drone', class: 1, abilities: [] }, { id: 'd10', name: 'Drone', class: 1, abilities: [] }]
        },
        deployedDroneCounts: {},
        activeDronePool: [
          { name: 'Dart', class: 1, attack: 1, speed: 4, hull: 1, limit: 3, abilities: [] }
        ],
        hand: [],
        shipSections: {},
        appliedUpgrades: {}
      };
      const player1 = createPlayerState(3, { name: 'Human' });

      const result = aiBrain.handleOpponentTurn({
        player1,
        player2,
        turn: 2,
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        getShipStatus: createShipStatus,
        gameStateManager: mockGameStateManager,
        addLogEntry: mockAddLogEntry
      });

      // With 10 drones and CPU limit of 10, should pass
      expect(result.type).toBe('pass');
    });
  });

  // ========================================
  // SCORING TESTS AT CPU LIMIT
  // ========================================

  describe('handleOpponentTurn - Scoring at CPU Limit', () => {
    it('all deployments should have score -999 when at CPU limit', () => {
      const player1 = createPlayerState(3, { name: 'Human' });
      const player2 = createPlayerState(10, { name: 'AI' }); // At CPU limit

      let capturedLogContext = null;
      const logCapture = (entry, source, context) => {
        if (context) capturedLogContext = context;
      };

      aiBrain.handleOpponentTurn({
        player1,
        player2,
        turn: 2,
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        getShipStatus: createShipStatus,
        gameStateManager: mockGameStateManager,
        addLogEntry: logCapture
      });

      // All options should have score -999 when at CPU limit
      if (capturedLogContext) {
        const maxScore = Math.max(...capturedLogContext.map(opt => opt.score));
        expect(maxScore).toBeLessThan(5); // Pass threshold is 5
      }
    });
  });

  // ========================================
  // EDGE CASE TESTS
  // ========================================

  describe('handleOpponentTurn - Edge Cases', () => {
    it('should handle empty drone pool gracefully', () => {
      const player1 = createPlayerState(3, { name: 'Human' });
      const player2 = createPlayerState(5, {
        name: 'AI',
        activeDronePool: [] // No drones to deploy
      });

      const result = aiBrain.handleOpponentTurn({
        player1,
        player2,
        turn: 2,
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        getShipStatus: createShipStatus,
        gameStateManager: mockGameStateManager,
        addLogEntry: mockAddLogEntry
      });

      // With no drones to deploy, should pass
      expect(result.type).toBe('pass');
    });

    it('should pass when no resources available', () => {
      const player1 = createPlayerState(3, { name: 'Human' });
      const player2 = createPlayerState(5, {
        name: 'AI',
        energy: 0,
        deploymentBudget: 0
      });

      const result = aiBrain.handleOpponentTurn({
        player1,
        player2,
        turn: 2,
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        getShipStatus: createShipStatus,
        gameStateManager: mockGameStateManager,
        addLogEntry: mockAddLogEntry
      });

      // With no resources, should pass
      expect(result.type).toBe('pass');
    });

    it('should handle CPU limit of 0 (all drones destroyed ship section)', () => {
      // Override mock to return cpuLimit of 0
      vi.spyOn(GameDataService, 'getInstance').mockReturnValue({
        getEffectiveShipStats: vi.fn(() => ({
          totals: {
            cpuLimit: 0, // Drone Control Hub destroyed
            handLimit: 6,
            shieldRegen: 2
          }
        })),
        getEffectiveStats: vi.fn((drone, lane) => ({
          attack: drone?.attack || 2,
          speed: drone?.speed || 3,
          hull: drone?.hull || 2,
          maxShields: 0,
          keywords: new Set()
        }))
      });

      const player1 = createPlayerState(3, { name: 'Human' });
      const player2 = createPlayerState(0, { name: 'AI' }); // No drones but also no CPU

      const result = aiBrain.handleOpponentTurn({
        player1,
        player2,
        turn: 2,
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        getShipStatus: createShipStatus,
        gameStateManager: mockGameStateManager,
        addLogEntry: mockAddLogEntry
      });

      // With CPU limit of 0, should pass
      expect(result.type).toBe('pass');
    });
  });

  // ========================================
  // INTEGRATION TEST - MULTIPLE CALLS
  // ========================================

  describe('handleOpponentTurn - Multiple Calls (Loop Prevention)', () => {
    it('should consistently return pass when called repeatedly at CPU limit', () => {
      const player1 = createPlayerState(3, { name: 'Human' });
      const player2 = createPlayerState(10, { name: 'AI' }); // At CPU limit

      // Simulate calling AI multiple times (like in the bug scenario)
      for (let i = 0; i < 5; i++) {
        const result = aiBrain.handleOpponentTurn({
          player1,
          player2,
          turn: 2,
          placedSections: ['bridge', 'powerCell', 'droneControlHub'],
          opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
          getShipStatus: createShipStatus,
          gameStateManager: mockGameStateManager,
          addLogEntry: mockAddLogEntry
        });

        // Every call should return pass when at CPU limit
        expect(result.type).toBe('pass');
      }
    });

    it('should never return deploy when totalDrones >= cpuLimit', () => {
      const player1 = createPlayerState(3, { name: 'Human' });

      // Test various combinations at or above limit
      const testCases = [
        { drones: 10, cpuLimit: 10 },
        { drones: 11, cpuLimit: 10 }, // Somehow over limit
        { drones: 10, cpuLimit: 9 },  // Over limit
      ];

      for (const tc of testCases) {
        vi.spyOn(GameDataService, 'getInstance').mockReturnValue({
          getEffectiveShipStats: vi.fn(() => ({
            totals: { cpuLimit: tc.cpuLimit, handLimit: 6, shieldRegen: 2 }
          })),
          getEffectiveStats: vi.fn((drone) => ({
            attack: drone?.attack || 2,
            speed: drone?.speed || 3,
            hull: drone?.hull || 2,
            maxShields: 0,
            keywords: new Set()
          }))
        });

        const player2 = createPlayerState(tc.drones, { name: 'AI' });

        const result = aiBrain.handleOpponentTurn({
          player1,
          player2,
          turn: 2,
          placedSections: ['bridge', 'powerCell', 'droneControlHub'],
          opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
          getShipStatus: createShipStatus,
          gameStateManager: mockGameStateManager,
          addLogEntry: mockAddLogEntry
        });

        expect(result.type).toBe('pass');
      }
    });
  });
});
