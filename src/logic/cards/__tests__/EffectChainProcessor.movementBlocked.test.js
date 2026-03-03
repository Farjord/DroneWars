/**
 * EffectChainProcessor — MOVEMENT_BLOCKED pass-through test
 * Verifies that animationEvents from movement error results are passed through
 * instead of being replaced with [].
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock TriggerProcessor
vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = vi.fn().mockReturnValue({
        triggered: false, newPlayerStates: null, animationEvents: [], goAgain: false
      });
    }
  }
}));
vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_CARD_PLAY: 'ON_CARD_PLAY' }
}));

// Mock EffectRouter (not used in movement path, but imported)
vi.mock('../../EffectRouter.js', () => ({
  default: class MockEffectRouter {}
}));

// Mock MovementEffectProcessor to return controlled results
const mockExecuteSingleMove = vi.fn();
const mockExecuteMultiMove = vi.fn();
vi.mock('../../effects/MovementEffectProcessor.js', () => ({
  default: class MockMovementEffectProcessor {
    constructor() {
      this.executeSingleMove = mockExecuteSingleMove;
      this.executeMultiMove = mockExecuteMultiMove;
    }
  }
}));

import EffectChainProcessor from '../EffectChainProcessor.js';

describe('EffectChainProcessor - movement blocked pass-through', () => {
  let processor;
  let playerStates;
  let ctx;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new EffectChainProcessor();

    playerStates = {
      player1: {
        name: 'P1',
        dronesOnBoard: { lane1: [{ id: 'd1', name: 'Drone1' }], lane2: [], lane3: [] },
      },
      player2: {
        name: 'P2',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      },
    };

    ctx = {
      placedSections: { player1: [], player2: [] },
      callbacks: { logCallback: vi.fn(), resolveAttackCallback: vi.fn() },
    };
  });

  it('should pass through animationEvents from SINGLE_MOVE error result', () => {
    const blockedEvents = [{ type: 'MOVEMENT_BLOCKED', droneName: 'Drone1', targetId: 'd1' }];
    mockExecuteSingleMove.mockReturnValue({
      error: 'Cannot move — lane is full',
      animationEvents: blockedEvents
    });

    const effectData = { type: 'SINGLE_MOVE', properties: [] };
    const selection = { target: { id: 'd1' }, lane: 'lane1', destination: 'lane2' };

    const result = processor.executeChainMovement(effectData, selection, 'player1', playerStates, ctx);

    expect(result.animationEvents).toEqual(blockedEvents);
  });

  it('should pass through animationEvents from MULTI_MOVE error result', () => {
    const blockedEvents = [
      { type: 'MOVEMENT_BLOCKED', droneName: 'Drone1', targetId: 'd1' },
      { type: 'MOVEMENT_BLOCKED', droneName: 'Drone2', targetId: 'd2' },
    ];
    mockExecuteMultiMove.mockReturnValue({
      error: 'Cannot move — lane is full',
      animationEvents: blockedEvents
    });

    const effectData = { type: 'MULTI_MOVE', count: 2, properties: [] };
    const selection = { target: [{ id: 'd1' }, { id: 'd2' }], lane: 'lane1', destination: 'lane2' };

    const result = processor.executeChainMovement(effectData, selection, 'player1', playerStates, ctx);

    expect(result.animationEvents).toEqual(blockedEvents);
  });
});
