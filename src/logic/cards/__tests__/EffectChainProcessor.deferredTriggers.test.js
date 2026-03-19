/**
 * EffectChainProcessor — Deferred Trigger Resolution tests
 *
 * Verifies that ON_MOVE triggers fire AFTER POST conditionals, not inline
 * during movement. This ensures card conditionals (e.g., TARGET_STAT_LTE)
 * evaluate against the pre-trigger state.
 *
 * Bug: Assault Reposition on Specter — Phase Shift (+1 atk) fires during
 * executeSingleMove, bumping attack from 3→4 BEFORE the card's "if attack ≤ 3"
 * conditional is checked. The conditional then fails (4 > 3).
 *
 * Fix: executeSingleMove defers triggers → POST conditional evaluates at
 * attack 3 → passes → +1 applied → THEN Phase Shift fires → final attack 5.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Configurable mock state ---
let mockTriggerResolverResult = null;

// Mock TriggerProcessor (ON_CARD_PLAY — not relevant to these tests)
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

// Mock EffectRouter — handles MODIFY_STAT from POST conditional granted effects
vi.mock('../../EffectRouter.js', () => ({
  default: class MockEffectRouter {
    routeEffect(effect, context) {
      if (effect.type === 'MODIFY_STAT') {
        const newStates = JSON.parse(JSON.stringify(context.playerStates));
        const target = context.target;
        const mod = effect.mod;
        for (const pid of ['player1', 'player2']) {
          for (const lane of ['lane1', 'lane2', 'lane3']) {
            const drone = newStates[pid]?.dronesOnBoard?.[lane]?.find(d => d.id === target?.id);
            if (drone) {
              drone[mod.stat] = (drone[mod.stat] || 0) + mod.value;
              return {
                newPlayerStates: newStates,
                animationEvents: [{ type: 'STAT_MODIFY', stat: mod.stat, value: mod.value }],
                additionalEffects: []
              };
            }
          }
        }
        return { newPlayerStates: newStates, animationEvents: [], additionalEffects: [] };
      }
      return null;
    }
  }
}));

// Mock ConditionalEffectProcessor — evaluates TARGET_STAT_LTE against BOARD STATE
// This is the critical mock: it looks up the drone's current stat from playerStates
// (the board), not from the selection target object. This way, if triggers have
// already mutated the board drone's attack (bug), the condition sees the wrong value.
vi.mock('../../effects/conditional/ConditionalEffectProcessor.js', () => ({
  default: class MockConditionalProcessor {
    processPreConditionals(conditionals, effect, context) {
      return {
        modifiedEffect: { ...effect },
        newPlayerStates: JSON.parse(JSON.stringify(context.playerStates)),
        animationEvents: [],
        additionalEffects: []
      };
    }
    processPostConditionals(conditionals, context, effectResult) {
      const additionalEffects = [];
      let grantsGoAgain = false;
      const newStates = JSON.parse(JSON.stringify(context.playerStates));

      for (const c of (conditionals || []).filter(x => x.timing === 'POST')) {
        if (c.condition?.type === 'TARGET_STAT_LTE') {
          const target = context.target;
          const stat = c.condition.stat;
          const threshold = c.condition.value;
          let statValue = null;

          // Look up the drone's CURRENT stat from the board state
          for (const pid of ['player1', 'player2']) {
            for (const lane of ['lane1', 'lane2', 'lane3']) {
              const boardDrone = newStates[pid]?.dronesOnBoard?.[lane]?.find(d => d.id === target?.id);
              if (boardDrone) {
                statValue = boardDrone[stat];
                break;
              }
            }
            if (statValue !== null) break;
          }

          if (statValue !== null && statValue <= threshold) {
            additionalEffects.push(c.grantedEffect);
          }
        } else if (c.grantedEffect?.type === 'GO_AGAIN') {
          grantsGoAgain = true;
        } else {
          additionalEffects.push(c.grantedEffect);
        }
      }
      return { newPlayerStates: newStates, animationEvents: [], additionalEffects, grantsGoAgain };
    }
  }
}));

// Mock MovementEffectProcessor — supports deferTriggers option + resolveDeferredTriggers
vi.mock('../../effects/MovementEffectProcessor.js', () => ({
  default: class MockMovementProcessor {
    constructor() {
      this.resolveDeferredTriggers = vi.fn().mockImplementation((deferredCtx, playerStates) => {
        const newStates = JSON.parse(JSON.stringify(playerStates));
        if (mockTriggerResolverResult?.mutate) {
          mockTriggerResolverResult.mutate(newStates);
        }
        return {
          newPlayerStates: newStates,
          triggerAnimationEvents: mockTriggerResolverResult?.triggerAnimationEvents || [],
          mineAnimationEvents: mockTriggerResolverResult?.mineAnimationEvents || [],
          goAgain: mockTriggerResolverResult?.goAgain || false
        };
      });
    }
    executeSingleMove(card, drone, fromLane, toLane, actingPlayerId, newStates, opponentId, ctx, insertionIndex, options) {
      const droneOwnerId = drone.owner || actingPlayerId;
      newStates[droneOwnerId].dronesOnBoard[fromLane] =
        newStates[droneOwnerId].dronesOnBoard[fromLane].filter(d => d.id !== drone.id);
      const movedDrone = { ...drone };
      newStates[droneOwnerId].dronesOnBoard[toLane].push(movedDrone);

      const base = {
        newPlayerStates: newStates,
        postMovementState: JSON.parse(JSON.stringify(newStates)),
        effectResult: { movedDrones: [movedDrone], fromLane, toLane, wasSuccessful: true },
        shouldEndTurn: !card.effects?.[0]?.goAgain,
        animationEvents: [{ type: 'DRONE_MOVE' }],
      };

      if (options?.deferTriggers) {
        return {
          ...base,
          triggerAnimationEvents: [],
          mineAnimationEvents: [],
          deferredTriggerContext: {
            movedDrones: [movedDrone], fromLane, toLane, droneOwnerId, actingPlayerId,
            placedSections: ctx.placedSections,
            logCallback: ctx.callbacks?.logCallback,
            cardGoAgain: card.effects[0]?.goAgain,
          }
        };
      }
      return {
        ...base,
        triggerAnimationEvents: [],
        mineAnimationEvents: [],
      };
    }
  }
}));

import EffectChainProcessor from '../EffectChainProcessor.js';

// --- Card definitions ---

const assaultReposition = {
  id: 'ASSAULT_REPOSITION',
  instanceId: 'ar-1',
  name: 'Assault Reposition',
  cost: 2,
  effects: [{
    type: 'SINGLE_MOVE',
    properties: ['DO_NOT_EXHAUST'],
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
    conditionals: [{
      id: 'attack-buff',
      timing: 'POST',
      condition: { type: 'TARGET_STAT_LTE', stat: 'attack', value: 3 },
      grantedEffect: { type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1 } }
    }]
  }]
};

const simpleMovementCard = {
  id: 'SIMPLE_MOVE',
  instanceId: 'sm-1',
  name: 'Simple Move',
  cost: 1,
  effects: [{
    type: 'SINGLE_MOVE',
    properties: [],
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
  }]
};

// --- Helpers ---

function makePlayerStates(specterAttack, card = assaultReposition) {
  const specter = { id: 'specter-1', name: 'Specter', attack: specterAttack, speed: 2, hull: 3, owner: 'player1' };
  return {
    player1: {
      name: 'P1', energy: 10, momentum: 0,
      hand: [{ ...card }],
      discardPile: [],
      dronesOnBoard: { lane1: [specter], lane2: [], lane3: [] },
    },
    player2: {
      name: 'P2', energy: 10, momentum: 0,
      hand: [], discardPile: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    },
  };
}

function makeCtx(playerStates) {
  return {
    playerStates,
    placedSections: { player1: [], player2: [] },
    callbacks: { logCallback: vi.fn() },
  };
}

// --- Tests ---

describe('EffectChainProcessor — deferred trigger resolution', () => {
  let processor;

  beforeEach(() => {
    mockTriggerResolverResult = null;
    processor = new EffectChainProcessor();
  });

  it('grants +1 attack when Specter at attack 3 passes TARGET_STAT_LTE 3 (pre-trigger)', () => {
    // Phase Shift: +1 attack, +1 speed (fires as deferred trigger)
    mockTriggerResolverResult = {
      mutate: (states) => {
        const drone = states.player1.dronesOnBoard.lane2.find(d => d.id === 'specter-1');
        if (drone) { drone.attack += 1; drone.speed += 1; }
      },
      triggerAnimationEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Phase Shift' }],
    };

    const playerStates = makePlayerStates(3);
    const specter = playerStates.player1.dronesOnBoard.lane1[0];
    const selections = [{ target: specter, lane: 'lane1', destination: 'lane2' }];
    const ctx = makeCtx(playerStates);

    const result = processor.processEffectChain(assaultReposition, selections, 'player1', ctx);
    const finalDrone = result.newPlayerStates.player1.dronesOnBoard.lane2.find(d => d.id === 'specter-1');

    // 3 (base) + 1 (conditional — condition passed at 3 ≤ 3) + 1 (Phase Shift) = 5
    expect(finalDrone.attack).toBe(5);
  });

  it('does NOT grant +1 attack when Specter at attack 4 fails TARGET_STAT_LTE 3', () => {
    mockTriggerResolverResult = {
      mutate: (states) => {
        const drone = states.player1.dronesOnBoard.lane2.find(d => d.id === 'specter-1');
        if (drone) { drone.attack += 1; drone.speed += 1; }
      },
      triggerAnimationEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Phase Shift' }],
    };

    const playerStates = makePlayerStates(4);
    const specter = playerStates.player1.dronesOnBoard.lane1[0];
    const selections = [{ target: specter, lane: 'lane1', destination: 'lane2' }];
    const ctx = makeCtx(playerStates);

    const result = processor.processEffectChain(assaultReposition, selections, 'player1', ctx);
    const finalDrone = result.newPlayerStates.player1.dronesOnBoard.lane2.find(d => d.id === 'specter-1');

    // 4 (base) + 0 (conditional failed: 4 > 3) + 1 (Phase Shift) = 5
    expect(finalDrone.attack).toBe(5);
  });

  it('fires deferred triggers even when card has no conditionals', () => {
    mockTriggerResolverResult = {
      mutate: (states) => {
        const drone = states.player1.dronesOnBoard.lane2.find(d => d.id === 'specter-1');
        if (drone) { drone.attack += 1; drone.speed += 1; }
      },
      triggerAnimationEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Phase Shift' }],
    };

    const specter = { id: 'specter-1', name: 'Specter', attack: 2, speed: 1, hull: 3, owner: 'player1' };
    const playerStates = {
      player1: {
        name: 'P1', energy: 10, momentum: 0,
        hand: [{ ...simpleMovementCard }],
        discardPile: [],
        dronesOnBoard: { lane1: [specter], lane2: [], lane3: [] },
      },
      player2: {
        name: 'P2', energy: 10, momentum: 0,
        hand: [], discardPile: [],
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      },
    };
    const selections = [{ target: specter, lane: 'lane1', destination: 'lane2' }];
    const ctx = makeCtx(playerStates);

    const result = processor.processEffectChain(simpleMovementCard, selections, 'player1', ctx);
    const finalDrone = result.newPlayerStates.player1.dronesOnBoard.lane2.find(d => d.id === 'specter-1');

    expect(finalDrone.attack).toBe(3); // 2 + 1 Phase Shift
    expect(finalDrone.speed).toBe(2);  // 1 + 1 Phase Shift

    // Trigger animation events should be in the output
    const triggerEvents = result.animationEvents.filter(e => e.type === 'TRIGGER_FIRED');
    expect(triggerEvents.length).toBeGreaterThan(0);
  });

  it('propagates goAgain from deferred triggers (Rally Beacon)', () => {
    mockTriggerResolverResult = {
      goAgain: true,
      triggerAnimationEvents: [{ type: 'TRIGGER_FIRED', triggerName: 'Rally Beacon' }],
    };

    const drone = { id: 'd1', name: 'Drone1', attack: 2, speed: 1, hull: 3, owner: 'player1' };
    const playerStates = {
      player1: {
        name: 'P1', energy: 10, momentum: 0,
        hand: [{ ...simpleMovementCard }],
        discardPile: [],
        dronesOnBoard: { lane1: [drone], lane2: [], lane3: [] },
      },
      player2: {
        name: 'P2', energy: 10, momentum: 0,
        hand: [], discardPile: [],
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      },
    };
    const selections = [{ target: drone, lane: 'lane1', destination: 'lane2' }];
    const ctx = makeCtx(playerStates);

    const result = processor.processEffectChain(simpleMovementCard, selections, 'player1', ctx);

    expect(result.shouldEndTurn).toBe(false);
  });

  it('handles movement error gracefully (no deferredTriggerContext)', () => {
    // Override mock to return an error
    processor.movementProcessor.executeSingleMove = vi.fn().mockReturnValue({
      error: 'Cannot move — lane is full',
      animationEvents: [{ type: 'MOVEMENT_BLOCKED' }],
    });

    const playerStates = makePlayerStates(3);
    const specter = playerStates.player1.dronesOnBoard.lane1[0];
    const selections = [{ target: specter, lane: 'lane1', destination: 'lane2' }];
    const ctx = makeCtx(playerStates);

    const result = processor.processEffectChain(assaultReposition, selections, 'player1', ctx);

    // Should not crash — resolveDeferredTriggers should NOT be called
    expect(processor.movementProcessor.resolveDeferredTriggers).not.toHaveBeenCalled();
    expect(result.newPlayerStates).toBeDefined();
  });
});
