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
vi.mock('../../effects/MovementEffectProcessor.js', () => ({
  default: class MockMovementEffectProcessor {
    constructor() {
      this.executeSingleMove = mockExecuteSingleMove;
      this.resolveDeferredTriggers = vi.fn().mockImplementation((ctx, states) => ({
        newPlayerStates: JSON.parse(JSON.stringify(states)),
        triggerAnimationEvents: [],
        mineAnimationEvents: [],
        goAgain: false
      }));
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

  it('should not include failed movements in intermediate snapshots (processEffectChain integration)', () => {
    // Effect 0: successful SINGLE_MOVE (d1 from lane1 to lane2)
    // Effect 1: failed SINGLE_MOVE (d2 to lane3 — lane full)
    const successStates = {
      player1: {
        name: 'P1',
        energy: 10, momentum: 0,
        hand: [{ instanceId: 'card-1', id: 'reposition', name: 'Forced Reposition', cost: 0, effects: [] }],
        discardPile: [],
        dronesOnBoard: { lane1: [], lane2: [{ id: 'd1', name: 'Drone1' }], lane3: [] },
      },
      player2: {
        name: 'P2',
        energy: 10, momentum: 0,
        hand: [],
        discardPile: [],
        dronesOnBoard: { lane1: [], lane2: [{ id: 'd2', name: 'EnemyDrone' }], lane3: [] },
      },
    };

    // Effect 0 succeeds: d1 moved to lane2
    mockExecuteSingleMove
      .mockReturnValueOnce({
        newPlayerStates: successStates,
        animationEvents: [{ type: 'DRONE_MOVE' }],
        triggerAnimationEvents: [{ type: 'TRIGGER_FIRED' }],
        preTriggerState: JSON.parse(JSON.stringify(successStates)),
        effectResult: { moved: true },
      })
      // Effect 1 fails: d2 cannot move to lane3 (full)
      .mockReturnValueOnce({
        error: 'Cannot move — lane is full',
        animationEvents: [{ type: 'MOVEMENT_BLOCKED' }],
        effectResult: null,
      });

    const card = {
      id: 'reposition',
      instanceId: 'card-1',
      name: 'Forced Reposition',
      cost: 0,
      effects: [
        { type: 'SINGLE_MOVE', properties: [] },
        { type: 'SINGLE_MOVE', properties: [] },
      ],
    };

    const selections = [
      { target: { id: 'd1' }, lane: 'lane1', destination: 'lane2' },
      { target: { id: 'd2' }, lane: 'lane2', destination: 'lane3' },
    ];

    const fullCtx = {
      playerStates,
      placedSections: { player1: [], player2: [] },
      callbacks: { logCallback: vi.fn(), resolveAttackCallback: vi.fn() },
    };

    const result = processor.processEffectChain(card, selections, 'player1', fullCtx);

    // stateBeforeTriggers should NOT contain d2 in lane3 (the failed move)
    if (result.stateBeforeTriggers) {
      const p2Board = result.stateBeforeTriggers.player2.dronesOnBoard;
      const lane3Ids = (p2Board.lane3 || []).map(d => d.id);
      expect(lane3Ids).not.toContain('d2');
    }

    // actionSteps stateAfter snapshots should also not contain d2 in lane3
    for (const step of (result.actionSteps || [])) {
      if (step.stateAfter) {
        const p2Board = step.stateAfter.player2.dronesOnBoard;
        const lane3Ids = (p2Board.lane3 || []).map(d => d.id);
        expect(lane3Ids).not.toContain('d2');
      }
    }
  });
});
