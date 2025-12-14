/**
 * GameStateManager Ship Section Damage Persistence Tests
 * TDD: Tests written first to verify ship hull damage persists across runs
 *
 * Updated for slot-based damage model:
 * - Damage is stored in sectionSlots[lane].damageDealt
 * - No longer uses singlePlayerShipComponentInstances
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
  // Use slot-based format with sectionSlots
  const createTestShipSlot = (slotId, sectionDamage = {}) => ({
    id: slotId,
    name: `Test Ship Slot ${slotId}`,
    status: 'active',
    isImmutable: slotId === 0,
    shipId: 'SHIP_001',
    decklist: [],
    droneSlots: [
      { droneName: 'Dart', isDamaged: false },
      { droneName: 'Talon', isDamaged: false },
      { droneName: 'Mammoth', isDamaged: false },
      { droneName: 'Seraph', isDamaged: false },
      { droneName: 'Devastator', isDamaged: false }
    ],
    sectionSlots: {
      l: { componentId: 'BRIDGE_001', damageDealt: sectionDamage.l || 0 },
      m: { componentId: 'POWERCELL_001', damageDealt: sectionDamage.m || 0 },
      r: { componentId: 'DRONECONTROL_001', damageDealt: sectionDamage.r || 0 }
    },
    // Legacy format for backward compatibility
    drones: [],
    shipComponents: {
      'BRIDGE_001': 'l',
      'POWERCELL_001': 'm',
      'DRONECONTROL_001': 'r'
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
    it('should persist hull damage to sectionSlots on successful run (non-slot 0)', () => {
      // Setup: Create a run state with damaged ship sections
      const runState = {
        shipSlotId: 1, // Non-slot 0
        mapTier: 1,
        collectedLoot: [],
        creditsEarned: 50,
        aiCoresEarned: 0,
        shipSections: {
          'Bridge': { id: 'BRIDGE_001', type: 'Bridge', hull: 7, maxHull: 10, lane: 'l' }, // 3 damage
          'Power Cell': { id: 'POWERCELL_001', type: 'Power Cell', hull: 5, maxHull: 10, lane: 'm' }, // 5 damage
          'Drone Control Hub': { id: 'DRONECONTROL_001', type: 'Drone Control Hub', hull: 10, maxHull: 10, lane: 'r' } // No damage
        },
        currentHull: 22,
        maxHull: 30
      };

      gameStateManager.setState({ currentRunState: runState });

      // Act: End the run successfully
      gameStateManager.endRun(true);

      // Assert: Hull damage should be persisted to sectionSlots
      const state = gameStateManager.getState();
      const shipSlot = state.singlePlayerShipSlots.find(s => s.id === 1);

      expect(shipSlot.sectionSlots.l.damageDealt).toBe(3); // 10 - 7 = 3
      expect(shipSlot.sectionSlots.m.damageDealt).toBe(5); // 10 - 5 = 5
      expect(shipSlot.sectionSlots.r.damageDealt).toBe(0); // 10 - 10 = 0
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
          'Bridge': { id: 'BRIDGE_001', type: 'Bridge', hull: 5, maxHull: 10, lane: 'l' }
        },
        currentHull: 25,
        maxHull: 30
      };

      gameStateManager.setState({ currentRunState: runState });

      // Act
      gameStateManager.endRun(true);

      // Assert: Slot 0 should have no damage
      const state = gameStateManager.getState();
      const slot0 = state.singlePlayerShipSlots.find(s => s.id === 0);

      expect(slot0.sectionSlots.l.damageDealt).toBe(0);
    });

    it('should update sectionSlots damage on subsequent runs', () => {
      // Setup: Set initial damage on slot 1
      const slots = [...gameStateManager.getState().singlePlayerShipSlots];
      slots[1].sectionSlots.l.damageDealt = 2; // Pre-existing damage
      gameStateManager.setState({ singlePlayerShipSlots: slots });

      const runState = {
        shipSlotId: 1,
        mapTier: 1,
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0,
        shipSections: {
          'Bridge': { id: 'BRIDGE_001', type: 'Bridge', hull: 3, maxHull: 10, lane: 'l' } // Further damaged
        },
        currentHull: 23,
        maxHull: 30
      };

      gameStateManager.setState({ currentRunState: runState });

      // Act
      gameStateManager.endRun(true);

      // Assert: Should update damage
      const state = gameStateManager.getState();
      const slot = state.singlePlayerShipSlots.find(s => s.id === 1);

      expect(slot.sectionSlots.l.damageDealt).toBe(7); // 10 - 3 = 7
    });
  });

  describe('startRun - hull damage loading', () => {
    it('should load saved hull damage from sectionSlots when starting new run', () => {
      // Setup: Pre-existing damage in sectionSlots
      const slots = [...gameStateManager.getState().singlePlayerShipSlots];
      slots[1].sectionSlots.l.damageDealt = 4; // Bridge took 4 damage
      slots[1].sectionSlots.m.damageDealt = 6; // Power Cell took 6 damage
      gameStateManager.setState({ singlePlayerShipSlots: slots });

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
      // SHIP_001 has baseHull = 8, standard components have hullModifier = 0
      expect(runState.shipSections['Bridge'].hull).toBe(4); // 8 - 4
      expect(runState.shipSections['Power Cell'].hull).toBe(2); // 8 - 6
    });

    it('should use full hull for slot 0 (starter deck) regardless of any saved damage', () => {
      // Setup: Even if slot 0 had damage (shouldn't happen but let's test)
      const slots = [...gameStateManager.getState().singlePlayerShipSlots];
      slots[0].sectionSlots.l.damageDealt = 9; // Should be ignored for slot 0
      gameStateManager.setState({ singlePlayerShipSlots: slots });

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
      // SHIP_001 has baseHull = 8, standard components have hullModifier = 0
      expect(bridgeSection.hull).toBe(8); // Full hull to start

      // Step 2: Simulate combat damage by modifying run state
      const damagedSections = {
        ...state.currentRunState.shipSections
      };
      // Damage the bridge section
      if (damagedSections['Bridge']) {
        damagedSections['Bridge'] = { ...damagedSections['Bridge'], hull: 4, lane: 'l' };
      }
      // Ensure other sections have their lane info
      if (damagedSections['Power Cell']) {
        damagedSections['Power Cell'] = { ...damagedSections['Power Cell'], lane: 'm' };
      }
      if (damagedSections['Drone Control Hub']) {
        damagedSections['Drone Control Hub'] = { ...damagedSections['Drone Control Hub'], lane: 'r' };
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

      // Verify damage was persisted to sectionSlots
      const slot1 = state.singlePlayerShipSlots.find(s => s.id === 1);
      // SHIP_001 has baseHull = 8, hull was set to 4, so damageDealt = 8 - 4 = 4
      expect(slot1.sectionSlots.l.damageDealt).toBe(4);

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
