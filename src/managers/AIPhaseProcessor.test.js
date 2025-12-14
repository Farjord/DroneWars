import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import aiPhaseProcessor from './AIPhaseProcessor.js';
import GameDataService from '../services/GameDataService.js';

/**
 * AI PHASE PROCESSOR TESTS - DEPLOYMENT FAILURE HANDLING
 *
 * Tests for the bug where AI enters infinite loop when deployment
 * fails (e.g., CPU limit reached) but doesn't pass the turn.
 *
 * BUG DESCRIPTION:
 * 1. AI reaches CPU limit (10/10 drones)
 * 2. AI decides to deploy (incorrectly evaluates options)
 * 3. Deployment validation fails with "CPU Limit Reached"
 * 4. AI does NOT pass the turn
 * 5. AI is called again and makes same decision
 * 6. Infinite loop!
 *
 * EXPECTED BEHAVIOR (after fix):
 * - When deployment fails, AI should automatically pass the turn
 * - This prevents the infinite loop
 *
 * TEST STRATEGY:
 * - These tests should FAIL before the fix is applied
 * - After fix, tests should PASS
 */

describe('AIPhaseProcessor - Deployment Failure Handling', () => {
  let mockGameStateManager;
  let mockActionProcessor;
  let originalGameDataService;

  beforeEach(() => {
    // Store original state
    originalGameDataService = GameDataService.instance;

    // Reset singletons
    GameDataService.instance = null;
    aiPhaseProcessor.isInitialized = false;
    aiPhaseProcessor.isProcessing = false;
    aiPhaseProcessor.turnTimer = null;

    // Create mock GameStateManager
    mockGameStateManager = {
      getState: vi.fn(),
      setState: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      addLogEntry: vi.fn()
    };

    // Create mock ActionProcessor
    mockActionProcessor = {
      queueAction: vi.fn()
    };

    // Create mock GameDataService
    const mockGDS = {
      getEffectiveShipStats: vi.fn(() => ({
        totals: {
          cpuLimit: 10,
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
    };

    vi.spyOn(GameDataService, 'getInstance').mockReturnValue(mockGDS);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    GameDataService.instance = originalGameDataService;
    aiPhaseProcessor.isInitialized = false;
    aiPhaseProcessor.isProcessing = false;

    // Clear any pending timers
    if (aiPhaseProcessor.turnTimer) {
      clearTimeout(aiPhaseProcessor.turnTimer);
      aiPhaseProcessor.turnTimer = null;
    }

    // Cleanup subscription
    if (aiPhaseProcessor.stateSubscriptionCleanup) {
      aiPhaseProcessor.stateSubscriptionCleanup();
      aiPhaseProcessor.stateSubscriptionCleanup = null;
    }
  });

  describe('executeDeploymentTurn - Deployment Fails', () => {
    /**
     * TEST: When deployment fails, AI should pass the turn
     *
     * This test reproduces the bug scenario:
     * - AI decides to deploy a drone
     * - Deployment fails (e.g., CPU limit reached)
     * - AI should pass the turn to prevent infinite loop
     *
     * EXPECTED: This test should FAIL before the fix is applied
     * because the current code does NOT pass when deployment fails.
     */
    it('should pass turn when deployment fails due to CPU limit', async () => {
      // Setup: Game state where AI has room to deploy
      const gameState = {
        gameMode: 'local',
        turnPhase: 'deployment',
        currentPlayer: 'player2',
        turn: 2,
        roundNumber: 2,
        player1: {
          name: 'Human',
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          shipSections: {
            bridge: { hull: 10, maxHull: 10, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } }
          }
        },
        player2: {
          name: 'AI',
          energy: 10,
          deploymentBudget: 5,
          // Only 5 drones so AI thinks it can deploy
          dronesOnBoard: {
            lane1: [{ id: 'd1', name: 'Drone', class: 1, abilities: [] }],
            lane2: [{ id: 'd2', name: 'Drone', class: 1, abilities: [] }],
            lane3: [{ id: 'd3', name: 'Drone', class: 1, abilities: [] }, { id: 'd4', name: 'Drone', class: 1, abilities: [] }, { id: 'd5', name: 'Drone', class: 1, abilities: [] }]
          },
          deployedDroneCounts: {},
          activeDronePool: [
            { name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }
          ],
          hand: [],
          shipSections: {
            bridge: { hull: 10, maxHull: 10, allocatedShields: 0, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } }
          },
          appliedUpgrades: {}
        },
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        passInfo: { player1Passed: false, player2Passed: false }
      };

      mockGameStateManager.getState.mockReturnValue(gameState);

      // Track all queueAction calls
      const queuedActions = [];
      mockActionProcessor.queueAction.mockImplementation(async (action) => {
        queuedActions.push(action);

        // Simulate deployment failure
        if (action.type === 'deployment') {
          return { success: false, error: 'CPU Limit Reached' };
        }
        return { success: true };
      });

      // Initialize AIPhaseProcessor
      aiPhaseProcessor.initialize(
        null, // aiPersonalities
        [{ name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }],
        null, // currentPersonality
        mockActionProcessor,
        mockGameStateManager
      );

      // Execute deployment turn
      await aiPhaseProcessor.executeDeploymentTurn(gameState);

      // CRITICAL ASSERTION: After deployment fails, AI should pass
      // This is the bug - currently the code does NOT call playerPass when deployment fails
      const deploymentAction = queuedActions.find(a => a.type === 'deployment');
      const passAction = queuedActions.find(a => a.type === 'playerPass');

      // We expect deployment to be attempted
      expect(deploymentAction).toBeDefined();

      // BUG CHECK: After deployment failure, we expect playerPass to be called
      // This assertion will FAIL with the bug present
      expect(passAction).toBeDefined();
      expect(passAction.payload.playerId).toBe('player2');
      expect(passAction.payload.turnPhase).toBe('deployment');
    });

    /**
     * TEST: Verify deployment failure with different error types also passes
     *
     * This test verifies the fix works for various failure scenarios.
     */
    it('should pass turn when deployment fails due to any validation error', async () => {
      const gameState = {
        gameMode: 'local',
        turnPhase: 'deployment',
        currentPlayer: 'player2',
        turn: 2,
        roundNumber: 2,
        player1: {
          name: 'Human',
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          shipSections: {
            bridge: { hull: 10, maxHull: 10, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } }
          }
        },
        player2: {
          name: 'AI',
          energy: 10,
          deploymentBudget: 5,
          dronesOnBoard: {
            lane1: [{ id: 'd1', name: 'Drone', class: 1, abilities: [] }],
            lane2: [{ id: 'd2', name: 'Drone', class: 1, abilities: [] }],
            lane3: []
          },
          deployedDroneCounts: {},
          activeDronePool: [
            { name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }
          ],
          hand: [],
          shipSections: {
            bridge: { hull: 10, maxHull: 10, allocatedShields: 0, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } }
          },
          appliedUpgrades: {}
        },
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        passInfo: { player1Passed: false, player2Passed: false }
      };

      mockGameStateManager.getState.mockReturnValue(gameState);

      const queuedActions = [];
      mockActionProcessor.queueAction.mockImplementation(async (action) => {
        queuedActions.push(action);

        if (action.type === 'deployment') {
          // Simulate deployment limit error instead of CPU limit
          return { success: false, error: 'Deployment Limit Reached' };
        }
        return { success: true };
      });

      aiPhaseProcessor.initialize(
        null,
        [{ name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }],
        null,
        mockActionProcessor,
        mockGameStateManager
      );

      await aiPhaseProcessor.executeDeploymentTurn(gameState);

      const deploymentAction = queuedActions.find(a => a.type === 'deployment');
      const passAction = queuedActions.find(a => a.type === 'playerPass');

      expect(deploymentAction).toBeDefined();

      // After fix: AI now passes when any deployment fails
      expect(passAction).toBeDefined();
      expect(passAction.payload.playerId).toBe('player2');
      expect(passAction.payload.turnPhase).toBe('deployment');
    });
  });

  describe('executeDeploymentTurn - Deployment Succeeds', () => {
    /**
     * TEST: When deployment succeeds, should NOT pass (should do turnTransition)
     */
    it('should NOT pass turn when deployment succeeds', async () => {
      const gameState = {
        gameMode: 'local',
        turnPhase: 'deployment',
        currentPlayer: 'player2',
        turn: 2,
        roundNumber: 2,
        player1: {
          name: 'Human',
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          shipSections: {
            bridge: { hull: 10, maxHull: 10, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } }
          }
        },
        player2: {
          name: 'AI',
          energy: 10,
          deploymentBudget: 5,
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          deployedDroneCounts: {},
          activeDronePool: [
            { name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }
          ],
          hand: [],
          shipSections: {
            bridge: { hull: 10, maxHull: 10, allocatedShields: 0, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } }
          },
          appliedUpgrades: {}
        },
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        passInfo: { player1Passed: false, player2Passed: false }
      };

      mockGameStateManager.getState.mockReturnValue(gameState);

      const queuedActions = [];
      mockActionProcessor.queueAction.mockImplementation(async (action) => {
        queuedActions.push(action);

        if (action.type === 'deployment') {
          return { success: true };
        }
        return { success: true };
      });

      aiPhaseProcessor.initialize(
        null,
        [{ name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }],
        null,
        mockActionProcessor,
        mockGameStateManager
      );

      await aiPhaseProcessor.executeDeploymentTurn(gameState);

      const passAction = queuedActions.find(a => a.type === 'playerPass');
      const turnTransitionAction = queuedActions.find(a => a.type === 'turnTransition');

      // After successful deployment, should NOT pass
      expect(passAction).toBeUndefined();

      // After successful deployment, should transition turn
      expect(turnTransitionAction).toBeDefined();
    });
  });

  describe('executeDeploymentTurn - Energy Limit Handling', () => {
    /**
     * TEST: When AI has no resources, it should pass (via aiLogic decision)
     *
     * Scenario: AI has 0 energy and 0 deployment budget
     * The AI logic correctly scores all options as -999 and returns 'pass'
     * This tests that the AI doesn't get stuck when it has no resources
     */
    it('should pass turn when AI has zero energy and zero budget', async () => {
      const gameState = {
        gameMode: 'local',
        turnPhase: 'deployment',
        currentPlayer: 'player2',
        turn: 2,
        roundNumber: 2,
        player1: {
          name: 'Human',
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          shipSections: {
            bridge: { hull: 10, maxHull: 10, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } }
          }
        },
        player2: {
          name: 'AI',
          energy: 0,  // No energy
          deploymentBudget: 0,  // No budget
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          deployedDroneCounts: {},
          activeDronePool: [
            { name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }
          ],
          hand: [],
          shipSections: {
            bridge: { hull: 10, maxHull: 10, allocatedShields: 0, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } }
          },
          appliedUpgrades: {}
        },
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        passInfo: { player1Passed: false, player2Passed: false }
      };

      mockGameStateManager.getState.mockReturnValue(gameState);

      const queuedActions = [];
      mockActionProcessor.queueAction.mockImplementation(async (action) => {
        queuedActions.push(action);

        if (action.type === 'deployment') {
          return { success: false, error: 'Not Enough Energy' };
        }
        return { success: true };
      });

      aiPhaseProcessor.initialize(
        null,
        [{ name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }],
        null,
        mockActionProcessor,
        mockGameStateManager
      );

      await aiPhaseProcessor.executeDeploymentTurn(gameState);

      const passAction = queuedActions.find(a => a.type === 'playerPass');

      // AI should pass (either via aiLogic decision or after failed deployment)
      expect(passAction).toBeDefined();
      expect(passAction.payload.playerId).toBe('player2');
      expect(passAction.payload.turnPhase).toBe('deployment');
    });

    /**
     * TEST: When AI has insufficient energy for all available drones, it should pass
     *
     * Scenario: AI has 1 energy, 0 budget, but cheapest drone costs 2
     * AI logic correctly identifies no affordable options and passes
     */
    it('should pass turn when energy insufficient for cheapest drone', async () => {
      const gameState = {
        gameMode: 'local',
        turnPhase: 'deployment',
        currentPlayer: 'player2',
        turn: 2,
        roundNumber: 2,
        player1: {
          name: 'Human',
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          shipSections: {
            bridge: { hull: 10, maxHull: 10, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } }
          }
        },
        player2: {
          name: 'AI',
          energy: 1,  // Only 1 energy
          deploymentBudget: 0,  // No budget left
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          deployedDroneCounts: {},
          // Only class 2+ drones available (cost 2+)
          activeDronePool: [
            { name: 'Talon', class: 2, attack: 3, speed: 4, hull: 2, shields: 1, limit: 3, abilities: [] },
            { name: 'Heavy Bomber', class: 3, attack: 5, speed: 2, hull: 4, shields: 2, limit: 2, abilities: [] }
          ],
          hand: [],
          shipSections: {
            bridge: { hull: 10, maxHull: 10, allocatedShields: 0, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } }
          },
          appliedUpgrades: {}
        },
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        passInfo: { player1Passed: false, player2Passed: false }
      };

      mockGameStateManager.getState.mockReturnValue(gameState);

      const queuedActions = [];
      mockActionProcessor.queueAction.mockImplementation(async (action) => {
        queuedActions.push(action);

        if (action.type === 'deployment') {
          return { success: false, error: 'Not Enough Energy' };
        }
        return { success: true };
      });

      aiPhaseProcessor.initialize(
        null,
        [
          { name: 'Talon', class: 2, attack: 3, speed: 4, hull: 2, shields: 1, limit: 3, abilities: [] },
          { name: 'Heavy Bomber', class: 3, attack: 5, speed: 2, hull: 4, shields: 2, limit: 2, abilities: [] }
        ],
        null,
        mockActionProcessor,
        mockGameStateManager
      );

      await aiPhaseProcessor.executeDeploymentTurn(gameState);

      const passAction = queuedActions.find(a => a.type === 'playerPass');

      // AI should pass when it can't afford any drones
      expect(passAction).toBeDefined();
      expect(passAction.payload.playerId).toBe('player2');
      expect(passAction.payload.turnPhase).toBe('deployment');
    });

    /**
     * TEST: Budget depleted mid-round, energy also insufficient
     *
     * Scenario: AI started with budget, used it all, now has no resources
     * AI logic correctly identifies depleted resources and passes
     */
    it('should pass turn when budget exhausted and energy insufficient', async () => {
      const gameState = {
        gameMode: 'local',
        turnPhase: 'deployment',
        currentPlayer: 'player2',
        turn: 2,
        roundNumber: 2,
        player1: {
          name: 'Human',
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          shipSections: {
            bridge: { hull: 10, maxHull: 10, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } }
          }
        },
        player2: {
          name: 'AI',
          energy: 0,  // Energy depleted from previous actions
          deploymentBudget: 0,  // Budget used up this round
          initialDeploymentBudget: 5,  // Started with 5
          dronesOnBoard: {
            lane1: [{ id: 'd1', name: 'Drone', class: 1, abilities: [] }],
            lane2: [{ id: 'd2', name: 'Drone', class: 1, abilities: [] }],
            lane3: []
          },
          deployedDroneCounts: { 'Dart': 2 },
          activeDronePool: [
            { name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }
          ],
          hand: [],
          shipSections: {
            bridge: { hull: 10, maxHull: 10, allocatedShields: 0, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } }
          },
          appliedUpgrades: {}
        },
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        passInfo: { player1Passed: false, player2Passed: false }
      };

      mockGameStateManager.getState.mockReturnValue(gameState);

      const queuedActions = [];
      mockActionProcessor.queueAction.mockImplementation(async (action) => {
        queuedActions.push(action);

        if (action.type === 'deployment') {
          return { success: false, error: 'Not Enough Energy' };
        }
        return { success: true };
      });

      aiPhaseProcessor.initialize(
        null,
        [{ name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }],
        null,
        mockActionProcessor,
        mockGameStateManager
      );

      await aiPhaseProcessor.executeDeploymentTurn(gameState);

      const passAction = queuedActions.find(a => a.type === 'playerPass');

      // AI should pass when resources are exhausted
      expect(passAction).toBeDefined();
      expect(passAction.payload.playerId).toBe('player2');
      expect(passAction.payload.turnPhase).toBe('deployment');
    });
  });

  describe('executeDeploymentTurn - Combined Resource Limits', () => {
    /**
     * TEST: Multiple deployment failures in sequence should all result in pass
     *
     * This tests that the fix handles any deployment failure consistently
     */
    it('should pass turn regardless of failure reason', async () => {
      const failureReasons = [
        'CPU Limit Reached',
        'Not Enough Energy',
        'Deployment Limit Reached',
        'Max Per Lane Reached'
      ];

      for (const failureReason of failureReasons) {
        // Reset mocks for each iteration
        vi.clearAllMocks();
        aiPhaseProcessor.isInitialized = false;
        aiPhaseProcessor.isProcessing = false;

        const gameState = {
          gameMode: 'local',
          turnPhase: 'deployment',
          currentPlayer: 'player2',
          turn: 2,
          roundNumber: 2,
          player1: {
            name: 'Human',
            dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
            shipSections: {
              bridge: { hull: 10, maxHull: 10, thresholds: { critical: 3, damaged: 6 } },
              powerCell: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } },
              droneControlHub: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } }
            }
          },
          player2: {
            name: 'AI',
            energy: 10,
            deploymentBudget: 5,
            dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
            deployedDroneCounts: {},
            activeDronePool: [
              { name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }
            ],
            hand: [],
            shipSections: {
              bridge: { hull: 10, maxHull: 10, allocatedShields: 0, thresholds: { critical: 3, damaged: 6 } },
              powerCell: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } },
              droneControlHub: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } }
            },
            appliedUpgrades: {}
          },
          placedSections: ['bridge', 'powerCell', 'droneControlHub'],
          opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
          passInfo: { player1Passed: false, player2Passed: false }
        };

        mockGameStateManager.getState.mockReturnValue(gameState);

        const queuedActions = [];
        mockActionProcessor.queueAction.mockImplementation(async (action) => {
          queuedActions.push(action);

          if (action.type === 'deployment') {
            return { success: false, error: failureReason };
          }
          return { success: true };
        });

        aiPhaseProcessor.initialize(
          null,
          [{ name: 'Dart', class: 1, attack: 1, speed: 6, hull: 1, shields: 1, limit: 3, abilities: [] }],
          null,
          mockActionProcessor,
          mockGameStateManager
        );

        await aiPhaseProcessor.executeDeploymentTurn(gameState);

        const passAction = queuedActions.find(a => a.type === 'playerPass');

        // After any deployment failure, AI should pass
        expect(passAction, `Expected pass action for failure: ${failureReason}`).toBeDefined();
        expect(passAction.payload.playerId).toBe('player2');
      }
    });

    /**
     * TEST: When AI has partial resources (some budget, low energy)
     *
     * Scenario: AI has budget but the drone class exceeds remaining budget,
     * requiring energy that isn't available
     * AI logic correctly identifies insufficient combined resources and passes
     */
    it('should pass turn when partial budget cannot cover drone cost difference', async () => {
      const gameState = {
        gameMode: 'local',
        turnPhase: 'deployment',
        currentPlayer: 'player2',
        turn: 2,
        roundNumber: 2,
        player1: {
          name: 'Human',
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          shipSections: {
            bridge: { hull: 10, maxHull: 10, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, thresholds: { critical: 2, damaged: 4 } }
          }
        },
        player2: {
          name: 'AI',
          energy: 0,  // No energy to cover the difference
          deploymentBudget: 1,  // Only 1 budget remaining
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          deployedDroneCounts: {},
          // Class 3 drone costs 3, budget covers 1, need 2 energy (don't have it)
          activeDronePool: [
            { name: 'Heavy Bomber', class: 3, attack: 5, speed: 2, hull: 4, shields: 2, limit: 2, abilities: [] }
          ],
          hand: [],
          shipSections: {
            bridge: { hull: 10, maxHull: 10, allocatedShields: 0, thresholds: { critical: 3, damaged: 6 } },
            powerCell: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } },
            droneControlHub: { hull: 8, maxHull: 8, allocatedShields: 0, thresholds: { critical: 2, damaged: 4 } }
          },
          appliedUpgrades: {}
        },
        placedSections: ['bridge', 'powerCell', 'droneControlHub'],
        opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub'],
        passInfo: { player1Passed: false, player2Passed: false }
      };

      mockGameStateManager.getState.mockReturnValue(gameState);

      const queuedActions = [];
      mockActionProcessor.queueAction.mockImplementation(async (action) => {
        queuedActions.push(action);

        if (action.type === 'deployment') {
          // Budget (1) + Energy (0) = 1, but drone costs 3
          return { success: false, error: 'Not Enough Energy' };
        }
        return { success: true };
      });

      aiPhaseProcessor.initialize(
        null,
        [{ name: 'Heavy Bomber', class: 3, attack: 5, speed: 2, hull: 4, shields: 2, limit: 2, abilities: [] }],
        null,
        mockActionProcessor,
        mockGameStateManager
      );

      await aiPhaseProcessor.executeDeploymentTurn(gameState);

      const passAction = queuedActions.find(a => a.type === 'playerPass');

      // AI should pass when combined budget + energy is insufficient
      expect(passAction).toBeDefined();
      expect(passAction.payload.playerId).toBe('player2');
      expect(passAction.payload.turnPhase).toBe('deployment');
    });
  });
});
