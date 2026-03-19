/**
 * SinglePlayerCombatInitializer - droneSlots Format Tests
 * TDD: Tests for the slot-based drone format with assignedDrone field
 */

import { describe, it, expect } from 'vitest';
import SinglePlayerCombatInitializer from '../SinglePlayerCombatInitializer.js';

describe('SinglePlayerCombatInitializer - droneSlots format', () => {
  describe('buildPlayerState - new droneSlots format', () => {
    it('should load drones from droneSlots with assignedDrone field', () => {
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, assignedDrone: 'Dart' },
          { slotIndex: 1, assignedDrone: 'Talon' },
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      expect(playerState.activeDronePool.length).toBe(2);
      expect(playerState.activeDronePool[0].name).toBe('Dart');
      expect(playerState.activeDronePool[1].name).toBe('Talon');
    });

    it('should preserve slot order in activeDronePool', () => {
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, assignedDrone: 'Dart' },
          { slotIndex: 1, assignedDrone: 'Mammoth' },
          { slotIndex: 2, assignedDrone: 'Seraph' },
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      expect(playerState.activeDronePool[0].slotIndex).toBe(0);
      expect(playerState.activeDronePool[0].name).toBe('Dart');
      expect(playerState.activeDronePool[1].slotIndex).toBe(1);
      expect(playerState.activeDronePool[1].name).toBe('Mammoth');
      expect(playerState.activeDronePool[2].slotIndex).toBe(2);
      expect(playerState.activeDronePool[2].name).toBe('Seraph');
    });

    it('should set effectiveLimit equal to base limit (no damage penalty)', () => {
      // Dart has base limit 3
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, assignedDrone: 'Dart' },
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      expect(playerState.activeDronePool.length).toBe(1);
      expect(playerState.activeDronePool[0].effectiveLimit).toBe(3);
    });

    it('should skip empty drone slots (null assignedDrone)', () => {
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, assignedDrone: 'Dart' },
          { slotIndex: 1, assignedDrone: null },
          { slotIndex: 2, assignedDrone: 'Mammoth' },
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      expect(playerState.activeDronePool.length).toBe(2);
      expect(playerState.activeDronePool[0].name).toBe('Dart');
      expect(playerState.activeDronePool[1].name).toBe('Mammoth');
    });

    it('should set normal effectiveLimit for all drones', () => {
      // Dart has base limit 3
      const mockShipSlot = {
        shipId: 'SHIP_001',
        decklist: [],
        droneSlots: [
          { slotIndex: 0, assignedDrone: 'Dart' },
        ]
      };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      expect(playerState.activeDronePool[0].effectiveLimit).toBe(3);
    });
  });
});
