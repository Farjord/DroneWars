import { describe, test, expect } from 'vitest';
import { SAVE_VERSION } from '../../../data/saveGameSchema.js';
import { createNewSave } from '../saveGameFactory.js';
import { validateSaveFile } from '../saveGameValidator.js';

function makeValidSave(overrides = {}) {
  return { ...createNewSave(), ...overrides };
}

describe('validateSaveFile', () => {
  // --- Valid saves ---

  test('valid new save passes', () => {
    const result = validateSaveFile(createNewSave());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // --- Required fields ---

  test('missing required field produces error', () => {
    const requiredFields = [
      ['saveVersion', 'Missing saveVersion'],
      ['playerProfile', 'Missing playerProfile'],
      ['inventory', 'Missing inventory'],
      ['droneInstances', 'Missing droneInstances'],
      ['shipComponentInstances', 'Missing shipComponentInstances'],
      ['discoveredCards', 'Missing discoveredCards'],
      ['shipSlots', 'Missing shipSlots'],
    ];
    for (const [field, expectedError] of requiredFields) {
      const save = makeValidSave({ [field]: null });
      const result = validateSaveFile(save);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expectedError);
    }
  });

  // --- Version check ---

  test('wrong saveVersion produces incompatible version error', () => {
    const save = makeValidSave({ saveVersion: '0.0' });
    const result = validateSaveFile(save);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Incompatible version'))).toBe(true);
  });

  // --- Player profile validation ---

  test('non-number gameSeed produces error', () => {
    const save = createNewSave();
    save.playerProfile.gameSeed = 'not-a-number';
    const result = validateSaveFile(save);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('playerProfile.gameSeed must be a number');
  });

  test('highestUnlockedSlot negative produces error', () => {
    const save = createNewSave();
    save.playerProfile.highestUnlockedSlot = -1;
    const result = validateSaveFile(save);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('playerProfile.highestUnlockedSlot must be 0-5');
  });

  test('highestUnlockedSlot above 5 produces error', () => {
    const save = createNewSave();
    save.playerProfile.highestUnlockedSlot = 6;
    const result = validateSaveFile(save);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('playerProfile.highestUnlockedSlot must be 0-5');
  });

  test('valid highestUnlockedSlot (0-5) passes', () => {
    for (let i = 0; i <= 5; i++) {
      const save = createNewSave();
      save.playerProfile.highestUnlockedSlot = i;
      const result = validateSaveFile(save);
      expect(result.valid).toBe(true);
    }
  });

  // --- Ship slots validation ---

  test('wrong ship slot count produces error', () => {
    const save = createNewSave();
    save.shipSlots = save.shipSlots.slice(0, 3);
    const result = validateSaveFile(save);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid ship slot count'))).toBe(true);
  });

  test('slot 0 not immutable produces error', () => {
    const save = createNewSave();
    save.shipSlots[0].isImmutable = false;
    const result = validateSaveFile(save);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Slot 0 must be immutable');
  });

  // --- Type checks ---

  test('non-array field produces type error', () => {
    const arrayFields = [
      ['droneInstances', 'droneInstances must be an array'],
      ['shipComponentInstances', 'shipComponentInstances must be an array'],
      ['discoveredCards', 'discoveredCards must be an array'],
    ];
    for (const [field, expectedError] of arrayFields) {
      const save = makeValidSave({ [field]: 'not-array' });
      const result = validateSaveFile(save);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expectedError);
    }
  });

  // --- Discovered cards entries ---

  test('entry missing cardId produces error', () => {
    const save = createNewSave();
    save.discoveredCards = [{ state: 'owned' }];
    const result = validateSaveFile(save);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('discoveredCards entry missing cardId');
  });

  test('entry with invalid state produces error', () => {
    const save = createNewSave();
    save.discoveredCards = [{ cardId: 'test', state: 'bogus' }];
    const result = validateSaveFile(save);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid discoveredCards state'))).toBe(true);
  });

  test('valid entries pass', () => {
    const save = createNewSave();
    save.discoveredCards = [
      { cardId: 'a', state: 'owned' },
      { cardId: 'b', state: 'discovered' },
      { cardId: 'c', state: 'undiscovered' },
    ];
    const result = validateSaveFile(save);
    expect(result.valid).toBe(true);
  });

  // --- Quick deployments ---

  describe('quick deployments', () => {
    function makeDeployment(overrides = {}) {
      return {
        id: 'qd-1',
        name: 'Test Deploy',
        droneRoster: ['a', 'b', 'c', 'd', 'e'],
        placements: [{ droneName: 'a', lane: 0 }],
        ...overrides,
      };
    }

    test('not array produces error', () => {
      const save = makeValidSave({ quickDeployments: 'bad' });
      const result = validateSaveFile(save);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('quickDeployments must be an array');
    });

    test('more than 5 entries produces error', () => {
      const save = createNewSave();
      save.quickDeployments = Array.from({ length: 6 }, (_, i) => makeDeployment({ id: `qd-${i}` }));
      const result = validateSaveFile(save);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('quickDeployments cannot exceed 5 entries');
    });

    test('entry missing id produces error', () => {
      const save = createNewSave();
      save.quickDeployments = [makeDeployment({ id: null })];
      const result = validateSaveFile(save);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing or invalid id'))).toBe(true);
    });

    test('entry missing name produces error', () => {
      const save = createNewSave();
      save.quickDeployments = [makeDeployment({ name: null })];
      const result = validateSaveFile(save);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing or invalid name'))).toBe(true);
    });

    test('invalid droneRoster (not array of 5) produces error', () => {
      const save = createNewSave();
      save.quickDeployments = [makeDeployment({ droneRoster: ['a', 'b'] })];
      const result = validateSaveFile(save);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('droneRoster must be array of 5'))).toBe(true);
    });

    test('invalid placements (not array) produces error', () => {
      const save = createNewSave();
      save.quickDeployments = [makeDeployment({ placements: 'bad' })];
      const result = validateSaveFile(save);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('placements must be an array'))).toBe(true);
    });

    test('invalid placement (bad lane) produces error', () => {
      const save = createNewSave();
      save.quickDeployments = [makeDeployment({ placements: [{ droneName: 'a', lane: 5 }] })];
      const result = validateSaveFile(save);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('placement invalid'))).toBe(true);
    });

    test('undefined quickDeployments passes (backward compatible)', () => {
      const save = createNewSave();
      delete save.quickDeployments;
      const result = validateSaveFile(save);
      expect(result.valid).toBe(true);
    });

    test('valid quickDeployments pass', () => {
      const save = createNewSave();
      save.quickDeployments = [makeDeployment()];
      const result = validateSaveFile(save);
      expect(result.valid).toBe(true);
    });
  });

  // --- Boss progress ---

  test('defeatedBosses not array produces error', () => {
    const save = createNewSave();
    save.playerProfile.bossProgress = { defeatedBosses: 'bad' };
    const result = validateSaveFile(save);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('bossProgress.defeatedBosses must be an array');
  });

  test('missing bossProgress passes (backward compatible)', () => {
    const save = createNewSave();
    delete save.playerProfile.bossProgress;
    const result = validateSaveFile(save);
    expect(result.valid).toBe(true);
  });

  test('valid bossProgress passes', () => {
    const save = createNewSave();
    save.playerProfile.bossProgress = { defeatedBosses: ['boss-1'] };
    const result = validateSaveFile(save);
    expect(result.valid).toBe(true);
  });
});
