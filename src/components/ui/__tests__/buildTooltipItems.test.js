/**
 * buildTooltipItems.test.js
 * TDD tests for the pure buildTooltipItems utility function.
 * Tests that drone state is correctly mapped to tooltip item arrays.
 */

import { describe, it, expect } from 'vitest';
import { buildTooltipItems } from '../DroneTooltipPanel.jsx';
import droneTooltipDescriptions from '../../../data/descriptions/droneTooltipDescriptions.js';

// --- Helpers ---

/** Minimal drone with no statuses/effects */
const baseDroneState = () => ({
  id: 'drone_1',
  name: 'Dart',
  cannotAttack: false,
  cannotMove: false,
  cannotIntercept: false,
  isSnared: false,
  isSuppressed: false,
  doesNotReady: false,
  isMarked: false,
  isExhausted: false,
  triggerUsesMap: {},
});

/** Minimal effectiveStats with empty keywords */
const baseEffectiveStats = () => ({
  attack: 2,
  speed: 3,
  baseAttack: 2,
  baseSpeed: 3,
  maxShields: 1,
  keywords: new Set(),
});

/** Minimal baseDrone (from droneData) with no special abilities */
const baseBaseDrone = () => ({
  name: 'Dart',
  abilities: [],
});

/** Assert that an item has the required shape */
const assertItemShape = (item) => {
  expect(item).toHaveProperty('key');
  expect(item).toHaveProperty('icon');
  expect(item).toHaveProperty('label');
  expect(item).toHaveProperty('description');
  expect(item).toHaveProperty('accentColor');
  expect(typeof item.key).toBe('string');
  expect(typeof item.label).toBe('string');
  expect(typeof item.description).toBe('string');
  expect(typeof item.accentColor).toBe('string');
};

// --- Tests ---

describe('buildTooltipItems', () => {
  it('returns empty array for drone with no statuses, keywords, or damageType', () => {
    const items = buildTooltipItems(baseDroneState(), baseEffectiveStats(), baseBaseDrone());
    expect(items).toEqual([]);
  });

  // --- Status effects ---

  it('returns cannot-attack item when drone.cannotAttack is true', () => {
    const drone = { ...baseDroneState(), cannotAttack: true };
    const items = buildTooltipItems(drone, baseEffectiveStats(), baseBaseDrone());
    const item = items.find(i => i.key === 'cannot-attack');
    expect(item).toBeDefined();
    expect(item.label).toBe('Cannot Attack');
    expect(item.description).toBe(droneTooltipDescriptions['cannot-attack'].description);
  });

  it('returns cannot-move item when drone.cannotMove is true', () => {
    const drone = { ...baseDroneState(), cannotMove: true };
    const items = buildTooltipItems(drone, baseEffectiveStats(), baseBaseDrone());
    const item = items.find(i => i.key === 'cannot-move');
    expect(item).toBeDefined();
    expect(item.label).toBe('Cannot Move');
  });

  it('returns cannot-intercept item when drone.cannotIntercept is true', () => {
    const drone = { ...baseDroneState(), cannotIntercept: true };
    const items = buildTooltipItems(drone, baseEffectiveStats(), baseBaseDrone());
    const item = items.find(i => i.key === 'cannot-intercept');
    expect(item).toBeDefined();
    expect(item.label).toBe('Cannot Intercept');
  });

  it('returns snared item when drone.isSnared is true', () => {
    const drone = { ...baseDroneState(), isSnared: true };
    const items = buildTooltipItems(drone, baseEffectiveStats(), baseBaseDrone());
    const item = items.find(i => i.key === 'snared');
    expect(item).toBeDefined();
    expect(item.label).toBe('Snared');
  });

  it('returns suppressed item when drone.isSuppressed is true', () => {
    const drone = { ...baseDroneState(), isSuppressed: true };
    const items = buildTooltipItems(drone, baseEffectiveStats(), baseBaseDrone());
    const item = items.find(i => i.key === 'suppressed');
    expect(item).toBeDefined();
    expect(item.label).toBe('Suppressed');
  });

  it('returns does-not-ready item when drone.doesNotReady is true', () => {
    const drone = { ...baseDroneState(), doesNotReady: true };
    const items = buildTooltipItems(drone, baseEffectiveStats(), baseBaseDrone());
    const item = items.find(i => i.key === 'does-not-ready');
    expect(item).toBeDefined();
    expect(item.label).toBe('Does Not Ready');
  });

  // --- Traits ---

  it('returns marked item when drone.isMarked is true', () => {
    const drone = { ...baseDroneState(), isMarked: true };
    const items = buildTooltipItems(drone, baseEffectiveStats(), baseBaseDrone());
    const item = items.find(i => i.key === 'marked');
    expect(item).toBeDefined();
    expect(item.label).toBe('Marked');
  });

  it('returns passive item when effectiveStats.keywords has PASSIVE', () => {
    const stats = { ...baseEffectiveStats(), keywords: new Set(['PASSIVE']) };
    const items = buildTooltipItems(baseDroneState(), stats, baseBaseDrone());
    const item = items.find(i => i.key === 'passive');
    expect(item).toBeDefined();
    expect(item.label).toBe('Passive');
  });

  it('returns inert item when effectiveStats.keywords has INERT', () => {
    const stats = { ...baseEffectiveStats(), keywords: new Set(['INERT']) };
    const items = buildTooltipItems(baseDroneState(), stats, baseBaseDrone());
    const item = items.find(i => i.key === 'inert');
    expect(item).toBeDefined();
    expect(item.label).toBe('Inert');
  });

  // --- Keywords (permanent) ---

  it('returns guardian item when effectiveStats.keywords has GUARDIAN', () => {
    const stats = { ...baseEffectiveStats(), keywords: new Set(['GUARDIAN']) };
    const items = buildTooltipItems(baseDroneState(), stats, baseBaseDrone());
    const item = items.find(i => i.key === 'guardian');
    expect(item).toBeDefined();
    expect(item.label).toBe('Guardian');
  });

  it('returns jammer item when effectiveStats.keywords has JAMMER', () => {
    const stats = { ...baseEffectiveStats(), keywords: new Set(['JAMMER']) };
    const items = buildTooltipItems(baseDroneState(), stats, baseBaseDrone());
    const item = items.find(i => i.key === 'jammer');
    expect(item).toBeDefined();
    expect(item.label).toBe('Jammer');
  });

  it('returns piercing item when effectiveStats.keywords has PIERCING', () => {
    const stats = { ...baseEffectiveStats(), keywords: new Set(['PIERCING']) };
    const items = buildTooltipItems(baseDroneState(), stats, baseBaseDrone());
    const item = items.find(i => i.key === 'piercing');
    expect(item).toBeDefined();
    expect(item.label).toBe('Piercing');
  });

  // --- Damage types ---

  it('returns shield-breaker item when drone.damageType is SHIELD_BREAKER', () => {
    const drone = { ...baseDroneState(), damageType: 'SHIELD_BREAKER' };
    const items = buildTooltipItems(drone, baseEffectiveStats(), baseBaseDrone());
    const item = items.find(i => i.key === 'shield-breaker');
    expect(item).toBeDefined();
    expect(item.label).toBe('Shield Breaker');
  });

  it('returns ion item when drone.damageType is ION', () => {
    const drone = { ...baseDroneState(), damageType: 'ION' };
    const items = buildTooltipItems(drone, baseEffectiveStats(), baseBaseDrone());
    const item = items.find(i => i.key === 'ion');
    expect(item).toBeDefined();
    expect(item.label).toBe('Ion Damage');
  });

  it('returns kinetic item when drone.damageType is KINETIC', () => {
    const drone = { ...baseDroneState(), damageType: 'KINETIC' };
    const items = buildTooltipItems(drone, baseEffectiveStats(), baseBaseDrone());
    const item = items.find(i => i.key === 'kinetic');
    expect(item).toBeDefined();
    expect(item.label).toBe('Kinetic Damage');
  });

  // --- Abilities (generic) ---

  it('returns ability item for a PASSIVE ability with emerald accent', () => {
    const bd = {
      ...baseBaseDrone(),
      abilities: [{ name: 'Guardian Protocol', type: 'PASSIVE', description: 'Protects nearby drones.' }],
    };
    const items = buildTooltipItems(baseDroneState(), baseEffectiveStats(), bd);
    const item = items.find(i => i.key === 'ability-guardian-protocol');
    expect(item).toBeDefined();
    expect(item.label).toBe('Guardian Protocol');
    expect(item.description).toBe('Protects nearby drones.');
    expect(item.accentColor).toBe('border-emerald-400');
  });

  it('returns ability item for a TRIGGERED ability with amber accent', () => {
    const bd = {
      ...baseBaseDrone(),
      abilities: [{ name: 'Rapid Response', type: 'TRIGGERED', description: 'First move each round does not exhaust.' }],
    };
    const items = buildTooltipItems(baseDroneState(), baseEffectiveStats(), bd);
    const item = items.find(i => i.key === 'ability-rapid-response');
    expect(item).toBeDefined();
    expect(item.label).toBe('Rapid Response');
    expect(item.description).toBe('First move each round does not exhaust.');
    expect(item.accentColor).toBe('border-amber-400');
  });

  it('returns ability item for an ACTIVE ability with sky accent', () => {
    const bd = {
      ...baseBaseDrone(),
      abilities: [{ name: 'EMP Burst', type: 'ACTIVE', description: 'Disables adjacent drones.' }],
    };
    const items = buildTooltipItems(baseDroneState(), baseEffectiveStats(), bd);
    const item = items.find(i => i.key === 'ability-emp-burst');
    expect(item).toBeDefined();
    expect(item.label).toBe('EMP Burst');
    expect(item.description).toBe('Disables adjacent drones.');
    expect(item.accentColor).toBe('border-sky-400');
  });

  it('returns multiple ability items for drone with several abilities', () => {
    const bd = {
      ...baseBaseDrone(),
      abilities: [
        { name: 'Rapid Response', type: 'TRIGGERED', description: 'First move does not exhaust.' },
        { name: 'Assault Protocol', type: 'TRIGGERED', description: 'First attack does not exhaust.' },
      ],
    };
    const items = buildTooltipItems(baseDroneState(), baseEffectiveStats(), bd);
    const abilityItems = items.filter(i => i.key.startsWith('ability-'));
    expect(abilityItems.length).toBe(2);
  });

  it('places ability items after keywords but before damage types', () => {
    const drone = { ...baseDroneState(), damageType: 'ION' };
    const stats = { ...baseEffectiveStats(), keywords: new Set(['GUARDIAN']) };
    const bd = {
      ...baseBaseDrone(),
      abilities: [{ name: 'Rapid Response', type: 'TRIGGERED', description: 'First move does not exhaust.' }],
    };
    const items = buildTooltipItems(drone, stats, bd);
    const guardianIdx = items.findIndex(i => i.key === 'guardian');
    const abilityIdx = items.findIndex(i => i.key === 'ability-rapid-response');
    const ionIdx = items.findIndex(i => i.key === 'ion');
    expect(abilityIdx).toBeGreaterThan(guardianIdx);
    expect(abilityIdx).toBeLessThan(ionIdx);
  });

  // --- Composite / shape ---

  it('returns multiple items for drone with several statuses in correct order', () => {
    const drone = { ...baseDroneState(), cannotAttack: true, isSnared: true, isMarked: true };
    const stats = { ...baseEffectiveStats(), keywords: new Set(['GUARDIAN']) };
    const items = buildTooltipItems(drone, stats, baseBaseDrone());

    expect(items.length).toBe(4);
    // Status effects first, then traits, then keywords
    expect(items[0].key).toBe('cannot-attack');
    expect(items[1].key).toBe('snared');
    expect(items[2].key).toBe('marked');
    expect(items[3].key).toBe('guardian');
  });

  it('each item has required shape: key, icon, label, description, accentColor', () => {
    const drone = { ...baseDroneState(), cannotAttack: true, damageType: 'ION' };
    const stats = { ...baseEffectiveStats(), keywords: new Set(['GUARDIAN']) };
    const bd = {
      ...baseBaseDrone(),
      abilities: [{ name: 'Rapid Response', type: 'TRIGGERED', description: 'First move does not exhaust.' }],
    };
    const items = buildTooltipItems(drone, stats, bd);

    expect(items.length).toBeGreaterThanOrEqual(3);
    items.forEach(assertItemShape);
  });

  // --- PIERCING damage type should NOT duplicate if keyword already present ---

  it('does not add piercing damage-type item when PIERCING keyword already present', () => {
    const drone = { ...baseDroneState(), damageType: 'PIERCING' };
    const stats = { ...baseEffectiveStats(), keywords: new Set(['PIERCING']) };
    const items = buildTooltipItems(drone, stats, baseBaseDrone());
    const piercingItems = items.filter(i => i.key === 'piercing');
    expect(piercingItems.length).toBe(1);
  });

  // --- Applied upgrades ---

  describe('upgrades', () => {
    const makeUpgrade = (overrides = {}) => ({
      instanceId: 'upgrade-test-1',
      cardId: 'COMBAT_ENHANCEMENT',
      cardName: 'Combat Enhancement',
      slots: 1,
      mod: { stat: 'attack', value: 1 },
      ...overrides,
    });

    it('shows card name and stat description for a stat mod upgrade', () => {
      const upgrades = [makeUpgrade()];
      const items = buildTooltipItems(baseDroneState(), baseEffectiveStats(), baseBaseDrone(), upgrades);
      const item = items.find(i => i.key === 'upgrade-upgrade-test-1');
      expect(item).toBeDefined();
      expect(item.label).toBe('Combat Enhancement');
      expect(item.description).toBe('+1 Attack');
      expect(item.accentColor).toBe('border-purple-500');
    });

    it('shows "Grants X" for an ability-granting upgrade', () => {
      const upgrades = [makeUpgrade({
        instanceId: 'upgrade-ability-1',
        cardName: 'Overload Module',
        mod: { stat: 'ability', abilityToAdd: { name: 'Piercing' } },
      })];
      const items = buildTooltipItems(baseDroneState(), baseEffectiveStats(), baseBaseDrone(), upgrades);
      const item = items.find(i => i.key === 'upgrade-upgrade-ability-1');
      expect(item).toBeDefined();
      expect(item.description).toBe('Grants Piercing');
    });

    it('produces multiple items for multiple upgrades', () => {
      const upgrades = [
        makeUpgrade({ instanceId: 'u1' }),
        makeUpgrade({ instanceId: 'u2', cardName: 'Shield Amplifier', mod: { stat: 'shields', value: 1 } }),
      ];
      const items = buildTooltipItems(baseDroneState(), baseEffectiveStats(), baseBaseDrone(), upgrades);
      const upgradeItems = items.filter(i => i.key.startsWith('upgrade-'));
      expect(upgradeItems).toHaveLength(2);
    });

    it('places upgrades after abilities but before damage types', () => {
      const drone = { ...baseDroneState(), damageType: 'ION' };
      const bd = {
        ...baseBaseDrone(),
        abilities: [{ name: 'Rapid Response', type: 'TRIGGERED', description: 'First move does not exhaust.' }],
      };
      const upgrades = [makeUpgrade({ instanceId: 'u-order' })];
      const items = buildTooltipItems(drone, baseEffectiveStats(), bd, upgrades);
      const abilityIdx = items.findIndex(i => i.key === 'ability-rapid-response');
      const upgradeIdx = items.findIndex(i => i.key === 'upgrade-u-order');
      const ionIdx = items.findIndex(i => i.key === 'ion');
      expect(upgradeIdx).toBeGreaterThan(abilityIdx);
      expect(upgradeIdx).toBeLessThan(ionIdx);
    });

    it('does not break when appliedUpgrades param is omitted', () => {
      const items = buildTooltipItems(baseDroneState(), baseEffectiveStats(), baseBaseDrone());
      expect(items).toEqual([]);
    });

    it('falls back to "Upgrade" label when cardName is missing', () => {
      const upgrades = [makeUpgrade({ instanceId: 'u-noname', cardName: undefined })];
      const items = buildTooltipItems(baseDroneState(), baseEffectiveStats(), baseBaseDrone(), upgrades);
      const item = items.find(i => i.key === 'upgrade-u-noname');
      expect(item.label).toBe('Upgrade');
    });

    it('each upgrade item has the required shape', () => {
      const upgrades = [makeUpgrade()];
      const items = buildTooltipItems(baseDroneState(), baseEffectiveStats(), baseBaseDrone(), upgrades);
      const item = items.find(i => i.key.startsWith('upgrade-'));
      assertItemShape(item);
    });
  });
});
