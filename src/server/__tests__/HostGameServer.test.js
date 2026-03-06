import { describe, it, expect, vi, beforeEach } from 'vitest';
import HostGameServer from '../HostGameServer.js';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

describe('HostGameServer', () => {
  let hostServer;
  let mockEngine;
  let mockBroadcast;
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
      getPlayerView: vi.fn().mockReturnValue({ ...mockState, player2: { handCount: 1, hp: 20 } }),
    };
    mockBroadcast = {
      broadcastIfNeeded: vi.fn(),
    };
    mockP2P = {
      sendActionAck: vi.fn(),
    };
    hostServer = new HostGameServer(mockEngine, mockBroadcast, { p2pManager: mockP2P });
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

    it('broadcasts after processing', async () => {
      await hostServer.processAction('move', { droneId: 'd1', lane: 2 });
      expect(mockBroadcast.broadcastIfNeeded).toHaveBeenCalledWith('HostGameServer:move');
    });

    it('broadcasts after engine completes, not before', async () => {
      const order = [];
      mockEngine.processAction.mockImplementation(async () => {
        order.push('engine');
        return mockResponse;
      });
      mockBroadcast.broadcastIfNeeded.mockImplementation(() => {
        order.push('broadcast');
      });

      await hostServer.processAction('attack', {});
      expect(order).toEqual(['engine', 'broadcast']);
    });
  });

  // --- handleGuestAction ---

  describe('handleGuestAction', () => {
    it('processes guest action via gameEngine', async () => {
      await hostServer.handleGuestAction({ type: 'attack', payload: { droneId: 'd2' } });
      expect(mockEngine.processAction).toHaveBeenCalledWith('attack', { droneId: 'd2' });
    });

    it('broadcasts after processing guest action', async () => {
      await hostServer.handleGuestAction({ type: 'pass', payload: {} });
      expect(mockBroadcast.broadcastIfNeeded).toHaveBeenCalledWith('HostGameServer:guest_pass');
    });

    it('sends success ack to guest via p2pManager', async () => {
      await hostServer.handleGuestAction({ type: 'attack', payload: {} });
      expect(mockP2P.sendActionAck).toHaveBeenCalledWith({
        actionType: 'attack',
        success: true,
      });
    });

    it('returns the engine response', async () => {
      const result = await hostServer.handleGuestAction({ type: 'move', payload: {} });
      expect(result).toBe(mockResponse);
    });

    it('sends error ack with authoritative state on failure (no re-throw)', async () => {
      mockEngine.processAction.mockRejectedValue(new Error('Invalid action'));

      // handleGuestAction no longer throws — it sends ack and swallows the error
      await hostServer.handleGuestAction({ type: 'attack', payload: {} });

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

      await hostServer.handleGuestAction({ type: 'attack', payload: {} });

      const ackCall = mockP2P.sendActionAck.mock.calls[0][0];
      // authoritativeState should be redacted for player2 (guest)
      expect(ackCall.authoritativeState).toBeDefined();
      // Player2's own hand preserved, player1's hand redacted
      expect(ackCall.authoritativeState.player2.hand).toEqual([{ id: 'c2' }]);
      expect(ackCall.authoritativeState.player1.hand).toEqual([]);
    });

    it('does not send ack when p2pManager is null', async () => {
      const noP2P = new HostGameServer(mockEngine, mockBroadcast);
      await noP2P.handleGuestAction({ type: 'attack', payload: {} });
      // No error thrown, no ack sent
    });

    it('uses parameterized guestPlayerId for error ack redaction', async () => {
      const customHost = new HostGameServer(mockEngine, mockBroadcast, {
        p2pManager: mockP2P,
        guestPlayerId: 'player1',
      });
      mockEngine.processAction.mockRejectedValue(new Error('bad'));

      await customHost.handleGuestAction({ type: 'attack', payload: {} });

      const ackCall = mockP2P.sendActionAck.mock.calls[0][0];
      // Redacted for player1 (the custom guest), so player1's hand is preserved
      expect(ackCall.authoritativeState.player1.hand).toEqual([{ id: 'c1' }]);
      // Player2's hand is redacted (they're the host in this scenario)
      expect(ackCall.authoritativeState.player2.hand).toEqual([]);
    });

    it('does not send ack on error when p2pManager is null', async () => {
      const noP2P = new HostGameServer(mockEngine, mockBroadcast);
      mockEngine.processAction.mockRejectedValue(new Error('bad'));

      // Should not throw — error is caught and swallowed
      await noP2P.handleGuestAction({ type: 'attack', payload: {} });
      // No error from missing p2pManager
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
