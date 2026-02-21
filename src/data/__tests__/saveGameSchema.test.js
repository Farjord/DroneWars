/**
 * Save Game Schema Tests — pure data validation
 * Verifies the static data constants exported by saveGameSchema.js
 */

import { describe, test, expect } from 'vitest';
import {
  SAVE_VERSION,
  defaultPlayerProfile,
  defaultInventory,
  defaultDiscoveredCards,
  defaultQuickDeployments,
  starterPoolCards,
  starterPoolDroneNames,
  starterPoolShipIds,
} from '../saveGameSchema.js';
import { getAllTacticalItemIds } from '../tacticalItemData.js';

// --- SAVE_VERSION ---

describe('SAVE_VERSION', () => {
  test('is a non-empty string', () => {
    expect(typeof SAVE_VERSION).toBe('string');
    expect(SAVE_VERSION.length).toBeGreaterThan(0);
  });
});

// --- starterPoolCards ---

describe('starterPoolCards', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(starterPoolCards)).toBe(true);
    expect(starterPoolCards.length).toBeGreaterThan(0);
  });

  test('contains only strings', () => {
    starterPoolCards.forEach(id => {
      expect(typeof id).toBe('string');
    });
  });
});

// --- starterPoolDroneNames ---

describe('starterPoolDroneNames', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(starterPoolDroneNames)).toBe(true);
    expect(starterPoolDroneNames.length).toBeGreaterThan(0);
  });

  test('contains only strings', () => {
    starterPoolDroneNames.forEach(name => {
      expect(typeof name).toBe('string');
    });
  });
});

// --- starterPoolShipIds ---

describe('starterPoolShipIds', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(starterPoolShipIds)).toBe(true);
    expect(starterPoolShipIds.length).toBeGreaterThan(0);
  });

  test('contains only strings', () => {
    starterPoolShipIds.forEach(id => {
      expect(typeof id).toBe('string');
    });
  });
});

// --- defaultPlayerProfile ---

describe('defaultPlayerProfile', () => {
  test('has saveVersion matching SAVE_VERSION', () => {
    expect(defaultPlayerProfile.saveVersion).toBe(SAVE_VERSION);
  });

  test('has numeric timestamps', () => {
    expect(typeof defaultPlayerProfile.createdAt).toBe('number');
    expect(typeof defaultPlayerProfile.lastPlayedAt).toBe('number');
    expect(typeof defaultPlayerProfile.gameSeed).toBe('number');
  });

  test('has currency fields', () => {
    expect(typeof defaultPlayerProfile.credits).toBe('number');
    expect(defaultPlayerProfile.securityTokens).toBe(0);
    expect(defaultPlayerProfile.aiCores).toBe(0);
  });

  test('has stats object with all zero values', () => {
    expect(defaultPlayerProfile.stats).toBeDefined();
    expect(defaultPlayerProfile.stats.runsCompleted).toBe(0);
    expect(defaultPlayerProfile.stats.totalCombatsWon).toBe(0);
  });

  test('has reputation object', () => {
    expect(defaultPlayerProfile.reputation).toBeDefined();
    expect(defaultPlayerProfile.reputation.current).toBe(0);
    expect(defaultPlayerProfile.reputation.level).toBe(0);
  });

  test('has tacticalItems with all IDs initialized to 0', () => {
    expect(defaultPlayerProfile.tacticalItems).toBeDefined();
    const expectedIds = getAllTacticalItemIds();
    expectedIds.forEach(id => {
      expect(defaultPlayerProfile.tacticalItems).toHaveProperty(id);
      expect(defaultPlayerProfile.tacticalItems[id]).toBe(0);
    });
  });

  test('has bossProgress with empty defaults', () => {
    expect(defaultPlayerProfile.bossProgress).toBeDefined();
    expect(defaultPlayerProfile.bossProgress.defeatedBosses).toEqual([]);
    expect(defaultPlayerProfile.bossProgress.totalBossVictories).toBe(0);
    expect(defaultPlayerProfile.bossProgress.totalBossAttempts).toBe(0);
  });

  test('has missions object', () => {
    expect(defaultPlayerProfile.missions).toBeDefined();
    expect(defaultPlayerProfile.missions.completed).toEqual([]);
    expect(defaultPlayerProfile.missions.claimable).toEqual([]);
  });

  test('has tutorialDismissals all false', () => {
    expect(defaultPlayerProfile.tutorialDismissals).toBeDefined();
    Object.values(defaultPlayerProfile.tutorialDismissals).forEach(val => {
      expect(val).toBe(false);
    });
  });
});

// --- Simple data constants ---

describe('defaultInventory', () => {
  test('is an empty object', () => {
    expect(defaultInventory).toEqual({});
  });
});

describe('defaultDiscoveredCards', () => {
  test('is an empty array', () => {
    expect(defaultDiscoveredCards).toEqual([]);
  });
});

describe('defaultQuickDeployments', () => {
  test('is an empty array', () => {
    expect(defaultQuickDeployments).toEqual([]);
  });
});
