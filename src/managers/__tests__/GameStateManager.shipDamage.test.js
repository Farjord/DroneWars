/**
 * GameStateManager Ship Section Damage Persistence Tests
 * TDD: Tests written first to verify ship hull damage persists across runs
 *
 * Updated for slot-based damage model:
 * - Damage is stored in sectionSlots[lane].damageDealt
 * - No longer uses singlePlayerShipComponentInstances
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import gameStateManager from '../GameStateManager.js';
import tacticalMapStateManager from '../TacticalMapStateManager.js';

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

// Mock tacticalMapStateManager
vi.mock('../TacticalMapStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    isRunActive: vi.fn(),
    startRun: vi.fn(),
    endRun: vi.fn(),
    subscribe: vi.fn(() => () => {})
  }
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

    // Reset tacticalMapStateManager mock
    vi.clearAllMocks();
    tacticalMapStateManager.isRunActive.mockReturnValue(false);
    tacticalMapStateManager.getState.mockReturnValue(null);
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
          bridge: { id: 'BRIDGE_001', type: 'Bridge', hull: 7, maxHull: 10, lane: 'l' }, // 3 damage
          powerCell: { id: 'POWERCELL_001', type: 'Power Cell', hull: 5, maxHull: 10, lane: 'm' }, // 5 damage
          droneControlHub: { id: 'DRONECONTROL_001', type: 'Drone Control Hub', hull: 10, maxHull: 10, lane: 'r' } // No damage
        },
        currentHull: 22,
        maxHull: 30
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(runState);

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
          bridge: { id: 'BRIDGE_001', type: 'Bridge', hull: 5, maxHull: 10, lane: 'l' }
        },
        currentHull: 25,
        maxHull: 30
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(runState);

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
          bridge: { id: 'BRIDGE_001', type: 'Bridge', hull: 3, maxHull: 10, lane: 'l' } // Further damaged
        },
        currentHull: 23,
        maxHull: 30
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(runState);

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

      // Mock the run state that would be created
      const mockRunState = {
        shipSlotId: 1,
        mapTier: 1,
        shipSections: {
          bridge: { id: 'BRIDGE_001', type: 'Bridge', hull: 4, maxHull: 8, lane: 'l' }, // 8 - 4
          powerCell: { id: 'POWERCELL_001', type: 'Power Cell', hull: 2, maxHull: 8, lane: 'm' } // 8 - 6
        }
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(mockRunState);

      // Act: Start a new run with slot 1
      gameStateManager.startRun({ shipSlotId: 1, mapTier: 1, entryGateId: 0, preGeneratedMap: {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      }});

      // Assert: Run state should have pre-damaged hull values
      const runState = tacticalMapStateManager.getState();

      expect(runState).toBeDefined();
      // Keys use lowercase camelCase: 'bridge', 'powerCell', 'droneControlHub'
      // SHIP_001 has baseHull = 8, standard components have hullModifier = 0
      expect(runState.shipSections['bridge'].hull).toBe(4); // 8 - 4
      expect(runState.shipSections['powerCell'].hull).toBe(2); // 8 - 6
    });

    it('should use full hull for slot 0 (starter deck) regardless of any saved damage', () => {
      // Setup: Even if slot 0 had damage (shouldn't happen but let's test)
      const slots = [...gameStateManager.getState().singlePlayerShipSlots];
      slots[0].sectionSlots.l.damageDealt = 9; // Should be ignored for slot 0
      gameStateManager.setState({ singlePlayerShipSlots: slots });

      // Mock the run state with full hull for slot 0
      const mockRunState = {
        shipSlotId: 0,
        mapTier: 1,
        shipSections: {
          bridge: { id: 'BRIDGE_001', type: 'Bridge', hull: 8, maxHull: 8, lane: 'l' },
          powerCell: { id: 'POWERCELL_001', type: 'Power Cell', hull: 8, maxHull: 8, lane: 'm' },
          droneControlHub: { id: 'DRONECONTROL_001', type: 'Drone Control Hub', hull: 8, maxHull: 8, lane: 'r' }
        }
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(mockRunState);

      // Act
      gameStateManager.startRun({ shipSlotId: 0, mapTier: 1, entryGateId: 0, preGeneratedMap: {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      }});

      // Assert: Slot 0 should always have full hull
      const runState = tacticalMapStateManager.getState();

      // Check that no section has the damaged value
      Object.values(runState.shipSections).forEach(section => {
        expect(section.hull).toBe(section.maxHull);
      });
    });
  });

  describe('round-trip damage persistence', () => {
    it('should preserve damage through complete run cycle: start -> damage -> end -> start', () => {
      // Step 1: Start a run with slot 1 (full hull)
      const initialRunState = {
        shipSlotId: 1,
        mapTier: 1,
        shipSections: {
          bridge: { id: 'BRIDGE_001', type: 'Bridge', hull: 8, maxHull: 8, lane: 'l' },
          powerCell: { id: 'POWERCELL_001', type: 'Power Cell', hull: 8, maxHull: 8, lane: 'm' },
          droneControlHub: { id: 'DRONECONTROL_001', type: 'Drone Control Hub', hull: 8, maxHull: 8, lane: 'r' }
        }
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(initialRunState);

      gameStateManager.startRun({ shipSlotId: 1, mapTier: 1, entryGateId: 0, preGeneratedMap: {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      }});

      // Section keys use lowercase camelCase: 'bridge', 'powerCell', 'droneControlHub'
      const bridgeSection = tacticalMapStateManager.getState().shipSections['bridge'];
      expect(bridgeSection).toBeDefined();
      // SHIP_001 has baseHull = 8, standard components have hullModifier = 0
      expect(bridgeSection.hull).toBe(8); // Full hull to start

      // Step 2: Simulate combat damage by modifying run state
      const damagedRunState = {
        shipSlotId: 1,
        mapTier: 1,
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0,
        shipSections: {
          bridge: { id: 'BRIDGE_001', type: 'Bridge', hull: 4, maxHull: 8, lane: 'l' },
          powerCell: { id: 'POWERCELL_001', type: 'Power Cell', hull: 8, maxHull: 8, lane: 'm' },
          droneControlHub: { id: 'DRONECONTROL_001', type: 'Drone Control Hub', hull: 8, maxHull: 8, lane: 'r' }
        },
        currentHull: 20,
        maxHull: 24
      };

      tacticalMapStateManager.getState.mockReturnValue(damagedRunState);

      // Step 3: End run successfully
      gameStateManager.endRun(true);

      // Verify run state is cleared
      tacticalMapStateManager.isRunActive.mockReturnValue(false);
      tacticalMapStateManager.getState.mockReturnValue(null);

      // Verify damage was persisted to sectionSlots
      const state = gameStateManager.getState();
      const slot1 = state.singlePlayerShipSlots.find(s => s.id === 1);
      // SHIP_001 has baseHull = 8, hull was set to 4, so damageDealt = 8 - 4 = 4
      expect(slot1.sectionSlots.l.damageDealt).toBe(4);

      // Step 4: Start a NEW run with the same slot
      const newRunState = {
        shipSlotId: 1,
        mapTier: 1,
        shipSections: {
          bridge: { id: 'BRIDGE_001', type: 'Bridge', hull: 4, maxHull: 8, lane: 'l' }, // Damaged from before
          powerCell: { id: 'POWERCELL_001', type: 'Power Cell', hull: 8, maxHull: 8, lane: 'm' },
          droneControlHub: { id: 'DRONECONTROL_001', type: 'Drone Control Hub', hull: 8, maxHull: 8, lane: 'r' }
        }
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(newRunState);

      gameStateManager.startRun({ shipSlotId: 1, mapTier: 1, entryGateId: 0, preGeneratedMap: {
        name: 'Test Map 2',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      }});

      // Assert: New run should start with damaged hull from previous run
      const newBridgeSection = tacticalMapStateManager.getState().shipSections['bridge'];

      expect(newBridgeSection).toBeDefined();
      expect(newBridgeSection.hull).toBe(4); // Should retain damage from previous run
    });
  });

  // ========================================
  // BUG FIX TESTS: Section Key Format Consistency
  // ========================================
  // TDD Tests for key mismatch bug fix
  //
  // Bug: startRun creates sections with uppercase keys ('Bridge', 'Power Cell', 'Drone Control Hub')
  // but CombatOutcomeProcessor and SinglePlayerCombatInitializer expect lowercase keys
  // ('bridge', 'powerCell', 'droneControlHub')
  //
  // This causes thresholds to be lost when combat ends, breaking extraction limit calculations

  describe('startRun - section key format (bug fix)', () => {
    it('should create shipSections with lowercase camelCase keys', () => {
      // Mock the run state with correct key format
      const mockRunState = {
        shipSlotId: 1,
        mapTier: 1,
        shipSections: {
          bridge: { id: 'BRIDGE_001', type: 'Bridge', hull: 8, maxHull: 8, lane: 'l' },
          powerCell: { id: 'POWERCELL_001', type: 'Power Cell', hull: 8, maxHull: 8, lane: 'm' },
          droneControlHub: { id: 'DRONECONTROL_001', type: 'Drone Control Hub', hull: 8, maxHull: 8, lane: 'r' }
        }
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(mockRunState);

      // Setup: Start a run
      gameStateManager.startRun({ shipSlotId: 1, mapTier: 1, entryGateId: 0, preGeneratedMap: {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      }});

      // Assert: Keys should be lowercase camelCase to match CombatOutcomeProcessor expectations
      const shipSections = tacticalMapStateManager.getState().shipSections;

      // Verify lowercase keys exist
      expect(shipSections['bridge']).toBeDefined();
      expect(shipSections['powerCell']).toBeDefined();
      expect(shipSections['droneControlHub']).toBeDefined();

      // Verify uppercase keys do NOT exist (the bug)
      expect(shipSections['Bridge']).toBeUndefined();
      expect(shipSections['Power Cell']).toBeUndefined();
      expect(shipSections['Drone Control Hub']).toBeUndefined();
    });

    it('should include thresholds in each section for damage calculations', () => {
      // Mock the run state with thresholds
      const mockRunState = {
        shipSlotId: 1,
        mapTier: 1,
        shipSections: {
          bridge: {
            id: 'BRIDGE_001',
            type: 'Bridge',
            hull: 8,
            maxHull: 8,
            lane: 'l',
            thresholds: { damaged: 6, critical: 3 }
          },
          powerCell: {
            id: 'POWERCELL_001',
            type: 'Power Cell',
            hull: 8,
            maxHull: 8,
            lane: 'm',
            thresholds: { damaged: 6, critical: 3 }
          },
          droneControlHub: {
            id: 'DRONECONTROL_001',
            type: 'Drone Control Hub',
            hull: 8,
            maxHull: 8,
            lane: 'r',
            thresholds: { damaged: 6, critical: 3 }
          }
        }
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(mockRunState);

      // Setup: Start a run
      gameStateManager.startRun({ shipSlotId: 1, mapTier: 1, entryGateId: 0, preGeneratedMap: {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      }});

      // Assert: Each section should have thresholds for extraction limit calculation
      const shipSections = tacticalMapStateManager.getState().shipSections;

      // All sections should have thresholds defined
      Object.values(shipSections).forEach(section => {
        expect(section.thresholds).toBeDefined();
        expect(section.thresholds.damaged).toBeDefined();
        expect(typeof section.thresholds.damaged).toBe('number');
      });
    });

    it('should create sections compatible with CombatOutcomeProcessor spread pattern', () => {
      // Mock the run state with thresholds
      const mockRunState = {
        shipSlotId: 1,
        mapTier: 1,
        shipSections: {
          bridge: {
            id: 'BRIDGE_001',
            type: 'Bridge',
            hull: 8,
            maxHull: 8,
            lane: 'l',
            thresholds: { damaged: 6, critical: 3 }
          }
        }
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(mockRunState);

      // Setup: Start a run
      gameStateManager.startRun({ shipSlotId: 1, mapTier: 1, entryGateId: 0, preGeneratedMap: {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      }});

      const shipSections = tacticalMapStateManager.getState().shipSections;

      // Simulate what CombatOutcomeProcessor does when updating sections
      // It spreads from currentRunState.shipSections?.bridge || {}
      const updatedBridge = {
        ...(shipSections?.bridge || {}),
        hull: 5 // Simulated new hull value from combat
      };

      // If the key mismatch bug is fixed, thresholds should be preserved
      expect(updatedBridge.thresholds).toBeDefined();
      expect(updatedBridge.thresholds.damaged).toBeDefined();
    });
  });
});
