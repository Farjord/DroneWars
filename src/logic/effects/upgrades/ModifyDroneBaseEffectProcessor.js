// ========================================
// MODIFY DRONE BASE EFFECT PROCESSOR
// ========================================
// Handles MODIFY_DRONE_BASE effect type
// Extracts upgrade logic from gameLogic.js resolveUpgradeEffect()
// Manages appliedUpgrades system for permanent drone enhancements
// Supports ability-granting upgrades
//
// NO ANIMATIONS: Upgrades are silent mechanical effects

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * Processor for MODIFY_DRONE_BASE effect type
 *
 * Applies permanent upgrades to drone base stats via appliedUpgrades system.
 * Unlike MODIFY_STAT which uses statMods array, these upgrades are stored
 * separately and can grant new abilities to drones.
 *
 * Supports:
 * - Permanent stat modifications (stored in appliedUpgrades, not statMods)
 * - Ability granting (add new abilities to upgraded drones)
 * - Instance ID tracking for removal via DESTROY_UPGRADE
 *
 * @extends BaseEffectProcessor
 */
class ModifyDroneBaseEffectProcessor extends BaseEffectProcessor {
  /**
   * Process MODIFY_DRONE_BASE effect
   *
   * @param {Object} effect - Effect definition { type: 'MODIFY_DRONE_BASE', mod: { stat, value, abilityToAdd? } }
   * @param {Object} effect.mod - Upgrade configuration
   * @param {string} effect.mod.stat - Stat to modify (or 'ability' for ability grants)
   * @param {number} effect.mod.value - Value to add (for stat upgrades)
   * @param {Object} effect.mod.abilityToAdd - Ability definition (for ability grants)
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player performing the action
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.target - Target drone (must have .name property)
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, target, card } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const actingPlayerState = newPlayerStates[actingPlayerId];
    const droneName = target.name;

    debugLog('EFFECT_PROCESSING', `[MODIFY_DRONE_BASE] ${actingPlayerId} applying upgrade to ${droneName}`, {
      mod: effect.mod,
      cardSlots: card?.slots,
      existingUpgrades: actingPlayerState.appliedUpgrades[droneName]?.length || 0
    });

    // Generate unique instance ID for this upgrade (needed for DESTROY_UPGRADE targeting)
    // Store card ID and slots for tracking and validation
    const newUpgrade = {
      instanceId: `upgrade-${Date.now()}-${Math.random()}`,
      cardId: card?.id,
      slots: card?.slots || 1,
      mod: effect.mod
    };

    // Handle ability-granting upgrades (e.g., add 'Overload' ability to a drone)
    if (effect.mod.stat === 'ability' && effect.mod.abilityToAdd) {
      newUpgrade.grantedAbilities = [effect.mod.abilityToAdd];
      debugLog('EFFECT_PROCESSING', `[MODIFY_DRONE_BASE] Granting ability to ${droneName}:`, effect.mod.abilityToAdd);
    }

    // Add upgrade to appliedUpgrades system (drone name as key)
    const existingUpgrades = actingPlayerState.appliedUpgrades[droneName] || [];
    actingPlayerState.appliedUpgrades = {
      ...actingPlayerState.appliedUpgrades,
      [droneName]: [...existingUpgrades, newUpgrade]
    };

    debugLog('EFFECT_PROCESSING', `[MODIFY_DRONE_BASE] ${droneName} now has ${existingUpgrades.length + 1} upgrades`);

    const result = {
      newPlayerStates,
      additionalEffects: [],
      animationEvents: [] // No animations for upgrades
    };

    this.logProcessComplete(effect, result, context);
    return result;
  }
}

export default ModifyDroneBaseEffectProcessor;
