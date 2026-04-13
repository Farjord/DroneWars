/**
 * LaneTargetingProcessor — Lane Capacity Tests
 *
 * Verifies that deployment-type effects (CREATE_TOKENS) exclude full lanes
 * from valid targets, while non-deployment effects (HEAL) do not.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock tech collection so maxPerLane tests are independent of production data values.
// 'Stubbed Mine' maxPerLane:1 lets us test per-tech exclusion without relying on real data.
vi.mock('../../../data/techData.js', () => ({
  default: [
    { name: 'Stubbed Mine', maxPerLane: 1 },
  ]
}));

import LaneTargetingProcessor from '../lane/LaneTargetingProcessor.js';
import { MAX_DRONES_PER_LANE, MAX_TECH_PER_LANE } from '../../utils/gameEngineUtils.js';

const processor = new LaneTargetingProcessor();

const makeDrones = (count) =>
  Array.from({ length: count }, (_, i) => ({ id: `d${i}`, name: 'Dart' }));

const makePlayerState = (laneDrones = {}) => ({
  dronesOnBoard: {
    lane1: laneDrones.lane1 || [],
    lane2: laneDrones.lane2 || [],
    lane3: laneDrones.lane3 || [],
  },
});

const makeContext = (effectType, player1Overrides = {}, player2Overrides = {}) => ({
  actingPlayerId: 'player1',
  player1: makePlayerState(player1Overrides),
  player2: makePlayerState(player2Overrides),
  definition: {
    targeting: { type: 'LANE', affinity: 'FRIENDLY' },
    effects: [{ type: effectType }],
  },
});

describe('LaneTargetingProcessor — lane capacity filtering', () => {
  describe('CREATE_TOKENS effect', () => {
    it('excludes a full friendly lane from valid targets', () => {
      const ctx = makeContext('CREATE_TOKENS', {
        lane1: makeDrones(MAX_DRONES_PER_LANE),
      });

      const targets = processor.process(ctx);

      const ids = targets.map(t => t.id);
      expect(ids).not.toContain('lane1');
      expect(ids).toContain('lane2');
      expect(ids).toContain('lane3');
    });

    it('returns all three lanes when none are full', () => {
      const ctx = makeContext('CREATE_TOKENS', {
        lane1: makeDrones(2),
        lane2: makeDrones(1),
        lane3: [],
      });

      const targets = processor.process(ctx);

      expect(targets.map(t => t.id).sort()).toEqual(['lane1', 'lane2', 'lane3']);
    });

    it('returns no lanes when all are full', () => {
      const full = makeDrones(MAX_DRONES_PER_LANE);
      const ctx = makeContext('CREATE_TOKENS', {
        lane1: full,
        lane2: full,
        lane3: full,
      });

      const targets = processor.process(ctx);

      expect(targets).toHaveLength(0);
    });
  });

  describe('HEAL effect (non-deployment)', () => {
    it('returns all lanes even when one is full — effects array shape', () => {
      const ctx = makeContext('HEAL', {
        lane1: makeDrones(MAX_DRONES_PER_LANE),
      });

      const targets = processor.process(ctx);

      expect(targets.map(t => t.id).sort()).toEqual(['lane1', 'lane2', 'lane3']);
    });

    it('returns all lanes even when one is full — singular effect shape (drone ability)', () => {
      // Drone ACTIVE abilities use `effect` (singular), not `effects[]`
      const ctx = {
        actingPlayerId: 'player1',
        player1: makePlayerState({ lane1: makeDrones(MAX_DRONES_PER_LANE) }),
        player2: makePlayerState(),
        definition: {
          targeting: { type: 'LANE', affinity: 'FRIENDLY' },
          effect: { type: 'HEAL', value: 1 },   // singular, no effects[]
        },
      };

      const targets = processor.process(ctx);

      expect(targets.map(t => t.id).sort()).toEqual(['lane1', 'lane2', 'lane3']);
    });
  });

  describe('ANY affinity with CREATE_TOKENS', () => {
    it('excludes the full lane from both player targets', () => {
      // player1 (acting) and player2 both have lane1 full
      const ctx = {
        actingPlayerId: 'player1',
        player1: makePlayerState({ lane1: makeDrones(MAX_DRONES_PER_LANE) }),
        player2: makePlayerState({ lane1: makeDrones(MAX_DRONES_PER_LANE) }),
        definition: {
          targeting: { type: 'LANE', affinity: 'ANY' },
          effects: [{ type: 'CREATE_TOKENS' }],
        },
      };

      const targets = processor.process(ctx);

      const ids = targets.map(t => t.id);
      expect(ids.filter(id => id === 'lane1')).toHaveLength(0);
      expect(ids.filter(id => id === 'lane2')).toHaveLength(2); // one per player
      expect(ids.filter(id => id === 'lane3')).toHaveLength(2);
    });
  });

  describe('missing player state (graceful fallback)', () => {
    it('returns all lanes when player states are absent', () => {
      const ctx = {
        actingPlayerId: 'player1',
        // no player1 / player2
        definition: {
          targeting: { type: 'LANE', affinity: 'FRIENDLY' },
          effects: [{ type: 'CREATE_TOKENS' }],
        },
      };

      const targets = processor.process(ctx);

      expect(targets.map(t => t.id).sort()).toEqual(['lane1', 'lane2', 'lane3']);
    });
  });
});

// ─── CREATE_TECH targeting ───────────────────────────────────────────────────

const makeTechPlayerState = (techSlots = {}) => ({
  dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
  techSlots: { lane1: [], lane2: [], lane3: [], ...techSlots },
});

const makeTechContext = (tokenName, player1Overrides = {}) => ({
  actingPlayerId: 'player1',
  player1: makeTechPlayerState(player1Overrides),
  player2: makeTechPlayerState(),
  definition: {
    targeting: { type: 'LANE', affinity: 'FRIENDLY' },
    effects: [{ type: 'CREATE_TECH', tokenName }],
  },
});

// Uses mocked tech collection: 'Stubbed Mine' has maxPerLane:1
describe('LaneTargetingProcessor — CREATE_TECH filtering', () => {
  it('returns all three lanes when no tech is placed yet', () => {
    const ctx = makeTechContext('Stubbed Mine');
    const targets = processor.process(ctx);
    expect(targets.map(t => t.id).sort()).toEqual(['lane1', 'lane2', 'lane3']);
  });

  it('excludes a lane that already has the same tech at maxPerLane', () => {
    const ctx = makeTechContext('Stubbed Mine', {
      lane1: [{ id: 't1', name: 'Stubbed Mine', isTech: true }],
    });
    const targets = processor.process(ctx);
    const ids = targets.map(t => t.id);
    expect(ids).not.toContain('lane1');
    expect(ids).toContain('lane2');
    expect(ids).toContain('lane3');
  });

  it('still includes a lane that has a different tech', () => {
    const ctx = makeTechContext('Stubbed Mine', {
      lane1: [{ id: 't1', name: 'Other Tech', isTech: true }],
    });
    const targets = processor.process(ctx);
    expect(targets.map(t => t.id)).toContain('lane1');
  });

  it('excludes a lane whose tech slot is at MAX_TECH_PER_LANE regardless of tech type', () => {
    const full = Array.from({ length: MAX_TECH_PER_LANE }, (_, i) => ({
      id: `t${i}`, name: 'Other Tech', isTech: true,
    }));
    const ctx = makeTechContext('Stubbed Mine', { lane2: full });
    const targets = processor.process(ctx);
    expect(targets.map(t => t.id)).not.toContain('lane2');
  });

  it('returns no lanes when all are blocked by the same tech', () => {
    const mine = [{ id: 't1', name: 'Stubbed Mine', isTech: true }];
    const ctx = makeTechContext('Stubbed Mine', {
      lane1: mine,
      lane2: mine,
      lane3: mine,
    });
    const targets = processor.process(ctx);
    expect(targets).toHaveLength(0);
  });

  it('returns all lanes when player state is absent (graceful fallback)', () => {
    const ctx = {
      actingPlayerId: 'player1',
      definition: {
        targeting: { type: 'LANE', affinity: 'FRIENDLY' },
        effects: [{ type: 'CREATE_TECH', tokenName: 'Stubbed Mine' }],
      },
    };
    const targets = processor.process(ctx);
    expect(targets.map(t => t.id).sort()).toEqual(['lane1', 'lane2', 'lane3']);
  });
});
