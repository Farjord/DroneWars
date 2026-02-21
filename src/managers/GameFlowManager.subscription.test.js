import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GameFlowManager from './GameFlowManager';
import ActionProcessor from './ActionProcessor';

/**
 * GameFlowManager Subscription Lifecycle Tests
 *
 * Architecture: Eager Subscription via initialize()
 * - initialize() calls resubscribe() at the end, making the subscription active immediately
 * - clearQueue() wipes all listeners, requiring resubscribe() to restore them
 * - resubscribe() is idempotent — it unsubscribes first, then re-subscribes
 *
 * Flow:
 * 1. GameFlowManager.initialize() sets up subscription via resubscribe()
 * 2. clearQueue() can wipe listeners for a clean slate
 * 3. resubscribe() restores listeners after any clearQueue() call
 */
describe('GameFlowManager Subscription Lifecycle', () => {
  let gameFlowManager;
  let mockGameStateManager;
  let actionProcessor;

  beforeEach(() => {
    // Reset singletons
    GameFlowManager.instance = null;
    ActionProcessor.instance = null;

    mockGameStateManager = {
      get: vi.fn().mockReturnValue('local'),
      getState: vi.fn().mockReturnValue({
        gameMode: 'local',
        turnPhase: 'deployment',
        currentPlayer: 'player1',
        passInfo: {}
      }),
      subscribe: vi.fn().mockReturnValue(() => {}),
      setState: vi.fn(),
      addLogEntry: vi.fn()
    };

    actionProcessor = ActionProcessor.getInstance(mockGameStateManager);
    gameFlowManager = new GameFlowManager();
    gameFlowManager.isInitialized = false;
  });

  afterEach(() => {
    GameFlowManager.instance = null;
    ActionProcessor.instance = null;
  });

  describe('Architecture: Eager Subscription Initialization', () => {
    it('should have subscription after initialize() - resubscribe() called during init', () => {
      // initialize() calls resubscribe() at the end, setting up the ActionProcessor subscription immediately
      gameFlowManager.initialize(mockGameStateManager, actionProcessor, () => false);

      expect(actionProcessor.listeners.length).toBeGreaterThan(0);
    });

    it('should have subscription after resubscribe() is called', () => {
      // ARCHITECTURE: resubscribe() explicitly sets up the subscription
      // Called by startGame() just before gameplay begins
      gameFlowManager.initialize(mockGameStateManager, actionProcessor, () => false);
      gameFlowManager.resubscribe();

      expect(actionProcessor.listeners.length).toBeGreaterThan(0);
    });
  });

  describe('Architecture: Cleanup Safety', () => {
    it('clearQueue() should wipe all listeners', () => {
      // ARCHITECTURE: clearQueue() is intended to provide a clean slate
      gameFlowManager.initialize(mockGameStateManager, actionProcessor, () => false);
      gameFlowManager.resubscribe();
      expect(actionProcessor.listeners.length).toBeGreaterThan(0);

      actionProcessor.clearQueue();

      expect(actionProcessor.listeners.length).toBe(0);
    });

    it('resubscribe() should restore listeners after clearQueue()', () => {
      // ARCHITECTURE: After any clearQueue(), resubscribe() must be called
      // to restore the subscription for turn transitions
      gameFlowManager.initialize(mockGameStateManager, actionProcessor, () => false);
      gameFlowManager.resubscribe();
      actionProcessor.clearQueue();

      gameFlowManager.resubscribe();

      expect(actionProcessor.listeners.length).toBeGreaterThan(0);
    });
  });

  describe('Architecture: Event Handling', () => {
    it('should receive action_completed events when subscription is active', () => {
      gameFlowManager.initialize(mockGameStateManager, actionProcessor, () => false);
      gameFlowManager.resubscribe();
      const handleSpy = vi.spyOn(gameFlowManager, 'handleActionCompletion');

      actionProcessor.emit('action_completed', {
        actionType: 'deployment',
        result: { shouldEndTurn: true }
      });

      expect(handleSpy).toHaveBeenCalled();
    });

    it('should NOT receive events after clearQueue() removes subscription', () => {
      // After clearQueue() wipes listeners, events should not reach the handler
      gameFlowManager.initialize(mockGameStateManager, actionProcessor, () => false);
      actionProcessor.clearQueue();
      const handleSpy = vi.spyOn(gameFlowManager, 'handleActionCompletion');

      actionProcessor.emit('action_completed', {
        actionType: 'deployment',
        result: { shouldEndTurn: true }
      });

      expect(handleSpy).not.toHaveBeenCalled();
    });
  });
});
