// ========================================
// REALLOCATE SHIELDS ABILITY PROCESSOR
// ========================================
// Handles the Reallocate Shields ship ability (Power Cell)
// Multi-phase UI flow for removing and adding shields

import { debugLog } from '../../../utils/debugLogger.js';
import ShieldManager from '../../shields/ShieldManager.js';

/**
 * ReallocateShieldsAbilityProcessor
 *
 * Flow:
 * 1. Player presses Reallocate Shields → Enter remove phase
 * 2. Player removes up to 2 shields from sections
 * 3. Player clicks Continue → Enter add phase
 * 4. Player adds the removed shields to sections
 * 5. Player clicks Confirm → Deduct energy + end turn
 *
 * This is a multi-step processor with UI phases:
 * - process() - Handles remove/add/restore actions during UI flow
 * - complete() - Deducts energy and ends turn when confirmed
 */
class ReallocateShieldsAbilityProcessor {
  /**
   * Process shield reallocation actions during UI flow
   * Handles: 'remove', 'add', 'restore'
   *
   * @param {Object} payload - Action payload
   * @param {string} payload.action - 'remove', 'add', or 'restore'
   * @param {string} payload.sectionName - Ship section name (for remove/add)
   * @param {Object} payload.originalShipSections - Original state (for restore)
   * @param {string} payload.playerId - Player ID
   * @param {Object} playerStates - Current game state { player1, player2 }
   * @param {Object} currentState - Full game state (for placed sections)
   * @returns {Object} { success, newPlayerStates?, error? }
   */
  process(payload, playerStates, currentState) {
    const {
      action,
      sectionName,
      originalShipSections,
      playerId
    } = payload;

    debugLog('SHIP_ABILITY', `🛡️ ReallocateShieldsAbilityProcessor: ${action} action for ${playerId}`);

    // Validate action phase
    if (currentState.turnPhase !== 'action') {
      return {
        success: false,
        error: `Shield reallocation only valid during action phase, not ${currentState.turnPhase}`
      };
    }

    // Deep clone player states
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const playerState = newPlayerStates[playerId];
    const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;

    // Handle different actions
    if (action === 'remove') {
      return this.handleRemoveAction(playerState, sectionName, placedSections, newPlayerStates);
    } else if (action === 'add') {
      return this.handleAddAction(playerState, sectionName, placedSections, newPlayerStates);
    } else if (action === 'restore') {
      return this.handleRestoreAction(playerState, originalShipSections, newPlayerStates);
    }

    return {
      success: false,
      error: `Unknown reallocation action: ${action}`
    };
  }

  /**
   * Handle shield removal action
   */
  handleRemoveAction(playerState, sectionName, placedSections, newPlayerStates) {
    // Validate removal
    const validation = ShieldManager.validateShieldRemoval(playerState, sectionName, placedSections);

    if (!validation.valid) {
      debugLog('SHIP_ABILITY', `❌ Cannot remove shield: ${validation.error}`);
      return {
        success: false,
        error: validation.error
      };
    }

    // Remove shield
    playerState.shipSections[sectionName].allocatedShields -= 1;

    debugLog('SHIP_ABILITY', `➖ Shield removed from ${sectionName} (now ${playerState.shipSections[sectionName].allocatedShields})`);

    return {
      success: true,
      action: 'remove',
      sectionName,
      newPlayerStates
    };
  }

  /**
   * Handle shield addition action
   */
  handleAddAction(playerState, sectionName, placedSections, newPlayerStates) {
    // Validate addition
    const validation = ShieldManager.validateShieldAddition(playerState, sectionName, placedSections);

    if (!validation.valid) {
      debugLog('SHIP_ABILITY', `❌ Cannot add shield: ${validation.error}`);
      return {
        success: false,
        error: validation.error
      };
    }

    // Add shield
    playerState.shipSections[sectionName].allocatedShields += 1;

    debugLog('SHIP_ABILITY', `➕ Shield added to ${sectionName} (now ${playerState.shipSections[sectionName].allocatedShields})`);

    return {
      success: true,
      action: 'add',
      sectionName,
      newPlayerStates
    };
  }

  /**
   * Handle restore to original state action
   */
  handleRestoreAction(playerState, originalShipSections, newPlayerStates) {
    if (!originalShipSections) {
      return {
        success: false,
        error: 'No original ship sections provided for restore'
      };
    }

    // Restore original shield configuration
    playerState.shipSections = JSON.parse(JSON.stringify(originalShipSections));

    debugLog('SHIP_ABILITY', `🔄 Shield allocation restored to original state`);

    return {
      success: true,
      action: 'restore',
      newPlayerStates
    };
  }

  /**
   * Complete the Reallocate Shields ability
   * Called when player confirms the reallocation
   *
   * @param {Object} payload - Completion payload
   * @param {string} payload.playerId - Player ID
   * @param {Object} playerStates - Current game state after reallocation
   * @returns {Object} { newPlayerStates, shouldEndTurn: true }
   */
  complete(payload, playerStates) {
    const { playerId } = payload;

    debugLog('SHIP_ABILITY', `✅ ReallocateShieldsAbilityProcessor: Complete for ${playerId}`);

    // Deep clone player states
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const playerState = newPlayerStates[playerId];

    // Deduct energy cost (1 energy)
    if (playerState.energy < 1) {
      console.warn('⚠️ ReallocateShieldsAbilityProcessor: Insufficient energy at completion');
      // This shouldn't happen since we validate before starting
      // But handle gracefully - still end turn
    } else {
      playerState.energy -= 1;
      debugLog('SHIP_ABILITY', `💰 ReallocateShieldsAbilityProcessor: Deducted 1 energy (${playerState.energy + 1} → ${playerState.energy})`);
    }

    // Return with shouldEndTurn: true
    return {
      newPlayerStates,
      shouldEndTurn: true,
      animationEvents: []
    };
  }
}

// Export singleton instance
export default new ReallocateShieldsAbilityProcessor();
