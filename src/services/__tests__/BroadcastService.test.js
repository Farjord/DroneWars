import { describe, it, expect, vi, beforeEach } from 'vitest';
import BroadcastService from '../BroadcastService.js';
import StateRedactor from '../../server/StateRedactor.js';

describe('BroadcastService', () => {
  let broadcastService;
  let mockGameStateManager;
  let mockP2pManager;
  let mockGameServer;

  beforeEach(() => {
    mockGameStateManager = {
      get: vi.fn(),
      getState: vi.fn(() => ({ player1: { hp: 10 }, player2: { hp: 10 } })),
    };
    mockP2pManager = {
      isConnected: true,
      broadcastState: vi.fn(),
    };
    mockGameServer = {
      getLocalPlayerId: vi.fn(() => 'player1'),
    };
    broadcastService = new BroadcastService({
      gameStateManager: mockGameStateManager,
      p2pManager: mockP2pManager,
    });
    broadcastService.setGameServer(mockGameServer);
  });

  describe('guard: no-op when not host or no p2pManager', () => {
    it('does nothing when not host (localPlayerId !== player1)', () => {
      mockGameServer.getLocalPlayerId.mockReturnValue('player2');
      broadcastService.broadcastIfNeeded('test_trigger');
      expect(mockP2pManager.broadcastState).not.toHaveBeenCalled();
    });

    it('does nothing when p2pManager is null', () => {
      const service = new BroadcastService({
        gameStateManager: mockGameStateManager,
        p2pManager: null,
      });
      service.setGameServer(mockGameServer);
      service.broadcastIfNeeded('test_trigger');
      // No error thrown, no broadcast
    });

    it('does nothing when p2pManager is not connected', () => {
      mockP2pManager.isConnected = false;
      broadcastService.broadcastIfNeeded('test_trigger');
      expect(mockP2pManager.broadcastState).not.toHaveBeenCalled();
    });

    it('does nothing when no gameServer is set', () => {
      broadcastService.gameServer = null;
      broadcastService.broadcastIfNeeded('test_trigger');
      expect(mockP2pManager.broadcastState).not.toHaveBeenCalled();
    });
  });

  describe('state priority', () => {
    it('broadcasts currentState (redacted) when no pending states', () => {
      const currentState = { player1: { hp: 5, hand: [], deck: [], discardPile: [] }, player2: { hp: 8, hand: [], deck: [], discardPile: [] } };
      mockGameStateManager.getState.mockReturnValue(currentState);

      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        StateRedactor.redactForPlayer(currentState, 'player2'), [], []
      );
    });

    it('uses pendingStateUpdate over currentState', () => {
      const pendingState = { player1: { hp: 3, hand: [], deck: [], discardPile: [] }, player2: { hp: 7, hand: [], deck: [], discardPile: [] } };
      broadcastService.setPendingStates(pendingState, null);

      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        StateRedactor.redactForPlayer(pendingState, 'player2'), [], []
      );
    });

    it('uses pendingFinalState over pendingStateUpdate', () => {
      const pendingState = { player1: { hp: 3, hand: [], deck: [], discardPile: [] }, player2: { hp: 7, hand: [], deck: [], discardPile: [] } };
      const finalState = { player1: { hp: 1, hand: [], deck: [], discardPile: [] }, player2: { hp: 9, hand: [], deck: [], discardPile: [] } };
      broadcastService.setPendingStates(pendingState, finalState);

      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        StateRedactor.redactForPlayer(finalState, 'player2'), [], []
      );
    });
  });

  describe('animation capture and clear-on-broadcast', () => {
    it('captures action animations', () => {
      const anims = [{ animationName: 'MOVE', payload: {} }];
      broadcastService.captureAnimations(anims, false);

      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        expect.anything(), anims, []
      );
    });

    it('captures system animations separately', () => {
      const anims = [{ animationName: 'PHASE_ANNOUNCE', payload: {} }];
      broadcastService.captureAnimations(anims, true);

      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        expect.anything(), [], anims
      );
    });

    it('clears animations after broadcast', () => {
      broadcastService.captureAnimations([{ animationName: 'MOVE' }], false);
      broadcastService.captureAnimations([{ animationName: 'SYS' }], true);

      broadcastService.broadcastIfNeeded('test');
      // Second broadcast should have empty animations
      broadcastService.broadcastIfNeeded('test2');

      expect(mockP2pManager.broadcastState).toHaveBeenNthCalledWith(
        2, expect.anything(), [], []
      );
    });

    it('filters STATE_SNAPSHOT from action animation capture', () => {
      const anims = [
        { animationName: 'STATE_SNAPSHOT', payload: {} },
        { animationName: 'MOVE', payload: {} },
      ];
      broadcastService.captureAnimationsForBroadcast(anims);

      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        expect.anything(),
        [{ animationName: 'MOVE', payload: {} }],
        []
      );
    });

    it('captureAnimations is no-op when not host', () => {
      mockGameServer.getLocalPlayerId.mockReturnValue('player2');
      broadcastService.captureAnimations([{ animationName: 'A' }], false);
      expect(broadcastService.getAndClearPendingActionAnimations()).toEqual([]);
    });

    it('captureAnimationsForBroadcast is no-op when not host', () => {
      mockGameServer.getLocalPlayerId.mockReturnValue('player2');
      broadcastService.captureAnimationsForBroadcast([{ animationName: 'MOVE' }]);

      mockGameServer.getLocalPlayerId.mockReturnValue('player1');
      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        expect.anything(), [], []
      );
    });
  });

  describe('getAndClear methods', () => {
    it('getAndClearPendingActionAnimations returns and clears', () => {
      broadcastService.captureAnimations([{ animationName: 'A' }], false);
      const result = broadcastService.getAndClearPendingActionAnimations();
      expect(result).toEqual([{ animationName: 'A' }]);
      expect(broadcastService.getAndClearPendingActionAnimations()).toEqual([]);
    });

    it('getAndClearPendingSystemAnimations returns and clears', () => {
      broadcastService.captureAnimations([{ animationName: 'S' }], true);
      const result = broadcastService.getAndClearPendingSystemAnimations();
      expect(result).toEqual([{ animationName: 'S' }]);
      expect(broadcastService.getAndClearPendingSystemAnimations()).toEqual([]);
    });
  });

  describe('reset', () => {
    it('clears all pending state', () => {
      broadcastService.setPendingStates({ a: 1 }, { b: 2 });
      broadcastService.captureAnimations([{ animationName: 'X' }], false);
      broadcastService.captureAnimations([{ animationName: 'Y' }], true);

      broadcastService.reset();

      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        expect.anything(), [], []
      );
    });
  });

  describe('setPendingStates / clearPendingStates', () => {
    it('clearPendingStates removes pending state', () => {
      broadcastService.setPendingStates({ a: 1 }, { b: 2 });
      broadcastService.clearPendingStates();

      broadcastService.broadcastIfNeeded('test');

      // Should use currentState (redacted) since pending states were cleared
      const currentState = mockGameStateManager.getState();
      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        StateRedactor.redactForPlayer(currentState, 'player2'), [], []
      );
    });
  });
});
