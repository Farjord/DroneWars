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

const makeTechDrone = (id = 'tech-drone-1', name = 'Shield Booster') => ({
  id,
  name,
  type: 'Tech',
  hull: 2,
  maxHull: 2,
  shields: 0,
  maxShields: 0,
});

const makeCtx = (stateOverrides = {}) => {
  const defaultState = {
    player1: {
      hand: [], deck: [], discardPile: [], name: 'Player 1',
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {},
      activeDronePool: [],
      techSlots: { lane1: [], lane2: [], lane3: [] },
    },
    player2: {
      hand: [], deck: [], discardPile: [], name: 'Player 2',
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {},
      activeDronePool: [],
      techSlots: { lane1: [], lane2: [], lane3: [] },
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

describe('CardActionStrategy — tech target resolution', () => {
  let mockProcessor;
  const systemPurge = {
    id: 'SYSTEM_PURGE',
    name: 'System Purge',
    type: 'Tactic',
    cost: 2,
    effects: [{ type: 'DESTROY_TECH', targeting: { type: 'TECH', affinity: 'ANY', location: 'ANY_LANE' } }],
  };

  beforeEach(async () => {
    mockProcessor = await getMockProcessor();
    mockProcessor.processEffectChain.mockReset();
    mockProcessor.processEffectChain.mockReturnValue({
      newPlayerStates: { player1: {}, player2: {} },
      animationEvents: [],
      shouldEndTurn: true,
    });
  });

  it('resolves tech target from techSlots when targetId matches', async () => {
    const tech = makeTechDrone('tech-drone-1', 'Shield Booster');
    const ctx = makeCtx({
      player2: {
        hand: [], deck: [], discardPile: [], name: 'Player 2',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        shipSections: {},
        activeDronePool: [],
        techSlots: { lane1: [tech], lane2: [], lane3: [] },
      },
    });

    await processCardPlay(
      { card: systemPurge, targetId: 'tech-drone-1', playerId: 'player1' },
      ctx
    );

    // Verify processEffectChain was called with the resolved tech target
    const chainCall = mockProcessor.processEffectChain.mock.calls[0];
    const selections = chainCall[1]; // second arg is selections
    expect(selections).toHaveLength(1);
    expect(selections[0].target).toMatchObject({
      id: 'tech-drone-1',
      name: 'Shield Booster',
      owner: 'player2',
    });
    expect(selections[0].lane).toBe('lane1');
  });

  it('resolves tech target from player1 techSlots too', async () => {
    const tech = makeTechDrone('tech-drone-2', 'Repair Module');
    const ctx = makeCtx({
      player1: {
        hand: [], deck: [], discardPile: [], name: 'Player 1',
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        shipSections: {},
        activeDronePool: [],
        techSlots: { lane1: [], lane2: [tech], lane3: [] },
      },
    });

    await processCardPlay(
      { card: systemPurge, targetId: 'tech-drone-2', playerId: 'player2' },
      ctx
    );

    const chainCall = mockProcessor.processEffectChain.mock.calls[0];
    const selections = chainCall[1];
    expect(selections[0].target).toMatchObject({
      id: 'tech-drone-2',
      name: 'Repair Module',
      owner: 'player1',
    });
    expect(selections[0].lane).toBe('lane2');
  });

  it('passes null target gracefully when targetId not found anywhere', async () => {
    const ctx = makeCtx();

    await processCardPlay(
      { card: systemPurge, targetId: 'nonexistent-id', playerId: 'player1' },
      ctx
    );

    const chainCall = mockProcessor.processEffectChain.mock.calls[0];
    const selections = chainCall[1];
    expect(selections).toHaveLength(1);
    expect(selections[0].target).toBeNull();
    expect(selections[0].lane).toBeNull();
  });
});
