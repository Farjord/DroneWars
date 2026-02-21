import { describe, test, expect } from 'vitest';
import {
  SAVE_VERSION,
  defaultPlayerProfile,
} from '../saveGameSchema.js';
import { getAllTacticalItemIds } from '../tacticalItemData.js';

describe('defaultPlayerProfile', () => {
  test('has saveVersion matching SAVE_VERSION', () => {
    expect(defaultPlayerProfile.saveVersion).toBe(SAVE_VERSION);
  });

  test('has tacticalItems with all IDs initialized to 0', () => {
    const expectedIds = getAllTacticalItemIds();
    expect(Object.keys(defaultPlayerProfile.tacticalItems).length).toBe(expectedIds.length);
    const failures = expectedIds.filter((id) => defaultPlayerProfile.tacticalItems[id] !== 0);
    expect(failures).toEqual([]);
  });

  test('has bossProgress with empty defaults', () => {
    expect(defaultPlayerProfile.bossProgress.defeatedBosses).toEqual([]);
    expect(defaultPlayerProfile.bossProgress.totalBossVictories).toBe(0);
    expect(defaultPlayerProfile.bossProgress.totalBossAttempts).toBe(0);
  });

  test('has missions object with empty arrays', () => {
    expect(defaultPlayerProfile.missions.completed).toEqual([]);
    expect(defaultPlayerProfile.missions.claimable).toEqual([]);
  });

  test('has tutorialDismissals all false', () => {
    const trueKeys = Object.entries(defaultPlayerProfile.tutorialDismissals)
      .filter(([, val]) => val !== false)
      .map(([key]) => key);
    expect(trueKeys).toEqual([]);
  });
});
