import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AnimationManager from '../AnimationManager.js';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  timingLog: vi.fn(() => Date.now()),
  getTimestamp: vi.fn(() => Date.now()),
}));
vi.mock('../../utils/flowVerification.js', () => ({
  flowCheckpoint: vi.fn(),
}));

function createMockGameStateManager() {
  return {
    getLocalPlayerId: vi.fn(() => 'player1'),
    getState: vi.fn(() => ({})),
    emit: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  };
}

describe('AnimationManager', () => {
  let gsm;
  let am;

  beforeEach(() => {
    gsm = createMockGameStateManager();
    am = new AnimationManager(gsm);
  });

  it('registers and stores visual handlers', () => {
    const handler = vi.fn();
    am.registerVisualHandler('TEST_TYPE', handler);
    expect(am.visualHandlers.size).toBe(1);
    expect(am.visualHandlers.get('TEST_TYPE')).toBe(handler);
  });

  it('executeWithStateUpdate applies state immediately when no animations', async () => {
    const executor = {
      applyPendingStateUpdate: vi.fn(),
      getAnimationSource: vi.fn(() => 'test'),
    };

    await am.executeWithStateUpdate([], executor);
    expect(executor.applyPendingStateUpdate).toHaveBeenCalledOnce();
  });

  it('executeWithStateUpdate applies state immediately when animations is null', async () => {
    const executor = {
      applyPendingStateUpdate: vi.fn(),
      getAnimationSource: vi.fn(() => 'test'),
    };

    await am.executeWithStateUpdate(null, executor);
    expect(executor.applyPendingStateUpdate).toHaveBeenCalledOnce();
  });

  it('setBlocking emits animationStateChange event', () => {
    am.setBlocking(true);
    expect(gsm.emit).toHaveBeenCalledWith('animationStateChange', { blocking: true });
    expect(am.isBlocking).toBe(true);

    am.setBlocking(false);
    expect(gsm.emit).toHaveBeenCalledWith('animationStateChange', { blocking: false });
    expect(am.isBlocking).toBe(false);
  });

  it('executeAnimations returns early for empty effects', async () => {
    await am.executeAnimations([], 'test');
    // setBlocking should NOT have been called (no effects to execute)
    expect(gsm.emit).not.toHaveBeenCalled();
  });

  it('executeAnimations plays sequential animation via handler', async () => {
    vi.useFakeTimers();

    const handler = vi.fn(({ onComplete }) => onComplete());
    am.registerVisualHandler('PASS_NOTIFICATION_EFFECT', handler);

    const promise = am.executeAnimations([
      { animationName: 'PASS_NOTIFICATION', payload: {} },
    ], 'test');

    // Advance past safety timeout + post-animation delay
    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(handler).toHaveBeenCalledOnce();
    // Blocking should be released after completion
    expect(am.isBlocking).toBe(false);

    vi.useRealTimers();
  });
});
