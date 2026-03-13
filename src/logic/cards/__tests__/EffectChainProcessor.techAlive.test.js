import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock TriggerProcessor
vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = vi.fn().mockReturnValue({
        triggered: false, newPlayerStates: null, animationEvents: [], goAgain: false
      });
    }
  }
}));
vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_CARD_PLAY: 'ON_CARD_PLAY' }
}));

// Mock EffectRouter — handle DESTROY_TECH by removing the tech from techSlots
vi.mock('../../EffectRouter.js', () => {
  return {
    default: class MockEffectRouter {
      routeEffect(effect, context) {
        if (effect.type === 'DESTROY_TECH') {
          const newStates = JSON.parse(JSON.stringify(context.playerStates));
          const targetPlayerId = context.target?.owner;
          const lane = context.target?.lane;
          if (targetPlayerId && lane && newStates[targetPlayerId]?.techSlots?.[lane]) {
            newStates[targetPlayerId].techSlots[lane] =
              newStates[targetPlayerId].techSlots[lane].filter(t => t.id !== context.target.id);
          }
          return {
            newPlayerStates: newStates,
            animationEvents: [{ type: 'TECH_DESTROY', targetId: context.target?.id }],
            additionalEffects: [],
            effectResult: { destroyed: true },
          };
        }
        return null;
      }
      hasProcessor(type) { return type === 'DESTROY_TECH'; }
    }
  };
});

// Mock ConditionalEffectProcessor
vi.mock('../../effects/conditional/ConditionalEffectProcessor.js', () => ({
  default: class MockConditionalProcessor {
    processPreConditionals(_c, effect, context) {
      return { modifiedEffect: { ...effect }, newPlayerStates: JSON.parse(JSON.stringify(context.playerStates)), animationEvents: [], additionalEffects: [] };
    }
    processPostConditionals(_c, context) {
      return { newPlayerStates: JSON.parse(JSON.stringify(context.playerStates)), animationEvents: [], additionalEffects: [], grantsGoAgain: false };
    }
  }
}));

// Mock MovementEffectProcessor
vi.mock('../../effects/MovementEffectProcessor.js', () => ({
  default: class MockMovementProcessor {}
}));

import EffectChainProcessor from '../EffectChainProcessor';

// --- Fixtures ---

function createTech(overrides = {}) {
  return {
    id: 'tech_shield_gen',
    name: 'Shield Generator',
    hull: 1,
    owner: 'player2',
    lane: 'lane1',
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
    deck: [{ id: 'deck1' }],
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    techSlots: { lane1: [], lane2: [], lane3: [] },
    shipSections: { bridge: { hull: 10, allocatedShields: 5, maxShields: 5 } },
    ...overrides,
  };
}

function createCtx(playerStates) {
  return {
    playerStates,
    placedSections: { player1: ['bridge'], player2: ['bridge'] },
    callbacks: { logCallback: vi.fn(), resolveAttackCallback: vi.fn() },
    localPlayerId: 'player1',
    isPlayerAI: (pid) => pid === 'player2',
  };
}

// --- Tests ---

describe('EffectChainProcessor — tech target alive check', () => {
  let processor;

  beforeEach(() => {
    processor = new EffectChainProcessor();
  });

  it('should not skip DESTROY_TECH effect when tech target exists in techSlots', () => {
    const tech = createTech();
    const systemPurge = {
      id: 'SYSTEM_PURGE',
      instanceId: 'sp_1',
      name: 'System Purge',
      cost: 2,
      type: 'Tactic',
      effects: [
        { type: 'DESTROY_TECH', targeting: { type: 'TECH', affinity: 'ANY', location: 'ANY_LANE' } },
      ],
    };

    const playerStates = {
      player1: createPlayerState({
        name: 'Player 1',
        hand: [systemPurge],
      }),
      player2: createPlayerState({
        name: 'Player 2',
        techSlots: { lane1: [tech], lane2: [], lane3: [] },
      }),
    };

    const selections = [{ target: tech, lane: 'lane1' }];
    const ctx = createCtx(playerStates);

    const result = processor.processEffectChain(systemPurge, selections, 'player1', ctx);

    // Tech should be removed from player2's techSlots
    expect(result.newPlayerStates.player2.techSlots.lane1).toEqual([]);
  });

  it('should skip DESTROY_TECH effect when tech target has already been removed', () => {
    const tech = createTech();
    const systemPurge = {
      id: 'SYSTEM_PURGE',
      instanceId: 'sp_2',
      name: 'System Purge',
      cost: 2,
      type: 'Tactic',
      effects: [
        { type: 'DESTROY_TECH', targeting: { type: 'TECH', affinity: 'ANY', location: 'ANY_LANE' } },
      ],
    };

    // Tech NOT in techSlots (already removed)
    const playerStates = {
      player1: createPlayerState({
        name: 'Player 1',
        hand: [systemPurge],
      }),
      player2: createPlayerState({
        name: 'Player 2',
        techSlots: { lane1: [], lane2: [], lane3: [] },
      }),
    };

    const selections = [{ target: tech, lane: 'lane1' }];
    const ctx = createCtx(playerStates);

    const result = processor.processEffectChain(systemPurge, selections, 'player1', ctx);

    // Tech was already gone — effect should have been skipped, techSlots unchanged
    expect(result.newPlayerStates.player2.techSlots.lane1).toEqual([]);
    // Energy should still be deducted (cost paid before effect check)
    expect(result.newPlayerStates.player1.energy).toBe(8);
  });
});
