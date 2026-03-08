// ========================================
// DESTROY EFFECT PROCESSOR - RANDOM TARGET SELECTION TESTS
// ========================================
// TDD: Tests for sequential RANDOM destroy in processFilteredDestroy
// Sequential: pick one, destroy, remove from pool, pick next from survivors

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../gameLogic.js', () => ({
  gameEngine: {
    onDroneDestroyed: vi.fn(() => ({ deployedDroneCounts: {} }))
  }
}));

import DestroyEffectProcessor from '../DestroyEffectProcessor.js';

const makeDrone = (id, name, attack = 2) => ({
  id, name, hull: 3, currentShields: 1, speed: 3, attack, owner: 'player2', isExhausted: false
});

const makePlayerStates = (lane1Drones = []) => ({
  player1: {
    energy: 10,
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    shipSections: {},
    deployedDroneCounts: {},
    appliedUpgrades: {}
  },
  player2: {
    energy: 10,
    dronesOnBoard: { lane1: lane1Drones, lane2: [], lane3: [] },
    shipSections: {},
    deployedDroneCounts: {},
    appliedUpgrades: {}
  }
});

const makeContext = (playerStates, overrides = {}) => ({
  target: { id: 'lane1', owner: 'player2' },
  actingPlayerId: 'player1',
  playerStates,
  placedSections: { player1: [], player2: [] },
  gameSeed: 42,
  roundNumber: 1,
  ...overrides
});

describe('DestroyEffectProcessor RANDOM targetSelection', () => {
  let processor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new DestroyEffectProcessor();
  });

  it('RANDOM count=2, 3 drones — exactly 2 destroyed', () => {
    const drones = [makeDrone('a', 'DroneA'), makeDrone('b', 'DroneB'), makeDrone('c', 'DroneC')];
    const states = makePlayerStates(drones);
    const effect = {
      type: 'DESTROY',
      targeting: {
        type: 'LANE', affinity: 'ENEMY',
        targetSelection: { method: 'RANDOM', count: 2 }
      }
    };

    const result = processor.process(effect, makeContext(states));

    const lane = result.newPlayerStates.player2.dronesOnBoard.lane1;
    expect(lane).toHaveLength(1);
  });

  it('RANDOM count=2, only 1 drone — 1 destroyed, second fizzles', () => {
    const drones = [makeDrone('a', 'DroneA')];
    const states = makePlayerStates(drones);
    const effect = {
      type: 'DESTROY',
      targeting: {
        type: 'LANE', affinity: 'ENEMY',
        targetSelection: { method: 'RANDOM', count: 2 }
      }
    };

    const result = processor.process(effect, makeContext(states));

    const lane = result.newPlayerStates.player2.dronesOnBoard.lane1;
    expect(lane).toHaveLength(0);
  });

  it('RANDOM is deterministic with same seed', () => {
    const makeFresh = () => {
      const drones = [makeDrone('a', 'DroneA'), makeDrone('b', 'DroneB'), makeDrone('c', 'DroneC')];
      return makePlayerStates(drones);
    };

    const effect = {
      type: 'DESTROY',
      targeting: {
        type: 'LANE', affinity: 'ENEMY',
        targetSelection: { method: 'RANDOM', count: 2 }
      }
    };

    const result1 = processor.process(effect, makeContext(makeFresh()));
    const result2 = processor.process(effect, makeContext(makeFresh()));

    const surviving1 = result1.newPlayerStates.player2.dronesOnBoard.lane1.map(d => d.id);
    const surviving2 = result2.newPlayerStates.player2.dronesOnBoard.lane1.map(d => d.id);

    expect(surviving1).toEqual(surviving2);
  });
});
