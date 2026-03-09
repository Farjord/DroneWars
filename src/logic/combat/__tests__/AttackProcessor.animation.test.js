import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFireTrigger = vi.fn();

vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = mockFireTrigger;
    }
  }
}));
vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: {
    ON_ATTACK: 'ON_ATTACK',
    ON_INTERCEPT: 'ON_INTERCEPT',
    ON_ATTACKED: 'ON_ATTACKED',
    ON_LANE_ATTACK: 'ON_LANE_ATTACK',
  },
}));
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

import { resolveAttack } from '../AttackProcessor.js';

function makePlayerStates() {
  return {
    player1: {
      name: 'P1',
      dronesOnBoard: {
        lane1: [{ id: 'a1', name: 'Talon', isExhausted: false, statMods: [], hull: 3, currentShields: 3 }],
        lane2: [], lane3: [],
      },
      appliedUpgrades: {},
      deployedDroneCounts: {},
      shipSections: {},
    },
    player2: {
      name: 'P2',
      dronesOnBoard: {
        lane1: [{ id: 'd2', name: 'Bastion', isExhausted: false, statMods: [], hull: 4, currentShields: 5, owner: 'player2' }],
        lane2: [], lane3: [],
      },
      appliedUpgrades: {},
      deployedDroneCounts: {},
      shipSections: {},
    },
  };
}

describe('AttackProcessor animation ordering', () => {
  beforeEach(() => {
    mockFireTrigger.mockReset();
  });

  it('action events precede trigger events with STATE_SNAPSHOT bridge', () => {
    const states = makePlayerStates();
    const logCb = vi.fn();

    // ON_LANE_ATTACK (mine) — no trigger
    // ON_ATTACK — returns trigger animation
    mockFireTrigger.mockImplementation((triggerType, context) => {
      if (triggerType === 'ON_ATTACK') {
        return {
          triggered: true,
          newPlayerStates: context.playerStates,
          animationEvents: [{ type: 'TRIGGER_FIRED', abilityName: 'SelfDestruct' }],
          statModsApplied: false,
        };
      }
      return { triggered: false, newPlayerStates: null, animationEvents: [], statModsApplied: false };
    });

    const result = resolveAttack(
      {
        attacker: states.player1.dronesOnBoard.lane1[0],
        target: states.player2.dronesOnBoard.lane1[0],
        targetType: 'drone',
        interceptor: null,
        attackingPlayer: 'player1',
        lane: 'lane1',
      },
      states,
      { player1: [], player2: [] },
      logCb
    );

    const types = result.animationEvents.map(e => e.type);

    // Action events (DRONE_ATTACK_START, damage, etc.) should come before trigger events
    const attackIdx = types.indexOf('DRONE_ATTACK_START');
    expect(attackIdx).toBeGreaterThanOrEqual(0);

    // STATE_SNAPSHOT should bridge action and trigger events
    const snapshotIdx = types.indexOf('STATE_SNAPSHOT');
    expect(snapshotIdx).toBeGreaterThan(attackIdx);

    // TRIGGER_CHAIN_PAUSE between snapshot and triggers
    const pauseIdx = types.indexOf('TRIGGER_CHAIN_PAUSE');
    expect(pauseIdx).toBeGreaterThan(snapshotIdx);

    // Trigger events should come after the pause
    const triggerIdx = types.indexOf('TRIGGER_FIRED');
    expect(triggerIdx).toBeGreaterThan(pauseIdx);
  });
});
