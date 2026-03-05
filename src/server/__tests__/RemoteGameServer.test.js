import { describe, it, expect, vi, beforeEach } from 'vitest';
import RemoteGameServer from '../RemoteGameServer.js';
import GameServer from '../GameServer.js';

describe('RemoteGameServer', () => {
  let server;
  let mockGSM;
  let mockP2P;

  beforeEach(() => {
    mockGSM = {
      processAction: vi.fn().mockResolvedValue({ success: true, animations: { actionAnimations: [] } }),
      getState: vi.fn().mockReturnValue({ phase: 'battle', players: {} }),
      getLocalPlayerId: vi.fn().mockReturnValue('player2'),
      subscribe: vi.fn().mockReturnValue(vi.fn()),
      trackOptimisticAnimations: vi.fn(),
    };
    mockP2P = {
      sendActionToHost: vi.fn(),
    };
    server = new RemoteGameServer(mockGSM, mockP2P);
  });

  it('extends GameServer', () => {
    expect(server).toBeInstanceOf(GameServer);
  });

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

      expect(mockP2P.sendActionToHost).toHaveBeenCalledWith('end_turn', {});
      expect(mockGSM.processAction).toHaveBeenCalledWith('end_turn', {});
      expect(mockGSM.trackOptimisticAnimations).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('getState', () => {
    it('delegates to gameStateManager.getState', () => {
      const state = server.getState();
      expect(mockGSM.getState).toHaveBeenCalled();
      expect(state).toEqual({ phase: 'battle', players: {} });
    });
  });

  describe('getPlayerView', () => {
    it('returns getState() as pass-through (redaction deferred to Phase 8)', () => {
      const view = server.getPlayerView('player2');
      expect(view).toEqual({ phase: 'battle', players: {} });
    });
  });

  describe('getLocalPlayerId', () => {
    it('delegates to gameStateManager.getLocalPlayerId', () => {
      expect(server.getLocalPlayerId()).toBe('player2');
      expect(mockGSM.getLocalPlayerId).toHaveBeenCalled();
    });
  });

  describe('isPlayerAI', () => {
    it('returns false for both players (multiplayer = no AI)', () => {
      expect(server.isPlayerAI('player1')).toBe(false);
      expect(server.isPlayerAI('player2')).toBe(false);
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
