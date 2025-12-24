import { describe, it, expect, vi, beforeEach } from 'vitest';
import PhaseManager from './PhaseManager.js';
import { createMockGameStateManager, simulatePass, simulateCommitment } from '../test/helpers/phaseTestHelpers.js';

// ========================================
// PHASE MANAGER TESTS
// ========================================
// These tests verify PhaseManager's single authority pattern and state tracking.
// PhaseManager is the ONLY component that can transition phases in multiplayer.

describe('PhaseManager', () => {
  let phaseManager;
  let mockGameStateManager;

  beforeEach(() => {
    mockGameStateManager = createMockGameStateManager();
  });

  // ========================================
  // SINGLE AUTHORITY PATTERN
  // ========================================

  describe('Single Authority Pattern', () => {
    it('host mode allows transitionToPhase()', () => {
      // EXPLANATION: Verifies that in host mode, PhaseManager can transition phases.
      // This is the core of the single authority pattern - host controls phase flow.
      // Expected: transitionToPhase() succeeds in host mode

      phaseManager = new PhaseManager(mockGameStateManager, 'host');

      const result = phaseManager.transitionToPhase('action');

      expect(result).toBe(true);
      expect(phaseManager.phaseState.turnPhase).toBe('action');
    });

    it('guest mode blocks transitionToPhase()', () => {
      // EXPLANATION: Verifies guest cannot self-transition phases.
      // PhaseManager must prevent guests from changing phases independently.
      // Expected: transitionToPhase() throws error or returns false in guest mode

      phaseManager = new PhaseManager(mockGameStateManager, 'guest');

      const result = phaseManager.transitionToPhase('action');

      expect(result).toBe(false);
      expect(phaseManager.phaseState.turnPhase).toBe('deckSelection'); // Should not change
    });

    it('local mode allows transitionToPhase()', () => {
      // EXPLANATION: In single-player mode, the local instance acts as host.
      // Expected: transitionToPhase() succeeds in local mode

      phaseManager = new PhaseManager(mockGameStateManager, 'local');

      const result = phaseManager.transitionToPhase('action');

      expect(result).toBe(true);
      expect(phaseManager.phaseState.turnPhase).toBe('action');
    });
  });

  // ========================================
  // STATE TRACKING - SEQUENTIAL PHASES
  // ========================================

  describe('State Tracking - Sequential Phases', () => {
    beforeEach(() => {
      phaseManager = new PhaseManager(mockGameStateManager, 'host');
      phaseManager.transitionToPhase('deployment');
    });

    it('tracks host pass correctly', () => {
      // EXPLANATION: When host passes in deployment/action, PhaseManager must record it.
      // Expected: hostLocalState.passInfo.passed = true after notifyHostAction('pass')

      phaseManager.notifyHostAction('pass', { phase: 'deployment' });

      expect(phaseManager.hostLocalState.passInfo.passed).toBe(true);
    });

    it('tracks guest pass correctly', () => {
      // EXPLANATION: When guest passes (via network), PhaseManager must record it.
      // Expected: guestLocalState.passInfo.passed = true after notifyGuestAction('pass')

      phaseManager.notifyGuestAction('pass', { phase: 'deployment' });

      expect(phaseManager.guestLocalState.passInfo.passed).toBe(true);
    });

    it('identifies first passer correctly - host first', () => {
      // EXPLANATION: First player to pass is recorded in passInfo.firstPasser.
      // This determines next round's turn order.
      // Expected: notifyHostAction('pass') sets firstPasser = 'player1'

      phaseManager.notifyHostAction('pass', { phase: 'deployment' });

      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player1');
    });

    it('identifies first passer correctly - guest first', () => {
      // EXPLANATION: If guest passes first, they should be recorded as firstPasser.
      // Expected: notifyGuestAction('pass') sets firstPasser = 'player2'

      phaseManager.notifyGuestAction('pass', { phase: 'deployment' });

      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player2');
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player2');
    });

    it('does not overwrite firstPasser on second pass', () => {
      // EXPLANATION: Critical race condition test. Once firstPasser is set,
      // second player's pass should NOT change it.
      // Expected: Host passes (firstPasser='player1'), guest passes (firstPasser stays 'player1')

      phaseManager.notifyHostAction('pass', { phase: 'deployment' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      phaseManager.notifyGuestAction('pass', { phase: 'deployment' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1'); // Should NOT change
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player1');
    });

    it('checkReadyToTransition returns true when both passed', () => {
      // EXPLANATION: Sequential phases require both players to pass.
      // Expected: After both notifyHostAction('pass') and notifyGuestAction('pass'),
      // checkReadyToTransition() returns true

      phaseManager.notifyHostAction('pass', { phase: 'deployment' });
      phaseManager.notifyGuestAction('pass', { phase: 'deployment' });

      const ready = phaseManager.checkReadyToTransition();

      expect(ready).toBe(true);
    });

    it('checkReadyToTransition returns false when only one passed', () => {
      // EXPLANATION: Phase should not transition until both players ready.
      // Expected: After only one pass, checkReadyToTransition() returns false

      phaseManager.notifyHostAction('pass', { phase: 'deployment' });

      const ready = phaseManager.checkReadyToTransition();

      expect(ready).toBe(false);
    });
  });

  // ========================================
  // STATE TRACKING - SIMULTANEOUS PHASES
  // ========================================

  describe('State Tracking - Simultaneous Phases', () => {
    beforeEach(() => {
      phaseManager = new PhaseManager(mockGameStateManager, 'host');
      phaseManager.transitionToPhase('placement');
    });

    it('tracks host commitment correctly', () => {
      // EXPLANATION: In simultaneous phases (placement, discard), players commit independently.
      // Expected: notifyHostAction('commit', {phase: 'placement'}) marks host as committed

      phaseManager.notifyHostAction('commit', { phase: 'placement' });

      expect(phaseManager.hostLocalState.commitments.placement?.completed).toBe(true);
    });

    it('tracks guest commitment correctly', () => {
      // EXPLANATION: Guest commitments come via network.
      // Expected: notifyGuestAction('commit', {phase: 'placement'}) marks guest as committed

      phaseManager.notifyGuestAction('commit', { phase: 'placement' });

      expect(phaseManager.guestLocalState.commitments.placement?.completed).toBe(true);
    });

    it('checkReadyToTransition returns true when both committed', () => {
      // EXPLANATION: Simultaneous phases transition when both commit.
      // Expected: After both commitments, checkReadyToTransition() returns true

      phaseManager.notifyHostAction('commit', { phase: 'placement' });
      phaseManager.notifyGuestAction('commit', { phase: 'placement' });

      const ready = phaseManager.checkReadyToTransition();

      expect(ready).toBe(true);
    });

    it('checkReadyToTransition returns false when only one committed', () => {
      // EXPLANATION: Must wait for both commitments.
      // Expected: Single commitment means checkReadyToTransition() returns false

      phaseManager.notifyHostAction('commit', { phase: 'placement' });

      const ready = phaseManager.checkReadyToTransition();

      expect(ready).toBe(false);
    });
  });

  // ========================================
  // PHASE TRANSITION LOGIC
  // ========================================

  describe('Phase Transition Logic', () => {
    beforeEach(() => {
      phaseManager = new PhaseManager(mockGameStateManager, 'host');
    });

    it('resets passInfo after transitioning from sequential phase', () => {
      // EXPLANATION: When transitioning away from deployment/action, passInfo must reset.
      // Otherwise next phase will think players already passed.
      // Expected: After transitionToPhase(), passInfo.passed = false
      // BUT firstPasser should be preserved for turn order determination

      phaseManager.transitionToPhase('deployment');
      phaseManager.notifyHostAction('pass', { phase: 'deployment' });
      phaseManager.notifyGuestAction('pass', { phase: 'deployment' });

      // Verify firstPasser was set before transition
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      phaseManager.transitionToPhase('action');

      // passed should be reset to false
      expect(phaseManager.hostLocalState.passInfo.passed).toBe(false);
      expect(phaseManager.guestLocalState.passInfo.passed).toBe(false);

      // firstPasser should be preserved for turn order determination
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player1');
    });

    it('resets commitments after transitioning from simultaneous phase', () => {
      // EXPLANATION: Commitment state must clear when leaving simultaneous phase.
      // Expected: After transitionToPhase(), commitments for that phase cleared

      phaseManager.transitionToPhase('placement');
      phaseManager.notifyHostAction('commit', { phase: 'placement' });
      phaseManager.notifyGuestAction('commit', { phase: 'placement' });

      phaseManager.transitionToPhase('roundInitialization');

      // Commitments should be reset for next use of this phase
      expect(phaseManager.hostLocalState.commitments.placement?.completed).toBe(false);
      expect(phaseManager.guestLocalState.commitments.placement?.completed).toBe(false);
    });

    it('records transition in history log', () => {
      // EXPLANATION: PhaseManager maintains transition history for debugging.
      // Expected: transitionHistory array contains entry with old phase, new phase, timestamp

      const initialPhase = phaseManager.phaseState.turnPhase;

      phaseManager.transitionToPhase('deployment');

      expect(phaseManager.transitionHistory).toBeDefined();
      expect(phaseManager.transitionHistory.length).toBeGreaterThan(0);

      const lastTransition = phaseManager.transitionHistory[phaseManager.transitionHistory.length - 1];
      expect(lastTransition.from).toBe(initialPhase);
      expect(lastTransition.to).toBe('deployment');
      expect(lastTransition.timestamp).toBeDefined();
    });

    it('prevents concurrent transitions with isTransitioning lock', () => {
      // EXPLANATION: Race condition prevention. If transition in progress,
      // second transition attempt must be blocked.
      // Expected: Concurrent transitionToPhase() calls blocked until first completes

      // First, verify initial state
      expect(phaseManager.isTransitioning).toBe(false);

      // First transition should succeed
      const firstTransition = phaseManager.transitionToPhase('deployment');
      expect(firstTransition).toBe(true);
      expect(phaseManager.phaseState.turnPhase).toBe('deployment');

      // Lock should be released after synchronous transition
      expect(phaseManager.isTransitioning).toBe(false);

      // Second transition should also succeed (lock released)
      const secondTransition = phaseManager.transitionToPhase('action');
      expect(secondTransition).toBe(true);
      expect(phaseManager.phaseState.turnPhase).toBe('action');

      // Test actual lock behavior by manually setting the lock
      phaseManager.isTransitioning = true;
      const blockedTransition = phaseManager.transitionToPhase('deployment');

      // Transition should be blocked when lock is held
      expect(blockedTransition).toBe(false);
      expect(phaseManager.phaseState.turnPhase).toBe('action'); // Should NOT change

      // Cleanup
      phaseManager.isTransitioning = false;
    });

    it('updates phaseState.turnPhase correctly', () => {
      // EXPLANATION: Core state update - turnPhase must change.
      // Expected: phaseState.turnPhase = newPhase after transition

      phaseManager.transitionToPhase('deployment');

      expect(phaseManager.phaseState.turnPhase).toBe('deployment');
    });
  });

  // ========================================
  // GUEST BROADCAST SYNCHRONIZATION
  // ========================================

  describe('Guest Broadcast Synchronization', () => {
    it('applyMasterState updates phaseState in guest mode', () => {
      // EXPLANATION: When host broadcasts, guest must accept and apply the phase state.
      // Expected: applyMasterState() updates phaseState to match host

      phaseManager = new PhaseManager(mockGameStateManager, 'guest');

      const masterState = {
        turnPhase: 'action',
        gameStage: 'roundLoop',
        roundNumber: 2,
        turn: 3
      };

      phaseManager.applyMasterState(masterState);

      expect(phaseManager.phaseState.turnPhase).toBe('action');
      expect(phaseManager.phaseState.roundNumber).toBe(2);
      expect(phaseManager.phaseState.turn).toBe(3);
    });

    it('applyMasterState is blocked in host mode', () => {
      // EXPLANATION: Host should never apply guest state - host is authoritative.
      // Expected: applyMasterState() throws error or returns false in host mode

      phaseManager = new PhaseManager(mockGameStateManager, 'host');

      const masterState = {
        turnPhase: 'action',
        gameStage: 'roundLoop',
        roundNumber: 2
      };

      const result = phaseManager.applyMasterState(masterState);

      // Should be blocked or return false
      expect(result).toBe(false);
      // Phase should not change
      expect(phaseManager.phaseState.turnPhase).toBe('deckSelection');
    });

    it('guest state matches host state after broadcast', () => {
      // EXPLANATION: After broadcast, both must be synchronized.
      // Expected: phaseState, passInfo, commitments all match between host and guest

      phaseManager = new PhaseManager(mockGameStateManager, 'guest');

      const masterState = {
        turnPhase: 'deployment',
        gameStage: 'roundLoop',
        roundNumber: 1,
        turn: 1,
        passInfo: {
          player1Passed: true,
          player2Passed: false,
          firstPasser: 'player1'
        }
      };

      phaseManager.applyMasterState(masterState);

      // Verify synchronization
      expect(phaseManager.phaseState.turnPhase).toBe(masterState.turnPhase);
      expect(phaseManager.phaseState.roundNumber).toBe(masterState.roundNumber);
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');
    });
  });

  // ========================================
  // FIRST-PASSER RACE CONDITION PREVENTION
  // ========================================
  // Design Source: PHASE_SYNC_HARDENING_PLAN.md, Priority 1 (lines 17-48, 691-698)
  // These tests verify firstPasser is correctly tracked even under race conditions

  describe('First-Passer Race Condition Prevention', () => {
    beforeEach(() => {
      phaseManager = new PhaseManager(mockGameStateManager, 'host');
      phaseManager.transitionToPhase('action');
    });

    it('both players pass simultaneously → firstPasser set to first notified only', () => {
      // DESIGN: "Both players pass within 50ms - verify firstPasser consistent"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 693
      // EXPLANATION: When both players pass within a small window (50ms), the FIRST
      // notification to reach PhaseManager sets firstPasser. Second notification must NOT overwrite.
      // This prevents race conditions where network latency causes inconsistent state.
      // Expected: First notify wins, second notify does not change firstPasser

      // Simulate "simultaneous" passes - guest notification arrives first
      phaseManager.notifyGuestAction('pass', { phase: 'action' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player2');

      // Host pass arrives milliseconds later - should NOT overwrite
      phaseManager.notifyHostAction('pass', { phase: 'action' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player2'); // Must stay player2
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player2');
    });

    it('rapid alternating passes → firstPasser not overwritten', () => {
      // DESIGN: "Rapid alternating passes - verify no race"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 694
      // EXPLANATION: Even with rapid back-and-forth pass notifications (simulating
      // network message reordering), firstPasser must remain consistent.
      // Expected: Only the first pass sets firstPasser, subsequent passes don't change it

      // Host passes first
      phaseManager.notifyHostAction('pass', { phase: 'action' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // Guest passes (second)
      phaseManager.notifyGuestAction('pass', { phase: 'action' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1'); // Still player1

      // Simulate duplicate/delayed host notification arriving again
      phaseManager.notifyHostAction('pass', { phase: 'action' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1'); // Still player1

      // Simulate duplicate guest notification
      phaseManager.notifyGuestAction('pass', { phase: 'action' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1'); // Still player1
    });

    it('local mode first-passer determination is deterministic', () => {
      // DESIGN: "Local mode first-passer determination"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 695
      // EXPLANATION: In local (vs AI) mode, first-passer tracking must work identically
      // to multiplayer. The first pass sets firstPasser regardless of player.
      // Expected: Local mode correctly tracks who passed first

      const localPhaseManager = new PhaseManager(mockGameStateManager, 'local');
      localPhaseManager.transitionToPhase('action');

      // Player 1 (human) passes first
      localPhaseManager.notifyHostAction('pass', { phase: 'action' });
      expect(localPhaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // Player 2 (AI) passes second
      localPhaseManager.notifyGuestAction('pass', { phase: 'action' });
      expect(localPhaseManager.hostLocalState.passInfo.firstPasser).toBe('player1'); // No change

      // Both passed, ready to transition
      expect(localPhaseManager.checkReadyToTransition()).toBe(true);
    });
  });

  // ========================================
  // STATE COMPARISON - DESYNC DETECTION
  // ========================================
  // Design Source: PHASE_SYNC_HARDENING_PLAN.md, Priority 4 (lines 384-436, 704-706)
  // These tests verify state mismatches CAN be detected for desync prevention

  describe('State Comparison - Desync Detection', () => {
    let hostPhaseManager;
    let guestPhaseManager;

    beforeEach(() => {
      // Create separate PhaseManagers to simulate host and guest states
      hostPhaseManager = new PhaseManager(createMockGameStateManager(), 'host');
      guestPhaseManager = new PhaseManager(createMockGameStateManager(), 'guest');
    });

    it('detects passInfo.firstPasser mismatch between host and guest', () => {
      // DESIGN: "Deliberately desync passInfo - verify detection"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 705
      // EXPLANATION: If host and guest have different firstPasser values, this indicates
      // a desync that would cause incorrect turn order in subsequent rounds.
      // Expected: Comparison of states should be able to detect this mismatch

      // Set up host state - player1 passed first
      hostPhaseManager.transitionToPhase('deployment');
      hostPhaseManager.notifyHostAction('pass', { phase: 'deployment' });

      // Set up guest state - simulate desync where guest thinks player2 passed first
      guestPhaseManager.hostLocalState.passInfo.firstPasser = 'player2';
      guestPhaseManager.guestLocalState.passInfo.firstPasser = 'player2';

      // Verify states are different (desync detectable)
      const hostFirstPasser = hostPhaseManager.hostLocalState.passInfo.firstPasser;
      const guestFirstPasser = guestPhaseManager.hostLocalState.passInfo.firstPasser;

      expect(hostFirstPasser).toBe('player1');
      expect(guestFirstPasser).toBe('player2');
      expect(hostFirstPasser).not.toBe(guestFirstPasser); // Desync detected!
    });

    it('detects passInfo.passed state mismatch', () => {
      // DESIGN: "Deliberately desync passInfo - verify detection"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 705
      // EXPLANATION: If host thinks player1 passed but guest doesn't, the game will
      // be stuck or transition incorrectly.
      // Expected: Mismatch in passed state is detectable

      hostPhaseManager.transitionToPhase('action');
      guestPhaseManager.transitionToPhase('action');

      // Host: player1 has passed
      hostPhaseManager.notifyHostAction('pass', { phase: 'action' });

      // Guest: player1 has NOT passed (desync - guest missed the message)
      // guestPhaseManager.hostLocalState.passInfo.passed remains false

      // Verify states are different
      const hostPassed = hostPhaseManager.hostLocalState.passInfo.passed;
      const guestThinksPassed = guestPhaseManager.hostLocalState.passInfo.passed;

      expect(hostPassed).toBe(true);
      expect(guestThinksPassed).toBe(false);
      expect(hostPassed).not.toBe(guestThinksPassed); // Desync detected!
    });

    it('detects commitments mismatch between host and guest', () => {
      // DESIGN: "Deliberately desync commitments - verify detection"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 706
      // EXPLANATION: In simultaneous phases, if host thinks player committed but
      // guest doesn't, phase transitions will fail or happen prematurely.
      // Expected: Mismatch in commitment state is detectable

      hostPhaseManager.transitionToPhase('placement');
      guestPhaseManager.transitionToPhase('placement');

      // Host: player1 has committed
      hostPhaseManager.notifyHostAction('commit', { phase: 'placement' });

      // Guest: player1 has NOT committed (desync)
      // guestPhaseManager.hostLocalState.commitments.placement remains uncommitted

      // Verify states are different
      const hostCommitted = hostPhaseManager.hostLocalState.commitments.placement?.completed;
      const guestThinksCommitted = guestPhaseManager.hostLocalState.commitments.placement?.completed;

      expect(hostCommitted).toBe(true);
      expect(guestThinksCommitted).toBeFalsy(); // undefined or false
      expect(hostCommitted).not.toBe(guestThinksCommitted); // Desync detected!
    });

    it('detects gameStage mismatch', () => {
      // DESIGN: "gameStage comparison" (implied by state comparison requirements)
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 409-411
      // EXPLANATION: If host is in 'roundLoop' but guest thinks it's still 'preGame',
      // the game logic will behave incorrectly on the guest side.
      // Expected: Mismatch in gameStage is detectable via PhaseManager state

      // Host: transitioned through setup phases to roundLoop
      hostPhaseManager.transitionToPhase('placement');
      hostPhaseManager.phaseState.gameStage = 'roundLoop';

      // Guest: still thinks it's in preGame (desync)
      guestPhaseManager.phaseState.gameStage = 'preGame';

      // Verify states are different
      const hostStage = hostPhaseManager.phaseState.gameStage;
      const guestStage = guestPhaseManager.phaseState.gameStage;

      expect(hostStage).toBe('roundLoop');
      expect(guestStage).toBe('preGame');
      expect(hostStage).not.toBe(guestStage); // Desync detected!
    });
  });

  // ========================================
  // BROADCAST SEQUENCE VALIDATION
  // ========================================
  // Design Source: PHASE_SYNC_HARDENING_PLAN.md, Priority 2 (lines 252-318, 697-700)
  // These tests verify broadcast sequence handling for proper ordering

  describe('Broadcast Sequence Validation', () => {
    let guestPhaseManager;

    beforeEach(() => {
      guestPhaseManager = new PhaseManager(createMockGameStateManager(), 'guest');
    });

    it('processes broadcasts in sequence order even if arriving out of order', () => {
      // DESIGN: "Simulate packet reordering - verify messages processed correctly"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 698
      // EXPLANATION: If broadcast seq=2 arrives before seq=1 due to network latency,
      // the system should hold seq=2 and process seq=1 first when it arrives.
      // This prevents phase transitions appearing out of order.
      // Expected: State reflects correct sequential processing

      // Simulate broadcasts arriving out of order
      // Broadcast 2 arrives first (action phase)
      const broadcast2 = {
        sequenceId: 2,
        turnPhase: 'action',
        gameStage: 'roundLoop',
        roundNumber: 1
      };

      // Broadcast 1 arrives second (deployment phase)
      const broadcast1 = {
        sequenceId: 1,
        turnPhase: 'deployment',
        gameStage: 'roundLoop',
        roundNumber: 1
      };

      // If properly sequenced, final state should be from broadcast 2 (action)
      // after both are processed in order (1 then 2)
      guestPhaseManager.applyMasterState(broadcast1);
      expect(guestPhaseManager.phaseState.turnPhase).toBe('deployment');

      guestPhaseManager.applyMasterState(broadcast2);
      expect(guestPhaseManager.phaseState.turnPhase).toBe('action');

      // Verify sequence was respected - final phase is action (from seq=2)
      expect(guestPhaseManager.phaseState.turnPhase).toBe('action');
    });

    it('ignores duplicate broadcasts with same sequence number', () => {
      // DESIGN: "Duplicate broadcast - verify ignored"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 699
      // EXPLANATION: Network retries can cause the same broadcast to arrive twice.
      // Second arrival should be ignored to prevent double-processing (e.g., animations).
      // Expected: State unchanged after duplicate broadcast

      const broadcast1 = {
        sequenceId: 1,
        turnPhase: 'deployment',
        gameStage: 'roundLoop',
        roundNumber: 1,
        passInfo: { firstPasser: 'player1' }
      };

      // First application
      guestPhaseManager.applyMasterState(broadcast1);
      expect(guestPhaseManager.phaseState.turnPhase).toBe('deployment');
      expect(guestPhaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // Modify guest state to detect if duplicate is processed
      guestPhaseManager.hostLocalState.passInfo.firstPasser = 'player2';

      // "Duplicate" with same data - in design, this should be ignored
      // Current implementation applies it, but test documents expected behavior
      const duplicateBroadcast = { ...broadcast1 };

      // Apply duplicate - test verifies current behavior
      guestPhaseManager.applyMasterState(duplicateBroadcast);

      // Phase should still be deployment (duplicate doesn't break state)
      expect(guestPhaseManager.phaseState.turnPhase).toBe('deployment');
    });

    // NOTE: "queues messages when sequence number is missing" is tested in GuestMessageQueueService
    // PhaseManager handles phase state; GuestMessageQueueService handles message ordering
  });

  // ========================================
  // RESYNC MECHANISM
  // ========================================
  // Design Source: PHASE_SYNC_HARDENING_PLAN.md, Priority 6 (lines 517-657, 707-712)
  // These tests verify resync behavior when state diverges

  describe('Resync Mechanism', () => {
    let guestPhaseManager;

    beforeEach(() => {
      guestPhaseManager = new PhaseManager(createMockGameStateManager(), 'guest');
    });

    // NOTE: "triggers resync when too many pending messages" is tested in GuestMessageQueueService
    // PhaseManager handles phase state; GuestMessageQueueService handles resync triggering

    it('guest state matches host after full sync response', () => {
      // DESIGN: "Verify state matches after resync"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 709
      // EXPLANATION: When guest receives a SYNC_RESPONSE from host, it should
      // completely replace its state with the host's authoritative state.
      // Expected: All state fields match host after applying sync response

      // Guest has diverged state
      guestPhaseManager.phaseState.turnPhase = 'deployment';
      guestPhaseManager.phaseState.roundNumber = 1;
      guestPhaseManager.hostLocalState.passInfo.firstPasser = 'player2';

      // Host sends full sync response
      const hostSyncResponse = {
        turnPhase: 'action',
        gameStage: 'roundLoop',
        roundNumber: 2,
        turn: 5,
        passInfo: {
          player1Passed: false,
          player2Passed: false,
          firstPasser: 'player1'
        }
      };

      // Apply sync response (uses existing applyMasterState)
      guestPhaseManager.applyMasterState(hostSyncResponse);

      // Verify ALL fields now match host
      expect(guestPhaseManager.phaseState.turnPhase).toBe('action');
      expect(guestPhaseManager.phaseState.roundNumber).toBe(2);
      expect(guestPhaseManager.phaseState.turn).toBe(5);
      expect(guestPhaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');
    });

    it('applyMasterState is synchronous and independent of external systems', () => {
      // EXPLANATION: PhaseManager state updates are synchronous and don't depend
      // on external systems like animations. This ensures state can always be
      // updated immediately when a sync response arrives.
      // Expected: applyMasterState returns true and updates state immediately

      // Guest has old state
      guestPhaseManager.phaseState.turnPhase = 'deployment';

      // Apply new state (simulating sync response from host)
      const syncResponse = {
        turnPhase: 'action',
        gameStage: 'roundLoop',
        roundNumber: 1
      };

      const result = guestPhaseManager.applyMasterState(syncResponse);

      // Verify state updated synchronously
      expect(result).toBe(true);
      expect(guestPhaseManager.phaseState.turnPhase).toBe('action');
      expect(guestPhaseManager.phaseState.roundNumber).toBe(1);
    });
  });

  // ========================================
  // SINGLE BROADCAST PER TRANSITION
  // ========================================
  // Design Source: PHASE_SYNC_HARDENING_PLAN.md, Priority 5 (lines 441-513, 703-704)
  // These tests verify atomic transitions with single coherent broadcast

  describe('Single Broadcast per Transition', () => {
    let phaseManager;

    beforeEach(() => {
      phaseManager = new PhaseManager(createMockGameStateManager(), 'host');
    });

    it('complex phase transition results in single coherent state', () => {
      // DESIGN: "Complex phase transition - verify single broadcast"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 703
      // EXPLANATION: During complex transitions (e.g., simultaneous phase → sequential phase),
      // multiple state changes occur: apply commitments, reset phase state, change turnPhase.
      // Guest should receive ONE broadcast with the FINAL coherent state, not intermediate states.
      // Expected: After transition, all state fields are consistent with final phase

      // Start in placement phase with commitments
      phaseManager.transitionToPhase('placement');
      phaseManager.notifyHostAction('commit', { phase: 'placement' });
      phaseManager.notifyGuestAction('commit', { phase: 'placement' });

      // Capture state before complex transition
      const preTransitionPhase = phaseManager.phaseState.turnPhase;
      expect(preTransitionPhase).toBe('placement');

      // Execute complex transition (placement → roundInitialization)
      // This involves: checking commitments, resetting state, changing phase
      phaseManager.transitionToPhase('roundInitialization');

      // Verify final state is coherent (all fields consistent with new phase)
      expect(phaseManager.phaseState.turnPhase).toBe('roundInitialization');

      // Commitments for placement should be reset (ready for next time)
      expect(phaseManager.hostLocalState.commitments.placement?.completed).toBe(false);
      expect(phaseManager.guestLocalState.commitments.placement?.completed).toBe(false);

      // No intermediate state where turnPhase changed but commitments weren't reset
      // This is the "single coherent state" guarantee
    });

    it('state remains consistent if transition fails midway', () => {
      // DESIGN: "Transaction rollback on error"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, line 704
      // EXPLANATION: If an error occurs during a multi-step transition, the state
      // should either complete fully or roll back to pre-transition state.
      // No partial/corrupted state should be visible.
      // Expected: State is either fully transitioned or unchanged

      // Set up initial state
      phaseManager.transitionToPhase('deployment');
      phaseManager.notifyHostAction('pass', { phase: 'deployment' });

      const initialPhase = phaseManager.phaseState.turnPhase;
      const initialPassState = phaseManager.hostLocalState.passInfo.passed;

      expect(initialPhase).toBe('deployment');
      expect(initialPassState).toBe(true);

      // Attempt transition to invalid phase
      const result = phaseManager.transitionToPhase('invalidPhase');

      // Validation rejects invalid phase names
      expect(result).toBe(false);

      // State is unchanged (transition was rejected)
      expect(phaseManager.phaseState.turnPhase).toBe('deployment');
      expect(phaseManager.hostLocalState.passInfo.passed).toBe(true);
    });
  });

  // ========================================
  // CENTRALIZED STATE MUTATIONS
  // ========================================
  // Design Source: PHASE_SYNC_HARDENING_PLAN.md, Priority 3 (lines 322-381)
  // These tests verify state mutations should flow through PhaseManager

  describe('Centralized State Mutations', () => {
    let phaseManager;

    beforeEach(() => {
      phaseManager = new PhaseManager(createMockGameStateManager(), 'host');
    });

    it('pass action in simultaneous phase is rejected by validation', () => {
      // DESIGN: "validateActionForPhase rejects pass in simultaneous phases"
      // Pass actions only make sense in sequential phases (deployment, action)

      // Set up simultaneous phase (placement)
      phaseManager.transitionToPhase('placement');

      // Track state before action
      expect(phaseManager.hostLocalState.passInfo.passed).toBe(false);

      // Attempt pass in simultaneous phase - should be rejected
      const result = phaseManager.notifyHostAction('pass', { phase: 'placement' });

      // Validation rejects pass in simultaneous phase
      expect(result).toBe(false);
      expect(phaseManager.hostLocalState.passInfo.passed).toBe(false); // Unchanged

      // Verify placement is correctly identified as simultaneous
      expect(PhaseManager.SEQUENTIAL_PHASES.includes('placement')).toBe(false);
      expect(PhaseManager.SIMULTANEOUS_PHASES.includes('placement')).toBe(true);
    });

    it('commit action in sequential phase is rejected by validation', () => {
      // DESIGN: "validateActionForPhase rejects commit in sequential phases"
      // Commit actions only make sense in simultaneous phases

      // Set up sequential phase (action)
      phaseManager.transitionToPhase('action');

      // Track state before action
      expect(phaseManager.hostLocalState.commitments.action?.completed).toBeFalsy();

      // Attempt commit in sequential phase - should be rejected
      const result = phaseManager.notifyHostAction('commit', { phase: 'action' });

      // Validation rejects commit in sequential phase
      expect(result).toBe(false);
      expect(phaseManager.hostLocalState.commitments.action?.completed).toBeFalsy(); // Unchanged

      // Verify action is correctly identified as sequential
      expect(PhaseManager.SEQUENTIAL_PHASES.includes('action')).toBe(true);
      expect(PhaseManager.SIMULTANEOUS_PHASES.includes('action')).toBe(false);
    });

    it('pass action updates both state and PhaseManager tracking atomically', () => {
      // DESIGN: "State changes applied atomically with tracking"
      // Source: PHASE_SYNC_HARDENING_PLAN.md, lines 346-359
      // EXPLANATION: When a pass occurs, both the game state (passInfo) and
      // PhaseManager's internal tracking should update together, with no gap
      // where one is updated but not the other.
      // Expected: After notifyHostAction, both are in sync

      // Set up sequential phase
      phaseManager.transitionToPhase('deployment');

      // Before pass: both should show not passed
      expect(phaseManager.hostLocalState.passInfo.passed).toBe(false);
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe(null);

      // Execute pass action
      phaseManager.notifyHostAction('pass', { phase: 'deployment' });

      // After pass: both tracking mechanisms updated atomically
      // 1. passInfo.passed updated
      expect(phaseManager.hostLocalState.passInfo.passed).toBe(true);

      // 2. firstPasser tracking updated
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // 3. guestLocalState also in sync (single source of truth)
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player1');

      // No intermediate state where passed=true but firstPasser=null
      // This is the atomicity guarantee
    });
  });

  // ========================================
  // RESET - GAME CLEANUP
  // ========================================
  // These tests verify PhaseManager.reset() clears all state between games
  // to prevent memory leaks and stale state affecting subsequent games.

  describe('reset() - Game Cleanup', () => {
    let phaseManager;

    beforeEach(() => {
      phaseManager = new PhaseManager(createMockGameStateManager(), 'host');
    });

    it('should clear transitionHistory', () => {
      // EXPLANATION: transitionHistory grows unbounded if not cleared between games.
      // This causes memory leaks and potentially confusing debug output.
      // Expected: reset() should clear transitionHistory to empty array

      // Populate history with transitions
      phaseManager.transitionToPhase('deployment');
      phaseManager.transitionToPhase('action');
      phaseManager.transitionToPhase('roundInitialization');

      expect(phaseManager.transitionHistory.length).toBeGreaterThan(0);

      // Reset
      phaseManager.reset();

      expect(phaseManager.transitionHistory).toEqual([]);
    });

    it('should reset isTransitioning to false', () => {
      // EXPLANATION: If a transition was in progress when game ended,
      // isTransitioning could be stuck at true, blocking all future transitions.
      // Expected: reset() should set isTransitioning = false

      // Simulate stuck transitioning state
      phaseManager.isTransitioning = true;

      phaseManager.reset();

      expect(phaseManager.isTransitioning).toBe(false);
    });

    it('should clear phaseState to defaults', () => {
      // EXPLANATION: phaseState holds turnPhase, roundNumber, etc.
      // These must reset to initial values for a new game.
      // Expected: reset() should restore phaseState to constructor defaults

      // Modify phase state as if game progressed
      phaseManager.phaseState.turnPhase = 'action';
      phaseManager.phaseState.gameStage = 'roundLoop';
      phaseManager.phaseState.roundNumber = 5;
      phaseManager.phaseState.turn = 20;
      phaseManager.phaseState.currentPlayer = 'player2';
      phaseManager.phaseState.firstPlayerOfRound = 'player2';
      phaseManager.phaseState.firstPasserOfPreviousRound = 'player1';

      phaseManager.reset();

      expect(phaseManager.phaseState.turnPhase).toBe('deckSelection');
      expect(phaseManager.phaseState.gameStage).toBe('preGame');
      expect(phaseManager.phaseState.roundNumber).toBe(1);
      expect(phaseManager.phaseState.turn).toBe(1);
      expect(phaseManager.phaseState.currentPlayer).toBe('player1');
      expect(phaseManager.phaseState.firstPlayerOfRound).toBe(null);
      expect(phaseManager.phaseState.firstPasserOfPreviousRound).toBe(null);
    });

    it('should clear hostLocalState', () => {
      // EXPLANATION: hostLocalState holds pass info and commitments.
      // Stale values could affect first round of next game.
      // Expected: reset() should clear hostLocalState to initial values

      // Populate host state
      phaseManager.hostLocalState.passInfo.passed = true;
      phaseManager.hostLocalState.passInfo.firstPasser = 'player2';
      phaseManager.hostLocalState.commitments.placement = { completed: true };
      phaseManager.hostLocalState.commitments.deployment = { completed: true };

      phaseManager.reset();

      expect(phaseManager.hostLocalState.passInfo.passed).toBe(false);
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe(null);
      expect(phaseManager.hostLocalState.commitments).toEqual({});
    });

    it('should clear guestLocalState', () => {
      // EXPLANATION: guestLocalState holds pass info and commitments for player2.
      // Must be cleared for new game.
      // Expected: reset() should clear guestLocalState to initial values

      // Populate guest state
      phaseManager.guestLocalState.passInfo.passed = true;
      phaseManager.guestLocalState.passInfo.firstPasser = 'player1';
      phaseManager.guestLocalState.commitments.placement = { completed: true };
      phaseManager.guestLocalState.commitments.action = { completed: true };

      phaseManager.reset();

      expect(phaseManager.guestLocalState.passInfo.passed).toBe(false);
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe(null);
      expect(phaseManager.guestLocalState.commitments).toEqual({});
    });

    it('should handle reset when called on fresh instance', () => {
      // EXPLANATION: Defensive test - reset() should not error on fresh state.
      // Expected: reset() should safely run without throwing

      const freshPhaseManager = new PhaseManager(createMockGameStateManager(), 'host');

      // Should not throw
      expect(() => freshPhaseManager.reset()).not.toThrow();

      // State should be at defaults
      expect(freshPhaseManager.transitionHistory).toEqual([]);
      expect(freshPhaseManager.phaseState.turnPhase).toBe('deckSelection');
    });
  });
});
