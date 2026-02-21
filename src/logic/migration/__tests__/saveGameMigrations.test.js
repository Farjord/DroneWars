import { describe, test, expect } from 'vitest';
import {
  createEmptyDroneSlots,
  migrateDroneSlotsToNewFormat,
  convertDronesToSlots,
  convertComponentsToSectionSlots,
  migrateShipSlotToNewFormat,
  migrateTacticalItems,
} from '../../../data/saveGameSchema.js';
import { getAllTacticalItemIds } from '../../../data/tacticalItemData.js';

// --- createEmptyDroneSlots ---

describe('createEmptyDroneSlots', () => {
  test('returns exactly 5 slots', () => {
    const slots = createEmptyDroneSlots();
    expect(slots).toHaveLength(5);
  });

  test('each slot has correct shape with slotIndex matching its index', () => {
    const slots = createEmptyDroneSlots();
    slots.forEach((slot, i) => {
      expect(slot).toEqual({
        slotIndex: i,
        slotDamaged: false,
        assignedDrone: null,
      });
    });
  });
});

// --- migrateDroneSlotsToNewFormat ---

describe('migrateDroneSlotsToNewFormat', () => {
  test('null input returns 5 empty slots', () => {
    const result = migrateDroneSlotsToNewFormat(null);
    expect(result).toHaveLength(5);
    expect(result).toEqual(createEmptyDroneSlots());
  });

  test('undefined input returns 5 empty slots', () => {
    const result = migrateDroneSlotsToNewFormat(undefined);
    expect(result).toEqual(createEmptyDroneSlots());
  });

  test('old format { isDamaged, droneName } migrates correctly', () => {
    const oldSlots = [
      { slotIndex: 0, isDamaged: true, droneName: 'Scout' },
      { slotIndex: 1, isDamaged: false, droneName: null },
      { slotIndex: 2, isDamaged: false, droneName: 'Bomber' },
      { slotIndex: 3, isDamaged: true, droneName: null },
      { slotIndex: 4, isDamaged: false, droneName: null },
    ];
    const result = migrateDroneSlotsToNewFormat(oldSlots);
    expect(result[0]).toEqual({ slotIndex: 0, slotDamaged: true, assignedDrone: 'Scout' });
    expect(result[1]).toEqual({ slotIndex: 1, slotDamaged: false, assignedDrone: null });
    expect(result[2]).toEqual({ slotIndex: 2, slotDamaged: false, assignedDrone: 'Bomber' });
  });

  test('new format { slotDamaged, assignedDrone } passes through unchanged', () => {
    const newSlots = [
      { slotIndex: 0, slotDamaged: true, assignedDrone: 'Scout' },
      { slotIndex: 1, slotDamaged: false, assignedDrone: null },
      { slotIndex: 2, slotDamaged: false, assignedDrone: 'Bomber' },
      { slotIndex: 3, slotDamaged: false, assignedDrone: null },
      { slotIndex: 4, slotDamaged: false, assignedDrone: null },
    ];
    const result = migrateDroneSlotsToNewFormat(newSlots);
    expect(result).toEqual(newSlots);
  });

  test('mixed format slots migrate correctly', () => {
    const mixedSlots = [
      { slotIndex: 0, slotDamaged: true, assignedDrone: 'Scout' },
      { slotIndex: 1, isDamaged: true, droneName: 'Bomber' },
      { slotIndex: 2, slotDamaged: false, assignedDrone: null },
      { slotIndex: 3, isDamaged: false, droneName: null },
      { slotIndex: 4, slotDamaged: false, assignedDrone: null },
    ];
    const result = migrateDroneSlotsToNewFormat(mixedSlots);
    expect(result[0]).toEqual({ slotIndex: 0, slotDamaged: true, assignedDrone: 'Scout' });
    expect(result[1]).toEqual({ slotIndex: 1, slotDamaged: true, assignedDrone: 'Bomber' });
    expect(result[3]).toEqual({ slotIndex: 3, slotDamaged: false, assignedDrone: null });
  });
});

// --- convertDronesToSlots ---

describe('convertDronesToSlots', () => {
  test('empty array returns 5 empty slots', () => {
    const result = convertDronesToSlots([]);
    expect(result).toHaveLength(5);
    expect(result).toEqual(createEmptyDroneSlots());
  });

  test('no args returns 5 empty slots', () => {
    const result = convertDronesToSlots();
    expect(result).toEqual(createEmptyDroneSlots());
  });

  test('partial array fills first slots, rest empty', () => {
    const drones = [
      { name: 'Scout', isDamaged: false },
      { name: 'Bomber', isDamaged: true },
    ];
    const result = convertDronesToSlots(drones);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ slotIndex: 0, slotDamaged: false, assignedDrone: 'Scout' });
    expect(result[1]).toEqual({ slotIndex: 1, slotDamaged: true, assignedDrone: 'Bomber' });
    expect(result[2]).toEqual({ slotIndex: 2, slotDamaged: false, assignedDrone: null });
    expect(result[4]).toEqual({ slotIndex: 4, slotDamaged: false, assignedDrone: null });
  });

  test('full array fills all 5 slots', () => {
    const drones = [
      { name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' },
    ];
    const result = convertDronesToSlots(drones);
    result.forEach((slot, i) => {
      expect(slot.assignedDrone).toBe(drones[i].name);
    });
  });

  test('more than 5 drones only uses first 5', () => {
    const drones = [
      { name: 'A' }, { name: 'B' }, { name: 'C' },
      { name: 'D' }, { name: 'E' }, { name: 'F' },
    ];
    const result = convertDronesToSlots(drones);
    expect(result).toHaveLength(5);
    expect(result[4].assignedDrone).toBe('E');
  });

  test('null entries in array are handled', () => {
    const drones = [{ name: 'Scout' }, null, { name: 'Bomber' }];
    const result = convertDronesToSlots(drones);
    expect(result).toHaveLength(5);
    expect(result[0].assignedDrone).toBe('Scout');
    expect(result[1].assignedDrone).toBeNull();
    expect(result[2].assignedDrone).toBe('Bomber');
  });
});

// --- convertComponentsToSectionSlots ---

describe('convertComponentsToSectionSlots', () => {
  test('empty object returns all null components', () => {
    const result = convertComponentsToSectionSlots({});
    expect(result).toEqual({
      l: { componentId: null, damageDealt: 0 },
      m: { componentId: null, damageDealt: 0 },
      r: { componentId: null, damageDealt: 0 },
    });
  });

  test('no args returns all null components', () => {
    const result = convertComponentsToSectionSlots();
    expect(result).toEqual({
      l: { componentId: null, damageDealt: 0 },
      m: { componentId: null, damageDealt: 0 },
      r: { componentId: null, damageDealt: 0 },
    });
  });

  test('full mapping fills all lanes', () => {
    const components = { shield: 'l', cannon: 'm', engine: 'r' };
    const result = convertComponentsToSectionSlots(components);
    expect(result.l).toEqual({ componentId: 'shield', damageDealt: 0 });
    expect(result.m).toEqual({ componentId: 'cannon', damageDealt: 0 });
    expect(result.r).toEqual({ componentId: 'engine', damageDealt: 0 });
  });

  test('partial mapping fills only that lane', () => {
    const components = { shield: 'm' };
    const result = convertComponentsToSectionSlots(components);
    expect(result.m).toEqual({ componentId: 'shield', damageDealt: 0 });
    expect(result.l).toEqual({ componentId: null, damageDealt: 0 });
    expect(result.r).toEqual({ componentId: null, damageDealt: 0 });
  });

  test('invalid lane key is silently ignored', () => {
    const components = { shield: 'x', cannon: 'm' };
    const result = convertComponentsToSectionSlots(components);
    expect(result.m).toEqual({ componentId: 'cannon', damageDealt: 0 });
    expect(result.l).toEqual({ componentId: null, damageDealt: 0 });
    expect(result.r).toEqual({ componentId: null, damageDealt: 0 });
    expect(result).not.toHaveProperty('x');
  });
});

// --- migrateShipSlotToNewFormat ---

describe('migrateShipSlotToNewFormat', () => {
  test('already-migrated slot passes through with drones stripped', () => {
    const slot = {
      shipId: 'ship1',
      droneSlots: createEmptyDroneSlots(),
      sectionSlots: convertComponentsToSectionSlots(),
      drones: [{ name: 'Scout' }],
    };
    const result = migrateShipSlotToNewFormat(slot);
    expect(result.droneSlots).toEqual(slot.droneSlots);
    expect(result.sectionSlots).toEqual(slot.sectionSlots);
    expect(result).not.toHaveProperty('drones');
  });

  test('legacy slot with drones and shipComponents migrates to new format', () => {
    const slot = {
      shipId: 'ship1',
      drones: [
        { name: 'Scout', isDamaged: false },
        { name: 'Bomber', isDamaged: true },
      ],
      shipComponents: { shield: 'l', cannon: 'm' },
    };
    const result = migrateShipSlotToNewFormat(slot);
    expect(result.droneSlots).toHaveLength(5);
    expect(result.droneSlots[0].assignedDrone).toBe('Scout');
    expect(result.droneSlots[1].assignedDrone).toBe('Bomber');
    expect(result.droneSlots[1].slotDamaged).toBe(true);
    expect(result.sectionSlots.l.componentId).toBe('shield');
    expect(result.sectionSlots.m.componentId).toBe('cannon');
    expect(result).not.toHaveProperty('drones');
  });

  test('migrated slot without drones prop passes through cleanly', () => {
    const slot = {
      shipId: 'ship1',
      droneSlots: createEmptyDroneSlots(),
      sectionSlots: convertComponentsToSectionSlots(),
    };
    const result = migrateShipSlotToNewFormat(slot);
    expect(result.droneSlots).toEqual(slot.droneSlots);
    expect(result.sectionSlots).toEqual(slot.sectionSlots);
    expect(result).not.toHaveProperty('drones');
  });
});

// --- migrateTacticalItems ---

describe('migrateTacticalItems', () => {
  const allIds = getAllTacticalItemIds();

  test('profile with no tacticalItems gets them added with all 0', () => {
    const profile = { name: 'Player1' };
    const result = migrateTacticalItems(profile);
    expect(result.tacticalItems).toBeDefined();
    allIds.forEach((id) => {
      expect(result.tacticalItems[id]).toBe(0);
    });
  });

  test('profile with existing values preserves them', () => {
    const existing = {};
    allIds.forEach((id) => { existing[id] = 5; });
    const profile = { tacticalItems: existing };
    const result = migrateTacticalItems(profile);
    allIds.forEach((id) => {
      expect(result.tacticalItems[id]).toBe(5);
    });
  });

  test('profile with partial tacticalItems backfills missing', () => {
    const partial = {};
    if (allIds.length > 0) partial[allIds[0]] = 3;
    const profile = { tacticalItems: partial };
    const result = migrateTacticalItems(profile);
    expect(result.tacticalItems[allIds[0]]).toBe(3);
    allIds.slice(1).forEach((id) => {
      expect(result.tacticalItems[id]).toBe(0);
    });
  });

  test('does not modify other profile properties', () => {
    const profile = { name: 'Player1', credits: 100 };
    const result = migrateTacticalItems(profile);
    expect(result.name).toBe('Player1');
    expect(result.credits).toBe(100);
  });

  test('returns new object without mutating input', () => {
    const profile = { name: 'Player1' };
    const result = migrateTacticalItems(profile);
    expect(result).not.toBe(profile);
    expect(profile).not.toHaveProperty('tacticalItems');
  });
});
