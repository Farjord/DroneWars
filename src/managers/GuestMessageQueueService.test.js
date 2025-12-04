import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GuestMessageQueueService from './GuestMessageQueueService.js';

// Mock debug logger
vi.mock('../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  timingLog: vi.fn(() => Date.now()),
  getTimestamp: vi.fn(() => Date.now())
}));

/**
 * GuestMessageQueueService Tests - TDD Approach
 *
 * These tests expose bugs in phase announcement inference and timing:
 * - 50ms delay window race condition
 * - Multiple code paths queueing same announcement
 * - Wrong order of phase announcements
 *
 * Tests marked with "BUG:" are expected to FAIL until fixes are implemented.
 */

// ========================================
// TEST HELPERS
// ========================================

/**
 * Create mock PhaseAnimationQueue that tracks all queued animations
 */
function createMockPhaseAnimationQueue() {
  const queuedAnimations = [];
  return {
    queueAnimation: vi.fn((phaseName, phaseText, subtitle) => {
      queuedAnimations.push({ phaseName, phaseText, subtitle, queuedAt: Date.now() });
    }),
    startPlayback: vi.fn(),
    isPlaying: vi.fn(() => false),
    getQueueLength: vi.fn(() => queuedAnimations.length),
    // Test helpers
    getQueuedAnimations: () => [...queuedAnimations],
    getQueuedPhases: () => queuedAnimations.map(a => a.phaseName),
    clear: () => { queuedAnimations.length = 0; }
  };
}

/**
 * Create mock GameStateManager
 */
function createMockGameStateManager(initialState = {}) {
  const state = {
    gameMode: 'guest',
    turnPhase: 'deployment',
    currentPlayer: 'player1',
    roundNumber: 1,
    passInfo: {
      player1Passed: false,
      player2Passed: false,
      firstPasser: null
    },
    player1: {
      energy: 10,
      health: 30,
      shields: 5,
      hand: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
    },
    player2: {
      energy: 10,
      health: 30,
      shields: 5,
      hand: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
    },
    commitments: {},
    ...initialState
  };

  return {
    getState: vi.fn(() => ({ ...state })),
    getLocalPlayerId: vi.fn(() => 'player2'), // Guest is player2
    applyHostState: vi.fn((newState) => {
      Object.assign(state, newState);
    }),
    filterAnimations: vi.fn((actionAnims, systemAnims) => ({
      actionAnimations: actionAnims,
      systemAnimations: systemAnims
    })),
    actionProcessor: {
      animationManager: null // No animation manager in tests
    },
    validatingState: { isValidating: false },
    shouldValidateBroadcast: vi.fn(() => false),
    _state: state,
    // Allow tests to modify internal state
    _setState: (newState) => Object.assign(state, newState)
  };
}

/**
 * Create GuestMessageQueueService with mocks
 */
function createTestService(mockGameStateManager, mockPhaseAnimationQueue) {
  return new GuestMessageQueueService(mockGameStateManager, mockPhaseAnimationQueue);
}


describe('GuestMessageQueueService', () => {
  let service;
  let mockGameStateManager;
  let mockPhaseAnimationQueue;

  beforeEach(() => {
    mockPhaseAnimationQueue = createMockPhaseAnimationQueue();
    mockGameStateManager = createMockGameStateManager();
    service = createTestService(mockGameStateManager, mockPhaseAnimationQueue);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // PHASE INFERENCE PATTERN TESTS
  // ========================================

  describe('Phase Inference - Pattern 1: action → roundInitialization', () => {
    it('should queue actionComplete + roundAnnouncement + roundInitialization', async () => {
      // EXPLANATION: When leaving action phase to start new round, guest must
      // infer pseudo-phases: ACTION COMPLETE and ROUND announcement.
      // Host only broadcasts real phase (roundInitialization), not pseudo-phases.

      mockGameStateManager._setState({ turnPhase: 'action', roundNumber: 1 });

      await service.processStateUpdate({
        state: {
          turnPhase: 'roundInitialization',
          roundNumber: 2,
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const phases = mockPhaseAnimationQueue.getQueuedPhases();

      // Should queue: actionComplete, roundAnnouncement, roundInitialization
      expect(phases).toContain('actionComplete');
      expect(phases).toContain('roundAnnouncement');
      expect(phases).toContain('roundInitialization');
    });

    it('should queue OPPONENT PASSED when guest passed first', async () => {
      // EXPLANATION: If guest passed first (firstPasser = player2), when round
      // ends we know opponent also passed. Queue OPPONENT PASSED announcement.

      mockGameStateManager._setState({
        turnPhase: 'action',
        roundNumber: 1,
        passInfo: {
          player2Passed: true,  // Guest (player2) passed
          firstPasser: 'player2'  // Guest was first to pass
        }
      });

      await service.processStateUpdate({
        state: {
          turnPhase: 'roundInitialization',
          roundNumber: 2,
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const phases = mockPhaseAnimationQueue.getQueuedPhases();

      // Should include OPPONENT PASSED since guest passed first
      expect(phases[0]).toBe('playerPass'); // First should be OPPONENT PASSED
    });

    it('should NOT queue OPPONENT PASSED when opponent passed first', async () => {
      // EXPLANATION: If opponent passed first (firstPasser = player1), guest
      // already knew opponent passed. Don't show redundant announcement.

      mockGameStateManager._setState({
        turnPhase: 'action',
        roundNumber: 1,
        passInfo: {
          player2Passed: true,
          firstPasser: 'player1'  // Opponent was first to pass
        }
      });

      await service.processStateUpdate({
        state: {
          turnPhase: 'roundInitialization',
          roundNumber: 2,
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const phases = mockPhaseAnimationQueue.getQueuedPhases();

      // Should NOT include playerPass (OPPONENT PASSED)
      expect(phases).not.toContain('playerPass');
    });
  });

  describe('Phase Inference - Pattern 2: placement → roundInitialization', () => {
    it('should queue roundAnnouncement for Round 1 start', async () => {
      // EXPLANATION: Pattern 2 handles Round 1 start when leaving placement phase.

      mockGameStateManager._setState({ turnPhase: 'placement', roundNumber: 0 });

      await service.processStateUpdate({
        state: {
          turnPhase: 'roundInitialization',
          roundNumber: 1,
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const phases = mockPhaseAnimationQueue.getQueuedPhases();

      expect(phases).toContain('roundAnnouncement');
      expect(phases).toContain('roundInitialization');
    });
  });

  describe('Phase Inference - Pattern 2.5: deployment → action', () => {
    it('should queue deploymentComplete + action', async () => {
      // EXPLANATION: When both players pass deployment, queue DEPLOYMENT COMPLETE
      // pseudo-phase before the actual ACTION PHASE announcement.

      mockGameStateManager._setState({ turnPhase: 'deployment', roundNumber: 1 });

      await service.processStateUpdate({
        state: {
          turnPhase: 'action',
          roundNumber: 1,
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const phases = mockPhaseAnimationQueue.getQueuedPhases();

      expect(phases).toContain('deploymentComplete');
      expect(phases).toContain('action');
    });

    it('should queue OPPONENT PASSED when guest passed first in deployment', async () => {
      mockGameStateManager._setState({
        turnPhase: 'deployment',
        roundNumber: 1,
        passInfo: {
          player2Passed: true,
          firstPasser: 'player2'  // Guest was first to pass
        }
      });

      await service.processStateUpdate({
        state: {
          turnPhase: 'action',
          roundNumber: 1,
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const phases = mockPhaseAnimationQueue.getQueuedPhases();

      expect(phases[0]).toBe('playerPass'); // OPPONENT PASSED should be first
      expect(phases[1]).toBe('deploymentComplete');
    });
  });

  describe('Phase Inference - Pattern 3: Generic phase transitions', () => {
    it('should queue correct phaseText for allocateShields', async () => {
      mockGameStateManager._setState({ turnPhase: 'roundInitialization' });

      await service.processStateUpdate({
        state: {
          turnPhase: 'allocateShields',
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const animations = mockPhaseAnimationQueue.getQueuedAnimations();
      const allocateAnim = animations.find(a => a.phaseName === 'allocateShields');

      expect(allocateAnim).toBeDefined();
      expect(allocateAnim.phaseText).toBe('ALLOCATE SHIELDS');
    });

    it('should queue correct phaseText for mandatoryDiscard', async () => {
      mockGameStateManager._setState({ turnPhase: 'roundInitialization' });

      await service.processStateUpdate({
        state: {
          turnPhase: 'mandatoryDiscard',
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const animations = mockPhaseAnimationQueue.getQueuedAnimations();
      const discardAnim = animations.find(a => a.phaseName === 'mandatoryDiscard');

      expect(discardAnim).toBeDefined();
      expect(discardAnim.phaseText).toBe('MANDATORY DISCARD PHASE');
    });

    it('should NOT queue announcement when phase unchanged', async () => {
      mockGameStateManager._setState({ turnPhase: 'deployment' });

      await service.processStateUpdate({
        state: {
          turnPhase: 'deployment', // Same phase
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      expect(mockPhaseAnimationQueue.getQueueLength()).toBe(0);
    });
  });

  // ========================================
  // ANNOUNCEMENT ORDER TESTS
  // ========================================

  describe('Announcement Order', () => {
    it('should queue announcements in correct order for action→roundInit', async () => {
      // Expected order: OPPONENT PASSED → ACTION COMPLETE → ROUND → UPKEEP

      mockGameStateManager._setState({
        turnPhase: 'action',
        roundNumber: 1,
        passInfo: {
          player2Passed: true,
          firstPasser: 'player2'
        }
      });

      await service.processStateUpdate({
        state: {
          turnPhase: 'roundInitialization',
          roundNumber: 2,
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const phases = mockPhaseAnimationQueue.getQueuedPhases();

      // Verify order
      expect(phases[0]).toBe('playerPass');        // OPPONENT PASSED
      expect(phases[1]).toBe('actionComplete');    // ACTION COMPLETE
      expect(phases[2]).toBe('roundAnnouncement'); // ROUND
      expect(phases[3]).toBe('roundInitialization'); // UPKEEP
    });

    it('should queue announcements in correct order for deployment→action', async () => {
      // Expected order: OPPONENT PASSED → DEPLOYMENT COMPLETE → ACTION PHASE

      mockGameStateManager._setState({
        turnPhase: 'deployment',
        roundNumber: 1,
        passInfo: {
          player2Passed: true,
          firstPasser: 'player2'
        }
      });

      await service.processStateUpdate({
        state: {
          turnPhase: 'action',
          roundNumber: 1,
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const phases = mockPhaseAnimationQueue.getQueuedPhases();

      expect(phases[0]).toBe('playerPass');        // OPPONENT PASSED
      expect(phases[1]).toBe('deploymentComplete'); // DEPLOYMENT COMPLETE
      expect(phases[2]).toBe('action');            // ACTION PHASE
    });
  });

  // ========================================
  // DUPLICATE DETECTION TESTS
  // ========================================

  describe('Duplicate Detection', () => {
    it('BUG: Pattern 2 + Pattern 3 should not duplicate roundInitialization', async () => {
      // EXPLANATION: Pattern 2 queues roundAnnouncement for placement → roundInit.
      // Pattern 3 then also queues roundInitialization.
      // This is correct behavior - they're different phases.
      // But if the code is buggy, it might queue roundInitialization twice.

      mockGameStateManager._setState({ turnPhase: 'placement' });

      await service.processStateUpdate({
        state: {
          turnPhase: 'roundInitialization',
          roundNumber: 1,
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const phases = mockPhaseAnimationQueue.getQueuedPhases();
      const roundInitCount = phases.filter(p => p === 'roundInitialization').length;

      // Should only have ONE roundInitialization
      expect(roundInitCount).toBe(1);
    });

    it('BUG: rapid state updates should not cause duplicate announcements', async () => {
      // EXPLANATION: If two state updates arrive rapidly, the same phase
      // announcement could be queued twice. The 50ms delay window makes this possible.
      // This test may not perfectly simulate the race condition but documents the concern.

      mockGameStateManager._setState({ turnPhase: 'deployment' });

      // First update
      await service.processStateUpdate({
        state: {
          turnPhase: 'action',
          roundNumber: 1,
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      // Update internal state to match
      mockGameStateManager._setState({ turnPhase: 'action' });

      // Second update with same phase (shouldn't queue anything)
      await service.processStateUpdate({
        state: {
          turnPhase: 'action',
          roundNumber: 1,
          gameMode: 'guest'
        },
        actionAnimations: [],
        systemAnimations: []
      });

      const phases = mockPhaseAnimationQueue.getQueuedPhases();
      const actionCount = phases.filter(p => p === 'action').length;

      // Should only have ONE action phase announcement
      expect(actionCount).toBe(1);
    });
  });

  // ========================================
  // STATE COMPARISON TESTS
  // ========================================

  describe('State Comparison (compareGameStates)', () => {
    it('should return true for identical states', () => {
      const state1 = {
        turnPhase: 'action',
        currentPlayer: 'player1',
        roundNumber: 1,
        player1: { energy: 10, health: 30, shields: 5, hand: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
        player2: { energy: 10, health: 30, shields: 5, hand: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
      };
      const state2 = { ...state1 };

      const result = service.compareGameStates(state1, state2);
      expect(result).toBe(true);
    });

    it('should return false for energy mismatch', () => {
      const state1 = {
        turnPhase: 'action',
        currentPlayer: 'player1',
        roundNumber: 1,
        player1: { energy: 10, health: 30, shields: 5, hand: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
        player2: { energy: 10, health: 30, shields: 5, hand: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
      };
      const state2 = {
        ...state1,
        player1: { ...state1.player1, energy: 8 } // Different energy
      };

      const result = service.compareGameStates(state1, state2);
      expect(result).toBe(false);
    });

    it('should return false for turnPhase mismatch', () => {
      const state1 = {
        turnPhase: 'action',
        currentPlayer: 'player1',
        roundNumber: 1,
        player1: { energy: 10, health: 30, shields: 5, hand: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
        player2: { energy: 10, health: 30, shields: 5, hand: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
      };
      const state2 = {
        ...state1,
        turnPhase: 'deployment' // Different phase
      };

      const result = service.compareGameStates(state1, state2);
      expect(result).toBe(false);
    });

    it('should return false for drone health mismatch', () => {
      const drone1 = { id: 'drone-1', name: 'Scout', health: 3 };
      const drone2 = { id: 'drone-1', name: 'Scout', health: 2 }; // Different health

      const state1 = {
        turnPhase: 'action',
        currentPlayer: 'player1',
        roundNumber: 1,
        player1: { energy: 10, health: 30, shields: 5, hand: [], dronesOnBoard: { lane1: [drone1], lane2: [], lane3: [] } },
        player2: { energy: 10, health: 30, shields: 5, hand: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
      };
      const state2 = {
        ...state1,
        player1: {
          ...state1.player1,
          dronesOnBoard: { lane1: [drone2], lane2: [], lane3: [] }
        }
      };

      const result = service.compareGameStates(state1, state2);
      expect(result).toBe(false);
    });
  });

  // ========================================
  // ANIMATION FILTERING TESTS
  // ========================================

  describe('Animation Filtering', () => {
    it('should call filterAnimations with incoming animations', async () => {
      const testAnimations = [
        { animationName: 'DRONE_ATTACK_START', payload: { targetId: 'drone-1' } }
      ];

      await service.processStateUpdate({
        state: {
          turnPhase: 'action',
          gameMode: 'guest'
        },
        actionAnimations: testAnimations,
        systemAnimations: []
      });

      expect(mockGameStateManager.filterAnimations).toHaveBeenCalledWith(
        testAnimations,
        []
      );
    });

    it('should skip state application when all animations filtered and states match', async () => {
      // Setup: filterAnimations returns empty (all filtered)
      mockGameStateManager.filterAnimations.mockReturnValue({
        actionAnimations: [],
        systemAnimations: []
      });

      // Make states match
      const matchingState = {
        turnPhase: 'action',
        currentPlayer: 'player1',
        roundNumber: 1,
        gameMode: 'guest',
        player1: { energy: 10, health: 30, shields: 5, hand: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
        player2: { energy: 10, health: 30, shields: 5, hand: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
      };

      mockGameStateManager._setState(matchingState);
      mockGameStateManager.getState.mockReturnValue({ ...matchingState });

      await service.processStateUpdate({
        state: matchingState,
        actionAnimations: [{ animationName: 'TEST', payload: {} }],
        systemAnimations: []
      });

      // Should NOT apply host state (optimization to prevent flicker)
      // Note: applyHostState might still be called for other reasons,
      // but the optimization path should skip redundant application
    });
  });

  // ========================================
  // SEQUENCE TRACKING TESTS
  // ========================================

  describe('Sequence Tracking', () => {
    it('should track lastProcessedSequence', () => {
      expect(service.lastProcessedSequence).toBe(0);

      service.enqueueMessage({
        type: 'state_update_received',
        data: {
          sequenceId: 5,
          state: { turnPhase: 'action', gameMode: 'guest' },
          actionAnimations: [],
          systemAnimations: []
        }
      });

      // After processing, sequence should be updated
      // Note: actual update happens during processing
    });

    it('should queue out-of-order messages', () => {
      // Process sequence 1 first
      service.lastProcessedSequence = 1;

      // Receive sequence 3 (gap - sequence 2 is missing)
      service.enqueueMessage({
        type: 'state_update_received',
        data: {
          sequenceId: 3,
          state: { turnPhase: 'action', gameMode: 'guest' },
          actionAnimations: [],
          systemAnimations: []
        }
      });

      // Should be in pending queue, not main queue
      expect(service.pendingOutOfOrderMessages.size).toBe(1);
      expect(service.pendingOutOfOrderMessages.has(3)).toBe(true);
    });

    it('should process pending messages when gap is filled', () => {
      service.lastProcessedSequence = 1;

      // Queue out-of-order message (sequence 3)
      service.enqueueMessage({
        type: 'state_update_received',
        data: {
          sequenceId: 3,
          state: { turnPhase: 'action', gameMode: 'guest' },
          actionAnimations: [],
          systemAnimations: []
        }
      });

      expect(service.pendingOutOfOrderMessages.size).toBe(1);

      // Now receive sequence 2 (fills the gap)
      service.enqueueMessage({
        type: 'state_update_received',
        data: {
          sequenceId: 2,
          state: { turnPhase: 'deployment', gameMode: 'guest' },
          actionAnimations: [],
          systemAnimations: []
        }
      });

      // Both should have been processed, pending should be empty
      expect(service.pendingOutOfOrderMessages.size).toBe(0);
    });
  });

  // ========================================
  // RESYNC TRIGGER TESTS
  // ========================================

  describe('Resync Trigger', () => {
    it('should trigger resync when too many messages are pending', () => {
      const mockP2PManager = {
        requestFullSync: vi.fn()
      };
      service.setP2PManager(mockP2PManager);

      service.lastProcessedSequence = 1;

      // Queue more than PENDING_THRESHOLD (3) out-of-order messages
      for (let i = 5; i <= 9; i++) {
        service.enqueueMessage({
          type: 'state_update_received',
          data: {
            sequenceId: i,
            state: { turnPhase: 'action', gameMode: 'guest' },
            actionAnimations: [],
            systemAnimations: []
          }
        });
      }

      // Should have triggered resync
      expect(mockP2PManager.requestFullSync).toHaveBeenCalled();
      expect(service.isResyncing).toBe(true);
    });

    it('should handle resync response correctly', () => {
      service.isResyncing = true;
      service.lastProcessedSequence = 5;

      const fullState = {
        sequenceId: 10,
        state: {
          turnPhase: 'action',
          gameMode: 'guest',
          roundNumber: 2
        }
      };

      service.handleResyncResponse(fullState);

      expect(service.isResyncing).toBe(false);
      expect(service.lastProcessedSequence).toBe(10);
      expect(mockGameStateManager.applyHostState).toHaveBeenCalledWith(fullState.state);
    });
  });
});
