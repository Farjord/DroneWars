// ========================================
// HULL HEAL EFFECT PROCESSOR
// ========================================
// Handles HEAL_HULL effect type
// Extracts heal logic from gameLogic.js resolveUnifiedHealEffect()
// Supports both single target and LANE scope healing
//

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';
import fullDroneCollection from '../../../data/droneData.js';
import { getLaneOfDrone } from '../../utils/gameEngineUtils.js';
import { buildHealAnimation } from './animations/HealAnimation.js';

/**
 * Processor for HEAL_HULL effect type
 *
 * Restores hull points to drones or ship sections up to their maximum hull.
 * Supports:
 * - Single drone targeting
 * - Single ship section targeting
 * - LANE scope (heals all drones in a lane)
 *
 * @extends BaseEffectProcessor
 */
class HullHealProcessor extends BaseEffectProcessor {
  /**
   * Process HEAL_HULL effect
   *
   * @param {Object} effect - Effect definition { type: 'HEAL_HULL', value, scope? }
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player performing the action
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.placedSections - Placed ship sections
   * @param {Object} context.target - Target of the effect (drone, ship section, or lane)
   * @param {Object} context.card - Source card (for animation)
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, placedSections, target, card } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const animationEvents = [];
    const targetPlayerId = actingPlayerId || 'player1';

    // LANE scope: Heal all drones in the target lane
    if (effect.scope === 'LANE') {
      this.processLaneHeal(
        effect,
        target,
        targetPlayerId,
        newPlayerStates,
        animationEvents,
        card
      );
    } else {
      // Single target: Drone or ship section
      this.processSingleTargetHeal(
        effect,
        target,
        targetPlayerId,
        newPlayerStates,
        placedSections,
        animationEvents,
        card
      );
    }

    const result = this.createResult(newPlayerStates, animationEvents);
    this.logProcessComplete(effect, result, context);
    return result;
  }

  /**
   * Process LANE scope healing (heals all drones in lane)
   *
   * @private
   */
  processLaneHeal(effect, target, targetPlayerId, newPlayerStates, animationEvents, card) {
    const targetLaneId = target.id;
    const targetPlayerState = newPlayerStates[targetPlayerId];

    if (!targetPlayerState.dronesOnBoard[targetLaneId]) {
      return; // Lane doesn't exist or is empty
    }

    targetPlayerState.dronesOnBoard[targetLaneId].forEach(droneInLane => {
      const baseDrone = fullDroneCollection.find(d => d.name === droneInLane.name);
      if (!baseDrone) return;

      // Apply healing if drone is damaged
      if (droneInLane.hull < baseDrone.hull) {
        droneInLane.hull = Math.min(baseDrone.hull, droneInLane.hull + effect.value);
      }

      // Build heal animation using animation builder
      const healAnimation = buildHealAnimation({
        target: droneInLane,
        healAmount: effect.value,
        targetPlayer: targetPlayerId,
        targetLane: targetLaneId,
        targetType: 'drone',
        card
      });
      animationEvents.push(...healAnimation);
    });
  }

  /**
   * Process single target healing (drone or ship section)
   *
   * @private
   */
  processSingleTargetHeal(effect, target, targetPlayerId, newPlayerStates, placedSections, animationEvents, card) {
    const targetPlayerState = newPlayerStates[targetPlayerId];

    debugLog('EFFECT_PROCESSING', '[HEAL_HULL] processSingleTargetHeal called', {
      targetName: target.name,
      targetId: target.id,
      targetPlayerId,
      hasShipSections: !!targetPlayerState.shipSections
    });

    // Check if target is a drone
    const baseDrone = fullDroneCollection.find(d => d.name === target.name);

    if (baseDrone) {
      debugLog('EFFECT_PROCESSING', '[HEAL_HULL] Target identified as drone', { droneName: baseDrone.name });
      // Heal drone
      this.healDrone(
        effect,
        target,
        baseDrone,
        targetPlayerId,
        targetPlayerState,
        animationEvents,
        card
      );
    } else if (target.name && targetPlayerState.shipSections[target.name]) {
      debugLog('EFFECT_PROCESSING', '[HEAL_HULL] Target identified as ship section', { sectionName: target.name });
      // Heal ship section
      this.healShipSection(
        effect,
        target,
        targetPlayerId,
        targetPlayerState,
        placedSections,
        animationEvents
      );
    } else {
      debugLog('EFFECT_PROCESSING', '[HEAL_HULL] ⚠️ Target not recognized as drone or ship section', {
        targetName: target.name,
        isBaseDrone: !!baseDrone,
        hasShipSection: !!(target.name && targetPlayerState.shipSections[target.name]),
        availableSections: Object.keys(targetPlayerState.shipSections || {})
      });
    }
  }

  /**
   * Heal a specific drone
   *
   * @private
   */
  healDrone(effect, target, baseDrone, targetPlayerId, targetPlayerState, animationEvents, card) {
    const targetLaneId = getLaneOfDrone(target.id, targetPlayerState);
    if (!targetLaneId) return;

    const droneIndex = targetPlayerState.dronesOnBoard[targetLaneId].findIndex(d => d.id === target.id);
    if (droneIndex === -1) return;

    const drone = targetPlayerState.dronesOnBoard[targetLaneId][droneIndex];

    // Apply healing if drone is damaged
    if (drone.hull < baseDrone.hull) {
      drone.hull = Math.min(baseDrone.hull, drone.hull + effect.value);
    }

    // Build heal animation using animation builder
    const healAnimation = buildHealAnimation({
      target,
      healAmount: effect.value,
      targetPlayer: targetPlayerId,
      targetLane: targetLaneId,
      targetType: 'drone',
      card
    });
    animationEvents.push(...healAnimation);
  }

  /**
   * Heal a ship section
   *
   * @private
   */
  healShipSection(effect, target, targetPlayerId, targetPlayerState, placedSections, animationEvents) {
    const section = targetPlayerState.shipSections[target.name];

    debugLog('EFFECT_PROCESSING', '[HEAL_HULL] healShipSection executing', {
      targetName: target.name,
      sectionExists: !!section,
      currentHull: section?.hull,
      maxHull: section?.maxHull,
      healValue: effect.value
    });

    if (!section) {
      debugLog('EFFECT_PROCESSING', '[HEAL_HULL] ⚠️ Ship section not found in playerState', {
        targetName: target.name,
        availableSections: Object.keys(targetPlayerState.shipSections || {})
      });
      return;
    }

    const oldHull = section.hull;
    // Apply healing if ship section is damaged
    if (section.hull < section.maxHull) {
      section.hull = Math.min(section.maxHull, section.hull + effect.value);
      debugLog('EFFECT_PROCESSING', '[HEAL_HULL] ✅ Ship section healed', {
        sectionName: target.name,
        oldHull,
        newHull: section.hull,
        maxHull: section.maxHull
      });
    } else {
      debugLog('EFFECT_PROCESSING', '[HEAL_HULL] Ship section already at max hull', {
        sectionName: target.name,
        hull: section.hull,
        maxHull: section.maxHull
      });
    }

    // Build heal animation using animation builder
    const healAnimation = buildHealAnimation({
      target,
      healAmount: effect.value,
      targetPlayer: targetPlayerId,
      targetLane: null,
      targetType: 'section',
      card: null // Ship section heals don't have source cards
    });
    animationEvents.push(...healAnimation);
  }
}

export default HullHealProcessor;
