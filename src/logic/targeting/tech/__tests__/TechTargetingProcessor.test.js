// ========================================
// TECH TARGETING PROCESSOR TESTS
// ========================================
// Tests for TECH targeting type — iterates techSlots by affinity and location

import { describe, it, expect, beforeEach } from 'vitest';
import TechTargetingProcessor from '../TechTargetingProcessor.js';

const makeTech = (id, name = 'Proximity Mine') => ({
  id, name, hull: 1, isTech: true
});

const makeContext = (overrides = {}) => ({
  actingPlayerId: 'player1',
  player1: {
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    techSlots: { lane1: [], lane2: [], lane3: [] }
  },
  player2: {
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    techSlots: { lane1: [], lane2: [], lane3: [] }
  },
  definition: {
    name: 'System Purge',
    cost: 2,
    targeting: { type: 'TECH', affinity: 'ANY', location: 'ANY_LANE' }
  },
  source: null,
  ...overrides
});

describe('TechTargetingProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new TechTargetingProcessor();
  });

  it('returns empty array when no tech slots exist', () => {
    const context = makeContext();
    expect(processor.process(context)).toEqual([]);
  });

  it('ENEMY affinity returns only opponent tech', () => {
    const context = makeContext({
      player1: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        techSlots: { lane1: [makeTech('t_friendly')], lane2: [], lane3: [] }
      },
      player2: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        techSlots: { lane1: [makeTech('t_enemy')], lane2: [], lane3: [] }
      },
      definition: {
        name: 'System Purge',
        cost: 2,
        targeting: { type: 'TECH', affinity: 'ENEMY', location: 'ANY_LANE' }
      }
    });

    const targets = processor.process(context);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('t_enemy');
    expect(targets[0].owner).toBe('player2');
  });

  it('FRIENDLY affinity returns only acting player tech', () => {
    const context = makeContext({
      player1: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        techSlots: { lane1: [makeTech('t_friendly')], lane2: [], lane3: [] }
      },
      player2: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        techSlots: { lane1: [makeTech('t_enemy')], lane2: [], lane3: [] }
      },
      definition: {
        name: 'System Purge',
        cost: 2,
        targeting: { type: 'TECH', affinity: 'FRIENDLY', location: 'ANY_LANE' }
      }
    });

    const targets = processor.process(context);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('t_friendly');
    expect(targets[0].owner).toBe('player1');
  });

  it('ANY affinity returns tech from both players', () => {
    const context = makeContext({
      player1: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        techSlots: { lane1: [makeTech('t1')], lane2: [], lane3: [] }
      },
      player2: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        techSlots: { lane1: [], lane2: [makeTech('t2')], lane3: [] }
      }
    });

    const targets = processor.process(context);
    expect(targets).toHaveLength(2);
    const ids = targets.map(t => t.id);
    expect(ids).toContain('t1');
    expect(ids).toContain('t2');
  });

  it('SAME_LANE filters to source drone lane only', () => {
    const context = makeContext({
      player1: {
        dronesOnBoard: { lane1: [{ id: 'src_drone' }], lane2: [], lane3: [] },
        techSlots: { lane1: [], lane2: [], lane3: [] }
      },
      player2: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        techSlots: {
          lane1: [makeTech('t_same')],
          lane2: [makeTech('t_other')],
          lane3: []
        }
      },
      definition: {
        name: 'Ability',
        targeting: { type: 'TECH', affinity: 'ENEMY', location: 'SAME_LANE' }
      },
      source: { id: 'src_drone' }
    });

    const targets = processor.process(context);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('t_same');
    expect(targets[0].lane).toBe('lane1');
  });

  it('returns tech with correct shape including lane and owner', () => {
    const context = makeContext({
      player2: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        techSlots: { lane1: [], lane2: [makeTech('t1', 'Jammer')], lane3: [] }
      },
      definition: {
        name: 'System Purge',
        cost: 2,
        targeting: { type: 'TECH', affinity: 'ENEMY', location: 'ANY_LANE' }
      }
    });

    const [target] = processor.process(context);
    expect(target).toMatchObject({
      id: 't1',
      name: 'Jammer',
      hull: 1,
      isTech: true,
      lane: 'lane2',
      owner: 'player2'
    });
  });

  it('returns all tech in same lane', () => {
    const context = makeContext({
      player2: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        techSlots: {
          lane1: [makeTech('t1'), makeTech('t2', 'Jammer')],
          lane2: [],
          lane3: []
        }
      },
      definition: {
        name: 'System Purge',
        cost: 2,
        targeting: { type: 'TECH', affinity: 'ENEMY', location: 'ANY_LANE' }
      }
    });

    const targets = processor.process(context);
    expect(targets).toHaveLength(2);
    expect(targets.every(t => t.lane === 'lane1')).toBe(true);
  });
});
