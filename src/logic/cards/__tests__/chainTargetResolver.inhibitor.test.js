import { describe, it, expect, vi } from 'vitest';

// Mock EffectChainProcessor (same pattern as chainTargetResolver.test.js)
vi.mock('../EffectChainProcessor.js', () => {
  class MockPositionTracker {
    constructor(playerStates) {
      this.dronePositions = new Map();
      this.discardedCardIds = new Set();
      for (const playerId of ['player1', 'player2']) {
        const board = playerStates[playerId]?.dronesOnBoard || {};
        for (const lane of ['lane1', 'lane2', 'lane3']) {
          for (const drone of (board[lane] || [])) {
            this.dronePositions.set(drone.id, { lane, playerId });
          }
        }
      }
    }
    recordMove(droneId, toLane) {
      const pos = this.dronePositions.get(droneId);
      if (pos) this.dronePositions.set(droneId, { ...pos, lane: toLane });
    }
    getDronePosition(droneId) { return this.dronePositions.get(droneId) || null; }
    isCardDiscarded() { return false; }
  }

  return {
    PositionTracker: MockPositionTracker,
    resolveRefFromSelections: (refObj, selections) => {
      if (!refObj || typeof refObj !== 'object' || !('ref' in refObj)) return refObj;
      const sel = selections[refObj.ref];
      if (!sel) return null;
      switch (refObj.field) {
        case 'target': return sel.target;
        case 'sourceLane': return sel.lane;
        case 'destinationLane': return sel.destination;
        default: return null;
      }
    },
  };
});

// Mock gameUtils — control inhibitor per lane
const inhibitedLanes = new Set();
vi.mock('../../../utils/gameUtils.js', () => ({
  hasMovementInhibitorInLane: (_playerState, lane) => inhibitedLanes.has(lane),
}));

import { computeChainTargets } from '../chainTargetResolver.js';
import { PositionTracker } from '../EffectChainProcessor.js';

// --- Fixtures ---

function makePlayerStates() {
  return {
    player1: {
      dronesOnBoard: {
        lane1: [{ id: 'p1d1', name: 'Scout', attack: 2, speed: 4, hull: 3 }],
        lane2: [{ id: 'p1d2', name: 'Tank', attack: 4, speed: 2, hull: 6 }],
        lane3: [],
      },
    },
    player2: {
      dronesOnBoard: {
        lane1: [{ id: 'p2d1', name: 'Fighter', attack: 3, speed: 5, hull: 4 }],
        lane2: [],
        lane3: [{ id: 'p2d2', name: 'Bomber', attack: 5, speed: 1, hull: 5 }],
      },
    },
  };
}

function makeContext(overrides = {}) {
  return {
    actingPlayerId: 'player1',
    playerStates: makePlayerStates(),
    getEffectiveStats: null,
    ...overrides,
  };
}

// --- Inhibitor targeting tests ---

describe('computeChainTargets — Thruster Inhibitor filtering', () => {
  afterEach(() => inhibitedLanes.clear());

  it('excludes friendly drones in inhibited lane from SINGLE_MOVE targets', () => {
    inhibitedLanes.add('lane1');

    const effect = {
      type: 'SINGLE_MOVE',
      targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
    };
    const targets = computeChainTargets(effect, 0, [], null, makeContext());

    // p1d1 in lane1 should be excluded; p1d2 in lane2 should remain
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('p1d2');
  });

  it('allows friendly drones in non-inhibited lanes as SINGLE_MOVE targets', () => {
    inhibitedLanes.add('lane3'); // no friendly drones here

    const effect = {
      type: 'SINGLE_MOVE',
      targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
    };
    const targets = computeChainTargets(effect, 0, [], null, makeContext());

    // Both friendly drones in lane1 and lane2 should be valid
    expect(targets).toHaveLength(2);
  });

  it('allows enemy drones in inhibited lane as SINGLE_MOVE targets (forced repositioning)', () => {
    inhibitedLanes.add('lane1');

    const effect = {
      type: 'SINGLE_MOVE',
      targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
    };
    const targets = computeChainTargets(effect, 0, [], null, makeContext());

    // Enemy drones should not be blocked — inhibitor only blocks friendly movement
    expect(targets).toHaveLength(2);
    expect(targets.find(t => t.id === 'p2d1')).toBeDefined();
  });

  it('does not affect non-movement effects (DAMAGE)', () => {
    inhibitedLanes.add('lane1');

    const effect = {
      type: 'DAMAGE',
      targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
    };
    const targets = computeChainTargets(effect, 0, [], null, makeContext());

    // Both friendly drones should be targetable for damage
    expect(targets).toHaveLength(2);
  });

  it('uses virtual lane position from positionTracker for inhibitor check', () => {
    inhibitedLanes.add('lane2');

    const states = makePlayerStates();
    const tracker = new PositionTracker(states);
    // Move p1d1 from lane1 (not inhibited) to lane2 (inhibited)
    tracker.recordMove('p1d1', 'lane2');

    const effect = {
      type: 'SINGLE_MOVE',
      targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
    };
    const targets = computeChainTargets(effect, 0, [], tracker, makeContext({ playerStates: states }));

    // p1d1 moved to lane2 (inhibited) — blocked
    // p1d2 in lane2 (inhibited) — blocked
    // No valid targets
    expect(targets).toHaveLength(0);
  });
});
