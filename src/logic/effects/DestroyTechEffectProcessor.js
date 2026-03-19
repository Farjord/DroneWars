// ========================================
// DESTROY TECH EFFECT PROCESSOR
// ========================================
// Handles DESTROY_TECH effect type
// Removes tech from a player's techSlots by target ID
// Emits TECH_DESTROY animation event

import BaseEffectProcessor from './BaseEffectProcessor.js';
import { debugLog } from '../../utils/debugLogger.js';
import { TECH_DESTROY } from '../../config/animationTypes.js';

/**
 * Processor for DESTROY_TECH effect type
 *
 * Removes a specific tech from techSlots using the target's id and owner.
 *
 * @extends BaseEffectProcessor
 */
class DestroyTechEffectProcessor extends BaseEffectProcessor {
  /**
   * Process DESTROY_TECH effect
   *
   * @param {Object} effect - Effect definition { type: 'DESTROY_TECH' }
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player performing the action
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.target - Target { id, lane, owner }
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { playerStates, target } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const animationEvents = [];

    if (!target || !target.id) {
      debugLog('EFFECT_PROCESSING', '[DESTROY_TECH] No target provided');
      return this.createResult(newPlayerStates, animationEvents);
    }

    const targetPlayerId = target.owner;
    const targetPlayerState = newPlayerStates[targetPlayerId];
    const lane = target.lane;

    if (!targetPlayerState?.techSlots?.[lane]) {
      debugLog('EFFECT_PROCESSING', `[DESTROY_TECH] No techSlots in lane ${lane} for ${targetPlayerId}`);
      return this.createResult(newPlayerStates, animationEvents);
    }

    const techIndex = targetPlayerState.techSlots[lane].findIndex(t => t.id === target.id);

    if (techIndex === -1) {
      debugLog('EFFECT_PROCESSING', `[DESTROY_TECH] Tech ${target.id} not found in ${targetPlayerId}.techSlots.${lane}`);
      return this.createResult(newPlayerStates, animationEvents);
    }

    const destroyedTech = targetPlayerState.techSlots[lane][techIndex];

    debugLog('EFFECT_PROCESSING', `[DESTROY_TECH] Destroying ${destroyedTech.name} in ${lane} (owner: ${targetPlayerId})`);

    targetPlayerState.techSlots[lane] = targetPlayerState.techSlots[lane].filter(t => t.id !== target.id);

    animationEvents.push({
      type: TECH_DESTROY,
      targetId: target.id,
      targetPlayer: targetPlayerId,
      targetLane: lane,
      targetType: 'tech',
      timestamp: Date.now()
    });

    const result = this.createResult(newPlayerStates, animationEvents);
    this.logProcessComplete(effect, result, context);
    return result;
  }
}

export default DestroyTechEffectProcessor;
