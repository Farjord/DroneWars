// ========================================
// DRAW EFFECT PROCESSOR — TRIGGER EVENT PROPAGATION
// ========================================
// Verifies that animation events from ON_CARD_DRAWN triggers
// are propagated through createResult (bug fix test).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-level mock return value (configured per test)
let mockFireTriggerResult;

vi.mock('../../../triggers/TriggerProcessor.js', () => ({
  default: vi.fn(function() {
    this.fireTrigger = vi.fn(() => mockFireTriggerResult);
  })
}));

import DrawEffectProcessor from '../DrawEffectProcessor.js';
import TriggerProcessor from '../../../triggers/TriggerProcessor.js';

describe('DrawEffectProcessor — trigger event propagation', () => {
  let processor;
  let mockPlayerStates;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new DrawEffectProcessor();

    mockPlayerStates = {
      player1: {
        name: 'Player 1',
        deck: [{ id: 'c1', name: 'Card1' }, { id: 'c2', name: 'Card2' }],
        hand: [],
        discardPile: [],
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      },
      player2: {
        name: 'Player 2',
        deck: [],
        hand: [],
        discardPile: [],
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      }
    };

    // Default: no triggers fire
    mockFireTriggerResult = {
      triggered: false,
      newPlayerStates: mockPlayerStates,
      animationEvents: [],
      statModsApplied: false,
      goAgain: false
    };
  });

  it('should return trigger animation events separately from direct animation events', () => {
    const mockTriggerEvents = [
      { type: 'TRIGGER_FIRED', targetId: 'drone1', abilityName: 'Test', timestamp: 1 },
      { type: 'STATE_SNAPSHOT', snapshotPlayerStates: {}, timestamp: 2 }
    ];

    mockFireTriggerResult = {
      triggered: true,
      newPlayerStates: mockPlayerStates,
      animationEvents: mockTriggerEvents,
      statModsApplied: false,
      goAgain: false
    };

    const effect = { type: 'DRAW', value: 1 };
    const context = {
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates,
      placedSections: {},
      callbacks: { logCallback: vi.fn() }
    };

    const result = processor.process(effect, context);

    // Trigger events now returned in triggerAnimationEvents (not animationEvents)
    expect(result.triggerAnimationEvents).toBeDefined();
    expect(result.triggerAnimationEvents.length).toBeGreaterThanOrEqual(2);
    expect(result.triggerAnimationEvents.some(e => e.type === 'TRIGGER_FIRED')).toBe(true);
    expect(result.triggerAnimationEvents.some(e => e.type === 'STATE_SNAPSHOT')).toBe(true);
    // Direct animation events should be empty (no direct visual effects from DRAW)
    expect(result.animationEvents?.length || 0).toBe(0);
    // preTriggerState should be captured
    expect(result.preTriggerState).toBeDefined();
  });

  it('should return empty trigger events when no triggers fire', () => {
    // mockFireTriggerResult already set to triggered: false in beforeEach

    const effect = { type: 'DRAW', value: 1 };
    const context = {
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates,
      placedSections: {},
      callbacks: { logCallback: vi.fn() }
    };

    const result = processor.process(effect, context);

    expect(result.animationEvents?.length || 0).toBe(0);
    expect(result.triggerAnimationEvents?.length || 0).toBe(0);
  });

  it('should forward pairSet and chainDepth from context to fireTrigger', () => {
    mockFireTriggerResult = {
      triggered: true,
      newPlayerStates: mockPlayerStates,
      animationEvents: [],
      statModsApplied: false,
      goAgain: false
    };

    const pairSet = new Set(['reactor1:source1']);
    const cascadeSource = { id: 'src1', name: 'SourceDrone' };

    const effect = { type: 'DRAW', value: 1 };
    const context = {
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates,
      placedSections: {},
      callbacks: { logCallback: vi.fn() },
      pairSet,
      chainDepth: 3,
      triggeringDrone: cascadeSource
    };

    processor.process(effect, context);

    // Get the fireTrigger mock from the constructed TriggerProcessor instance
    const triggerProcessorInstance = TriggerProcessor.mock.results[0].value;
    const fireTriggerCall = triggerProcessorInstance.fireTrigger.mock.calls[0];
    const triggerContext = fireTriggerCall[1];

    expect(triggerContext.pairSet).toBe(pairSet);
    expect(triggerContext.chainDepth).toBe(3);
    expect(triggerContext.triggeringDrone).toBe(cascadeSource);
  });

  it('should default pairSet and chainDepth when not in context', () => {
    mockFireTriggerResult = {
      triggered: true,
      newPlayerStates: mockPlayerStates,
      animationEvents: [],
      statModsApplied: false,
      goAgain: false
    };

    const effect = { type: 'DRAW', value: 1 };
    const context = {
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates,
      placedSections: {},
      callbacks: { logCallback: vi.fn() }
    };

    processor.process(effect, context);

    const triggerProcessorInstance = TriggerProcessor.mock.results[0].value;
    const fireTriggerCall = triggerProcessorInstance.fireTrigger.mock.calls[0];
    const triggerContext = fireTriggerCall[1];

    expect(triggerContext.pairSet).toBeInstanceOf(Set);
    expect(triggerContext.pairSet.size).toBe(0);
    expect(triggerContext.chainDepth).toBe(0);
    expect(triggerContext.triggeringDrone).toBeNull();
  });
});
