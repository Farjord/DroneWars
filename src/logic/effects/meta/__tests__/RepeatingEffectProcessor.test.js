// ========================================
// REPEATING EFFECT PROCESSOR — TESTS
// ========================================
// Verifies that trigger animation events and preTriggerState
// from sub-effects are correctly propagated through the
// REPEATING_EFFECT wrapper (bug: Desperate Measures dropped
// Odin/Thor trigger animations).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Queue of results returned by EffectRouter.routeEffect() — shift() on each call
let mockRouteEffectQueue = [];

vi.mock('../../../EffectRouter.js', () => ({
  default: vi.fn(function() {
    this.routeEffect = vi.fn(() => mockRouteEffectQueue.shift() ?? mockFallbackResult);
  })
}));

vi.mock('../../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../../statsCalculator.js', () => ({
  getShipStatus: vi.fn(() => 'ok')
}));

vi.mock('../../../combat/LaneControlCalculator.js', () => ({
  LaneControlCalculator: { countLanesControlled: vi.fn(() => 1) }
}));

import RepeatingEffectProcessor from '../RepeatingEffectProcessor.js';

let mockPlayerStates;

const mockFallbackResult = () => ({
  newPlayerStates: mockPlayerStates,
  animationEvents: [],
  additionalEffects: [],
  triggerAnimationEvents: [],
  preTriggerState: null
});

describe('RepeatingEffectProcessor — trigger event propagation', () => {
  let processor;
  const baseEffect = {
    type: 'REPEATING_EFFECT',
    effects: [{ type: 'DRAW', value: 1 }],
    repeatCondition: 'OWN_DAMAGED_SECTIONS' // no damaged sections → repeats once
  };
  const baseContext = () => ({
    actingPlayerId: 'player1',
    playerStates: mockPlayerStates,
    placedSections: {},
    callbacks: { logCallback: vi.fn() }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new RepeatingEffectProcessor();
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
    // Direct animation events are separate
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
      type: 'REPEATING_EFFECT',
      effects: [{ type: 'DRAW', value: 1 }, { type: 'GAIN_ENERGY', value: 1 }],
      repeatCondition: 'OWN_DAMAGED_SECTIONS'
    };

    // First sub-effect (DRAW): Odin trigger fires
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

    // Second sub-effect (GAIN_ENERGY): Thor trigger fires
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

    // All 4 trigger events from both sub-effects are present
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
