// ========================================
// SHIELD MANAGER
// ========================================
// Handles shield allocation and reallocation
// Extracted from gameLogic.js Phase 9.5

import { calculateEffectiveShipStats } from '../statsCalculator.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * ShieldManager
 * Manages shield allocation, validation, and reallocation
 *
 * Key responsibilities:
 * - Calculate effective section shield capacities
 * - Validate shield additions and removals
 * - Execute shield reallocation transactions
 * - Process shield allocation phases (start, reset, end)
 * - Handle AI automatic shield allocation
 *
 * This is a stateless singleton - all methods are pure functions
 * that transform state without side effects.
 */
class ShieldManager {
  /**
   * Get effective maximum shields for a section
   * Includes middle lane bonus if applicable
   *
   * @param {string} sectionName - Name of the ship section
   * @param {Object} playerState - Player state object
   * @param {Array} placedSections - Array of placed section names
   * @returns {number} Effective maximum shields for the section
   */
  getEffectiveSectionMaxShields(sectionName, playerState, placedSections) {
    const section = playerState.shipSections[sectionName];
    if (!section) return 0;

    let effectiveMax = section.shields;

    // Check for middle lane bonus
    const laneIndex = placedSections.indexOf(sectionName);
    if (laneIndex === 1 && section.middleLaneBonus && section.middleLaneBonus['Shields Per Turn']) {
      effectiveMax += section.middleLaneBonus['Shields Per Turn'];
    }

    return effectiveMax;
  }

  /**
   * Validate shield removal from a section
   *
   * @param {Object} playerState - Player state object
   * @param {string} sectionName - Name of the section
   * @param {Array} placedSections - Array of placed section names
   * @returns {Object} Validation result { valid: boolean, error?: string }
   */
  validateShieldRemoval(playerState, sectionName, placedSections) {
    const section = playerState.shipSections[sectionName];

    if (!section) {
      return { valid: false, error: 'Section not found' };
    }

    if (section.allocatedShields <= 0) {
      return { valid: false, error: 'No shields to remove' };
    }

    return { valid: true };
  }

  /**
   * Validate shield addition to a section
   *
   * @param {Object} playerState - Player state object
   * @param {string} sectionName - Name of the section
   * @param {Array} placedSections - Array of placed section names
   * @returns {Object} Validation result { valid: boolean, error?: string, maxAvailable: number }
   */
  validateShieldAddition(playerState, sectionName, placedSections) {
    const section = playerState.shipSections[sectionName];

    if (!section) {
      return { valid: false, error: 'Section not found', maxAvailable: 0 };
    }

    const effectiveMaxShields = this.getEffectiveSectionMaxShields(sectionName, playerState, placedSections);
    const availableSlots = effectiveMaxShields - section.allocatedShields;

    if (availableSlots <= 0) {
      return { valid: false, error: 'Section at maximum shields', maxAvailable: 0 };
    }

    return { valid: true, maxAvailable: availableSlots };
  }

  /**
   * Execute shield reallocation transaction
   * Removes shields from some sections and adds to others
   *
   * @param {Object} playerState - Player state object
   * @param {Object} reallocationData - { removals: Array, additions: Array }
   * @param {Array} placedSections - Array of placed section names
   * @returns {Object} Updated player state
   */
  executeShieldReallocation(playerState, reallocationData, placedSections) {
    const { removals, additions } = reallocationData;

    const newPlayerState = {
      ...playerState,
      shipSections: { ...playerState.shipSections }
    };

    // Process removals
    removals.forEach(({ section, count }) => {
      newPlayerState.shipSections[section] = {
        ...newPlayerState.shipSections[section],
        allocatedShields: newPlayerState.shipSections[section].allocatedShields - count
      };
    });

    // Process additions
    additions.forEach(({ section, count }) => {
      newPlayerState.shipSections[section] = {
        ...newPlayerState.shipSections[section],
        allocatedShields: newPlayerState.shipSections[section].allocatedShields + count
      };
    });

    return newPlayerState;
  }

  /**
   * Get valid targets for shield reallocation
   * Returns sections that can have shields removed or added
   *
   * @param {Object} playerState - Player state object
   * @param {string} phase - 'REMOVE' or 'ADD'
   * @param {Array} placedSections - Array of placed section names
   * @returns {Array} Array of valid section names
   */
  getValidShieldReallocationTargets(playerState, phase, placedSections) {
    const validTargets = [];

    for (const sectionName of placedSections) {
      const section = playerState.shipSections[sectionName];
      if (!section) continue;

      if (phase === 'REMOVE') {
        // Can remove if section has allocated shields
        if (section.allocatedShields > 0) {
          validTargets.push(sectionName);
        }
      } else if (phase === 'ADD') {
        // Can add if section is not at maximum
        const effectiveMax = this.getEffectiveSectionMaxShields(sectionName, playerState, placedSections);
        if (section.allocatedShields < effectiveMax) {
          validTargets.push(sectionName);
        }
      }
    }

    return validTargets;
  }

  /**
   * Process shield allocation action (add shield during allocation phase)
   * Used in ActionProcessor.processShieldAddition
   *
   * @param {Object} currentState - Current game state (with shieldsToAllocate)
   * @param {string} playerId - 'player1' or 'player2'
   * @param {string} sectionName - Name of the section to add shield to
   * @returns {Object} { success, newPlayerState, newShieldsToAllocate, sectionName, playerId, error? }
   */
  processShieldAllocation(currentState, playerId, sectionName) {
    const playerState = currentState[playerId];
    const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;

    // Validate shield allocation
    const validation = this.validateShieldAddition(playerState, sectionName, placedSections);

    if (!validation.valid || currentState.shieldsToAllocate <= 0) {
      return {
        success: false,
        error: validation.error || 'No shields available to allocate',
        newPlayerState: playerState,
        newShieldsToAllocate: currentState.shieldsToAllocate
      };
    }

    // Create updated player state
    const newPlayerState = {
      ...playerState,
      shipSections: {
        ...playerState.shipSections,
        [sectionName]: {
          ...playerState.shipSections[sectionName],
          allocatedShields: playerState.shipSections[sectionName].allocatedShields + 1
        }
      }
    };

    return {
      success: true,
      newPlayerState,
      newShieldsToAllocate: currentState.shieldsToAllocate - 1,
      sectionName,
      playerId
    };
  }

  /**
   * Process reset shield allocation
   * Resets all sections to 0 allocated shields and recalculates available shields
   * Used in ActionProcessor.processResetShields
   *
   * @param {Object} currentState - Current game state
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {Object} { success, newPlayerState, newShieldsToAllocate, playerId }
   */
  processResetShieldAllocation(currentState, playerId) {
    const playerState = currentState[playerId];
    const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;

    // Calculate effective stats to get shields per turn
    const effectiveStats = calculateEffectiveShipStats(playerState, placedSections);
    const totalShieldsPerTurn = effectiveStats.totals.shieldsPerTurn;

    // Reset all sections to their initial state (0 allocated shields)
    const resetShipSections = {};
    Object.keys(playerState.shipSections).forEach(sectionName => {
      resetShipSections[sectionName] = {
        ...playerState.shipSections[sectionName],
        allocatedShields: 0
      };
    });

    const newPlayerState = {
      ...playerState,
      shipSections: resetShipSections
    };

    return {
      success: true,
      newPlayerState,
      newShieldsToAllocate: totalShieldsPerTurn,
      playerId
    };
  }

  /**
   * Process end shield allocation phase
   * Finalizes allocation and transitions to next phase
   * Handles AI automatic allocation for opponent
   * Used in ActionProcessor (needs to be added)
   *
   * @param {Object} currentState - Current game state
   * @param {string} playerId - Player ending allocation (usually local player)
   * @param {Function} determineFirstPlayerFn - Function to determine first player
   * @returns {Object} { success, player1State, player2State, newPhase, firstPlayer }
   */
  processEndShieldAllocation(currentState, playerId, determineFirstPlayerFn) {
    const localPlayerId = playerId;
    const opponentPlayerId = localPlayerId === 'player1' ? 'player2' : 'player1';

    // Get current player states
    const localPlayerState = currentState[localPlayerId];
    const opponentPlayerState = currentState[opponentPlayerId];

    // Process AI shield allocation for opponent
    const opponentPlacedSections = opponentPlayerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;
    const opponentEffectiveStats = calculateEffectiveShipStats(opponentPlayerState, opponentPlacedSections);
    const opponentShieldsToAllocate = opponentEffectiveStats.totals.shieldsPerTurn;

    // AI shield allocation logic (round-robin style)
    const aiNewSections = JSON.parse(JSON.stringify(opponentPlayerState.shipSections));
    const aiSectionNames = Object.keys(aiNewSections);
    let remainingAIShields = opponentShieldsToAllocate;
    let sectionIndex = 0;
    let failsafe = 0;

    while (remainingAIShields > 0 && failsafe < 100) {
      const sectionName = aiSectionNames[sectionIndex % aiSectionNames.length];
      const section = aiNewSections[sectionName];

      // Get effective max shields for this section
      const effectiveMax = this.getEffectiveSectionMaxShields(sectionName, opponentPlayerState, opponentPlacedSections);

      if (section.allocatedShields < effectiveMax) {
        section.allocatedShields++;
        remainingAIShields--;
      }

      sectionIndex++;
      failsafe++;
    }

    const newOpponentPlayerState = {
      ...opponentPlayerState,
      shipSections: aiNewSections
    };

    // Determine first player using passed function
    const firstPlayer = determineFirstPlayerFn(
      currentState.turn,
      currentState.firstPlayerOverride,
      currentState.firstPasserOfPreviousRound
    );

    // Prepare result based on which player is which
    const result = {
      success: true,
      newPhase: 'deployment',
      firstPlayer: firstPlayer
    };

    // Set the correct player states
    if (localPlayerId === 'player1') {
      result.player1State = localPlayerState;
      result.player2State = newOpponentPlayerState;
    } else {
      result.player1State = newOpponentPlayerState;
      result.player2State = localPlayerState;
    }

    return result;
  }
}

// Export as singleton
export default new ShieldManager();
