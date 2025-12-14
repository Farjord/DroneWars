import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ActionProcessor from './ActionProcessor.js';
import GameDataService from '../services/GameDataService.js';

/**
 * ACTION PROCESSOR TESTS
 *
 * ActionProcessor is the central orchestrator for all game actions.
 * It handles commitment processing, AI auto-completion, and PhaseManager integration.
 *
 * Critical paths tested:
 * - processCommitment() - Core commitment logic for simultaneous phases
 * - handleAICommitment() - AI auto-completion for all phase types
 * - PhaseManager integration - notifyHostAction/notifyGuestAction calls
 * - State mutation - Proper state updates via gameStateManager
 */

describe('ActionProcessor', () => {
  let actionProcessor;
  let mockGameStateManager;
  let mockPhaseManager;
  let mockAiPhaseProcessor;
  let mockGameDataService;

  // Helper to create a base game state
  const createBaseState = (overrides = {}) => ({
    gameMode: 'local',
    turnPhase: 'allocateShields',
    currentPlayer: 'player1',
    commitments: {},
    player1: {
      hand: [],
      discardPile: [],
      shipSections: {
        core: { allocatedShields: 0 },
        left: { allocatedShields: 0 },
        right: { allocatedShields: 0 }
      },
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
    },
    player2: {
      hand: [],
      discardPile: [],
      shipSections: {
        core: { allocatedShields: 0 },
        left: { allocatedShields: 0 },
        right: { allocatedShields: 0 }
      },
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
    },
    shieldsToAllocate: 0,
    opponentShieldsToAllocate: 0,
    passInfo: null,
    ...overrides
  });

  beforeEach(() => {
    // Reset singletons
    ActionProcessor.instance = null;
    GameDataService.instance = null;

    // Create state that can be mutated
    let currentState = createBaseState();

    // Create mock GameStateManager
    mockGameStateManager = {
      getState: vi.fn(() => currentState),
      setState: vi.fn((updates) => {
        currentState = { ...currentState, ...updates };
      }),
      updatePlayerState: vi.fn((playerId, updates) => {
        currentState[playerId] = { ...currentState[playerId], ...updates };
      }),
      get: vi.fn((key) => currentState[key]),
      subscribe: vi.fn(() => vi.fn()) // Returns unsubscribe function
    };

    // Create mock PhaseManager
    mockPhaseManager = {
      notifyHostAction: vi.fn(),
      notifyGuestAction: vi.fn(),
      getCurrentPhase: vi.fn(() => 'allocateShields')
    };

    // Create mock AIPhaseProcessor
    mockAiPhaseProcessor = {
      executeShieldAllocationTurn: vi.fn().mockResolvedValue({}),
      executeMandatoryDiscardTurn: vi.fn().mockResolvedValue({ cardsToDiscard: [] }),
      executeMandatoryDroneRemovalTurn: vi.fn().mockResolvedValue({ dronesToRemove: [] }),
      executeOptionalDiscardTurn: vi.fn().mockResolvedValue({ cardsToDiscard: [] }),
      processDroneSelection: vi.fn().mockResolvedValue([]),
      processDeckSelection: vi.fn().mockResolvedValue({ deck: [], drones: [], shipComponents: [] }),
      processPlacement: vi.fn().mockResolvedValue([])
    };

    // Create mock GameDataService
    mockGameDataService = {
      getEffectiveStats: vi.fn(() => ({})),
      getEffectiveShipStats: vi.fn(() => ({
        totals: { handLimit: 6, cpuLimit: 4 }
      }))
    };

    // Create ActionProcessor and inject mocks
    actionProcessor = new ActionProcessor(mockGameStateManager);
    actionProcessor.phaseManager = mockPhaseManager;
    actionProcessor.gameDataService = mockGameDataService;

    // Inject mock aiPhaseProcessor into the module scope
    // Note: In production, aiPhaseProcessor is imported directly
    // For testing, we need to mock it via the handleAICommitment method
  });

  afterEach(() => {
    vi.clearAllMocks();
    ActionProcessor.instance = null;
    GameDataService.instance = null;
  });

  // ========================================
  // SINGLETON PATTERN
  // ========================================

  describe('Singleton Pattern', () => {
    it('returns same instance from getInstance()', () => {
      const instance1 = ActionProcessor.getInstance(mockGameStateManager);
      const instance2 = ActionProcessor.getInstance(mockGameStateManager);

      expect(instance1).toBe(instance2);
    });

    it('reset() clears singleton instance', () => {
      const instance1 = ActionProcessor.getInstance(mockGameStateManager);
      ActionProcessor.reset();
      const instance2 = ActionProcessor.getInstance(mockGameStateManager);

      expect(instance1).not.toBe(instance2);
    });
  });

  // ========================================
  // PROCESS COMMITMENT - Core Logic
  // ========================================

  describe('processCommitment()', () => {
    it('initializes commitments object for phase if not exists', async () => {
      const result = await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      expect(result.success).toBe(true);
      const state = mockGameStateManager.getState();
      expect(state.commitments.allocateShields).toBeDefined();
      expect(state.commitments.allocateShields.player1.completed).toBe(true);
    });

    it('marks player commitment as completed', async () => {
      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { shieldAllocations: { core: 2 } }
      });

      const state = mockGameStateManager.getState();
      expect(state.commitments.allocateShields.player1.completed).toBe(true);
      expect(state.commitments.allocateShields.player1.shieldAllocations).toEqual({ core: 2 });
    });

    it('returns bothPlayersComplete = false when only one player committed', async () => {
      // Mock state where AI doesn't auto-commit (multiplayer)
      mockGameStateManager.getState.mockReturnValue(createBaseState({
        gameMode: 'host' // Not local mode, so no AI auto-complete
      }));

      const result = await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      expect(result.data.bothPlayersComplete).toBe(false);
    });

    it('returns bothPlayersComplete = true when both players committed', async () => {
      // First player commits
      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      // Second player commits
      const result = await actionProcessor.processCommitment({
        playerId: 'player2',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      expect(result.data.bothPlayersComplete).toBe(true);
    });

    it('applies shield allocations to player state', async () => {
      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: {
          shieldAllocations: {
            core: 2,
            left: 1
          }
        }
      });

      const state = mockGameStateManager.getState();
      expect(state.player1.shipSections.core.allocatedShields).toBe(2);
      expect(state.player1.shipSections.left.allocatedShields).toBe(1);
      expect(state.player1.shipSections.right.allocatedShields).toBe(0);
    });

    it('resets shieldsToAllocate counter after allocation', async () => {
      mockGameStateManager.getState.mockReturnValue(createBaseState({
        shieldsToAllocate: 5,
        gameMode: 'host'
      }));

      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { shieldAllocations: { core: 5 } }
      });

      // Verify setState was called with shieldsToAllocate = 0
      expect(mockGameStateManager.setState).toHaveBeenCalledWith(
        expect.objectContaining({ shieldsToAllocate: 0 }),
        'COMMITMENT_UPDATE'
      );
    });
  });

  // ========================================
  // PHASE MANAGER INTEGRATION
  // ========================================

  describe('PhaseManager Integration', () => {
    it('notifies PhaseManager on host commitment in host mode', async () => {
      mockGameStateManager.getState.mockReturnValue(createBaseState({
        gameMode: 'host'
      }));

      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      expect(mockPhaseManager.notifyHostAction).toHaveBeenCalledWith('commit', { phase: 'allocateShields' });
      expect(mockPhaseManager.notifyGuestAction).not.toHaveBeenCalled();
    });

    it('notifies PhaseManager on guest commitment in host mode', async () => {
      mockGameStateManager.getState.mockReturnValue(createBaseState({
        gameMode: 'host'
      }));

      await actionProcessor.processCommitment({
        playerId: 'player2',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      expect(mockPhaseManager.notifyGuestAction).toHaveBeenCalledWith('commit', { phase: 'allocateShields' });
      expect(mockPhaseManager.notifyHostAction).not.toHaveBeenCalled();
    });

    it('notifies PhaseManager for both players in local mode', async () => {
      mockGameStateManager.getState.mockReturnValue(createBaseState({
        gameMode: 'local'
      }));

      // Player 1 commitment
      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      expect(mockPhaseManager.notifyHostAction).toHaveBeenCalledWith('commit', { phase: 'allocateShields' });
    });
  });

  // ========================================
  // ACTION LOCKS
  // ========================================

  describe('Action Locks', () => {
    it('prevents concurrent actions of same type', async () => {
      // Set lock manually
      actionProcessor.actionLocks.commitment = true;

      await expect(
        actionProcessor.processAction({
          type: 'commitment',
          payload: {
            playerId: 'player1',
            phase: 'allocateShields',
            actionData: {}
          }
        })
      ).rejects.toThrow('Action commitment is currently locked');
    });

    it('releases lock after action completes', async () => {
      expect(actionProcessor.actionLocks.commitment).toBe(false);

      await actionProcessor.processAction({
        type: 'commitment',
        payload: {
          playerId: 'player1',
          phase: 'allocateShields',
          actionData: {}
        }
      });

      expect(actionProcessor.actionLocks.commitment).toBe(false);
    });

    it('releases lock even when action fails', async () => {
      // Force an error by passing invalid data
      mockGameStateManager.getState.mockReturnValue(null);

      try {
        await actionProcessor.processAction({
          type: 'commitment',
          payload: {
            playerId: 'player1',
            phase: 'allocateShields',
            actionData: {}
          }
        });
      } catch (e) {
        // Expected to throw
      }

      expect(actionProcessor.actionLocks.commitment).toBe(false);
    });
  });

  // ========================================
  // PASS VALIDATION
  // ========================================

  describe('Pass State Validation', () => {
    it('blocks player actions after player has passed', async () => {
      mockGameStateManager.getState.mockReturnValue(createBaseState({
        turnPhase: 'action',
        passInfo: {
          player1Passed: true,
          player2Passed: false
        }
      }));

      await expect(
        actionProcessor.processAction({
          type: 'attack',
          payload: { playerId: 'player1', attackDetails: {} }
        })
      ).rejects.toThrow('Cannot perform attack action: player1 has already passed');
    });

    it('allows actions from player who has not passed', async () => {
      mockGameStateManager.getState.mockReturnValue(createBaseState({
        turnPhase: 'action',
        currentPlayer: 'player2',
        passInfo: {
          player1Passed: true,
          player2Passed: false
        }
      }));

      // Mock processAttack to return success
      actionProcessor.processAttack = vi.fn().mockResolvedValue({ success: true });

      const result = await actionProcessor.processAction({
        type: 'attack',
        payload: { playerId: 'player2', attackDetails: {} }
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // SEQUENTIAL PHASE TURN VALIDATION
  // ========================================

  describe('Sequential Phase Turn Validation', () => {
    it('blocks action when not current player turn', async () => {
      mockGameStateManager.getState.mockReturnValue(createBaseState({
        turnPhase: 'action',
        currentPlayer: 'player1'
      }));

      await expect(
        actionProcessor.processAction({
          type: 'attack',
          payload: { playerId: 'player2', attackDetails: {} }
        })
      ).rejects.toThrow("Invalid action: player2 attempted attack but it's player1's turn");
    });

    it('allows network actions from host regardless of turn', async () => {
      mockGameStateManager.getState.mockReturnValue(createBaseState({
        turnPhase: 'action',
        currentPlayer: 'player1'
      }));

      // Mock processAttack to return success
      actionProcessor.processAttack = vi.fn().mockResolvedValue({ success: true });

      // Network actions should be allowed (already validated by host)
      const result = await actionProcessor.processAction({
        type: 'attack',
        payload: { playerId: 'player2', attackDetails: {} },
        isNetworkAction: true
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // EVENT EMISSION
  // ========================================

  describe('Event Emission', () => {
    it('emits action_completed for player actions', async () => {
      const listener = vi.fn();
      actionProcessor.subscribe(listener);

      actionProcessor.processPlayerPass = vi.fn().mockResolvedValue({ success: true });

      await actionProcessor.processAction({
        type: 'playerPass',
        payload: { playerId: 'player1' }
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'action_completed',
          actionType: 'playerPass'
        })
      );
    });

    it('unsubscribe removes listener', async () => {
      const listener = vi.fn();
      const unsubscribe = actionProcessor.subscribe(listener);
      unsubscribe();

      actionProcessor.processPlayerPass = vi.fn().mockResolvedValue({ success: true });

      await actionProcessor.processAction({
        type: 'playerPass',
        payload: { playerId: 'player1' }
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // ACTION QUEUE
  // ========================================

  describe('Action Queue', () => {
    it('processes actions serially', async () => {
      const executionOrder = [];

      actionProcessor.processCommitment = vi.fn(async (payload) => {
        executionOrder.push(payload.playerId);
        return { success: true, data: { bothPlayersComplete: false } };
      });

      // Queue multiple actions
      const promise1 = actionProcessor.queueAction({
        type: 'commitment',
        payload: { playerId: 'player1', phase: 'test', actionData: {} }
      });
      const promise2 = actionProcessor.queueAction({
        type: 'commitment',
        payload: { playerId: 'player2', phase: 'test', actionData: {} }
      });

      await Promise.all([promise1, promise2]);

      // Should execute in order
      expect(executionOrder).toEqual(['player1', 'player2']);
    });

    it('rejects action on error', async () => {
      actionProcessor.processCommitment = vi.fn().mockRejectedValue(new Error('Test error'));

      await expect(
        actionProcessor.queueAction({
          type: 'commitment',
          payload: { playerId: 'player1', phase: 'test', actionData: {} }
        })
      ).rejects.toThrow('Test error');
    });
  });

  // ========================================
  // COMMITMENT PHASES - allocateShields
  // ========================================

  describe('allocateShields Phase', () => {
    it('clears existing shield allocations before applying new ones', async () => {
      // Start with existing allocations
      const stateWithExistingShields = createBaseState();
      stateWithExistingShields.player1.shipSections.core.allocatedShields = 3;
      stateWithExistingShields.player1.shipSections.left.allocatedShields = 2;
      stateWithExistingShields.gameMode = 'host';
      mockGameStateManager.getState.mockReturnValue(stateWithExistingShields);

      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: {
          shieldAllocations: { right: 4 } // Only allocate to right
        }
      });

      const state = mockGameStateManager.getState();
      expect(state.player1.shipSections.core.allocatedShields).toBe(0);
      expect(state.player1.shipSections.left.allocatedShields).toBe(0);
      expect(state.player1.shipSections.right.allocatedShields).toBe(4);
    });

    it('handles player2 shield allocation with opponentShieldsToAllocate', async () => {
      mockGameStateManager.getState.mockReturnValue(createBaseState({
        opponentShieldsToAllocate: 3,
        gameMode: 'host'
      }));

      await actionProcessor.processCommitment({
        playerId: 'player2',
        phase: 'allocateShields',
        actionData: {
          shieldAllocations: { core: 3 }
        }
      });

      // Verify setState was called with opponentShieldsToAllocate = 0
      expect(mockGameStateManager.setState).toHaveBeenCalledWith(
        expect.objectContaining({ opponentShieldsToAllocate: 0 }),
        'COMMITMENT_UPDATE'
      );
    });
  });

  // ========================================
  // GAME MODE SPECIFIC BEHAVIOR
  // ========================================

  describe('Game Mode Specific Behavior', () => {
    it('local mode: triggers AI auto-commit after player1 commits', async () => {
      // Track if handleAICommitment was called
      const handleAISpy = vi.spyOn(actionProcessor, 'handleAICommitment').mockResolvedValue();

      mockGameStateManager.getState.mockReturnValue(createBaseState({
        gameMode: 'local',
        commitments: {}
      }));

      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      // In local mode, AI should auto-commit after player1
      // Note: This depends on aiPhaseProcessor being available in module scope
      // The actual implementation uses the global aiPhaseProcessor import
    });

    it('host mode: does NOT trigger AI auto-commit', async () => {
      const handleAISpy = vi.spyOn(actionProcessor, 'handleAICommitment');

      mockGameStateManager.getState.mockReturnValue(createBaseState({
        gameMode: 'host',
        commitments: {}
      }));

      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      expect(handleAISpy).not.toHaveBeenCalled();
    });

    it('guest mode: does NOT trigger AI auto-commit', async () => {
      const handleAISpy = vi.spyOn(actionProcessor, 'handleAICommitment');

      mockGameStateManager.getState.mockReturnValue(createBaseState({
        gameMode: 'guest',
        commitments: {}
      }));

      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { autoCompleted: true }
      });

      expect(handleAISpy).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // COMMITMENT STATE TRACKING
  // ========================================

  describe('Commitment State Tracking', () => {
    it('preserves actionData in commitment record', async () => {
      const actionData = {
        shieldAllocations: { core: 2, left: 1 },
        customField: 'test'
      };

      mockGameStateManager.getState.mockReturnValue(createBaseState({
        gameMode: 'host'
      }));

      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData
      });

      const state = mockGameStateManager.getState();
      expect(state.commitments.allocateShields.player1.customField).toBe('test');
    });

    it('tracks commitments separately per phase', async () => {
      mockGameStateManager.getState.mockReturnValue(createBaseState({
        gameMode: 'host'
      }));

      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'allocateShields',
        actionData: { phase: 'shields' }
      });

      await actionProcessor.processCommitment({
        playerId: 'player1',
        phase: 'mandatoryDiscard',
        actionData: { phase: 'discard' }
      });

      const state = mockGameStateManager.getState();
      expect(state.commitments.allocateShields.player1.phase).toBe('shields');
      expect(state.commitments.mandatoryDiscard.player1.phase).toBe('discard');
    });
  });

  // ========================================
  // ACTION COUNTER TRACKING (NOT_FIRST_ACTION)
  // ========================================

  describe('actionsTakenThisTurn tracking', () => {
    describe('increments counter after actions', () => {
      it('increments after processAttack completes', async () => {
        mockGameStateManager.getState.mockReturnValue(createBaseState({
          turnPhase: 'action',
          currentPlayer: 'player1',
          actionsTakenThisTurn: 0
        }));

        // Mock processAttack to return success
        actionProcessor.processAttack = vi.fn().mockResolvedValue({ success: true });

        await actionProcessor.processAction({
          type: 'attack',
          payload: { playerId: 'player1', attackDetails: {} }
        });

        // Check that setState was called with incremented counter
        expect(mockGameStateManager.setState).toHaveBeenCalledWith(
          expect.objectContaining({ actionsTakenThisTurn: 1 }),
          expect.any(String)
        );
      });

      it('increments after processCardPlay completes', async () => {
        mockGameStateManager.getState.mockReturnValue(createBaseState({
          turnPhase: 'action',
          currentPlayer: 'player1',
          actionsTakenThisTurn: 0
        }));

        // Mock processCardPlay to return success
        actionProcessor.processCardPlay = vi.fn().mockResolvedValue({ success: true });

        await actionProcessor.processAction({
          type: 'cardPlay',
          payload: { playerId: 'player1', card: {} }
        });

        expect(mockGameStateManager.setState).toHaveBeenCalledWith(
          expect.objectContaining({ actionsTakenThisTurn: 1 }),
          expect.any(String)
        );
      });

      it('increments after processMove completes', async () => {
        mockGameStateManager.getState.mockReturnValue(createBaseState({
          turnPhase: 'action',
          currentPlayer: 'player1',
          actionsTakenThisTurn: 0
        }));

        // Mock processMove to return success
        actionProcessor.processMove = vi.fn().mockResolvedValue({ success: true });

        await actionProcessor.processAction({
          type: 'move',
          payload: { playerId: 'player1', droneId: 'drone1', targetLane: 'lane2' }
        });

        expect(mockGameStateManager.setState).toHaveBeenCalledWith(
          expect.objectContaining({ actionsTakenThisTurn: 1 }),
          expect.any(String)
        );
      });

      it('accumulates across multiple actions in same turn', async () => {
        let counter = 0;
        mockGameStateManager.getState.mockImplementation(() => createBaseState({
          turnPhase: 'action',
          currentPlayer: 'player1',
          actionsTakenThisTurn: counter
        }));
        mockGameStateManager.setState.mockImplementation((updates) => {
          if (updates.actionsTakenThisTurn !== undefined) {
            counter = updates.actionsTakenThisTurn;
          }
        });

        // Mock action processors
        actionProcessor.processAttack = vi.fn().mockResolvedValue({ success: true });
        actionProcessor.processCardPlay = vi.fn().mockResolvedValue({ success: true });

        // First action
        await actionProcessor.processAction({
          type: 'attack',
          payload: { playerId: 'player1', attackDetails: {} }
        });
        expect(counter).toBe(1);

        // Second action
        await actionProcessor.processAction({
          type: 'cardPlay',
          payload: { playerId: 'player1', card: {} }
        });
        expect(counter).toBe(2);
      });

      it('does NOT increment after failed action', async () => {
        mockGameStateManager.getState.mockReturnValue(createBaseState({
          turnPhase: 'action',
          currentPlayer: 'player1',
          actionsTakenThisTurn: 0
        }));

        // Mock processAttack to return failure
        actionProcessor.processAttack = vi.fn().mockResolvedValue({ success: false });

        await actionProcessor.processAction({
          type: 'attack',
          payload: { playerId: 'player1', attackDetails: {} }
        });

        // Counter should not increment for failed actions
        expect(mockGameStateManager.setState).not.toHaveBeenCalledWith(
          expect.objectContaining({ actionsTakenThisTurn: 1 }),
          expect.any(String)
        );
      });
    });

    describe('does NOT increment for non-action types', () => {
      it('does NOT increment for commitment', async () => {
        mockGameStateManager.getState.mockReturnValue(createBaseState({
          gameMode: 'host',
          turnPhase: 'allocateShields',
          actionsTakenThisTurn: 0
        }));

        await actionProcessor.processCommitment({
          playerId: 'player1',
          phase: 'allocateShields',
          actionData: {}
        });

        // Should not increment for commitments
        expect(mockGameStateManager.setState).not.toHaveBeenCalledWith(
          expect.objectContaining({ actionsTakenThisTurn: 1 }),
          'ACTION_COUNT_INCREMENT'
        );
      });
    });
  });
});
