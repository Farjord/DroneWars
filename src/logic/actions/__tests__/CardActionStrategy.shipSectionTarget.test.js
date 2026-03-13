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

const makeCtx = (sectionOverrides = {}) => ({
  getState: vi.fn(() => ({
    player1: {
      hand: [],
      deck: [],
      discardPile: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {
        bridge: { id: 'BRIDGE_001', hull: 5, maxHull: 8, destroyed: false, ...sectionOverrides },
        powerCell: { id: 'POWER_CELL_001', hull: 6, maxHull: 6, destroyed: false },
      },
      activeDronePool: [],
    },
    player2: {
      hand: [],
      deck: [],
      discardPile: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {
        bridge: { id: 'BRIDGE_001', hull: 8, maxHull: 8, destroyed: false },
      },
      activeDronePool: [],
    },
    actionsTakenThisTurn: 0,
    gameSeed: 'test-seed',
    roundNumber: 1,
  })),
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
});

describe('CardActionStrategy — ship section target id', () => {
  let mockProcessor;

  beforeEach(async () => {
    mockProcessor = await getMockProcessor();
    mockProcessor.processEffectChain.mockReset();
  });

  it('constructs ship section target with id matching the section key, not template id', async () => {
    const card = {
      id: 'emergency-patch',
      name: 'Emergency Patch',
      effects: [{ type: 'HEAL_HULL', value: 1, targeting: { type: 'SHIP_SECTION', affinity: 'FRIENDLY' } }],
    };

    const ctx = makeCtx();
    const state = ctx.getState();
    mockProcessor.processEffectChain.mockReturnValue({
      newPlayerStates: { player1: state.player1, player2: state.player2 },
      animationEvents: [],
      logEntries: [],
      shouldEndTurn: true,
    });

    // targetId is the section key 'bridge', not the template id 'BRIDGE_001'
    await processCardPlay({ card, targetId: 'bridge', playerId: 'player1' }, ctx);

    // processEffectChain receives (card, selections, playerId, options)
    // selections[0].target should have id matching the section key
    expect(mockProcessor.processEffectChain).toHaveBeenCalled();
    const callArgs = mockProcessor.processEffectChain.mock.calls[0];
    const selections = callArgs[1];
    const target = selections[0].target;
    expect(target.id).toBe('bridge');
    expect(target.name).toBe('bridge');
    expect(target.owner).toBe('player1');
  });

  it('preserves section key as id even when template has different id field', async () => {
    const card = {
      id: 'emergency-patch-plus',
      name: 'Emergency Patch+',
      effects: [{ type: 'HEAL_HULL', value: 4, targeting: { type: 'SHIP_SECTION', affinity: 'FRIENDLY' } }],
    };

    const ctx = makeCtx();
    const state = ctx.getState();
    mockProcessor.processEffectChain.mockReturnValue({
      newPlayerStates: { player1: state.player1, player2: state.player2 },
      animationEvents: [],
      logEntries: [],
      shouldEndTurn: true,
    });

    await processCardPlay({ card, targetId: 'powerCell', playerId: 'player1' }, ctx);

    const callArgs = mockProcessor.processEffectChain.mock.calls[0];
    const selections = callArgs[1];
    const target = selections[0].target;
    // Must be 'powerCell' (section key), NOT 'POWER_CELL_001' (template id)
    expect(target.id).toBe('powerCell');
    expect(target.name).toBe('powerCell');
  });

  it('player2 targeting own bridge resolves owner to player2, not player1', async () => {
    const card = {
      id: 'shield-boost',
      name: 'Shield Boost',
      effects: [{ type: 'RESTORE_SHIELDS', value: 2, targeting: { type: 'SHIP_SECTION', affinity: 'FRIENDLY' } }],
    };

    const ctx = makeCtx();
    const state = ctx.getState();
    mockProcessor.processEffectChain.mockReturnValue({
      newPlayerStates: { player1: state.player1, player2: state.player2 },
      animationEvents: [],
      logEntries: [],
      shouldEndTurn: true,
    });

    // player2 plays Shield Boost on their own bridge, passing targetOwner
    await processCardPlay(
      { card, targetId: 'bridge', targetOwner: 'player2', playerId: 'player2' },
      ctx
    );

    expect(mockProcessor.processEffectChain).toHaveBeenCalled();
    const callArgs = mockProcessor.processEffectChain.mock.calls[0];
    const selections = callArgs[1];
    const target = selections[0].target;
    expect(target.id).toBe('bridge');
    expect(target.owner).toBe('player2');
  });
});
