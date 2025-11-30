// ========================================
// SHIP SHIELD RESTORE EFFECT PROCESSOR
// ========================================
// Handles RESTORE_SECTION_SHIELDS effect type
// Restores shields to ship sections up to their maximum capacity

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import ShieldManager from '../../shields/ShieldManager.js';
import { debugLog } from '../../../utils/debugLogger.js';
import { buildHealAnimation } from './animations/HealAnimation.js';

/**
 * Processor for RESTORE_SECTION_SHIELDS effect type
 *
 * Restores shield points to ship sections up to their maximum capacity.
 * Takes into account middle lane bonuses for effective max shields.
 *
 * Example card effect:
 * {
 *   type: 'RESTORE_SECTION_SHIELDS',
 *   value: 2  // Restore up to 2 shields
 * }
 *
 * @extends BaseEffectProcessor
 */
class ShipShieldRestoreProcessor extends BaseEffectProcessor {
  /**
   * Process RESTORE_SECTION_SHIELDS effect
   *
   * @param {Object} effect - Effect definition { type: 'RESTORE_SECTION_SHIELDS', value }
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player performing the action
   * @param {Object} context.playerStates - Current player states
   * @param {Array} context.placedSections - Player 1's placed ship sections
   * @param {Array} context.opponentPlacedSections - Player 2's placed ship sections (if available)
   * @param {Object} context.target - Target ship section
   * @param {Object} context.card - Source card (for animation)
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, placedSections, opponentPlacedSections, target, card } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const animationEvents = [];

    // Determine target player (from target.owner or default to acting player)
    const targetPlayerId = target.owner || actingPlayerId;
    const targetPlayerState = newPlayerStates[targetPlayerId];

    // Get section name from target
    const sectionName = target.name || target.id;
    const section = targetPlayerState.shipSections[sectionName];

    if (!section) {
      debugLog('EFFECT_PROCESSING', '[RESTORE_SECTION_SHIELDS] Target section not found', {
        sectionName,
        availableSections: Object.keys(targetPlayerState.shipSections || {})
      });
      return this.createResult(newPlayerStates, animationEvents);
    }

    // Determine the correct placed sections array for the target player
    const targetPlacedSections = targetPlayerId === 'player1'
      ? placedSections
      : (opponentPlacedSections || placedSections);

    // Get effective maximum shields (includes middle lane bonus)
    const effectiveMaxShields = ShieldManager.getEffectiveSectionMaxShields(
      sectionName,
      targetPlayerState,
      targetPlacedSections
    );

    const oldShields = section.allocatedShields || 0;
    const missingShields = effectiveMaxShields - oldShields;

    debugLog('EFFECT_PROCESSING', '[RESTORE_SECTION_SHIELDS] Processing shield restore', {
      sectionName,
      oldShields,
      effectiveMaxShields,
      missingShields,
      restoreValue: effect.value
    });

    // Only restore if there are missing shields
    if (missingShields > 0) {
      // Restore up to effect.value shields, but don't exceed max
      const shieldsToRestore = Math.min(effect.value, missingShields);
      section.allocatedShields = oldShields + shieldsToRestore;

      debugLog('EFFECT_PROCESSING', '[RESTORE_SECTION_SHIELDS] ✅ Shields restored', {
        sectionName,
        oldShields,
        newShields: section.allocatedShields,
        restored: shieldsToRestore,
        effectiveMaxShields
      });

      // Build heal animation for visual feedback
      const healAnimation = buildHealAnimation({
        target,
        healAmount: shieldsToRestore,
        targetPlayer: targetPlayerId,
        targetLane: null,
        targetType: 'section',
        card
      });
      animationEvents.push(...healAnimation);
    } else {
      debugLog('EFFECT_PROCESSING', '[RESTORE_SECTION_SHIELDS] Section already at max shields', {
        sectionName,
        currentShields: oldShields,
        effectiveMaxShields
      });
    }

    const result = this.createResult(newPlayerStates, animationEvents);
    this.logProcessComplete(effect, result, context);
    return result;
  }
}

export default ShipShieldRestoreProcessor;
