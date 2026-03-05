import { describe, it, expect, vi, beforeEach } from 'vitest';
import RemoteGameServer from '../RemoteGameServer.js';
import GameServer from '../GameServer.js';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));
vi.mock('../../utils/teleportUtils.js', () => ({
  addTeleportingFlags: vi.fn((_players, _anims) => ({
    player1: { dronesOnBoard: {}, isTeleporting: true },
    player2: { dronesOnBoard: {}, isTeleporting: true },
  })),
}));
vi.mock('../../utils/stateComparisonUtils.js', () => ({
  arraysMatch: vi.fn(() => true),
  dronesMatch: vi.fn(() => true),
}));

function makePlayer(overrides = {}) {
  return {
    energy: 5, shields: 3, health: 20,
    hand: [],
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    techSlots: { lane1: [], lane2: [], lane3: [] },
    ...overrides,
  };
}

function makeState(overrides = {}) {
  return {
    turnPhase: 'action', currentPlayer: 'player1', roundNumber: 1,
    gameMode: 'guest',
    player1: makePlayer(), player2: makePlayer(),
    ...overrides,
  };
}

describe('RemoteGameServer', () => {
  let server;
  let mockGSM;
  let mockP2P;
  let mockPAQ;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGSM = {
      processAction: vi.fn().mockResolvedValue({ success: true, animations: { actionAnimations: [] } }),
      getState: vi.fn().mockReturnValue(makeState()),
      getLocalPlayerId: vi.fn().mockReturnValue('player2'),
      subscribe: vi.fn().mockReturnValue(vi.fn()),
      trackOptimisticAnimations: vi.fn(),
      applyHostState: vi.fn(),
      filterAnimations: vi.fn((a, s) => ({ actionAnimations: a, systemAnimations: s })),
      actionProcessor: {
        animationManager: {
          executeWithStateUpdate: vi.fn().mockResolvedValue(undefined),
        },
      },
    };
    mockP2P = {
      sendActionToHost: vi.fn(),
      subscribe: vi.fn(),
      requestFullSync: vi.fn(),
    };
    mockPAQ = {
      queueAnimation: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      getQueueLength: vi.fn().mockReturnValue(0),
      startPlayback: vi.fn(),
    };
    server = new RemoteGameServer(mockGSM, mockP2P, { phaseAnimationQueue: mockPAQ });
  });

  it('extends GameServer', () => {
    expect(server).toBeInstanceOf(GameServer);
  });

  // --- submitAction (unchanged from Phase 3) ---

  describe('submitAction', () => {
    it('sends action to host, processes locally, tracks animations, returns result', async () => {
      const result = await server.submitAction('deployment', { lane: 'mid' });

      expect(mockP2P.sendActionToHost).toHaveBeenCalledWith('deployment', { lane: 'mid' });
      expect(mockGSM.processAction).toHaveBeenCalledWith('deployment', { lane: 'mid' });
      expect(mockGSM.trackOptimisticAnimations).toHaveBeenCalledWith({ actionAnimations: [] });
      expect(result).toEqual({ success: true, animations: { actionAnimations: [] } });
    });

    it('skips animation tracking when result has no animations', async () => {
      mockGSM.processAction.mockResolvedValue({ success: true });
      const result = await server.submitAction('end_turn', {});

      expect(mockGSM.trackOptimisticAnimations).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('getState', () => {
    it('delegates to gameStateManager.getState', () => {
      const state = server.getState();
      expect(mockGSM.getState).toHaveBeenCalled();
      expect(state.turnPhase).toBe('action');
    });
  });

  describe('getPlayerView', () => {
    it('returns getState() as pass-through (redaction deferred to Phase 8)', () => {
      const view = server.getPlayerView('player2');
      expect(view.turnPhase).toBe('action');
    });
  });

  describe('getLocalPlayerId', () => {
    it('delegates to gameStateManager.getLocalPlayerId', () => {
      expect(server.getLocalPlayerId()).toBe('player2');
    });
  });

  describe('isPlayerAI', () => {
    it('returns false for both players', () => {
      expect(server.isPlayerAI('player1')).toBe(false);
      expect(server.isPlayerAI('player2')).toBe(false);
    });
  });

  describe('onStateUpdate', () => {
    it('subscribes via gameStateManager.subscribe', () => {
      const cb = vi.fn();
      const unsub = server.onStateUpdate(cb);
      expect(mockGSM.subscribe).toHaveBeenCalledWith(cb);
      expect(typeof unsub).toBe('function');
    });
  });

  // --- Initialize / P2P subscription ---

  describe('initialize', () => {
    it('subscribes to P2P state_update_received events', () => {
      server.initialize();
      expect(mockP2P.subscribe).toHaveBeenCalledTimes(1);
    });

    it('creates a MessageQueue', () => {
      server.initialize();
      expect(server.messageQueue).not.toBeNull();
    });

    it('routes state_update_received events through MessageQueue', async () => {
      server.initialize();
      const p2pHandler = mockP2P.subscribe.mock.calls[0][0];

      const testState = makeState({ turnPhase: 'deployment' });
      p2pHandler({
        type: 'state_update_received',
        data: { state: testState, sequenceId: 1, actionAnimations: [], systemAnimations: [] },
      });

      // Allow async queue to process
      await vi.waitFor(() => {
        expect(mockGSM.filterAnimations).toHaveBeenCalled();
      });
    });

    it('isFullSync messages bypass queue and apply state', async () => {
      server.initialize();
      const p2pHandler = mockP2P.subscribe.mock.calls[0][0];

      const fullState = makeState({ turnPhase: 'placement' });
      p2pHandler({
        type: 'state_update_received',
        data: { state: fullState, sequenceId: 5, isFullSync: true },
      });

      expect(mockGSM.applyHostState).toHaveBeenCalledWith(fullState);
    });
  });

  // --- processStateUpdate ---

  describe('processStateUpdate', () => {
    it('calls filterAnimations on incoming animations', async () => {
      const actionAnims = [{ animationName: 'ATTACK', payload: { targetId: 'd1' } }];
      const systemAnims = [{ animationName: 'PHASE_CHANGE', payload: {} }];

      await server._processStateUpdate({
        state: makeState(),
        actionAnimations: actionAnims,
        systemAnimations: systemAnims,
      });

      expect(mockGSM.filterAnimations).toHaveBeenCalledWith(actionAnims, systemAnims);
    });

    it('delegates to AnimationManager.executeWithStateUpdate', async () => {
      const actionAnims = [{ animationName: 'ATTACK', payload: {} }];

      await server._processStateUpdate({
        state: makeState(),
        actionAnimations: actionAnims,
        systemAnimations: [],
      });

      expect(mockGSM.actionProcessor.animationManager.executeWithStateUpdate).toHaveBeenCalledWith(
        actionAnims,
        server
      );
    });

    it('applies state directly when AnimationManager is unavailable', async () => {
      mockGSM.actionProcessor.animationManager = null;
      const state = makeState({ turnPhase: 'deployment' });

      await server._processStateUpdate({ state, actionAnimations: [], systemAnimations: [] });

      expect(mockGSM.applyHostState).toHaveBeenCalled();
    });

    it('skips state application when all animations filtered and states match', async () => {
      // filterAnimations returns empty (all filtered)
      mockGSM.filterAnimations.mockReturnValue({ actionAnimations: [], systemAnimations: [] });

      await server._processStateUpdate({
        state: makeState(),
        actionAnimations: [{ animationName: 'ATTACK', payload: {} }],
        systemAnimations: [],
      });

      // Should NOT call executeWithStateUpdate since states match and all filtered
      expect(mockGSM.actionProcessor.animationManager.executeWithStateUpdate).not.toHaveBeenCalled();
    });
  });

  // --- TELEPORT_IN handling ---

  describe('TELEPORT_IN handling', () => {
    it('sets pendingHostState with isTeleporting flags and pendingFinalHostState without', async () => {
      const { addTeleportingFlags } = await import('../../utils/teleportUtils.js');
      const state = makeState();
      const teleportAnim = { animationName: 'TELEPORT_IN', payload: { targetPlayer: 'player1', targetLane: 'lane1', targetId: 'd1' } };

      let capturedProvider;
      mockGSM.actionProcessor.animationManager.executeWithStateUpdate.mockImplementation(async (_anims, provider) => {
        capturedProvider = provider;
      });

      await server._processStateUpdate({
        state,
        actionAnimations: [teleportAnim],
        systemAnimations: [],
      });

      expect(addTeleportingFlags).toHaveBeenCalled();
      expect(capturedProvider).toBe(server);
    });

    it('clears pending states in finally block', async () => {
      const state = makeState();
      mockGSM.actionProcessor.animationManager.executeWithStateUpdate.mockRejectedValue(new Error('test'));

      try {
        await server._processStateUpdate({
          state,
          actionAnimations: [{ animationName: 'ATTACK', payload: {} }],
          systemAnimations: [],
        });
      } catch { /* expected */ }

      expect(server.pendingHostState).toBeNull();
      expect(server.pendingFinalHostState).toBeNull();
    });
  });

  // --- stateProvider protocol ---

  describe('stateProvider protocol', () => {
    it('applyPendingStateUpdate calls gsm.applyHostState with pendingHostState', async () => {
      const state = makeState({ turnPhase: 'deployment' });
      server.pendingHostState = state;

      await server.applyPendingStateUpdate();

      expect(mockGSM.applyHostState).toHaveBeenCalledWith(state);
    });

    it('applyPendingStateUpdate does nothing when no pending state', async () => {
      await server.applyPendingStateUpdate();
      expect(mockGSM.applyHostState).not.toHaveBeenCalled();
    });

    it('getAnimationSource returns HOST_RESPONSE', () => {
      expect(server.getAnimationSource()).toBe('HOST_RESPONSE');
    });

    it('revealTeleportedDrones calls gsm.applyHostState with pendingFinalHostState', () => {
      const finalState = makeState();
      server.pendingFinalHostState = finalState;

      server.revealTeleportedDrones();

      expect(mockGSM.applyHostState).toHaveBeenCalledWith(finalState);
    });

    it('revealTeleportedDrones does nothing when no pending final state', () => {
      server.revealTeleportedDrones();
      expect(mockGSM.applyHostState).not.toHaveBeenCalled();
    });
  });

  // --- Phase announcement queueing ---

  describe('phase announcements', () => {
    it('Pattern 1: action → non-action queues actionComplete + roundAnnouncement + target phase', () => {
      mockGSM.getState.mockReturnValue(makeState({ turnPhase: 'action', passInfo: {} }));

      server._queuePhaseAnnouncements('action', 'roundInitialization');

      const calls = mockPAQ.queueAnimation.mock.calls.map(c => c[0]);
      expect(calls).toContain('actionComplete');
      expect(calls).toContain('roundAnnouncement');
      expect(calls).toContain('roundInitialization');
    });

    it('Pattern 1 + OPPONENT PASSED when guest passed first', () => {
      mockGSM.getState.mockReturnValue(makeState({
        turnPhase: 'action',
        passInfo: { player2Passed: true, firstPasser: 'player2' },
      }));

      server._queuePhaseAnnouncements('action', 'roundInitialization');

      const calls = mockPAQ.queueAnimation.mock.calls;
      expect(calls[0][1]).toBe('OPPONENT PASSED');
      expect(calls[1][0]).toBe('actionComplete');
    });

    it('Pattern 2: placement → roundInitialization queues roundAnnouncement', () => {
      server._queuePhaseAnnouncements('placement', 'roundInitialization');

      const calls = mockPAQ.queueAnimation.mock.calls.map(c => c[0]);
      expect(calls).toContain('roundAnnouncement');
      expect(calls).toContain('roundInitialization');
    });

    it('Pattern 2.5: deployment → action queues deploymentComplete + action', () => {
      mockGSM.getState.mockReturnValue(makeState({ turnPhase: 'deployment', passInfo: {} }));

      server._queuePhaseAnnouncements('deployment', 'action');

      const calls = mockPAQ.queueAnimation.mock.calls.map(c => c[0]);
      expect(calls).toContain('deploymentComplete');
      expect(calls).toContain('action');
    });

    it('Pattern 2.5 + OPPONENT PASSED when guest passed first', () => {
      mockGSM.getState.mockReturnValue(makeState({
        turnPhase: 'deployment',
        passInfo: { player2Passed: true, firstPasser: 'player2' },
      }));

      server._queuePhaseAnnouncements('deployment', 'action');

      const calls = mockPAQ.queueAnimation.mock.calls;
      expect(calls[0][1]).toBe('OPPONENT PASSED');
    });

    it('Pattern 3: generic phase transition queues target phase text', () => {
      server._queuePhaseAnnouncements('roundInitialization', 'deployment');

      const calls = mockPAQ.queueAnimation.mock.calls;
      expect(calls[0][0]).toBe('deployment');
      expect(calls[0][1]).toBe('DEPLOYMENT PHASE');
    });

    it('does nothing when phases are the same', () => {
      server._queuePhaseAnnouncements('action', 'action');
      expect(mockPAQ.queueAnimation).not.toHaveBeenCalled();
    });

    it('does nothing when phaseAnimationQueue is null', () => {
      server.phaseAnimationQueue = null;
      server._queuePhaseAnnouncements('action', 'deployment');
      // No error thrown
    });
  });

  // --- Validation ---

  describe('validation', () => {
    it('startValidation deep-copies state', () => {
      const guestState = { turnPhase: 'action', nested: { value: 1 } };
      server.startValidation('deployment', guestState);

      expect(server.validatingState.isValidating).toBe(true);
      expect(server.validatingState.targetPhase).toBe('deployment');
      expect(server.validatingState.guestState).toEqual(guestState);

      // Verify deep copy
      guestState.nested.value = 999;
      expect(server.validatingState.guestState.nested.value).toBe(1);
    });

    it('shouldValidateBroadcast returns true when matching', () => {
      server.startValidation('deployment', { turnPhase: 'action' });
      expect(server.shouldValidateBroadcast('deployment')).toBe(true);
    });

    it('shouldValidateBroadcast returns false when not matching', () => {
      server.startValidation('deployment', { turnPhase: 'action' });
      expect(server.shouldValidateBroadcast('action')).toBe(false);
    });

    it('shouldValidateBroadcast returns false when not validating', () => {
      expect(server.shouldValidateBroadcast('deployment')).toBe(false);
    });

    it('processStateUpdate calls validateOptimisticState when validation active', async () => {
      server.startValidation('deployment', makeState());

      await server._processStateUpdate({
        state: makeState({ turnPhase: 'deployment' }),
        actionAnimations: [],
        systemAnimations: [],
      });

      // Should apply host state during validation
      expect(mockGSM.applyHostState).toHaveBeenCalled();
      // Should clear validation
      expect(server.validatingState.isValidating).toBe(false);
    });
  });

  // --- Queue drain / animation playback ---

  describe('queue drain', () => {
    it('triggers phaseAnimationQueue.startPlayback after drain with 50ms delay', () => {
      vi.useFakeTimers();
      mockPAQ.getQueueLength.mockReturnValue(2);

      server._onQueueDrained();

      expect(mockPAQ.startPlayback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(50);
      expect(mockPAQ.startPlayback).toHaveBeenCalledWith('RemoteGameServer:after_drain');

      vi.useRealTimers();
    });

    it('does not trigger playback when queue is empty', () => {
      vi.useFakeTimers();
      mockPAQ.getQueueLength.mockReturnValue(0);

      server._onQueueDrained();

      vi.advanceTimersByTime(100);
      expect(mockPAQ.startPlayback).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('does not trigger playback when already playing', () => {
      vi.useFakeTimers();
      mockPAQ.isPlaying.mockReturnValue(true);
      mockPAQ.getQueueLength.mockReturnValue(2);

      server._onQueueDrained();

      vi.advanceTimersByTime(100);
      expect(mockPAQ.startPlayback).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // --- Action acknowledgement handling ---

  describe('action acknowledgements', () => {
    it('applies authoritative state on action rejection', () => {
      server.initialize();
      const p2pHandler = mockP2P.subscribe.mock.calls[0][0];

      const authState = makeState({ turnPhase: 'deployment', roundNumber: 2 });
      p2pHandler({
        type: 'action_ack_received',
        data: {
          actionType: 'attack',
          success: false,
          error: 'Invalid target',
          authoritativeState: authState,
        },
      });

      expect(mockGSM.applyHostState).toHaveBeenCalledWith(authState);
    });

    it('does not apply state on successful acknowledgement', () => {
      server.initialize();
      const p2pHandler = mockP2P.subscribe.mock.calls[0][0];

      p2pHandler({
        type: 'action_ack_received',
        data: {
          actionType: 'attack',
          success: true,
        },
      });

      expect(mockGSM.applyHostState).not.toHaveBeenCalled();
    });

    it('handles rejection without authoritative state gracefully', () => {
      server.initialize();
      const p2pHandler = mockP2P.subscribe.mock.calls[0][0];

      // Should not throw
      p2pHandler({
        type: 'action_ack_received',
        data: {
          actionType: 'deployment',
          success: false,
          error: 'Validation failed',
        },
      });

      expect(mockGSM.applyHostState).not.toHaveBeenCalled();
    });
  });

  // --- Resync ---

  describe('resync', () => {
    it('onResyncNeeded calls p2pManager.requestFullSync', () => {
      server._onResyncNeeded();
      expect(mockP2P.requestFullSync).toHaveBeenCalled();
    });

    it('onResyncResponse applies state', () => {
      const state = makeState({ turnPhase: 'placement' });
      server._onResyncResponse({ state, sequenceId: 5 });
      expect(mockGSM.applyHostState).toHaveBeenCalledWith(state);
    });
  });
});
