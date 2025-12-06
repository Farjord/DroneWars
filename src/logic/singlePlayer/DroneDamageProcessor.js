// ========================================
// DRONE DAMAGE PROCESSOR
// ========================================
// Handles drone damage protocol on extraction
// If hull < 50%, one random operational drone is damaged
// For Slots 1-5: Damage persists to instances
// For Slot 0: No persistence (always fresh)

import { debugLog } from '../../utils/debugLogger.js';
import gameStateManager from '../../managers/GameStateManager.js';
import SeededRandom from '../../utils/seededRandom.js';

/**
 * DroneDamageProcessor - Processes drone damage on extraction
 *
 * Trigger: Hull < 50% at extraction
 * Effect: One random operational drone marked as damaged
 * Consequence: Damaged drones cannot deploy until repaired
 *
 * Damage Persistence:
 * - Slot 0: No persistence (starter deck always fresh)
 * - Slots 1-5: Damage persists to instances
 */
class DroneDamageProcessor {
  /**
   * Process drone damage based on hull percentage
   * @param {Object} shipSlot - Ship slot with drones array
   * @param {Object} currentRunState - Run state with currentHull, maxHull, and shipSlotId
   * @returns {Array} Names of damaged drones (empty if none)
   */
  process(shipSlot, currentRunState) {
    const { currentHull, maxHull, shipSlotId } = currentRunState;
    const hullPercent = maxHull > 0 ? (currentHull / maxHull) * 100 : 100;

    debugLog('EXTRACTION', 'Drone damage check', {
      currentHull,
      maxHull,
      hullPercent: hullPercent.toFixed(1),
      shipSlotId
    });

    // No damage if hull >= 50%
    if (hullPercent >= 50) {
      debugLog('EXTRACTION', 'Hull above 50% - no drone damage');
      return [];
    }

    // Find operational (non-damaged) drones
    const drones = shipSlot.drones || [];
    const operationalDrones = drones.filter(d => !d.isDamaged);

    if (operationalDrones.length === 0) {
      debugLog('EXTRACTION', 'No operational drones to damage');
      return [];
    }

    // Damage one random operational drone using seeded RNG
    const gameState = gameStateManager.getState();
    const rng = SeededRandom.fromGameState(gameState || {});
    const droneToDAMAGE = rng.select(operationalDrones);

    // Find and update the drone in the original array (for display)
    const originalDrone = drones.find(d => d.id === droneToDAMAGE.id || d.name === droneToDAMAGE.name);
    if (originalDrone) {
      originalDrone.isDamaged = true;
    }

    // For Slots 1-5: Persist damage to instance
    // Slot 0 (starter deck): No persistence - always fresh
    if (shipSlotId !== 0) {
      const instance = gameStateManager.findDroneInstance(shipSlotId, droneToDAMAGE.name);
      if (instance) {
        gameStateManager.updateDroneInstance(instance.instanceId, true);
        debugLog('EXTRACTION', `Drone instance ${instance.instanceId} marked as damaged`);
      } else {
        debugLog('EXTRACTION', `No instance found for ${droneToDAMAGE.name} in slot ${shipSlotId}`);
      }
    } else {
      debugLog('EXTRACTION', 'Slot 0 - damage not persisted (starter deck always fresh)');
    }

    debugLog('EXTRACTION', `Drone damaged: ${droneToDAMAGE.name}`, {
      hullPercent: hullPercent.toFixed(1),
      droneName: droneToDAMAGE.name,
      persisted: shipSlotId !== 0
    });

    return [droneToDAMAGE.name];
  }

  /**
   * Get repair cost for a drone based on rarity
   * @param {string} rarity - Drone rarity (Common, Uncommon, Rare, Mythic)
   * @returns {number} Repair cost in credits
   */
  getRepairCost(rarity) {
    const costs = {
      Common: 50,
      Uncommon: 100,
      Rare: 200,
      Mythic: 500
    };
    return costs[rarity] || costs.Common;
  }
}

// Export singleton instance
export default new DroneDamageProcessor();
