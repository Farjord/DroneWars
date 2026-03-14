// ========================================
// MARKING CARD EVALUATORS — TESTS
// ========================================
// Tests for MARK_DRONE card AI evaluation (Target Acquisition, Mark Enemy)

import { describe, it, expect } from 'vitest';
import { evaluateMarkDroneCard } from '../markingCards.js';
import { SCORING_WEIGHTS, DEPLOYMENT_BONUSES } from '../../aiConstants.js';

const MARK_VALUE_PER_DRONE = DEPLOYMENT_BONUSES.MARK_ENEMY_VALUE;

const makeDrone = (id, overrides = {}) => ({
  id, name: 'TestDrone', hull: 2, currentShields: 1, attack: 1, speed: 2,
  isMarked: false, isExhausted: false,
  ...overrides
});

const makeCard = (cost = 1, count = 3) => ({
  id: 'TARGET_ACQUISITION',
  cost,
  effects: [{
    type: 'MARK_DRONE',
    scope: 'ALL',
    targeting: { type: 'NONE', affinity: 'ENEMY' },
    targetSelection: { method: 'RANDOM', count },
  }],
});

const makeContext = (enemyDronesByLane, hand = []) => ({
  player1: {
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    hand,
  },
  player2: {
    dronesOnBoard: {
      lane1: enemyDronesByLane.lane1 || [],
      lane2: enemyDronesByLane.lane2 || [],
      lane3: enemyDronesByLane.lane3 || [],
    },
  },
});

describe('evaluateMarkDroneCard', () => {
  it('scores positively proportional to drones that would be marked', () => {
    const context = makeContext({
      lane1: [makeDrone('e1'), makeDrone('e2')],
      lane2: [makeDrone('e3')],
      lane3: [],
    });

    const result = evaluateMarkDroneCard(makeCard(1, 3), null, context);

    // 3 unmarked but only 3 exist, so marks 3 → score = 3 * 15 - 1 * 4 = 41
    const expectedScore = 3 * MARK_VALUE_PER_DRONE - 1 * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    expect(result.score).toBe(expectedScore);
  });

  it('caps marks at available unmarked drones', () => {
    const context = makeContext({
      lane1: [makeDrone('e1')],
      lane2: [],
      lane3: [],
    });

    const result = evaluateMarkDroneCard(makeCard(1, 3), null, context);

    // Only 1 unmarked drone → marks 1
    const expectedScore = 1 * MARK_VALUE_PER_DRONE - 1 * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    expect(result.score).toBe(expectedScore);
  });

  it('returns negative score when no unmarked enemies exist', () => {
    const context = makeContext({
      lane1: [makeDrone('e1', { isMarked: true })],
      lane2: [],
      lane3: [],
    });

    const result = evaluateMarkDroneCard(makeCard(1, 3), null, context);

    expect(result.score).toBeLessThan(0);
  });

  it('returns negative score when no enemies at all', () => {
    const context = makeContext({
      lane1: [],
      lane2: [],
      lane3: [],
    });

    const result = evaluateMarkDroneCard(makeCard(1, 3), null, context);

    expect(result.score).toBeLessThan(0);
  });

  it('skips already-marked drones in count', () => {
    const context = makeContext({
      lane1: [makeDrone('e1', { isMarked: true }), makeDrone('e2')],
      lane2: [makeDrone('e3', { isMarked: true }), makeDrone('e4')],
      lane3: [],
    });

    const result = evaluateMarkDroneCard(makeCard(1, 3), null, context);

    // 2 unmarked → marks 2
    const expectedScore = 2 * MARK_VALUE_PER_DRONE - 1 * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;
    expect(result.score).toBe(expectedScore);
  });

  it('gives synergy bonus when mark-consuming cards are in hand', () => {
    const purgeProtocol = { id: 'PURGE_PROTOCOL', effects: [{ type: 'DESTROY', filter: 'MARKED' }] };
    const contextWithSynergy = makeContext(
      {
        lane1: [makeDrone('e1'), makeDrone('e2')],
        lane2: [makeDrone('e3')],
        lane3: [],
      },
      [purgeProtocol]
    );
    const contextWithout = makeContext({
      lane1: [makeDrone('e1'), makeDrone('e2')],
      lane2: [makeDrone('e3')],
      lane3: [],
    });

    const withSynergy = evaluateMarkDroneCard(makeCard(1, 3), null, contextWithSynergy);
    const withoutSynergy = evaluateMarkDroneCard(makeCard(1, 3), null, contextWithout);

    expect(withSynergy.score).toBeGreaterThan(withoutSynergy.score);
  });

  it('works for single-target Mark Enemy card', () => {
    const markEnemyCard = {
      id: 'MARK_ENEMY',
      cost: 0,
      effects: [{
        type: 'MARK_DRONE',
        targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
      }],
    };
    const context = makeContext({
      lane1: [makeDrone('e1')],
      lane2: [],
      lane3: [],
    });

    const result = evaluateMarkDroneCard(markEnemyCard, { id: 'e1', isMarked: false }, context);

    // Single target, cost 0 → 1 * 15 - 0 = 15
    expect(result.score).toBe(MARK_VALUE_PER_DRONE);
  });
});
