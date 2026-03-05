import { describe, it, expect, vi, beforeEach } from 'vitest';
import LocalGameServer from '../LocalGameServer.js';
import GameServer from '../GameServer.js';

describe('LocalGameServer', () => {
  let server;
  let mockGSM;

  const mockState = {
    phase: 'battle',
    player1: { hand: [{ id: 'c1' }], deck: [], discardPile: [], hp: 10 },
    player2: { hand: [{ id: 'c2' }], deck: [], discardPile: [], hp: 10 },
  };

  beforeEach(() => {
    mockGSM = {
      processAction: vi.fn().mockResolvedValue({ success: true, animations: [] }),
      getState: vi.fn().mockReturnValue(mockState),
      getLocalPlayerId: vi.fn().mockReturnValue('player1'),
      subscribe: vi.fn().mockReturnValue(vi.fn()),
    };
    server = new LocalGameServer(mockGSM);
  });

  it('extends GameServer', () => {
    expect(server).toBeInstanceOf(GameServer);
  });

  describe('submitAction (legacy path — no gameEngine)', () => {
    it('delegates to gameStateManager.processAction and returns result', async () => {
      const result = await server.submitAction('deployment', { lane: 'mid' });
      expect(mockGSM.processAction).toHaveBeenCalledWith('deployment', { lane: 'mid' });
      expect(result).toEqual({ success: true, animations: [] });
    });
  });

  describe('submitAction (gameEngine path)', () => {
    it('delegates to gameEngine.processAction and returns the inner result', async () => {
      const mockEngine = {
        processAction: vi.fn().mockResolvedValue({
          state: mockState,
          result: { success: true, shouldEndTurn: false },
        }),
      };
      const engineServer = new LocalGameServer(mockGSM, { gameEngine: mockEngine });

      const result = await engineServer.submitAction('attack', { droneId: 'd1' });

      expect(mockEngine.processAction).toHaveBeenCalledWith('attack', { droneId: 'd1' });
      expect(mockGSM.processAction).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, shouldEndTurn: false });
    });
  });

  describe('getState', () => {
    it('delegates to gameStateManager.getState', () => {
      const state = server.getState();
      expect(mockGSM.getState).toHaveBeenCalled();
      expect(state).toBe(mockState);
    });
  });

  describe('getPlayerView', () => {
    it('returns redacted state hiding opponent cards (legacy path)', () => {
      const view = server.getPlayerView('player1');
      expect(view.player1.hand).toEqual([{ id: 'c1' }]);
      expect(view.player2.hand).toEqual([]);
      expect(view.player2.handCount).toBe(1);
    });

    it('delegates to gameEngine.getPlayerView when available', () => {
      const mockView = { player1: {}, player2: {} };
      const mockEngine = { getPlayerView: vi.fn().mockReturnValue(mockView) };
      const engineServer = new LocalGameServer(mockGSM, { gameEngine: mockEngine });

      const view = engineServer.getPlayerView('player1');
      expect(mockEngine.getPlayerView).toHaveBeenCalledWith('player1');
      expect(view).toBe(mockView);
    });
  });

  describe('getLocalPlayerId', () => {
    it('returns player1 directly (host/local is always player1)', () => {
      expect(server.getLocalPlayerId()).toBe('player1');
    });
  });

  describe('isMultiplayer', () => {
    it('returns false by default (single-player)', () => {
      expect(server.isMultiplayer()).toBe(false);
    });

    it('returns true when constructed with isMultiplayer flag', () => {
      const mpServer = new LocalGameServer(mockGSM, { isMultiplayer: true });
      expect(mpServer.isMultiplayer()).toBe(true);
    });
  });

  describe('isPlayerAI', () => {
    it('returns true for player2 (AI in local mode)', () => {
      expect(server.isPlayerAI('player2')).toBe(true);
    });

    it('returns false for player1 (human in local mode)', () => {
      expect(server.isPlayerAI('player1')).toBe(false);
    });
  });

  describe('onStateUpdate', () => {
    it('subscribes via gameStateManager.subscribe and returns unsubscribe fn', () => {
      const callback = vi.fn();
      const unsubscribe = server.onStateUpdate(callback);
      expect(mockGSM.subscribe).toHaveBeenCalledWith(callback);
      expect(typeof unsubscribe).toBe('function');
    });
  });
});
