import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock EffectChainProcessor before importing CardActionStrategy
vi.mock('../../cards/EffectChainProcessor.js', () => {
  const mockProcessor = {
    processEffectChain: vi.fn(),
  };
  return {
    default: class MockEffectChainProcessor {
      constructor() {
        return mockProcessor;
      }
    },
    __mockProcessor: mockProcessor,
  };
});

vi.mock('../../gameLogic.js', () => ({
  gameEngine: {
    updateAuras: vi.fn(),
    payCardCosts: vi.fn((card, playerId, states) => states),
    finishCardPlay: vi.fn((card, playerId, states) => ({
      newPlayerStates: states,
      shouldEndTurn: true,
    })),
  },
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

vi.mock('../../../utils/seededRandom.js', () => ({
  default: { fromGameState: vi.fn(() => ({ shuffle: vi.fn(arr => arr) })) },
}));

import { processCardPlay } from '../CardActionStrategy.js';

const getMockProcessor = async () => {
  const mod = await import('../../cards/EffectChainProcessor.js');
  return mod.__mockProcessor;
};

const makeDrone = (id, name = 'Scout') => ({
  id,
  name,
  hull: 3,
  maxHull: 3,
  attack: 2,
  speed: 4,
  shields: 0,
  maxShields: 0,
  owner: undefined, // populated by target resolution
});

const makeCtx = (stateOverrides = {}) => {
  const defaultState = {
    player1: {
      hand: [], deck: [], discardPile: [], name: 'Player 1',
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {},
      activeDronePool: [],
      techSlots: { lane1: [], lane2: [], lane3: [] },
      energy: 10,
    },
    player2: {
      hand: [], deck: [], discardPile: [], name: 'Player 2',
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {},
      activeDronePool: [],
      techSlots: { lane1: [], lane2: [], lane3: [] },
      energy: 10,
    },
    actionsTakenThisTurn: 0,
    gameSeed: 'test-seed',
    roundNumber: 1,
    ...stateOverrides,
  };

  return {
    getState: vi.fn(() => defaultState),
    getPlacedSections: vi.fn(() => ({})),
    addLogEntry: vi.fn(),
    processAttack: vi.fn(),
    getLocalPlayerId: vi.fn(() => 'player1'),
    isPlayerAI: vi.fn(() => false),
    setState: vi.fn(),
    mapAnimationEvents: vi.fn(() => []),
    captureAnimations: vi.fn(),
    setPlayerStates: vi.fn(),
    checkWinCondition: vi.fn(),
    executeGoAgainAnimation: vi.fn(),
    getAnimationManager: vi.fn(() => ({ animations: {} })),
    executeAndCaptureAnimations: vi.fn(),
  };
};

const modifyStatCard = {
  id: 'MARK_EXPLOIT',
  name: 'Mark Exploit',
  type: 'Support',
  cost: 0,
  effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'temporary' }, targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } }],
};

describe('CardActionStrategy — drone target resolution', () => {
  let mockProcessor;

  beforeEach(async () => {
    mockProcessor = await getMockProcessor();
    mockProcessor.processEffectChain.mockReset();
    mockProcessor.processEffectChain.mockReturnValue({
      newPlayerStates: { player1: {}, player2: {} },
      animationEvents: [],
      shouldEndTurn: true,
    });
  });

  it('includes lane on drone target when drone is in opponent lane2', async () => {
    const drone = makeDrone('enemy-drone-1', 'Dart');
    const ctx = makeCtx({
      player2: {
        hand: [], deck: [], discardPile: [], name: 'Player 2',
        dronesOnBoard: { lane1: [], lane2: [drone], lane3: [] },
        shipSections: {},
        activeDronePool: [],
        techSlots: { lane1: [], lane2: [], lane3: [] },
        energy: 10,
      },
    });

    await processCardPlay(
      { card: modifyStatCard, targetId: 'enemy-drone-1', playerId: 'player1' },
      ctx
    );

    const chainCall = mockProcessor.processEffectChain.mock.calls[0];
    const selections = chainCall[1];
    expect(selections).toHaveLength(1);
    expect(selections[0].target.lane).toBe('lane2');
  });

  it('includes lane on drone target when drone is in player1 lane3', async () => {
    const drone = makeDrone('friendly-drone-1', 'Interceptor');
    const ctx = makeCtx({
      player1: {
        hand: [], deck: [], discardPile: [], name: 'Player 1',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [drone] },
        shipSections: {},
        activeDronePool: [],
        techSlots: { lane1: [], lane2: [], lane3: [] },
        energy: 10,
      },
    });

    await processCardPlay(
      { card: modifyStatCard, targetId: 'friendly-drone-1', playerId: 'player1' },
      ctx
    );

    const chainCall = mockProcessor.processEffectChain.mock.calls[0];
    const selections = chainCall[1];
    expect(selections[0].target.lane).toBe('lane3');
  });

  it('includes lane on drone target when drone is in lane1', async () => {
    const drone = makeDrone('drone-in-lane1', 'Sentinel');
    const ctx = makeCtx({
      player1: {
        hand: [], deck: [], discardPile: [], name: 'Player 1',
        dronesOnBoard: { lane1: [drone], lane2: [], lane3: [] },
        shipSections: {},
        activeDronePool: [],
        techSlots: { lane1: [], lane2: [], lane3: [] },
        energy: 10,
      },
    });

    await processCardPlay(
      { card: modifyStatCard, targetId: 'drone-in-lane1', playerId: 'player1' },
      ctx
    );

    const chainCall = mockProcessor.processEffectChain.mock.calls[0];
    const selections = chainCall[1];
    expect(selections[0].target.lane).toBe('lane1');
  });
});
