import { describe, it, expect } from 'vitest';
import { resolveConditionalTargeting } from '../conditionalTargetingResolver.js';

describe('resolveConditionalTargeting', () => {
  const makePlayerState = (sectionShields) => ({
    shipSections: {
      bridge: { allocatedShields: sectionShields.bridge ?? 2, hull: 5, maxHull: 5 },
      droneControlHub: { allocatedShields: sectionShields.droneControlHub ?? 2, hull: 5, maxHull: 5 },
      powerCell: { allocatedShields: sectionShields.powerCell ?? 2, hull: 5, maxHull: 5 }
    }
  });

  it('expands targeting restrictions when PRE_TARGETING condition is met', () => {
    const card = {
      id: 'SIGNAL_HIJACK',
      effects: [{
        type: 'EXHAUST_DRONE',
        targeting: {
          type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE',
          restrictions: [{ stat: 'class', comparison: 'LTE', value: 1 }]
        },
        conditionals: [{
          id: 'dch-exposed-targeting',
          timing: 'PRE_TARGETING',
          condition: { type: 'SECTION_EXPOSED', section: 'droneControlHub' },
          targetingOverride: { restrictions: [{ stat: 'class', comparison: 'LTE', value: 4 }] }
        }]
      }]
    };

    // player2 DCH has 0 shields — exposed
    const player1 = makePlayerState({ bridge: 2, droneControlHub: 2, powerCell: 2 });
    const player2 = makePlayerState({ bridge: 2, droneControlHub: 0, powerCell: 2 });

    const resolved = resolveConditionalTargeting(card, 'player1', player1, player2);

    expect(resolved.effects[0].targeting.restrictions[0].value).toBe(4);
  });

  it('returns original definition when condition is not met', () => {
    const card = {
      id: 'SIGNAL_HIJACK',
      effects: [{
        type: 'EXHAUST_DRONE',
        targeting: {
          type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE',
          restrictions: [{ stat: 'class', comparison: 'LTE', value: 1 }]
        },
        conditionals: [{
          id: 'dch-exposed-targeting',
          timing: 'PRE_TARGETING',
          condition: { type: 'SECTION_EXPOSED', section: 'droneControlHub' },
          targetingOverride: { restrictions: [{ stat: 'class', comparison: 'LTE', value: 4 }] }
        }]
      }]
    };

    // player2 DCH has shields — not exposed
    const player1 = makePlayerState({ bridge: 2, droneControlHub: 2, powerCell: 2 });
    const player2 = makePlayerState({ bridge: 2, droneControlHub: 3, powerCell: 2 });

    const resolved = resolveConditionalTargeting(card, 'player1', player1, player2);

    expect(resolved.effects[0].targeting.restrictions[0].value).toBe(1);
  });

  it('returns definition unchanged when no PRE_TARGETING conditionals exist', () => {
    const card = {
      id: 'COMMAND_OVERRIDE',
      effects: [{
        type: 'DISCARD', count: 1,
        targeting: { type: 'NONE' },
        conditionals: [{
          id: 'bridge-exposed-bonus',
          timing: 'PRE',
          condition: { type: 'SECTION_EXPOSED', section: 'bridge' },
          grantedEffect: { type: 'OVERRIDE_VALUE', property: 'count', value: 3 }
        }]
      }]
    };

    const player1 = makePlayerState({});
    const player2 = makePlayerState({ bridge: 0 });

    const resolved = resolveConditionalTargeting(card, 'player1', player1, player2);

    // Should be the same object (no copy needed)
    expect(resolved).toBe(card);
  });

  it('returns definition unchanged when card has no effects', () => {
    const card = { id: 'EMPTY_CARD' };
    const player1 = makePlayerState({});
    const player2 = makePlayerState({});

    const resolved = resolveConditionalTargeting(card, 'player1', player1, player2);
    expect(resolved).toBe(card);
  });
});
