/**
 * LaneTargetingProcessor — Lane Capacity Tests
 *
 * Verifies that deployment-type effects (CREATE_TOKENS) exclude full lanes
 * from valid targets, while non-deployment effects (HEAL) do not.
 */

import { describe, it, expect } from 'vitest';
import LaneTargetingProcessor from '../lane/LaneTargetingProcessor.js';
import { MAX_DRONES_PER_LANE } from '../../utils/gameEngineUtils.js';

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
