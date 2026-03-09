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
  let ackCallback = null;
  let queueDrainedCallback = null;
  return {
    sendAction: vi.fn().mockResolvedValue(undefined),
    onResponse(cb) { responseCallback = cb; },
    onActionAck(cb) { ackCallback = cb; },
    onQueueDrained(cb) { queueDrainedCallback = cb; },
    getResponseCallback() { return responseCallback; },
    simulateResponse(response) { responseCallback?.(response); },
    simulateAck(ack) { ackCallback?.(ack); },
    simulateQueueDrained() { queueDrainedCallback?.(); },
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
      gameStateManager: { syncFromServer: vi.fn() },
    };
    mockPAQ = {
      enqueue: vi.fn(),
      enqueueAll: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      getQueueLength: vi.fn().mockReturnValue(0),
      getCurrentAnimation: vi.fn().mockReturnValue(null),
      clear: vi.fn(),
      onComplete: vi.fn(),
      on: vi.fn().mockReturnValue(vi.fn()),
      off: vi.fn(),
    };
    mockAnimMgr = {
      executeWithStateUpdate: vi.fn().mockResolvedValue(undefined),
    };

    client = new GameClient(transport, {
      clientStateStore: mockStore,
      playerId: 'player1',
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
    it('returns false when gameMode is local', () => {
      mockStore.getState.mockReturnValue(makeState({ gameMode: 'local' }));
      expect(client.isMultiplayer()).toBe(false);
    });

    it('returns true when gameMode is host', () => {
      mockStore.getState.mockReturnValue(makeState({ gameMode: 'host' }));
      expect(client.isMultiplayer()).toBe(true);
    });

    it('returns true when gameMode is guest', () => {
      mockStore.getState.mockReturnValue(makeState({ gameMode: 'guest' }));
      expect(client.isMultiplayer()).toBe(true);
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
      mockStore.getState.mockReturnValue(makeState({ gameMode: 'host' }));
      expect(client.isPlayerAI('player1')).toBe(false);
      expect(client.isPlayerAI('player2')).toBe(false);
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

    it('delegates to animationManager.executeWithStateUpdate with visual animations', async () => {
      const anims = [{ animationName: 'ATTACK', payload: {} }];

      await client._onResponse({
        state: makeState(),
        animations: { actionAnimations: anims, systemAnimations: [] },
        result: { success: true },
      });

      expect(mockAnimMgr.executeWithStateUpdate).toHaveBeenCalledWith(anims, client);
    });

    it('combines action and system animations (excluding announcements)', async () => {
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
    it('sets pendingServerState with isTeleporting flags', async () => {
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

      expect(client.pendingServerState).toBeNull();
      expect(client.pendingFinalServerState).toBeNull();
    });
  });

  // --- stateProvider protocol ---

  describe('stateProvider protocol', () => {
    it('applyPendingStateUpdate pushes state to clientStateStore', async () => {
      const state = makeState({ turnPhase: 'deployment' });
      client.pendingServerState = state;

      await client.applyPendingStateUpdate();

      expect(mockStore.applyUpdate).toHaveBeenCalledWith(state);
    });

    it('applyPendingStateUpdate does nothing when no pending state', async () => {
      await client.applyPendingStateUpdate();
      expect(mockStore.applyUpdate).not.toHaveBeenCalled();
    });

    it('getAnimationSource always returns SERVER', () => {
      expect(client.getAnimationSource()).toBe('SERVER');
    });

    it('revealTeleportedDrones merges dronesOnBoard from pendingFinalServerState onto current state', () => {
      const currentState = makeState({ currentPlayer: 'player2', turnPhase: 'deployment' });
      const finalState = makeState({
        currentPlayer: 'player1', turnPhase: 'action',
        player1: { hand: [], dronesOnBoard: { lane1: [{ id: 'd1' }] }, hp: 20 },
        player2: { hand: [], dronesOnBoard: { lane2: [{ id: 'd2' }] }, hp: 20 },
      });
      mockStore.getState.mockReturnValue(currentState);
      client.pendingFinalServerState = finalState;

      client.revealTeleportedDrones();

      const applied = mockStore.applyUpdate.mock.calls[0][0];
      expect(applied.player1.dronesOnBoard).toEqual({ lane1: [{ id: 'd1' }] });
      expect(applied.player2.dronesOnBoard).toEqual({ lane2: [{ id: 'd2' }] });
      expect(applied.currentPlayer).toBe('player2');
      expect(applied.turnPhase).toBe('deployment');
    });

    it('revealTeleportedDrones does nothing when no pending final state', () => {
      client.revealTeleportedDrones();
      expect(mockStore.applyUpdate).not.toHaveBeenCalled();
    });
  });

  // --- Server-emitted announcements ---

  describe('_extractAndQueueAnnouncements', () => {
    it('extracts PHASE_ANNOUNCEMENT and enqueues into phaseAnimationQueue', async () => {
      const phaseAnim = {
        animationName: 'PHASE_ANNOUNCEMENT',
        timing: 'independent',
        payload: { phase: 'deployment', text: 'DEPLOYMENT PHASE', subtitle: null },
      };

      await client._onResponse({
        state: makeState(),
        animations: { actionAnimations: [], systemAnimations: [phaseAnim] },
      });

      expect(mockPAQ.enqueueAll).toHaveBeenCalledWith([
        expect.objectContaining({ phaseName: 'deployment', phaseText: 'DEPLOYMENT PHASE', subtitle: null }),
      ]);
    });

    it('extracts PASS_ANNOUNCEMENT with server-provided text', async () => {
      const passAnim = {
        animationName: 'PASS_ANNOUNCEMENT',
        timing: 'independent',
        payload: { passedPlayerId: 'player1', text: 'YOU PASSED', phase: 'playerPass' },
      };

      await client._onResponse({
        state: makeState(),
        animations: { actionAnimations: [], systemAnimations: [passAnim] },
      });

      expect(mockPAQ.enqueueAll).toHaveBeenCalledWith([
        expect.objectContaining({ phaseName: 'playerPass', phaseText: 'YOU PASSED' }),
      ]);
    });

    it('filters announcements from visual animations passed to AnimationManager', async () => {
      const attackAnim = { animationName: 'ATTACK', payload: {} };
      const phaseAnim = {
        animationName: 'PHASE_ANNOUNCEMENT',
        timing: 'independent',
        payload: { phase: 'action', text: 'ACTION PHASE', subtitle: null },
      };

      await client._onResponse({
        state: makeState(),
        animations: { actionAnimations: [attackAnim], systemAnimations: [phaseAnim] },
      });

      // AnimationManager only receives ATTACK, not PHASE_ANNOUNCEMENT
      expect(mockAnimMgr.executeWithStateUpdate).toHaveBeenCalledWith(
        [attackAnim], client
      );
    });

    it('enqueues all announcements in a single batch', async () => {
      const phaseAnim = {
        animationName: 'PHASE_ANNOUNCEMENT',
        timing: 'independent',
        payload: { phase: 'action', text: 'ACTION PHASE', subtitle: null },
      };
      const passAnim = {
        animationName: 'PASS_ANNOUNCEMENT',
        timing: 'independent',
        payload: { passedPlayerId: 'player1', text: 'YOU PASSED', phase: 'playerPass' },
      };

      await client._onResponse({
        state: makeState(),
        animations: { actionAnimations: [], systemAnimations: [phaseAnim, passAnim] },
      });

      // Both should be in a single enqueueAll call
      expect(mockPAQ.enqueueAll).toHaveBeenCalledTimes(1);
      expect(mockPAQ.enqueueAll.mock.calls[0][0]).toHaveLength(2);
    });

    it('does nothing when phaseAnimationQueue is null', async () => {
      const noQueueClient = new GameClient(transport, {
        clientStateStore: mockStore, playerId: 'player1',
        animationManager: mockAnimMgr,
      });
      const phaseAnim = {
        animationName: 'PHASE_ANNOUNCEMENT',
        timing: 'independent',
        payload: { phase: 'action', text: 'ACTION PHASE', subtitle: null },
      };

      // Should not throw
      await noQueueClient._onResponse({
        state: makeState(),
        animations: { actionAnimations: [], systemAnimations: [phaseAnim] },
      });
    });
  });

  // --- Action ack handling (M1) ---

  describe('action ack handling', () => {
    it('successful ack logs but does not change state', () => {
      transport.simulateAck({ actionType: 'attack', success: true });
      expect(mockStore.applyUpdate).not.toHaveBeenCalled();
    });

    it('rejected ack with authoritativeState applies state preserving gameMode', () => {
      mockStore.getState.mockReturnValue(makeState({ gameMode: 'guest' }));
      const authState = makeState({ turnPhase: 'deployment', gameMode: 'host' });

      transport.simulateAck({
        actionType: 'attack',
        success: false,
        error: 'Invalid target',
        authoritativeState: authState,
      });

      expect(mockStore.applyUpdate).toHaveBeenCalledOnce();
      const appliedState = mockStore.applyUpdate.mock.calls[0][0];
      expect(appliedState.gameMode).toBe('guest');
      expect(appliedState.turnPhase).toBe('deployment');
    });

    it('rejected ack without authoritativeState does not crash', () => {
      expect(() => {
        transport.simulateAck({
          actionType: 'attack',
          success: false,
          error: 'Bad action',
        });
      }).not.toThrow();
      expect(mockStore.applyUpdate).not.toHaveBeenCalled();
    });
  });

  // Queue drain handling removed — AnnouncementQueue auto-plays on enqueue

  // --- Intermediate State ---

  describe('applyIntermediateState', () => {
    it('merges snapshot player states into current state', () => {
      const current = makeState({
        turnPhase: 'action',
        player1: { hand: ['a'], dronesOnBoard: { lane1: [{ id: 'd1' }] }, hp: 20 },
        player2: { hand: ['b'], dronesOnBoard: { lane1: [] }, hp: 15 },
      });
      mockStore.getState.mockReturnValue(current);

      const snapshot = {
        player1: { hand: ['a'], dronesOnBoard: { lane1: [], lane2: [{ id: 'd1' }] }, hp: 20 },
        player2: { hand: ['b'], dronesOnBoard: { lane1: [] }, hp: 15 },
      };

      client.applyIntermediateState(snapshot);

      expect(mockStore.applyUpdate).toHaveBeenCalledTimes(1);
      const applied = mockStore.applyUpdate.mock.calls[0][0];
      // Player states replaced with snapshot
      expect(applied.player1).toBe(snapshot.player1);
      expect(applied.player2).toBe(snapshot.player2);
      // Non-player fields preserved
      expect(applied.turnPhase).toBe('action');
    });

    it('preserves current player state when snapshot omits it', () => {
      const current = makeState({
        player1: { hand: ['a'], hp: 20 },
        player2: { hand: ['b'], hp: 15 },
      });
      mockStore.getState.mockReturnValue(current);

      // Only player1 in snapshot
      client.applyIntermediateState({ player1: { hand: ['x'], hp: 18 } });

      const applied = mockStore.applyUpdate.mock.calls[0][0];
      expect(applied.player1).toEqual({ hand: ['x'], hp: 18 });
      expect(applied.player2).toBe(current.player2);
    });

    it('syncs GSM in guest mode', () => {
      const guestState = makeState({ gameMode: 'guest' });
      mockStore.getState.mockReturnValue(guestState);

      client.applyIntermediateState({
        player1: { hp: 10 },
        player2: { hp: 5 },
      });

      expect(mockStore.gameStateManager.syncFromServer).toHaveBeenCalledTimes(1);
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
