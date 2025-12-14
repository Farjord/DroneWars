// ========================================
// INCREASE THREAT EFFECT PROCESSOR
// ========================================
// Increases player threat/detection in Extraction mode
// Used by AI drones and cards to pressure the player
//
// Effect format:
// { type: 'INCREASE_THREAT', value: number }
//
// Works for:
// - Drone triggered abilities (ON_ROUND_START)
// - Drone conditional abilities (ON_ATTACK with POST condition)
// - Card effects

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import DetectionManager from '../../detection/DetectionManager.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * IncreaseThreatEffectProcessor
 *
 * Increases the player's threat/detection level in Extraction mode.
 * Directly modifies currentRunState.detection via DetectionManager.
 *
 * When detection reaches 100%, MIA is triggered automatically by DetectionManager.
 */
class IncreaseThreatEffectProcessor extends BaseEffectProcessor {
  /**
   * Process the INCREASE_THREAT effect
   *
   * @param {Object} effect - Effect configuration
   * @param {number} effect.value - Amount of threat to add (default: 1)
   * @param {Object} context - Effect execution context
   * @param {string} context.actingPlayerId - Player executing the effect
   * @param {Object} context.playerStates - Current player states
   * @param {string} context.sourceDroneName - Name of drone triggering effect (optional)
   * @param {Object} context.card - Card triggering effect (optional)
   * @returns {Object} Result with unmodified playerStates
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const value = effect.value ?? 1;
    const reason = this.buildReasonString(context);

    // Add detection via DetectionManager
    // This will automatically trigger MIA if detection reaches 100%
    DetectionManager.addDetection(value, reason);

    debugLog('EFFECT_PROCESSING', `[INCREASE_THREAT] Added ${value} threat`, {
      value,
      reason,
      actingPlayer: context.actingPlayerId
    });

    // This effect doesn't modify player states - it modifies currentRunState.detection
    // which is handled separately by DetectionManager
    const playerStates = context.playerStates || { player1: {}, player2: {} };

    return this.createResult(playerStates, []);
  }

  /**
   * Build a descriptive reason string for the detection log
   *
   * @param {Object} context - Effect execution context
   * @returns {string} Reason string for DetectionManager
   */
  buildReasonString(context) {
    // Try to get source name from various context properties
    const sourceName = context.sourceDroneName
      || context.card?.name
      || context.sourceName
      || 'Effect';

    return `${sourceName} ability`;
  }
}

export default IncreaseThreatEffectProcessor;
