// ========================================
// MARKING EFFECT PROCESSOR — MARK ALL RANDOM
// ========================================
// TDD: Tests for Target Acquisition's MARK_DRONE + scope: ALL + targetSelection pipeline.
// Verifies that processMarkAllRandom gathers unmarked enemies across all lanes
// and marks up to N random ones using seeded RNG.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../utils/debugLogger.js', () => ({ debugLog: vi.fn() }));

import MarkingEffectProcessor from '../MarkingEffectProcessor.js';

const makeDrone = (id, overrides = {}) => ({
  id, name: 'TestDrone', hull: 2, currentShields: 1, attack: 1, speed: 2,
  isMarked: false, isExhausted: false,
  ...overrides
});

const makePlayerStates = (enemyDronesByLane) => ({
  player1: {
    dronesOnBoard: {
      lane1: [],
      lane2: [],
      lane3: []
    }
  },
  player2: {
    dronesOnBoard: {
      lane1: enemyDronesByLane.lane1 || [],
      lane2: enemyDronesByLane.lane2 || [],
      lane3: enemyDronesByLane.lane3 || []
    }
  }
});

const makeEffect = (count = 3) => ({
  type: 'MARK_DRONE',
  scope: 'ALL',
  targeting: { type: 'NONE', affinity: 'ENEMY' },
  targetSelection: { method: 'RANDOM', count },
});

const makeContext = (playerStates, overrides = {}) => ({
  actingPlayerId: 'player1',
  playerStates,
  gameSeed: 42,
  roundNumber: 1,
  target: null,
  card: { instanceId: 'target-acq-1' },
  ...overrides
});

describe('MarkingEffectProcessor — processMarkAllRandom (scope: ALL)', () => {
  let processor;

  beforeEach(() => {
    processor = new MarkingEffectProcessor();
  });

  it('marks exactly 3 random unmarked enemy drones across all lanes', () => {
    const playerStates = makePlayerStates({
      lane1: [makeDrone('e1'), makeDrone('e2')],
      lane2: [makeDrone('e3')],
      lane3: [makeDrone('e4'), makeDrone('e5')]
    });

    const result = processor.process(makeEffect(3), makeContext(playerStates));

    const allEnemyDrones = [
      ...result.newPlayerStates.player2.dronesOnBoard.lane1,
      ...result.newPlayerStates.player2.dronesOnBoard.lane2,
      ...result.newPlayerStates.player2.dronesOnBoard.lane3
    ];
    const markedDrones = allEnemyDrones.filter(d => d.isMarked);
    expect(markedDrones).toHaveLength(3);
  });

  it('marks fewer when fewer unmarked enemies exist', () => {
    const playerStates = makePlayerStates({
      lane1: [makeDrone('e1')],
      lane2: [makeDrone('e2')],
      lane3: []
    });

    const result = processor.process(makeEffect(3), makeContext(playerStates));

    const allEnemyDrones = [
      ...result.newPlayerStates.player2.dronesOnBoard.lane1,
      ...result.newPlayerStates.player2.dronesOnBoard.lane2,
    ];
    const markedDrones = allEnemyDrones.filter(d => d.isMarked);
    expect(markedDrones).toHaveLength(2);
  });

  it('no-op when 0 unmarked enemies exist (all already marked)', () => {
    const playerStates = makePlayerStates({
      lane1: [makeDrone('e1', { isMarked: true })],
      lane2: [makeDrone('e2', { isMarked: true })],
      lane3: []
    });

    const result = processor.process(makeEffect(3), makeContext(playerStates));

    const allEnemyDrones = [
      ...result.newPlayerStates.player2.dronesOnBoard.lane1,
      ...result.newPlayerStates.player2.dronesOnBoard.lane2,
    ];
    const markedDrones = allEnemyDrones.filter(d => d.isMarked);
    // Both were already marked, no new marks
    expect(markedDrones).toHaveLength(2);
  });

  it('no-op when no enemy drones exist', () => {
    const playerStates = makePlayerStates({
      lane1: [],
      lane2: [],
      lane3: []
    });

    const result = processor.process(makeEffect(3), makeContext(playerStates));

    const allEnemyDrones = [
      ...result.newPlayerStates.player2.dronesOnBoard.lane1,
      ...result.newPlayerStates.player2.dronesOnBoard.lane2,
      ...result.newPlayerStates.player2.dronesOnBoard.lane3
    ];
    expect(allEnemyDrones).toHaveLength(0);
  });

  it('skips already-marked drones and only marks unmarked ones', () => {
    const playerStates = makePlayerStates({
      lane1: [makeDrone('e1', { isMarked: true }), makeDrone('e2')],
      lane2: [makeDrone('e3', { isMarked: true }), makeDrone('e4')],
      lane3: [makeDrone('e5')]
    });

    const result = processor.process(makeEffect(3), makeContext(playerStates));

    const allEnemyDrones = [
      ...result.newPlayerStates.player2.dronesOnBoard.lane1,
      ...result.newPlayerStates.player2.dronesOnBoard.lane2,
      ...result.newPlayerStates.player2.dronesOnBoard.lane3
    ];
    // 2 were already marked + 3 newly marked = 5 total
    const markedDrones = allEnemyDrones.filter(d => d.isMarked);
    expect(markedDrones).toHaveLength(5);
    // The pre-marked ones must still be marked
    expect(allEnemyDrones.find(d => d.id === 'e1').isMarked).toBe(true);
    expect(allEnemyDrones.find(d => d.id === 'e3').isMarked).toBe(true);
  });

  it('is deterministic with same seed', () => {
    const playerStates = makePlayerStates({
      lane1: [makeDrone('e1'), makeDrone('e2')],
      lane2: [makeDrone('e3'), makeDrone('e4')],
      lane3: [makeDrone('e5'), makeDrone('e6')]
    });

    const result1 = processor.process(makeEffect(3), makeContext(playerStates));
    const result2 = processor.process(makeEffect(3), makeContext(playerStates));

    const getMarkedIds = (states) => [
      ...states.player2.dronesOnBoard.lane1,
      ...states.player2.dronesOnBoard.lane2,
      ...states.player2.dronesOnBoard.lane3
    ].filter(d => d.isMarked).map(d => d.id).sort();

    expect(getMarkedIds(result1.newPlayerStates)).toEqual(getMarkedIds(result2.newPlayerStates));
  });
});
