import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GameFlowManager from './GameFlowManager';
import ActionProcessor from './ActionProcessor';

/**
 * GameFlowManager Subscription Lifecycle Tests
 *
 * Architecture Principle: Just-In-Time Subscription Setup
 * - Subscriptions should NOT be set up during app initialization
 * - Subscriptions should be set up when gameplay begins (startGame)
 * - This prevents cleanup operations from breaking subscriptions
 *
 * Flow:
 * 1. AppRouter calls GameFlowManager.initialize() - NO subscription yet
 * 2. MenuScreen can safely call clearQueue() - nothing to break
 * 3. User starts game, startGame() calls resubscribe() - subscription active
 * 4. Game ends, endGame() clears queue and resubscribes for next game
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

  describe('Architecture: Lazy Subscription Initialization', () => {
    it('should NOT have subscription after initialize() - subscriptions set up later', () => {
      // ARCHITECTURE: initialize() should NOT set up ActionProcessor subscription
      // This allows cleanup (like MenuScreen) to run without breaking subscriptions
      gameFlowManager.initialize(mockGameStateManager, actionProcessor, () => false);

      expect(actionProcessor.listeners.length).toBe(0);
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

    it('should NOT receive events when subscription is not active', () => {
      // ARCHITECTURE: Without resubscribe(), no events are received
      gameFlowManager.initialize(mockGameStateManager, actionProcessor, () => false);
      // Note: NO resubscribe() call
      const handleSpy = vi.spyOn(gameFlowManager, 'handleActionCompletion');

      actionProcessor.emit('action_completed', {
        actionType: 'deployment',
        result: { shouldEndTurn: true }
      });

      expect(handleSpy).not.toHaveBeenCalled();
    });
  });
});
