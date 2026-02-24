import { describe, it, expect } from 'vitest';
import { resolveSecondaryTargets } from '../uiTargetingHelpers.js';

const makeContext = (overrides = {}) => ({
  actingPlayerId: 'player1',
  player1: {
    dronesOnBoard: {
      lane1: [
        { id: 'd1', name: 'Scout', speed: 6, attack: 2, hull: 2, isMarked: false, isExhausted: false },
      ],
      lane2: [
        { id: 'd2', name: 'Fighter', speed: 3, attack: 4, hull: 3, isMarked: false, isExhausted: false },
      ],
      lane3: [],
    }
  },
  player2: {
    dronesOnBoard: {
      lane1: [
        { id: 'e1', name: 'EnemyFast', speed: 7, attack: 1, hull: 2, isMarked: false, isExhausted: false },
        { id: 'e2', name: 'EnemySlow', speed: 2, attack: 5, hull: 3, isMarked: true, isExhausted: false },
      ],
      lane2: [
        { id: 'e3', name: 'EnemyMid', speed: 4, attack: 3, hull: 2, isMarked: false, isExhausted: false },
      ],
      lane3: [],
    }
  },
  getEffectiveStats: null,
  ...overrides,
});

describe('resolveSecondaryTargets', () => {
  describe('LANE / ADJACENT_TO_PRIMARY', () => {
    it('returns adjacent lanes for lane1 (only lane2)', () => {
      const primaryResult = { target: { id: 'd1' }, lane: 'lane1', owner: 'player1' };
      const secondaryDef = { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' };

      const targets = resolveSecondaryTargets(primaryResult, secondaryDef, makeContext());

      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe('lane2');
    });

    it('returns adjacent lanes for lane2 (lane1 and lane3)', () => {
      const primaryResult = { target: { id: 'd2' }, lane: 'lane2', owner: 'player1' };
      const secondaryDef = { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' };

      const targets = resolveSecondaryTargets(primaryResult, secondaryDef, makeContext());

      expect(targets).toHaveLength(2);
      expect(targets.map(t => t.id).sort()).toEqual(['lane1', 'lane3']);
    });

    it('returns adjacent lanes for lane3 (only lane2)', () => {
      const primaryResult = { target: { id: 'd1' }, lane: 'lane3', owner: 'player1' };
      const secondaryDef = { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' };

      const targets = resolveSecondaryTargets(primaryResult, secondaryDef, makeContext());

      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe('lane2');
    });
  });

  describe('DRONE / PRIMARY_SOURCE_LANE', () => {
    it('returns enemy drones in the primary targets lane', () => {
      const primaryResult = { target: { id: 'd1', speed: 6 }, lane: 'lane1', owner: 'player1' };
      const secondaryDef = {
        type: 'DRONE', affinity: 'ENEMY', location: 'PRIMARY_SOURCE_LANE',
        restrictions: [],
      };

      const targets = resolveSecondaryTargets(primaryResult, secondaryDef, makeContext());

      expect(targets).toHaveLength(2);
      expect(targets.map(t => t.id).sort()).toEqual(['e1', 'e2']);
    });

    it('applies STAT_COMPARISON with PRIMARY_TARGET reference (speed LT)', () => {
      // Feint: enemy drone with speed < primary target's speed
      const primaryResult = { target: { id: 'd1', speed: 6 }, lane: 'lane1', owner: 'player1' };
      const secondaryDef = {
        type: 'DRONE', affinity: 'ENEMY', location: 'PRIMARY_SOURCE_LANE',
        restrictions: [{
          type: 'STAT_COMPARISON', stat: 'speed', comparison: 'LT',
          reference: 'PRIMARY_TARGET', referenceStat: 'speed',
        }],
      };

      const targets = resolveSecondaryTargets(primaryResult, secondaryDef, makeContext());

      // e2 has speed 2 < 6 (passes), e1 has speed 7 >= 6 (fails)
      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe('e2');
    });

    it('applies STAT_COMPARISON with PRIMARY_TARGET reference (attack GT)', () => {
      // Forced Repositioning: enemy drone with attack > primary target's attack
      const primaryResult = { target: { id: 'd1', attack: 2 }, lane: 'lane1', owner: 'player1' };
      const secondaryDef = {
        type: 'DRONE', affinity: 'ENEMY', location: 'PRIMARY_SOURCE_LANE',
        restrictions: [{
          type: 'STAT_COMPARISON', stat: 'attack', comparison: 'GT',
          reference: 'PRIMARY_TARGET', referenceStat: 'attack',
        }],
      };

      const targets = resolveSecondaryTargets(primaryResult, secondaryDef, makeContext());

      // e2 has attack 5 > 2 (passes), e1 has attack 1 <= 2 (fails)
      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe('e2');
    });

    it('applies string restrictions (MARKED)', () => {
      const primaryResult = { target: { id: 'd1' }, lane: 'lane1', owner: 'player1' };
      const secondaryDef = {
        type: 'DRONE', affinity: 'ENEMY', location: 'PRIMARY_SOURCE_LANE',
        restrictions: ['MARKED'],
      };

      const targets = resolveSecondaryTargets(primaryResult, secondaryDef, makeContext());

      // e2 is marked, e1 is not
      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe('e2');
    });
  });

  describe('edge cases', () => {
    it('returns empty array for unknown targeting type', () => {
      const primaryResult = { target: { id: 'd1' }, lane: 'lane1' };
      const secondaryDef = { type: 'UNKNOWN', location: 'ANYWHERE' };

      const targets = resolveSecondaryTargets(primaryResult, secondaryDef, makeContext());

      expect(targets).toEqual([]);
    });

    it('returns all matching drones when no restrictions', () => {
      const primaryResult = { target: { id: 'd1' }, lane: 'lane1' };
      const secondaryDef = {
        type: 'DRONE', affinity: 'ENEMY', location: 'PRIMARY_SOURCE_LANE',
      };

      const targets = resolveSecondaryTargets(primaryResult, secondaryDef, makeContext());

      expect(targets).toHaveLength(2);
    });
  });
});
