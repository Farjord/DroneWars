// ========================================
// TARGET LOCK ABILITY PROCESSOR
// ========================================
// Handles the Target Lock ship ability (Tactical Command Bridge)
// Marks an enemy drone for bonus damage

import { debugLog } from '../../../utils/debugLogger.js';

/**
 * TargetLockAbilityProcessor
 *
 * Flow:
 * 1. Player presses Target Lock → Targeting mode
 * 2. Player selects unmarked enemy drone → Confirmation modal
 * 3. Player confirms → Mark drone + deduct energy + end turn (all in one action)
 *
 * This is a single-action processor - no multi-step flow needed
 */
class TargetLockAbilityProcessor {
  /**
   * Process the Target Lock ability
   *
   * @param {Object} payload - Action payload
   * @param {string} payload.targetId - Drone ID to mark
   * @param {string} payload.sectionName - Ship section name (for logging)
   * @param {string} payload.playerId - Player ID
   * @param {Object} playerStates - Current game state { player1, player2 }
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents }
   */
  process(payload, playerStates) {
    const { targetId, sectionName, playerId } = payload;

    debugLog('SHIP_ABILITY', `🎯 TargetLockAbilityProcessor: ${playerId} using Target Lock on ${targetId}`);

    // Deep clone player states
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const playerState = newPlayerStates[playerId];
    const opponentId = playerId === 'player1' ? 'player2' : 'player1';
    const opponentState = newPlayerStates[opponentId];

    // Increment ship section ability activation counter for per-round limits
    if (playerState.shipSections?.[sectionName]) {
      playerState.shipSections[sectionName].abilityActivationCount =
        (playerState.shipSections[sectionName].abilityActivationCount || 0) + 1;
    }

    // Step 1: Deduct energy cost (2 energy)
    if (playerState.energy < 2) {
      console.warn('⚠️ TargetLockAbilityProcessor: Insufficient energy');
      return {
        newPlayerStates: playerStates, // Return original state
        shouldEndTurn: false,
        animationEvents: [],
        error: 'Insufficient energy'
      };
    }

    playerState.energy -= 2;
    debugLog('SHIP_ABILITY', `💰 TargetLockAbilityProcessor: Deducted 2 energy (${playerState.energy + 2} → ${playerState.energy})`);

    // Step 2: Mark the target drone
    let droneFound = false;
    let markedLane = null;

    for (const lane in opponentState.dronesOnBoard) {
      const droneIndex = opponentState.dronesOnBoard[lane].findIndex(d => d.id === targetId);

      if (droneIndex !== -1) {
        // Mark the drone
        opponentState.dronesOnBoard[lane][droneIndex].isMarked = true;
        droneFound = true;
        markedLane = lane;

        debugLog('SHIP_ABILITY', `✅ TargetLockAbilityProcessor: Marked ${targetId} in ${lane}`);
        break;
      }
    }

    if (!droneFound) {
      console.warn('⚠️ TargetLockAbilityProcessor: Target drone not found:', targetId);
    }

    // Step 3: Return with shouldEndTurn: true
    // Note: No animation events for marking (it's a state-only effect)
    debugLog('SHIP_ABILITY', `✅ TargetLockAbilityProcessor: Complete - drone marked, energy deducted, ending turn`);

    return {
      newPlayerStates,
      shouldEndTurn: true,
      animationEvents: []
    };
  }
}

// Export singleton instance
export default new TargetLockAbilityProcessor();
