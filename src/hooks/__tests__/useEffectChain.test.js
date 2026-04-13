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

    act(() => result.current.selectChainTarget({ id: 'p2d1', owner: 'player2' }, 'lane1'));
    expect(result.current.effectChainState.subPhase).toBe('destination');
    // Enemy drone move: pendingDroneOwnerId must be player2, not the acting player
    expect(result.current.effectChainState.pendingDroneOwnerId).toBe('player2');

    act(() => result.current.selectChainDestination('lane2'));
    expect(result.current.effectChainState.complete).toBe(true);
    expect(result.current.effectChainState.selections).toHaveLength(2);
    expect(result.current.effectChainState.selections[0].destination).toBe('lane2');
    expect(result.current.effectChainState.selections[1].destination).toBe('lane2');
  });

  it('Forced Repositioning: full local lane does not block enemy move to same lane', () => {
    // player1's lane2 is at 4 drones — moving their lane1 drone there fills it (ghost = 1, total = 5).
    // player2's lane2 is empty. The enemy move to lane2 must remain valid.
    const makeFull = (n) => Array.from({ length: n }, (_, i) => ({ id: `fill${i}`, name: 'Filler' }));
    const { result } = renderChainHook({
      playerStates: {
        player1: {
          dronesOnBoard: {
            lane1: [{ id: 'p1d1', name: 'Scout', attack: 2, speed: 4, hull: 3 }],
            lane2: makeFull(4),
            lane3: [],
          },
          hand: [],
        },
        player2: {
          dronesOnBoard: {
            lane1: [{ id: 'p2d1', name: 'Fighter', attack: 3, speed: 5, hull: 4, owner: 'player2' }],
            lane2: [],
            lane3: [],
          },
          hand: [],
        },
      },
    });

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
          destination: { type: 'LANE', location: { ref: 0, field: 'destinationLane' } },
          mandatory: true,
        },
      ],
    };

    act(() => result.current.startEffectChain(card));

    // Effect 0: friendly drone from lane1 → lane2 (fills player1's side of lane2 to 5 via ghost)
    act(() => result.current.selectChainTarget({ id: 'p1d1', owner: 'player1' }, 'lane1'));
    expect(result.current.effectChainState.subPhase).toBe('destination');
    act(() => result.current.selectChainDestination('lane2'));

    // Effect 1: enemy drone — should NOT be blocked by player1's full lane2
    expect(result.current.effectChainState.currentIndex).toBe(1);
    expect(result.current.effectChainState.mandatoryEffectBlocked).toBeFalsy();
    expect(result.current.effectChainState.validTargets.some(t => t.id === 'p2d1')).toBe(true);

    // Destination for effect 1 is { ref: 0, field: 'destinationLane' } → resolves to 'lane2'.
    // Since there is exactly 1 valid target (player2's lane2 is not full), auto-selection fires
    // and the chain completes immediately — no manual destination subPhase needed.
    act(() => result.current.selectChainTarget({ id: 'p2d1', owner: 'player2' }, 'lane1'));
    expect(result.current.effectChainState.complete).toBe(true);
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

// --- Pending Target (Single-Target Confirmation) ---

describe('useEffectChain — pending target confirmation', () => {
  const damageCard = {
    name: 'Ion Pulse',
    effects: [{ type: 'DAMAGE', value: 3, targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } }],
  };

  it('setPendingChainTarget sets pendingTarget without advancing', () => {
    const { result } = renderChainHook();
    act(() => result.current.startEffectChain(damageCard));

    act(() => result.current.setPendingChainTarget({ id: 'p2d1', owner: 'player2' }, 'lane1'));

    const state = result.current.effectChainState;
    expect(state.pendingTarget.id).toBe('p2d1');
    expect(state.pendingLane).toBe('lane1');
    expect(state.subPhase).toBe('target');
    expect(state.currentIndex).toBe(0);
    expect(state.complete).toBe(false);
  });

  it('confirmChainTarget commits pending target and advances', () => {
    const { result } = renderChainHook();
    act(() => result.current.startEffectChain(damageCard));
    act(() => result.current.setPendingChainTarget({ id: 'p2d1', owner: 'player2' }, 'lane1'));

    act(() => result.current.confirmChainTarget());

    const state = result.current.effectChainState;
    expect(state.complete).toBe(true);
    expect(state.selections).toHaveLength(1);
    expect(state.selections[0].target.id).toBe('p2d1');
  });

  it('clicking a different drone updates pendingTarget', () => {
    const { result } = renderChainHook();
    act(() => result.current.startEffectChain(damageCard));

    act(() => result.current.setPendingChainTarget({ id: 'p2d1', owner: 'player2' }, 'lane1'));
    expect(result.current.effectChainState.pendingTarget.id).toBe('p2d1');

    act(() => result.current.setPendingChainTarget({ id: 'p2d2', owner: 'player2' }, 'lane3'));
    expect(result.current.effectChainState.pendingTarget.id).toBe('p2d2');
    expect(result.current.effectChainState.pendingLane).toBe('lane3');
    // Still in target subPhase, hasn't advanced
    expect(result.current.effectChainState.subPhase).toBe('target');
    expect(result.current.effectChainState.currentIndex).toBe(0);
  });

  it('confirmChainTarget is a no-op when no pendingTarget', () => {
    const { result } = renderChainHook();
    act(() => result.current.startEffectChain(damageCard));

    // No pending target set — confirm should do nothing
    act(() => result.current.confirmChainTarget());

    const state = result.current.effectChainState;
    expect(state.subPhase).toBe('target');
    expect(state.currentIndex).toBe(0);
    expect(state.complete).toBe(false);
  });

  it('setPendingChainTarget is a no-op when not in target subPhase', () => {
    const { result } = renderChainHook();
    // No chain active
    act(() => result.current.setPendingChainTarget({ id: 'p2d1' }, 'lane1'));
    expect(result.current.effectChainState).toBeNull();
  });
});

// --- Optional Effects and Skip ---

describe('useEffectChain — optional effects', () => {
  const repositionCard = {
    name: 'Reposition',
    effects: [
      {
        type: 'SINGLE_MOVE',
        targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: [] },
        destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' },
        properties: ['DO_NOT_EXHAUST'],
        prompt: 'Move a friendly drone (1 of 3)',
      },
      {
        type: 'SINGLE_MOVE',
        targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: [] },
        destination: { type: 'LANE', location: { ref: 0, field: 'destinationLane' } },
        properties: ['DO_NOT_EXHAUST'],
        optional: true,
        prompt: 'Move another drone (2 of 3)',
      },
      {
        type: 'SINGLE_MOVE',
        targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: [] },
        destination: { type: 'LANE', location: { ref: 0, field: 'destinationLane' } },
        properties: ['DO_NOT_EXHAUST'],
        optional: true,
        prompt: 'Move another drone (3 of 3)',
      },
    ],
  };

  it('exposes isCurrentEffectOptional on chain state', () => {
    const { result } = renderChainHook();
    act(() => result.current.startEffectChain(repositionCard));

    // Effect 0 is not optional
    expect(result.current.effectChainState.isCurrentEffectOptional).toBe(false);
  });

  it('skipRemainingOptionalEffects skips remaining effects and completes chain', () => {
    // Need 3 drones in lane1 so effect 1 has valid targets after moving one
    const playerStates = {
      player1: {
        dronesOnBoard: {
          lane1: [
            { id: 'p1d1', name: 'Scout', attack: 2, speed: 4, hull: 3 },
            { id: 'p1d3', name: 'Fighter', attack: 3, speed: 3, hull: 4 },
            { id: 'p1d4', name: 'Bomber', attack: 5, speed: 1, hull: 5 },
          ],
          lane2: [],
          lane3: [],
        },
        hand: [],
      },
      player2: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [],
      },
    };

    const { result } = renderHook(() => useEffectChain({
      playerStates,
      actingPlayerId: 'player1',
      getEffectiveStats: null,
    }));

    act(() => result.current.startEffectChain(repositionCard));

    // Complete effect 0: select drone from lane1 → destination lane2
    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));
    act(() => result.current.selectChainDestination('lane2'));

    // Now at effect 1 (optional) — p1d3 and p1d4 are still in lane1
    expect(result.current.effectChainState.isCurrentEffectOptional).toBe(true);

    // Skip remaining
    act(() => result.current.skipRemainingOptionalEffects());

    const state = result.current.effectChainState;
    expect(state.complete).toBe(true);
    expect(state.selections).toHaveLength(3);
    expect(state.selections[0].target.id).toBe('p1d1');
    expect(state.selections[1].skipped).toBe(true);
    expect(state.selections[2].skipped).toBe(true);
  });

  it('exposes priorTargetIds for drones selected in earlier effects', () => {
    // Need multiple drones so effect 1 doesn't auto-skip
    const playerStates = {
      player1: {
        dronesOnBoard: {
          lane1: [
            { id: 'p1d1', name: 'Scout', attack: 2, speed: 4, hull: 3 },
            { id: 'p1d3', name: 'Fighter', attack: 3, speed: 3, hull: 4 },
          ],
          lane2: [],
          lane3: [],
        },
        hand: [],
      },
      player2: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [],
      },
    };

    const { result } = renderHook(() => useEffectChain({
      playerStates,
      actingPlayerId: 'player1',
      getEffectiveStats: null,
    }));

    act(() => result.current.startEffectChain(repositionCard));

    // Complete effect 0
    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));
    act(() => result.current.selectChainDestination('lane2'));

    // Effect 1 should have priorTargetIds containing p1d1
    const state = result.current.effectChainState;
    expect(state.priorTargetIds).toBeDefined();
    expect(state.priorTargetIds.has('p1d1')).toBe(true);
  });

  it('prior-selected drones are excluded from valid targets', () => {
    // Player has 2 drones in lane1 — after moving one, the other should still be valid
    // but the moved drone should be excluded
    const playerStates = {
      player1: {
        dronesOnBoard: {
          lane1: [
            { id: 'p1d1', name: 'Scout', attack: 2, speed: 4, hull: 3 },
            { id: 'p1d3', name: 'Fighter', attack: 3, speed: 3, hull: 4 },
          ],
          lane2: [],
          lane3: [],
        },
        hand: [],
      },
      player2: {
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        hand: [],
      },
    };

    const { result } = renderHook(() => useEffectChain({
      playerStates,
      actingPlayerId: 'player1',
      getEffectiveStats: null,
    }));

    act(() => result.current.startEffectChain(repositionCard));
    // Select p1d1 from lane1, move to lane2
    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));
    act(() => result.current.selectChainDestination('lane2'));

    // Effect 1: p1d1 should NOT be in validTargets (already moved)
    const state = result.current.effectChainState;
    const targetIds = state.validTargets.map(t => t.id);
    expect(targetIds).not.toContain('p1d1');
    expect(targetIds).toContain('p1d3');
  });
});

// --- Mandatory Effect Blocking ---

describe('useEffectChain — mandatory effect blocking', () => {
  // Player states: p1 has drone in lane1, p2 has NO drones in lane1
  const noEnemyStates = {
    player1: {
      dronesOnBoard: {
        lane1: [{ id: 'p1d1', name: 'Scout', attack: 2, speed: 4, hull: 3 }],
        lane2: [],
        lane3: [],
      },
      hand: [],
    },
    player2: {
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      hand: [],
    },
  };

  // Player states: p2 HAS a drone in lane1
  const withEnemyStates = {
    player1: {
      dronesOnBoard: {
        lane1: [{ id: 'p1d1', name: 'Scout', attack: 2, speed: 4, hull: 3 }],
        lane2: [],
        lane3: [],
      },
      hand: [],
    },
    player2: {
      dronesOnBoard: {
        lane1: [{ id: 'p2d1', name: 'Fighter', attack: 3, speed: 5, hull: 4 }],
        lane2: [],
        lane3: [],
      },
      hand: [],
    },
  };

  function makeMandatoryCard() {
    return {
      name: 'Mandatory Test',
      effects: [
        { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
        { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' } }, mandatory: true },
      ],
    };
  }

  it('mandatory effect with 0 valid targets stalls chain', () => {
    const { result } = renderHook(() => useEffectChain({
      playerStates: noEnemyStates,
      actingPlayerId: 'player1',
      getEffectiveStats: null,
    }));

    act(() => result.current.startEffectChain(makeMandatoryCard()));
    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));

    const state = result.current.effectChainState;
    expect(state.complete).toBe(false);
    expect(state.mandatoryEffectBlocked).toBe(true);
    expect(state.validTargets).toHaveLength(0);
    expect(state.currentIndex).toBe(1);
  });

  it('mandatory effect with valid targets proceeds normally', () => {
    const { result } = renderHook(() => useEffectChain({
      playerStates: withEnemyStates,
      actingPlayerId: 'player1',
      getEffectiveStats: null,
    }));

    act(() => result.current.startEffectChain(makeMandatoryCard()));
    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));

    const state = result.current.effectChainState;
    expect(state.mandatoryEffectBlocked).toBeFalsy();
    expect(state.validTargets.length).toBeGreaterThan(0);
    expect(state.subPhase).toBe('target');
  });

  it('optional effect with 0 valid targets auto-skips (existing behavior)', () => {
    const card = {
      name: 'Optional Test',
      effects: [
        { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
        { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' } }, optional: true },
      ],
    };

    const { result } = renderHook(() => useEffectChain({
      playerStates: noEnemyStates,
      actingPlayerId: 'player1',
      getEffectiveStats: null,
    }));

    act(() => result.current.startEffectChain(card));
    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));

    const state = result.current.effectChainState;
    expect(state.complete).toBe(true);
    expect(state.selections[1].skipped).toBe(true);
  });

  it('default effect (neither flag) with 0 valid targets auto-skips (backwards compat)', () => {
    const card = {
      name: 'Default Test',
      effects: [
        { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
        { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' } } },
      ],
    };

    const { result } = renderHook(() => useEffectChain({
      playerStates: noEnemyStates,
      actingPlayerId: 'player1',
      getEffectiveStats: null,
    }));

    act(() => result.current.startEffectChain(card));
    act(() => result.current.selectChainTarget({ id: 'p1d1' }, 'lane1'));

    const state = result.current.effectChainState;
    expect(state.complete).toBe(true);
    expect(state.selections[1].skipped).toBe(true);
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
