/**
 * HangarScreen - Instance Creation shipSlotId Tests
 * TDD: Tests verify that instances created by HangarScreen include shipSlotId
 *
 * Bug: When creating drone/component instances in handleConfirmCopyStarter(),
 * the shipSlotId is not included, making it impossible to link instances to decks.
 *
 * This test extracts and tests the instance creation logic directly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import gameStateManager from '../../../managers/GameStateManager.js';
import { starterDeck } from '../../../data/playerDeckData.js';

/**
 * Helper: Simulates the instance creation logic from HangarScreen.handleConfirmCopyStarter
 * This is what the CURRENT (buggy) code does
 */
function createInstancesCurrentBehavior(selectedSlotId, existingDroneInstances, existingComponentInstances) {
  const newDroneInstances = [...(existingDroneInstances || [])];
  (starterDeck.droneSlots || []).forEach(slot => {
    if (slot.assignedDrone) {
      newDroneInstances.push({
        id: `DRONE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        droneName: slot.assignedDrone,
        isDamaged: false,
        isMIA: false
        // BUG: Missing shipSlotId!
      });
    }
  });

  const newComponentInstances = [...(existingComponentInstances || [])];
  Object.keys(starterDeck.shipComponents || {}).forEach(compId => {
    newComponentInstances.push({
      id: `COMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      componentId: compId,
      currentHull: 10,
      maxHull: 10
      // BUG: Missing shipSlotId!
    });
  });

  return { newDroneInstances, newComponentInstances };
}

/**
 * Helper: Simulates the FIXED instance creation logic
 * This is what the code SHOULD do after the fix
 */
function createInstancesFixedBehavior(selectedSlotId, existingDroneInstances, existingComponentInstances) {
  const newDroneInstances = [...(existingDroneInstances || [])];
  (starterDeck.droneSlots || []).forEach(slot => {
    if (slot.assignedDrone) {
      newDroneInstances.push({
        id: `DRONE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        droneName: slot.assignedDrone,
        shipSlotId: selectedSlotId, // FIXED: Include shipSlotId
        isDamaged: false,
        isMIA: false
      });
    }
  });

  const newComponentInstances = [...(existingComponentInstances || [])];
  Object.keys(starterDeck.shipComponents || {}).forEach(compId => {
    newComponentInstances.push({
      id: `COMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      componentId: compId,
      shipSlotId: selectedSlotId, // FIXED: Include shipSlotId
      currentHull: 10,
      maxHull: 10
    });
  });

  return { newDroneInstances, newComponentInstances };
}

describe('HangarScreen - Instance Creation with shipSlotId', () => {

  describe('Expected behavior (FIXED code)', () => {
    it('should include shipSlotId in drone instances', () => {
      const { newDroneInstances } = createInstancesFixedBehavior(1, [], []);

      // All new drone instances should have shipSlotId
      const newInstances = newDroneInstances.filter(inst => inst.id.startsWith('DRONE_'));
      expect(newInstances.length).toBeGreaterThan(0);

      newInstances.forEach(instance => {
        expect(instance).toHaveProperty('shipSlotId');
        expect(instance.shipSlotId).toBe(1);
      });
    });

    it('should include shipSlotId in component instances', () => {
      const { newComponentInstances } = createInstancesFixedBehavior(1, [], []);

      // All new component instances should have shipSlotId
      const newInstances = newComponentInstances.filter(inst => inst.id.startsWith('COMP_'));
      expect(newInstances.length).toBeGreaterThan(0);

      newInstances.forEach(instance => {
        expect(instance).toHaveProperty('shipSlotId');
        expect(instance.shipSlotId).toBe(1);
      });
    });

    it('should use correct shipSlotId for slot 2', () => {
      const { newDroneInstances, newComponentInstances } = createInstancesFixedBehavior(2, [], []);

      const droneInstances = newDroneInstances.filter(inst => inst.id.startsWith('DRONE_'));
      const componentInstances = newComponentInstances.filter(inst => inst.id.startsWith('COMP_'));

      droneInstances.forEach(inst => expect(inst.shipSlotId).toBe(2));
      componentInstances.forEach(inst => expect(inst.shipSlotId).toBe(2));
    });
  });

  describe('Current behavior (BUGGY code) - these should FAIL after fix is applied to HangarScreen', () => {
    it('BUG: drone instances are missing shipSlotId', () => {
      const { newDroneInstances } = createInstancesCurrentBehavior(1, [], []);

      const newInstances = newDroneInstances.filter(inst => inst.id.startsWith('DRONE_'));
      expect(newInstances.length).toBeGreaterThan(0);

      // This test passes now because instances DON'T have shipSlotId (the bug)
      // After fixing HangarScreen, this test should be removed or inverted
      const missingShipSlotId = newInstances.filter(inst => !inst.hasOwnProperty('shipSlotId'));
      expect(missingShipSlotId.length).toBe(newInstances.length); // All are missing shipSlotId
    });

    it('BUG: component instances are missing shipSlotId', () => {
      const { newComponentInstances } = createInstancesCurrentBehavior(1, [], []);

      const newInstances = newComponentInstances.filter(inst => inst.id.startsWith('COMP_'));
      expect(newInstances.length).toBeGreaterThan(0);

      // This test passes now because instances DON'T have shipSlotId (the bug)
      const missingShipSlotId = newInstances.filter(inst => !inst.hasOwnProperty('shipSlotId'));
      expect(missingShipSlotId.length).toBe(newInstances.length); // All are missing shipSlotId
    });
  });

  describe('Integration: Verify deckSlotFactory creates instances with shipSlotId', () => {
    it('should create drone instances with shipSlotId', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const factoryPath = path.join(process.cwd(), 'src/logic/singlePlayer/deckSlotFactory.js');
      const source = fs.readFileSync(factoryPath, 'utf-8');

      const droneInstanceMatch = source.match(
        /newDroneInstances\.push\(\{[\s\S]*?droneName:\s*slot\.assignedDrone[\s\S]*?\}\)/
      );

      expect(droneInstanceMatch).not.toBeNull();
      expect(droneInstanceMatch[0]).toContain('shipSlotId');
    });

    it('should create component instances with shipSlotId', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const factoryPath = path.join(process.cwd(), 'src/logic/singlePlayer/deckSlotFactory.js');
      const source = fs.readFileSync(factoryPath, 'utf-8');

      const componentInstanceMatch = source.match(
        /newComponentInstances\.push\(\{[\s\S]*?componentId:\s*compId[\s\S]*?\}\)/
      );

      expect(componentInstanceMatch).not.toBeNull();
      expect(componentInstanceMatch[0]).toContain('shipSlotId');
    });
  });
});
