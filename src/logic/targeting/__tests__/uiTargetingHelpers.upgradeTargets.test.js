// ========================================
// UPGRADE TARGETING TESTS
// ========================================
// TDD tests for calculateUpgradeTargets and calculateAllValidTargets
// with Upgrade cards. Verifies slot availability, maxApplications limits,
// and multi-slot upgrade filtering.

import { describe, it, expect } from 'vitest';
import { calculateUpgradeTargets, calculateAllValidTargets } from '../uiTargetingHelpers.js';

// Minimal drone pool entries matching droneData.js names
const makeDrone = (name, overrides = {}) => ({ name, id: name, ...overrides });

describe('calculateUpgradeTargets', () => {
  const baseUpgradeCard = {
    id: 'SLIMLINE_BODYWORK',
    type: 'Upgrade',
    slots: 1,
    maxApplications: 1,
    effects: [{ type: 'MODIFY_DRONE_BASE', targeting: { type: 'NONE' } }],
  };

  it('returns drones with available upgrade slots', () => {
    // Dart has 2 slots, Talon has 3 — both should be valid
    const playerState = {
      activeDronePool: [makeDrone('Dart'), makeDrone('Talon')],
      appliedUpgrades: {},
    };

    const result = calculateUpgradeTargets(baseUpgradeCard, playerState);

    expect(result).toHaveLength(2);
    expect(result.map(d => d.name)).toEqual(['Dart', 'Talon']);
  });

  it('filters out drones with no remaining slots', () => {
    // Mammoth has 1 slot, already used by one 1-slot upgrade
    const playerState = {
      activeDronePool: [makeDrone('Dart'), makeDrone('Mammoth')],
      appliedUpgrades: {
        Mammoth: [{ cardId: 'OTHER_UPGRADE', slots: 1 }],
      },
    };

    const result = calculateUpgradeTargets(baseUpgradeCard, playerState);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Dart');
  });

  it('respects maxApplications limit', () => {
    // Dart has 2 slots, but SLIMLINE already applied once (maxApplications: 1)
    const playerState = {
      activeDronePool: [makeDrone('Dart')],
      appliedUpgrades: {
        Dart: [{ cardId: 'SLIMLINE_BODYWORK', slots: 1 }],
      },
    };

    const result = calculateUpgradeTargets(baseUpgradeCard, playerState);

    expect(result).toHaveLength(0);
  });

  it('handles multi-slot upgrade cards', () => {
    // OVERCLOCKED_THRUSTERS costs 2 slots
    const multiSlotCard = { ...baseUpgradeCard, id: 'OVERCLOCKED_THRUSTERS', slots: 2 };

    // Mammoth has 1 slot — not enough. Dart has 2 — enough. Talon has 3 — enough.
    const playerState = {
      activeDronePool: [makeDrone('Mammoth'), makeDrone('Dart'), makeDrone('Talon')],
      appliedUpgrades: {},
    };

    const result = calculateUpgradeTargets(multiSlotCard, playerState);

    expect(result).toHaveLength(2);
    expect(result.map(d => d.name)).toEqual(['Dart', 'Talon']);
  });

  it('calculateAllValidTargets routes Upgrade cards correctly', () => {
    const playerState = {
      activeDronePool: [makeDrone('Dart'), makeDrone('Talon')],
      appliedUpgrades: {},
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    };

    const { validCardTargets } = calculateAllValidTargets(
      null, null, baseUpgradeCard,
      playerState, // player1
      { activeDronePool: [], appliedUpgrades: {}, dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }, // player2
      'player1',
      null
    );

    // Must return targets, not empty — this is the regression test for the drag-drop bug
    expect(validCardTargets.length).toBeGreaterThan(0);
    expect(validCardTargets.map(d => d.name)).toEqual(['Dart', 'Talon']);
  });
});
