/**
 * Save Game Schema Tests - Tactical Items
 * TDD: Tests for tactical items integration in save system
 */

import { describe, test, expect } from 'vitest';
import {
  defaultPlayerProfile,
  createNewSave,
  validateSaveFile,
} from './saveGameSchema.js';
import { migrateTacticalItems } from '../logic/migration/saveGameMigrations.js';
import { getAllTacticalItemIds } from './tacticalItemData.js';

describe('saveGameSchema - tacticalItems', () => {
  describe('defaultPlayerProfile', () => {
    test('includes tacticalItems object', () => {
      expect(defaultPlayerProfile).toHaveProperty('tacticalItems');
      expect(typeof defaultPlayerProfile.tacticalItems).toBe('object');
    });

    test('tacticalItems has all item IDs from tacticalItemData', () => {
      const expectedIds = getAllTacticalItemIds();
      expectedIds.forEach(id => {
        expect(defaultPlayerProfile.tacticalItems).toHaveProperty(id);
      });
    });

    test('tacticalItems has all values initialized to 0', () => {
      Object.values(defaultPlayerProfile.tacticalItems).forEach(value => {
        expect(value).toBe(0);
      });
    });

    test('tacticalItems contains ITEM_EVADE with initial value 0', () => {
      expect(defaultPlayerProfile.tacticalItems.ITEM_EVADE).toBe(0);
    });

    test('tacticalItems contains ITEM_EXTRACT with initial value 0', () => {
      expect(defaultPlayerProfile.tacticalItems.ITEM_EXTRACT).toBe(0);
    });

    test('tacticalItems contains ITEM_THREAT_REDUCE with initial value 0', () => {
      expect(defaultPlayerProfile.tacticalItems.ITEM_THREAT_REDUCE).toBe(0);
    });
  });

  describe('createNewSave', () => {
    test('includes tacticalItems in playerProfile', () => {
      const save = createNewSave();
      expect(save.playerProfile).toHaveProperty('tacticalItems');
    });

    test('tacticalItems are initialized to 0 in new save', () => {
      const save = createNewSave();
      const expectedIds = getAllTacticalItemIds();
      expectedIds.forEach(id => {
        expect(save.playerProfile.tacticalItems[id]).toBe(0);
      });
    });
  });

  describe('validateSaveFile', () => {
    test('accepts valid tacticalItems object', () => {
      const save = createNewSave();
      const result = validateSaveFile(save);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('accepts save with modified tacticalItems values', () => {
      const save = createNewSave();
      save.playerProfile.tacticalItems.ITEM_EVADE = 2;
      save.playerProfile.tacticalItems.ITEM_EXTRACT = 1;
      save.playerProfile.tacticalItems.ITEM_THREAT_REDUCE = 3;
      const result = validateSaveFile(save);
      expect(result.valid).toBe(true);
    });
  });

  describe('migrateTacticalItems', () => {
    test('adds missing tacticalItems to old profile without them', () => {
      const oldProfile = {
        credits: 1000,
        securityTokens: 0,
        aiCores: 0
        // No tacticalItems
      };

      const migratedProfile = migrateTacticalItems(oldProfile);

      expect(migratedProfile).toHaveProperty('tacticalItems');
      expect(migratedProfile.tacticalItems.ITEM_EVADE).toBe(0);
      expect(migratedProfile.tacticalItems.ITEM_EXTRACT).toBe(0);
      expect(migratedProfile.tacticalItems.ITEM_THREAT_REDUCE).toBe(0);
    });

    test('preserves existing tacticalItems values', () => {
      const existingProfile = {
        credits: 1000,
        tacticalItems: {
          ITEM_EVADE: 2,
          ITEM_EXTRACT: 1,
          ITEM_THREAT_REDUCE: 3
        }
      };

      const migratedProfile = migrateTacticalItems(existingProfile);

      expect(migratedProfile.tacticalItems.ITEM_EVADE).toBe(2);
      expect(migratedProfile.tacticalItems.ITEM_EXTRACT).toBe(1);
      expect(migratedProfile.tacticalItems.ITEM_THREAT_REDUCE).toBe(3);
    });

    test('adds new item IDs to existing tacticalItems object', () => {
      // Simulates scenario where new items are added in future
      const existingProfile = {
        credits: 1000,
        tacticalItems: {
          ITEM_EVADE: 2
          // Missing ITEM_EXTRACT and ITEM_THREAT_REDUCE
        }
      };

      const migratedProfile = migrateTacticalItems(existingProfile);

      expect(migratedProfile.tacticalItems.ITEM_EVADE).toBe(2); // Preserved
      expect(migratedProfile.tacticalItems.ITEM_EXTRACT).toBe(0); // Added
      expect(migratedProfile.tacticalItems.ITEM_THREAT_REDUCE).toBe(0); // Added
    });

    test('does not modify other profile properties', () => {
      const oldProfile = {
        credits: 5000,
        securityTokens: 10,
        aiCores: 5,
        stats: { runsCompleted: 3 }
      };

      const migratedProfile = migrateTacticalItems(oldProfile);

      expect(migratedProfile.credits).toBe(5000);
      expect(migratedProfile.securityTokens).toBe(10);
      expect(migratedProfile.aiCores).toBe(5);
      expect(migratedProfile.stats.runsCompleted).toBe(3);
    });
  });
});
