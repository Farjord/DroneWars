// ========================================
// EffectChainProcessor — POST-conditional trigger propagation
// ========================================
// Verifies that triggerAnimationEvents produced by additional effects
// from POST conditionals are included in the final animation output.
//
// Covers:
//   - Scavenger Shot: DRAW on destroy → Odin's ON_CARD_DRAWN trigger
//   - Condemnation Ray: GAIN_ENERGY on destroy → Thor's ON_ENERGY_GAINED trigger
//
// Latent bug: the POST additional-effects loop only forwarded
// animationEvents and silently dropped triggerAnimationEvents.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──

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

vi.mock('../../effects/MovementEffectProcessor.js', () => ({
  default: class MockMovementProcessor {
    constructor() {
      this.resolveDeferredTriggers = () => ({
        newPlayerStates: {}, triggerAnimationEvents: [], mineAnimationEvents: [], goAgain: false
      });
    }
    executeSingleMove() { return { newPlayerStates: {}, animationEvents: [] }; }
  }
}));

// EffectRouter: DAMAGE kills when hull <= damage; DRAW fires Odin's trigger;
// GAIN_ENERGY fires Thor's trigger.
vi.mock('../../EffectRouter.js', () => ({
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
          animationEvents: [{ type: 'DAMAGE_DEALT', targetId: context.target?.id }],
          additionalEffects: [],
          triggerAnimationEvents: [],
          preTriggerState: null,
          effectResult: { wasDestroyed, damageDealt: { hull: effect.value, shield: 0 }, targetId: context.target?.id },
        };
      }

      if (effect.type === 'DRAW') {
        const newStates = JSON.parse(JSON.stringify(context.playerStates));
        const acting = newStates[context.actingPlayerId];
        const count = effect.value || 1;
        const preTriggerState = JSON.parse(JSON.stringify(newStates));
        for (let i = 0; i < count && acting.deck.length > 0; i++) {
          acting.hand.push(acting.deck.shift());
        }
        return {
          newPlayerStates: newStates,
          animationEvents: [],
          additionalEffects: [],
          // Odin's ON_CARD_DRAWN trigger fires
          triggerAnimationEvents: [
            { type: 'TRIGGER_FIRED', targetId: 'odin-1', abilityName: 'All-Seeing Eye' },
            { type: 'STATE_SNAPSHOT', snapshotPlayerStates: preTriggerState },
            { type: 'STAT_BUFF', targetId: 'odin-1', stat: 'attack', value: 2 },
          ],
          preTriggerState,
        };
      }

      if (effect.type === 'GAIN_ENERGY') {
        const newStates = JSON.parse(JSON.stringify(context.playerStates));
        const preTriggerState = JSON.parse(JSON.stringify(newStates));
        newStates[context.actingPlayerId].energy += effect.value || 0;
        return {
          newPlayerStates: newStates,
          animationEvents: [],
          additionalEffects: [],
          // Thor's ON_ENERGY_GAINED trigger fires
          triggerAnimationEvents: [
            { type: 'TRIGGER_FIRED', targetId: 'thor-1', abilityName: 'Storm Surge' },
            { type: 'STATE_SNAPSHOT', snapshotPlayerStates: preTriggerState },
            { type: 'STAT_BUFF', targetId: 'thor-1', stat: 'attack', value: 1 },
          ],
          preTriggerState,
        };
      }

      return null;
    }
    hasProcessor(type) { return ['DAMAGE', 'DRAW', 'GAIN_ENERGY'].includes(type); }
  }
}));

// ── ConditionalEffectProcessor is NOT mocked — real implementation ──

import EffectChainProcessor from '../EffectChainProcessor.js';

const CONDEMNATION_RAY = {
  instanceId: 'cray-1',
  name: 'Condemnation Ray',
  cost: 4,
  effects: [
    {
      type: 'DAMAGE',
      value: 2,
      targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
      conditionals: [
        {
          id: 'energy-on-destroy',
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'GAIN_ENERGY', value: 4 },
        },
      ],
    },
  ],
};

const SCAVENGER_SHOT = {
  instanceId: 'sshot-1',
  name: 'Scavenger Shot',
  cost: 2,
  effects: [
    {
      type: 'DAMAGE',
      value: 3,
      targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
      conditionals: [
        {
          id: 'draw-on-destroy',
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'DRAW', value: 1 },
        },
      ],
    },
  ],
};

const TARGET = { id: 'enemy-drone-1', owner: 'player2' };

function makeCtx({ targetHull = 3, deck = [] }) {
  const deckCard = { instanceId: 'drawn-card-1', name: 'Drawn Card' };
  return {
    playerStates: {
      player1: {
        energy: 10,
        maxEnergy: 10,
        hand: [{ ...SCAVENGER_SHOT }],
        deck: deck.length > 0 ? deck : [deckCard],
        discardPile: [],
        dronesOnBoard: {
          lane1: [{ id: 'odin-1', name: 'Odin', owner: 'player1', hull: 5, maxHull: 5, attack: 3 }],
          lane2: [],
          lane3: [],
        },
      },
      player2: {
        energy: 5,
        maxEnergy: 10,
        hand: [],
        deck: [],
        discardPile: [],
        dronesOnBoard: {
          lane1: [{ id: 'enemy-drone-1', name: 'Target', owner: 'player2', hull: targetHull, maxHull: 5, attack: 1 }],
          lane2: [],
          lane3: [],
        },
      },
    },
    placedSections: { player1: {}, player2: {} },
    callbacks: { logCallback: vi.fn() },
    gameSeed: 1,
    roundNumber: 1,
    localPlayerId: 'player1',
  };
}

function makeEnergyCtx({ targetHull = 3 }) {
  return {
    playerStates: {
      player1: {
        energy: 10,
        maxEnergy: 10,
        hand: [{ ...CONDEMNATION_RAY }],
        deck: [],
        discardPile: [],
        dronesOnBoard: {
          lane1: [{ id: 'thor-1', name: 'Thor', owner: 'player1', hull: 5, maxHull: 5, attack: 4 }],
          lane2: [],
          lane3: [],
        },
      },
      player2: {
        energy: 5,
        maxEnergy: 10,
        hand: [],
        deck: [],
        discardPile: [],
        dronesOnBoard: {
          lane1: [{ id: 'enemy-drone-1', name: 'Target', owner: 'player2', hull: targetHull, maxHull: 5, attack: 1 }],
          lane2: [],
          lane3: [],
        },
      },
    },
    placedSections: { player1: {}, player2: {} },
    callbacks: { logCallback: vi.fn() },
    gameSeed: 1,
    roundNumber: 1,
    localPlayerId: 'player1',
  };
}

describe('EffectChainProcessor — POST conditional trigger event propagation', () => {
  let processor;

  beforeEach(() => {
    processor = new EffectChainProcessor();
  });

  it('includes TRIGGER_FIRED events from DRAW in final animationEvents when ON_DESTROY fires (Scavenger Shot)', () => {
    const ctx = makeCtx({ targetHull: 2 }); // hull 2 ≤ damage 3 → destroyed
    const result = processor.processEffectChain(SCAVENGER_SHOT, [{ target: TARGET }], 'player1', ctx);

    const hasOdinTrigger = result.animationEvents.some(e => e.type === 'TRIGGER_FIRED' && e.targetId === 'odin-1');
    expect(hasOdinTrigger).toBe(true);
  });

  it('includes TRIGGER_CHAIN_PAUSE before Odin trigger events when ON_DESTROY DRAW fires', () => {
    const ctx = makeCtx({ targetHull: 2 });
    const result = processor.processEffectChain(SCAVENGER_SHOT, [{ target: TARGET }], 'player1', ctx);

    const pauseIdx = result.animationEvents.findIndex(e => e.type === 'TRIGGER_CHAIN_PAUSE');
    const triggerIdx = result.animationEvents.findIndex(e => e.type === 'TRIGGER_FIRED' && e.targetId === 'odin-1');

    expect(pauseIdx).toBeGreaterThanOrEqual(0);
    expect(triggerIdx).toBeGreaterThan(pauseIdx);
  });

  it('does NOT include Odin trigger events when target survives and ON_DESTROY does not fire', () => {
    const ctx = makeCtx({ targetHull: 10 }); // hull 10 > damage 3 → survives
    const result = processor.processEffectChain(SCAVENGER_SHOT, [{ target: TARGET }], 'player1', ctx);

    const hasOdinTrigger = result.animationEvents.some(e => e.type === 'TRIGGER_FIRED' && e.targetId === 'odin-1');
    expect(hasOdinTrigger).toBe(false);
  });

  it('includes STAT_BUFF event from Odin trigger when ON_DESTROY DRAW fires', () => {
    const ctx = makeCtx({ targetHull: 2 });
    const result = processor.processEffectChain(SCAVENGER_SHOT, [{ target: TARGET }], 'player1', ctx);

    const hasStatBuff = result.animationEvents.some(e => e.type === 'STAT_BUFF' && e.targetId === 'odin-1');
    expect(hasStatBuff).toBe(true);
  });
});

describe('EffectChainProcessor — POST conditional GAIN_ENERGY trigger propagation (Condemnation Ray / Thor)', () => {
  let processor;

  beforeEach(() => {
    processor = new EffectChainProcessor();
  });

  it('includes Thor TRIGGER_FIRED when ON_DESTROY GAIN_ENERGY fires', () => {
    const ctx = makeEnergyCtx({ targetHull: 2 }); // hull 2 ≤ damage 2 → destroyed
    const result = processor.processEffectChain(CONDEMNATION_RAY, [{ target: TARGET }], 'player1', ctx);

    const hasThorTrigger = result.animationEvents.some(e => e.type === 'TRIGGER_FIRED' && e.targetId === 'thor-1');
    expect(hasThorTrigger).toBe(true);
  });

  it('includes TRIGGER_CHAIN_PAUSE before Thor trigger events when ON_DESTROY GAIN_ENERGY fires', () => {
    const ctx = makeEnergyCtx({ targetHull: 2 });
    const result = processor.processEffectChain(CONDEMNATION_RAY, [{ target: TARGET }], 'player1', ctx);

    const pauseIdx = result.animationEvents.findIndex(e => e.type === 'TRIGGER_CHAIN_PAUSE');
    const triggerIdx = result.animationEvents.findIndex(e => e.type === 'TRIGGER_FIRED' && e.targetId === 'thor-1');

    expect(pauseIdx).toBeGreaterThanOrEqual(0);
    expect(triggerIdx).toBeGreaterThan(pauseIdx);
  });

  it('does NOT include Thor trigger events when target survives and ON_DESTROY does not fire', () => {
    const ctx = makeEnergyCtx({ targetHull: 10 }); // survives
    const result = processor.processEffectChain(CONDEMNATION_RAY, [{ target: TARGET }], 'player1', ctx);

    const hasThorTrigger = result.animationEvents.some(e => e.type === 'TRIGGER_FIRED' && e.targetId === 'thor-1');
    expect(hasThorTrigger).toBe(false);
  });
});
