// ========================================
// GAMEENGINE DEFERRED CONTINUATION TESTS
// ========================================
// Tests the deferred continuation loop in GameEngine.processAction

import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameEngine from '../GameEngine.js';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));
vi.mock('../../utils/flowVerification.js', () => ({
  flowCheckpoint: vi.fn(),
  resetFlowSeq: vi.fn(),
}));

describe('GameEngine - Deferred Continuation', () => {
  let engine;
  let mockGSM;
  let mockAP;
  let mockGFM;

  const mockState = {
    phase: 'roundEnd',
    player1: { hand: [], deck: [], discardPile: [], hp: 10 },
    player2: { hand: [], deck: [], discardPile: [], hp: 10 },
  };

  const deploymentState = {
    phase: 'deployment',
    player1: { hand: [], deck: [], discardPile: [], hp: 10 },
    player2: { hand: [], deck: [], discardPile: [], hp: 10 },
  };

  beforeEach(() => {
    mockGSM = {
      getState: vi.fn().mockReturnValue(mockState),
      processAction: vi.fn().mockResolvedValue({ success: true }),
      beginProcessing: vi.fn(),
      endProcessing: vi.fn(),
    };
    mockAP = {
      startResponseCapture: vi.fn(),
      getAndClearResponseCapture: vi.fn().mockReturnValue({ actionAnimations: [], systemAnimations: [] }),
    };
    mockGFM = {
      waitForPendingActionCompletion: vi.fn().mockResolvedValue(undefined),
      hasDeferredContinuation: vi.fn().mockReturnValue(false),
      executeDeferredContinuation: vi.fn().mockResolvedValue(undefined),
    };
    engine = new GameEngine(mockGSM, mockAP, mockGFM);
  });

  it('skips deferred loop when nothing is deferred', async () => {
    await engine.processAction('pass', {});

    expect(mockGFM.hasDeferredContinuation).toHaveBeenCalled();
    expect(mockGFM.executeDeferredContinuation).not.toHaveBeenCalled();
  });

  it('processes deferred continuation in a separate emit cycle', async () => {
    // First call: has deferred. Second call (after execute): no deferred.
    mockGFM.hasDeferredContinuation
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    await engine.processAction('pass', {});

    // Should have started a new capture cycle for the deferred continuation
    // 1st call: initial processAction, 2nd call: deferred continuation
    expect(mockAP.startResponseCapture).toHaveBeenCalledTimes(2);
    expect(mockGFM.executeDeferredContinuation).toHaveBeenCalledOnce();
    expect(mockGFM.waitForPendingActionCompletion).toHaveBeenCalledTimes(2);
    expect(mockAP.getAndClearResponseCapture).toHaveBeenCalledTimes(2);
  });

  it('sends two responses when continuation is deferred', async () => {
    const cb = vi.fn();
    engine.registerClient('player1', cb);

    const roundEndAnims = {
      actionAnimations: [{ animationName: 'TRIGGER_FIRED', payload: {} }],
      systemAnimations: [],
    };
    const deploymentAnims = {
      actionAnimations: [],
      systemAnimations: [{ animationName: 'PHASE_ANNOUNCEMENT', payload: { phase: 'deployment' } }],
    };

    mockAP.getAndClearResponseCapture
      .mockReturnValueOnce(roundEndAnims)
      .mockReturnValueOnce(deploymentAnims);

    mockGSM.getState
      .mockReturnValueOnce(mockState)      // initial state for processAction
      .mockReturnValueOnce(mockState)       // state for first emit
      .mockReturnValueOnce(deploymentState); // state for deferred emit

    mockGFM.hasDeferredContinuation
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    await engine.processAction('pass', {});

    // Client should receive two separate responses
    expect(cb).toHaveBeenCalledTimes(2);

    // First response: roundEnd with trigger animations
    const firstResponse = cb.mock.calls[0][0];
    expect(firstResponse.animations.actionAnimations[0].animationName).toBe('TRIGGER_FIRED');

    // Second response: deployment with phase announcement
    const secondResponse = cb.mock.calls[1][0];
    expect(secondResponse.animations.systemAnimations[0].animationName).toBe('PHASE_ANNOUNCEMENT');
  });

  it('handles chained deferred continuations (while loop)', async () => {
    // First check: deferred. After first execute: still deferred. After second: done.
    mockGFM.hasDeferredContinuation
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    await engine.processAction('pass', {});

    expect(mockGFM.executeDeferredContinuation).toHaveBeenCalledTimes(2);
    // 1 initial + 2 deferred = 3
    expect(mockAP.startResponseCapture).toHaveBeenCalledTimes(3);
    expect(mockAP.getAndClearResponseCapture).toHaveBeenCalledTimes(3);
  });
});
