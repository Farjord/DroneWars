import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks (same pattern as EffectChainProcessor.test.js) ---

let mockTriggerResult = null;
vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = vi.fn().mockImplementation((_type, ctx) => {
        if (mockTriggerResult) {
          const newStates = JSON.parse(JSON.stringify(ctx.playerStates));
          if (mockTriggerResult.mutate) mockTriggerResult.mutate(newStates);
          return {
            triggered: true,
            newPlayerStates: newStates,
            animationEvents: mockTriggerResult.animationEvents || [],
            goAgain: false
          };
        }
        return { triggered: false, newPlayerStates: null, animationEvents: [], goAgain: false };
      });
    }
  }
}));
vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_CARD_PLAY: 'ON_CARD_PLAY' }
}));

// Mock EffectRouter — adds SEARCH_AND_DRAW handling
vi.mock('../../EffectRouter.js', () => {
  return {
    default: class MockEffectRouter {
      routeEffect(effect, context) {
        if (effect.type === 'SEARCH_AND_DRAW') {
          const isAI = context.isPlayerAI?.(context.actingPlayerId) ?? false;
          if (isAI) {
            // AI: auto-select best card, return updated states
            const newStates = JSON.parse(JSON.stringify(context.playerStates));
            const acting = newStates[context.actingPlayerId];
            const searchedCards = acting.deck.slice(-effect.searchCount).reverse();
            const selected = searchedCards.slice(0, effect.drawCount);
            const remaining = acting.deck.filter(c => !selected.some(s => s.id === c.id));
            acting.hand = [...acting.hand, ...selected];
            acting.deck = remaining;
            return { newPlayerStates: newStates, animationEvents: [], additionalEffects: [] };
          } else {
            // Human: return needsCardSelection
            const searchedCards = context.playerStates[context.actingPlayerId].deck
              .slice(-effect.searchCount).reverse();
            return {
              newPlayerStates: context.playerStates,
              needsCardSelection: {
                type: 'search_and_draw',
                searchedCards,
                drawCount: effect.drawCount,
                shuffleAfter: effect.shuffleAfter,
                remainingDeck: [],
                discardPile: [],
                filter: effect.filter,
              }
            };
          }
        }
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
        return null;
      }
      hasProcessor(type) { return ['DAMAGE', 'SEARCH_AND_DRAW'].includes(type); }
    }
  };
});

vi.mock('../../effects/conditional/ConditionalEffectProcessor.js', () => ({
  default: class MockConditionalProcessor {
    processPreConditionals(conditionals, effect, context) {
      return { modifiedEffect: { ...effect }, newPlayerStates: JSON.parse(JSON.stringify(context.playerStates)), animationEvents: [], additionalEffects: [] };
    }
    processPostConditionals(conditionals, context) {
      return { newPlayerStates: JSON.parse(JSON.stringify(context.playerStates)), animationEvents: [], additionalEffects: [], grantsGoAgain: false };
    }
  }
}));

vi.mock('../../effects/MovementEffectProcessor.js', () => ({
  default: class MockMovementProcessor {
    executeSingleMove() { return { newPlayerStates: {}, effectResult: {}, triggerAnimationEvents: [], mineAnimationEvents: [] }; }
    executeMultiMove() { return { newPlayerStates: {}, effectResult: {}, triggerAnimationEvents: [], mineAnimationEvents: [] }; }
  }
}));

import EffectChainProcessor from '../EffectChainProcessor';

// --- Fixtures ---

function createPlayerState(overrides = {}) {
  return {
    name: 'Player',
    energy: 10,
    momentum: 0,
    hand: [],
    discardPile: [],
    deck: [{ id: 'deck1' }, { id: 'deck2' }, { id: 'deck3' }],
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

const strategicPlanningCard = {
  id: 'STRATEGIC_PLANNING',
  baseCardId: 'STRATEGIC_PLANNING',
  name: 'Strategic Planning',
  type: 'Support',
  cost: 2,
  effects: [{ type: 'SEARCH_AND_DRAW', searchCount: 5, drawCount: 1, shuffleAfter: true, targeting: { type: 'NONE' } }],
};

const damageCard = {
  id: 'LASER_SHOT',
  name: 'Laser Shot',
  type: 'Action',
  cost: 1,
  effects: [{ type: 'DAMAGE', value: 2, targeting: { type: 'DRONE', affinity: 'ENEMY' } }],
};

// --- Tests ---

describe('EffectChainProcessor — SEARCH_AND_DRAW', () => {
  let processor;

  beforeEach(() => {
    mockTriggerResult = null;
    processor = new EffectChainProcessor();
  });

  it('returns needsCardSelection when SEARCH_AND_DRAW targets human player', () => {
    const playerStates = createGameState();
    const ctx = createCtx(playerStates, { isPlayerAI: () => false });
    const selections = [{ target: null, lane: null }];

    const result = processor.processEffectChain(strategicPlanningCard, selections, 'player1', ctx);

    expect(result.needsCardSelection).toBeDefined();
    expect(result.needsCardSelection.type).toBe('search_and_draw');
    expect(Array.isArray(result.needsCardSelection.searchedCards)).toBe(true);
    expect(result.needsCardSelection.drawCount).toBe(1);
  });

  it('returns original playerStates (pre-cost) when needsCardSelection', () => {
    const playerStates = createGameState({ energy: 10 });
    const ctx = createCtx(playerStates, { isPlayerAI: () => false });
    const selections = [{ target: null, lane: null }];

    const result = processor.processEffectChain(strategicPlanningCard, selections, 'player1', ctx);

    // Costs must NOT be deducted — the completion handler pays them
    expect(result.newPlayerStates.player1.energy).toBe(10);
  });

  it('does not finalize card play when needsCardSelection (card stays in hand)', () => {
    const cardInHand = { ...strategicPlanningCard, instanceId: 'sp_inst_1' };
    const playerStates = createGameState({ hand: [cardInHand] });
    const ctx = createCtx(playerStates, { isPlayerAI: () => false });
    const selections = [{ target: null, lane: null }];

    const result = processor.processEffectChain(cardInHand, selections, 'player1', ctx);

    // Card should still be in hand (not moved to discard)
    expect(result.newPlayerStates.player1.hand).toContainEqual(cardInHand);
    expect(result.newPlayerStates.player1.discardPile).not.toContainEqual(
      expect.objectContaining({ id: cardInHand.id })
    );
  });

  it('processes SEARCH_AND_DRAW normally for AI players (no needsCardSelection)', () => {
    const playerStates = createGameState(
      {},
      { deck: [{ id: 'ai_d1' }, { id: 'ai_d2' }, { id: 'ai_d3' }] }
    );
    // player2 is AI
    const ctx = createCtx(playerStates, { isPlayerAI: (pid) => pid === 'player2' });
    const selections = [{ target: null, lane: null }];

    const result = processor.processEffectChain(strategicPlanningCard, selections, 'player2', ctx);

    expect(result.needsCardSelection).toBeFalsy();
    expect(typeof result.shouldEndTurn).toBe('boolean');
    // AI auto-drew a card — it should be finalized (card discarded)
    expect(result.newPlayerStates.player2.discardPile).toContainEqual(
      expect.objectContaining({ id: 'STRATEGIC_PLANNING' })
    );
  });

  it('existing card types still work (regression: DAMAGE card)', () => {
    const targetDrone = { id: 'enemy_d1', hull: 5, attack: 2, owner: 'player2' };
    const playerStates = createGameState({}, { dronesOnBoard: { lane1: [targetDrone], lane2: [], lane3: [] } });
    const ctx = createCtx(playerStates);
    const selections = [{ target: { id: 'enemy_d1', owner: 'player2' }, lane: 'lane1' }];

    const result = processor.processEffectChain(damageCard, selections, 'player1', ctx);

    expect(result.needsCardSelection).toBeFalsy();
    // Target took 2 damage
    const drone = result.newPlayerStates.player2.dronesOnBoard.lane1.find(d => d.id === 'enemy_d1');
    expect(drone.hull).toBe(3);
    expect(typeof result.shouldEndTurn).toBe('boolean');
  });
});
