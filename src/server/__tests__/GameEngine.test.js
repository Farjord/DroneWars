import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameEngine from '../GameEngine.js';

describe('GameEngine', () => {
  let engine;
  let mockGSM;
  let mockAP;
  let mockGFM;

  const mockState = {
    phase: 'battle',
    player1: { hand: [{ id: 'c1' }], deck: [], discardPile: [], hp: 10 },
    player2: { hand: [{ id: 'c2' }], deck: [], discardPile: [], hp: 10 },
  };

  beforeEach(() => {
    mockGSM = {
      getState: vi.fn().mockReturnValue(mockState),
      processAction: vi.fn().mockResolvedValue({ success: true, animations: { actionAnimations: [], systemAnimations: [] } }),
      subscribe: vi.fn().mockReturnValue(vi.fn()),
      beginProcessing: vi.fn(),
      endProcessing: vi.fn(),
    };
    mockAP = {
      queueAction: vi.fn().mockResolvedValue({ success: true }),
    };
    mockGFM = {
      startGame: vi.fn(),
      endGame: vi.fn(),
      waitForPendingActionCompletion: vi.fn().mockResolvedValue(undefined),
    };
    engine = new GameEngine(mockGSM, mockAP, mockGFM);
  });

  describe('constructor', () => {
    it('stores references to all three subsystems', () => {
      expect(engine.gameStateManager).toBe(mockGSM);
      expect(engine.actionProcessor).toBe(mockAP);
      expect(engine.gameFlowManager).toBe(mockGFM);
    });
  });

  describe('processAction', () => {
    it('delegates to gameStateManager.processAction and returns { state, animations, result }', async () => {
      const actionResult = { success: true, shouldEndTurn: false };
      mockGSM.processAction.mockResolvedValue(actionResult);

      const response = await engine.processAction('attack', { droneId: 'd1' });

      expect(mockGSM.processAction).toHaveBeenCalledWith('attack', { droneId: 'd1' });
      expect(response).toHaveProperty('state');
      expect(response).toHaveProperty('animations');
      expect(response).toHaveProperty('result');
      expect(response.result).toBe(actionResult);
      expect(response.state).toBe(mockState);
    });

    it('extracts collectedAnimations from result into animations field', async () => {
      const mockAnims = {
        actionAnimations: [{ animationName: 'ATTACK', payload: {} }],
        systemAnimations: [{ animationName: 'PHASE_ANNOUNCE', payload: {} }],
      };
      const actionResult = { success: true, collectedAnimations: mockAnims };
      mockGSM.processAction.mockResolvedValue(actionResult);

      const response = await engine.processAction('attack', { droneId: 'd1' });

      expect(response.animations).toEqual(mockAnims);
    });

    it('returns empty animation arrays when result has no collectedAnimations', async () => {
      mockGSM.processAction.mockResolvedValue({ success: true });

      const response = await engine.processAction('move', { droneId: 'd1' });

      expect(response.animations).toEqual({ actionAnimations: [], systemAnimations: [] });
    });
  });

  describe('getState', () => {
    it('delegates to gameStateManager.getState', () => {
      const state = engine.getState();
      expect(mockGSM.getState).toHaveBeenCalled();
      expect(state).toBe(mockState);
    });
  });

  describe('client registration and push', () => {
    it('registerClient adds a client and unregisterClient removes it', () => {
      const cb = vi.fn();
      engine.registerClient('player1', cb);
      expect(engine._clients.size).toBe(1);
      engine.unregisterClient('player1');
      expect(engine._clients.size).toBe(0);
    });

    it('processAction emits redacted state to registered clients', async () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      engine.registerClient('player1', cb1);
      engine.registerClient('player2', cb2);

      mockGSM.processAction.mockResolvedValue({ success: true });
      await engine.processAction('move', { droneId: 'd1' });

      // player1 callback receives state with player2's hand redacted
      expect(cb1).toHaveBeenCalledTimes(1);
      const p1Response = cb1.mock.calls[0][0];
      expect(p1Response.state.player1.hand).toEqual([{ id: 'c1' }]);
      expect(p1Response.state.player2.hand).toEqual([]);
      expect(p1Response.state.player2.handCount).toBe(1);

      // player2 callback receives state with player1's hand redacted
      expect(cb2).toHaveBeenCalledTimes(1);
      const p2Response = cb2.mock.calls[0][0];
      expect(p2Response.state.player2.hand).toEqual([{ id: 'c2' }]);
      expect(p2Response.state.player1.hand).toEqual([]);
      expect(p2Response.state.player1.handCount).toBe(1);
    });

    it('processAction emits animations to clients', async () => {
      const cb = vi.fn();
      engine.registerClient('player1', cb);

      const mockAnims = {
        actionAnimations: [{ animationName: 'ATTACK', payload: {} }],
        systemAnimations: [],
      };
      mockGSM.processAction.mockResolvedValue({ success: true, collectedAnimations: mockAnims });
      await engine.processAction('attack', {});

      expect(cb.mock.calls[0][0].animations).toEqual(mockAnims);
    });

    it('does not emit to unregistered clients', async () => {
      const cb = vi.fn();
      engine.registerClient('player1', cb);
      engine.unregisterClient('player1');

      mockGSM.processAction.mockResolvedValue({ success: true });
      await engine.processAction('move', {});

      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('animation isolation per client', () => {
    it('each client receives independent animation copies (no shared _apDirectQueued mutation)', async () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      engine.registerClient('player1', cb1);
      engine.registerClient('player2', cb2);

      const anims = {
        actionAnimations: [{ animationName: 'PHASE_ANNOUNCEMENT', _apDirectQueued: true, payload: { phase: 'action' } }],
        systemAnimations: [{ animationName: 'SOME_SYSTEM', payload: {} }],
      };
      mockGSM.processAction.mockResolvedValue({ success: true, collectedAnimations: anims });
      await engine.processAction('attack', {});

      // Each client should receive independent copies
      const p1Anims = cb1.mock.calls[0][0].animations;
      const p2Anims = cb2.mock.calls[0][0].animations;

      // Animations should be cloned — not the same object reference
      expect(p1Anims.actionAnimations[0]).not.toBe(p2Anims.actionAnimations[0]);

      // _apDirectQueued should be stripped from all client copies
      // (host GameClient re-checks via its own PhaseAnimationQueue dedup)
      expect(p1Anims.actionAnimations[0]._apDirectQueued).toBeFalsy();
      expect(p2Anims.actionAnimations[0]._apDirectQueued).toBeFalsy();
    });
  });

  describe('processing lifecycle (beginProcessing / endProcessing)', () => {
    it('calls beginProcessing before and endProcessing after processAction', async () => {
      mockGSM.beginProcessing = vi.fn();
      mockGSM.endProcessing = vi.fn();
      let beginCalledDuringProcessing = false;
      mockGSM.processAction.mockImplementation(async () => {
        beginCalledDuringProcessing = mockGSM.beginProcessing.mock.calls.length > 0;
        return { success: true };
      });

      await engine.processAction('move', {});

      expect(beginCalledDuringProcessing).toBe(true);
      expect(mockGSM.beginProcessing).toHaveBeenCalledTimes(1);
      expect(mockGSM.endProcessing).toHaveBeenCalledTimes(1);
    });

    it('calls endProcessing even when processAction throws', async () => {
      mockGSM.beginProcessing = vi.fn();
      mockGSM.endProcessing = vi.fn();
      mockGSM.processAction.mockRejectedValue(new Error('boom'));

      await expect(engine.processAction('move', {})).rejects.toThrow('boom');

      expect(mockGSM.endProcessing).toHaveBeenCalledTimes(1);
    });
  });
});
