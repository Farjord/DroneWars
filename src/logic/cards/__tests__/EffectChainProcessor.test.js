import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock TriggerProcessor (imported by EffectChainProcessor for ON_CARD_PLAY)
// Configurable: set mockTriggerResult before a test to simulate ON_CARD_PLAY triggers
let mockTriggerResult = null;
vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = vi.fn().mockImplementation((_type, ctx) => {
        if (mockTriggerResult) {
          // Apply mutations to a copy of the passed-in state
          const newStates = JSON.parse(JSON.stringify(ctx.playerStates));
          if (mockTriggerResult.mutate) mockTriggerResult.mutate(newStates);
          return {
            triggered: true,
            newPlayerStates: newStates,
            animationEvents: mockTriggerResult.animationEvents || [],
            goAgain: false
          };
        }
        return {
          triggered: false, newPlayerStates: null, animationEvents: [], goAgain: false
        };
      });
    }
  }
}));
vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_CARD_PLAY: 'ON_CARD_PLAY' }
}));

// Mock EffectRouter before importing EffectChainProcessor
vi.mock('../../EffectRouter.js', () => {
  return {
    default: class MockEffectRouter {
      routeEffect(effect, context) {
        // DAMAGE: reduce target hull
        if (effect.type === 'DAMAGE') {
          const newStates = JSON.parse(JSON.stringify(context.playerStates));
          const targetOwnerId = context.target?.owner || 'player2';
          for (const lane of ['lane1', 'lane2', 'lane3']) {
            const drones = newStates[targetOwnerId]?.dronesOnBoard?.[lane] || [];
            const idx = drones.findIndex(d => d.id === context.target?.id);
            if (idx !== -1) {
              drones[idx].hull -= effect.value || 0;
              if (drones[idx].hull <= 0) drones.splice(idx, 1);
              break;
            }
          }
          return {
            newPlayerStates: newStates,
            animationEvents: [],
            additionalEffects: [],
            effectResult: { wasDestroyed: false, damageDealt: { hull: effect.value } },
          };
        }
        // DRAW: move top of deck to hand
        if (effect.type === 'DRAW') {
          const newStates = JSON.parse(JSON.stringify(context.playerStates));
          const acting = newStates[context.actingPlayerId];
          const count = effect.value || 1;
          for (let i = 0; i < count && acting.deck.length > 0; i++) {
            acting.hand.push(acting.deck.shift());
          }
          return { newPlayerStates: newStates, animationEvents: [], additionalEffects: [] };
        }
        // EXHAUST_DRONE: set isExhausted
        if (effect.type === 'EXHAUST_DRONE') {
          const newStates = JSON.parse(JSON.stringify(context.playerStates));
          const targetOwnerId = context.target?.owner || context.actingPlayerId;
          for (const lane of ['lane1', 'lane2', 'lane3']) {
            const drones = newStates[targetOwnerId]?.dronesOnBoard?.[lane] || [];
            const drone = drones.find(d => d.id === context.target?.id);
            if (drone) { drone.isExhausted = true; break; }
          }
          return { newPlayerStates: newStates, animationEvents: [], additionalEffects: [] };
        }
        // MODIFY_STAT: apply mod
        if (effect.type === 'MODIFY_STAT') {
          const newStates = JSON.parse(JSON.stringify(context.playerStates));
          const targetOwnerId = context.target?.owner || context.actingPlayerId;
          for (const lane of ['lane1', 'lane2', 'lane3']) {
            const drones = newStates[targetOwnerId]?.dronesOnBoard?.[lane] || [];
            const drone = drones.find(d => d.id === context.target?.id);
            if (drone && effect.mod) {
              drone[effect.mod.stat] = (drone[effect.mod.stat] || 0) + (effect.mod.value || 0);
              break;
            }
          }
          return { newPlayerStates: newStates, animationEvents: [], additionalEffects: [] };
        }
        // GAIN_ENERGY
        if (effect.type === 'GAIN_ENERGY') {
          const newStates = JSON.parse(JSON.stringify(context.playerStates));
          newStates[context.actingPlayerId].energy += effect.value || 0;
          return { newPlayerStates: newStates, animationEvents: [], additionalEffects: [] };
        }
        return null;
      }
      hasProcessor(type) { return ['DAMAGE', 'DRAW', 'EXHAUST_DRONE', 'MODIFY_STAT', 'GAIN_ENERGY'].includes(type); }
    }
  };
});

// Mock ConditionalEffectProcessor
vi.mock('../../effects/conditional/ConditionalEffectProcessor.js', () => {
  return {
    default: class MockConditionalProcessor {
      processPreConditionals(conditionals, effect, context) {
        let modifiedEffect = { ...effect };
        const additionalEffects = [];
        for (const c of (conditionals || []).filter(x => x.timing === 'PRE')) {
          if (c.grantedEffect?.type === 'BONUS_DAMAGE' && typeof modifiedEffect.value === 'number') {
            modifiedEffect.value += c.grantedEffect.value;
          }
        }
        return { modifiedEffect, newPlayerStates: JSON.parse(JSON.stringify(context.playerStates)), animationEvents: [], additionalEffects };
      }
      processPostConditionals(conditionals, context, effectResult) {
        let grantsGoAgain = false;
        const additionalEffects = [];
        for (const c of (conditionals || []).filter(x => x.timing === 'POST')) {
          if (c.grantedEffect?.type === 'GO_AGAIN') grantsGoAgain = true;
          else additionalEffects.push(c.grantedEffect);
        }
        return { newPlayerStates: JSON.parse(JSON.stringify(context.playerStates)), animationEvents: [], additionalEffects, grantsGoAgain };
      }
    }
  };
});

// Mock MovementEffectProcessor
// Stores mock trigger events to inject for testing trigger deferral
let mockMoveTriggerEvents = [];
let mockMoveMineEvents = [];
let mockMoveTriggerSteps = [];
// Per-effect overrides: { [effectIndex]: { triggerEvents, mineEvents, triggerSteps } }
let mockMovePerEffect = {};
let mockMoveEffectCounter = 0;
vi.mock('../../effects/MovementEffectProcessor.js', () => {
  return {
    default: class MockMovementProcessor {
      executeSingleMove(card, drone, fromLane, toLane, actingPlayerId, newStates, opponentId, ctx) {
        const effectIdx = mockMoveEffectCounter++;
        const perEffect = mockMovePerEffect[effectIdx];
        const droneOwnerId = drone.owner || actingPlayerId;
        newStates[droneOwnerId].dronesOnBoard[fromLane] =
          newStates[droneOwnerId].dronesOnBoard[fromLane].filter(d => d.id !== drone.id);
        const movedDrone = { ...drone, isExhausted: !card.effects?.[0]?.properties?.includes('DO_NOT_EXHAUST') };
        newStates[droneOwnerId].dronesOnBoard[toLane].push(movedDrone);
        return {
          newPlayerStates: newStates,
          postMovementState: JSON.parse(JSON.stringify(newStates)),
          effectResult: { movedDrones: [movedDrone], fromLane, toLane, wasSuccessful: true },
          shouldEndTurn: !card.effects?.[0]?.goAgain,
          triggerAnimationEvents: perEffect?.triggerEvents ?? [...mockMoveTriggerEvents],
          mineAnimationEvents: perEffect?.mineEvents ?? [...mockMoveMineEvents],
          triggerSteps: perEffect?.triggerSteps ?? [...mockMoveTriggerSteps],
        };
      }
      executeMultiMove(card, drones, fromLane, toLane, actingPlayerId, newStates, opponentId, ctx) {
        const effectIdx = mockMoveEffectCounter++;
        const perEffect = mockMovePerEffect[effectIdx];
        for (const drone of drones) {
          newStates[actingPlayerId].dronesOnBoard[fromLane] =
            newStates[actingPlayerId].dronesOnBoard[fromLane].filter(d => d.id !== drone.id);
          newStates[actingPlayerId].dronesOnBoard[toLane].push({ ...drone });
        }
        return {
          newPlayerStates: newStates,
          postMovementState: JSON.parse(JSON.stringify(newStates)),
          effectResult: { movedDrones: drones, fromLane, toLane, wasSuccessful: true },
          shouldEndTurn: true,
          triggerAnimationEvents: perEffect?.triggerEvents ?? [...mockMoveTriggerEvents],
          mineAnimationEvents: perEffect?.mineEvents ?? [...mockMoveMineEvents],
          triggerSteps: perEffect?.triggerSteps ?? [...mockMoveTriggerSteps],
        };
      }
    }
  };
});

import EffectChainProcessor, {
  PositionTracker,
  resolveRef,
  resolveRefFromSelections,
  stripChainFields,
} from '../EffectChainProcessor';

// --- Test Fixtures ---

function createDrone(overrides = {}) {
  return {
    id: `drone_${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Drone',
    hull: 3,
    shields: 0,
    attack: 2,
    speed: 3,
    isExhausted: false,
    owner: 'player1',
    ...overrides,
  };
}

function createPlayerState(overrides = {}) {
  return {
    name: 'Player',
    energy: 10,
    momentum: 0,
    hand: [],
    discardPile: [],
    deck: [{ id: 'deck1' }, { id: 'deck2' }],
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    shipSections: { bridge: { hull: 10, allocatedShields: 5, maxShields: 5 } },
    ...overrides,
  };
}

function createGameState(p1Overrides = {}, p2Overrides = {}) {
  return {
    player1: createPlayerState({ name: 'Player 1', ...p1Overrides }),
    player2: createPlayerState({ name: 'Player 2', ...p2Overrides }),
  };
}

function createCtx(playerStates, overrides = {}) {
  return {
    playerStates,
    placedSections: { player1: ['bridge'], player2: ['bridge'] },
    callbacks: { logCallback: vi.fn(), resolveAttackCallback: vi.fn() },
    localPlayerId: 'player1',
    gameMode: 'local',
    ...overrides,
  };
}

// --- Unit Tests: resolveRef ---

describe('resolveRef', () => {
  const effectResults = [
    { target: { id: 'd1' }, sourceLane: 'lane1', destinationLane: 'lane2', cardCost: 3 },
    { target: { id: 'd2' }, sourceLane: 'lane2', destinationLane: null, cardCost: null },
  ];

  it('resolves target from earlier effect', () => {
    expect(resolveRef({ ref: 0, field: 'target' }, effectResults)).toEqual({ id: 'd1' });
  });

  it('resolves sourceLane from earlier effect', () => {
    expect(resolveRef({ ref: 0, field: 'sourceLane' }, effectResults)).toBe('lane1');
  });

  it('resolves destinationLane from earlier effect', () => {
    expect(resolveRef({ ref: 0, field: 'destinationLane' }, effectResults)).toBe('lane2');
  });

  it('resolves cardCost from earlier effect', () => {
    expect(resolveRef({ ref: 0, field: 'cardCost' }, effectResults)).toBe(3);
  });

  it('returns null for skipped effect (null result)', () => {
    expect(resolveRef({ ref: 2, field: 'target' }, effectResults)).toBeNull();
  });

  it('passes through non-ref values unchanged', () => {
    expect(resolveRef('ANY_LANE', effectResults)).toBe('ANY_LANE');
    expect(resolveRef(42, effectResults)).toBe(42);
    expect(resolveRef(null, effectResults)).toBeNull();
  });
});

// --- Unit Tests: resolveRefFromSelections ---

describe('resolveRefFromSelections', () => {
  const selections = [
    { target: { id: 'd1', cost: 5 }, lane: 'lane1', destination: 'lane2' },
    { target: { id: 'd2' }, lane: 'lane3' },
  ];

  it('resolves target from selection', () => {
    expect(resolveRefFromSelections({ ref: 0, field: 'target' }, selections)).toEqual({ id: 'd1', cost: 5 });
  });

  it('resolves sourceLane from selection', () => {
    expect(resolveRefFromSelections({ ref: 0, field: 'sourceLane' }, selections)).toBe('lane1');
  });

  it('resolves destinationLane from selection', () => {
    expect(resolveRefFromSelections({ ref: 0, field: 'destinationLane' }, selections)).toBe('lane2');
  });

  it('resolves cardCost from selection target', () => {
    expect(resolveRefFromSelections({ ref: 0, field: 'cardCost' }, selections)).toBe(5);
  });

  it('returns null for missing selection', () => {
    expect(resolveRefFromSelections({ ref: 5, field: 'target' }, selections)).toBeNull();
  });

  it('passes through non-ref values unchanged', () => {
    expect(resolveRefFromSelections('ANY_LANE', selections)).toBe('ANY_LANE');
  });
});

// --- Unit Tests: stripChainFields ---

describe('stripChainFields', () => {
  it('strips targeting, conditionals, prompt, destination', () => {
    const chainEffect = {
      type: 'DAMAGE', value: 3,
      targeting: { type: 'DRONE' },
      conditionals: [{ timing: 'PRE' }],
      prompt: 'Select target',
      destination: { type: 'LANE' },
    };
    expect(stripChainFields(chainEffect)).toEqual({ type: 'DAMAGE', value: 3 });
  });

  it('preserves all non-chain fields', () => {
    const chainEffect = { type: 'DAMAGE', value: 2, damageType: 'ION', markedBonus: 2, targeting: { type: 'DRONE' } };
    expect(stripChainFields(chainEffect)).toEqual({ type: 'DAMAGE', value: 2, damageType: 'ION', markedBonus: 2 });
  });
});

// --- Unit Tests: PositionTracker ---

describe('PositionTracker', () => {
  it('initializes drone positions from game state', () => {
    const drone = createDrone({ id: 'drone1', owner: 'player1' });
    const states = createGameState({ dronesOnBoard: { lane1: [drone], lane2: [], lane3: [] } });
    const tracker = new PositionTracker(states);
    expect(tracker.getDronePosition('drone1')).toEqual({ lane: 'lane1', playerId: 'player1' });
  });

  it('tracks drone moves', () => {
    const drone = createDrone({ id: 'drone1', owner: 'player1' });
    const states = createGameState({ dronesOnBoard: { lane1: [drone], lane2: [], lane3: [] } });
    const tracker = new PositionTracker(states);
    tracker.recordMove('drone1', 'lane2');
    expect(tracker.getDronePosition('drone1')).toEqual({ lane: 'lane2', playerId: 'player1' });
  });

  it('tracks discarded cards', () => {
    const tracker = new PositionTracker(createGameState());
    tracker.recordDiscard('card_123');
    expect(tracker.isCardDiscarded('card_123')).toBe(true);
    expect(tracker.isCardDiscarded('card_456')).toBe(false);
  });

  it('returns drones in a specific lane for a player', () => {
    const d1 = createDrone({ id: 'd1', owner: 'player1' });
    const d2 = createDrone({ id: 'd2', owner: 'player1' });
    const d3 = createDrone({ id: 'd3', owner: 'player2' });
    const states = createGameState(
      { dronesOnBoard: { lane1: [d1, d2], lane2: [], lane3: [] } },
      { dronesOnBoard: { lane1: [d3], lane2: [], lane3: [] } },
    );
    const tracker = new PositionTracker(states);
    expect(tracker.getDronesInLane('lane1', 'player1')).toEqual(['d1', 'd2']);
    expect(tracker.getDronesInLane('lane1', 'player2')).toEqual(['d3']);
    expect(tracker.getDronesInLane('lane2', 'player1')).toEqual([]);
  });
});

// --- Integration Tests: EffectChainProcessor ---

describe('EffectChainProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new EffectChainProcessor();
    mockMoveTriggerEvents = [];
    mockMoveMineEvents = [];
    mockMoveTriggerSteps = [];
    mockMovePerEffect = {};
    mockMoveEffectCounter = 0;
    mockTriggerResult = null;
  });

  describe('payCardCosts', () => {
    it('deducts energy cost', () => {
      const states = createGameState({ energy: 10 });
      const result = processor.payCardCosts({ cost: 3 }, 'player1', states);
      expect(result.player1.energy).toBe(7);
    });

    it('deducts momentum cost', () => {
      const states = createGameState({ energy: 10, momentum: 2 });
      const result = processor.payCardCosts({ cost: 0, momentumCost: 1 }, 'player1', states);
      expect(result.player1.momentum).toBe(1);
    });

    it('does not mutate original states', () => {
      const states = createGameState({ energy: 10 });
      processor.payCardCosts({ cost: 5 }, 'player1', states);
      expect(states.player1.energy).toBe(10);
    });
  });

  describe('finishCardPlay', () => {
    it('removes card from hand and adds to discard pile', () => {
      const card = { id: 'c1', instanceId: 'inst1', effects: [{ type: 'DRAW' }] };
      const states = createGameState({ hand: [card], discardPile: [] });
      const result = processor.finishCardPlay(card, 'player1', states, false);
      expect(result.newPlayerStates.player1.hand).toHaveLength(0);
      expect(result.newPlayerStates.player1.discardPile).toHaveLength(1);
    });

    it('shouldEndTurn is false when effect has goAgain', () => {
      const card = { id: 'c1', instanceId: 'inst1', effects: [{ type: 'DRAW', goAgain: true }] };
      const states = createGameState({ hand: [card] });
      const result = processor.finishCardPlay(card, 'player1', states, false);
      expect(result.shouldEndTurn).toBe(false);
    });

    it('shouldEndTurn is false when dynamic goAgain', () => {
      const card = { id: 'c1', instanceId: 'inst1', effects: [{ type: 'DRAW' }] };
      const states = createGameState({ hand: [card] });
      const result = processor.finishCardPlay(card, 'player1', states, true);
      expect(result.shouldEndTurn).toBe(false);
    });
  });

  describe('processEffectChain — single-effect chains', () => {
    it('processes DRAW effect', () => {
      const card = {
        id: 'test_draw', instanceId: 'inst_draw', name: 'Test Draw', cost: 1,
        effects: [{ type: 'DRAW', value: 1, targeting: { type: 'NONE' } }],
      };
      const states = createGameState({ energy: 5, hand: [card], deck: [{ id: 'drawn1', instanceId: 'drawn1' }] });
      const result = processor.processEffectChain(card, [{ target: null }], 'player1', createCtx(states));

      expect(result.newPlayerStates.player1.energy).toBe(4);
      expect(result.newPlayerStates.player1.hand).toHaveLength(1);
      expect(result.animationEvents.some(e => e.type === 'CARD_REVEAL')).toBe(true);
    });

    it('processes DAMAGE effect against target drone', () => {
      const target = createDrone({ id: 'enemy1', hull: 5, shields: 0, owner: 'player2' });
      const card = {
        id: 'test_dmg', instanceId: 'inst_dmg', name: 'Test Dmg', cost: 2,
        effects: [{ type: 'DAMAGE', value: 3, targeting: { type: 'DRONE' } }],
      };
      const states = createGameState(
        { energy: 5, hand: [card] },
        { dronesOnBoard: { lane1: [target], lane2: [], lane3: [] } },
      );
      const result = processor.processEffectChain(card, [{ target, lane: 'lane1' }], 'player1', createCtx(states));

      expect(result.newPlayerStates.player1.energy).toBe(3);
      expect(result.newPlayerStates.player2.dronesOnBoard.lane1[0].hull).toBe(2);
    });

    it('processes EXHAUST_DRONE effect', () => {
      const target = createDrone({ id: 'f1', isExhausted: false, owner: 'player1' });
      const card = {
        id: 'test_ex', instanceId: 'inst_ex', name: 'Test Exhaust', cost: 0,
        effects: [{ type: 'EXHAUST_DRONE', targeting: { type: 'DRONE' } }],
      };
      const states = createGameState({ energy: 5, hand: [card], dronesOnBoard: { lane1: [target], lane2: [], lane3: [] } });
      const result = processor.processEffectChain(card, [{ target, lane: 'lane1' }], 'player1', createCtx(states));

      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].isExhausted).toBe(true);
    });
  });

  describe('processEffectChain — multi-effect chains', () => {
    it('processes 2-effect EXHAUST chain (Feint pattern)', () => {
      const friendly = createDrone({ id: 'f1', isExhausted: false, owner: 'player1' });
      const enemy = createDrone({ id: 'e1', isExhausted: false, owner: 'player2' });
      const card = {
        id: 'feint', instanceId: 'inst_feint', name: 'Feint', cost: 0,
        effects: [
          { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' } },
          { type: 'EXHAUST_DRONE', targeting: { type: 'DRONE', affinity: 'ENEMY', location: { ref: 0, field: 'sourceLane' } } },
        ],
      };
      const states = createGameState(
        { hand: [card], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
        { dronesOnBoard: { lane1: [enemy], lane2: [], lane3: [] } },
      );
      const selections = [
        { target: friendly, lane: 'lane1' },
        { target: enemy, lane: 'lane1' },
      ];
      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].isExhausted).toBe(true);
      expect(result.newPlayerStates.player2.dronesOnBoard.lane1[0].isExhausted).toBe(true);
    });

    it('processes DISCARD_CARD + MODIFY_STAT chain (Sacrifice for Power pattern)', () => {
      const sacrificedCard = { id: 'sac', instanceId: 'sac_inst', cost: 3, name: 'Sacrificed' };
      const target = createDrone({ id: 'f1', attack: 2, owner: 'player1' });
      const card = {
        id: 'sacrifice', instanceId: 'inst_sac', name: 'Sacrifice', cost: 0,
        effects: [
          { type: 'DISCARD_CARD', targeting: { type: 'CARD_IN_HAND' } },
          { type: 'MODIFY_STAT', mod: { stat: 'attack', value: { ref: 0, field: 'cardCost' } }, targeting: { type: 'DRONE' } },
        ],
      };
      const states = createGameState({
        hand: [card, sacrificedCard],
        dronesOnBoard: { lane1: [target], lane2: [], lane3: [] },
      });
      const selections = [
        { target: sacrificedCard },
        { target, lane: 'lane1' },
      ];
      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      // Sacrificed card should be in discard
      expect(result.newPlayerStates.player1.discardPile.some(c => c.id === 'sac')).toBe(true);
      // Drone should have +3 attack (from sacrificed card cost)
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].attack).toBe(5);
    });

    it('processes SINGLE_MOVE + SINGLE_MOVE chain (Forced Repositioning pattern)', () => {
      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const enemy = createDrone({ id: 'e1', owner: 'player2' });
      const card = {
        id: 'forced_repo', instanceId: 'inst_fr', name: 'Forced Repo', cost: 1,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'ENEMY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
        { dronesOnBoard: { lane1: [enemy], lane2: [], lane3: [] } },
      );
      const selections = [
        { target: friendly, lane: 'lane1', destination: 'lane2' },
        { target: enemy, lane: 'lane1', destination: 'lane2' },
      ];
      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      expect(result.newPlayerStates.player1.energy).toBe(4);
      // Friendly drone moved from lane1 to lane2
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1).toHaveLength(0);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2).toHaveLength(1);
      // Enemy drone moved from lane1 to lane2
      expect(result.newPlayerStates.player2.dronesOnBoard.lane1).toHaveLength(0);
      expect(result.newPlayerStates.player2.dronesOnBoard.lane2).toHaveLength(1);
    });
  });

  describe('processEffectChain — skipped effects', () => {
    it('skips effects with null selection', () => {
      const card = {
        id: 'test_skip', instanceId: 'inst_skip', name: 'Skip', cost: 0,
        effects: [
          { type: 'DRAW', value: 1, targeting: { type: 'NONE' } },
          { type: 'DRAW', value: 1, targeting: { type: 'NONE' } },
        ],
      };
      const states = createGameState({ hand: [card], deck: [{ id: 'd1' }, { id: 'd2' }] });
      const result = processor.processEffectChain(card, [{ target: null }, null], 'player1', createCtx(states));

      // Only 1 card drawn (second effect skipped)
      expect(result.newPlayerStates.player1.hand).toHaveLength(1);
    });

    it('skips effects when target is dead (invalidated)', () => {
      const deadDrone = createDrone({ id: 'dead1', owner: 'player2' });
      const card = {
        id: 'test_dead', instanceId: 'inst_dead', name: 'Dead Target', cost: 0,
        effects: [{ type: 'DAMAGE', value: 3, targeting: { type: 'DRONE' } }],
      };
      // Drone not on any board
      const states = createGameState({ hand: [card] });
      const result = processor.processEffectChain(card, [{ target: deadDrone, lane: 'lane1' }], 'player1', createCtx(states));

      expect(result.newPlayerStates).toBeDefined();
      expect(result.shouldEndTurn).toBe(true);
    });
  });

  describe('processEffectChain — conditionals', () => {
    it('applies PRE BONUS_DAMAGE conditional', () => {
      const target = createDrone({ id: 'e1', hull: 10, owner: 'player2' });
      const card = {
        id: 'test_cond', instanceId: 'inst_cond', name: 'Conditional', cost: 0,
        effects: [{
          type: 'DAMAGE', value: 2,
          targeting: { type: 'DRONE' },
          conditionals: [{ timing: 'PRE', condition: {}, grantedEffect: { type: 'BONUS_DAMAGE', value: 3 } }],
        }],
      };
      const states = createGameState(
        { hand: [card] },
        { dronesOnBoard: { lane1: [target], lane2: [], lane3: [] } },
      );
      const result = processor.processEffectChain(card, [{ target, lane: 'lane1' }], 'player1', createCtx(states));

      // 2 base + 3 bonus = 5 damage → hull should be 5
      expect(result.newPlayerStates.player2.dronesOnBoard.lane1[0].hull).toBe(5);
    });

    it('grants GO_AGAIN from POST conditional', () => {
      const target = createDrone({ id: 'e1', hull: 10, owner: 'player2' });
      const card = {
        id: 'test_ga', instanceId: 'inst_ga', name: 'GoAgain', cost: 0,
        effects: [{
          type: 'DAMAGE', value: 1,
          targeting: { type: 'DRONE' },
          conditionals: [{ timing: 'POST', condition: {}, grantedEffect: { type: 'GO_AGAIN' } }],
        }],
      };
      const states = createGameState(
        { hand: [card] },
        { dronesOnBoard: { lane1: [target], lane2: [], lane3: [] } },
      );
      const result = processor.processEffectChain(card, [{ target, lane: 'lane1' }], 'player1', createCtx(states));

      expect(result.shouldEndTurn).toBe(false);
    });
  });

  describe('processEffectChain — DISCARD_CARD', () => {
    it('removes card from hand', () => {
      const discardTarget = { id: 'sac', instanceId: 'sac_inst', cost: 3, name: 'Sacrificed' };
      const card = {
        id: 'test_dis', instanceId: 'inst_dis', name: 'Discard', cost: 0,
        effects: [{ type: 'DISCARD_CARD', targeting: { type: 'CARD_IN_HAND' } }],
      };
      const states = createGameState({ hand: [card, discardTarget], discardPile: [] });
      const result = processor.processEffectChain(card, [{ target: discardTarget }], 'player1', createCtx(states));

      // Both played card and discarded card gone from hand
      expect(result.newPlayerStates.player1.hand).toHaveLength(0);
      expect(result.newPlayerStates.player1.discardPile).toHaveLength(2);
    });
  });

  describe('processEffectChain — trigger event deferral', () => {
    it('defers trigger events with STATE_SNAPSHOT before TRIGGER_FIRED for movement', () => {
      // Set up mock trigger events that the movement processor will return
      mockMoveTriggerEvents = [
        { type: 'TRIGGER_FIRED', triggerName: 'Rally Beacon', timestamp: Date.now() }
      ];

      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const card = {
        id: 'move_card', instanceId: 'inst_move', name: 'Move Card', cost: 1,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'], goAgain: true },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
      );
      const selections = [{ target: friendly, lane: 'lane1', destination: 'lane2' }];
      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      // Find STATE_SNAPSHOT and TRIGGER_FIRED in animation events
      const snapshotIdx = result.animationEvents.findIndex(e => e.type === 'STATE_SNAPSHOT');
      const triggerIdx = result.animationEvents.findIndex(e => e.type === 'TRIGGER_FIRED');

      expect(snapshotIdx).toBeGreaterThan(-1);
      expect(triggerIdx).toBeGreaterThan(-1);
      // STATE_SNAPSHOT must appear BEFORE TRIGGER_FIRED
      expect(snapshotIdx).toBeLessThan(triggerIdx);
    });

    it('removes played card from hand in STATE_SNAPSHOT events', () => {
      mockMoveTriggerEvents = [
        { type: 'TRIGGER_FIRED', triggerName: 'Rally Beacon', timestamp: Date.now() }
      ];

      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const card = {
        id: 'move_card', instanceId: 'inst_move', name: 'Move Card', cost: 1,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'], goAgain: true },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], discardPile: [], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
      );
      const selections = [{ target: friendly, lane: 'lane1', destination: 'lane2' }];
      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      const snapshotEvent = result.animationEvents.find(e => e.type === 'STATE_SNAPSHOT');
      expect(snapshotEvent).toBeDefined();
      // Card should be removed from hand in the snapshot
      const snapshotHand = snapshotEvent.snapshotPlayerStates.player1.hand;
      expect(snapshotHand.some(c => c.instanceId === 'inst_move')).toBe(false);
      // Card should be in discard pile in the snapshot
      const snapshotDiscard = snapshotEvent.snapshotPlayerStates.player1.discardPile;
      expect(snapshotDiscard.some(c => c.instanceId === 'inst_move')).toBe(true);
    });

    it('CARD_REVEAL and CARD_VISUAL appear before STATE_SNAPSHOT', () => {
      mockMoveTriggerEvents = [
        { type: 'TRIGGER_FIRED', triggerName: 'Mine', timestamp: Date.now() }
      ];

      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const card = {
        id: 'move_card', instanceId: 'inst_move2', name: 'Move Card', cost: 0,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
      );
      const selections = [{ target: friendly, lane: 'lane1', destination: 'lane2' }];
      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      const revealIdx = result.animationEvents.findIndex(e => e.type === 'CARD_REVEAL');
      const snapshotIdx = result.animationEvents.findIndex(e => e.type === 'STATE_SNAPSHOT');
      const triggerIdx = result.animationEvents.findIndex(e => e.type === 'TRIGGER_FIRED');

      expect(revealIdx).toBeGreaterThan(-1);
      expect(snapshotIdx).toBeGreaterThan(-1);
      // CARD_REVEAL before STATE_SNAPSHOT before TRIGGER_FIRED
      expect(revealIdx).toBeLessThan(snapshotIdx);
      expect(snapshotIdx).toBeLessThan(triggerIdx);
    });

    it('no STATE_SNAPSHOT when there are no trigger events', () => {
      // No mock trigger events — default empty arrays
      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const card = {
        id: 'move_card', instanceId: 'inst_move3', name: 'Move Card', cost: 0,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
      );
      const selections = [{ target: friendly, lane: 'lane1', destination: 'lane2' }];
      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      const snapshotEvents = result.animationEvents.filter(e => e.type === 'STATE_SNAPSHOT');
      expect(snapshotEvents).toHaveLength(0);
    });

    it('pre-teleport STATE_SNAPSHOT uses pre-trigger state when ON_CARD_PLAY triggers fire', () => {
      // Simulate: deploy a token (DEPLOY effect), ON_CARD_PLAY trigger draws a card + buffs a drone.
      // The first STATE_SNAPSHOT (for teleport) must NOT contain the drawn card or the buff.
      const controller = createDrone({ id: 'shrike', attack: 2, owner: 'player1' });
      const drawnCard = { id: 'drawn1', instanceId: 'drawn_inst', name: 'Drawn Card' };
      const card = {
        id: 'deploy_mine', instanceId: 'inst_mine', name: 'Deploy Proximity Mine', cost: 1,
        effects: [{ type: 'GAIN_ENERGY', value: 0, targeting: { type: 'NONE' } }],
      };

      const states = createGameState({
        energy: 5,
        hand: [card],
        deck: [drawnCard],
        dronesOnBoard: { lane1: [controller], lane2: [], lane3: [] },
      });

      // Configure ON_CARD_PLAY trigger to draw a card and buff the controller
      mockTriggerResult = {
        mutate: (newStates) => {
          // Simulate Shrike drawing a card
          if (newStates.player1.deck.length > 0) {
            newStates.player1.hand.push(newStates.player1.deck.shift());
          }
          // Simulate Odin buffing attack
          const drone = newStates.player1.dronesOnBoard.lane1.find(d => d.id === 'shrike');
          if (drone) drone.attack += 1;
        },
        animationEvents: [
          { type: 'TRIGGER_FIRED', triggerName: 'Shrike', timestamp: Date.now() },
          { type: 'TRIGGER_FIRED', triggerName: 'Odin', timestamp: Date.now() },
        ],
      };

      const selections = [{ target: null }];
      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      // Find the first STATE_SNAPSHOT (the pre-teleport one, before deferred trigger snapshots)
      const firstSnapshot = result.animationEvents.find(e => e.type === 'STATE_SNAPSHOT');
      expect(firstSnapshot).toBeDefined();

      const snapshotP1 = firstSnapshot.snapshotPlayerStates.player1;

      // The drawn card should NOT be in hand in the first snapshot
      expect(snapshotP1.hand.some(c => c.id === 'drawn1')).toBe(false);

      // The controller should NOT have the trigger buff in the first snapshot
      const snapshotController = snapshotP1.dronesOnBoard.lane1.find(d => d.id === 'shrike');
      expect(snapshotController.attack).toBe(2); // original, not 3

      // But the final state SHOULD have both trigger effects
      expect(result.newPlayerStates.player1.hand.some(c => c.id === 'drawn1')).toBe(true);
      const finalController = result.newPlayerStates.player1.dronesOnBoard.lane1.find(d => d.id === 'shrike');
      expect(finalController.attack).toBe(3);
    });

    it('inserts TRIGGER_CHAIN_PAUSE between STATE_SNAPSHOT and deferred trigger events', () => {
      mockMoveTriggerEvents = [
        { type: 'TRIGGER_FIRED', triggerName: 'Mine', timestamp: Date.now() }
      ];

      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const card = {
        id: 'move_card', instanceId: 'inst_pause1', name: 'Move Card', cost: 0,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
      );
      const selections = [{ target: friendly, lane: 'lane1', destination: 'lane2' }];
      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      const snapshotIdx = result.animationEvents.findIndex(e => e.type === 'STATE_SNAPSHOT');
      const pauseIdx = result.animationEvents.findIndex(e => e.type === 'TRIGGER_CHAIN_PAUSE');
      const triggerIdx = result.animationEvents.findIndex(e => e.type === 'TRIGGER_FIRED');

      expect(pauseIdx).toBeGreaterThan(-1);
      expect(pauseIdx).toBeGreaterThan(snapshotIdx);
      expect(pauseIdx).toBeLessThan(triggerIdx);
      expect(result.animationEvents[pauseIdx].duration).toBe(400);
    });

    it('does not insert TRIGGER_CHAIN_PAUSE when there are no deferred trigger events', () => {
      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const card = {
        id: 'move_card', instanceId: 'inst_pause2', name: 'Move Card', cost: 0,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
      );
      const selections = [{ target: friendly, lane: 'lane1', destination: 'lane2' }];
      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      const pauseEvents = result.animationEvents.filter(e => e.type === 'TRIGGER_CHAIN_PAUSE');
      expect(pauseEvents).toHaveLength(0);
    });
  });

  describe('processEffectChain — forward-propagation of card movements', () => {
    it('stateBeforeTriggers shows enemy drone in new lane after Forced Reposition', () => {
      // Forced Repositioning: effect[0] moves friendly (triggers mine on friendly),
      // effect[1] moves enemy. stateBeforeTriggers is captured during effect[0] and
      // must be patched to include effect[1]'s enemy movement.
      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const enemy = createDrone({ id: 'e1', owner: 'player2' });
      const card = {
        id: 'forced_repo', instanceId: 'inst_fr_prop', name: 'Forced Repo', cost: 1,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'ENEMY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
        { dronesOnBoard: { lane1: [enemy], lane2: [], lane3: [] } },
      );
      const selections = [
        { target: friendly, lane: 'lane1', destination: 'lane2' },
        { target: enemy, lane: 'lane1', destination: 'lane3' },
      ];

      // effect[0] triggers a mine (so stateBeforeTriggers gets captured)
      mockMovePerEffect = {
        0: {
          triggerEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Proximity Mine', timestamp: Date.now() }],
          triggerSteps: [],
          mineEvents: [],
        },
        1: { triggerEvents: [], triggerSteps: [], mineEvents: [] },
      };

      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      // stateBeforeTriggers (exposed via STATE_SNAPSHOT in animationEvents) must show
      // enemy drone in lane3, not lane1
      const snapshot = result.animationEvents.find(e => e.type === 'STATE_SNAPSHOT');
      expect(snapshot).toBeDefined();
      const snapshotP2Board = snapshot.snapshotPlayerStates.player2.dronesOnBoard;
      expect(snapshotP2Board.lane1).toHaveLength(0);
      expect(snapshotP2Board.lane3).toHaveLength(1);
      expect(snapshotP2Board.lane3[0].id).toBe('e1');

      // stateBeforeTriggers is only returned when actionSteps exist (none here),
      // so the STATE_SNAPSHOT assertion above covers the propagation path.
    });

    it('forward-propagates movement into earlier trigger steps stateAfter', () => {
      // effect[0] moves friendly, has trigger steps with stateAfter
      // effect[1] moves enemy — earlier steps' stateAfter must include enemy move
      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const enemy = createDrone({ id: 'e1', owner: 'player2' });
      const card = {
        id: 'forced_repo', instanceId: 'inst_fr_steps', name: 'Forced Repo', cost: 1,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'ENEMY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
        { dronesOnBoard: { lane1: [enemy], lane2: [], lane3: [] } },
      );
      const selections = [
        { target: friendly, lane: 'lane1', destination: 'lane2' },
        { target: enemy, lane: 'lane1', destination: 'lane3' },
      ];

      // effect[0] returns trigger steps with stateAfter showing enemy still in lane1
      const staleStateAfter = JSON.parse(JSON.stringify(states));
      // Simulate friendly already moved to lane2 in stateAfter
      staleStateAfter.player1.dronesOnBoard.lane1 = [];
      staleStateAfter.player1.dronesOnBoard.lane2 = [{ ...friendly }];
      // But enemy is still in lane1 (stale)
      mockMovePerEffect = {
        0: {
          triggerEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Heal Drone', timestamp: Date.now() }],
          triggerSteps: [{ type: 'TRIGGER', triggerName: 'Heal Drone', stateAfter: staleStateAfter }],
          mineEvents: [],
        },
        1: { triggerEvents: [], triggerSteps: [], mineEvents: [] },
      };

      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      // The trigger step's stateAfter must now show enemy in lane3
      expect(result.actionSteps).toBeDefined();
      expect(result.actionSteps).toHaveLength(1);
      const stepStateAfter = result.actionSteps[0].stateAfter;
      expect(stepStateAfter.player2.dronesOnBoard.lane1).toHaveLength(0);
      expect(stepStateAfter.player2.dronesOnBoard.lane3).toHaveLength(1);
      expect(stepStateAfter.player2.dronesOnBoard.lane3[0].id).toBe('e1');
    });

    it('no forward-propagation needed for single-effect cards', () => {
      // Single move with triggers — no later effects to propagate
      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const card = {
        id: 'move_card', instanceId: 'inst_single', name: 'Single Move', cost: 0,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
      );
      const selections = [{ target: friendly, lane: 'lane1', destination: 'lane2' }];

      mockMovePerEffect = {
        0: {
          triggerEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Mine', timestamp: Date.now() }],
          triggerSteps: [],
          mineEvents: [],
        },
      };

      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      // Snapshot should show drone in lane2 (normal — captured from effect[0]'s postMovementState)
      const snapshot = result.animationEvents.find(e => e.type === 'STATE_SNAPSHOT');
      expect(snapshot).toBeDefined();
      const board = snapshot.snapshotPlayerStates.player1.dronesOnBoard;
      expect(board.lane1).toHaveLength(0);
      expect(board.lane2).toHaveLength(1);
    });
  });
});
