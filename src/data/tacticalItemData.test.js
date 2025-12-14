/**
 * Tactical Item Data Tests
 * TDD: Tests written first, implementation follows
 */

import { describe, test, expect } from 'vitest';
import {
  tacticalItemCollection,
  getTacticalItemById,
  getTacticalItemsByType
} from './tacticalItemData.js';

describe('tacticalItemData', () => {
  describe('tacticalItemCollection', () => {
    test('contains exactly 3 items', () => {
      expect(tacticalItemCollection).toHaveLength(3);
    });

    test('each item has required fields: id, name, type, cost, maxCapacity, image, description', () => {
      const requiredFields = ['id', 'name', 'type', 'cost', 'maxCapacity', 'image', 'description'];

      tacticalItemCollection.forEach(item => {
        requiredFields.forEach(field => {
          expect(item).toHaveProperty(field);
          expect(item[field]).toBeDefined();
        });
      });
    });

    test('all items have unique ids', () => {
      const ids = tacticalItemCollection.map(item => item.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(ids.length);
    });

    test('all items have positive cost values', () => {
      tacticalItemCollection.forEach(item => {
        expect(item.cost).toBeGreaterThan(0);
      });
    });

    test('all items have positive maxCapacity values', () => {
      tacticalItemCollection.forEach(item => {
        expect(item.maxCapacity).toBeGreaterThan(0);
      });
    });

    test('contains ITEM_EVADE with type evade', () => {
      const evadeItem = tacticalItemCollection.find(item => item.id === 'ITEM_EVADE');
      expect(evadeItem).toBeDefined();
      expect(evadeItem.type).toBe('evade');
    });

    test('contains ITEM_EXTRACT with type extract', () => {
      const extractItem = tacticalItemCollection.find(item => item.id === 'ITEM_EXTRACT');
      expect(extractItem).toBeDefined();
      expect(extractItem.type).toBe('extract');
    });

    test('contains ITEM_THREAT_REDUCE with type threatReduce', () => {
      const threatItem = tacticalItemCollection.find(item => item.id === 'ITEM_THREAT_REDUCE');
      expect(threatItem).toBeDefined();
      expect(threatItem.type).toBe('threatReduce');
    });

    test('ITEM_THREAT_REDUCE has effectValue property', () => {
      const threatItem = tacticalItemCollection.find(item => item.id === 'ITEM_THREAT_REDUCE');
      expect(threatItem).toHaveProperty('effectValue');
      expect(typeof threatItem.effectValue).toBe('number');
      expect(threatItem.effectValue).toBeGreaterThan(0);
    });

    test('all images point to /DroneWars/Items/ directory', () => {
      tacticalItemCollection.forEach(item => {
        expect(item.image).toMatch(/^\/DroneWars\/Items\//);
      });
    });
  });

  describe('getTacticalItemById', () => {
    test('returns correct item for ITEM_EVADE', () => {
      const item = getTacticalItemById('ITEM_EVADE');
      expect(item).toBeDefined();
      expect(item.id).toBe('ITEM_EVADE');
      expect(item.name).toBe('Emergency Jammer');
    });

    test('returns correct item for ITEM_EXTRACT', () => {
      const item = getTacticalItemById('ITEM_EXTRACT');
      expect(item).toBeDefined();
      expect(item.id).toBe('ITEM_EXTRACT');
      expect(item.name).toBe('Clearance Override');
    });

    test('returns correct item for ITEM_THREAT_REDUCE', () => {
      const item = getTacticalItemById('ITEM_THREAT_REDUCE');
      expect(item).toBeDefined();
      expect(item.id).toBe('ITEM_THREAT_REDUCE');
      expect(item.name).toBe('Signal Dampener');
    });

    test('returns undefined for invalid id', () => {
      const item = getTacticalItemById('INVALID_ITEM');
      expect(item).toBeUndefined();
    });

    test('returns undefined for null id', () => {
      const item = getTacticalItemById(null);
      expect(item).toBeUndefined();
    });

    test('returns undefined for undefined id', () => {
      const item = getTacticalItemById(undefined);
      expect(item).toBeUndefined();
    });
  });

  describe('getTacticalItemsByType', () => {
    test('returns array of items for valid type', () => {
      const evadeItems = getTacticalItemsByType('evade');
      expect(Array.isArray(evadeItems)).toBe(true);
      expect(evadeItems.length).toBeGreaterThan(0);
      evadeItems.forEach(item => {
        expect(item.type).toBe('evade');
      });
    });

    test('returns empty array for invalid type', () => {
      const items = getTacticalItemsByType('invalidType');
      expect(Array.isArray(items)).toBe(true);
      expect(items).toHaveLength(0);
    });

    test('returns empty array for null type', () => {
      const items = getTacticalItemsByType(null);
      expect(Array.isArray(items)).toBe(true);
      expect(items).toHaveLength(0);
    });
  });
});
