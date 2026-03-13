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

import { processCardPlay, processSearchAndDrawCompletion } from '../CardActionStrategy.js';

// Access the mock processor
const getMockProcessor = async () => {
  const mod = await import('../../cards/EffectChainProcessor.js');
  return mod.__mockProcessor;
};

const makeCtx = () => ({
  getState: vi.fn(() => ({
    player1: { hand: [], deck: [], discardPile: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] }, shipSections: {}, activeDronePool: [] },
    player2: { hand: [], deck: [], discardPile: [], dronesOnBoard: { lane1: [], lane2: [], lane3: [] }, shipSections: {}, activeDronePool: [] },
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

describe('CardActionStrategy — cardSelectionPending', () => {
  let mockProcessor;

  beforeEach(async () => {
    mockProcessor = await getMockProcessor();
    mockProcessor.processEffectChain.mockReset();
  });

  it('sets cardSelectionPending when search_and_draw needsCardSelection returned', async () => {
    const card = { id: 'eq-cache', name: 'Equipment Cache', effects: [{ type: 'SEARCH_AND_DRAW' }] };
    const searchedCards = [{ id: 'c1', name: 'Card1' }, { id: 'c2', name: 'Card2' }];

    mockProcessor.processEffectChain.mockReturnValue({
      needsCardSelection: {
        type: 'search_and_draw',
        searchedCards,
        remainingDeck: [],
        discardPile: [],
        selectCount: 1,
      },
    });

    const ctx = makeCtx();
    const result = await processCardPlay(
      { card, targetId: null, playerId: 'player2' },
      ctx
    );

    // Should still return needsCardSelection for the action pipeline
    expect(result.needsCardSelection).toBeDefined();
    expect(result.needsCardSelection.type).toBe('search_and_draw');

    // Should set cardSelectionPending in game state
    expect(ctx.setState).toHaveBeenCalledWith({
      cardSelectionPending: expect.objectContaining({
        type: 'search_and_draw',
        searchedCards,
        card,
        playerId: 'player2',
      }),
    });
  });

  it('only sets cardSelectionPending for search_and_draw (movement uses effect chain UI)', async () => {
    // Movement cards (SINGLE_MOVE/MULTI_MOVE) never reach processCardPlay's needsCardSelection path
    // because EffectChainProcessor.executeChainMovement() handles them directly at line 325.
    // This test documents that cardSelectionPending is exclusively for search_and_draw.
    const card = { id: 'tac-move', name: 'Tactical Repositioning', effects: [{ type: 'MOVE' }] };

    mockProcessor.processEffectChain.mockReturnValue({
      needsCardSelection: {
        type: 'single_move',
        validTargets: [],
      },
    });

    const ctx = makeCtx();
    await processCardPlay(
      { card, targetId: null, playerId: 'player1' },
      ctx
    );

    // setState should NOT have been called with cardSelectionPending
    const setStateCalls = ctx.setState.mock.calls;
    const hasPendingCall = setStateCalls.some(
      ([arg]) => arg && 'cardSelectionPending' in arg
    );
    expect(hasPendingCall).toBe(false);
  });

  it('processSearchAndDrawCompletion clears cardSelectionPending', async () => {
    const ctx = makeCtx();
    const card = { id: 'eq-cache', name: 'Equipment Cache', effects: [{ type: 'SEARCH_AND_DRAW' }] };

    await processSearchAndDrawCompletion({
      card,
      selectedCards: [{ id: 'c1', name: 'Card1' }],
      selectionData: {
        searchedCards: [{ id: 'c1', name: 'Card1' }, { id: 'c2', name: 'Card2' }],
        remainingDeck: [],
        discardPile: [],
        shuffleAfter: false,
      },
      playerId: 'player1',
    }, ctx);

    // First setState call should clear cardSelectionPending
    expect(ctx.setState).toHaveBeenCalledWith({ cardSelectionPending: null });
  });
});
