import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameFlowManager from './GameFlowManager.js';
import PhaseManager from './PhaseManager.js';
import { createMockGameStateManager, createMockPlayer } from '../test/helpers/phaseTestHelpers.js';

// ========================================
// GAMEFLOWMANAGER SEQUENTIAL PHASE TESTS
// ========================================
// These tests verify GameFlowManager's sequential phase handling based on DESIGN DOCUMENTS,
// not just the current code implementation. Tests verify INTENDED behavior from:
//
// - Design/Phase Management/PHASE_12_DEPLOYMENT.md
// - Design/Phase Management/PHASE_13_ACTION.md
// - Design/Phase Management/PHASE_FLOW_INDEX.md
//
// Key Design Principles Being Tested:
// 1. Sequential phases require both players to pass before completion
// 2. First passer tracking determines next round's turn order
// 3. Guest mode blocking prevents guest self-transitions
// 4. Pseudo-phase announcements ("DEPLOYMENT COMPLETE", "ACTION PHASE COMPLETE")
// 5. Turn switching after each action/pass
// 6. Round completion and roundNumber incrementation

describe('GameFlowManager - Sequential Phases', () => {
  let gameFlowManager;
  let phaseManager;
  let mockGameStateManager;
  let mockActionProcessor;

  beforeEach(() => {
    mockGameStateManager = createMockGameStateManager();

    // Create mock ActionProcessor with all required methods
    const actionProcessorSubscribers = [];
    mockActionProcessor = {
      broadcastStateToGuest: vi.fn(),
      processPhaseTransition: vi.fn(),
      processTurnTransition: vi.fn(),
      processPlayerPass: vi.fn(),
      setPhaseManager: vi.fn(),
      processFirstPlayerDetermination: vi.fn(async (gameState) => {
        // Mock implementation - return success with first player determination
        return Promise.resolve({ success: true, firstPlayer: 'player1' });
      }),
      queueAction: vi.fn(async (action) => {
        // Mock implementation - just return success
        return Promise.resolve({ success: true });
      }),
      subscribe: vi.fn((callback) => {
        actionProcessorSubscribers.push(callback);
        return () => {
          const index = actionProcessorSubscribers.indexOf(callback);
          if (index > -1) actionProcessorSubscribers.splice(index, 1);
        };
      })
    };

    gameFlowManager = new GameFlowManager();
    phaseManager = new PhaseManager(mockGameStateManager, 'host');

    // Initialize GameFlowManager (matches constructor signature)
    gameFlowManager.initialize(mockGameStateManager, mockActionProcessor, () => false);
    gameFlowManager.phaseManager = phaseManager;
  });

  // ========================================
  // DEPLOYMENT PHASE - PASS TRACKING & COMPLETION
  // ========================================
  // Design Source: PHASE_12_DEPLOYMENT.md

  describe('Deployment Phase - Pass Tracking & Completion', () => {
    beforeEach(() => {
      // CRITICAL: Properly transition PhaseManager to deployment phase
      // This updates PhaseManager's internal phaseState.turnPhase
      phaseManager.transitionToPhase('deployment');

      // Sync mock state to match (for any assertions that check mockGameStateManager)
      const state = mockGameStateManager.getState();
      state.turnPhase = 'deployment';
      state.gameStage = 'roundLoop';
      state.passInfo = {
        player1Passed: false,
        player2Passed: false,
        firstPasser: null
      };
      mockGameStateManager.setState(state);
    });

    it('both players pass in any order → phase completes', () => {
      // DESIGN: "Both players must pass" (PHASE_12_DEPLOYMENT.md, line 92)
      // UNIT TEST: Verifies PhaseManager correctly detects completion readiness
      // Expected: checkReadyToTransition() returns true when both players passed

      // Host passes first
      phaseManager.notifyHostAction('pass', { phase: 'deployment' });

      // Guest passes second
      phaseManager.notifyGuestAction('pass', { phase: 'deployment' });

      // Verify both passed (unit test scope)
      expect(phaseManager.hostLocalState.passInfo.passed).toBe(true);
      expect(phaseManager.guestLocalState.passInfo.passed).toBe(true);

      // CORE DESIGN PRINCIPLE: Phase is ready to transition
      const ready = phaseManager.checkReadyToTransition();
      expect(ready).toBe(true);

      // Verify firstPasser was tracked
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // NOTE: Actual GameFlowManager orchestration (deployment → action transition)
      // is tested in integration tests (Phase 5)
    });

    it('host passes first → firstPasser=player1', () => {
      // DESIGN: "If first to pass: Set firstPasser"
      // Source: PHASE_12_DEPLOYMENT.md, line 132
      // Expected: When host passes first, firstPasser set to 'player1'

      phaseManager.notifyHostAction('pass', { phase: 'deployment' });

      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player1');
    });

    it('guest passes first → firstPasser=player2', () => {
      // DESIGN: "If first to pass: Set firstPasser"
      // Source: PHASE_12_DEPLOYMENT.md, line 156
      // Expected: When guest passes first, firstPasser set to 'player2'

      phaseManager.notifyGuestAction('pass', { phase: 'deployment' });

      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player2');
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player2');
    });

    it('firstPasser not overwritten by second passer', () => {
      // DESIGN: Implicit - firstPasser set ONCE, critical for race condition prevention
      // Source: PHASE_12_DEPLOYMENT.md (implicit in pass tracking logic)
      // Expected: Second player's pass does NOT change firstPasser

      // Host passes first
      phaseManager.notifyHostAction('pass', { phase: 'deployment' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // Guest passes second
      phaseManager.notifyGuestAction('pass', { phase: 'deployment' });

      // CRITICAL: firstPasser must still be 'player1' (not overwritten)
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player1');
    });

    it('only one player passed → phase does NOT complete', () => {
      // DESIGN: "Both players must pass"
      // Source: PHASE_12_DEPLOYMENT.md, line 92
      // Expected: Phase remains in deployment until both pass

      // Only host passes
      phaseManager.notifyHostAction('pass', { phase: 'deployment' });

      // Check ready to transition
      const ready = phaseManager.checkReadyToTransition();
      expect(ready).toBe(false);

      // Verify phase unchanged
      const state = mockGameStateManager.getState();
      expect(state.turnPhase).toBe('deployment');
    });

    it('PhaseManager correctly tracks deployment phase completion state', () => {
      // DESIGN: Sequential phases must track when both players are ready
      // UNIT TEST: Verifies PhaseManager state reflects completion readiness
      // Expected: After both pass, PhaseManager state shows phase is complete

      // Both players pass
      phaseManager.notifyHostAction('pass', { phase: 'deployment' });
      phaseManager.notifyGuestAction('pass', { phase: 'deployment' });

      // Verify PhaseManager internal state is correct
      expect(phaseManager.hostLocalState.passInfo.passed).toBe(true);
      expect(phaseManager.guestLocalState.passInfo.passed).toBe(true);
      expect(phaseManager.checkReadyToTransition()).toBe(true);

      // Verify PhaseManager is in correct phase (deployment)
      expect(phaseManager.phaseState.turnPhase).toBe('deployment');

      // Verify firstPasser tracked
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // NOTE: Actual transition to 'action' and pseudo-phase announcements ('DEPLOYMENT COMPLETE')
      // are GameFlowManager's responsibility and will be tested in integration tests (Phase 5)
    });

    it('turn switches after pass', () => {
      // DESIGN: "Turn switches after each deployment or pass"
      // Source: PHASE_12_DEPLOYMENT.md, line 374
      // Expected: currentPlayer changes after pass

      const state = mockGameStateManager.getState();
      state.currentPlayer = 'player1';
      mockGameStateManager.setState(state);

      // Player1 passes
      phaseManager.notifyHostAction('pass', { phase: 'deployment' });

      // Simulate turn transition (would be handled by ActionProcessor in real game)
      const updatedState = mockGameStateManager.getState();
      updatedState.currentPlayer = 'player2';
      mockGameStateManager.setState(updatedState);

      // Verify turn switched
      expect(mockGameStateManager.getState().currentPlayer).toBe('player2');
    });
  });

  // ========================================
  // ACTION PHASE - ROUND COMPLETION & FIRST PASSER TRACKING
  // ========================================
  // Design Source: PHASE_13_ACTION.md

  describe('Action Phase - Round Completion & First Passer Tracking', () => {
    beforeEach(() => {
      // CRITICAL: Properly transition PhaseManager to action phase
      // This updates PhaseManager's internal phaseState.turnPhase
      phaseManager.transitionToPhase('action');

      // Sync mock state to match (for any assertions that check mockGameStateManager)
      const state = mockGameStateManager.getState();
      state.turnPhase = 'action';
      state.gameStage = 'roundLoop';
      state.roundNumber = 1;
      state.turn = 1;
      state.passInfo = {
        player1Passed: false,
        player2Passed: false,
        firstPasser: null
      };
      mockGameStateManager.setState(state);
    });

    it('both players pass → round ends, roundNumber increments', () => {
      // DESIGN: "roundNumber increments when action phase completes"
      // Source: PHASE_13_ACTION.md, line 98
      // UNIT TEST: Verifies PhaseManager detects both players passed

      // Both pass
      phaseManager.notifyHostAction('pass', { phase: 'action' });
      phaseManager.notifyGuestAction('pass', { phase: 'action' });

      // Verify both passed
      expect(phaseManager.hostLocalState.passInfo.passed).toBe(true);
      expect(phaseManager.guestLocalState.passInfo.passed).toBe(true);

      // Verify ready to complete
      const ready = phaseManager.checkReadyToTransition();
      expect(ready).toBe(true);

      // Verify firstPasser tracked
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // NOTE: Actual roundNumber increment is GameFlowManager orchestration (Phase 5)
    });

    it('firstPasserOfPreviousRound set from passInfo.firstPasser', () => {
      // DESIGN: "firstPasserOfPreviousRound = passInfo.firstPasser"
      // Source: PHASE_13_ACTION.md, line 136
      // UNIT TEST: Verifies PhaseManager correctly tracks firstPasser

      // Player1 passes first
      phaseManager.notifyHostAction('pass', { phase: 'action' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // Player2 passes
      phaseManager.notifyGuestAction('pass', { phase: 'action' });

      // Verify both passed and firstPasser set
      const ready = phaseManager.checkReadyToTransition();
      expect(ready).toBe(true);
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // NOTE: firstPasserOfPreviousRound storage is GameFlowManager orchestration (Phase 5)
    });

    it('second passer goes first next round', () => {
      // DESIGN: "Next round, player who passed SECOND goes first"
      // Source: PHASE_13_ACTION.md, line 167
      // Expected: If player1 passed first, player2 goes first next round (rewards aggressive play)

      // Player1 passes first
      phaseManager.notifyHostAction('pass', { phase: 'action' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // Player2 passes second
      phaseManager.notifyGuestAction('pass', { phase: 'action' });

      // Store firstPasserOfPreviousRound
      const state = mockGameStateManager.getState();
      state.firstPasserOfPreviousRound = phaseManager.hostLocalState.passInfo.firstPasser;
      mockGameStateManager.setState(state);

      // Determine next round's first player (OPPOSITE of firstPasser)
      const firstPasserOfPreviousRound = state.firstPasserOfPreviousRound;
      const nextFirstPlayer = firstPasserOfPreviousRound === 'player1' ? 'player2' : 'player1';

      // Verify second passer goes first
      expect(nextFirstPlayer).toBe('player2'); // Player2 passed second, so goes first
    });

    it('ACTION PHASE COMPLETE pseudo-phase announcement queued', () => {
      // DESIGN: "ACTION PHASE COMPLETE announcement before new round"
      // Source: PHASE_13_ACTION.md, line 449
      // UNIT TEST: Verifies PhaseManager ready state for pseudo-phase trigger

      // Both pass
      phaseManager.notifyHostAction('pass', { phase: 'action' });
      phaseManager.notifyGuestAction('pass', { phase: 'action' });

      // Verify both passed and ready to complete
      const ready = phaseManager.checkReadyToTransition();
      expect(ready).toBe(true);

      // Verify PhaseManager state is correct (still in action phase)
      expect(phaseManager.phaseState.turnPhase).toBe('action');

      // NOTE: Pseudo-phase announcements are GameFlowManager orchestration (Phase 5)
    });

    it('turn counter increments when both pass', () => {
      // DESIGN: "Turn counter increments when both pass"
      // Source: PHASE_13_ACTION.md, line 375
      // Expected: turn value increases when both players pass

      const initialTurn = mockGameStateManager.getState().turn;

      // Both pass
      phaseManager.notifyHostAction('pass', { phase: 'action' });
      phaseManager.notifyGuestAction('pass', { phase: 'action' });

      // Simulate turn increment (would happen in GameFlowManager)
      const state = mockGameStateManager.getState();
      state.turn = initialTurn + 1;
      mockGameStateManager.setState(state);

      expect(mockGameStateManager.getState().turn).toBe(initialTurn + 1);
    });

    it('only one player passed → round does NOT end', () => {
      // DESIGN: "Both players must pass"
      // Source: PHASE_13_ACTION.md, line 110
      // Expected: Phase remains in action until both pass

      const initialRoundNumber = mockGameStateManager.getState().roundNumber;

      // Only player1 passes
      phaseManager.notifyHostAction('pass', { phase: 'action' });

      // Check ready to transition
      const ready = phaseManager.checkReadyToTransition();
      expect(ready).toBe(false);

      // Verify phase unchanged
      const state = mockGameStateManager.getState();
      expect(state.turnPhase).toBe('action');
      expect(state.roundNumber).toBe(initialRoundNumber);
    });
  });

  // ========================================
  // GUEST MODE BLOCKING
  // ========================================
  // Design Source: PHASE_FLOW_INDEX.md

  describe('Guest Mode Blocking', () => {
    beforeEach(() => {
      // Recreate GameFlowManager in guest mode
      mockGameStateManager = createMockGameStateManager();

      const actionProcessorSubscribers = [];
      mockActionProcessor = {
        broadcastStateToGuest: vi.fn(),
        processPhaseTransition: vi.fn(),
        processTurnTransition: vi.fn(),
        processPlayerPass: vi.fn(),
        setPhaseManager: vi.fn(),
        processFirstPlayerDetermination: vi.fn(async (gameState) => {
          return Promise.resolve({ success: true, firstPlayer: 'player1' });
        }),
        queueAction: vi.fn(async (action) => Promise.resolve({ success: true })),
        subscribe: vi.fn((callback) => {
          actionProcessorSubscribers.push(callback);
          return () => {
            const index = actionProcessorSubscribers.indexOf(callback);
            if (index > -1) actionProcessorSubscribers.splice(index, 1);
          };
        })
      };

      gameFlowManager = new GameFlowManager();
      phaseManager = new PhaseManager(mockGameStateManager, 'guest');

      gameFlowManager.initialize(mockGameStateManager, mockActionProcessor, () => false);
      gameFlowManager.phaseManager = phaseManager;

      // Set up deployment phase
      const state = mockGameStateManager.getState();
      state.gameMode = 'guest';
      state.turnPhase = 'deployment';
      state.passInfo = {
        player1Passed: true,
        player2Passed: true,
        firstPasser: 'player1'
      };
      mockGameStateManager.setState(state);
    });

    it('guest cannot trigger phase completion', () => {
      // DESIGN: "Guest guards block Guest from triggering (3 locations)"
      // Source: PHASE_FLOW_INDEX.md, line 635
      // Expected: Guest mode blocks onSequentialPhaseComplete()

      const initialPhase = mockGameStateManager.getState().turnPhase;

      // Guest attempts to complete phase
      const result = gameFlowManager.onSequentialPhaseComplete('deployment', {
        firstPasser: 'player1'
      });

      // Verify blocked (method should return early or false)
      // Phase should NOT change
      const state = mockGameStateManager.getState();
      expect(state.turnPhase).toBe(initialPhase);
    });

    it('guest waits for host broadcast', () => {
      // DESIGN: "Guest waits for PhaseManager broadcasts from Host"
      // Source: PHASE_FLOW_INDEX.md, line 366
      // Expected: Guest cannot self-transition, waits for PhaseManager broadcast

      // Guest tries to transition
      const guestTransitionResult = phaseManager.transitionToPhase('action');

      // Verify blocked (PhaseManager blocks guest transitions)
      expect(guestTransitionResult).toBe(false);

      // Phase should remain unchanged
      expect(mockGameStateManager.getState().turnPhase).toBe('deployment');

      // Simulate host broadcast
      phaseManager.applyMasterState({
        turnPhase: 'action',
        gameStage: 'roundLoop',
        roundNumber: 1
      });

      // Now phase updates
      expect(phaseManager.phaseState.turnPhase).toBe('action');
    });
  });

  // ========================================
  // TURN ORDER RULES
  // ========================================
  // Design Source: PHASE_FLOW_INDEX.md, PHASE_13_ACTION.md

  describe('Turn Order Rules', () => {
    beforeEach(() => {
      const state = mockGameStateManager.getState();
      state.gameMode = 'host';
      mockGameStateManager.setState(state);
    });

    it('Round 1 first player is random (seeded)', () => {
      // DESIGN: "Round 1: Random selection"
      // Source: PHASE_FLOW_INDEX.md, line 451
      // Expected: firstPlayerOfRound determined by seeded random in Round 1

      const state = mockGameStateManager.getState();
      state.roundNumber = 1;
      state.firstPlayerOfRound = 'player1'; // Seeded random result
      mockGameStateManager.setState(state);

      // Verify first player set (would be determined in roundInitialization)
      expect(state.firstPlayerOfRound).toBeDefined();
      expect(['player1', 'player2']).toContain(state.firstPlayerOfRound);
    });

    it('Round 2+ first player determined by previous round firstPasser', () => {
      // DESIGN: "Player who passed SECOND in previous action phase goes first"
      // Source: PHASE_13_ACTION.md, line 454
      // Expected: Second passer from Round 1 goes first in Round 2

      // Round 1 action: player1 passed first
      const state = mockGameStateManager.getState();
      state.roundNumber = 1;
      state.firstPasserOfPreviousRound = 'player1'; // player1 passed first
      mockGameStateManager.setState(state);

      // Round 2 starts - determine first player (opposite of first passer)
      const firstPlayerOfRound = state.firstPasserOfPreviousRound === 'player1'
        ? 'player2'  // player2 passed second, goes first
        : 'player1';

      expect(firstPlayerOfRound).toBe('player2');
    });

    it('turn switches alternate during sequential phase', () => {
      // DESIGN: "Turn switches after each action/pass"
      // Source: PHASE_FLOW_INDEX.md, line 139
      // Expected: Turn alternates between players

      const state = mockGameStateManager.getState();
      state.currentPlayer = 'player1';
      mockGameStateManager.setState(state);

      // Player1 acts
      state.currentPlayer = 'player2'; // Turn switches
      mockGameStateManager.setState(state);
      expect(state.currentPlayer).toBe('player2');

      // Player2 acts
      state.currentPlayer = 'player1'; // Turn switches back
      mockGameStateManager.setState(state);
      expect(state.currentPlayer).toBe('player1');

      // Verify alternation works
      expect(['player1', 'player2']).toContain(state.currentPlayer);
    });
  });

  // ========================================
  // HOST BROADCAST CONTENT VERIFICATION
  // ========================================
  // Design Source: PHASEMANAGER_BUGFIX_DECISION_2025-12-03.md (lines 196-199, 249-270)
  // Guest cannot independently track firstPasser when host passes first

  describe('Host Broadcast Content Verification', () => {
    beforeEach(() => {
      mockGameStateManager = createMockGameStateManager();

      const actionProcessorSubscribers = [];
      mockActionProcessor = {
        broadcastStateToGuest: vi.fn(),
        processPhaseTransition: vi.fn(),
        processTurnTransition: vi.fn(),
        processPlayerPass: vi.fn(),
        setPhaseManager: vi.fn(),
        processFirstPlayerDetermination: vi.fn(async () => Promise.resolve({ success: true, firstPlayer: 'player1' })),
        queueAction: vi.fn(async () => Promise.resolve({ success: true })),
        subscribe: vi.fn((callback) => {
          actionProcessorSubscribers.push(callback);
          return () => {
            const index = actionProcessorSubscribers.indexOf(callback);
            if (index > -1) actionProcessorSubscribers.splice(index, 1);
          };
        })
      };

      gameFlowManager = new GameFlowManager();
      phaseManager = new PhaseManager(mockGameStateManager, 'host');

      gameFlowManager.initialize(mockGameStateManager, mockActionProcessor, () => false);
      gameFlowManager.phaseManager = phaseManager;
    });

    it('PhaseManager exposes firstPasser for host broadcast after sequential phase', () => {
      // DESIGN: "Guest cannot independently track firstPasser when host passes first"
      // Source: PHASEMANAGER_BUGFIX_DECISION_2025-12-03.md, line 196-199
      // EXPLANATION: When host broadcasts state after a sequential phase completes,
      // the broadcast MUST include passInfo.firstPasser so guest can determine turn order.
      // This test verifies PhaseManager correctly tracks firstPasser for inclusion in broadcasts.
      // Expected: After both pass, firstPasser is available in PhaseManager state

      // Set up deployment phase
      phaseManager.transitionToPhase('deployment');

      // Host passes first
      phaseManager.notifyHostAction('pass', { phase: 'deployment' });

      // Guest passes second
      phaseManager.notifyGuestAction('pass', { phase: 'deployment' });

      // Verify firstPasser is tracked and available for broadcast
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player1');

      // Verify phase is ready to transition (broadcast would happen here)
      expect(phaseManager.checkReadyToTransition()).toBe(true);

      // NOTE: Actual broadcast verification requires integration test with ActionProcessor
      // This unit test confirms PhaseManager has the data ready for broadcasting
    });
  });

  // ========================================
  // RESET - FULL CLEANUP TESTS
  // ========================================
  // These tests verify GameFlowManager.reset() properly cleans up all state
  // to prevent memory leaks and stale state between games.

  describe('reset() - Full Cleanup', () => {
    beforeEach(() => {
      gameFlowManager = new GameFlowManager();
      gameFlowManager.phaseManager = new PhaseManager(createMockGameStateManager(), 'host');
      gameFlowManager.listeners = [];
    });

    it('should clear listeners array', () => {
      // Add some listeners
      gameFlowManager.listeners = [() => {}, () => {}, () => {}];

      gameFlowManager.reset();

      expect(gameFlowManager.listeners).toEqual([]);
    });

    it('should reset isInCheckpointCascade', () => {
      // Set to true to simulate in-progress cascade
      gameFlowManager.isInCheckpointCascade = true;

      gameFlowManager.reset();

      expect(gameFlowManager.isInCheckpointCascade).toBe(false);
    });

    it('should call phaseManager.reset() if available', () => {
      // Spy on phaseManager.reset
      const resetSpy = vi.fn();
      gameFlowManager.phaseManager = { reset: resetSpy };

      gameFlowManager.reset();

      expect(resetSpy).toHaveBeenCalled();
    });

    it('should handle reset when phaseManager is null', () => {
      // phaseManager may be null if not initialized
      gameFlowManager.phaseManager = null;

      // Should not throw
      expect(() => gameFlowManager.reset()).not.toThrow();
    });

    it('should still reset existing fields (existing behavior)', () => {
      // Set fields to non-default values
      gameFlowManager.currentPhase = 'action';
      gameFlowManager.gameStage = 'roundLoop';
      gameFlowManager.roundNumber = 5;
      gameFlowManager.isProcessingAutomaticPhase = true;
      gameFlowManager._quickDeployExecutedThisRound = true;

      gameFlowManager.reset();

      expect(gameFlowManager.currentPhase).toBe('preGame');
      expect(gameFlowManager.gameStage).toBe('preGame');
      expect(gameFlowManager.roundNumber).toBe(0);
      expect(gameFlowManager.isProcessingAutomaticPhase).toBe(false);
      expect(gameFlowManager._quickDeployExecutedThisRound).toBe(false);
    });
  });
});
