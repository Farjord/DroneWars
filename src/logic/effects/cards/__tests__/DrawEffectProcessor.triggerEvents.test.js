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

  it('should propagate trigger animation events through createResult', () => {
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

    expect(result.animationEvents).toBeDefined();
    expect(result.animationEvents.length).toBeGreaterThanOrEqual(2);
    expect(result.animationEvents.some(e => e.type === 'TRIGGER_FIRED')).toBe(true);
    expect(result.animationEvents.some(e => e.type === 'STATE_SNAPSHOT')).toBe(true);
  });

  it('should return empty animation events when no triggers fire', () => {
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
  });
});
