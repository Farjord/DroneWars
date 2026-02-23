/**
 * Drone Slot Structure Tests - New Format
 * Tests for the slot-first data structure with explicit slotIndex, slotDamaged, assignedDrone fields
 *
 * TDD: These tests are written FIRST, before implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createEmptyDroneSlots,
  migrateDroneSlotsToNewFormat,
  convertDronesToSlots
} from '../../logic/migration/saveGameMigrations.js';
import {
  addDroneToSlots,
  removeDroneFromSlots,
  getDroneEffectiveLimit,
  buildActiveDronePool
} from '../../utils/slotDamageUtils.js';

describe('Drone Slot Structure - New Format', () => {
  describe('Data Structure', () => {
    it('should have slotIndex, slotDamaged, assignedDrone fields', () => {
      const slots = createEmptyDroneSlots();

      expect(slots).toHaveLength(5);
      slots.forEach((slot, i) => {
        expect(slot).toHaveProperty('slotIndex', i);
        expect(slot).toHaveProperty('slotDamaged', false);
        expect(slot).toHaveProperty('assignedDrone', null);
      });
    });

    it('should create 5 empty slots with createEmptyDroneSlots()', () => {
      const slots = createEmptyDroneSlots();

      expect(slots).toHaveLength(5);
      expect(slots[0]).toEqual({ slotIndex: 0, slotDamaged: false, assignedDrone: null });
      expect(slots[4]).toEqual({ slotIndex: 4, slotDamaged: false, assignedDrone: null });
    });
  });

  describe('Migration', () => {
    it('should migrate old format { droneName, isDamaged } to new format', () => {
      const oldFormat = [
        { droneName: 'Dart', isDamaged: false },
        { droneName: 'Mammoth', isDamaged: true },
        { droneName: null, isDamaged: false },
        { droneName: null, isDamaged: false },
        { droneName: null, isDamaged: false }
      ];

      const newFormat = migrateDroneSlotsToNewFormat(oldFormat);

      expect(newFormat[0]).toEqual({ slotIndex: 0, slotDamaged: false, assignedDrone: 'Dart' });
      expect(newFormat[1]).toEqual({ slotIndex: 1, slotDamaged: true, assignedDrone: 'Mammoth' });
      expect(newFormat[2]).toEqual({ slotIndex: 2, slotDamaged: false, assignedDrone: null });
    });

    it('should handle null/undefined old slots', () => {
      const newFormat = migrateDroneSlotsToNewFormat(null);
      expect(newFormat).toHaveLength(5);
      expect(newFormat[0].assignedDrone).toBeNull();

      const newFormat2 = migrateDroneSlotsToNewFormat(undefined);
      expect(newFormat2).toHaveLength(5);
    });

    it('should preserve damage state during migration', () => {
      const oldFormat = [
        { droneName: 'Dart', isDamaged: true },
        { droneName: null, isDamaged: true },
        { droneName: null, isDamaged: false },
        { droneName: null, isDamaged: false },
        { droneName: null, isDamaged: false }
      ];

      const newFormat = migrateDroneSlotsToNewFormat(oldFormat);

      expect(newFormat[0].slotDamaged).toBe(true);
      expect(newFormat[1].slotDamaged).toBe(true);
      expect(newFormat[2].slotDamaged).toBe(false);
    });

    it('should handle already-migrated format (idempotent)', () => {
      const alreadyNew = [
        { slotIndex: 0, slotDamaged: true, assignedDrone: 'Dart' },
        { slotIndex: 1, slotDamaged: false, assignedDrone: null },
        { slotIndex: 2, slotDamaged: false, assignedDrone: null },
        { slotIndex: 3, slotDamaged: false, assignedDrone: null },
        { slotIndex: 4, slotDamaged: false, assignedDrone: null }
      ];

      const result = migrateDroneSlotsToNewFormat(alreadyNew);

      expect(result[0]).toEqual({ slotIndex: 0, slotDamaged: true, assignedDrone: 'Dart' });
    });

    it('should migrate legacy drones array format', () => {
      // Very old format: just { name } objects
      const legacyDrones = [
        { name: 'Dart' },
        { name: 'Mammoth' }
      ];

      const slots = convertDronesToSlots(legacyDrones);

      expect(slots).toHaveLength(5);
      expect(slots[0].assignedDrone).toBe('Dart');
      expect(slots[1].assignedDrone).toBe('Mammoth');
      expect(slots[2].assignedDrone).toBeNull();
    });
  });

  describe('Add Drone to Deck', () => {
    it('should place drone in first empty slot', () => {
      const slots = createEmptyDroneSlots();

      const updated = addDroneToSlots(slots, 'Dart');

      expect(updated[0].assignedDrone).toBe('Dart');
      expect(updated[1].assignedDrone).toBeNull();
    });

    it('should place second drone in slot 1 (index 1)', () => {
      let slots = createEmptyDroneSlots();
      slots = addDroneToSlots(slots, 'Dart');
      slots = addDroneToSlots(slots, 'Mammoth');

      expect(slots[0].assignedDrone).toBe('Dart');
      expect(slots[1].assignedDrone).toBe('Mammoth');
    });

    it('should not overwrite existing drone', () => {
      let slots = createEmptyDroneSlots();
      slots[0] = { ...slots[0], assignedDrone: 'Dart' };

      const updated = addDroneToSlots(slots, 'Mammoth');

      expect(updated[0].assignedDrone).toBe('Dart');
      expect(updated[1].assignedDrone).toBe('Mammoth');
    });

    it('should return unchanged slots when all slots full', () => {
      const slots = [
        { slotIndex: 0, slotDamaged: false, assignedDrone: 'Drone 1' },
        { slotIndex: 1, slotDamaged: false, assignedDrone: 'Drone 2' },
        { slotIndex: 2, slotDamaged: false, assignedDrone: 'Drone 3' },
        { slotIndex: 3, slotDamaged: false, assignedDrone: 'Drone 4' },
        { slotIndex: 4, slotDamaged: false, assignedDrone: 'Drone 5' }
      ];

      const updated = addDroneToSlots(slots, 'New Drone');

      // Should be unchanged - no empty slot
      expect(updated).toEqual(slots);
    });

    it('should fill gap in middle when slot 0 is occupied', () => {
      const slots = [
        { slotIndex: 0, slotDamaged: false, assignedDrone: 'Drone 1' },
        { slotIndex: 1, slotDamaged: false, assignedDrone: null },
        { slotIndex: 2, slotDamaged: false, assignedDrone: 'Drone 3' },
        { slotIndex: 3, slotDamaged: false, assignedDrone: null },
        { slotIndex: 4, slotDamaged: false, assignedDrone: null }
      ];

      const updated = addDroneToSlots(slots, 'New Drone');

      expect(updated[1].assignedDrone).toBe('New Drone');
    });
  });

  describe('Remove Drone from Deck', () => {
    it('should set assignedDrone to null', () => {
      const slots = [
        { slotIndex: 0, slotDamaged: false, assignedDrone: 'Dart' },
        { slotIndex: 1, slotDamaged: false, assignedDrone: 'Mammoth' },
        { slotIndex: 2, slotDamaged: false, assignedDrone: null },
        { slotIndex: 3, slotDamaged: false, assignedDrone: null },
        { slotIndex: 4, slotDamaged: false, assignedDrone: null }
      ];

      const updated = removeDroneFromSlots(slots, 'Dart');

      expect(updated[0].assignedDrone).toBeNull();
      expect(updated[1].assignedDrone).toBe('Mammoth');
    });

    it('should preserve slotDamaged state when removing', () => {
      const slots = [
        { slotIndex: 0, slotDamaged: true, assignedDrone: 'Dart' },
        { slotIndex: 1, slotDamaged: false, assignedDrone: null },
        { slotIndex: 2, slotDamaged: false, assignedDrone: null },
        { slotIndex: 3, slotDamaged: false, assignedDrone: null },
        { slotIndex: 4, slotDamaged: false, assignedDrone: null }
      ];

      const updated = removeDroneFromSlots(slots, 'Dart');

      expect(updated[0].slotDamaged).toBe(true);
      expect(updated[0].assignedDrone).toBeNull();
    });

    it('should return unchanged slots when drone not found', () => {
      const slots = createEmptyDroneSlots();

      const updated = removeDroneFromSlots(slots, 'Nonexistent Drone');

      expect(updated).toEqual(slots);
    });
  });

  describe('Effective Limit Calculation', () => {
    const mockShipSlot = {
      droneSlots: [
        { slotIndex: 0, slotDamaged: false, assignedDrone: 'Dart' },
        { slotIndex: 1, slotDamaged: true, assignedDrone: 'Mammoth' },
        { slotIndex: 2, slotDamaged: false, assignedDrone: null },
        { slotIndex: 3, slotDamaged: false, assignedDrone: null },
        { slotIndex: 4, slotDamaged: false, assignedDrone: null }
      ]
    };

    it('should return base limit for healthy slot', () => {
      const limit = getDroneEffectiveLimit(mockShipSlot, 0);
      // Dart has limit 3, slot not damaged = limit 3
      expect(limit).toBeGreaterThan(0);
    });

    it('should reduce limit by 1 for damaged slot', () => {
      // Mammoth in slot 1 which is damaged
      const limit = getDroneEffectiveLimit(mockShipSlot, 1);
      // Should be baseLimit - 1, minimum 1
      expect(limit).toBeGreaterThanOrEqual(1);
    });

    it('should never reduce limit below 1', () => {
      const shipSlotWithDamagedLowLimitDrone = {
        droneSlots: [
          { slotIndex: 0, slotDamaged: true, assignedDrone: 'Some Drone' }
        ]
      };

      const limit = getDroneEffectiveLimit(shipSlotWithDamagedLowLimitDrone, 0);
      expect(limit).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Combat Initialization', () => {
    it('should read assignedDrone for drone name', () => {
      const shipSlot = {
        droneSlots: [
          { slotIndex: 0, slotDamaged: false, assignedDrone: 'Dart' },
          { slotIndex: 1, slotDamaged: false, assignedDrone: 'Mammoth' },
          { slotIndex: 2, slotDamaged: false, assignedDrone: null },
          { slotIndex: 3, slotDamaged: false, assignedDrone: null },
          { slotIndex: 4, slotDamaged: false, assignedDrone: null }
        ]
      };

      const dronePool = buildActiveDronePool(shipSlot);

      expect(dronePool).toHaveLength(2);
      expect(dronePool[0].name).toBe('Dart');
      expect(dronePool[1].name).toBe('Mammoth');
    });

    it('should apply -1 limit when slotDamaged is true', () => {
      const shipSlot = {
        droneSlots: [
          { slotIndex: 0, slotDamaged: true, assignedDrone: 'Dart' },
          { slotIndex: 1, slotDamaged: false, assignedDrone: null },
          { slotIndex: 2, slotDamaged: false, assignedDrone: null },
          { slotIndex: 3, slotDamaged: false, assignedDrone: null },
          { slotIndex: 4, slotDamaged: false, assignedDrone: null }
        ]
      };

      const dronePool = buildActiveDronePool(shipSlot);

      // Dart base limit is 3, damaged slot = limit 2
      expect(dronePool[0].effectiveLimit).toBeLessThan(dronePool[0].limit);
    });

    it('should preserve slot order in drone pool', () => {
      // Use real drone names from the game
      const shipSlot = {
        droneSlots: [
          { slotIndex: 0, slotDamaged: false, assignedDrone: 'Dart' },
          { slotIndex: 1, slotDamaged: false, assignedDrone: null },
          { slotIndex: 2, slotDamaged: false, assignedDrone: 'Mammoth' },
          { slotIndex: 3, slotDamaged: false, assignedDrone: null },
          { slotIndex: 4, slotDamaged: false, assignedDrone: 'Seraph' }
        ]
      };

      const dronePool = buildActiveDronePool(shipSlot);

      // Should maintain slot order: slot 0, then slot 2, then slot 4
      expect(dronePool).toHaveLength(3);
      expect(dronePool[0].slotIndex).toBe(0);
      expect(dronePool[1].slotIndex).toBe(2);
      expect(dronePool[2].slotIndex).toBe(4);
    });
  });

  describe('Save File Format', () => {
    it('should produce correct JSON structure', () => {
      const slots = createEmptyDroneSlots();
      slots[0] = { ...slots[0], assignedDrone: 'Dart' };
      slots[2] = { ...slots[2], slotDamaged: true };

      const json = JSON.stringify(slots, null, 2);
      const parsed = JSON.parse(json);

      expect(parsed[0]).toEqual({
        slotIndex: 0,
        slotDamaged: false,
        assignedDrone: 'Dart'
      });
      expect(parsed[2]).toEqual({
        slotIndex: 2,
        slotDamaged: true,
        assignedDrone: null
      });
    });
  });
});
