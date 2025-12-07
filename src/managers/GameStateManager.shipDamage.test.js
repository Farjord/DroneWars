/**
 * GameStateManager Ship Section Damage Persistence Tests
 * TDD: Tests written first to verify ship hull damage persists across runs
 *
 * Bug: Non-slot 0 ship sections should retain hull damage after extraction,
 * but damage is not being stored in shipComponentInstances.
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

describe('GameStateManager - Ship Section Damage Persistence', () => {
  // Use REAL component IDs from shipSectionData.js
  // Types use capital case: 'Bridge', 'Power Cell', 'Drone Control Hub'
  const createTestShipSlot = (slotId) => ({
    id: slotId,
    name: `Test Ship Slot ${slotId}`,
    status: 'active',
    isImmutable: slotId === 0,
    shipId: 'CORVETTE',
    decklist: [],
    drones: [],
    shipComponents: {
      'BRIDGE_001': 1,        // Real ID from shipSectionData.js
      'POWERCELL_001': 2,     // Real ID (no underscore)
      'DRONECONTROL_001': 3   // Real ID (no underscore)
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

  describe('endRun - hull damage persistence', () => {
    it('should persist hull damage to shipComponentInstances on successful run (non-slot 0)', () => {
      // Setup: Create a run state with damaged ship sections
      const runState = {
        shipSlotId: 1, // Non-slot 0
        mapTier: 1,
        collectedLoot: [],
        creditsEarned: 50,
        aiCoresEarned: 0,
        shipSections: {
          bridge: { id: 'BRIDGE_001', type: 'bridge', hull: 7, maxHull: 10 }, // 3 damage
          powerCell: { id: 'POWER_CELL_001', type: 'powerCell', hull: 5, maxHull: 10 }, // 5 damage
          droneControlHub: { id: 'DRONE_CTRL_001', type: 'droneControlHub', hull: 10, maxHull: 10 } // No damage
        },
        currentHull: 22,
        maxHull: 30
      };

      gameStateManager.setState({ currentRunState: runState });

      // Act: End the run successfully
      gameStateManager.endRun(true);

      // Assert: Hull damage should be persisted to shipComponentInstances
      const state = gameStateManager.getState();
      const instances = state.singlePlayerShipComponentInstances;

      expect(instances.length).toBeGreaterThan(0);

      const bridgeInstance = instances.find(i => i.componentId === 'BRIDGE_001' && i.shipSlotId === 1);
      const powerCellInstance = instances.find(i => i.componentId === 'POWER_CELL_001' && i.shipSlotId === 1);

      expect(bridgeInstance).toBeDefined();
      expect(bridgeInstance.currentHull).toBe(7);

      expect(powerCellInstance).toBeDefined();
      expect(powerCellInstance.currentHull).toBe(5);
    });

    it('should NOT persist hull damage for slot 0 (starter deck)', () => {
      // Setup: Create a run state for slot 0 with damaged sections
      const runState = {
        shipSlotId: 0, // Slot 0 - should NOT persist
        mapTier: 1,
        collectedLoot: [],
        creditsEarned: 50,
        aiCoresEarned: 0,
        shipSections: {
          bridge: { id: 'BRIDGE_001', type: 'bridge', hull: 5, maxHull: 10 }
        },
        currentHull: 25,
        maxHull: 30
      };

      gameStateManager.setState({ currentRunState: runState });

      // Act
      gameStateManager.endRun(true);

      // Assert: No instances should be created for slot 0
      const state = gameStateManager.getState();
      const slot0Instances = state.singlePlayerShipComponentInstances.filter(i => i.shipSlotId === 0);

      expect(slot0Instances.length).toBe(0);
    });

    it('should update existing shipComponentInstance if already exists', () => {
      // Setup: Pre-existing instance with old hull value
      const existingInstance = {
        instanceId: 'existing-bridge-instance',
        componentId: 'BRIDGE_001',
        shipSlotId: 1,
        currentHull: 8,
        maxHull: 10
      };

      gameStateManager.setState({
        singlePlayerShipComponentInstances: [existingInstance]
      });

      const runState = {
        shipSlotId: 1,
        mapTier: 1,
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0,
        shipSections: {
          bridge: { id: 'BRIDGE_001', type: 'bridge', hull: 3, maxHull: 10 } // Further damaged
        },
        currentHull: 23,
        maxHull: 30
      };

      gameStateManager.setState({ currentRunState: runState });

      // Act
      gameStateManager.endRun(true);

      // Assert: Should update existing instance, not create new one
      const state = gameStateManager.getState();
      const bridgeInstances = state.singlePlayerShipComponentInstances.filter(
        i => i.componentId === 'BRIDGE_001' && i.shipSlotId === 1
      );

      expect(bridgeInstances.length).toBe(1);
      expect(bridgeInstances[0].currentHull).toBe(3);
    });
  });

  describe('startRun - hull damage loading', () => {
    it('should load saved hull damage from shipComponentInstances when starting new run', () => {
      // Setup: Pre-existing damage from previous run
      const savedInstances = [
        {
          instanceId: 'saved-bridge',
          componentId: 'BRIDGE_001',
          shipSlotId: 1,
          currentHull: 6,
          maxHull: 10
        },
        {
          instanceId: 'saved-power',
          componentId: 'POWERCELL_001', // Correct ID (no underscore)
          shipSlotId: 1,
          currentHull: 4,
          maxHull: 10
        }
      ];

      gameStateManager.setState({
        singlePlayerShipComponentInstances: savedInstances
      });

      // Act: Start a new run with slot 1
      gameStateManager.startRun(1, 1, 0, {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      });

      // Assert: Run state should have pre-damaged hull values
      const state = gameStateManager.getState();
      const runState = state.currentRunState;

      expect(runState).toBeDefined();
      // Types use capital case: 'Bridge', 'Power Cell', 'Drone Control Hub'
      expect(runState.shipSections['Bridge'].hull).toBe(6);
      expect(runState.shipSections['Power Cell'].hull).toBe(4);
    });

    it('should use full hull for slot 0 (starter deck) regardless of any saved instances', () => {
      // Setup: Even if there were somehow saved instances for slot 0
      const savedInstances = [
        {
          instanceId: 'bad-instance',
          componentId: 'BRIDGE_001',
          shipSlotId: 0, // Should be ignored
          currentHull: 1,
          maxHull: 10
        }
      ];

      gameStateManager.setState({
        singlePlayerShipComponentInstances: savedInstances
      });

      // Act
      gameStateManager.startRun(0, 1, 0, {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      });

      // Assert: Slot 0 should always have full hull
      const state = gameStateManager.getState();
      const runState = state.currentRunState;

      // Check that no section has the damaged value
      Object.values(runState.shipSections).forEach(section => {
        expect(section.hull).toBe(section.maxHull);
      });
    });
  });

  describe('round-trip damage persistence', () => {
    it('should preserve damage through complete run cycle: start -> damage -> end -> start', () => {
      // Step 1: Start a run with slot 1 (full hull)
      gameStateManager.startRun(1, 1, 0, {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      });

      let state = gameStateManager.getState();
      // Section types use capital case: 'Bridge', 'Power Cell', 'Drone Control Hub'
      const bridgeSection = state.currentRunState.shipSections['Bridge'];
      expect(bridgeSection).toBeDefined();
      const initialBridgeHull = bridgeSection?.hull || 10;

      // Step 2: Simulate combat damage by modifying run state
      const damagedSections = {
        ...state.currentRunState.shipSections
      };
      // Damage the bridge section
      if (damagedSections['Bridge']) {
        damagedSections['Bridge'] = { ...damagedSections['Bridge'], hull: 4 };
      }

      gameStateManager.setState({
        currentRunState: {
          ...state.currentRunState,
          shipSections: damagedSections,
          currentHull: 24
        }
      });

      // Step 3: End run successfully
      gameStateManager.endRun(true);

      // Verify run state is cleared
      state = gameStateManager.getState();
      expect(state.currentRunState).toBeNull();

      // Step 4: Start a NEW run with the same slot
      gameStateManager.startRun(1, 1, 0, {
        name: 'Test Map 2',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      });

      // Assert: New run should start with damaged hull from previous run
      state = gameStateManager.getState();
      const newBridgeSection = state.currentRunState.shipSections['Bridge'];

      expect(newBridgeSection).toBeDefined();
      expect(newBridgeSection.hull).toBe(4); // Should retain damage from previous run
    });
  });
});
