// ========================================
// COMPOSITE EFFECT PROCESSOR — TESTS
// ========================================
// Verifies that trigger animation events and preTriggerState
// from sub-effects are correctly propagated through the
// COMPOSITE_EFFECT wrapper (latent bug: same pattern as
// RepeatingEffectProcessor had before its fix).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Queue of results returned by EffectRouter.routeEffect() — shift() on each call
let mockRouteEffectQueue = [];

vi.mock('../../../EffectRouter.js', () => ({
  default: vi.fn(function() {
    this.routeEffect = vi.fn(() => mockRouteEffectQueue.shift() ?? {
      newPlayerStates: mockPlayerStates,
      animationEvents: [],
      additionalEffects: [],
      triggerAnimationEvents: [],
      preTriggerState: null
    });
  })
}));

vi.mock('../../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

import CompositeEffectProcessor from '../CompositeEffectProcessor.js';

let mockPlayerStates;

describe('CompositeEffectProcessor — trigger event propagation', () => {
  let processor;
  const baseEffect = {
    type: 'COMPOSITE_EFFECT',
    effects: [{ type: 'DRAW', value: 1 }]
  };
  const baseContext = () => ({
    actingPlayerId: 'player1',
    playerStates: mockPlayerStates,
    placedSections: {},
    callbacks: { logCallback: vi.fn() }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new CompositeEffectProcessor();
    mockRouteEffectQueue = [];

    mockPlayerStates = {
      player1: {
        hand: [],
        deck: [{ id: 'c1', name: 'Card1' }],
        discardPile: [],
        energy: 3,
        shipSections: {},
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      },
      player2: {
        hand: [],
        deck: [],
        discardPile: [],
        energy: 0,
        shipSections: {},
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      }
    };
  });

  it('should forward triggerAnimationEvents from a sub-effect into the result', () => {
    const mockTriggerEvents = [
      { type: 'TRIGGER_FIRED', targetId: 'odin1', abilityName: 'All-Seeing Eye' },
      { type: 'STATE_SNAPSHOT', snapshotPlayerStates: {} },
      { type: 'STAT_BUFF', targetId: 'odin1', stat: 'attack', value: 1 }
    ];

    mockRouteEffectQueue.push({
      newPlayerStates: mockPlayerStates,
      animationEvents: [],
      additionalEffects: [],
      triggerAnimationEvents: mockTriggerEvents,
      preTriggerState: { player1: {}, player2: {} }
    });

    const result = processor.process(baseEffect, baseContext());

    expect(result.triggerAnimationEvents).toHaveLength(3);
    expect(result.triggerAnimationEvents.some(e => e.type === 'TRIGGER_FIRED')).toBe(true);
    expect(result.triggerAnimationEvents.some(e => e.type === 'STAT_BUFF')).toBe(true);
    expect(result.animationEvents?.length || 0).toBe(0);
  });

  it('should forward preTriggerState from the first sub-effect that provides one', () => {
    const expectedPreTriggerState = { player1: { marker: 'before-trigger' }, player2: {} };

    mockRouteEffectQueue.push({
      newPlayerStates: mockPlayerStates,
      animationEvents: [],
      additionalEffects: [],
      triggerAnimationEvents: [{ type: 'TRIGGER_FIRED' }],
      preTriggerState: expectedPreTriggerState
    });

    const result = processor.process(baseEffect, baseContext());

    expect(result.preTriggerState).toBe(expectedPreTriggerState);
  });

  it('should accumulate triggerAnimationEvents from multiple sub-effects', () => {
    const twoSubEffectEffect = {
      type: 'COMPOSITE_EFFECT',
      effects: [{ type: 'DRAW', value: 1 }, { type: 'GAIN_ENERGY', value: 1 }]
    };

    mockRouteEffectQueue.push({
      newPlayerStates: mockPlayerStates,
      animationEvents: [],
      additionalEffects: [],
      triggerAnimationEvents: [
        { type: 'TRIGGER_FIRED', targetId: 'odin1' },
        { type: 'STAT_BUFF', targetId: 'odin1', stat: 'attack', value: 1 }
      ],
      preTriggerState: { player1: {}, player2: {} }
    });

    mockRouteEffectQueue.push({
      newPlayerStates: mockPlayerStates,
      animationEvents: [],
      additionalEffects: [],
      triggerAnimationEvents: [
        { type: 'TRIGGER_FIRED', targetId: 'thor1' },
        { type: 'STAT_BUFF', targetId: 'thor1', stat: 'attack', value: 1 }
      ],
      preTriggerState: null
    });

    const result = processor.process(twoSubEffectEffect, baseContext());

    expect(result.triggerAnimationEvents).toHaveLength(4);
    const targetIds = result.triggerAnimationEvents.map(e => e.targetId).filter(Boolean);
    expect(targetIds).toContain('odin1');
    expect(targetIds).toContain('thor1');
  });

  it('should return empty triggerAnimationEvents when no sub-effects produce triggers', () => {
    mockRouteEffectQueue.push({
      newPlayerStates: mockPlayerStates,
      animationEvents: [],
      additionalEffects: [],
      triggerAnimationEvents: [],
      preTriggerState: null
    });

    const result = processor.process(baseEffect, baseContext());

    expect(result.triggerAnimationEvents?.length || 0).toBe(0);
    expect(result.preTriggerState).toBeFalsy();
  });
});
