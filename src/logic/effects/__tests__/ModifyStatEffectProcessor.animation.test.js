// ========================================
// MODIFY STAT EFFECT PROCESSOR — ANIMATION EVENT TESTS
// ========================================
// Verifies STAT_BUFF/STAT_DEBUFF animation events are emitted
// for attack/speed mods, and NOT emitted for health/shield/zero-value mods.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

import ModifyStatEffectProcessor from '../ModifyStatEffectProcessor.js';

describe('ModifyStatEffectProcessor — animation events', () => {
  let processor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new ModifyStatEffectProcessor();
  });

  const createMockPlayerStates = () => ({
    player1: {
      dronesOnBoard: {
        lane1: [{ id: 'drone-a', name: 'Talon', statMods: [] }],
        lane2: [
          { id: 'drone-b', name: 'Mammoth', statMods: [] },
          { id: 'drone-c', name: 'Talon', statMods: [] }
        ],
        lane3: []
      }
    },
    player2: {
      dronesOnBoard: {
        lane1: [{ id: 'drone-d', name: 'Shrike', statMods: [] }],
        lane2: [],
        lane3: []
      }
    }
  });

  it('emits STAT_BUFF for positive attack mod on single drone', () => {
    const result = processor.process(
      { type: 'MODIFY_STAT', mod: { stat: 'attack', value: 2, type: 'temporary' } },
      {
        actingPlayerId: 'player1',
        playerStates: createMockPlayerStates(),
        target: { id: 'drone-a', owner: 'player1' }
      }
    );

    expect(result.animationEvents).toEqual([{
      type: 'STAT_BUFF',
      targetId: 'drone-a',
      targetPlayer: 'player1',
      targetLane: 'lane1',
      targetType: 'drone',
      stat: 'attack'
    }]);
  });

  it('emits STAT_DEBUFF for negative speed mod on single drone', () => {
    const result = processor.process(
      { type: 'MODIFY_STAT', mod: { stat: 'speed', value: -1, type: 'temporary' } },
      {
        actingPlayerId: 'player1',
        playerStates: createMockPlayerStates(),
        target: { id: 'drone-d', owner: 'player2' }
      }
    );

    expect(result.animationEvents).toEqual([{
      type: 'STAT_DEBUFF',
      targetId: 'drone-d',
      targetPlayer: 'player2',
      targetLane: 'lane1',
      targetType: 'drone',
      stat: 'speed'
    }]);
  });

  it('emits one event per drone for lane-wide attack buff', () => {
    const result = processor.process(
      { type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'temporary' } },
      {
        actingPlayerId: 'player1',
        playerStates: createMockPlayerStates(),
        target: { id: 'lane2', owner: 'player1' }
      }
    );

    expect(result.animationEvents).toHaveLength(2);
    expect(result.animationEvents[0]).toMatchObject({ type: 'STAT_BUFF', targetId: 'drone-b', stat: 'attack' });
    expect(result.animationEvents[1]).toMatchObject({ type: 'STAT_BUFF', targetId: 'drone-c', stat: 'attack' });
  });

  it('does NOT emit events for health mods', () => {
    const result = processor.process(
      { type: 'MODIFY_STAT', mod: { stat: 'health', value: 2, type: 'temporary' } },
      {
        actingPlayerId: 'player1',
        playerStates: createMockPlayerStates(),
        target: { id: 'drone-a', owner: 'player1' }
      }
    );

    expect(result.animationEvents).toEqual([]);
  });

  it('does NOT emit events for shield mods', () => {
    const result = processor.process(
      { type: 'MODIFY_STAT', mod: { stat: 'shield', value: 1, type: 'temporary' } },
      {
        actingPlayerId: 'player1',
        playerStates: createMockPlayerStates(),
        target: { id: 'drone-a', owner: 'player1' }
      }
    );

    expect(result.animationEvents).toEqual([]);
  });

  it('does NOT emit events when value is 0', () => {
    const result = processor.process(
      { type: 'MODIFY_STAT', mod: { stat: 'attack', value: 0, type: 'temporary' } },
      {
        actingPlayerId: 'player1',
        playerStates: createMockPlayerStates(),
        target: { id: 'drone-a', owner: 'player1' }
      }
    );

    expect(result.animationEvents).toEqual([]);
  });
});
