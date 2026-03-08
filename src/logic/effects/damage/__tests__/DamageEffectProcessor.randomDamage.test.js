// ========================================
// DAMAGE EFFECT PROCESSOR - RANDOM TARGET SELECTION TESTS
// ========================================
// TDD: Tests for sequential RANDOM damage in processFilteredDamage
// Sequential: pick one, apply damage, remove dead, pick next from survivors

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../gameLogic.js', () => ({
  gameEngine: {
    onDroneDestroyed: vi.fn(() => ({ deployedDroneCounts: {} }))
  }
}));

import DamageEffectProcessor from '../DamageEffectProcessor.js';

const makeDrone = (id, name, hull, shields = 0, attack = 1) => ({
  id, name, hull, currentShields: shields, speed: 3, attack, owner: 'player2', isExhausted: false
});

const makePlayerStates = (lane1Drones = []) => ({
  player1: {
    energy: 10,
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    shipSections: { bridge: { hull: 10, allocatedShields: 5 } },
    deployedDroneCounts: {},
    appliedUpgrades: {}
  },
  player2: {
    energy: 10,
    dronesOnBoard: { lane1: lane1Drones, lane2: [], lane3: [] },
    shipSections: { bridge: { hull: 10, allocatedShields: 5 } },
    deployedDroneCounts: {},
    appliedUpgrades: {}
  }
});

const makeContext = (playerStates, card) => ({
  target: { id: 'lane1', owner: 'player2' },
  actingPlayerId: 'player1',
  playerStates,
  placedSections: { player1: ['bridge'], player2: ['bridge'] },
  callbacks: { logCallback: vi.fn() },
  gameSeed: 42,
  roundNumber: 1,
  card
});

const makeRandomCard = (instanceId = 'scatter_inst_1') => ({
  id: 'SCATTER_SHOT', name: 'Scatter Shot', instanceId,
  targeting: {
    type: 'LANE', affinity: 'ENEMY',
    targetSelection: { method: 'RANDOM', count: 2 }
  }
});

describe('DamageEffectProcessor RANDOM targetSelection', () => {
  let processor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new DamageEffectProcessor();
  });

  it('RANDOM count=2, 3 drones — 2 take damage, 1 untouched', () => {
    const drones = [
      makeDrone('a', 'DroneA', 5, 0),
      makeDrone('b', 'DroneB', 5, 0),
      makeDrone('c', 'DroneC', 5, 0)
    ];
    const states = makePlayerStates(drones);
    const card = makeRandomCard();
    const effect = { type: 'DAMAGE', value: 2 };

    const result = processor.process(effect, makeContext(states, card));

    const lane = result.newPlayerStates.player2.dronesOnBoard.lane1;
    const damaged = lane.filter(d => d.hull < 5);
    const untouched = lane.filter(d => d.hull === 5);

    expect(damaged).toHaveLength(2);
    expect(untouched).toHaveLength(1);
  });

  it('killed drones are removed from lane between sequential picks', () => {
    // All 3 fragile (1hp). Damage=2 kills on hit. Count=2.
    // 2 are picked, killed, removed. 1 survives untouched.
    const drones = [
      makeDrone('a', 'DroneA', 1, 0),
      makeDrone('b', 'DroneB', 1, 0),
      makeDrone('c', 'DroneC', 1, 0)
    ];
    const states = makePlayerStates(drones);
    const card = makeRandomCard();
    const effect = { type: 'DAMAGE', value: 2 };

    const result = processor.process(effect, makeContext(states, card));

    const lane = result.newPlayerStates.player2.dronesOnBoard.lane1;
    // 2 destroyed and removed, 1 survivor untouched
    expect(lane).toHaveLength(1);
    expect(lane[0].hull).toBe(1); // survivor was never hit
  });

  it('RANDOM count=2, only 1 drone — hits once, second fizzles', () => {
    const drones = [makeDrone('a', 'DroneA', 1, 0)];
    const states = makePlayerStates(drones);
    const card = makeRandomCard();
    const effect = { type: 'DAMAGE', value: 2 };

    const result = processor.process(effect, makeContext(states, card));

    const lane = result.newPlayerStates.player2.dronesOnBoard.lane1;
    // Drone destroyed, removed from lane
    expect(lane).toHaveLength(0);
  });

  it('RANDOM is deterministic with same seed', () => {
    const makeFresh = () => {
      const drones = [
        makeDrone('a', 'DroneA', 5, 0),
        makeDrone('b', 'DroneB', 5, 0),
        makeDrone('c', 'DroneC', 5, 0)
      ];
      return makePlayerStates(drones);
    };

    const card = makeRandomCard();
    const effect = { type: 'DAMAGE', value: 2 };

    const result1 = processor.process(effect, makeContext(makeFresh(), card));
    const result2 = processor.process(effect, makeContext(makeFresh(), card));

    const damaged1 = result1.newPlayerStates.player2.dronesOnBoard.lane1
      .filter(d => d.hull < 5).map(d => d.id).sort();
    const damaged2 = result2.newPlayerStates.player2.dronesOnBoard.lane1
      .filter(d => d.hull < 5).map(d => d.id).sort();

    expect(damaged1).toEqual(damaged2);
  });

  it('RANDOM count exceeds pool — each drone hit at most once', () => {
    const drones = [
      makeDrone('a', 'DroneA', 10, 0),
      makeDrone('b', 'DroneB', 10, 0)
    ];
    const states = makePlayerStates(drones);
    const card = {
      ...makeRandomCard(),
      targeting: {
        type: 'LANE', affinity: 'ENEMY',
        targetSelection: { method: 'RANDOM', count: 5 }
      }
    };
    const effect = { type: 'DAMAGE', value: 1 };

    const result = processor.process(effect, makeContext(states, card));

    const lane = result.newPlayerStates.player2.dronesOnBoard.lane1;
    // Each drone should be hit once (damage=1, hull=10→9)
    expect(lane).toHaveLength(2);
    lane.forEach(d => expect(d.hull).toBe(9));
  });
});
