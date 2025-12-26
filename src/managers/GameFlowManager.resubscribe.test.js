import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GameFlowManager from './GameFlowManager';
import ActionProcessor from './ActionProcessor';

/**
 * GameFlowManager.resubscribe() Tests
 *
 * NOTE: For comprehensive architecture tests, see GameFlowManager.subscription.test.js
 * This file tests the resubscribe() functionality specifically.
 */
describe('GameFlowManager.resubscribe', () => {
  let gameFlowManager;
  let mockGameStateManager;
  let actionProcessor;

  beforeEach(() => {
    // Reset singletons
    GameFlowManager.instance = null;
    ActionProcessor.instance = null;

    // Create mock GameStateManager
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

    // Create ActionProcessor
    actionProcessor = ActionProcessor.getInstance(mockGameStateManager);

    // Create and initialize GameFlowManager
    // Note: initialize() does NOT set up ActionProcessor subscription (lazy init)
    gameFlowManager = new GameFlowManager();
    gameFlowManager.isInitialized = false;
    gameFlowManager.initialize(mockGameStateManager, actionProcessor, () => false);
  });

  afterEach(() => {
    GameFlowManager.instance = null;
    ActionProcessor.instance = null;
  });

  it('should have listeners after resubscribe() is called', () => {
    // Architecture: initialize() doesn't set up subscription; resubscribe() does
    gameFlowManager.resubscribe();
    expect(actionProcessor.listeners.length).toBeGreaterThan(0);
  });

  it('should have zero listeners after clearQueue', () => {
    // First set up subscription
    gameFlowManager.resubscribe();
    expect(actionProcessor.listeners.length).toBeGreaterThan(0);

    // Then clear it
    actionProcessor.clearQueue();
    expect(actionProcessor.listeners.length).toBe(0);
  });

  it('should restore listeners after resubscribe is called following clearQueue', () => {
    // Set up subscription
    gameFlowManager.resubscribe();

    // Clear the queue (simulating game reset)
    actionProcessor.clearQueue();
    expect(actionProcessor.listeners.length).toBe(0);

    // Re-subscribe
    gameFlowManager.resubscribe();
    expect(actionProcessor.listeners.length).toBeGreaterThan(0);
  });

  it('should receive action_completed events after resubscribe', () => {
    // Clear the queue
    actionProcessor.clearQueue();

    // Re-subscribe
    gameFlowManager.resubscribe();

    // Spy on handleActionCompletion
    const handleSpy = vi.spyOn(gameFlowManager, 'handleActionCompletion');

    // Emit action_completed event
    actionProcessor.emit('action_completed', {
      actionType: 'deployment',
      result: { shouldEndTurn: true }
    });

    expect(handleSpy).toHaveBeenCalled();
  });
});
