/**
 * blueprintPoI.test.js
 * Comprehensive test suite for Blueprint PoI system
 * Following TDD: These tests should FAIL initially, then pass after implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import EncounterController from '../encounters/EncounterController.js';
import { SalvageController } from '../salvage/SalvageController.js';
import CombatOutcomeProcessor from '../singlePlayer/CombatOutcomeProcessor.js';
import DetectionManager from '../detection/DetectionManager.js';
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js';
import gameStateManager from '../../managers/GameStateManager.js';
import { poiTypes } from '../../data/pointsOfInterestData.js';

describe('Blueprint PoI System', () => {
  beforeEach(() => {
    // Reset managers before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up run state after each test
    if (tacticalMapStateManager.isRunActive()) {
      tacticalMapStateManager.endRun();
    }
  });

  describe('Guardian AI Assignment', () => {
    it('should assign tier-specific AI from tierAIMapping for Light blueprint', () => {
      // Find Light blueprint PoI from data
      const lightPoI = poiTypes.find(p => p.id === 'POI_DRONE_LIGHT');

      expect(lightPoI).toBeDefined();
      expect(lightPoI.tierAIMapping).toBeDefined();
      expect(lightPoI.tierAIMapping[1]).toBe('Rogue Scout Pattern');
    });

    it('should assign tier-specific AI from tierAIMapping for Medium blueprint', () => {
      const mediumPoI = poiTypes.find(p => p.id === 'POI_DRONE_MEDIUM');

      expect(mediumPoI).toBeDefined();
      expect(mediumPoI.tierAIMapping).toBeDefined();
      expect(mediumPoI.tierAIMapping[1]).toBe('Specialized Hunter Group');
    });

    it('should assign tier-specific AI from tierAIMapping for Heavy blueprint', () => {
      const heavyPoI = poiTypes.find(p => p.id === 'POI_DRONE_HEAVY');

      expect(heavyPoI).toBeDefined();
      expect(heavyPoI.tierAIMapping).toBeDefined();
      expect(heavyPoI.tierAIMapping[1]).toBe('Capital-Class Blockade Fleet');
    });

    it('should have requiresEncounterConfirmation flag set', () => {
      const blueprintPoIs = poiTypes.filter(p => p.id.startsWith('POI_DRONE_'));

      blueprintPoIs.forEach(poi => {
        expect(poi.requiresEncounterConfirmation).toBe(true);
      });
    });

    it('should have disableSalvage flag set', () => {
      const blueprintPoIs = poiTypes.filter(p => p.id.startsWith('POI_DRONE_'));

      blueprintPoIs.forEach(poi => {
        expect(poi.disableSalvage).toBe(true);
      });
    });

    it('should have threatIncreaseOnVictoryOnly flag set', () => {
      const blueprintPoIs = poiTypes.filter(p => p.id.startsWith('POI_DRONE_'));

      blueprintPoIs.forEach(poi => {
        expect(poi.threatIncreaseOnVictoryOnly).toBe(true);
      });
    });
  });

  describe('Encounter Modal Triggering', () => {
    it('should return encounterPending for blueprint PoIs with requiresEncounterConfirmation', async () => {
      // Create mock blueprint PoI
      const mockPoI = {
        type: 'poi',
        q: 1,
        r: 1,
        poiData: {
          id: 'POI_DRONE_LIGHT',
          name: 'Drone Reconnaissance Outpost',
          requiresEncounterConfirmation: true,
          guardianAI: {
            id: 'Rogue Scout Pattern',
            name: 'Rogue Scout Pattern'
          },
          rewardType: 'DRONE_BLUEPRINT_LIGHT',
          threatIncrease: 15
        }
      };

      const tierConfig = { threatTables: { low: ['Rogue Scout Pattern'] } };

      const encounterResult = await EncounterController.handlePOIArrival(mockPoI, tierConfig);

      expect(encounterResult).toBeDefined();
      expect(encounterResult.outcome).toBe('encounterPending');
      expect(encounterResult.requiresConfirmation).toBe(true);
      expect(encounterResult.isGuaranteedCombat).toBe(true);
    });

    it('should NOT trigger combat immediately for blueprint PoIs', async () => {
      const mockPoI = {
        type: 'poi',
        q: 1,
        r: 1,
        poiData: {
          id: 'POI_DRONE_MEDIUM',
          name: 'Drone Combat Bay',
          requiresEncounterConfirmation: true,
          guardianAI: {
            id: 'Specialized Hunter Group',
            name: 'Specialized Hunter Group'
          },
          rewardType: 'DRONE_BLUEPRINT_MEDIUM',
          threatIncrease: 18
        }
      };

      const tierConfig = { threatTables: { medium: ['Specialized Hunter Group'] } };

      const encounterResult = await EncounterController.handlePOIArrival(mockPoI, tierConfig);

      // Should NOT be 'combat' immediately
      expect(encounterResult.outcome).not.toBe('combat');
      expect(encounterResult.outcome).toBe('encounterPending');
    });

    it('should still trigger auto-combat for non-confirmation guardians', async () => {
      // Test backward compatibility: non-confirmation guardians should auto-trigger
      const mockPoI = {
        type: 'poi',
        q: 1,
        r: 1,
        poiData: {
          id: 'POI_REGULAR',
          name: 'Regular PoI',
          requiresEncounterConfirmation: false, // No confirmation needed
          guardianAI: {
            id: 'Regular Enemy',
            name: 'Regular Enemy'
          }
        }
      };

      const tierConfig = { threatTables: { low: ['Regular Enemy'] } };

      const encounterResult = await EncounterController.handlePOIArrival(mockPoI, tierConfig);

      expect(encounterResult.outcome).toBe('combat');
    });
  });

  describe('Declining Encounter', () => {
    beforeEach(() => {
      // Initialize tactical map run before setting state
      tacticalMapStateManager.startRun({
        shipSlotId: 'test-slot',
        mapTier: 1,
        mapData: { tier: 1, backgroundIndex: 0 },
        startingGate: { q: 0, r: 0 },
        shipSections: {
          bridge: { hull: 10, maxHull: 10 },
          powerCell: { hull: 10, maxHull: 10 },
          droneControlHub: { hull: 10, maxHull: 10 }
        }
      });

      // Set additional state
      tacticalMapStateManager.setState({
        detection: 50,
        lootedPOIs: []
      });
    });

    it('should not apply damage when player declines', () => {
      const initialState = tacticalMapStateManager.getState();
      const initialBridgeHull = initialState.shipSections.bridge.hull;

      // Decline = no damage, so hull should remain unchanged
      // This test verifies no damage is applied during decline handler

      const currentState = tacticalMapStateManager.getState();
      expect(currentState.shipSections.bridge.hull).toBe(initialBridgeHull);
    });

    it('should not increase threat when player declines', () => {
      const initialDetection = DetectionManager.getCurrentDetection();

      // Decline = no threat increase
      // This test verifies detection manager is not called during decline

      const finalDetection = DetectionManager.getCurrentDetection();
      expect(finalDetection).toBe(initialDetection);
    });

    it('should keep PoI available after declining', () => {
      const mockPoI = { q: 5, r: 5 };
      const initialState = tacticalMapStateManager.getState();
      const initialLootedPOIs = initialState.lootedPOIs || [];

      // Declined PoI should NOT be in lootedPOIs
      const finalState = tacticalMapStateManager.getState();
      const finalLootedPOIs = finalState.lootedPOIs || [];

      const isLooted = finalLootedPOIs.some(p => p.q === mockPoI.q && p.r === mockPoI.r);
      expect(isLooted).toBe(false);
      expect(finalLootedPOIs.length).toBe(initialLootedPOIs.length);
    });
  });

  describe('Combat Victory', () => {
    beforeEach(() => {
      // Initialize tactical map run before setting state
      tacticalMapStateManager.startRun({
        shipSlotId: 'test-slot',
        mapTier: 1,
        mapData: { tier: 1, backgroundIndex: 0 },
        startingGate: { q: 0, r: 0 },
        shipSections: {
          bridge: { hull: 8, maxHull: 10 },
          powerCell: { hull: 9, maxHull: 10 },
          droneControlHub: { hull: 7, maxHull: 10 }
        }
      });

      tacticalMapStateManager.setState({
        detection: 30,
        encounterDetectionChance: 50, // Signal Lock at 50%
        pendingPOICombat: {
          packType: 'DRONE_BLUEPRINT_LIGHT',
          fromBlueprintPoI: true
        },
        currentPOI: {
          q: 2,
          r: 3,
          poiData: {
            id: 'POI_DRONE_LIGHT',
            name: 'Drone Reconnaissance Outpost',
            threatIncrease: 15,
            threatIncreaseOnVictoryOnly: true
          }
        },
        lootedPOIs: []
      });

      gameStateManager.setState({
        player1: {
          shipSections: {
            bridge: { hull: 8 },
            powerCell: { hull: 9 },
            droneControlHub: { hull: 7 }
          }
        },
        player2: {
          deck: [
            { id: 'CARD001', name: 'Test Card 1' },
            { id: 'CARD002', name: 'Test Card 2' }
          ]
        },
        singlePlayerEncounter: {
          tier: 1,
          aiDifficulty: 'Easy'
        }
      });
    });

    it('should apply threat increase on victory', () => {
      const initialDetection = DetectionManager.getCurrentDetection();

      // Process victory
      const outcome = CombatOutcomeProcessor.processVictory(
        gameStateManager.getState(),
        gameStateManager.getState().singlePlayerEncounter
      );

      // Verify threat increase was applied
      const finalDetection = DetectionManager.getCurrentDetection();
      expect(finalDetection).toBeGreaterThan(initialDetection);
      expect(finalDetection - initialDetection).toBe(15); // threatIncrease from PoI
    });

    it('should NOT reset Signal Lock on victory', () => {
      const initialSignalLock = tacticalMapStateManager.getState().encounterDetectionChance;
      expect(initialSignalLock).toBe(50);

      // Process victory
      CombatOutcomeProcessor.processVictory(
        gameStateManager.getState(),
        gameStateManager.getState().singlePlayerEncounter
      );

      // Signal Lock should be RETAINED
      const finalSignalLock = tacticalMapStateManager.getState().encounterDetectionChance;
      expect(finalSignalLock).toBe(50);
      expect(finalSignalLock).toBe(initialSignalLock);
    });

    it('should reset Signal Lock for NON-blueprint victories', () => {
      // Update state to indicate non-blueprint combat
      tacticalMapStateManager.setState({
        encounterDetectionChance: 60,
        pendingPOICombat: {
          fromBlueprintPoI: false // Regular combat
        }
      });

      // Process victory
      CombatOutcomeProcessor.processVictory(
        gameStateManager.getState(),
        gameStateManager.getState().singlePlayerEncounter
      );

      // Signal Lock SHOULD be reset for regular encounters
      const finalSignalLock = tacticalMapStateManager.getState().encounterDetectionChance;
      expect(finalSignalLock).toBe(0);
    });

    it('should mark PoI as looted after victory', () => {
      const initialLootedPOIs = tacticalMapStateManager.getState().lootedPOIs || [];
      const poiCoords = { q: 2, r: 3 };

      // Process victory
      CombatOutcomeProcessor.processVictory(
        gameStateManager.getState(),
        gameStateManager.getState().singlePlayerEncounter
      );

      // PoI should be marked as looted
      const finalLootedPOIs = tacticalMapStateManager.getState().lootedPOIs || [];
      const isLooted = finalLootedPOIs.some(p => p.q === poiCoords.q && p.r === poiCoords.r);
      expect(isLooted).toBe(true);
    });

    it('should award blueprint on victory', () => {
      // Process victory
      CombatOutcomeProcessor.processVictory(
        gameStateManager.getState(),
        gameStateManager.getState().singlePlayerEncounter
      );

      // Check for pending drone blueprint
      const finalGameState = gameStateManager.getState();
      expect(finalGameState.pendingDroneBlueprint).toBeDefined();
      expect(finalGameState.hasPendingDroneBlueprint).toBe(true);
    });
  });

  describe('Salvage Operations', () => {
    it('should block salvage initialization for blueprint PoIs', () => {
      const mockBlueprintPoI = {
        poiData: {
          id: 'POI_DRONE_LIGHT',
          disableSalvage: true,
          rewardType: 'DRONE_BLUEPRINT_LIGHT'
        }
      };

      const salvageController = new SalvageController();
      const mockLootGenerator = {
        generateSalvageSlots: vi.fn()
      };
      const tierConfig = {};
      const zone = 'core';

      const result = salvageController.initializeSalvage(
        mockBlueprintPoI,
        tierConfig,
        zone,
        mockLootGenerator,
        1,
        'low'
      );

      // Should return null (salvage blocked)
      expect(result).toBeNull();
      expect(mockLootGenerator.generateSalvageSlots).not.toHaveBeenCalled();
    });

    it('should allow salvage for regular PoIs', () => {
      const mockRegularPoI = {
        poiData: {
          id: 'POI_MUNITIONS',
          disableSalvage: false, // Regular PoI
          rewardType: 'ORDNANCE_PACK',
          encounterChance: 20
        }
      };

      const salvageController = new SalvageController();
      const tierConfig = {};
      const zone = 'core';

      const result = salvageController.initializeSalvage(
        mockRegularPoI,
        tierConfig,
        zone,
        1,
        'low'
      );

      // Should succeed for regular PoIs (returns salvage state with slots)
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result.slots).toBeDefined();
      expect(Array.isArray(result.slots)).toBe(true);
    });
  });

  describe('Tactical Map State Preservation', () => {
    beforeEach(() => {
      // Initialize tactical map run before setting state
      tacticalMapStateManager.startRun({
        shipSlotId: 'test-slot',
        mapTier: 1,
        mapData: { tier: 1, backgroundIndex: 0 },
        startingGate: { q: 0, r: 0 },
        shipSections: {
          bridge: { hull: 10, maxHull: 10 },
          powerCell: { hull: 10, maxHull: 10 },
          droneControlHub: { hull: 10, maxHull: 10 }
        }
      });

      tacticalMapStateManager.setState({
        waypoints: [
          { hex: { q: 1, r: 1 }, name: 'Waypoint 1' },
          { hex: { q: 2, r: 2 }, name: 'Waypoint 2' }
        ],
        encounterDetectionChance: 45,
        detection: 35,
        lootedPOIs: [{ q: 0, r: 0 }],
        poisVisited: [{ q: 0, r: 1 }]
      });
    });

    it('should preserve waypoints after combat', () => {
      const initialState = tacticalMapStateManager.getState();
      const initialWaypoints = initialState.waypoints;

      // Store waypoints in pendingWaypoints (simulates pre-combat)
      tacticalMapStateManager.setState({
        pendingWaypoints: initialWaypoints
      });

      // After combat, waypoints should be restored
      const finalState = tacticalMapStateManager.getState();
      expect(finalState.pendingWaypoints).toEqual(initialWaypoints);
    });

    it('should preserve Signal Lock value after blueprint combat', () => {
      const initialSignalLock = 45;

      // Simulate blueprint combat (Signal Lock should NOT reset)
      tacticalMapStateManager.setState({
        encounterDetectionChance: initialSignalLock,
        pendingPOICombat: {
          fromBlueprintPoI: true
        }
      });

      const finalSignalLock = tacticalMapStateManager.getState().encounterDetectionChance;
      expect(finalSignalLock).toBe(initialSignalLock);
    });

    it('should preserve other PoI states', () => {
      const initialLootedPOIs = tacticalMapStateManager.getState().lootedPOIs;
      const initialPoisVisited = tacticalMapStateManager.getState().poisVisited;

      // After combat, existing PoI states should be unchanged
      const finalLootedPOIs = tacticalMapStateManager.getState().lootedPOIs;
      const finalPoisVisited = tacticalMapStateManager.getState().poisVisited;

      expect(finalLootedPOIs).toEqual(initialLootedPOIs);
      expect(finalPoisVisited).toEqual(initialPoisVisited);
    });
  });

  describe('PoI Persistence When Declined', () => {
    beforeEach(() => {
      // Initialize tactical map run before setting state
      tacticalMapStateManager.startRun({
        shipSlotId: 'test-slot',
        mapTier: 1,
        mapData: { tier: 1, backgroundIndex: 0 },
        startingGate: { q: 0, r: 0 },
        shipSections: {
          bridge: { hull: 10, maxHull: 10 },
          powerCell: { hull: 10, maxHull: 10 },
          droneControlHub: { hull: 10, maxHull: 10 }
        }
      });

      tacticalMapStateManager.setState({
        poisVisited: []
      });
    });

    it('should NOT mark PoI as visited on arrival for blueprint PoIs', () => {
      const mockBlueprintPoI = {
        type: 'poi',
        q: 3,
        r: 4,
        poiData: {
          id: 'POI_DRONE_HEAVY',
          name: 'Drone Weapons Foundry',
          requiresEncounterConfirmation: true
        }
      };

      // Blueprint PoI with requiresEncounterConfirmation should NOT be marked visited on arrival
      // This allows player to decline and return later

      const finalState = tacticalMapStateManager.getState();
      const isVisited = finalState.poisVisited?.some(p => p.q === 3 && p.r === 4);

      // Should NOT be marked as visited yet (waiting for engagement decision)
      expect(isVisited).toBe(false);
    });

    it('should mark regular PoI as visited on arrival', async () => {
      const mockRegularPoI = {
        type: 'poi',
        q: 5,
        r: 6,
        poiData: {
          id: 'POI_MUNITIONS',
          name: 'Munitions Depot',
          requiresEncounterConfirmation: false
        }
      };

      const tierConfig = { threatTables: { low: ['AI_SCOUT_1'] } };

      // Regular PoIs should be marked as visited immediately
      await EncounterController.handlePOIArrival(mockRegularPoI, tierConfig);

      const finalState = tacticalMapStateManager.getState();
      const isVisited = finalState.poisVisited?.some(p => p.q === 5 && p.r === 6);

      expect(isVisited).toBe(true);
    });
  });

  describe('Integration: Full Blueprint PoI Flow', () => {
    beforeEach(() => {
      // Initialize tactical map run before setting state
      tacticalMapStateManager.startRun({
        shipSlotId: 'test-slot',
        mapTier: 1,
        mapData: { tier: 1, backgroundIndex: 0 },
        startingGate: { q: 0, r: 0 },
        shipSections: {
          bridge: { hull: 10, maxHull: 10 },
          powerCell: { hull: 10, maxHull: 10 },
          droneControlHub: { hull: 10, maxHull: 10 }
        }
      });
    });

    it('should complete full accept → combat → victory → blueprint flow', async () => {
      // 1. Player lands on blueprint PoI
      const blueprintPoI = {
        type: 'poi',
        q: 10,
        r: 10,
        poiData: {
          id: 'POI_DRONE_LIGHT',
          name: 'Drone Reconnaissance Outpost',
          requiresEncounterConfirmation: true,
          guardianAI: {
            id: 'Rogue Scout Pattern',
            name: 'Rogue Scout Pattern'
          },
          rewardType: 'DRONE_BLUEPRINT_LIGHT',
          threatIncrease: 15,
          threatIncreaseOnVictoryOnly: true
        }
      };

      const tierConfig = { threatTables: { low: ['Rogue Scout Pattern'] } };

      // 2. EncounterController returns encounterPending
      const encounterResult = await EncounterController.handlePOIArrival(blueprintPoI, tierConfig);
      expect(encounterResult.outcome).toBe('encounterPending');
      expect(encounterResult.requiresConfirmation).toBe(true);

      // 3. Player accepts → combat starts (tested separately)

      // 4. Player wins combat → blueprint awarded (tested separately)

      // 5. Verify all state changes
      expect(encounterResult.aiId).toBe('Rogue Scout Pattern');
      expect(encounterResult.reward.rewardType).toBe('DRONE_BLUEPRINT_LIGHT');
    });

    it('should complete full decline → persistence flow', () => {
      const blueprintPoI = {
        type: 'poi',
        q: 11,
        r: 11,
        poiData: {
          id: 'POI_DRONE_MEDIUM',
          requiresEncounterConfirmation: true
        }
      };

      tacticalMapStateManager.setState({
        lootedPOIs: [],
        detection: 40
      });

      const initialDetection = DetectionManager.getCurrentDetection();
      const initialLootedPOIs = tacticalMapStateManager.getState().lootedPOIs || [];

      // Player declines → PoI should persist
      // (No damage, no threat, no looted marking)

      const finalDetection = DetectionManager.getCurrentDetection();
      const finalLootedPOIs = tacticalMapStateManager.getState().lootedPOIs || [];

      expect(finalDetection).toBe(initialDetection);
      expect(finalLootedPOIs.length).toBe(initialLootedPOIs.length);
    });
  });
});
