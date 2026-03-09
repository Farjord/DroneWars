import { describe, it, expect, vi, beforeEach } from 'vitest';
import HostGameServer from '../HostGameServer.js';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

describe('HostGameServer', () => {
  let hostServer;
  let mockEngine;
  let mockP2P;

  const mockState = {
    player1: { hand: [{ id: 'c1' }], hp: 20 },
    player2: { hand: [{ id: 'c2' }], hp: 20 },
    turnPhase: 'action',
  };

  const mockResponse = {
    state: mockState,
    animations: { actionAnimations: [{ animationName: 'ATTACK' }], systemAnimations: [] },
    result: { success: true },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEngine = {
      processAction: vi.fn().mockResolvedValue(mockResponse),
      getState: vi.fn().mockReturnValue(mockState),
      registerClient: vi.fn(),
      unregisterClient: vi.fn(),
    };
    mockP2P = {
      sendActionAck: vi.fn(),
      isConnected: true,
      broadcastState: vi.fn(),
    };
    hostServer = new HostGameServer(mockEngine, { p2pManager: mockP2P });
  });

  // --- Constructor ---

  describe('constructor', () => {
    it('registers P2P client in GameEngine when p2pManager provided', () => {
      expect(mockEngine.registerClient).toHaveBeenCalledWith('player2', expect.any(Function));
    });

    it('does not register client when p2pManager is null', () => {
      const engine = { registerClient: vi.fn() };
      new HostGameServer(engine);
      expect(engine.registerClient).not.toHaveBeenCalled();
    });

    it('uses custom remotePlayerId for client registration', () => {
      const engine = { registerClient: vi.fn() };
      new HostGameServer(engine, { p2pManager: mockP2P, remotePlayerId: 'player1' });
      expect(engine.registerClient).toHaveBeenCalledWith('player1', expect.any(Function));
    });
  });

  // --- processAction ---

  describe('processAction', () => {
    it('delegates to gameEngine.processAction', async () => {
      await hostServer.processAction('attack', { droneId: 'd1' });
      expect(mockEngine.processAction).toHaveBeenCalledWith('attack', { droneId: 'd1' });
    });

    it('returns the engine response', async () => {
      const result = await hostServer.processAction('attack', { droneId: 'd1' });
      expect(result).toBe(mockResponse);
    });
  });

  // --- handleRemoteAction ---

  describe('handleRemoteAction', () => {
    it('processes remote action via gameEngine', async () => {
      await hostServer.handleRemoteAction({ type: 'attack', payload: { droneId: 'd2' } });
      expect(mockEngine.processAction).toHaveBeenCalledWith('attack', { droneId: 'd2' });
    });

    it('sends success ack to remote client via p2pManager', async () => {
      await hostServer.handleRemoteAction({ type: 'attack', payload: {} });
      expect(mockP2P.sendActionAck).toHaveBeenCalledWith({
        actionType: 'attack',
        success: true,
      });
    });

    it('returns the engine response', async () => {
      const result = await hostServer.handleRemoteAction({ type: 'move', payload: {} });
      expect(result).toBe(mockResponse);
    });

    it('sends error ack with authoritative state on failure (no re-throw)', async () => {
      mockEngine.processAction.mockRejectedValue(new Error('Invalid action'));

      // handleRemoteAction swallows the error after sending ack
      await hostServer.handleRemoteAction({ type: 'attack', payload: {} });

      expect(mockP2P.sendActionAck).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'attack',
          success: false,
          error: 'Invalid action',
        })
      );
    });

    it('includes redacted state in error ack', async () => {
      mockEngine.processAction.mockRejectedValue(new Error('bad'));

      await hostServer.handleRemoteAction({ type: 'attack', payload: {} });

      const ackCall = mockP2P.sendActionAck.mock.calls[0][0];
      // authoritativeState should be redacted for player2 (remote)
      expect(ackCall.authoritativeState).toBeDefined();
      // Player2's own hand preserved, player1's hand redacted
      expect(ackCall.authoritativeState.player2.hand).toEqual([{ id: 'c2' }]);
      expect(ackCall.authoritativeState.player1.hand).toEqual([]);
    });

    it('does not send ack when p2pManager is null', async () => {
      const noP2P = new HostGameServer(mockEngine);
      await noP2P.handleRemoteAction({ type: 'attack', payload: {} });
      // No error thrown, no ack sent
    });

    it('uses remotePlayerId for error ack redaction', async () => {
      const customHost = new HostGameServer(mockEngine, {
        p2pManager: mockP2P,
        remotePlayerId: 'player1',
      });
      mockEngine.processAction.mockRejectedValue(new Error('bad'));

      await customHost.handleRemoteAction({ type: 'attack', payload: {} });

      const ackCall = mockP2P.sendActionAck.mock.calls[0][0];
      // Redacted for player1 (the custom remote), so player1's hand is preserved
      expect(ackCall.authoritativeState.player1.hand).toEqual([{ id: 'c1' }]);
      // Player2's hand is redacted (they're the local player in this scenario)
      expect(ackCall.authoritativeState.player2.hand).toEqual([]);
    });

    it('does not send ack on error when p2pManager is null', async () => {
      const noP2P = new HostGameServer(mockEngine);
      mockEngine.processAction.mockRejectedValue(new Error('bad'));

      // Should not throw — error is caught and swallowed
      await noP2P.handleRemoteAction({ type: 'attack', payload: {} });
      // No error from missing p2pManager
    });
  });

  // --- Client registration delegation ---

  describe('client registration', () => {
    it('registerClient delegates to gameEngine', () => {
      const cb = vi.fn();
      hostServer.registerClient('player1', cb);
      expect(mockEngine.registerClient).toHaveBeenCalledWith('player1', cb);
    });

    it('unregisterClient delegates to gameEngine', () => {
      hostServer.unregisterClient('player1');
      expect(mockEngine.unregisterClient).toHaveBeenCalledWith('player1');
    });
  });

  // --- State delegation ---

  describe('state delegation', () => {
    it('getState delegates to gameEngine', () => {
      hostServer.getState();
      expect(mockEngine.getState).toHaveBeenCalled();
    });

    it('getPlayerView redacts state for the given player', () => {
      const view = hostServer.getPlayerView('player1');
      // player1's own hand preserved, player2's hand redacted
      expect(view.player1.hand).toEqual([{ id: 'c1' }]);
      expect(view.player2.hand).toEqual([]);
      expect(mockEngine.getState).toHaveBeenCalled();
    });
  });
});
