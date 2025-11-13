// ========================================
// DESTROY UPGRADE EFFECT PROCESSOR
// ========================================
// Handles DESTROY_UPGRADE effect type
// Extracts upgrade removal logic from gameLogic.js resolveDestroyUpgradeEffect()
// Removes upgrades from opponent's drones by instance ID
//
// NO ANIMATIONS: Upgrade removal is a silent mechanical effect

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * Processor for DESTROY_UPGRADE effect type
 *
 * Removes a specific upgrade from an opponent's drone using instance ID.
 * Works with the appliedUpgrades system managed by MODIFY_DRONE_BASE.
 *
 * Supports:
 * - Instance ID targeting (removes specific upgrade, not just any upgrade)
 * - Opponent drone targeting (can only remove opponent's upgrades)
 * - Empty entry cleanup (removes drone entry if no upgrades remain)
 *
 * @extends BaseEffectProcessor
 */
class DestroyUpgradeEffectProcessor extends BaseEffectProcessor {
  /**
   * Process DESTROY_UPGRADE effect
   *
   * @param {Object} effect - Effect definition { type: 'DESTROY_UPGRADE' }
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player performing the action
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.target - Target { droneName, instanceId }
   * @param {string} context.target.droneName - Name of drone with upgrade to remove
   * @param {string} context.target.instanceId - Specific upgrade instance to remove
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, target } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const opponentPlayerId = actingPlayerId === 'player1' ? 'player2' : 'player1';
    const opponentState = newPlayerStates[opponentPlayerId];

    const { droneName, instanceId } = target;

    debugLog('EFFECT_PROCESSING', `[DESTROY_UPGRADE] ${actingPlayerId} removing upgrade from ${opponentPlayerId}'s ${droneName}`, {
      instanceId,
      existingUpgrades: opponentState.appliedUpgrades[droneName]?.length || 0
    });

    // Check if opponent has upgrades for this drone
    if (opponentState.appliedUpgrades[droneName]) {
      // Filter out the targeted upgrade by instance ID
      const newUpgradesForDrone = opponentState.appliedUpgrades[droneName].filter(
        upg => upg.instanceId !== instanceId
      );

      if (newUpgradesForDrone.length > 0) {
        // Drone still has other upgrades - update the array
        opponentState.appliedUpgrades[droneName] = newUpgradesForDrone;
        debugLog('EFFECT_PROCESSING', `[DESTROY_UPGRADE] ${droneName} has ${newUpgradesForDrone.length} upgrades remaining`);
      } else {
        // No upgrades left - clean up the entry
        delete opponentState.appliedUpgrades[droneName];
        debugLog('EFFECT_PROCESSING', `[DESTROY_UPGRADE] ${droneName} has no upgrades remaining - entry removed`);
      }
    } else {
      debugLog('EFFECT_PROCESSING', `[DESTROY_UPGRADE] ${droneName} had no upgrades to remove`);
    }

    const result = {
      newPlayerStates,
      additionalEffects: [],
      animationEvents: [] // No animations for upgrade removal
    };

    this.logProcessComplete(effect, result, context);
    return result;
  }
}

export default DestroyUpgradeEffectProcessor;
