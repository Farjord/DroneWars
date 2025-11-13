// ========================================
// SHIELD HEAL EFFECT PROCESSOR
// ========================================
// Handles HEAL_SHIELDS effect type
// Extracts shield healing logic from gameLogic.js resolveHealShieldsEffect()
// Supports both single drone and LANE scope shield healing
//

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { calculateEffectiveStats } from '../../statsCalculator.js';
import { debugLog } from '../../../utils/debugLogger.js';
import { buildHealAnimation } from './animations/HealAnimation.js';

/**
 * Processor for HEAL_SHIELDS effect type
 *
 * Restores shield points to drones up to their maximum shields (including lane bonuses).
 * Supports:
 * - Single drone targeting
 * - LANE scope (heals all drones in a lane)
 *
 * @extends BaseEffectProcessor
 */
class ShieldHealProcessor extends BaseEffectProcessor {
  /**
   * Process HEAL_SHIELDS effect
   *
   * @param {Object} effect - Effect definition { type: 'HEAL_SHIELDS', value }
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player performing the action
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.placedSections - Placed ship sections
   * @param {Object} context.target - Target of the effect (drone or lane)
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, placedSections, target } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const animationEvents = [];

    // Check if target is a lane (e.g., lane1, lane2, lane3)
    if (target.id && target.id.startsWith('lane')) {
      this.processLaneShieldHeal(
        effect,
        target,
        actingPlayerId,
        newPlayerStates,
        placedSections,
        animationEvents
      );
    } else {
      // Single drone target
      this.processSingleDroneShieldHeal(
        effect,
        target,
        actingPlayerId,
        newPlayerStates,
        placedSections,
        animationEvents
      );
    }

    const result = this.createResult(newPlayerStates, animationEvents);
    this.logProcessComplete(effect, result, context);
    return result;
  }

  /**
   * Process LANE scope shield healing (heals all drones in lane)
   *
   * @private
   */
  processLaneShieldHeal(effect, target, actingPlayerId, newPlayerStates, placedSections, animationEvents) {
    const laneId = target.id;
    const targetPlayerId = target.owner || actingPlayerId;
    const targetPlayerState = newPlayerStates[targetPlayerId];
    const opponentPlayerId = targetPlayerId === 'player1' ? 'player2' : 'player1';
    const opponentState = newPlayerStates[opponentPlayerId];
    const sections = placedSections?.[targetPlayerId] || [];

    const dronesInLane = targetPlayerState.dronesOnBoard[laneId] || [];

    debugLog('COMBAT', `[HEAL_SHIELDS] Healing all drones in ${targetPlayerId} ${laneId} (${dronesInLane.length} drones)`);

    // Heal each drone in the lane
    dronesInLane.forEach(drone => {
      // Calculate effective stats to get proper maxShields with lane bonuses
      const effectiveStats = calculateEffectiveStats(drone, laneId, targetPlayerState, opponentState, sections);
      const maxShields = effectiveStats.maxShields;

      const oldShields = drone.currentShields || 0;
      // Apply shield healing if not at max
      if (oldShields < maxShields) {
        drone.currentShields = Math.min(maxShields, oldShields + effect.value);
      }

      debugLog('COMBAT', `[HEAL_SHIELDS] ${drone.name}: ${oldShields} → ${drone.currentShields} (max: ${maxShields})`);

      // Build heal animation using animation builder
      const healAnimation = buildHealAnimation({
        target: drone,
        healAmount: effect.value,
        targetPlayer: targetPlayerId,
        targetLane: laneId,
        targetType: 'drone',
        card: null // Shield heals don't have source cards in this context
      });
      animationEvents.push(...healAnimation);
    });
  }

  /**
   * Process single drone shield healing
   *
   * @private
   */
  processSingleDroneShieldHeal(effect, target, actingPlayerId, newPlayerStates, placedSections, animationEvents) {
    const targetPlayerId = target.owner || actingPlayerId;
    const targetPlayerState = newPlayerStates[targetPlayerId];
    const opponentPlayerId = targetPlayerId === 'player1' ? 'player2' : 'player1';
    const opponentState = newPlayerStates[opponentPlayerId];
    const sections = placedSections?.[targetPlayerId] || [];

    // Find the target drone and heal its shields
    for (const lane in targetPlayerState.dronesOnBoard) {
      const droneIndex = targetPlayerState.dronesOnBoard[lane].findIndex(d => d.id === target.id);
      if (droneIndex !== -1) {
        const drone = targetPlayerState.dronesOnBoard[lane][droneIndex];

        // Calculate effective stats to get proper maxShields with lane bonuses
        const effectiveStats = calculateEffectiveStats(drone, lane, targetPlayerState, opponentState, sections);
        const maxShields = effectiveStats.maxShields;

        const oldShields = drone.currentShields || 0;

        // Apply shield healing if not at max
        if (oldShields < maxShields) {
          drone.currentShields = Math.min(maxShields, oldShields + effect.value);
          debugLog('COMBAT', `[HEAL_SHIELDS] ${drone.name} in ${lane}: ${oldShields} → ${drone.currentShields} (max: ${maxShields})`);
        }

        // Build heal animation using animation builder
        const healAnimation = buildHealAnimation({
          target,
          healAmount: effect.value,
          targetPlayer: targetPlayerId,
          targetLane: lane,
          targetType: 'drone',
          card: null // Shield heals don't have source cards in this context
        });
        animationEvents.push(...healAnimation);
        break;
      }
    }
  }
}

export default ShieldHealProcessor;
