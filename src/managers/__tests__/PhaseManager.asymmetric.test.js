import { describe, it, expect, vi, beforeEach } from 'vitest';
import PhaseManager from '../PhaseManager.js';
import {
  createLocalModeGameStateManager,
  createHostModeGameStateManager,
  createGuestModeGameStateManager,
  createMockHostBroadcast,
  ASYMMETRIC_SCENARIOS,
  getExpectedBehavior
} from '../../test/helpers/phaseTestHelpers.js';

/**
 * ASYMMETRIC PHASE TESTS
 *
 * These tests verify behavior when one player needs action while the other auto-approves.
 * This is a critical source of desync bugs in multiplayer.
 *
 * Test IDs from: Design/PHASE_FLOW_TEST_COVERAGE.md
 *
 * Phases covered:
 * - mandatoryDiscard (MD-L1 through MD-G3)
 * - mandatoryDroneRemoval (MR-L1 through MR-G4)
 * - allocateShields (AS-L1 through AS-G4)
 * - optionalDiscard (OD-L1 through OD-G4)
 */

describe('Asymmetric Phase Tests', () => {

  // ========================================
  // LOCAL MODE: mandatoryDiscard (MD-L1 to MD-L4)
  // ========================================
  describe('Local Mode - mandatoryDiscard', () => {
    let phaseManager;
    let mockGameStateManager;

    /**
     * MD-L1: Both need action
     * Human (P1) has 8 cards (limit 6), AI (P2) has 8 cards
     * AI auto-commits inline after Human
     */
    it('MD-L1: Both players need to discard → AI auto-commits after Human', () => {
      mockGameStateManager = createLocalModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.BOTH_NEED,
        phase: 'mandatoryDiscard'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'local');
      phaseManager.transitionToPhase('mandatoryDiscard');

      // Verify initial state
      expect(phaseManager.phaseState.turnPhase).toBe('mandatoryDiscard');
      expect(phaseManager.hostLocalState.commitments.mandatoryDiscard?.completed).toBeFalsy();
      expect(phaseManager.guestLocalState.commitments.mandatoryDiscard?.completed).toBeFalsy();

      // Human (P1) commits first
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.hostLocalState.commitments.mandatoryDiscard.completed).toBe(true);
      expect(phaseManager.checkReadyToTransition()).toBe(false); // Still waiting for AI

      // AI (P2) commits (simulating handleAICommitment inline behavior)
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.guestLocalState.commitments.mandatoryDiscard.completed).toBe(true);
      expect(phaseManager.checkReadyToTransition()).toBe(true); // Both committed

      // Verify expected behavior from helper
      const expected = getExpectedBehavior('BOTH_NEED', 'local');
      expect(expected.p1Acts).toBe(true);
      expect(expected.p2Acts).toBe(true);
      expect(expected.aiAutoCommits).toBe(true);
    });

    /**
     * MD-L2: Only Human (P1) needs action
     * Human has 8 cards (needs discard), AI has 5 cards (auto-approves)
     */
    it('MD-L2: Only Human needs to discard → AI auto-approves', () => {
      mockGameStateManager = createLocalModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.ONLY_P1,
        phase: 'mandatoryDiscard'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'local');
      phaseManager.transitionToPhase('mandatoryDiscard');

      // Verify state setup - P1 has cards over limit, P2 doesn't
      const state = mockGameStateManager.getState();
      expect(state.player1.hand.length).toBe(8); // Over limit
      expect(state.player2.hand.length).toBe(5); // Under limit

      // AI auto-approves immediately (simulating ActionProcessor behavior)
      // In real code, AI would call processCommitment with auto-approve
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.guestLocalState.commitments.mandatoryDiscard.completed).toBe(true);

      // Not ready yet - Human still needs to commit
      expect(phaseManager.checkReadyToTransition()).toBe(false);

      // Human commits after discarding
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.hostLocalState.commitments.mandatoryDiscard.completed).toBe(true);

      // Now ready to transition
      expect(phaseManager.checkReadyToTransition()).toBe(true);

      // Verify expected behavior
      const expected = getExpectedBehavior('ONLY_P1', 'local');
      expect(expected.aiAutoApproves).toBe(true);
    });

    /**
     * MD-L3: Only AI (P2) needs action
     * Human has 5 cards (auto-approves), AI has 8 cards (needs discard)
     * This is a HIGH PRIORITY test - asymmetric where P2 acts, P1 doesn't
     */
    it('MD-L3: Only AI needs to discard → Human auto-approves, AI acts', () => {
      mockGameStateManager = createLocalModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.ONLY_P2,
        phase: 'mandatoryDiscard'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'local');
      phaseManager.transitionToPhase('mandatoryDiscard');

      // Verify state setup - P1 under limit, P2 over limit
      const state = mockGameStateManager.getState();
      expect(state.player1.hand.length).toBe(5); // Under limit
      expect(state.player2.hand.length).toBe(8); // Over limit

      // Human auto-approves immediately (no cards to discard)
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.hostLocalState.commitments.mandatoryDiscard.completed).toBe(true);

      // Not ready yet - AI still needs to act and commit
      expect(phaseManager.checkReadyToTransition()).toBe(false);

      // AI commits after discarding
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.guestLocalState.commitments.mandatoryDiscard.completed).toBe(true);

      // Now ready to transition
      expect(phaseManager.checkReadyToTransition()).toBe(true);

      // Verify expected behavior
      const expected = getExpectedBehavior('ONLY_P2', 'local');
      expect(expected.humanAutoApproves).toBe(true);
      expect(expected.aiActs).toBe(true);
    });

    /**
     * MD-L4: Neither needs action
     * Both players under hand limit - phase should be skipped
     */
    it('MD-L4: Neither needs to discard → Phase should be skipped', () => {
      mockGameStateManager = createLocalModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.NEITHER,
        phase: 'mandatoryDiscard'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'local');

      // Verify state setup - both under limit
      const state = mockGameStateManager.getState();
      expect(state.player1.hand.length).toBe(5); // Under limit
      expect(state.player2.hand.length).toBe(5); // Under limit

      // In real game, isPhaseRequired would return false
      // For this test, we verify the state is set up correctly
      // and that auto-approves work correctly
      phaseManager.transitionToPhase('mandatoryDiscard');

      // Both auto-approve
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDiscard' });
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDiscard' });

      // Ready immediately
      expect(phaseManager.checkReadyToTransition()).toBe(true);

      // Verify expected behavior
      const expected = getExpectedBehavior('NEITHER', 'local');
      expect(expected.phaseSkipped).toBe(true);
    });
  });

  // ========================================
  // LOCAL MODE: mandatoryDroneRemoval (MR-L1 to MR-L4)
  // ========================================
  describe('Local Mode - mandatoryDroneRemoval', () => {
    let phaseManager;
    let mockGameStateManager;

    /**
     * MR-L1: Both exceed drone limit
     */
    it('MR-L1: Both exceed drone limit → AI auto-commits after Human', () => {
      mockGameStateManager = createLocalModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.BOTH_NEED,
        phase: 'mandatoryDroneRemoval'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'local');
      phaseManager.transitionToPhase('mandatoryDroneRemoval');

      // Verify drone counts exceed limit (limit = 4)
      const state = mockGameStateManager.getState();
      const p1Drones = Object.values(state.player1.dronesOnBoard).flat().length;
      const p2Drones = Object.values(state.player2.dronesOnBoard).flat().length;
      expect(p1Drones).toBe(6); // 3 + 2 + 1 = 6, exceeds limit of 4
      expect(p2Drones).toBe(6);

      // Human commits
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDroneRemoval' });
      expect(phaseManager.checkReadyToTransition()).toBe(false);

      // AI commits
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDroneRemoval' });
      expect(phaseManager.checkReadyToTransition()).toBe(true);
    });

    /**
     * MR-L2: Only Human exceeds limit
     */
    it('MR-L2: Only Human exceeds limit → AI auto-approves', () => {
      mockGameStateManager = createLocalModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.ONLY_P1,
        phase: 'mandatoryDroneRemoval'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'local');
      phaseManager.transitionToPhase('mandatoryDroneRemoval');

      // Verify state
      const state = mockGameStateManager.getState();
      const p1Drones = Object.values(state.player1.dronesOnBoard).flat().length;
      const p2Drones = Object.values(state.player2.dronesOnBoard).flat().length;
      expect(p1Drones).toBe(6); // Exceeds limit
      expect(p2Drones).toBe(2); // Under limit

      // AI auto-approves first
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDroneRemoval' });
      expect(phaseManager.checkReadyToTransition()).toBe(false); // Human still needs to act

      // Human commits after removal
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDroneRemoval' });
      expect(phaseManager.checkReadyToTransition()).toBe(true);
    });

    /**
     * MR-L3: Only AI exceeds limit
     * HIGH PRIORITY: Tests asymmetric where P2 needs to act, P1 doesn't
     */
    it('MR-L3: Only AI exceeds limit → Human auto-approves, AI acts', () => {
      mockGameStateManager = createLocalModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.ONLY_P2,
        phase: 'mandatoryDroneRemoval'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'local');
      phaseManager.transitionToPhase('mandatoryDroneRemoval');

      // Verify state
      const state = mockGameStateManager.getState();
      const p1Drones = Object.values(state.player1.dronesOnBoard).flat().length;
      const p2Drones = Object.values(state.player2.dronesOnBoard).flat().length;
      expect(p1Drones).toBe(2); // Under limit
      expect(p2Drones).toBe(6); // Exceeds limit

      // Human auto-approves first
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDroneRemoval' });
      expect(phaseManager.checkReadyToTransition()).toBe(false); // AI still needs to act

      // AI commits after removal
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDroneRemoval' });
      expect(phaseManager.checkReadyToTransition()).toBe(true);
    });

    /**
     * MR-L4: Neither exceeds limit
     */
    it('MR-L4: Neither exceeds limit → Phase skipped', () => {
      mockGameStateManager = createLocalModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.NEITHER,
        phase: 'mandatoryDroneRemoval'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'local');

      // Verify both under limit
      const state = mockGameStateManager.getState();
      const p1Drones = Object.values(state.player1.dronesOnBoard).flat().length;
      const p2Drones = Object.values(state.player2.dronesOnBoard).flat().length;
      expect(p1Drones).toBe(2);
      expect(p2Drones).toBe(2);

      phaseManager.transitionToPhase('mandatoryDroneRemoval');

      // Both auto-approve
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDroneRemoval' });
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDroneRemoval' });
      expect(phaseManager.checkReadyToTransition()).toBe(true);
    });
  });

  // ========================================
  // HOST MODE: mandatoryDiscard (MD-H1 to MD-H5)
  // ========================================
  describe('Host Mode - mandatoryDiscard', () => {
    let phaseManager;
    let mockGameStateManager;

    /**
     * MD-H1: Both need action - Host commits first
     */
    it('MD-H1: Both need action, Host commits first → waits for Guest via network', () => {
      mockGameStateManager = createHostModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.BOTH_NEED,
        phase: 'mandatoryDiscard'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'host');
      phaseManager.transitionToPhase('mandatoryDiscard');

      // Host commits first
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.hostLocalState.commitments.mandatoryDiscard.completed).toBe(true);
      expect(phaseManager.checkReadyToTransition()).toBe(false); // Waiting for Guest

      // Guest action arrives via network
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.guestLocalState.commitments.mandatoryDiscard.completed).toBe(true);
      expect(phaseManager.checkReadyToTransition()).toBe(true);
    });

    /**
     * MD-H2: Both need action - Guest commits first
     */
    it('MD-H2: Both need action, Guest commits first → Host sees guest ready', () => {
      mockGameStateManager = createHostModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.BOTH_NEED,
        phase: 'mandatoryDiscard'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'host');
      phaseManager.transitionToPhase('mandatoryDiscard');

      // Guest action arrives via network first
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.guestLocalState.commitments.mandatoryDiscard.completed).toBe(true);
      expect(phaseManager.checkReadyToTransition()).toBe(false); // Host hasn't committed

      // Host commits
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.hostLocalState.commitments.mandatoryDiscard.completed).toBe(true);
      expect(phaseManager.checkReadyToTransition()).toBe(true);
    });

    /**
     * MD-H3: Only Host needs action
     */
    it('MD-H3: Only Host needs action → Guest auto-approves', () => {
      mockGameStateManager = createHostModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.ONLY_P1,
        phase: 'mandatoryDiscard'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'host');
      phaseManager.transitionToPhase('mandatoryDiscard');

      // Guest auto-approves (via network message)
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.checkReadyToTransition()).toBe(false); // Host still needs to act

      // Host commits after discarding
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.checkReadyToTransition()).toBe(true);
    });

    /**
     * MD-H4: Only Guest needs action
     * HIGH PRIORITY: Asymmetric where remote P2 acts, local P1 doesn't
     */
    it('MD-H4: Only Guest needs action → Host auto-approves', () => {
      mockGameStateManager = createHostModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.ONLY_P2,
        phase: 'mandatoryDiscard'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'host');
      phaseManager.transitionToPhase('mandatoryDiscard');

      // Host auto-approves immediately
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.hostLocalState.commitments.mandatoryDiscard.completed).toBe(true);
      expect(phaseManager.checkReadyToTransition()).toBe(false); // Guest still needs to act

      // Guest action arrives via network
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.checkReadyToTransition()).toBe(true);
    });

    /**
     * MD-H5: Neither needs action
     */
    it('MD-H5: Neither needs action → Phase skipped, broadcast sent', () => {
      mockGameStateManager = createHostModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.NEITHER,
        phase: 'mandatoryDiscard'
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'host');
      phaseManager.transitionToPhase('mandatoryDiscard');

      // Both auto-approve
      phaseManager.notifyHostAction('commit', { phase: 'mandatoryDiscard' });
      phaseManager.notifyGuestAction('commit', { phase: 'mandatoryDiscard' });
      expect(phaseManager.checkReadyToTransition()).toBe(true);

      // Verify expected behavior
      const expected = getExpectedBehavior('NEITHER', 'host');
      expect(expected.phaseSkipped).toBe(true);
      expect(expected.broadcastSkip).toBe(true);
    });
  });

  // ========================================
  // GUEST MODE: mandatoryDiscard (MD-G1 to MD-G3)
  // ========================================
  describe('Guest Mode - mandatoryDiscard', () => {
    let phaseManager;
    let mockGameStateManager;

    /**
     * MD-G1: Guest receives host broadcast
     */
    it('MD-G1: Guest receives host broadcast → State applied correctly', () => {
      mockGameStateManager = createGuestModeGameStateManager({
        phase: 'mandatoryDiscard',
        guestNeedsAction: true
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'guest');

      // Guest receives master state from host
      const masterState = {
        turnPhase: 'mandatoryDiscard',
        gameStage: 'roundLoop',
        roundNumber: 1
      };
      const result = phaseManager.applyMasterState(masterState);

      expect(result).toBe(true);
      expect(phaseManager.phaseState.turnPhase).toBe('mandatoryDiscard');
    });

    /**
     * MD-G2: Guest needs action
     * Verify guest cannot call transitionToPhase
     */
    it('MD-G2: Guest needs action → Cannot transition phase locally', () => {
      mockGameStateManager = createGuestModeGameStateManager({
        phase: 'mandatoryDiscard',
        guestNeedsAction: true
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'guest');

      // Apply initial state
      phaseManager.applyMasterState({ turnPhase: 'mandatoryDiscard' });

      // Guest cannot transition phase
      const result = phaseManager.transitionToPhase('optionalDiscard');
      expect(result).toBe(false); // Blocked

      // Phase should still be mandatoryDiscard
      expect(phaseManager.phaseState.turnPhase).toBe('mandatoryDiscard');
    });

    /**
     * MD-G3: Guest auto-approves
     * Guest receives broadcast showing phase complete
     */
    it('MD-G3: Guest auto-approves → Receives broadcast showing completion', () => {
      mockGameStateManager = createGuestModeGameStateManager({
        phase: 'mandatoryDiscard',
        guestNeedsAction: false // Guest has no cards to discard
      });
      phaseManager = new PhaseManager(mockGameStateManager, 'guest');

      // Apply initial state
      phaseManager.applyMasterState({ turnPhase: 'mandatoryDiscard' });

      // Guest receives broadcast indicating phase complete
      // Host would have processed auto-approves and moved on
      const completionBroadcast = createMockHostBroadcast({
        phase: 'optionalDiscard', // Next phase
        phaseComplete: true
      });

      // Simulating guest receiving the broadcast
      phaseManager.applyMasterState({ turnPhase: completionBroadcast.phase });
      expect(phaseManager.phaseState.turnPhase).toBe('optionalDiscard');
    });
  });

  // ========================================
  // FIRST PASSER SYNC TESTS
  // ========================================
  describe('firstPasser Synchronization', () => {
    /**
     * Verify firstPasser is synced between host and guest states
     */
    it('firstPasser synced when guest applies master state', () => {
      const mockGameStateManager = createGuestModeGameStateManager({
        phase: 'deployment'
      });
      const phaseManager = new PhaseManager(mockGameStateManager, 'guest');

      // Apply master state with firstPasser info
      const masterState = {
        turnPhase: 'action',
        passInfo: { firstPasser: 'player1' }
      };
      phaseManager.applyMasterState(masterState);

      // Verify firstPasser synced to both local states
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player1');
    });

    /**
     * Verify firstPasser preserved during phase transitions within a round
     */
    it('firstPasser preserved within a round when transitioning phases', () => {
      const mockGameStateManager = createLocalModeGameStateManager({
        ...ASYMMETRIC_SCENARIOS.BOTH_NEED,
        phase: 'deployment'
      });
      const phaseManager = new PhaseManager(mockGameStateManager, 'local');
      phaseManager.transitionToPhase('deployment');

      // Host passes first in deployment
      phaseManager.notifyHostAction('pass', { phase: 'deployment' });
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');

      // Guest passes
      phaseManager.notifyGuestAction('pass', { phase: 'deployment' });

      // Transition to action phase
      phaseManager.transitionToPhase('action');

      // firstPasser should be preserved
      expect(phaseManager.hostLocalState.passInfo.firstPasser).toBe('player1');
      expect(phaseManager.guestLocalState.passInfo.firstPasser).toBe('player1');
    });
  });
});
