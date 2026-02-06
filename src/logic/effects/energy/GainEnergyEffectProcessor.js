// ========================================
// GAIN ENERGY EFFECT PROCESSOR
// ========================================
// Handles ENERGY effect type - gaining energy up to ship's max energy
// Respects maximum energy cap from ship sections

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { applyOnEnergyGainedEffects } from '../../utils/abilityHelpers.js';
import { calculateEffectiveShipStats } from '../../statsCalculator.js';

/**
 * GainEnergyEffectProcessor - Handles energy gain
 * Behavior:
 * - Adds N energy to acting player (where N = effect.value)
 * - Caps energy at player's maximum energy from ship sections
 * - Cannot exceed max energy limit
 */
class GainEnergyEffectProcessor extends BaseEffectProcessor {
  /**
   * Process ENERGY effect
   *
   * @param {Object} effect - Effect configuration with value property
   * @param {number} effect.value - Amount of energy to gain
   * @param {Object} context - Effect execution context
   * @param {string} context.actingPlayerId - Player gaining energy
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.placedSections - Placed ship sections (required for max energy calculation)
   * @returns {Object} Result with updated player states
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, placedSections } = context;

    // Clone player states to prevent mutations
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const actingPlayerState = this.getActingPlayerState(newPlayerStates, actingPlayerId);

    // Get player's placed sections for energy cap calculation
    const sections = actingPlayerId === 'player1'
      ? placedSections.player1
      : placedSections.player2;

    // Calculate effective ship stats to get maximum energy
    const effectiveStats = calculateEffectiveShipStats(actingPlayerState, sections).totals;

    const oldEnergy = actingPlayerState.energy;

    // Add energy, capping at maximum
    const newEnergy = Math.min(
      effectiveStats.maxEnergy,
      actingPlayerState.energy + effect.value
    );

    actingPlayerState.energy = newEnergy;

    const actualEnergyGained = newEnergy - oldEnergy;
    if (actualEnergyGained > 0) {
      const logCallback = context.callbacks?.logCallback || null;
      const { newState } = applyOnEnergyGainedEffects(actingPlayerState, actualEnergyGained, logCallback);
      newPlayerStates[actingPlayerId] = newState;
    }

    const result = this.createResult(newPlayerStates);

    this.logProcessComplete(effect, result, context);

    return result;
  }
}

export default GainEnergyEffectProcessor;
