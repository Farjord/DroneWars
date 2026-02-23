// ========================================
// MODIFY STAT EFFECT PROCESSOR
// ========================================
// Handles MODIFY_STAT effect type
// Extracts stat modification logic from gameLogic.js resolveModifyStatEffect()
// Supports SINGLE drone and LANE targeting
// Manages statMods array for temporary/permanent buffs
//
// NO ANIMATIONS: Stat modifications are silent mechanical effects

import BaseEffectProcessor from './BaseEffectProcessor.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * Processor for MODIFY_STAT effect type
 *
 * Applies temporary or permanent stat modifications to drones.
 * Supports:
 * - Single drone targeting (find drone in lanes and apply mod)
 * - Lane targeting (apply mod to all drones in a lane)
 * - Temporary mods (cleared at turn end)
 * - Permanent mods (persist until drone is destroyed)
 *
 * @extends BaseEffectProcessor
 */
class ModifyStatEffectProcessor extends BaseEffectProcessor {
  /**
   * Process MODIFY_STAT effect
   *
   * @param {Object} effect - Effect definition { type: 'MODIFY_STAT', mod: { stat, value, type } }
   * @param {Object} effect.mod - Stat modification configuration
   * @param {string} effect.mod.stat - Stat to modify (attack, health, shield, etc.)
   * @param {number} effect.mod.value - Value to add/subtract
   * @param {string} effect.mod.type - 'temporary' or 'permanent'
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player performing the action
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.target - Target of the effect (drone or lane)
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, target } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const targetPlayerState = newPlayerStates[target.owner || actingPlayerId];
    const mod = effect.mod;

    debugLog('EFFECT_PROCESSING', `[MODIFY_STAT] ${actingPlayerId} applying ${mod.value > 0 ? '+' : ''}${mod.value} ${mod.stat} (${mod.type || 'temporary'})`, {
      target: target.id,
      targetOwner: target.owner,
      stat: mod.stat,
      value: mod.value,
      type: mod.type || 'temporary'
    });

    // Check if target is a lane (e.g., 'lane1', 'lane2', 'lane3')
    if (target.id && typeof target.id === 'string' && target.id.startsWith('lane')) {
      // LANE scope: Apply stat modification to all drones in the target lane
      this.processLaneModification(target.id, targetPlayerState, mod);
    } else {
      // SINGLE scope: Apply to one specific drone
      this.processSingleModification(target.id, targetPlayerState, mod);
    }

    const result = {
      newPlayerStates,
      additionalEffects: [],
      animationEvents: [] // No animations for stat modifications
    };

    this.logProcessComplete(effect, result, context);
    return result;
  }

  /**
   * Apply stat modification to all drones in a lane
   *
   * @private
   * @param {string} laneId - Lane ID (lane1, lane2, lane3)
   * @param {Object} targetPlayerState - Player state to modify
   * @param {Object} mod - Stat modification { stat, value, type }
   */
  processLaneModification(laneId, targetPlayerState, mod) {
    if (targetPlayerState.dronesOnBoard[laneId]) {
      const dronesInLane = targetPlayerState.dronesOnBoard[laneId];

      debugLog('EFFECT_PROCESSING', `[MODIFY_STAT] Applying to ${dronesInLane.length} drones in ${laneId}`);

      dronesInLane.forEach(drone => {
        if (!drone.statMods) drone.statMods = [];

        drone.statMods.push({
          stat: mod.stat,
          value: mod.value,
          type: mod.type || 'temporary',
          source: 'card'
        });

        debugLog('EFFECT_PROCESSING', `[MODIFY_STAT] ${drone.name} received ${mod.value > 0 ? '+' : ''}${mod.value} ${mod.stat}`);
      });
    }
  }

  /**
   * Apply stat modification to a single drone
   *
   * @private
   * @param {string} droneId - Target drone ID
   * @param {Object} targetPlayerState - Player state to modify
   * @param {Object} mod - Stat modification { stat, value, type }
   */
  processSingleModification(droneId, targetPlayerState, mod) {
    // Find the drone in the player's lanes
    for (const lane in targetPlayerState.dronesOnBoard) {
      const droneIndex = targetPlayerState.dronesOnBoard[lane].findIndex(d => d.id === droneId);

      if (droneIndex !== -1) {
        const drone = targetPlayerState.dronesOnBoard[lane][droneIndex];

        if (!drone.statMods) drone.statMods = [];

        drone.statMods.push({
          stat: mod.stat,
          value: mod.value,
          type: mod.type || 'temporary',
          source: 'card'
        });

        debugLog('EFFECT_PROCESSING', `[MODIFY_STAT] ${drone.name} in ${lane} received ${mod.value > 0 ? '+' : ''}${mod.value} ${mod.stat}`);
        break;
      }
    }
  }
}

export default ModifyStatEffectProcessor;
