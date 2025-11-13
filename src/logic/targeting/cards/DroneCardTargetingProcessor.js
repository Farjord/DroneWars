// ========================================
// DRONE CARD TARGETING PROCESSOR
// ========================================
// Handles DRONE_CARD targeting type - targeting drone cards for upgrades
// Used by upgrade cards to find valid drone cards that can receive the upgrade

import BaseTargetingProcessor from '../BaseTargetingProcessor.js';
import fullDroneCollection from '../../../data/droneData.js';

/**
 * DroneCardTargetingProcessor - Handles drone card targeting for upgrades
 *
 * Targeting Type: DRONE_CARD
 * Dependencies: fullDroneCollection, activeDronePool, appliedUpgrades
 * Risk Level: MODERATE
 *
 * Behavior:
 * - Returns drone cards from acting player's activeDronePool
 * - Checks if drone has available upgrade slots
 * - Checks if upgrade's maxApplications limit hasn't been reached
 * - Only targets friendly drone cards (acting player's pool)
 */
class DroneCardTargetingProcessor extends BaseTargetingProcessor {
  /**
   * Process DRONE_CARD targeting
   *
   * @param {Object} context - Targeting context
   * @param {string} context.actingPlayerId - Player performing targeting
   * @param {Object} context.player1 - Player 1 state
   * @param {Object} context.player2 - Player 2 state
   * @param {Object} context.definition - Upgrade card definition
   * @param {string} context.definition.id - Upgrade card ID
   * @param {number} context.definition.maxApplications - Max times this upgrade can be applied to same drone
   * @returns {Array} Array of valid drone card targets
   */
  process(context) {
    this.logProcessStart(context);

    const { actingPlayerId, definition } = context;
    const actingPlayerState = this.getActingPlayerState(context);
    const targets = [];

    // Process each drone card in acting player's drone pool
    actingPlayerState.activeDronePool.forEach(drone => {
      // Find the base drone to get upgrade slots
      const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
      if (!baseDrone) return; // Skip if base drone not found

      // Get upgrades already applied to this drone
      const applied = actingPlayerState.appliedUpgrades[drone.name] || [];

      // Check how many times THIS specific upgrade has been applied
      const alreadyHasThisUpgrade = applied.filter(upg => upg.id === definition.id).length;

      // Get max applications limit (defaults to 1 if not specified)
      const maxApps = definition.maxApplications === undefined ? 1 : definition.maxApplications;

      // Drone is valid if:
      // 1. It has available upgrade slots (applied.length < baseDrone.upgradeSlots)
      // 2. This upgrade hasn't been applied too many times (alreadyHasThisUpgrade < maxApps)
      if (applied.length < baseDrone.upgradeSlots && alreadyHasThisUpgrade < maxApps) {
        targets.push({
          ...drone,
          id: drone.name,
          owner: actingPlayerId
        });
      }
    });

    this.logProcessComplete(context, targets);
    return targets;
  }
}

export default DroneCardTargetingProcessor;
