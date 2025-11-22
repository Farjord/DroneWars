// ========================================
// RECALL ABILITY PROCESSOR
// ========================================
// Handles the Recall ship ability (Drone Control Hub)
// Returns a friendly drone from any lane to the active pool

import { updateAuras } from '../../utils/auraManager.js';
import { getLaneOfDrone } from '../../utils/gameEngineUtils.js';
import { onDroneRecalled } from '../../utils/droneStateUtils.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * RecallAbilityProcessor
 *
 * Flow:
 * 1. Player presses Recall → Targeting mode
 * 2. Player selects friendly drone → Confirmation modal
 * 3. Player confirms → Recall drone + deduct energy + end turn (all in one action)
 *
 * This is a single-action processor - no multi-step flow needed
 */
class RecallAbilityProcessor {
  /**
   * Process the Recall ability
   *
   * @param {Object} payload - Action payload
   * @param {string} payload.targetId - Drone ID to recall
   * @param {string} payload.sectionName - Ship section name (for logging)
   * @param {string} payload.playerId - Player ID
   * @param {Object} playerStates - Current game state { player1, player2 }
   * @param {Object} placedSections - Placed ship sections for aura updates
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents }
   */
  process(payload, playerStates, placedSections) {
    const { targetId, sectionName, playerId } = payload;

    debugLog('SHIP_ABILITY', `🚀 RecallAbilityProcessor: ${playerId} using Recall on ${targetId}`);

    // Deep clone player states
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const playerState = newPlayerStates[playerId];
    const opponentId = playerId === 'player1' ? 'player2' : 'player1';

    // Step 1: Deduct energy cost (1 energy)
    if (playerState.energy < 1) {
      console.warn('⚠️ RecallAbilityProcessor: Insufficient energy');
      return {
        newPlayerStates: playerStates, // Return original state
        shouldEndTurn: false,
        animationEvents: [],
        error: 'Insufficient energy'
      };
    }

    playerState.energy -= 1;
    debugLog('SHIP_ABILITY', `💰 RecallAbilityProcessor: Deducted 1 energy (${playerState.energy + 1} → ${playerState.energy})`);

    // Step 2: Recall the drone
    const lane = getLaneOfDrone(targetId, playerState);

    if (!lane) {
      console.warn('⚠️ RecallAbilityProcessor: Drone not found on board:', targetId);
      return {
        newPlayerStates,
        shouldEndTurn: true, // Still end turn even if drone not found
        animationEvents: []
      };
    }

    // Find the actual drone object
    const droneToRecall = playerState.dronesOnBoard[lane].find(d => d.id === targetId);

    if (!droneToRecall) {
      console.warn('⚠️ RecallAbilityProcessor: Drone object not found in lane:', targetId, 'lane:', lane);
      return {
        newPlayerStates,
        shouldEndTurn: true,
        animationEvents: []
      };
    }

    debugLog('SHIP_ABILITY', `📥 RecallAbilityProcessor: Recalling ${droneToRecall.name} from ${lane}`);

    // Remove drone from board
    playerState.dronesOnBoard[lane] = playerState.dronesOnBoard[lane].filter(d => d.id !== targetId);

    // Update deployed drone count (increment available drones)
    Object.assign(playerState, onDroneRecalled(playerState, droneToRecall));

    // Update auras after drone removal
    playerState.dronesOnBoard = updateAuras(playerState, newPlayerStates[opponentId], placedSections);

    // Create recall animation event
    const animationEvents = [{
      type: 'TELEPORT_OUT',
      targetId: targetId,
      laneId: lane,
      playerId: playerId,
      timestamp: Date.now()
    }];

    debugLog('SHIP_ABILITY', `✅ RecallAbilityProcessor: Complete - drone recalled, energy deducted, ending turn`);

    // Step 3: Return with shouldEndTurn: true
    return {
      newPlayerStates,
      shouldEndTurn: true,
      animationEvents
    };
  }
}

// Export singleton instance
export default new RecallAbilityProcessor();
