import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock TriggerProcessor (imported by EffectChainProcessor for ON_CARD_PLAY)
// Configurable: set mockTriggerResult before a test to simulate ON_CARD_PLAY triggers
let mockTriggerResult = null;
let capturedPreCondContext = null;
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
        // CREATE_TOKENS: place a token drone and emit TELEPORT_IN
        if (effect.type === 'CREATE_TOKENS') {
          const newStates = JSON.parse(JSON.stringify(context.playerStates));
          const lane = context.target?.id || 'lane1';
          const token = { id: `token_${Date.now()}`, name: effect.tokenName || 'Token', hull: 1, attack: 1, isToken: true };
          newStates[context.actingPlayerId].dronesOnBoard[lane].push(token);
          return {
            newPlayerStates: newStates,
            animationEvents: [{ type: 'TELEPORT_IN', sourceId: token.id, lane, playerId: context.actingPlayerId }],
            additionalEffects: [],
          };
        }
        return null;
      }
      hasProcessor(type) { return ['DAMAGE', 'DRAW', 'EXHAUST_DRONE', 'MODIFY_STAT', 'GAIN_ENERGY', 'CREATE_TOKENS'].includes(type); }
    }
  };
});

// Mock ConditionalEffectProcessor
vi.mock('../../effects/conditional/ConditionalEffectProcessor.js', () => {
  return {
    default: class MockConditionalProcessor {
      processPreConditionals(conditionals, effect, context) {
        capturedPreCondContext = context;
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
// Per-effect overrides: { [effectIndex]: { triggerEvents, mineEvents } }
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
        };
      }
    }
  };
});

import EffectChainProcessor, {
  PositionTracker,
  resolveRef,
  resolveRefFromSelections,
} from '../EffectChainProcessor';
import { stripChainFields } from '../chainConstants.js';

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
    isPlayerAI: (pid) => pid === 'player2',
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
  it('strips conditionals, prompt, destination but preserves targeting', () => {
    const chainEffect = {
      type: 'DAMAGE', value: 3,
      targeting: { type: 'DRONE' },
      conditionals: [{ timing: 'PRE' }],
      prompt: 'Select target',
      destination: { type: 'LANE' },
    };
    expect(stripChainFields(chainEffect)).toEqual({ type: 'DAMAGE', value: 3, targeting: { type: 'DRONE' } });
  });

  it('preserves targeting with affectedFilter for filtered effects', () => {
    const chainEffect = {
      type: 'DESTROY',
      targeting: {
        type: 'LANE',
        affinity: 'ENEMY',
        affectedFilter: [{ stat: 'speed', comparison: 'GTE', value: 5 }]
      }
    };
    const stripped = stripChainFields(chainEffect);
    expect(stripped.targeting).toEqual({
      type: 'LANE',
      affinity: 'ENEMY',
      affectedFilter: [{ stat: 'speed', comparison: 'GTE', value: 5 }]
    });
  });

  it('preserves all non-chain fields including targeting', () => {
    const chainEffect = { type: 'DAMAGE', value: 2, damageType: 'ION', markedBonus: 2, targeting: { type: 'DRONE' } };
    expect(stripChainFields(chainEffect)).toEqual({ type: 'DAMAGE', value: 2, damageType: 'ION', markedBonus: 2, targeting: { type: 'DRONE' } });
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
    mockMovePerEffect = {};
    mockMoveEffectCounter = 0;
    mockTriggerResult = null;
    capturedPreCondContext = null;
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

    it('does not skip effects targeting a ship section (alive in shipSections)', () => {
      const sectionTarget = { id: 'bridge', hull: 10, owner: 'player1' };
      const card = {
        id: 'test_heal', instanceId: 'inst_heal', name: 'Emergency Patch', cost: 0,
        effects: [{ type: 'GAIN_ENERGY', value: 1, targeting: { type: 'SHIP_SECTION' } }],
      };
      const states = createGameState({
        hand: [card],
        shipSections: { bridge: { hull: 10, allocatedShields: 5, maxShields: 5 } },
      });
      const result = processor.processEffectChain(card, [{ target: sectionTarget }], 'player1', createCtx(states));

      // Effect should execute (not be skipped) — energy increases by 1
      expect(result.newPlayerStates.player1.energy).toBe(11);
    });

    it('does not skip effects when target has instance ID but name matches shipSections key', () => {
      // Ship section targets from processCardPlay have instance IDs (e.g., 'BRIDGE_001')
      // but shipSections is keyed by section name (e.g., 'bridge')
      const sectionTarget = { id: 'BRIDGE_001', name: 'bridge', hull: 10, owner: 'player2' };
      const card = {
        id: 'test_section', instanceId: 'inst_section', name: 'Section Target', cost: 0,
        effects: [{ type: 'GAIN_ENERGY', value: 1, targeting: { type: 'SHIP_SECTION' } }],
      };
      const states = createGameState({ hand: [card] });
      // Opponent has the section keyed by name
      states.player2.shipSections = { bridge: { hull: 10, allocatedShields: 5, maxShields: 5 } };
      const result = processor.processEffectChain(card, [{ target: sectionTarget }], 'player1', createCtx(states));

      // Effect should execute — target found via target.name fallback
      expect(result.newPlayerStates.player1.energy).toBe(11);
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

    it('forwards actionsTakenThisTurn from callbacks to PRE conditional context', () => {
      const target = createDrone({ id: 'e1', hull: 10, owner: 'player2' });
      const card = {
        id: 'test_momentum', instanceId: 'inst_momentum', name: 'Momentum Card', cost: 0,
        effects: [{
          type: 'DAMAGE', value: 2,
          targeting: { type: 'DRONE' },
          conditionals: [{ timing: 'PRE', condition: { type: 'NOT_FIRST_ACTION' }, grantedEffect: { type: 'BONUS_DAMAGE', value: 2 } }],
        }],
      };
      const states = createGameState(
        { hand: [card] },
        { dronesOnBoard: { lane1: [target], lane2: [], lane3: [] } },
      );
      const ctx = createCtx(states, {
        callbacks: { logCallback: vi.fn(), resolveAttackCallback: vi.fn(), actionsTakenThisTurn: 2 },
      });
      processor.processEffectChain(card, [{ target, lane: 'lane1' }], 'player1', ctx);

      expect(capturedPreCondContext).not.toBeNull();
      expect(capturedPreCondContext.actionsTakenThisTurn).toBe(2);
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

  describe('processEffectChain — multi-effect snapshot isolation', () => {
    it('Effect 0 snapshot does not leak Effect 1 movement', () => {
      // Forced Repositioning: effect[0] moves friendly (triggers mine),
      // effect[1] moves enemy. Effect 0's STATE_SNAPSHOT must show enemy
      // in its ORIGINAL lane, not its destination.
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

      // effect[0] triggers a mine (so intermediateState gets captured)
      mockMovePerEffect = {
        0: {
          triggerEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Proximity Mine', timestamp: Date.now() }],
          mineEvents: [],
        },
        1: { triggerEvents: [], triggerSteps: [], mineEvents: [] },
      };

      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      // Effect 0's STATE_SNAPSHOT must show enemy drone in lane1 (original), NOT lane3
      const snapshot = result.animationEvents.find(e => e.type === 'STATE_SNAPSHOT');
      expect(snapshot).toBeDefined();
      const snapshotP2Board = snapshot.snapshotPlayerStates.player2.dronesOnBoard;
      expect(snapshotP2Board.lane1).toHaveLength(1);
      expect(snapshotP2Board.lane1[0].id).toBe('e1');
      expect(snapshotP2Board.lane3).toHaveLength(0);
    });

    it('single-effect cards produce correct snapshots', () => {
      // Single move with triggers — snapshot shows drone in new lane
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
          mineEvents: [],
        },
      };

      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      // Snapshot should show drone in lane2 (captured from effect[0]'s postMovementState)
      const snapshot = result.animationEvents.find(e => e.type === 'STATE_SNAPSHOT');
      expect(snapshot).toBeDefined();
      const board = snapshot.snapshotPlayerStates.player1.dronesOnBoard;
      expect(board.lane1).toHaveLength(0);
      expect(board.lane2).toHaveLength(1);
    });

    it('multi-effect chain without triggers: each step gets STATE_SNAPSHOT', () => {
      // Two SINGLE_MOVE effects with no triggers. Each step should still get
      // a STATE_SNAPSHOT between them so the UI updates between animations.
      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const enemy = createDrone({ id: 'e1', owner: 'player2' });
      const card = {
        id: 'forced_repo', instanceId: 'inst_fr_multi', name: 'Forced Repo', cost: 1,
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

      // No triggers on either effect
      mockMovePerEffect = {
        0: { triggerEvents: [], mineEvents: [] },
        1: { triggerEvents: [], mineEvents: [] },
      };

      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));

      // There should be a STATE_SNAPSHOT between Effect 0's DRONE_MOVEMENT and Effect 1's DRONE_MOVEMENT
      const eventTypes = result.animationEvents.map(e => e.type);
      const snapshots = result.animationEvents.filter(e => e.type === 'STATE_SNAPSHOT');
      expect(snapshots.length).toBeGreaterThanOrEqual(2);

      // First snapshot should appear after first movement events, before second movement
      const firstSnapshotIdx = eventTypes.indexOf('STATE_SNAPSHOT');
      const secondSnapshotIdx = eventTypes.indexOf('STATE_SNAPSHOT', firstSnapshotIdx + 1);
      expect(firstSnapshotIdx).toBeGreaterThan(-1);
      expect(secondSnapshotIdx).toBeGreaterThan(firstSnapshotIdx);
    });
  });

  describe('processEffectChain — per-effect trigger interleaving', () => {
    it('multi-effect card: effect[0] triggers interleave before effect[1] triggers', () => {
      // Two-move card: both effects trigger. effect[0]'s trigger should
      // appear BEFORE effect[1]'s trigger with separate STATE_SNAPSHOT bridges.
      const friendly1 = createDrone({ id: 'f1', owner: 'player1' });
      const friendly2 = createDrone({ id: 'f2', owner: 'player1' });
      const card = {
        id: 'double_move', instanceId: 'inst_dm', name: 'Double Move', cost: 1,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], dronesOnBoard: { lane1: [friendly1, friendly2], lane2: [], lane3: [] } },
      );
      const selections = [
        { target: friendly1, lane: 'lane1', destination: 'lane2' },
        { target: friendly2, lane: 'lane1', destination: 'lane3' },
      ];

      // Both effects trigger
      mockMovePerEffect = {
        0: {
          triggerEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Effect0 Mine', timestamp: 1 }],
          mineEvents: [],
        },
        1: {
          triggerEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Effect1 Beacon', timestamp: 2 }],
          mineEvents: [],
        },
      };

      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));
      const triggers = result.animationEvents.filter(e => e.type === 'TRIGGER_FIRED');

      expect(triggers).toHaveLength(2);
      // Effect[0]'s trigger should come first (interleaved, not all deferred to end)
      expect(triggers[0].triggerName).toBe('Effect0 Mine');
      expect(triggers[1].triggerName).toBe('Effect1 Beacon');

      // Each trigger should have its own STATE_SNAPSHOT + TRIGGER_CHAIN_PAUSE bridge
      const snapshots = result.animationEvents.filter(e => e.type === 'STATE_SNAPSHOT');
      const pauses = result.animationEvents.filter(e => e.type === 'TRIGGER_CHAIN_PAUSE');
      expect(snapshots.length).toBeGreaterThanOrEqual(2);
      expect(pauses.length).toBeGreaterThanOrEqual(2);
    });

    it('ON_CARD_PLAY triggers appear after all effect steps', () => {
      const friendly = createDrone({ id: 'f1', owner: 'player1' });
      const card = {
        id: 'move_play', instanceId: 'inst_mp', name: 'Move Play', cost: 1,
        effects: [
          { type: 'SINGLE_MOVE', targeting: { type: 'DRONE', affinity: 'FRIENDLY' }, destination: { type: 'LANE' }, properties: ['DO_NOT_EXHAUST'] },
        ],
      };
      const states = createGameState(
        { energy: 5, hand: [card], dronesOnBoard: { lane1: [friendly], lane2: [], lane3: [] } },
      );
      const selections = [{ target: friendly, lane: 'lane1', destination: 'lane2' }];

      // Effect produces trigger, ON_CARD_PLAY also produces trigger
      mockMovePerEffect = {
        0: {
          triggerEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Effect Trigger', timestamp: 1 }],
          mineEvents: [],
        },
      };
      mockTriggerResult = {
        animationEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'ON_CARD_PLAY Trigger', timestamp: 2 }],
      };

      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));
      const triggers = result.animationEvents.filter(e => e.type === 'TRIGGER_FIRED');

      expect(triggers).toHaveLength(2);
      // Effect trigger should come before ON_CARD_PLAY trigger
      expect(triggers[0].triggerName).toBe('Effect Trigger');
      expect(triggers[1].triggerName).toBe('ON_CARD_PLAY Trigger');
    });
  });

  // --- CREATE_TOKENS: STATE_SNAPSHOT should only appear when needed ---
  describe('CREATE_TOKENS — STATE_SNAPSHOT conditions', () => {
    it('single CREATE_TOKENS with no triggers and zero cost: no STATE_SNAPSHOT', () => {
      const target = { id: 'lane1' };
      const card = {
        id: 'scramble-dart', name: 'Scramble Dart', cost: 0,
        effects: [{ type: 'CREATE_TOKENS', tokenName: 'Dart', targeting: { type: 'LANE', affinity: 'FRIENDLY' } }],
      };
      const selections = [{ target, lane: 'lane1' }];
      const states = createGameState();

      mockTriggerResult = null; // No ON_CARD_PLAY triggers

      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));
      const types = result.animationEvents.map(e => e.type);

      expect(types).toContain('TELEPORT_IN');
      expect(types).not.toContain('STATE_SNAPSHOT');
    });

    it('CREATE_TOKENS with ON_CARD_PLAY triggers: STATE_SNAPSHOT IS present', () => {
      const target = { id: 'lane1' };
      const card = {
        id: 'scramble-dart', name: 'Scramble Dart', cost: 1,
        effects: [{ type: 'CREATE_TOKENS', tokenName: 'Dart', targeting: { type: 'LANE', affinity: 'FRIENDLY' } }],
      };
      const selections = [{ target, lane: 'lane1' }];
      const states = createGameState();

      mockTriggerResult = {
        animationEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Deploy Bonus' }],
      };

      const result = processor.processEffectChain(card, selections, 'player1', createCtx(states));
      const types = result.animationEvents.map(e => e.type);

      expect(types).toContain('STATE_SNAPSHOT');
      expect(types).toContain('TELEPORT_IN');
    });
  });
});
