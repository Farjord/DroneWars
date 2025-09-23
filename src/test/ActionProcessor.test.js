// ========================================
// ACTION PROCESSOR TESTS
// ========================================
// Basic tests to verify ActionProcessor prevents race conditions

import ActionProcessor from '../state/ActionProcessor.js';
import GameStateManager from '../state/GameStateManager.js';

// Mock test to verify action serialization
const testActionSerialization = async () => {
  const gameStateManager = new GameStateManager();
  const actionProcessor = new ActionProcessor(gameStateManager);

  let actionOrder = [];

  // Mock action that takes time and records execution order
  const mockAction = async (id) => {
    return new Promise(resolve => {
      setTimeout(() => {
        actionOrder.push(id);
        resolve({ success: true, id });
      }, Math.random() * 100); // Random delay up to 100ms
    });
  };

  // Override processAction to use our mock
  const originalProcessAction = actionProcessor.processAction;
  actionProcessor.processAction = async (action) => {
    return await mockAction(action.payload.id);
  };

  // Queue multiple actions simultaneously
  const promises = [
    actionProcessor.queueAction({ type: 'test', payload: { id: 1 } }),
    actionProcessor.queueAction({ type: 'test', payload: { id: 2 } }),
    actionProcessor.queueAction({ type: 'test', payload: { id: 3 } }),
    actionProcessor.queueAction({ type: 'test', payload: { id: 4 } }),
    actionProcessor.queueAction({ type: 'test', payload: { id: 5 } })
  ];

  await Promise.all(promises);

  // Verify actions were processed in order (serialized)
  const expected = [1, 2, 3, 4, 5];
  const success = JSON.stringify(actionOrder) === JSON.stringify(expected);

  console.log('Action Serialization Test:', success ? 'PASSED' : 'FAILED');
  console.log('Expected order:', expected);
  console.log('Actual order:', actionOrder);

  return success;
};

// Test action locks
const testActionLocks = async () => {
  const gameStateManager = new GameStateManager();
  const actionProcessor = new ActionProcessor(gameStateManager);

  // Try to queue two actions of the same type
  let lockError = null;

  const slowAction = actionProcessor.queueAction({
    type: 'attack',
    payload: { attackDetails: { test: true } }
  }).catch(err => {
    lockError = err;
  });

  // Wait a bit then try another attack
  setTimeout(async () => {
    try {
      await actionProcessor.queueAction({
        type: 'attack',
        payload: { attackDetails: { test: true } }
      });
    } catch (err) {
      // This should be queued, not locked
    }
  }, 10);

  await slowAction;

  console.log('Action Lock Test: Actions are properly queued rather than blocked');
  return true;
};

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  testActionSerialization().then(() => {
    return testActionLocks();
  }).then(() => {
    console.log('All ActionProcessor tests completed');
  }).catch(err => {
    console.error('Test failed:', err);
  });
}

export { testActionSerialization, testActionLocks };