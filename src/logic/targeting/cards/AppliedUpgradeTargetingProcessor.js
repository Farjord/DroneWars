// ========================================
// APPLIED UPGRADE TARGETING PROCESSOR
// ========================================
// Handles APPLIED_UPGRADE targeting type - targeting drone cards that have upgrades
// Used by System Sabotage card to remove upgrades from drones

import BaseTargetingProcessor from '../BaseTargetingProcessor.js';

/**
 * AppliedUpgradeTargetingProcessor - Handles applied upgrade targeting
 *
 * Targeting Type: APPLIED_UPGRADE
 * Dependencies: activeDronePool, appliedUpgrades
 * Risk Level: MODERATE
 *
 * Behavior:
 * - Returns drone cards that have at least one upgrade applied
 * - Respects affinity (FRIENDLY/ENEMY)
 * - Targets cards in drone pool, not drones on board
 */
class AppliedUpgradeTargetingProcessor extends BaseTargetingProcessor {
  /**
   * Process APPLIED_UPGRADE targeting
   *
   * @param {Object} context - Targeting context
   * @param {string} context.actingPlayerId - Player performing targeting
   * @param {Object} context.player1 - Player 1 state
   * @param {Object} context.player2 - Player 2 state
   * @param {Object} context.definition - Card/ability definition
   * @param {Object} context.definition.targeting - Targeting configuration
   * @param {string} context.definition.targeting.affinity - FRIENDLY/ENEMY (typically ENEMY)
   * @returns {Array} Array of drone cards with upgrades
   */
  process(context) {
    this.logProcessStart(context);

    const { actingPlayerId, definition } = context;
    const { affinity } = definition.targeting;
    const targets = [];

    // Determine target player based on affinity
    const targetPlayerState = affinity === 'ENEMY'
      ? this.getOpponentPlayerState(context)
      : this.getActingPlayerState(context);

    const targetPlayerId = affinity === 'ENEMY'
      ? this.getOpponentPlayerId(actingPlayerId)
      : actingPlayerId;

    // Process each drone card in target player's drone pool
    targetPlayerState.activeDronePool.forEach(droneCard => {
      // Check if this drone has any upgrades applied
      const appliedUpgrades = targetPlayerState.appliedUpgrades[droneCard.name] || [];

      if (appliedUpgrades.length > 0) {
        targets.push({
          ...droneCard,
          id: droneCard.name,
          owner: targetPlayerId
        });
      }
    });

    this.logProcessComplete(context, targets);
    return targets;
  }
}

export default AppliedUpgradeTargetingProcessor;
