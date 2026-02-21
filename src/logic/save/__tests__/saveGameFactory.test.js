import { describe, test, expect } from 'vitest';
import { createDefaultShipSlot, createNewSave } from '../saveGameFactory.js';
import { SAVE_VERSION } from '../../../data/saveGameSchema.js';

// --- createDefaultShipSlot ---

describe('createDefaultShipSlot', () => {
  test('slot 0 has starter deck configuration', () => {
    const slot = createDefaultShipSlot(0);
    expect(slot.isImmutable).toBe(true);
    expect(slot.status).toBe('active');
    expect(slot.name).toBe('Starter Deck');
    expect(slot.shipId).toBe('SHIP_001');
  });

  test('slot 0 has populated data structures', () => {
    const slot = createDefaultShipSlot(0);
    expect(Array.isArray(slot.droneSlots)).toBe(true);
    expect(slot.droneSlots.length).toBeGreaterThan(0);
    expect(slot.sectionSlots).toHaveProperty('l');
    expect(slot.sectionSlots).toHaveProperty('m');
    expect(slot.sectionSlots).toHaveProperty('r');
    expect(Array.isArray(slot.decklist)).toBe(true);
    expect(slot.decklist.length).toBeGreaterThan(0);
  });

  test('slot 0 deep clone independence', () => {
    const slot1 = createDefaultShipSlot(0);
    slot1.decklist.push('MUTATED');
    slot1.droneSlots.push('MUTATED');

    const slot2 = createDefaultShipSlot(0);
    expect(slot2.decklist).not.toContain('MUTATED');
    expect(slot2.droneSlots).not.toContain('MUTATED');
  });

  test('slots 1-5 are empty with correct defaults', () => {
    for (let i = 1; i <= 5; i++) {
      const slot = createDefaultShipSlot(i);
      expect(slot.status).toBe('empty');
      expect(slot.isImmutable).toBe(false);
      expect(slot.shipId).toBeNull();
      expect(slot.decklist).toEqual([]);
      expect(slot.droneSlots).toHaveLength(5);
      slot.droneSlots.forEach((ds) => expect(ds.assignedDrone).toBeNull());
      for (const lane of ['l', 'm', 'r']) {
        expect(slot.sectionSlots[lane].componentId).toBeNull();
      }
    }
  });
});

// --- createNewSave ---

describe('createNewSave', () => {
  test('returns complete save structure', () => {
    const save = createNewSave();
    expect(save.saveVersion).toBe(SAVE_VERSION);
    expect(typeof save.savedAt).toBe('number');
    expect(save.savedAt).toBeGreaterThan(0);
    expect(save.playerProfile).toBeDefined();
    expect(typeof save.playerProfile.credits).toBe('number');
    expect(save.playerProfile.stats).toBeDefined();
    expect(save.playerProfile.reputation).toBeDefined();
    expect(save.inventory).toEqual({});
    expect(save.droneInstances).toEqual([]);
    expect(save.shipComponentInstances).toEqual([]);
    expect(save.discoveredCards).toEqual([]);
    expect(save.currentRunState).toBeNull();
    expect(save.quickDeployments).toEqual([]);
  });

  test('has correct ship slot configuration', () => {
    const save = createNewSave();
    expect(save.shipSlots).toHaveLength(6);
    expect(save.shipSlots[0].isImmutable).toBe(true);
    expect(save.shipSlots[0].status).toBe('active');
    for (let i = 1; i <= 5; i++) {
      expect(save.shipSlots[i].status).toBe('empty');
      expect(save.shipSlots[i].isImmutable).toBe(false);
    }
  });

  test('deep clone independence', () => {
    const save1 = createNewSave();
    save1.shipSlots.push('MUTATED');
    save1.playerProfile.credits = 999999;
    save1.droneInstances.push('MUTATED');

    const save2 = createNewSave();
    expect(save2.shipSlots).toHaveLength(6);
    expect(save2.playerProfile.credits).not.toBe(999999);
    expect(save2.droneInstances).toEqual([]);
  });
});
