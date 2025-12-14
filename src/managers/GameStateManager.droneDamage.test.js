/**
 * GameStateManager - Drone Damage Persistence Tests
 * TDD: Tests written first to verify drone damage persists across runs
 *
 * Bug: Drone damage (isDamaged flag) is saved by DroneDamageProcessor during
 * extraction, but not loaded when starting a new run/combat. Damaged drones
 * should remain damaged until repaired.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import gameStateManager from './GameStateManager.js';

// Mock the map generator to avoid complex dependencies
vi.mock('../logic/map/generateMapData.js', () => ({
  default: () => ({
    name: 'Test Sector',
    hexes: [{ q: 0, r: 0 }],
    gates: [{ q: 0, r: 0 }],
    poiCount: 1,
    gateCount: 1,
    baseDetection: 0
  })
}));

describe('GameStateManager - Drone Damage Persistence', () => {

  const createTestShipSlot = (slotId, dronePool = ['Dart', 'Assault Drone']) => ({
    id: slotId,
    name: `Test Ship Slot ${slotId}`,
    status: 'active',
    isImmutable: slotId === 0,
    shipId: 'SHIP_001',
    decklist: [],
    drones: dronePool.map(name => ({ name })),
    activeDronePool: dronePool,
    shipComponents: {
      'BRIDGE_001': 1,
      'POWERCELL_001': 2,
      'DRONECONTROL_001': 3
    }
  });

  beforeEach(() => {
    // Reset state before each test
    gameStateManager.setState({
      currentRunState: null,
      singlePlayerShipSlots: [
        createTestShipSlot(0),
        createTestShipSlot(1),
        createTestShipSlot(2)
      ],
      singlePlayerDroneInstances: [],
      singlePlayerShipComponentInstances: [],
      singlePlayerProfile: {
        credits: 100,
        aiCores: 0,
        stats: {
          runsCompleted: 0,
          runsLost: 0,
          totalCreditsEarned: 0,
          highestTierCompleted: 0
        },
        unlockedBlueprints: []
      },
      singlePlayerInventory: {}
    });
  });

  describe('findDroneInstance - lookup by slot and name', () => {
    it('should find drone instance by slot ID and drone name', () => {
      // Setup: Create a saved drone instance
      gameStateManager.setState({
        singlePlayerDroneInstances: [
          {
            instanceId: 'drone-123',
            droneName: 'Dart',
            shipSlotId: 1,
            isDamaged: true
          }
        ]
      });

      // Act
      const instance = gameStateManager.findDroneInstance(1, 'Dart');

      // Assert
      expect(instance).not.toBeNull();
      expect(instance.droneName).toBe('Dart');
      expect(instance.shipSlotId).toBe(1);
      expect(instance.isDamaged).toBe(true);
    });

    it('should return null if instance not found', () => {
      const instance = gameStateManager.findDroneInstance(1, 'Nonexistent Drone');
      expect(instance).toBeNull();
    });
  });

  describe('getDroneDamageStateForSlot - get all damage states', () => {
    it('should return damage state for all drones in a slot', () => {
      // Setup: Some drones damaged, some not
      gameStateManager.setState({
        singlePlayerDroneInstances: [
          { instanceId: 'd1', droneName: 'Dart', shipSlotId: 1, isDamaged: true },
          { instanceId: 'd2', droneName: 'Assault Drone', shipSlotId: 1, isDamaged: false },
          { instanceId: 'd3', droneName: 'Heavy Drone', shipSlotId: 2, isDamaged: true } // Different slot
        ]
      });

      // Act
      const damageState = gameStateManager.getDroneDamageStateForSlot(1);

      // Assert
      expect(damageState).toEqual({
        'Dart': true,
        'Assault Drone': false
      });
      expect(damageState['Heavy Drone']).toBeUndefined(); // Not in slot 1
    });

    it('should return empty object for slot 0 (starter deck)', () => {
      // Setup: Even if there are instances for slot 0 (shouldn't happen)
      gameStateManager.setState({
        singlePlayerDroneInstances: [
          { instanceId: 'd1', droneName: 'Dart', shipSlotId: 0, isDamaged: true }
        ]
      });

      // Act: Slot 0 should always return empty (starter deck never damaged)
      const damageState = gameStateManager.getDroneDamageStateForSlot(0);

      // Assert
      expect(damageState).toEqual({});
    });
  });

  describe('Integration: Drone damage round-trip persistence', () => {
    /**
     * This test verifies the complete round-trip:
     * 1. Start run with damaged drone (from previous run)
     * 2. Verify damage is loaded
     * 3. End run
     * 4. Start new run
     * 5. Verify damage persists
     */
    it('should preserve drone damage through run cycle', () => {
      // Step 1: Pre-existing damaged drone from previous run
      const savedInstances = [
        {
          instanceId: 'drone-prev-run',
          droneName: 'Dart',
          shipSlotId: 1,
          isDamaged: true
        }
      ];

      gameStateManager.setState({
        singlePlayerDroneInstances: savedInstances
      });

      // Step 2: Check that we can retrieve the damage state
      const damageState = gameStateManager.getDroneDamageStateForSlot(1);
      expect(damageState['Dart']).toBe(true);

      // Step 3: Start a run (drone damage should still be accessible)
      gameStateManager.startRun(1, 1, 0, {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      });

      // Verify damage state is still available during run
      const damageStateDuringRun = gameStateManager.getDroneDamageStateForSlot(1);
      expect(damageStateDuringRun['Dart']).toBe(true);

      // Step 4: End run successfully
      gameStateManager.endRun(true);

      // Step 5: Damage should still persist
      const damageStateAfterRun = gameStateManager.getDroneDamageStateForSlot(1);
      expect(damageStateAfterRun['Dart']).toBe(true);
    });

    it('should allow repairing damaged drones (via updateDroneInstance)', () => {
      // Setup: Damaged drone
      gameStateManager.setState({
        singlePlayerDroneInstances: [
          {
            instanceId: 'drone-damaged',
            droneName: 'Dart',
            shipSlotId: 1,
            isDamaged: true
          }
        ]
      });

      // Act: Repair the drone
      gameStateManager.updateDroneInstance('drone-damaged', false);

      // Assert: Drone should no longer be damaged
      const instance = gameStateManager.findDroneInstance(1, 'Dart');
      expect(instance.isDamaged).toBe(false);
    });
  });

  describe('slot 0 behavior', () => {
    it('slot 0 drones should never report as damaged', () => {
      // Setup: Even if there were somehow damaged instances for slot 0
      gameStateManager.setState({
        singlePlayerDroneInstances: [
          { instanceId: 'd1', droneName: 'Dart', shipSlotId: 0, isDamaged: true }
        ]
      });

      // Act
      const damageState = gameStateManager.getDroneDamageStateForSlot(0);

      // Assert: Slot 0 always returns empty (starter deck always fresh)
      expect(damageState).toEqual({});
    });
  });
});
