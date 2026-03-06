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
    };
    mockAP = {
      queueAction: vi.fn().mockResolvedValue({ success: true }),
      broadcastService: { getAndClearPendingActionAnimations: vi.fn().mockReturnValue([]), getAndClearPendingSystemAnimations: vi.fn().mockReturnValue([]) },
    };
    mockGFM = {
      startGame: vi.fn(),
      endGame: vi.fn(),
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

  describe('getPlayerView', () => {
    it('returns raw state (redaction is handled by callers)', () => {
      const view = engine.getPlayerView('player1');
      expect(view).toBe(mockState);
    });
  });
});
