import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameClient from '../GameClient.js';
import GameServer from '../../server/GameServer.js';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));
vi.mock('../../utils/teleportUtils.js', () => ({
  addTeleportingFlags: vi.fn((_players, _anims) => ({
    player1: { dronesOnBoard: {}, isTeleporting: true },
    player2: { dronesOnBoard: {}, isTeleporting: true },
  })),
}));

function makeState(overrides = {}) {
  return {
    turnPhase: 'action', currentPlayer: 'player1', roundNumber: 1,
    gameMode: 'local',
    player1: { hand: [], dronesOnBoard: {}, hp: 20 },
    player2: { hand: [], dronesOnBoard: {}, hp: 20 },
    ...overrides,
  };
}

function makeTransport() {
  let responseCallback = null;
  return {
    sendAction: vi.fn().mockResolvedValue(undefined),
    onResponse(cb) { responseCallback = cb; },
    getResponseCallback() { return responseCallback; },
    simulateResponse(response) { responseCallback?.(response); },
    dispose: vi.fn(),
  };
}

describe('GameClient', () => {
  let client;
  let transport;
  let mockStore;
  let mockPAQ;
  let mockAnimMgr;

  beforeEach(() => {
    vi.clearAllMocks();
    transport = makeTransport();
    mockStore = {
      getState: vi.fn().mockReturnValue(makeState()),
      subscribe: vi.fn().mockReturnValue(vi.fn()),
      applyUpdate: vi.fn(),
    };
    mockPAQ = {
      queueAnimation: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      getQueueLength: vi.fn().mockReturnValue(0),
      startPlayback: vi.fn(),
    };
    mockAnimMgr = {
      executeWithStateUpdate: vi.fn().mockResolvedValue(undefined),
    };

    client = new GameClient(transport, {
      clientStateStore: mockStore,
      playerId: 'player1',
      isMultiplayer: false,
      phaseAnimationQueue: mockPAQ,
      animationManager: mockAnimMgr,
    });
  });

  it('extends GameServer', () => {
    expect(client).toBeInstanceOf(GameServer);
  });

  // --- GameServer interface ---

  describe('submitAction', () => {
    it('delegates to transport.sendAction', async () => {
      await client.submitAction('attack', { droneId: 'd1' });
      expect(transport.sendAction).toHaveBeenCalledWith('attack', { droneId: 'd1' });
    });
  });

  describe('getState', () => {
    it('delegates to clientStateStore', () => {
      client.getState();
      expect(mockStore.getState).toHaveBeenCalled();
    });
  });

  describe('getPlayerView', () => {
    it('returns getState() as pass-through', () => {
      const state = makeState({ turnPhase: 'deployment' });
      mockStore.getState.mockReturnValue(state);
      expect(client.getPlayerView('player1')).toBe(state);
    });
  });

  describe('getLocalPlayerId', () => {
    it('returns configured playerId', () => {
      expect(client.getLocalPlayerId()).toBe('player1');

      const p2Client = new GameClient(transport, {
        clientStateStore: mockStore, playerId: 'player2',
      });
      expect(p2Client.getLocalPlayerId()).toBe('player2');
    });
  });

  describe('isMultiplayer', () => {
    it('returns false by default', () => {
      expect(client.isMultiplayer()).toBe(false);
    });

    it('returns true when configured', () => {
      const mpClient = new GameClient(transport, {
        clientStateStore: mockStore, playerId: 'player1', isMultiplayer: true,
      });
      expect(mpClient.isMultiplayer()).toBe(true);
    });
  });

  describe('isPlayerAI', () => {
    it('returns true for opponent in single-player', () => {
      expect(client.isPlayerAI('player2')).toBe(true);
    });

    it('returns false for self', () => {
      expect(client.isPlayerAI('player1')).toBe(false);
    });

    it('returns false for all players in multiplayer', () => {
      const mpClient = new GameClient(transport, {
        clientStateStore: mockStore, playerId: 'player1', isMultiplayer: true,
      });
      expect(mpClient.isPlayerAI('player1')).toBe(false);
      expect(mpClient.isPlayerAI('player2')).toBe(false);
    });
  });

  describe('onStateUpdate', () => {
    it('subscribes via clientStateStore', () => {
      const cb = vi.fn();
      client.onStateUpdate(cb);
      expect(mockStore.subscribe).toHaveBeenCalledWith(cb);
    });
  });

  // --- Response handling ---

  describe('_onResponse', () => {
    it('applies state to clientStateStore when no animations', async () => {
      const state = makeState({ turnPhase: 'deployment' });
      await client._onResponse({
        state,
        animations: { actionAnimations: [], systemAnimations: [] },
        result: { success: true },
      });

      expect(mockStore.applyUpdate).toHaveBeenCalled();
    });

    it('applies state directly when no animationManager', async () => {
      const noAnimClient = new GameClient(transport, {
        clientStateStore: mockStore, playerId: 'player1',
      });
      const state = makeState({ turnPhase: 'deployment' });

      await noAnimClient._onResponse({
        state,
        animations: { actionAnimations: [{ animationName: 'ATTACK' }], systemAnimations: [] },
        result: { success: true },
      });

      expect(mockStore.applyUpdate).toHaveBeenCalled();
    });

    it('delegates to animationManager.executeWithStateUpdate with animations', async () => {
      const anims = [{ animationName: 'ATTACK', payload: {} }];

      await client._onResponse({
        state: makeState(),
        animations: { actionAnimations: anims, systemAnimations: [] },
        result: { success: true },
      });

      expect(mockAnimMgr.executeWithStateUpdate).toHaveBeenCalledWith(anims, client);
    });

    it('combines action and system animations', async () => {
      const actionAnims = [{ animationName: 'ATTACK' }];
      const systemAnims = [{ animationName: 'PHASE_CHANGE' }];

      await client._onResponse({
        state: makeState(),
        animations: { actionAnimations: actionAnims, systemAnimations: systemAnims },
        result: { success: true },
      });

      expect(mockAnimMgr.executeWithStateUpdate).toHaveBeenCalledWith(
        [...actionAnims, ...systemAnims],
        client
      );
    });

    it('preserves local gameMode', async () => {
      mockStore.getState.mockReturnValue(makeState({ gameMode: 'guest' }));
      const state = makeState({ gameMode: 'host', turnPhase: 'deployment' });

      await client._onResponse({
        state,
        animations: { actionAnimations: [], systemAnimations: [] },
        result: { success: true },
      });

      const appliedState = mockStore.applyUpdate.mock.calls[0][0];
      expect(appliedState.gameMode).toBe('guest');
    });

    it('handles null animations gracefully', async () => {
      await client._onResponse({
        state: makeState(),
        animations: null,
        result: { success: true },
      });

      expect(mockStore.applyUpdate).toHaveBeenCalled();
    });
  });

  // --- TELEPORT_IN handling ---

  describe('TELEPORT_IN handling', () => {
    it('sets pendingHostState with isTeleporting flags', async () => {
      const { addTeleportingFlags } = await import('../../utils/teleportUtils.js');
      const state = makeState();
      const teleportAnim = { animationName: 'TELEPORT_IN', payload: {} };

      let capturedProvider;
      mockAnimMgr.executeWithStateUpdate.mockImplementation(async (_anims, provider) => {
        capturedProvider = provider;
      });

      await client._onResponse({
        state,
        animations: { actionAnimations: [teleportAnim], systemAnimations: [] },
        result: { success: true },
      });

      expect(addTeleportingFlags).toHaveBeenCalled();
      expect(capturedProvider).toBe(client);
    });

    it('clears pending states in finally block', async () => {
      mockAnimMgr.executeWithStateUpdate.mockRejectedValue(new Error('test'));

      try {
        await client._onResponse({
          state: makeState(),
          animations: { actionAnimations: [{ animationName: 'ATTACK' }], systemAnimations: [] },
          result: { success: true },
        });
      } catch { /* expected */ }

      expect(client.pendingHostState).toBeNull();
      expect(client.pendingFinalHostState).toBeNull();
    });
  });

  // --- stateProvider protocol ---

  describe('stateProvider protocol', () => {
    it('applyPendingStateUpdate pushes state to clientStateStore', async () => {
      const state = makeState({ turnPhase: 'deployment' });
      client.pendingHostState = state;

      await client.applyPendingStateUpdate();

      expect(mockStore.applyUpdate).toHaveBeenCalledWith(state);
    });

    it('applyPendingStateUpdate does nothing when no pending state', async () => {
      await client.applyPendingStateUpdate();
      expect(mockStore.applyUpdate).not.toHaveBeenCalled();
    });

    it('getAnimationSource returns LOCAL_ENGINE for single-player', () => {
      expect(client.getAnimationSource()).toBe('LOCAL_ENGINE');
    });

    it('getAnimationSource returns HOST_RESPONSE for multiplayer', () => {
      const mpClient = new GameClient(transport, {
        clientStateStore: mockStore, playerId: 'player2', isMultiplayer: true,
      });
      expect(mpClient.getAnimationSource()).toBe('HOST_RESPONSE');
    });

    it('revealTeleportedDrones pushes final state to clientStateStore', () => {
      const finalState = makeState();
      client.pendingFinalHostState = finalState;

      client.revealTeleportedDrones();

      expect(mockStore.applyUpdate).toHaveBeenCalledWith(finalState);
    });

    it('revealTeleportedDrones does nothing when no pending final state', () => {
      client.revealTeleportedDrones();
      expect(mockStore.applyUpdate).not.toHaveBeenCalled();
    });
  });

  // --- Phase announcements (multiplayer only) ---

  describe('phase announcements', () => {
    let mpClient;

    beforeEach(() => {
      mpClient = new GameClient(transport, {
        clientStateStore: mockStore, playerId: 'player2',
        isMultiplayer: true, phaseAnimationQueue: mockPAQ,
        animationManager: mockAnimMgr,
      });
    });

    it('does not queue announcements in single-player mode', async () => {
      mockStore.getState.mockReturnValue(makeState({ turnPhase: 'action' }));

      await client._onResponse({
        state: makeState({ turnPhase: 'deployment' }),
        animations: { actionAnimations: [], systemAnimations: [] },
        result: { success: true },
      });

      expect(mockPAQ.queueAnimation).not.toHaveBeenCalled();
    });

    it('Pattern 1: action → non-action queues actionComplete + roundAnnouncement + target phase', () => {
      mockStore.getState.mockReturnValue(makeState({ turnPhase: 'action', passInfo: {} }));

      mpClient._queuePhaseAnnouncements('action', 'roundInitialization');

      const calls = mockPAQ.queueAnimation.mock.calls.map(c => c[0]);
      expect(calls).toContain('actionComplete');
      expect(calls).toContain('roundAnnouncement');
      expect(calls).toContain('roundInitialization');
    });

    it('Pattern 1 + OPPONENT PASSED when local player passed first', () => {
      mockStore.getState.mockReturnValue(makeState({
        turnPhase: 'action',
        passInfo: { player2Passed: true, firstPasser: 'player2' },
      }));

      mpClient._queuePhaseAnnouncements('action', 'roundInitialization');

      const calls = mockPAQ.queueAnimation.mock.calls;
      expect(calls[0][1]).toBe('OPPONENT PASSED');
      expect(calls[1][0]).toBe('actionComplete');
    });

    it('Pattern 2: placement → roundInitialization queues roundAnnouncement', () => {
      mpClient._queuePhaseAnnouncements('placement', 'roundInitialization');

      const calls = mockPAQ.queueAnimation.mock.calls.map(c => c[0]);
      expect(calls).toContain('roundAnnouncement');
      expect(calls).toContain('roundInitialization');
    });

    it('Pattern 2.5: deployment → action queues deploymentComplete + action', () => {
      mockStore.getState.mockReturnValue(makeState({ turnPhase: 'deployment', passInfo: {} }));

      mpClient._queuePhaseAnnouncements('deployment', 'action');

      const calls = mockPAQ.queueAnimation.mock.calls.map(c => c[0]);
      expect(calls).toContain('deploymentComplete');
      expect(calls).toContain('action');
    });

    it('Pattern 2.5 + OPPONENT PASSED when local player passed first', () => {
      mockStore.getState.mockReturnValue(makeState({
        turnPhase: 'deployment',
        passInfo: { player2Passed: true, firstPasser: 'player2' },
      }));

      mpClient._queuePhaseAnnouncements('deployment', 'action');

      const calls = mockPAQ.queueAnimation.mock.calls;
      expect(calls[0][1]).toBe('OPPONENT PASSED');
    });

    it('Pattern 3: generic phase transition queues target phase text', () => {
      mpClient._queuePhaseAnnouncements('roundInitialization', 'deployment');

      const calls = mockPAQ.queueAnimation.mock.calls;
      expect(calls[0][0]).toBe('deployment');
      expect(calls[0][1]).toBe('DEPLOYMENT PHASE');
    });

    it('does nothing when phases are the same', () => {
      mpClient._queuePhaseAnnouncements('action', 'action');
      expect(mockPAQ.queueAnimation).not.toHaveBeenCalled();
    });

    it('does nothing when phaseAnimationQueue is null', () => {
      const noQueueClient = new GameClient(transport, {
        clientStateStore: mockStore, playerId: 'player2', isMultiplayer: true,
      });
      noQueueClient._queuePhaseAnnouncements('action', 'deployment');
      // No error thrown
    });
  });

  // --- Dispose ---

  describe('dispose', () => {
    it('disposes transport', () => {
      client.dispose();
      expect(transport.dispose).toHaveBeenCalled();
    });
  });
});
