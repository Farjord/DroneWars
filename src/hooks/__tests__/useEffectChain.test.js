import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useEffectChain from '../useEffectChain.js';

// Mock EffectChainProcessor to avoid circular dependency issues
vi.mock('../../logic/cards/EffectChainProcessor.js', () => {
  class MockPositionTracker {
    constructor() {
      this.dronePositions = new Map();
      this.discardedCardIds = new Set();
    }
    recordMove(droneId, toLane) {
      this.dronePositions.set(droneId, { lane: toLane, playerId: 'player1' });
    }
    recordDiscard(cardId) {
      this.discardedCardIds.add(cardId);
    }
    getDronePosition(droneId) {
      return this.dronePositions.get(droneId) || null;
    }
    getDronesInLane() { return []; }
    isCardDiscarded(cardId) {
      return this.discardedCardIds.has(cardId);
    }
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

// --- Fixtures ---

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
    },
    player2: {
      dronesOnBoard: {
        lane1: [{ id: 'p2d1', name: 'Fighter', attack: 3, speed: 5, hull: 4 }],
        lane2: [],
        lane3: [{ id: 'p2d2', name: 'Bomber', attack: 5, speed: 1, hull: 5 }],
      },
      hand: [],
    },
  };
}

function renderChainHook(overrides = {}) {
  return renderHook(() => useEffectChain({
    playerStates: makePlayerStates(),
    actingPlayerId: 'player1',
    getEffectiveStats: null,
    ...overrides,
  }));
}

// --- Initialization ---

describe('useEffectChain — initialization', () => {
  it('starts with null chain state', () => {
    const { result } = renderChainHook();
    expect(result.current.effectChainState).toBeNull();
  });
});

// --- Single-Effect Chains ---

describe('useEffectChain — single-effect chains', () => {
  it('starts chain for a DAMAGE card with valid targets', () => {
    const { result } = renderChainHook();
    const card = {
      name: 'Ion Pulse',
      effects: [{ type: 'DAMAGE', value: 3, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } }],
    };

    act(() => result.current.startEffectChain(card));

    const state = result.current.effectChainState;
    expect(state).not.toBeNull();
    expect(state.currentIndex).toBe(0);
    expect(state.subPhase).toBe('target');
    expect(state.validTargets.length).toBeGreaterThan(0);
    expect(state.complete).toBe(false);
  });

  it('completes chain after selecting target for single-effect card', () => {
    const { result } = renderChainHook();
    const card = {
      name: 'Ion Pulse',
      effects: [{ type: 'DAMAGE', value: 3, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } }],
    };

    act(() => result.current.startEffectChain(card));
    act(() => result.current.selectChainTarget({ id: 'p2d1' }, 'lane1'));

    const state = result.current.effectChainState;
    expect(state.complete).toBe(true);
    expect(state.selections).toHaveLength(1);
    expect(state.selections[0].target.id).toBe('p2d1');
  });

  it('auto-selects NONE targeting and completes immediately', () => {
    const { result } = renderChainHook();
    const card = {
      name: 'System Reboot',
      effects: [{ type: 'DRAW', value: 2, targeting: { type: 'NONE' } }],
    };

    act(() => result.current.startEffectChain(card));

    const state = result.current.effectChainState;
    expect(state.complete).toBe(true);
    expect(state.selections).toHaveLength(1);
    expect(state.selections[0].target).toBeNull();
  });

  it('handles initial target from drag (skips to completion)', () => {
    const { result } = renderChainHook();
    const card = {
      name: 'Ion Pulse',
      effects: [{ type: 'DAMAGE', value: 3, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } }],
    };

    act(() => result.current.startEffectChain(card, { id: 'p2d1' }, 'lane1'));

    const state = result.current.effectChainState;
    expect(state.complete).toBe(true);
    expect(state.selections).toHaveLength(1);
    expect(state.selections[0].target.id).toBe('p2d1');
  });
});

// --- Compound Effects (SINGLE_MOVE) ---

describe('useEffectChain — compound effects', () => {
  const moveCard = {
    name: 'Maneuver',
    effects: [{
      type: 'SINGLE_MOVE',
      targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
      destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' },
    }],
  };

  it('enters destination subPhase after target selection', () => {
    const { result } = renderChainHook();

    act(() => result.current.startEffectChain(moveCard));
    expect(result.current.effectChainState.subPhase).toBe('target');

    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));
    const state = result.current.effectChainState;
    expect(state.subPhase).toBe('destination');
    expect(state.pendingTarget.id).toBe('p1d1');
    expect(state.validTargets.length).toBeGreaterThan(0);
    expect(state.validTargets.every(t => t.type === 'lane')).toBe(true);
  });

  it('completes after destination selection', () => {
    const { result } = renderChainHook();

    act(() => result.current.startEffectChain(moveCard));
    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));
    act(() => result.current.selectChainDestination('lane2'));

    const state = result.current.effectChainState;
    expect(state.complete).toBe(true);
    expect(state.selections).toHaveLength(1);
    expect(state.selections[0].target.id).toBe('p1d1');
    expect(state.selections[0].destination).toBe('lane2');
  });

  it('handles initial target for compound effect (goes to destination)', () => {
    const { result } = renderChainHook();

    act(() => result.current.startEffectChain(moveCard, { id: 'p1d2' }, 'lane2'));

    const state = result.current.effectChainState;
    expect(state.subPhase).toBe('destination');
    expect(state.pendingTarget.id).toBe('p1d2');
    // lane2 is adjacent to lane1 and lane3
    expect(state.validTargets).toHaveLength(2);
  });
});

// --- Multi-Effect Chains ---

describe('useEffectChain — multi-effect chains', () => {
  it('Feint pattern: exhaust friendly → exhaust enemy in same lane', () => {
    const { result } = renderChainHook();
    const card = {
      name: 'Feint',
      effects: [
        { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
        {
          type: 'EXHAUST_DRONE',
          targeting: {
            type: 'DRONE',
            affinity: 'ENEMY',
            location: { ref: 0, field: 'sourceLane' },
          },
        },
      ],
    };

    act(() => result.current.startEffectChain(card));
    expect(result.current.effectChainState.currentIndex).toBe(0);

    // Select friendly drone in lane1
    act(() => result.current.selectChainTarget({ id: 'p1d1', speed: 4 }, 'lane1'));

    // Should advance to effect 1, targeting enemy drones in lane1
    const state = result.current.effectChainState;
    expect(state.currentIndex).toBe(1);
    expect(state.validTargets.length).toBeGreaterThan(0);
    expect(state.validTargets[0].owner).toBe('player2');
    expect(state.complete).toBe(false);

    // Select enemy drone
    act(() => result.current.selectChainTarget({ id: 'p2d1' }, 'lane1'));

    expect(result.current.effectChainState.complete).toBe(true);
    expect(result.current.effectChainState.selections).toHaveLength(2);
  });

  it('Sacrifice pattern: discard card → buff drone', () => {
    const { result } = renderChainHook();
    const card = {
      name: 'Sacrifice for Power',
      effects: [
        { type: 'DISCARD_CARD', targeting: { type: 'CARD_IN_HAND', affinity: 'FRIENDLY' }, prompt: 'Choose a card' },
        { type: 'MODIFY_STAT', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' }, mod: { value: { ref: 0, field: 'cardCost' } } },
      ],
    };

    act(() => result.current.startEffectChain(card));

    // Effect 0: CARD_IN_HAND targets
    const state0 = result.current.effectChainState;
    expect(state0.currentIndex).toBe(0);
    expect(state0.validTargets.length).toBe(2); // 2 cards in hand
    expect(state0.prompt).toBe('Choose a card');

    // Select card to discard
    act(() => result.current.selectChainTarget({ id: 'card1', cost: 2 }, null));

    // Effect 1: DRONE targets
    const state1 = result.current.effectChainState;
    expect(state1.currentIndex).toBe(1);
    expect(state1.validTargets.length).toBe(2); // 2 friendly drones
    expect(state1.complete).toBe(false);

    // Select drone to buff
    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));
    expect(result.current.effectChainState.complete).toBe(true);
    expect(result.current.effectChainState.selections).toHaveLength(2);
  });

  it('Forced Repositioning: move friendly → move enemy', () => {
    const { result } = renderChainHook();
    const card = {
      name: 'Forced Repositioning',
      effects: [
        {
          type: 'SINGLE_MOVE',
          targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
          destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' },
        },
        {
          type: 'SINGLE_MOVE',
          targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' } },
          destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' },
        },
      ],
    };

    // Effect 0: select friendly drone
    act(() => result.current.startEffectChain(card));
    expect(result.current.effectChainState.currentIndex).toBe(0);

    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));
    // Destination subPhase
    expect(result.current.effectChainState.subPhase).toBe('destination');

    act(() => result.current.selectChainDestination('lane2'));
    // Advance to effect 1: enemy drones in lane1 (source lane of effect 0)
    const state1 = result.current.effectChainState;
    expect(state1.currentIndex).toBe(1);
    expect(state1.subPhase).toBe('target');

    act(() => result.current.selectChainTarget({ id: 'p2d1' }, 'lane1'));
    expect(result.current.effectChainState.subPhase).toBe('destination');

    act(() => result.current.selectChainDestination('lane2'));
    expect(result.current.effectChainState.complete).toBe(true);
    expect(result.current.effectChainState.selections).toHaveLength(2);
    expect(result.current.effectChainState.selections[0].destination).toBe('lane2');
    expect(result.current.effectChainState.selections[1].destination).toBe('lane2');
  });
});

// --- Cancel ---

describe('useEffectChain — cancel', () => {
  it('resets state on cancel', () => {
    const { result } = renderChainHook();
    const card = {
      name: 'Ion Pulse',
      effects: [{ type: 'DAMAGE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } }],
    };

    act(() => result.current.startEffectChain(card));
    expect(result.current.effectChainState).not.toBeNull();

    act(() => result.current.cancelEffectChain());
    expect(result.current.effectChainState).toBeNull();
  });

  it('cancel mid-chain clears all state', () => {
    const { result } = renderChainHook();
    const card = {
      name: 'Feint',
      effects: [
        { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
        { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' } } },
      ],
    };

    act(() => result.current.startEffectChain(card));
    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));
    // Now at effect 1
    expect(result.current.effectChainState.currentIndex).toBe(1);

    act(() => result.current.cancelEffectChain());
    expect(result.current.effectChainState).toBeNull();
  });
});

// --- Auto-Skipping ---

describe('useEffectChain — auto-skipping', () => {
  it('skips effect when referenced selection was skipped', () => {
    const { result } = renderChainHook();
    // Effect 0: target drones in lane3 (no friendly drones there → zero valid → skip)
    // Effect 1: refs effect 0 → also skipped
    const card = {
      name: 'Test Chain',
      effects: [
        { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'lane3' } },
        { type: 'DAMAGE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' } } },
      ],
    };

    act(() => result.current.startEffectChain(card));

    // Both effects should be auto-skipped, chain complete
    const state = result.current.effectChainState;
    expect(state.complete).toBe(true);
    expect(state.selections).toHaveLength(2);
    expect(state.selections[0].skipped).toBe(true);
    expect(state.selections[1].skipped).toBe(true);
  });

  it('NONE effect followed by targeted effect works correctly', () => {
    const { result } = renderChainHook();
    const card = {
      name: 'Draw + Damage',
      effects: [
        { type: 'DRAW', value: 1, targeting: { type: 'NONE' } },
        { type: 'DAMAGE', value: 2, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } },
      ],
    };

    act(() => result.current.startEffectChain(card));

    // NONE was auto-selected, now on effect 1
    const state = result.current.effectChainState;
    expect(state.currentIndex).toBe(1);
    expect(state.selections).toHaveLength(1);
    expect(state.selections[0].target).toBeNull(); // NONE
    expect(state.complete).toBe(false);
    expect(state.validTargets.length).toBeGreaterThan(0);
  });
});

// --- Edge Cases ---

describe('useEffectChain — edge cases', () => {
  it('does nothing when starting chain with no effects', () => {
    const { result } = renderChainHook();
    act(() => result.current.startEffectChain({ name: 'Empty', effects: [] }));
    expect(result.current.effectChainState).toBeNull();
  });

  it('selectChainTarget does nothing when no chain active', () => {
    const { result } = renderChainHook();
    act(() => result.current.selectChainTarget({ id: 'p2d1' }, 'lane1'));
    expect(result.current.effectChainState).toBeNull();
  });

  it('selectChainDestination does nothing when not in destination subPhase', () => {
    const { result } = renderChainHook();
    const card = {
      name: 'Ion Pulse',
      effects: [{ type: 'DAMAGE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } }],
    };

    act(() => result.current.startEffectChain(card));
    act(() => result.current.selectChainDestination('lane2'));

    // Should still be waiting for target (destination was ignored)
    expect(result.current.effectChainState.subPhase).toBe('target');
    expect(result.current.effectChainState.currentIndex).toBe(0);
  });
});
