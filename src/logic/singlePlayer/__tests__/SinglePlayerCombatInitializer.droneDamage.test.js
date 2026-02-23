/**
 * SinglePlayerCombatInitializer - Drone Damage Loading Tests
 * TDD: Verifies that buildPlayerState loads drone damage from saved instances
 *
 * Bug: When building the player's drone pool for combat, the isDamaged state
 * is not loaded from saved drone instances, causing damaged drones to appear
 * operational in combat.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import gameStateManager from '../../../managers/GameStateManager.js';
import SinglePlayerCombatInitializer from '../SinglePlayerCombatInitializer.js';

// Mock map generator
vi.mock('../../map/generateMapData.js', () => ({
  default: () => ({
    name: 'Test Sector',
    hexes: [{ q: 0, r: 0 }],
    gates: [{ q: 0, r: 0 }],
    poiCount: 1,
    gateCount: 1,
    baseDetection: 0
  })
}));

describe('SinglePlayerCombatInitializer - Drone Damage Loading', () => {

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
        createTestShipSlot(1, ['Dart', 'Assault Drone', 'Seraph']),
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

  describe('buildPlayerState - drone damage loading', () => {
    it('should load isDamaged state from saved drone instances', () => {
      // Setup: Damaged drone instance from previous run
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

      const shipSlot = gameStateManager.getState().singlePlayerShipSlots.find(s => s.id === 1);
      const runState = { shipSlotId: 1 };

      // Act: Build player state
      const playerState = SinglePlayerCombatInitializer.buildPlayerState(shipSlot, runState);

      // Assert: Dart should be marked as damaged
      const scoutDrone = playerState.activeDronePool.find(d => d.name === 'Dart');
      expect(scoutDrone).toBeDefined();
      expect(scoutDrone.isDamaged).toBe(true);

      // Other drones should NOT be damaged
      const assaultDrone = playerState.activeDronePool.find(d => d.name === 'Assault Drone');
      expect(assaultDrone).toBeDefined();
      expect(assaultDrone.isDamaged).toBeFalsy();
    });

    it('should NOT load damage for slot 0 (starter deck)', () => {
      // Setup: Even if there were somehow damaged instances for slot 0
      gameStateManager.setState({
        singlePlayerDroneInstances: [
          {
            instanceId: 'drone-bad',
            droneName: 'Dart',
            shipSlotId: 0,
            isDamaged: true
          }
        ]
      });

      const shipSlot = gameStateManager.getState().singlePlayerShipSlots.find(s => s.id === 0);
      const runState = { shipSlotId: 0 };

      // Act: Build player state for slot 0
      const playerState = SinglePlayerCombatInitializer.buildPlayerState(shipSlot, runState);

      // Assert: Slot 0 drones should never be damaged
      const scoutDrone = playerState.activeDronePool.find(d => d.name === 'Dart');
      expect(scoutDrone).toBeDefined();
      expect(scoutDrone.isDamaged).toBeFalsy();
    });

    it('should mark multiple drones as damaged if instances exist', () => {
      // Setup: Multiple damaged drones
      gameStateManager.setState({
        singlePlayerDroneInstances: [
          { instanceId: 'd1', droneName: 'Dart', shipSlotId: 1, isDamaged: true },
          { instanceId: 'd2', droneName: 'Assault Drone', shipSlotId: 1, isDamaged: true },
          { instanceId: 'd3', droneName: 'Seraph', shipSlotId: 1, isDamaged: false }
        ]
      });

      const shipSlot = gameStateManager.getState().singlePlayerShipSlots.find(s => s.id === 1);
      const runState = { shipSlotId: 1 };

      // Act
      const playerState = SinglePlayerCombatInitializer.buildPlayerState(shipSlot, runState);

      // Assert
      const scoutDrone = playerState.activeDronePool.find(d => d.name === 'Dart');
      const assaultDrone = playerState.activeDronePool.find(d => d.name === 'Assault Drone');
      const repairDrone = playerState.activeDronePool.find(d => d.name === 'Seraph');

      expect(scoutDrone?.isDamaged).toBe(true);
      expect(assaultDrone?.isDamaged).toBe(true);
      expect(repairDrone?.isDamaged).toBeFalsy(); // Repaired or never damaged
    });

    it('should not affect drones from other slots', () => {
      // Setup: Damaged drone in slot 2
      gameStateManager.setState({
        singlePlayerDroneInstances: [
          { instanceId: 'd1', droneName: 'Dart', shipSlotId: 2, isDamaged: true }
        ]
      });

      const shipSlot = gameStateManager.getState().singlePlayerShipSlots.find(s => s.id === 1);
      const runState = { shipSlotId: 1 }; // Building for slot 1

      // Act
      const playerState = SinglePlayerCombatInitializer.buildPlayerState(shipSlot, runState);

      // Assert: Slot 1 scout drone should NOT be damaged (damage is in slot 2)
      const scoutDrone = playerState.activeDronePool.find(d => d.name === 'Dart');
      expect(scoutDrone?.isDamaged).toBeFalsy();
    });
  });
});
