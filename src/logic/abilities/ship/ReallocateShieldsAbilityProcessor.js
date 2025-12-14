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
 * STATE MANAGEMENT (matches round start shield allocation pattern):
 * - process() validates actions and returns pending changes WITHOUT modifying game state
 * - complete() applies all pending changes to game state and deducts energy
 * - Reset simply clears local pending state (no game state restore needed)
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
   * NOTE: Does NOT modify game state - returns pending change for local tracking
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

    // DON'T modify state - return pending change for local tracking
    // State will be updated only when complete() is called
    debugLog('SHIP_ABILITY', `➖ Pending removal from ${sectionName} (current: ${playerState.shipSections[sectionName].allocatedShields})`);

    return {
      success: true,
      action: 'remove',
      sectionName,
      pendingChange: { sectionName, delta: -1 },
      newPlayerStates  // Unchanged from input
    };
  }

  /**
   * Handle shield addition action
   * NOTE: Does NOT modify game state - returns pending change for local tracking
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

    // DON'T modify state - return pending change for local tracking
    // State will be updated only when complete() is called
    debugLog('SHIP_ABILITY', `➕ Pending addition to ${sectionName} (current: ${playerState.shipSections[sectionName].allocatedShields})`);

    return {
      success: true,
      action: 'add',
      sectionName,
      pendingChange: { sectionName, delta: +1 },
      newPlayerStates  // Unchanged from input
    };
  }

  /**
   * Handle restore to original state action
   * NOTE: Since we no longer modify game state during remove/add, this just signals
   * that the caller should clear their local pending state. Game state is already
   * at the original values.
   */
  handleRestoreAction(playerState, originalShipSections, newPlayerStates) {
    // No need to restore game state - it was never modified
    // The caller will clear their local pending changes
    debugLog('SHIP_ABILITY', `🔄 Reset requested - caller should clear local pending state`);

    return {
      success: true,
      action: 'restore',
      newPlayerStates  // Unchanged - game state already at original
    };
  }

  /**
   * Complete the Reallocate Shields ability
   * Called when player confirms the reallocation
   * This is where ALL pending shield changes are applied to game state
   *
   * @param {Object} payload - Completion payload
   * @param {string} payload.playerId - Player ID
   * @param {Object} payload.pendingChanges - Map of sectionName → delta (e.g., { bridge: -1, powerCell: +1 })
   * @param {Object} playerStates - Current game state (unchanged during editing)
   * @returns {Object} { newPlayerStates, shouldEndTurn: true }
   */
  complete(payload, playerStates) {
    const { playerId, sectionName, pendingChanges } = payload;

    debugLog('SHIP_ABILITY', `✅ ReallocateShieldsAbilityProcessor: Complete for ${playerId}`, { pendingChanges });

    // Deep clone player states
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const playerState = newPlayerStates[playerId];

    // Apply all pending shield changes NOW
    if (pendingChanges) {
      Object.entries(pendingChanges).forEach(([sectionName, delta]) => {
        if (playerState.shipSections[sectionName]) {
          const oldValue = playerState.shipSections[sectionName].allocatedShields;
          playerState.shipSections[sectionName].allocatedShields += delta;
          debugLog('SHIP_ABILITY', `🛡️ Applied: ${sectionName} ${oldValue} → ${playerState.shipSections[sectionName].allocatedShields}`);
        }
      });
    }

    // Deduct energy cost (1 energy)
    if (playerState.energy < 1) {
      console.warn('⚠️ ReallocateShieldsAbilityProcessor: Insufficient energy at completion');
      // This shouldn't happen since we validate before starting
      // But handle gracefully - still end turn
    } else {
      playerState.energy -= 1;
      debugLog('SHIP_ABILITY', `💰 ReallocateShieldsAbilityProcessor: Deducted 1 energy (${playerState.energy + 1} → ${playerState.energy})`);
    }

    // Increment ship section ability activation counter for per-round limits
    // powerCell is the section that has Reallocate Shields ability
    const abilitySection = sectionName || 'powerCell';
    if (playerState.shipSections?.[abilitySection]) {
      playerState.shipSections[abilitySection].abilityActivationCount =
        (playerState.shipSections[abilitySection].abilityActivationCount || 0) + 1;
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
