import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──
// TriggerProcessor: not relevant to this bug — stub it out
vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    fireTrigger() {
      return { triggered: false, newPlayerStates: null, animationEvents: [], goAgain: false };
    }
  }
}));
vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_CARD_PLAY: 'ON_CARD_PLAY', ON_ENERGY_GAINED: 'ON_ENERGY_GAINED' }
}));

// MovementEffectProcessor: not relevant
vi.mock('../../effects/MovementEffectProcessor.js', () => ({
  default: class MockMovementProcessor {
    constructor() {
      this.resolveDeferredTriggers = () => ({ newPlayerStates: {}, triggerAnimationEvents: [], mineAnimationEvents: [], goAgain: false });
    }
    executeSingleMove() { return { newPlayerStates: {}, animationEvents: [] }; }
  }
}));

// EffectRouter: controlled mock that returns wasDestroyed based on actual target hull
vi.mock('../../EffectRouter.js', () => {
  return {
    default: class MockEffectRouter {
      routeEffect(effect, context) {
        if (effect.type === 'DAMAGE') {
          const newStates = JSON.parse(JSON.stringify(context.playerStates));
          const targetOwnerId = context.target?.owner || 'player2';
          let wasDestroyed = false;
          for (const lane of ['lane1', 'lane2', 'lane3']) {
            const drones = newStates[targetOwnerId]?.dronesOnBoard?.[lane] || [];
            const idx = drones.findIndex(d => d.id === context.target?.id);
            if (idx !== -1) {
              drones[idx].hull -= effect.value || 0;
              if (drones[idx].hull <= 0) {
                drones.splice(idx, 1);
                wasDestroyed = true;
              }
              break;
            }
          }
          return {
            newPlayerStates: newStates,
            animationEvents: [],
            additionalEffects: [],
            effectResult: { wasDestroyed, damageDealt: { hull: effect.value, shield: 0 }, targetId: context.target?.id },
          };
        }
        if (effect.type === 'GAIN_ENERGY') {
          const newStates = JSON.parse(JSON.stringify(context.playerStates));
          newStates[context.actingPlayerId].energy += effect.value || 0;
          return { newPlayerStates: newStates, animationEvents: [], additionalEffects: [] };
        }
        if (effect.type === 'DRAW') {
          const newStates = JSON.parse(JSON.stringify(context.playerStates));
          const acting = newStates[context.actingPlayerId];
          const count = effect.value || 1;
          for (let i = 0; i < count && acting.deck.length > 0; i++) {
            acting.hand.push(acting.deck.shift());
          }
          return { newPlayerStates: newStates, animationEvents: [], additionalEffects: [] };
        }
        return null;
      }
      hasProcessor(type) { return ['DAMAGE', 'DRAW', 'GAIN_ENERGY'].includes(type); }
    }
  };
});

// ── REAL ConditionalEffectProcessor + ConditionEvaluator (NOT mocked) ──
// This is the key difference from the existing test file: we use the real
// conditional processing pipeline to exercise the ON_DESTROY evaluation.

import EffectChainProcessor from '../EffectChainProcessor.js';

// ── Card definitions ──
const condemnationRay = {
  instanceId: 'cray-1',
  name: 'Condemnation Ray',
  cost: 4,
  effects: [
    {
      type: 'DAMAGE', value: 2,
      targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
      conditionals: [
        { id: 'marked-bonus', timing: 'PRE', condition: { type: 'TARGET_IS_MARKED' }, grantedEffect: { type: 'BONUS_DAMAGE', value: 2 } },
        { id: 'energy-on-destroy', timing: 'POST', condition: { type: 'ON_DESTROY' }, grantedEffect: { type: 'GAIN_ENERGY', value: 4 } },
      ],
    },
  ],
};

const scavengerShot = {
  instanceId: 'sshot-1',
  name: 'Scavenger Shot',
  cost: 3,
  effects: [
    {
      type: 'DAMAGE', value: 2,
      targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
      conditionals: [
        { id: 'draw-on-destroy', timing: 'POST', condition: { type: 'ON_DESTROY' }, grantedEffect: { type: 'DRAW', value: 1 } },
      ],
    },
  ],
};

const TARGET = { id: 'enemy-drone-1', owner: 'player2' };

// ── Helpers ──
function makeCtx({ targetHull = 3, targetMarked = false, energy = 10, deck = [], card }) {
  const playerStates = {
    player1: {
      energy,
      maxEnergy: 10,
      hand: [{ ...card }],
      deck,
      discardPile: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    },
    player2: {
      energy: 5,
      maxEnergy: 10,
      hand: [],
      deck: [],
      discardPile: [],
      dronesOnBoard: {
        lane1: [{
          id: 'enemy-drone-1',
          name: 'Target Drone',
          owner: 'player2',
          hull: targetHull,
          maxHull: 5,
          attack: 2,
          isMarked: targetMarked,
        }],
        lane2: [],
        lane3: [],
      },
    },
  };
  return {
    playerStates,
    placedSections: { player1: {}, player2: {} },
    callbacks: {},
    gameSeed: 1,
    roundNumber: 1,
    localPlayerId: 'player1',
  };
}

describe('EffectChainProcessor — ON_DESTROY conditional (integration)', () => {
  let processor;

  beforeEach(() => {
    processor = new EffectChainProcessor();
  });

  // ── Condemnation Ray: GAIN_ENERGY on destroy ──

  it('grants energy when target is destroyed (Condemnation Ray)', () => {
    // Target has 2 hull → 2 damage kills it → ON_DESTROY met → +4 energy
    // Start with 10 energy, cost 4 → 6 after cost → +4 from destroy = 10
    const ctx = makeCtx({ targetHull: 2, energy: 10, card: condemnationRay });
    const selections = [{ target: TARGET }];

    const result = processor.processEffectChain(condemnationRay, selections, 'player1', ctx);

    // 10 - 4 (cost) + 4 (on-destroy) = 10
    expect(result.newPlayerStates.player1.energy).toBe(10);
  });

  it('does NOT grant energy when target survives (Condemnation Ray)', () => {
    // Target has 5 hull → 2 damage leaves it at 3 → ON_DESTROY not met → no energy
    const ctx = makeCtx({ targetHull: 5, energy: 10, card: condemnationRay });
    const selections = [{ target: TARGET }];

    const result = processor.processEffectChain(condemnationRay, selections, 'player1', ctx);

    // 10 - 4 (cost) = 6, no on-destroy bonus
    expect(result.newPlayerStates.player1.energy).toBe(6);
  });

  it('grants energy on destroy with marked bonus damage (Condemnation Ray)', () => {
    // Target marked + 4 hull → PRE gives +2 bonus → 4 total damage kills it → +4 energy
    const ctx = makeCtx({ targetHull: 4, targetMarked: true, energy: 10, card: condemnationRay });
    // Selection target must carry full drone data (as in real game flow)
    const markedTarget = { id: 'enemy-drone-1', owner: 'player2', isMarked: true };
    const selections = [{ target: markedTarget }];

    const result = processor.processEffectChain(condemnationRay, selections, 'player1', ctx);

    // 10 - 4 (cost) + 4 (on-destroy) = 10
    expect(result.newPlayerStates.player1.energy).toBe(10);
  });

  it('grants energy on destroy without marked bonus (unmarked, low hull)', () => {
    // Target NOT marked, 1 hull → 2 damage kills it → +4 energy (marked-bonus irrelevant)
    const ctx = makeCtx({ targetHull: 1, targetMarked: false, energy: 8, card: condemnationRay });
    const selections = [{ target: TARGET }];

    const result = processor.processEffectChain(condemnationRay, selections, 'player1', ctx);

    // 8 - 4 (cost) + 4 (on-destroy) = 8
    expect(result.newPlayerStates.player1.energy).toBe(8);
  });

  // ── Scavenger Shot: DRAW on destroy ──

  it('draws a card when target is destroyed (Scavenger Shot)', () => {
    const deckCard = { instanceId: 'deck-card-1', name: 'Bonus Card' };
    const ctx = makeCtx({ targetHull: 2, deck: [deckCard], card: scavengerShot });
    const selections = [{ target: TARGET }];

    const result = processor.processEffectChain(scavengerShot, selections, 'player1', ctx);

    // Hand should have the drawn card (original card was discarded by finishCardPlay)
    const hand = result.newPlayerStates.player1.hand;
    expect(hand.some(c => c.instanceId === 'deck-card-1')).toBe(true);
    expect(result.newPlayerStates.player1.deck).toHaveLength(0);
  });

  it('does NOT draw when target survives (Scavenger Shot)', () => {
    const deckCard = { instanceId: 'deck-card-1', name: 'Bonus Card' };
    const ctx = makeCtx({ targetHull: 5, deck: [deckCard], card: scavengerShot });
    const selections = [{ target: TARGET }];

    const result = processor.processEffectChain(scavengerShot, selections, 'player1', ctx);

    // No draw — deck unchanged, hand only has whatever finishCardPlay leaves
    const hand = result.newPlayerStates.player1.hand;
    expect(hand.some(c => c.instanceId === 'deck-card-1')).toBe(false);
    expect(result.newPlayerStates.player1.deck).toHaveLength(1);
  });
});
