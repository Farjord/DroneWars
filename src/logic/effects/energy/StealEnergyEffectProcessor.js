// ========================================
// STEAL ENERGY EFFECT PROCESSOR
// ========================================
// Handles STEAL_ENERGY effect type - draining opponent energy and gaining it for self
// Combined drain + gain in a single atomic operation

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * StealEnergyEffectProcessor - Handles energy theft
 *
 * Effect Type: STEAL_ENERGY
 *
 * Behavior:
 * - Drains N energy from opponent (clamped to their available energy)
 * - Gains the actual amount drained for self
 * - Single 'amount' field works with OVERRIDE_VALUE conditional
 */
class StealEnergyEffectProcessor extends BaseEffectProcessor {
  /**
   * Process STEAL_ENERGY effect
   *
   * @param {Object} effect - Effect configuration
   * @param {number} effect.amount - Amount of energy to steal
   * @param {string} [effect.targetPlayer='opponent'] - Target player to drain from
   * @param {Object} context - Effect execution context
   * @param {string} context.actingPlayerId - Player executing the effect
   * @param {Object} context.playerStates - Current player states
   * @returns {Object} Result with updated player states
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);

    const targetPlayer = effect.targetPlayer || 'opponent';
    const opponentId = targetPlayer === 'self'
      ? actingPlayerId
      : (actingPlayerId === 'player1' ? 'player2' : 'player1');

    const stealAmount = Math.max(0, effect.amount);
    const opponentEnergy = newPlayerStates[opponentId].energy;

    // Drain: clamped to opponent's available energy
    const actualDrained = Math.min(stealAmount, opponentEnergy);
    newPlayerStates[opponentId].energy = opponentEnergy - actualDrained;

    // Gain: same amount that was actually drained
    const oldSelfEnergy = newPlayerStates[actingPlayerId].energy;
    newPlayerStates[actingPlayerId].energy = oldSelfEnergy + actualDrained;

    debugLog('EFFECT_PROCESSING', `[STEAL_ENERGY] ${actingPlayerId} stole ${actualDrained} energy from ${opponentId}`, {
      requested: stealAmount,
      actualDrained,
      opponentEnergyBefore: opponentEnergy,
      selfEnergyBefore: oldSelfEnergy
    });

    const result = this.createResult(newPlayerStates);
    this.logProcessComplete(effect, result, context);

    return result;
  }
}

export default StealEnergyEffectProcessor;
