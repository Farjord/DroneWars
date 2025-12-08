/**
 * SinglePlayerCombatInitializer - droneSlots Format Tests
 * TDD: Tests for the new slot-based drone format with assignedDrone field
 *
 * Bug: buildPlayerState looks for slot.droneName but data uses slot.assignedDrone,
 * causing empty activeDronePool in Extraction mode.
 */

import { describe, it, expect } from 'vitest';
import SinglePlayerCombatInitializer from './SinglePlayerCombatInitializer.js';

describe('SinglePlayerCombatInitializer - droneSlots format', () => {
  describe('buildPlayerState - new droneSlots format', () => {
    it('should load drones from droneSlots with assignedDrone field', () => {
      // The new format uses assignedDrone (not droneName)
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, slotDamaged: false, assignedDrone: 'Scout Drone' },
          { slotIndex: 1, slotDamaged: false, assignedDrone: 'Standard Fighter' },
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      // Should have 2 drones, not 0
      expect(playerState.activeDronePool.length).toBe(2);
      expect(playerState.activeDronePool[0].name).toBe('Scout Drone');
      expect(playerState.activeDronePool[1].name).toBe('Standard Fighter');
    });

    it('should preserve slot order in activeDronePool', () => {
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, slotDamaged: false, assignedDrone: 'Scout Drone' },
          { slotIndex: 1, slotDamaged: false, assignedDrone: 'Heavy Fighter' },
          { slotIndex: 2, slotDamaged: false, assignedDrone: 'Repair Drone' },
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      // Drones should be in slot order with slotIndex property
      expect(playerState.activeDronePool[0].slotIndex).toBe(0);
      expect(playerState.activeDronePool[0].name).toBe('Scout Drone');
      expect(playerState.activeDronePool[1].slotIndex).toBe(1);
      expect(playerState.activeDronePool[1].name).toBe('Heavy Fighter');
      expect(playerState.activeDronePool[2].slotIndex).toBe(2);
      expect(playerState.activeDronePool[2].name).toBe('Repair Drone');
    });

    it('should set effectiveLimit with -1 penalty for damaged slots', () => {
      // Scout Drone has base limit 3
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, slotDamaged: true, assignedDrone: 'Scout Drone' },
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      expect(playerState.activeDronePool.length).toBe(1);
      expect(playerState.activeDronePool[0].effectiveLimit).toBe(2); // 3 - 1 = 2
    });

    it('should set effectiveLimit to minimum 1 for damaged slots with limit 1', () => {
      // If a drone has limit 1 and slot is damaged, effectiveLimit should stay at 1 (not 0)
      // Using Repair Drone which has limit 2 but testing the min 1 behavior
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, slotDamaged: true, assignedDrone: 'Repair Drone' }, // limit 2
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      expect(playerState.activeDronePool[0].effectiveLimit).toBe(1); // 2 - 1 = 1
    });

    it('should set slotDamaged property on drones from damaged slots', () => {
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, slotDamaged: true, assignedDrone: 'Scout Drone' },
          { slotIndex: 1, slotDamaged: false, assignedDrone: 'Standard Fighter' },
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      expect(playerState.activeDronePool[0].slotDamaged).toBe(true);
      expect(playerState.activeDronePool[1].slotDamaged).toBe(false);
    });

    it('should skip empty drone slots (null assignedDrone)', () => {
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, slotDamaged: false, assignedDrone: 'Scout Drone' },
          { slotIndex: 1, slotDamaged: false, assignedDrone: null }, // Empty slot
          { slotIndex: 2, slotDamaged: false, assignedDrone: 'Heavy Fighter' },
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      // Should only have 2 drones (skipping the null slot)
      expect(playerState.activeDronePool.length).toBe(2);
      expect(playerState.activeDronePool[0].name).toBe('Scout Drone');
      expect(playerState.activeDronePool[1].name).toBe('Heavy Fighter');
    });

    it('should set normal effectiveLimit for undamaged slots', () => {
      // Scout Drone has base limit 3
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, slotDamaged: false, assignedDrone: 'Scout Drone' },
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      expect(playerState.activeDronePool[0].effectiveLimit).toBe(3); // Normal limit
    });
  });
});
