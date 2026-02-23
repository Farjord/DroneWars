/**
 * DroneDamageProcessor.test.js
 * TDD tests for instance-based drone damage
 *
 * Test Requirement: Drone damage should persist to instances for Slots 1-5
 * Slot 0 (starter deck) should NOT persist damage (always fresh)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import DroneDamageProcessor from '../DroneDamageProcessor.js';
import gameStateManager from '../../../managers/GameStateManager.js';

// Mock dependencies
vi.mock('../../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    updateDroneInstance: vi.fn(),
    findDroneInstance: vi.fn()
  }
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

describe('DroneDamageProcessor - Instance-Based Damage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Slot 0 - No damage persistence', () => {
    it('should NOT persist damage for Slot 0 drones', () => {
      const shipSlot = {
        id: 0,
        drones: [
          { name: 'Dart', isDamaged: false },
          { name: 'Fighter Drone', isDamaged: false }
        ]
      };

      const currentRunState = {
        shipSlotId: 0,
        currentHull: 10,
        maxHull: 30 // 33% hull - below 50% threshold
      };

      // Process damage
      DroneDamageProcessor.process(shipSlot, currentRunState);

      // updateDroneInstance should NOT be called for Slot 0
      expect(gameStateManager.updateDroneInstance).not.toHaveBeenCalled();
    });

    it('should still return damaged drone names for Slot 0 (for display only)', () => {
      const shipSlot = {
        id: 0,
        drones: [
          { name: 'Dart', isDamaged: false },
          { name: 'Fighter Drone', isDamaged: false }
        ]
      };

      const currentRunState = {
        shipSlotId: 0,
        currentHull: 10,
        maxHull: 30
      };

      const result = DroneDamageProcessor.process(shipSlot, currentRunState);

      // Should still return damaged drones for UI display
      // But they won't be persisted to instances
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Slots 1-5 - Instance damage persistence', () => {
    it('should call updateDroneInstance for damaged drones in Slots 1-5', () => {
      const shipSlot = {
        id: 1,
        drones: [
          { name: 'Dart', isDamaged: false },
          { name: 'Fighter Drone', isDamaged: false }
        ]
      };

      const currentRunState = {
        shipSlotId: 1,
        currentHull: 10,
        maxHull: 30 // Below 50% threshold
      };

      // Mock findDroneInstance to return an instance
      gameStateManager.findDroneInstance.mockImplementation((slotId, droneName) => {
        const instances = [
          { instanceId: 'INST_001', droneName: 'Dart', shipSlotId: 1, isDamaged: false },
          { instanceId: 'INST_002', droneName: 'Fighter Drone', shipSlotId: 1, isDamaged: false }
        ];
        return instances.find(i => i.shipSlotId === slotId && i.droneName === droneName) || null;
      });

      DroneDamageProcessor.process(shipSlot, currentRunState);

      // Should update the instance
      expect(gameStateManager.updateDroneInstance).toHaveBeenCalled();
    });

    it('should find correct instance by (slotId, droneName)', () => {
      const shipSlot = {
        id: 2,
        drones: [{ name: 'Dart', isDamaged: false }]
      };

      const currentRunState = {
        shipSlotId: 2,
        currentHull: 10,
        maxHull: 30
      };

      // Mock findDroneInstance to return correct instance based on slotId and droneName
      gameStateManager.findDroneInstance.mockImplementation((slotId, droneName) => {
        const instances = [
          { instanceId: 'INST_001', droneName: 'Dart', shipSlotId: 1, isDamaged: false }, // Different slot
          { instanceId: 'INST_002', droneName: 'Dart', shipSlotId: 2, isDamaged: false }, // Correct slot
          { instanceId: 'INST_003', droneName: 'Fighter Drone', shipSlotId: 2, isDamaged: false } // Different drone
        ];
        return instances.find(i => i.shipSlotId === slotId && i.droneName === droneName) || null;
      });

      DroneDamageProcessor.process(shipSlot, currentRunState);

      // Should update INST_002 (slot 2, Scout Drone)
      const updateCall = gameStateManager.updateDroneInstance.mock.calls[0];
      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toBe('INST_002');
    });
  });

  describe('Damage threshold', () => {
    it('should NOT damage drones when hull >= 50%', () => {
      const shipSlot = {
        id: 1,
        drones: [{ name: 'Dart', isDamaged: false }]
      };

      const currentRunState = {
        shipSlotId: 1,
        currentHull: 15, // 50% of 30 - at threshold
        maxHull: 30
      };

      gameStateManager.getState.mockReturnValue({
        singlePlayerDroneInstances: []
      });

      const result = DroneDamageProcessor.process(shipSlot, currentRunState);

      // No drones should be damaged
      expect(result).toEqual([]);
    });

    it('should damage one drone when hull < 50%', () => {
      const shipSlot = {
        id: 1,
        drones: [
          { name: 'Dart', isDamaged: false },
          { name: 'Fighter Drone', isDamaged: false }
        ]
      };

      const currentRunState = {
        shipSlotId: 1,
        currentHull: 14, // Below 50%
        maxHull: 30
      };

      // Mock findDroneInstance to return matching instance
      gameStateManager.findDroneInstance.mockImplementation((slotId, droneName) => {
        const instances = [
          { instanceId: 'INST_001', droneName: 'Dart', shipSlotId: 1, isDamaged: false },
          { instanceId: 'INST_002', droneName: 'Fighter Drone', shipSlotId: 1, isDamaged: false }
        ];
        return instances.find(i => i.shipSlotId === slotId && i.droneName === droneName) || null;
      });

      const result = DroneDamageProcessor.process(shipSlot, currentRunState);

      // Exactly one drone should be damaged
      expect(result.length).toBe(1);
    });
  });
});
