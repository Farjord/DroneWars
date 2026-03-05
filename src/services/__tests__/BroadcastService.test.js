import { describe, it, expect, vi, beforeEach } from 'vitest';
import BroadcastService from '../BroadcastService.js';

describe('BroadcastService', () => {
  let broadcastService;
  let mockGameStateManager;
  let mockP2pManager;

  beforeEach(() => {
    mockGameStateManager = {
      get: vi.fn(),
      getState: vi.fn(() => ({ player1: { hp: 10 }, player2: { hp: 10 } })),
    };
    mockP2pManager = {
      isConnected: true,
      broadcastState: vi.fn(),
    };
    broadcastService = new BroadcastService({
      gameStateManager: mockGameStateManager,
      p2pManager: mockP2pManager,
    });
  });

  describe('guard: no-op when not host or no p2pManager', () => {
    it('does nothing when gameMode is not host', () => {
      mockGameStateManager.get.mockReturnValue('single');
      broadcastService.broadcastIfNeeded('test_trigger');
      expect(mockP2pManager.broadcastState).not.toHaveBeenCalled();
    });

    it('does nothing when p2pManager is null', () => {
      const service = new BroadcastService({
        gameStateManager: mockGameStateManager,
        p2pManager: null,
      });
      mockGameStateManager.get.mockReturnValue('host');
      service.broadcastIfNeeded('test_trigger');
      // No error thrown, no broadcast
    });

    it('does nothing when p2pManager is not connected', () => {
      mockP2pManager.isConnected = false;
      mockGameStateManager.get.mockReturnValue('host');
      broadcastService.broadcastIfNeeded('test_trigger');
      expect(mockP2pManager.broadcastState).not.toHaveBeenCalled();
    });
  });

  describe('state priority', () => {
    beforeEach(() => {
      mockGameStateManager.get.mockReturnValue('host');
    });

    it('broadcasts currentState when no pending states', () => {
      const currentState = { player1: { hp: 5 }, player2: { hp: 8 } };
      mockGameStateManager.getState.mockReturnValue(currentState);

      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        currentState, [], []
      );
    });

    it('uses pendingStateUpdate over currentState', () => {
      const pendingState = { player1: { hp: 3 }, player2: { hp: 7 } };
      broadcastService.setPendingStates(pendingState, null);

      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        pendingState, [], []
      );
    });

    it('uses pendingFinalState over pendingStateUpdate', () => {
      const pendingState = { player1: { hp: 3 }, player2: { hp: 7 } };
      const finalState = { player1: { hp: 1 }, player2: { hp: 9 } };
      broadcastService.setPendingStates(pendingState, finalState);

      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        finalState, [], []
      );
    });
  });

  describe('animation capture and clear-on-broadcast', () => {
    beforeEach(() => {
      mockGameStateManager.get.mockReturnValue('host');
    });

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
      mockGameStateManager.get.mockReturnValue('local');
      broadcastService.captureAnimations([{ animationName: 'A' }], false);
      expect(broadcastService.getAndClearPendingActionAnimations()).toEqual([]);
    });

    it('captureAnimationsForBroadcast is no-op when not host', () => {
      mockGameStateManager.get.mockReturnValue('single');
      broadcastService.captureAnimationsForBroadcast([{ animationName: 'MOVE' }]);

      mockGameStateManager.get.mockReturnValue('host');
      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        expect.anything(), [], []
      );
    });
  });

  describe('getAndClear methods', () => {
    it('getAndClearPendingActionAnimations returns and clears', () => {
      mockGameStateManager.get.mockReturnValue('host');
      broadcastService.captureAnimations([{ animationName: 'A' }], false);
      const result = broadcastService.getAndClearPendingActionAnimations();
      expect(result).toEqual([{ animationName: 'A' }]);
      expect(broadcastService.getAndClearPendingActionAnimations()).toEqual([]);
    });

    it('getAndClearPendingSystemAnimations returns and clears', () => {
      mockGameStateManager.get.mockReturnValue('host');
      broadcastService.captureAnimations([{ animationName: 'S' }], true);
      const result = broadcastService.getAndClearPendingSystemAnimations();
      expect(result).toEqual([{ animationName: 'S' }]);
      expect(broadcastService.getAndClearPendingSystemAnimations()).toEqual([]);
    });
  });

  describe('reset', () => {
    it('clears all pending state', () => {
      mockGameStateManager.get.mockReturnValue('host');
      broadcastService.setPendingStates({ a: 1 }, { b: 2 });
      broadcastService.captureAnimations([{ animationName: 'X' }], false);
      broadcastService.captureAnimations([{ animationName: 'Y' }], true);

      broadcastService.reset();

      mockGameStateManager.get.mockReturnValue('host');
      broadcastService.broadcastIfNeeded('test');

      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        expect.anything(), [], []
      );
    });
  });

  describe('setPendingStates / clearPendingStates', () => {
    it('clearPendingStates removes pending state', () => {
      mockGameStateManager.get.mockReturnValue('host');
      broadcastService.setPendingStates({ a: 1 }, { b: 2 });
      broadcastService.clearPendingStates();

      broadcastService.broadcastIfNeeded('test');

      // Should use currentState since pending states were cleared
      expect(mockP2pManager.broadcastState).toHaveBeenCalledWith(
        mockGameStateManager.getState(), [], []
      );
    });
  });
});
