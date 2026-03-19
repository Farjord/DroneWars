import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import aiPhaseProcessor from '../AIPhaseProcessor.js';
import GameDataService from '../../services/GameDataService.js';

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

    // Create mock ActionProcessor
    mockActionProcessor = {
      queueAction: vi.fn()
    };

    // Create mock GameStateManager (with gameEngine that delegates to actionProcessor mock)
    mockGameStateManager = {
      getState: vi.fn(),
      setState: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      addLogEntry: vi.fn(),
      addAIDecisionToHistory: vi.fn(),
      gameEngine: {
        processAction: vi.fn(async (type, payload) => {
          // Delegate to the same mock so existing test assertions still work
          const result = await mockActionProcessor.queueAction({ type, payload });
          return { state: {}, animations: { actionAnimations: [], systemAnimations: [] }, result };
        })
      }
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

      // After successful deployment, should NOT pass
      expect(passAction).toBeUndefined();

      // turnTransition is no longer sent explicitly — GameFlowManager handles it
      // automatically via the action_completed event with shouldEndTurn: true
      const turnTransitionAction = queuedActions.find(a => a.type === 'turnTransition');
      expect(turnTransitionAction).toBeUndefined();
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

describe('AIPhaseProcessor - Event-driven AI turn activation', () => {
  let mockGameStateManager;
  let mockActionProcessor;
  let subscribedListener;
  let originalGameDataService;

  beforeEach(() => {
    originalGameDataService = GameDataService.instance;
    GameDataService.instance = null;
    aiPhaseProcessor.isInitialized = false;
    aiPhaseProcessor.isProcessing = false;
    aiPhaseProcessor.turnTimer = null;

    vi.useFakeTimers();

    vi.spyOn(GameDataService, 'getInstance').mockReturnValue({
      getEffectiveShipStats: vi.fn(() => ({ totals: { cpuLimit: 10, handLimit: 6, shieldRegen: 2 } })),
      getEffectiveStats: vi.fn(() => ({ attack: 2, speed: 3, hull: 2, maxShields: 0, keywords: new Set() }))
    });

    mockActionProcessor = { queueAction: vi.fn().mockResolvedValue({ success: true }) };

    const aiTurnState = {
      currentPlayer: 'player2',
      turnPhase: 'deployment',
      passInfo: { player1Passed: false, player2Passed: false },
      winner: null,
      gameStage: 'battle',
      roundNumber: 1,
      player2: { hand: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] }, energy: 5, deploymentBudget: 3 },
      player1: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
      placedSections: [],
      opponentPlacedSections: [],
    };

    mockGameStateManager = {
      getState: vi.fn().mockReturnValue(aiTurnState),
      subscribe: vi.fn((listener) => {
        subscribedListener = listener;
        return vi.fn();
      }),
      addLogEntry: vi.fn(),
      emit: vi.fn(),
      gameEngine: null,
      gameServer: { isPlayerAI: vi.fn().mockReturnValue(true) },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    GameDataService.instance = originalGameDataService;
    aiPhaseProcessor.isInitialized = false;
    aiPhaseProcessor.isProcessing = false;
    if (aiPhaseProcessor.turnTimer) {
      clearTimeout(aiPhaseProcessor.turnTimer);
      aiPhaseProcessor.turnTimer = null;
    }
    if (aiPhaseProcessor.stateSubscriptionCleanup) {
      aiPhaseProcessor.stateSubscriptionCleanup();
      aiPhaseProcessor.stateSubscriptionCleanup = null;
    }
  });

  it('ignores non-RESPONSE_CYCLE_COMPLETE events (no timer scheduled)', () => {
    aiPhaseProcessor.initialize(null, [], null, mockActionProcessor, mockGameStateManager);

    // Simulate a generic state update event (not RESPONSE_CYCLE_COMPLETE)
    subscribedListener({
      type: 'STATE_UPDATE',
      payload: {},
      state: mockGameStateManager.getState(),
    });

    // No timer should be scheduled
    expect(aiPhaseProcessor.turnTimer).toBeNull();
  });

  it('activates on RESPONSE_CYCLE_COMPLETE when it is AI turn in sequential phase', () => {
    aiPhaseProcessor.initialize(null, [], null, mockActionProcessor, mockGameStateManager);

    subscribedListener({
      type: 'RESPONSE_CYCLE_COMPLETE',
      payload: {},
      state: mockGameStateManager.getState(),
    });

    // Timer should be scheduled (800ms cosmetic delay)
    expect(aiPhaseProcessor.turnTimer).not.toBeNull();
  });

  it('uses 800ms delay (not 1500ms) after RESPONSE_CYCLE_COMPLETE', () => {
    const executeTurnSpy = vi.spyOn(aiPhaseProcessor, 'executeTurn').mockResolvedValue(undefined);
    aiPhaseProcessor.initialize(null, [], null, mockActionProcessor, mockGameStateManager);

    subscribedListener({
      type: 'RESPONSE_CYCLE_COMPLETE',
      payload: {},
      state: mockGameStateManager.getState(),
    });

    // Should NOT fire at 799ms
    vi.advanceTimersByTime(799);
    expect(executeTurnSpy).not.toHaveBeenCalled();

    // Should fire at 800ms
    vi.advanceTimersByTime(1);
    expect(executeTurnSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores RESPONSE_CYCLE_COMPLETE when not AI turn', () => {
    const humanTurnState = { ...mockGameStateManager.getState(), currentPlayer: 'player1' };
    mockGameStateManager.getState.mockReturnValue(humanTurnState);

    aiPhaseProcessor.initialize(null, [], null, mockActionProcessor, mockGameStateManager);

    subscribedListener({
      type: 'RESPONSE_CYCLE_COMPLETE',
      payload: {},
      state: humanTurnState,
    });

    expect(aiPhaseProcessor.turnTimer).toBeNull();
  });

  it('ignores RESPONSE_CYCLE_COMPLETE when already processing', () => {
    aiPhaseProcessor.initialize(null, [], null, mockActionProcessor, mockGameStateManager);
    aiPhaseProcessor.isProcessing = true;

    subscribedListener({
      type: 'RESPONSE_CYCLE_COMPLETE',
      payload: {},
      state: mockGameStateManager.getState(),
    });

    expect(aiPhaseProcessor.turnTimer).toBeNull();
  });

  it('ignores RESPONSE_CYCLE_COMPLETE in non-sequential phase', () => {
    const simultaneousState = { ...mockGameStateManager.getState(), turnPhase: 'deckSelection' };
    mockGameStateManager.getState.mockReturnValue(simultaneousState);

    aiPhaseProcessor.initialize(null, [], null, mockActionProcessor, mockGameStateManager);

    subscribedListener({
      type: 'RESPONSE_CYCLE_COMPLETE',
      payload: {},
      state: simultaneousState,
    });

    expect(aiPhaseProcessor.turnTimer).toBeNull();
  });
});

describe('AIPhaseProcessor - Animation blocking wait-and-retry', () => {
  let originalGameDataService;
  let mockGSM;
  let mockAP;

  const makeBlockingState = () => ({
    currentPlayer: 'player2',
    turnPhase: 'deployment',
    passInfo: { player1Passed: false, player2Passed: false },
    winner: null,
    gameStage: 'battle',
    player2: { hand: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] }, energy: 0 },
    player1: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
    placedSections: [],
    opponentPlacedSections: [],
  });

  beforeEach(() => {
    originalGameDataService = GameDataService.instance;
    GameDataService.instance = null;
    aiPhaseProcessor.isInitialized = false;
    aiPhaseProcessor.isProcessing = false;
    aiPhaseProcessor.turnTimer = null;
    aiPhaseProcessor._blockingRetryCount = 0;

    vi.useFakeTimers();

    vi.spyOn(GameDataService, 'getInstance').mockReturnValue({
      getEffectiveShipStats: vi.fn(() => ({ totals: { cpuLimit: 10, handLimit: 6, shieldRegen: 2 } })),
      getEffectiveStats: vi.fn(() => ({ attack: 2, speed: 3, hull: 2, maxShields: 0, keywords: new Set() }))
    });

    mockGSM = {
      getState: vi.fn().mockReturnValue(makeBlockingState()),
      subscribe: vi.fn(() => vi.fn()),
      addLogEntry: vi.fn(),
      gameEngine: null,
    };
    mockAP = { queueAction: vi.fn().mockResolvedValue({ success: true }) };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    GameDataService.instance = originalGameDataService;
    aiPhaseProcessor.isInitialized = false;
    aiPhaseProcessor.isProcessing = false;
    aiPhaseProcessor._blockingRetryCount = 0;
    if (aiPhaseProcessor.turnTimer) {
      clearTimeout(aiPhaseProcessor.turnTimer);
      aiPhaseProcessor.turnTimer = null;
    }
    if (aiPhaseProcessor.stateSubscriptionCleanup) {
      aiPhaseProcessor.stateSubscriptionCleanup();
      aiPhaseProcessor.stateSubscriptionCleanup = null;
    }
  });

  it('schedules a 500ms retry when animations are blocking instead of bailing', async () => {
    aiPhaseProcessor.initialize(null, [], null, mockAP, mockGSM, {
      isAnimationBlocking: () => true
    });

    await aiPhaseProcessor.executeTurn();

    // Should NOT be processing (didn't enter the main block)
    expect(aiPhaseProcessor.isProcessing).toBe(false);
    // Should have scheduled a retry timer
    expect(aiPhaseProcessor.turnTimer).not.toBeNull();
    // Retry count should be 1
    expect(aiPhaseProcessor._blockingRetryCount).toBe(1);
  });

  it('proceeds after animations clear on retry', async () => {
    let callCount = 0;
    aiPhaseProcessor.initialize(null, [], null, mockAP, mockGSM, {
      isAnimationBlocking: () => {
        callCount++;
        return callCount <= 1; // blocking on first call, clear on second
      }
    });

    // First call — should schedule retry
    await aiPhaseProcessor.executeTurn();
    expect(aiPhaseProcessor.turnTimer).not.toBeNull();
    expect(aiPhaseProcessor._blockingRetryCount).toBe(1);

    // Advance timer to trigger retry
    await vi.advanceTimersByTimeAsync(500);

    // After retry with animations clear, isProcessing should have been set and released
    // (the turn executes and finishes via finally block)
    expect(aiPhaseProcessor.isProcessing).toBe(false);
    // Counter should be reset on successful entry
    expect(aiPhaseProcessor._blockingRetryCount).toBe(0);
  });

  it('aborts after exceeding max retries (20)', async () => {
    aiPhaseProcessor.initialize(null, [], null, mockAP, mockGSM, {
      isAnimationBlocking: () => true // permanently blocking
    });

    // Simulate 20 retries
    for (let i = 0; i < 20; i++) {
      await aiPhaseProcessor.executeTurn();
      expect(aiPhaseProcessor._blockingRetryCount).toBe(i + 1);
      expect(aiPhaseProcessor.turnTimer).not.toBeNull();
      // Clear timer for next manual call
      clearTimeout(aiPhaseProcessor.turnTimer);
      aiPhaseProcessor.turnTimer = null;
    }

    // 21st call — should abort (counter > 20)
    await aiPhaseProcessor.executeTurn();
    expect(aiPhaseProcessor._blockingRetryCount).toBe(0); // reset after abort
    expect(aiPhaseProcessor.turnTimer).toBeNull(); // no more retries
  });

  it('resets retry counter on successful entry', async () => {
    let blocking = true;
    aiPhaseProcessor.initialize(null, [], null, mockAP, mockGSM, {
      isAnimationBlocking: () => blocking
    });

    // Accumulate some retries
    await aiPhaseProcessor.executeTurn();
    expect(aiPhaseProcessor._blockingRetryCount).toBe(1);
    clearTimeout(aiPhaseProcessor.turnTimer);
    aiPhaseProcessor.turnTimer = null;

    await aiPhaseProcessor.executeTurn();
    expect(aiPhaseProcessor._blockingRetryCount).toBe(2);
    clearTimeout(aiPhaseProcessor.turnTimer);
    aiPhaseProcessor.turnTimer = null;

    // Now clear blocking
    blocking = false;
    await aiPhaseProcessor.executeTurn();

    // Counter should be reset after successful entry
    expect(aiPhaseProcessor._blockingRetryCount).toBe(0);
  });

  it('resets retry counter on cleanup', () => {
    aiPhaseProcessor._blockingRetryCount = 15;
    aiPhaseProcessor.initialize(null, [], null, mockAP, mockGSM, {
      isAnimationBlocking: () => true
    });

    aiPhaseProcessor.cleanup();

    expect(aiPhaseProcessor._blockingRetryCount).toBe(0);
  });
});
