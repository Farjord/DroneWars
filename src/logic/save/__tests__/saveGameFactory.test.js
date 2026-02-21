import { describe, test, expect } from 'vitest';
import { createDefaultShipSlot, createNewSave } from '../saveGameFactory.js';
import { SAVE_VERSION } from '../../../data/saveGameSchema.js';

// --- createDefaultShipSlot ---

describe('createDefaultShipSlot', () => {
  describe('slot 0 (starter deck)', () => {
    test('is immutable', () => {
      const slot = createDefaultShipSlot(0);
      expect(slot.isImmutable).toBe(true);
    });

    test('has active status', () => {
      const slot = createDefaultShipSlot(0);
      expect(slot.status).toBe('active');
    });

    test('is named Starter Deck', () => {
      const slot = createDefaultShipSlot(0);
      expect(slot.name).toBe('Starter Deck');
    });

    test('has shipId SHIP_001', () => {
      const slot = createDefaultShipSlot(0);
      expect(slot.shipId).toBe('SHIP_001');
    });

    test('has droneSlots array', () => {
      const slot = createDefaultShipSlot(0);
      expect(Array.isArray(slot.droneSlots)).toBe(true);
      expect(slot.droneSlots.length).toBeGreaterThan(0);
    });

    test('has sectionSlots object with l/m/r lanes', () => {
      const slot = createDefaultShipSlot(0);
      expect(slot.sectionSlots).toBeDefined();
      expect(slot.sectionSlots).toHaveProperty('l');
      expect(slot.sectionSlots).toHaveProperty('m');
      expect(slot.sectionSlots).toHaveProperty('r');
    });

    test('has non-empty decklist', () => {
      const slot = createDefaultShipSlot(0);
      expect(Array.isArray(slot.decklist)).toBe(true);
      expect(slot.decklist.length).toBeGreaterThan(0);
    });

    test('deep clone independence — mutating one call does not affect the next', () => {
      const slot1 = createDefaultShipSlot(0);
      slot1.decklist.push('MUTATED');
      slot1.droneSlots.push('MUTATED');

      const slot2 = createDefaultShipSlot(0);
      expect(slot2.decklist).not.toContain('MUTATED');
      expect(slot2.droneSlots).not.toContain('MUTATED');
    });
  });

  describe('slots 1-5 (empty)', () => {
    test('has empty status', () => {
      const slot = createDefaultShipSlot(1);
      expect(slot.status).toBe('empty');
    });

    test('is not immutable', () => {
      const slot = createDefaultShipSlot(1);
      expect(slot.isImmutable).toBe(false);
    });

    test('has null shipId', () => {
      const slot = createDefaultShipSlot(1);
      expect(slot.shipId).toBeNull();
    });

    test('has empty decklist', () => {
      const slot = createDefaultShipSlot(1);
      expect(slot.decklist).toEqual([]);
    });

    test('has 5 empty drone slots', () => {
      const slot = createDefaultShipSlot(1);
      expect(slot.droneSlots).toHaveLength(5);
      slot.droneSlots.forEach(ds => {
        expect(ds.assignedDrone).toBeNull();
      });
    });

    test('sectionSlots have null componentId for all lanes', () => {
      const slot = createDefaultShipSlot(1);
      for (const lane of ['l', 'm', 'r']) {
        expect(slot.sectionSlots[lane].componentId).toBeNull();
      }
    });
  });
});

// --- createNewSave ---

describe('createNewSave', () => {
  test('has saveVersion matching SAVE_VERSION', () => {
    const save = createNewSave();
    expect(save.saveVersion).toBe(SAVE_VERSION);
  });

  test('has savedAt as a number (timestamp)', () => {
    const save = createNewSave();
    expect(typeof save.savedAt).toBe('number');
    expect(save.savedAt).toBeGreaterThan(0);
  });

  test('has playerProfile with expected fields', () => {
    const save = createNewSave();
    const p = save.playerProfile;
    expect(p).toBeDefined();
    expect(typeof p.credits).toBe('number');
    expect(p.stats).toBeDefined();
    expect(p.reputation).toBeDefined();
    expect(typeof p.gameSeed).toBe('number');
  });

  test('has inventory as empty object', () => {
    const save = createNewSave();
    expect(save.inventory).toEqual({});
  });

  test('has droneInstances as empty array', () => {
    const save = createNewSave();
    expect(save.droneInstances).toEqual([]);
  });

  test('has shipComponentInstances as empty array', () => {
    const save = createNewSave();
    expect(save.shipComponentInstances).toEqual([]);
  });

  test('has discoveredCards as empty array', () => {
    const save = createNewSave();
    expect(save.discoveredCards).toEqual([]);
  });

  test('has shipSlots with exactly 6 entries', () => {
    const save = createNewSave();
    expect(save.shipSlots).toHaveLength(6);
  });

  test('shipSlots[0] is immutable starter', () => {
    const save = createNewSave();
    expect(save.shipSlots[0].isImmutable).toBe(true);
    expect(save.shipSlots[0].status).toBe('active');
  });

  test('shipSlots[1-5] are empty', () => {
    const save = createNewSave();
    for (let i = 1; i <= 5; i++) {
      expect(save.shipSlots[i].status).toBe('empty');
      expect(save.shipSlots[i].isImmutable).toBe(false);
    }
  });

  test('has currentRunState as null', () => {
    const save = createNewSave();
    expect(save.currentRunState).toBeNull();
  });

  test('has quickDeployments as empty array', () => {
    const save = createNewSave();
    expect(save.quickDeployments).toEqual([]);
  });

  test('deep clone independence — mutating returned save does not affect the next call', () => {
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
