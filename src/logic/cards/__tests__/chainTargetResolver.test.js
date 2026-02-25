import { describe, it, expect, vi } from 'vitest';

// Mock EffectChainProcessor to avoid circular dependency (EffectRouter → gameLogic → CardPlayManager)
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
    recordDiscard(cardId) { this.discardedCardIds.add(cardId); }
    getDronePosition(droneId) { return this.dronePositions.get(droneId) || null; }
    getDronesInLane(lane, playerId) {
      const result = [];
      for (const [id, pos] of this.dronePositions) {
        if (pos.lane === lane && pos.playerId === playerId) result.push(id);
      }
      return result;
    }
    isCardDiscarded(cardId) { return this.discardedCardIds.has(cardId); }
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
        case 'cardCost': return sel.target?.cost ?? 0;
        default: return null;
      }
    },
  };
});

import {
  resolveTargetingRefs,
  isCompoundEffect,
  hasSkippedRef,
  computeChainTargets,
  computeDestinationTargets,
} from '../chainTargetResolver.js';
import { PositionTracker } from '../EffectChainProcessor.js';

// --- Test Fixtures ---

function makePlayerStates() {
  return {
    player1: {
      dronesOnBoard: {
        lane1: [{ id: 'p1d1', name: 'Scout', attack: 2, speed: 4, hull: 3 }],
        lane2: [{ id: 'p1d2', name: 'Tank', attack: 4, speed: 2, hull: 6 }],
        lane3: [],
      },
      hand: [
        { id: 'card1', name: 'Ion Pulse', cost: 2 },
        { id: 'card2', name: 'Repair', cost: 1 },
      ],
      placedSections: {
        bridge: { destroyed: false },
        engines: { destroyed: true },
      },
    },
    player2: {
      dronesOnBoard: {
        lane1: [{ id: 'p2d1', name: 'Fighter', attack: 3, speed: 5, hull: 4 }],
        lane2: [],
        lane3: [{ id: 'p2d2', name: 'Bomber', attack: 5, speed: 1, hull: 5 }],
      },
      hand: [],
      placedSections: {
        bridge: { destroyed: false },
        engines: { destroyed: false },
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

// --- resolveTargetingRefs ---

describe('resolveTargetingRefs', () => {
  it('returns { type: NONE } for null targeting', () => {
    expect(resolveTargetingRefs(null, [])).toEqual({ type: 'NONE' });
  });

  it('passes through targeting without refs', () => {
    const targeting = { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' };
    expect(resolveTargetingRefs(targeting, [])).toEqual(targeting);
  });

  it('resolves location ref from selections', () => {
    const targeting = { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' } };
    const selections = [{ target: { id: 'd1' }, lane: 'lane2' }];
    const result = resolveTargetingRefs(targeting, selections);
    expect(result.location).toBe('lane2');
  });

  it('resolves restriction reference from selections', () => {
    const targeting = {
      type: 'DRONE',
      affinity: 'ENEMY',
      restrictions: [{ type: 'STAT_COMPARISON', stat: 'speed', comparison: 'LT', reference: { ref: 0, field: 'target' }, referenceStat: 'speed' }],
    };
    const primaryDrone = { id: 'd1', speed: 5 };
    const selections = [{ target: primaryDrone, lane: 'lane1' }];
    const result = resolveTargetingRefs(targeting, selections);
    expect(result.restrictions[0].reference).toBe(primaryDrone);
  });

  it('returns null for unresolvable ref', () => {
    const targeting = { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' } };
    const result = resolveTargetingRefs(targeting, []);
    expect(result.location).toBeNull();
  });
});

// --- isCompoundEffect ---

describe('isCompoundEffect', () => {
  it('returns true for SINGLE_MOVE with destination', () => {
    expect(isCompoundEffect({ type: 'SINGLE_MOVE', destination: { type: 'LANE' } })).toBe(true);
  });

  it('returns true for MULTI_MOVE with destination', () => {
    expect(isCompoundEffect({ type: 'MULTI_MOVE', destination: { type: 'LANE' } })).toBe(true);
  });

  it('returns false for DAMAGE', () => {
    expect(isCompoundEffect({ type: 'DAMAGE', value: 3 })).toBe(false);
  });

  it('returns false for SINGLE_MOVE without destination', () => {
    expect(isCompoundEffect({ type: 'SINGLE_MOVE' })).toBe(false);
  });
});

// --- hasSkippedRef ---

describe('hasSkippedRef', () => {
  it('returns false when no refs', () => {
    const effect = { type: 'DAMAGE', targeting: { type: 'DRONE', affinity: 'ENEMY' } };
    expect(hasSkippedRef(effect, [])).toBe(false);
  });

  it('returns true when location ref points to null selection', () => {
    const effect = { type: 'DAMAGE', targeting: { type: 'DRONE', location: { ref: 0, field: 'sourceLane' } } };
    expect(hasSkippedRef(effect, [])).toBe(true);
  });

  it('returns true when location ref points to skipped selection', () => {
    const effect = { type: 'DAMAGE', targeting: { type: 'DRONE', location: { ref: 0, field: 'sourceLane' } } };
    expect(hasSkippedRef(effect, [{ target: null, lane: null, skipped: true }])).toBe(true);
  });

  it('returns false when ref points to valid selection', () => {
    const effect = { type: 'DAMAGE', targeting: { type: 'DRONE', location: { ref: 0, field: 'sourceLane' } } };
    expect(hasSkippedRef(effect, [{ target: { id: 'd1' }, lane: 'lane1' }])).toBe(false);
  });

  it('detects skipped ref in mod.value', () => {
    const effect = { type: 'MODIFY_STAT', targeting: { type: 'DRONE' }, mod: { value: { ref: 0, field: 'cardCost' } } };
    expect(hasSkippedRef(effect, [])).toBe(true);
  });

  it('detects skipped ref in restrictions', () => {
    const effect = {
      type: 'EXHAUST_DRONE',
      targeting: {
        type: 'DRONE',
        restrictions: [{ type: 'STAT_COMPARISON', reference: { ref: 0, field: 'target' } }],
      },
    };
    expect(hasSkippedRef(effect, [{ target: null, skipped: true }])).toBe(true);
  });
});

// --- computeChainTargets ---

describe('computeChainTargets', () => {
  it('returns empty for NONE targeting', () => {
    const effect = { type: 'DRAW', targeting: { type: 'NONE' } };
    expect(computeChainTargets(effect, 0, [], null, makeContext())).toEqual([]);
  });

  it('returns enemy drones for DRONE/ENEMY/ANY_LANE', () => {
    const effect = { type: 'DAMAGE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } };
    const targets = computeChainTargets(effect, 0, [], null, makeContext());
    expect(targets).toHaveLength(2);
    expect(targets.every(t => t.owner === 'player2')).toBe(true);
  });

  it('returns friendly drones for DRONE/FRIENDLY/ANY_LANE', () => {
    const effect = { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } };
    const targets = computeChainTargets(effect, 0, [], null, makeContext());
    expect(targets).toHaveLength(2);
    expect(targets.every(t => t.owner === 'player1')).toBe(true);
  });

  it('filters drones by resolved location ref', () => {
    const effect = {
      type: 'EXHAUST_DRONE',
      targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' } },
    };
    const selections = [{ target: { id: 'p1d1' }, lane: 'lane1' }];
    const targets = computeChainTargets(effect, 1, selections, null, makeContext());
    // Only enemy drones in lane1
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('p2d1');
    expect(targets[0].lane).toBe('lane1');
  });

  it('applies STAT_COMPARISON restriction with resolved reference', () => {
    const effect = {
      type: 'EXHAUST_DRONE',
      targeting: {
        type: 'DRONE',
        affinity: 'ENEMY',
        location: { ref: 0, field: 'sourceLane' },
        restrictions: [{
          type: 'STAT_COMPARISON',
          stat: 'speed',
          comparison: 'LT',
          reference: { ref: 0, field: 'target' },
          referenceStat: 'speed',
        }],
      },
    };
    // Primary target: Scout (speed: 4) in lane1
    const selections = [{ target: { id: 'p1d1', speed: 4 }, lane: 'lane1' }];
    const targets = computeChainTargets(effect, 1, selections, null, makeContext());
    // Enemy in lane1: Fighter (speed: 5) — 5 < 4 is false, so filtered out
    expect(targets).toHaveLength(0);
  });

  it('STAT_COMPARISON GT passes correctly', () => {
    const effect = {
      type: 'EXHAUST_DRONE',
      targeting: {
        type: 'DRONE',
        affinity: 'ENEMY',
        location: 'ANY_LANE',
        restrictions: [{
          type: 'STAT_COMPARISON',
          stat: 'attack',
          comparison: 'GT',
          reference: { ref: 0, field: 'target' },
          referenceStat: 'attack',
        }],
      },
    };
    // Primary: Scout (attack: 2)
    const selections = [{ target: { id: 'p1d1', attack: 2 }, lane: 'lane1' }];
    const targets = computeChainTargets(effect, 1, selections, null, makeContext());
    // Enemy drones: Fighter (attack: 3 > 2 ✓), Bomber (attack: 5 > 2 ✓)
    expect(targets).toHaveLength(2);
  });

  it('returns all enemy lanes for LANE targeting', () => {
    const effect = { type: 'DAMAGE', targeting: { type: 'LANE', affinity: 'ENEMY' } };
    const targets = computeChainTargets(effect, 0, [], null, makeContext());
    expect(targets).toHaveLength(3);
    expect(targets.every(t => t.owner === 'player2' && t.type === 'lane')).toBe(true);
  });

  it('returns hand cards for CARD_IN_HAND targeting', () => {
    const effect = { type: 'DISCARD_CARD', targeting: { type: 'CARD_IN_HAND', affinity: 'FRIENDLY' } };
    const targets = computeChainTargets(effect, 0, [], null, makeContext());
    expect(targets).toHaveLength(2);
    expect(targets[0].id).toBe('card1');
  });

  it('excludes discarded cards from CARD_IN_HAND via positionTracker', () => {
    const effect = { type: 'DISCARD_CARD', targeting: { type: 'CARD_IN_HAND', affinity: 'FRIENDLY' } };
    const tracker = new PositionTracker(makePlayerStates());
    tracker.recordDiscard('card1');
    const targets = computeChainTargets(effect, 0, [], tracker, makeContext());
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('card2');
  });

  it('returns undestroyed ship sections for SHIP_SECTION targeting', () => {
    const effect = { type: 'DAMAGE', targeting: { type: 'SHIP_SECTION', affinity: 'ENEMY' } };
    const targets = computeChainTargets(effect, 0, [], null, makeContext());
    expect(targets).toHaveLength(2); // bridge + engines, both undestroyed for player2
  });

  it('filters destroyed ship sections', () => {
    const effect = { type: 'DAMAGE', targeting: { type: 'SHIP_SECTION', affinity: 'FRIENDLY' } };
    const targets = computeChainTargets(effect, 0, [], null, makeContext());
    // player1: bridge undestroyed, engines destroyed
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('bridge');
  });
});

// --- computeChainTargets with PositionTracker ---

describe('computeChainTargets — position tracking', () => {
  it('tracks drone move to different lane', () => {
    const effect = { type: 'DAMAGE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } };
    const states = makePlayerStates();
    const tracker = new PositionTracker(states);

    // Move p1d1 from lane1 to lane3
    tracker.recordMove('p1d1', 'lane3');

    const targets = computeChainTargets(effect, 0, [], tracker, makeContext({ playerStates: states }));
    expect(targets).toHaveLength(2);
    // p1d1 should now appear in lane3, not lane1
    const d1 = targets.find(t => t.id === 'p1d1');
    expect(d1.lane).toBe('lane3');
  });

  it('excludes drone from original lane after move', () => {
    const effect = { type: 'DAMAGE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' } };
    const states = makePlayerStates();
    const tracker = new PositionTracker(states);
    tracker.recordMove('p1d1', 'lane3');

    // Filter to lane1 only — p1d1 should NOT appear (it moved to lane3)
    const effectWithLocation = {
      type: 'DAMAGE',
      targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: { ref: 0, field: 'sourceLane' } },
    };
    const selections = [{ target: { id: 'x' }, lane: 'lane1' }];
    const targets = computeChainTargets(effectWithLocation, 1, selections, tracker, makeContext({ playerStates: states }));
    expect(targets.find(t => t.id === 'p1d1')).toBeUndefined();
  });
});

// --- computeDestinationTargets ---

describe('computeDestinationTargets', () => {
  it('returns adjacent lanes for ADJACENT_TO_PRIMARY from lane1', () => {
    const dest = { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' };
    const targets = computeDestinationTargets(dest, { lane: 'lane1' }, 'player1');
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('lane2');
  });

  it('returns adjacent lanes for ADJACENT_TO_PRIMARY from lane2', () => {
    const dest = { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' };
    const targets = computeDestinationTargets(dest, { lane: 'lane2' }, 'player1');
    expect(targets).toHaveLength(2);
    expect(targets.map(t => t.id).sort()).toEqual(['lane1', 'lane3']);
  });

  it('returns adjacent lanes for ADJACENT_TO_PRIMARY from lane3', () => {
    const dest = { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' };
    const targets = computeDestinationTargets(dest, { lane: 'lane3' }, 'player1');
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('lane2');
  });

  it('returns other lanes for generic destination', () => {
    const dest = { type: 'LANE' };
    const targets = computeDestinationTargets(dest, { lane: 'lane2' }, 'player1');
    expect(targets).toHaveLength(2);
    expect(targets.map(t => t.id).sort()).toEqual(['lane1', 'lane3']);
  });

  it('returns empty for null destination', () => {
    expect(computeDestinationTargets(null, { lane: 'lane1' }, 'player1')).toEqual([]);
  });

  it('targets include correct owner and type', () => {
    const dest = { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' };
    const targets = computeDestinationTargets(dest, { lane: 'lane2' }, 'player1');
    expect(targets.every(t => t.owner === 'player1' && t.type === 'lane')).toBe(true);
  });
});
