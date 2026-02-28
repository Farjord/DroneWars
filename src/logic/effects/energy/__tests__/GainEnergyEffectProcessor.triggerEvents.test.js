// ========================================
// GAIN ENERGY EFFECT PROCESSOR — TRIGGER EVENT PROPAGATION
// ========================================
// Verifies that animation events from ON_ENERGY_GAINED triggers
// are propagated through createResult (bug fix test).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-level mock return value (configured per test)
let mockFireTriggerResult;

vi.mock('../../../triggers/TriggerProcessor.js', () => ({
  default: vi.fn(function() {
    this.fireTrigger = vi.fn(() => mockFireTriggerResult);
  })
}));

vi.mock('../../../statsCalculator.js', () => ({
  calculateEffectiveShipStats: vi.fn().mockReturnValue({
    totals: { maxEnergy: 20 }
  })
}));

import GainEnergyEffectProcessor from '../GainEnergyEffectProcessor.js';

describe('GainEnergyEffectProcessor — trigger event propagation', () => {
  let processor;
  let mockPlayerStates;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new GainEnergyEffectProcessor();

    mockPlayerStates = {
      player1: {
        name: 'Player 1',
        energy: 5,
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      },
      player2: {
        name: 'Player 2',
        energy: 5,
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
      { type: 'STATE_SNAPSHOT', snapshotPlayerStates: {}, timestamp: 1 },
      { type: 'TRIGGER_FIRED', targetId: 'drone1', abilityName: 'Test', timestamp: 2 }
    ];

    mockFireTriggerResult = {
      triggered: true,
      newPlayerStates: mockPlayerStates,
      animationEvents: mockTriggerEvents,
      statModsApplied: false,
      goAgain: false
    };

    const effect = { type: 'ENERGY', value: 3 };
    const context = {
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates,
      placedSections: { player1: [], player2: [] },
      callbacks: { logCallback: vi.fn() }
    };

    const result = processor.process(effect, context);

    // Trigger events now returned in triggerAnimationEvents (not animationEvents)
    expect(result.triggerAnimationEvents).toBeDefined();
    expect(result.triggerAnimationEvents.length).toBeGreaterThanOrEqual(2);
    expect(result.triggerAnimationEvents.some(e => e.type === 'TRIGGER_FIRED')).toBe(true);
    expect(result.triggerAnimationEvents.some(e => e.type === 'STATE_SNAPSHOT')).toBe(true);
    // Direct animation events should be empty (no direct visual effects from ENERGY)
    expect(result.animationEvents?.length || 0).toBe(0);
    // preTriggerState should be captured
    expect(result.preTriggerState).toBeDefined();
  });

  it('should return empty trigger events when no triggers fire', () => {
    const effect = { type: 'ENERGY', value: 3 };
    const context = {
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates,
      placedSections: { player1: [], player2: [] },
      callbacks: { logCallback: vi.fn() }
    };

    const result = processor.process(effect, context);

    expect(result.animationEvents?.length || 0).toBe(0);
    expect(result.triggerAnimationEvents?.length || 0).toBe(0);
  });
});
