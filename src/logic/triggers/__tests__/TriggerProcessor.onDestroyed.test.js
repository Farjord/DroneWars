// ========================================
// TRIGGER PROCESSOR — ON_DESTROYED TESTS
// ========================================
// Tests for the ON_DESTROYED self-trigger type.
// Covers: fires while drone is on board, TRIGGER_FIRED event emitted,
// actingPlayerId routing for DISCARD, and constant set membership.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../data/droneData.js', () => ({
  default: [
    {
      name: 'BansheeTest',
      attack: 1, hull: 1, shields: 0, speed: 5,
      abilities: [{
        name: 'Disruption Vortex',
        type: 'TRIGGERED',
        trigger: 'ON_DESTROYED',
        effects: [{ type: 'DISCARD', count: 1 }]
      }]
    },
    {
      name: 'NormalDrone',
      attack: 2, hull: 3, shields: 1, speed: 2,
      abilities: []
    }
  ]
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../utils/droneStateUtils.js', () => ({
  onDroneDestroyed: vi.fn((playerState) => playerState)
}));

vi.mock('../../utils/auraManager.js', () => ({
  updateAuras: vi.fn((playerState) => playerState.dronesOnBoard)
}));

vi.mock('../../EffectRouter.js', () => ({
  default: class MockEffectRouter {
    constructor() {
      this.routeEffect = vi.fn().mockReturnValue({
        newPlayerStates: null,
        animationEvents: []
      });
    }
  }
}));

import TriggerProcessor from '../TriggerProcessor.js';
import { TRIGGER_TYPES, SELF_TRIGGER_TYPES } from '../triggerConstants.js';
import { TRIGGER_FIRED } from '../../../config/animationTypes.js';

describe('TriggerProcessor — ON_DESTROYED', () => {
  let processor;
  let basePlayerStates;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new TriggerProcessor();

    basePlayerStates = {
      player1: {
        name: 'Player 1',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [{ id: 'c1', name: 'Card A' }, { id: 'c2', name: 'Card B' }],
        discardPile: []
      },
      player2: {
        name: 'Player 2',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [{ id: 'c3', name: 'Card C' }, { id: 'c4', name: 'Card D' }],
        discardPile: []
      }
    };
  });

  it('ON_DESTROYED is in SELF_TRIGGER_TYPES', () => {
    expect(SELF_TRIGGER_TYPES.has(TRIGGER_TYPES.ON_DESTROYED)).toBe(true);
  });

  it('fires while Banshee is still on the board', () => {
    const banshee = { id: 'banshee-1', name: 'BansheeTest' };
    basePlayerStates.player1.dronesOnBoard.lane2 = [banshee];

    const result = processor.fireTrigger(TRIGGER_TYPES.ON_DESTROYED, {
      lane: 'lane2',
      triggeringDrone: banshee,
      triggeringPlayerId: 'player1',
      actingPlayerId: 'player2',
      playerStates: basePlayerStates,
      placedSections: {},
      logCallback: vi.fn()
    });

    expect(result.triggered).toBe(true);
  });

  it('emits a TRIGGER_FIRED animation event with correct drone info', () => {
    const banshee = { id: 'banshee-1', name: 'BansheeTest' };
    basePlayerStates.player1.dronesOnBoard.lane2 = [banshee];

    const result = processor.fireTrigger(TRIGGER_TYPES.ON_DESTROYED, {
      lane: 'lane2',
      triggeringDrone: banshee,
      triggeringPlayerId: 'player1',
      actingPlayerId: 'player2',
      playerStates: basePlayerStates,
      placedSections: {},
      logCallback: vi.fn()
    });

    const triggerFiredEvent = result.animationEvents.find(e => e.type === TRIGGER_FIRED);
    expect(triggerFiredEvent).toBeDefined();
    expect(triggerFiredEvent.droneName).toBe('BansheeTest');
    expect(triggerFiredEvent.abilityName).toBe('Disruption Vortex');
    expect(triggerFiredEvent.targetId).toBe('banshee-1');
  });

  it('routes DISCARD effect with actingPlayerId set to the Banshee owner (so DISCARD targets opponent)', () => {
    // DiscardEffectProcessor defaults targetPlayer:'opponent' relative to actingPlayerId.
    // If Banshee (player1) triggers, actingPlayerId must be 'player1' so the discard hits player2.
    const banshee = { id: 'banshee-1', name: 'BansheeTest' };
    basePlayerStates.player1.dronesOnBoard.lane2 = [banshee];

    processor.fireTrigger(TRIGGER_TYPES.ON_DESTROYED, {
      lane: 'lane2',
      triggeringDrone: banshee,
      triggeringPlayerId: 'player1',
      actingPlayerId: 'player2',
      playerStates: basePlayerStates,
      placedSections: {},
      logCallback: vi.fn()
    });

    expect(processor.effectRouter.routeEffect).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DISCARD', count: 1 }),
      expect.objectContaining({ actingPlayerId: 'player1' })
    );
  });
});
