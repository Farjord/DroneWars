import { describe, it, expect, vi, beforeEach } from 'vitest';
import LocalGameServer from '../LocalGameServer.js';
import GameServer from '../GameServer.js';

describe('LocalGameServer', () => {
  let server;
  let mockGSM;

  beforeEach(() => {
    mockGSM = {
      processAction: vi.fn().mockResolvedValue({ success: true, animations: [] }),
      getState: vi.fn().mockReturnValue({ phase: 'battle', players: {} }),
      getLocalPlayerId: vi.fn().mockReturnValue('player1'),
      subscribe: vi.fn().mockReturnValue(vi.fn()),
    };
    server = new LocalGameServer(mockGSM);
  });

  it('extends GameServer', () => {
    expect(server).toBeInstanceOf(GameServer);
  });

  describe('submitAction', () => {
    it('delegates to gameStateManager.processAction and returns result', async () => {
      const result = await server.submitAction('deployment', { lane: 'mid' });
      expect(mockGSM.processAction).toHaveBeenCalledWith('deployment', { lane: 'mid' });
      expect(result).toEqual({ success: true, animations: [] });
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
      const view = server.getPlayerView('player1');
      expect(view).toEqual({ phase: 'battle', players: {} });
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
