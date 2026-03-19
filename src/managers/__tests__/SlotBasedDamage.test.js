/**
 * Slot-Based Damage Model - Comprehensive Test Suite
 * TDD: All tests written first to define expected behavior
 *
 * This replaces instance-based damage tracking with slot-based damage:
 * - Ship sections: Lanes L/M/R store damageDealt (not currentHull)
 * - Drone slots: Positions 1-5 store assignedDrone (no damage tracking)
 * - Section damage stays with the slot, not the item
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import gameStateManager from '../GameStateManager.js';
import tacticalMapStateManager from '../TacticalMapStateManager.js';
import {
  calculateSectionHull,
  getDroneEffectiveLimit,
  calculateSectionRepairCost,
  validateShipSlot,
  buildActiveDronePool,
  getDroneHandOrder
} from '../../logic/combat/shipSlotUtils.js';
import { migrateShipSlotToNewFormat } from '../../logic/migration/saveGameMigrations.js';

// Mock the map generator
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

describe('Slot-Based Damage Model', () => {

  // ===========================================
  // DATA MODEL TESTS
  // ===========================================
  describe('Data Model: Ship Slot Structure', () => {

    describe('droneSlots array', () => {
      it('should have exactly 5 drone slots', () => {
        const shipSlot = createTestShipSlot(1);
        expect(shipSlot.droneSlots).toBeDefined();
        expect(shipSlot.droneSlots.length).toBe(5);
      });

      it('each drone slot should have slotIndex and assignedDrone properties', () => {
        const shipSlot = createTestShipSlot(1);
        shipSlot.droneSlots.forEach((slot, index) => {
          expect(slot).toHaveProperty('slotIndex');
          expect(slot).toHaveProperty('assignedDrone');
        });
      });

      it('should support null assignedDrone for empty slots', () => {
        const shipSlot = createTestShipSlot(1);
        shipSlot.droneSlots[2] = { slotIndex: 2, assignedDrone: null };
        expect(shipSlot.droneSlots[2].assignedDrone).toBeNull();
      });

      it('should preserve slot order after save/load', () => {
        const originalOrder = ['Dart', 'Mammoth', 'Seraph', null, 'Devastator'];
        const shipSlot = createTestShipSlotWithDrones(1, originalOrder);

        gameStateManager.setState({
          singlePlayerShipSlots: [shipSlot]
        });

        const loaded = gameStateManager.getState().singlePlayerShipSlots[0];
        loaded.droneSlots.forEach((slot, i) => {
          expect(slot.assignedDrone).toBe(originalOrder[i]);
        });
      });
    });

    describe('sectionSlots object', () => {
      it('should have l, m, r lane keys', () => {
        const shipSlot = createTestShipSlot(1);
        expect(shipSlot.sectionSlots).toHaveProperty('l');
        expect(shipSlot.sectionSlots).toHaveProperty('m');
        expect(shipSlot.sectionSlots).toHaveProperty('r');
      });

      it('each section slot should have componentId and damageDealt', () => {
        const shipSlot = createTestShipSlot(1);
        ['l', 'm', 'r'].forEach(lane => {
          expect(shipSlot.sectionSlots[lane]).toHaveProperty('componentId');
          expect(shipSlot.sectionSlots[lane]).toHaveProperty('damageDealt');
          expect(typeof shipSlot.sectionSlots[lane].damageDealt).toBe('number');
        });
      });

      it('damageDealt should be non-negative', () => {
        const shipSlot = createTestShipSlot(1);
        ['l', 'm', 'r'].forEach(lane => {
          expect(shipSlot.sectionSlots[lane].damageDealt).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  // ===========================================
  // HULL CALCULATION TESTS
  // ===========================================
  describe('Hull Calculation', () => {

    it('should calculate currentHull as maxHull - damageDealt', () => {
      const shipBaseline = 10;
      const componentModifier = 2;
      const damageDealt = 3;

      const maxHull = shipBaseline + componentModifier; // 12
      const currentHull = maxHull - damageDealt; // 9

      expect(currentHull).toBe(9);
    });

    it('should use ship card baseline hull per lane', () => {
      // Assuming Corvette has baseline 10/10/10 for L/M/R
      const shipSlot = createTestShipSlotWithDamage(1, {
        l: { componentId: 'BRIDGE_001', damageDealt: 3 },
        m: { componentId: 'POWERCELL_001', damageDealt: 0 },
        r: { componentId: 'DRONECONTROL_001', damageDealt: 5 }
      });

      // This test expects a calculateSectionHull helper function
      const leftHull = calculateSectionHull(shipSlot, 'l');
      const midHull = calculateSectionHull(shipSlot, 'm');
      const rightHull = calculateSectionHull(shipSlot, 'r');

      // SHIP_001 has baseHull = 10, standard components have hullModifier = 0
      expect(leftHull.current).toBe(7);  // 10 - 3
      expect(leftHull.max).toBe(10);
      expect(midHull.current).toBe(10);  // 10 - 0
      expect(rightHull.current).toBe(5);  // 10 - 5
    });

    it('should apply component hull modifiers', () => {
      // If a component adds +2 hull modifier
      const shipSlot = createTestShipSlotWithDamage(1, {
        l: { componentId: 'BRIDGE_HEAVY', damageDealt: 3 } // +2 modifier
      });

      const hull = calculateSectionHull(shipSlot, 'l');
      // SHIP_001 has baseHull = 10, BRIDGE_HEAVY has hullModifier = 2
      expect(hull.max).toBe(12);    // 10 baseline + 2 modifier
      expect(hull.current).toBe(9); // 12 - 3
    });

    it('should clamp currentHull to minimum 0', () => {
      const shipSlot = createTestShipSlotWithDamage(1, {
        l: { componentId: 'BRIDGE_001', damageDealt: 15 } // More damage than hull
      });

      const hull = calculateSectionHull(shipSlot, 'l');
      expect(hull.current).toBe(0); // Should not go negative
    });
  });

  // ===========================================
  // DRONE SLOT EFFECTIVE LIMIT TESTS
  // ===========================================
  describe('Drone Slot Effective Limit', () => {

    it('should return base limit for occupied slot', () => {
      // Dart normally has limit: 3
      const shipSlot = createTestShipSlotWithDrones(1, ['Dart']);

      const effectiveLimit = getDroneEffectiveLimit(shipSlot, 0);
      expect(effectiveLimit).toBe(3); // Base limit, no damage penalty
    });

    it('should return base limit for any occupied slot', () => {
      // Mammoth has limit: 1
      const shipSlot = createTestShipSlotWithDrones(1, ['Mammoth']);

      const effectiveLimit = getDroneEffectiveLimit(shipSlot, 0);
      expect(effectiveLimit).toBe(1); // Base limit
    });

    it('should return 0 for empty slots', () => {
      const shipSlot = createTestShipSlotWithDrones(1, [null]);

      const effectiveLimit = getDroneEffectiveLimit(shipSlot, 0);
      expect(effectiveLimit).toBe(0); // No drone = 0 limit
    });
  });

  // ===========================================
  // REPAIR COST TESTS
  // ===========================================
  describe('Repair Costs', () => {

    it('should calculate section repair as cost per damage point', () => {
      const damageDealt = 3;
      const cost = calculateSectionRepairCost(damageDealt);
      expect(cost).toBe(600); // 3 * 200 (SECTION_DAMAGE_REPAIR_COST)
    });

    it('should return 0 for undamaged section', () => {
      const cost = calculateSectionRepairCost(0);
      expect(cost).toBe(0);
    });
  });

  // ===========================================
  // REPAIR ACTIONS TESTS
  // ===========================================
  describe('Repair Actions', () => {

    beforeEach(() => {
      gameStateManager.setState({
        singlePlayerShipSlots: [createTestShipSlot(1)],
        singlePlayerProfile: { credits: 1000 }
      });
    });

    it('should repair damaged section slot', () => {
      const shipSlot = gameStateManager.getState().singlePlayerShipSlots[0];
      shipSlot.sectionSlots.l.damageDealt = 5;

      gameStateManager.repairSectionSlot(1, 'l');

      const updated = gameStateManager.getState().singlePlayerShipSlots[0];
      expect(updated.sectionSlots.l.damageDealt).toBe(0);
    });

    it('should deduct credits for section repair based on damage', () => {
      const shipSlot = gameStateManager.getState().singlePlayerShipSlots[0];
      shipSlot.sectionSlots.l.damageDealt = 5;
      const initialCredits = gameStateManager.getState().singlePlayerProfile.credits;

      gameStateManager.repairSectionSlot(1, 'l');

      const finalCredits = gameStateManager.getState().singlePlayerProfile.credits;
      expect(finalCredits).toBe(initialCredits - 1000); // 5 * 200 (SECTION_DAMAGE_REPAIR_COST)
    });

    // Partial Section Repair Tests
    describe('Partial Section Repair', () => {

      it('should repair section slot partially (1 HP)', () => {
        const shipSlot = gameStateManager.getState().singlePlayerShipSlots[0];
        shipSlot.sectionSlots.l.damageDealt = 5;

        gameStateManager.repairSectionSlotPartial(1, 'l', 1);

        const updated = gameStateManager.getState().singlePlayerShipSlots[0];
        expect(updated.sectionSlots.l.damageDealt).toBe(4); // 5 - 1 = 4
      });

      it('should deduct correct credits for partial repair (1 HP = 200 credits)', () => {
        const shipSlot = gameStateManager.getState().singlePlayerShipSlots[0];
        shipSlot.sectionSlots.l.damageDealt = 5;
        const initialCredits = gameStateManager.getState().singlePlayerProfile.credits;

        gameStateManager.repairSectionSlotPartial(1, 'l', 1);

        const finalCredits = gameStateManager.getState().singlePlayerProfile.credits;
        expect(finalCredits).toBe(initialCredits - 200); // 1 * 200 (SECTION_DAMAGE_REPAIR_COST)
      });

      it('should cap partial repair to remaining damage', () => {
        const shipSlot = gameStateManager.getState().singlePlayerShipSlots[0];
        shipSlot.sectionSlots.l.damageDealt = 2;

        const result = gameStateManager.repairSectionSlotPartial(1, 'l', 5); // Request 5, only 2 damage

        const updated = gameStateManager.getState().singlePlayerShipSlots[0];
        expect(updated.sectionSlots.l.damageDealt).toBe(0);
        expect(result.repairedHP).toBe(2); // Only repaired 2
        expect(result.cost).toBe(400); // 2 * 200
      });

      it('should return remaining damage in partial repair result', () => {
        const shipSlot = gameStateManager.getState().singlePlayerShipSlots[0];
        shipSlot.sectionSlots.l.damageDealt = 5;

        const result = gameStateManager.repairSectionSlotPartial(1, 'l', 2);

        expect(result.success).toBe(true);
        expect(result.remainingDamage).toBe(3); // 5 - 2 = 3
        expect(result.repairedHP).toBe(2);
        expect(result.cost).toBe(400); // 2 * 200
      });

      it('should fail partial repair if insufficient credits', () => {
        gameStateManager.setState({
          singlePlayerProfile: { credits: 100 } // Not enough for 1 HP (200)
        });

        const shipSlot = gameStateManager.getState().singlePlayerShipSlots[0];
        shipSlot.sectionSlots.l.damageDealt = 5;

        const result = gameStateManager.repairSectionSlotPartial(1, 'l', 1);

        expect(result.success).toBe(false);
        expect(result.reason.toLowerCase()).toContain('insufficient');
      });

      it('should default to repairing 1 HP if hpToRepair not specified', () => {
        const shipSlot = gameStateManager.getState().singlePlayerShipSlots[0];
        shipSlot.sectionSlots.l.damageDealt = 5;

        gameStateManager.repairSectionSlotPartial(1, 'l'); // No hpToRepair specified

        const updated = gameStateManager.getState().singlePlayerShipSlots[0];
        expect(updated.sectionSlots.l.damageDealt).toBe(4); // 5 - 1 = 4
      });

      it('should reject partial repair on slot 0 (starter deck)', () => {
        const result = gameStateManager.repairSectionSlotPartial(0, 'l', 1);

        expect(result.success).toBe(false);
        expect(result.reason).toContain('Slot 0');
      });

      it('should reject partial repair if section is not damaged', () => {
        const shipSlot = gameStateManager.getState().singlePlayerShipSlots[0];
        shipSlot.sectionSlots.l.damageDealt = 0;

        const result = gameStateManager.repairSectionSlotPartial(1, 'l', 1);

        expect(result.success).toBe(false);
        expect(result.reason.toLowerCase()).toContain('not damaged');
      });
    });
  });

  // ===========================================
  // VALIDATION STATES TESTS
  // ===========================================
  describe('Validation States', () => {

    it('should be VALID when all slots filled and ship has hull', () => {
      const shipSlot = createCompleteShipSlot(1);
      const validation = validateShipSlot(shipSlot);

      expect(validation.isValid).toBe(true);
      expect(validation.isIncomplete).toBe(false);
      expect(validation.isUndeployable).toBe(false);
    });

    it('should be INCOMPLETE when drone slot is empty', () => {
      const shipSlot = createTestShipSlotWithDrones(1, ['Dart', null, null, null, null]);
      const validation = validateShipSlot(shipSlot);

      expect(validation.isIncomplete).toBe(true);
    });

    it('should be INCOMPLETE when section slot is empty', () => {
      const shipSlot = createTestShipSlot(1);
      shipSlot.sectionSlots.l.componentId = null;
      const validation = validateShipSlot(shipSlot);

      expect(validation.isIncomplete).toBe(true);
    });

    it('should be UNDEPLOYABLE when ALL sections have 0 hull', () => {
      const shipSlot = createTestShipSlotWithDamage(1, {
        l: { componentId: 'BRIDGE_001', damageDealt: 10 },
        m: { componentId: 'POWERCELL_001', damageDealt: 10 },
        r: { componentId: 'DRONECONTROL_001', damageDealt: 10 }
      });
      const validation = validateShipSlot(shipSlot);

      expect(validation.isUndeployable).toBe(true);
    });

    it('should NOT be undeployable if at least one section has hull', () => {
      const shipSlot = createTestShipSlotWithDamage(1, {
        l: { componentId: 'BRIDGE_001', damageDealt: 10 },  // Destroyed
        m: { componentId: 'POWERCELL_001', damageDealt: 10 }, // Destroyed
        r: { componentId: 'DRONECONTROL_001', damageDealt: 5 } // 5 HP remaining
      });
      const validation = validateShipSlot(shipSlot);

      expect(validation.isUndeployable).toBe(false);
    });
  });

  // ===========================================
  // MIGRATION TESTS
  // ===========================================
  describe('Migration from Old Format', () => {

    it('should migrate drones array to droneSlots', () => {
      const oldFormat = {
        drones: [
          { name: 'Dart' },
          { name: 'Mammoth' }
        ]
      };

      const migrated = migrateShipSlotToNewFormat(oldFormat);

      expect(migrated.droneSlots).toBeDefined();
      expect(migrated.droneSlots.length).toBe(5);
      expect(migrated.droneSlots[0].assignedDrone).toBe('Dart');
      expect(migrated.droneSlots[1].assignedDrone).toBe('Mammoth');
      expect(migrated.droneSlots[2].assignedDrone).toBeNull(); // Padded
    });

    it('should migrate shipComponents to sectionSlots', () => {
      const oldFormat = {
        shipComponents: {
          'BRIDGE_001': 'l',
          'POWERCELL_001': 'm',
          'DRONECONTROL_001': 'r'
        }
      };

      const migrated = migrateShipSlotToNewFormat(oldFormat);

      expect(migrated.sectionSlots).toBeDefined();
      expect(migrated.sectionSlots.l.componentId).toBe('BRIDGE_001');
      expect(migrated.sectionSlots.l.damageDealt).toBe(0);
      expect(migrated.sectionSlots.m.componentId).toBe('POWERCELL_001');
      expect(migrated.sectionSlots.r.componentId).toBe('DRONECONTROL_001');
    });

    it('should handle missing drones gracefully', () => {
      const oldFormat = { drones: [] };
      const migrated = migrateShipSlotToNewFormat(oldFormat);

      expect(migrated.droneSlots.length).toBe(5);
      migrated.droneSlots.forEach(slot => {
        expect(slot.assignedDrone).toBeNull();
      });
    });
  });

  // ===========================================
  // COMBAT INITIALIZATION TESTS
  // ===========================================
  describe('Combat Initialization', () => {

    it('should load section hull from sectionSlots.damageDealt', () => {
      const shipSlot = createTestShipSlotWithDamage(1, {
        l: { componentId: 'BRIDGE_001', damageDealt: 3 },
        m: { componentId: 'POWERCELL_001', damageDealt: 0 },
        r: { componentId: 'DRONECONTROL_001', damageDealt: 7 }
      });

      gameStateManager.setState({
        singlePlayerShipSlots: [shipSlot]
      });

      // Start a run with this slot
      gameStateManager.startRun({ shipSlotId: 1, mapTier: 1, entryGateId: 0, preGeneratedMap: {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      }});

      const runState = tacticalMapStateManager.getState();
      // SHIP_001 has baseHull = 10, standard components have hullModifier = 0
      // Keys use lowercase camelCase: 'bridge', 'powerCell', 'droneControlHub'
      expect(runState.shipSections['bridge'].hull).toBe(7);  // 10 - 3
      expect(runState.shipSections['powerCell'].hull).toBe(10); // 10 - 0
      expect(runState.shipSections['droneControlHub'].hull).toBe(3); // 10 - 7
    });

    it('should use base limit for drones in all slots', () => {
      const shipSlot = createTestShipSlotWithDrones(1, ['Dart']); // limit: 3

      gameStateManager.setState({
        singlePlayerShipSlots: [shipSlot]
      });

      // Build player state should use base limit (no damage penalty)
      const activeDronePool = buildActiveDronePool(shipSlot);

      expect(activeDronePool[0].name).toBe('Dart');
      expect(activeDronePool[0].effectiveLimit).toBe(3); // Base limit
    });

    it('should preserve drone slot order in activeDronePool', () => {
      const droneOrder = ['Devastator', 'Dart', 'Mammoth', 'Seraph', 'Bastion'];
      const shipSlot = createTestShipSlotWithDrones(1, droneOrder);

      const activeDronePool = buildActiveDronePool(shipSlot);

      droneOrder.forEach((name, i) => {
        expect(activeDronePool[i].name).toBe(name);
      });
    });
  });

  // ===========================================
  // END RUN DAMAGE PERSISTENCE TESTS
  // ===========================================
  describe('End Run - Damage Persistence', () => {

    beforeEach(() => {
      const shipSlot = createCompleteShipSlot(1);
      gameStateManager.setState({
        singlePlayerShipSlots: [shipSlot],
        singlePlayerProfile: {
          credits: 100,
          stats: { runsCompleted: 0, runsLost: 0, totalCreditsEarned: 0, highestTierCompleted: 0 },
          unlockedBlueprints: []
        }
      });
    });

    it('should persist section damage to sectionSlots.damageDealt', () => {
      gameStateManager.startRun({ shipSlotId: 1, mapTier: 1, entryGateId: 0, preGeneratedMap: {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      }});

      // Simulate combat damage (keys are lowercase camelCase)
      const runState = tacticalMapStateManager.getState();
      runState.shipSections['bridge'].hull = 4; // Took 6 damage
      tacticalMapStateManager.setState({ shipSections: runState.shipSections });

      // End run successfully
      gameStateManager.endRun(true);

      // Check damage persisted
      const shipSlot = gameStateManager.getState().singlePlayerShipSlots[0];
      // SHIP_001 has baseHull = 10, hull was set to 4, so damageDealt = 10 - 4 = 6
      expect(shipSlot.sectionSlots.l.damageDealt).toBe(6);
    });

    it('should NOT persist damage for slot 0 (starter deck)', () => {
      const starterSlot = createCompleteShipSlot(0);
      starterSlot.isImmutable = true;
      gameStateManager.setState({
        singlePlayerShipSlots: [starterSlot]
      });

      gameStateManager.startRun({ shipSlotId: 0, mapTier: 1, entryGateId: 0, preGeneratedMap: {
        name: 'Test Map',
        hexes: [{ q: 0, r: 0 }],
        gates: [{ q: 0, r: 0 }],
        poiCount: 1,
        gateCount: 1
      }});

      // Simulate damage (keys are lowercase camelCase)
      const runState = tacticalMapStateManager.getState();
      runState.shipSections['bridge'].hull = 4;
      tacticalMapStateManager.setState({ shipSections: runState.shipSections });

      gameStateManager.endRun(true);

      // Slot 0 should NOT have damage persisted
      const slot0 = gameStateManager.getState().singlePlayerShipSlots[0];
      expect(slot0.sectionSlots.l.damageDealt).toBe(0);
    });
  });

  // ===========================================
  // DRONE HAND ORDERING TESTS
  // ===========================================
  describe('Drone Hand Ordering', () => {

    it('should display drones in slot order 1-5', () => {
      const droneOrder = ['Dart', 'Devastator', 'Mammoth', 'Seraph', 'Bastion'];
      const shipSlot = createTestShipSlotWithDrones(1, droneOrder);

      const droneHand = getDroneHandOrder(shipSlot);

      expect(droneHand.map(d => d.name)).toEqual(droneOrder);
    });

    it('should skip empty slots in drone hand', () => {
      const shipSlot = createTestShipSlotWithDrones(1, ['Dart', null, 'Mammoth', null, 'Devastator']);

      const droneHand = getDroneHandOrder(shipSlot);

      expect(droneHand.length).toBe(3);
      expect(droneHand.map(d => d.name)).toEqual(['Dart', 'Mammoth', 'Devastator']);
    });
  });
});

// ===========================================
// HELPER FUNCTIONS (to be implemented)
// ===========================================

function createTestShipSlot(slotId) {
  return {
    id: slotId,
    name: `Test Ship Slot ${slotId}`,
    status: 'active',
    isImmutable: slotId === 0,
    shipId: 'SHIP_001',
    decklist: [],
    droneSlots: [
      { slotIndex: 0, assignedDrone: 'Dart' },
      { slotIndex: 1, assignedDrone: 'Talon' },
      { slotIndex: 2, assignedDrone: 'Mammoth' },
      { slotIndex: 3, assignedDrone: 'Seraph' },
      { slotIndex: 4, assignedDrone: 'Devastator' }
    ],
    sectionSlots: {
      l: { componentId: 'BRIDGE_001', damageDealt: 0 },
      m: { componentId: 'POWERCELL_001', damageDealt: 0 },
      r: { componentId: 'DRONECONTROL_001', damageDealt: 0 }
    }
  };
}

function createTestShipSlotWithDrones(slotId, droneNames) {
  const slot = createTestShipSlot(slotId);
  slot.droneSlots = droneNames.map((name, i) => ({
    slotIndex: i,
    assignedDrone: name
  }));
  // Pad to 5 slots if needed
  while (slot.droneSlots.length < 5) {
    const idx = slot.droneSlots.length;
    slot.droneSlots.push({ slotIndex: idx, assignedDrone: null });
  }
  return slot;
}

function createTestShipSlotWithDamage(slotId, sectionSlots) {
  const slot = createTestShipSlot(slotId);
  slot.sectionSlots = {
    l: sectionSlots.l || { componentId: 'BRIDGE_001', damageDealt: 0 },
    m: sectionSlots.m || { componentId: 'POWERCELL_001', damageDealt: 0 },
    r: sectionSlots.r || { componentId: 'DRONECONTROL_001', damageDealt: 0 }
  };
  return slot;
}

function createCompleteShipSlot(slotId) {
  return createTestShipSlot(slotId);
}
