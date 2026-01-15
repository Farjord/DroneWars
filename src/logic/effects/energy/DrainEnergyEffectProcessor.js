// ========================================
// DRAIN ENERGY EFFECT PROCESSOR
// ========================================
// Handles DRAIN_ENERGY effect type - reducing target player's energy
// Inverse operation of GAIN_ENERGY effect

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * DrainEnergyEffectProcessor - Handles energy drain
 *
 * Effect Type: DRAIN_ENERGY
 *
 * Behavior:
 * - Reduces target player's energy by N (where N = effect.amount)
 * - Energy cannot go below 0 (clamped to minimum)
 * - Defaults to draining opponent's energy
 * - Optionally supports draining self for special mechanics
 */
class DrainEnergyEffectProcessor extends BaseEffectProcessor {
  /**
   * Process DRAIN_ENERGY effect
   *
   * @param {Object} effect - Effect configuration
   * @param {number} effect.amount - Amount of energy to drain
   * @param {string} [effect.targetPlayer='opponent'] - Target player ('opponent' or 'self')
   * @param {Object} context - Effect execution context
   * @param {string} context.actingPlayerId - Player executing the effect
   * @param {Object} context.playerStates - Current player states
   * @returns {Object} Result with updated player states
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates } = context;

    // Clone player states to prevent mutations
    const newPlayerStates = this.clonePlayerStates(playerStates);

    // Determine target player (default to opponent)
    const targetPlayer = effect.targetPlayer || 'opponent';
    const targetPlayerId = targetPlayer === 'self'
      ? actingPlayerId
      : (actingPlayerId === 'player1' ? 'player2' : 'player1');

    const targetPlayerState = newPlayerStates[targetPlayerId];

    const oldEnergy = targetPlayerState.energy;

    // Defensive: treat negative amounts as 0
    const drainAmount = Math.max(0, effect.amount);

    // Reduce energy, clamping to 0 (cannot go negative)
    const newEnergy = Math.max(0, targetPlayerState.energy - drainAmount);

    targetPlayerState.energy = newEnergy;

    debugLog('EFFECT_PROCESSING', `[DRAIN_ENERGY] ${targetPlayerId} energy: ${oldEnergy} -> ${newEnergy} (drained ${oldEnergy - newEnergy})`, {
      targetPlayerId,
      oldEnergy,
      newEnergy,
      drainAmount,
      actualDrained: oldEnergy - newEnergy
    });

    const result = this.createResult(newPlayerStates);

    this.logProcessComplete(effect, result, context);

    return result;
  }
}

export default DrainEnergyEffectProcessor;
