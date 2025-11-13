// ========================================
// AURA MANAGER
// ========================================
// Handles aura effect updates and shield recalculation
// Extracted from gameLogic.js Phase 9.10 (Step 1)

import { calculateEffectiveStats } from '../statsCalculator.js';

/**
 * Update drone auras and recalculate shields
 *
 * When drones with aura abilities (e.g., Aegis Drone) are deployed/destroyed/moved,
 * this function recalculates all drones' effective stats and adjusts their shields.
 *
 * Key behavior:
 * - If maxShields increases (drone gains aura buff), add the difference to currentShields
 * - If maxShields decreases (drone loses aura buff), cap currentShields at new max
 *
 * Pure function that returns new dronesOnBoard object
 *
 * @param {Object} playerState - Current player state
 * @param {Object} opponentState - Opponent's player state
 * @param {Object} sections - Ship sections for stat calculations
 * @returns {Object} Updated dronesOnBoard object with recalculated shields
 */
export const updateAuras = (playerState, opponentState, sections) => {
  const newDronesOnBoard = JSON.parse(JSON.stringify(playerState.dronesOnBoard));

  for (const lane in newDronesOnBoard) {
    newDronesOnBoard[lane].forEach(drone => {
      const oldMaxShields = drone.currentMaxShields;
      const { maxShields: newMaxShields } = calculateEffectiveStats(
        drone,
        lane,
        playerState,
        opponentState,
        sections
      );

      // If max shields increased, grant bonus shields
      if (newMaxShields > oldMaxShields) {
        drone.currentShields += (newMaxShields - oldMaxShields);
      }

      // Update max and cap current shields
      drone.currentMaxShields = newMaxShields;
      drone.currentShields = Math.min(drone.currentShields, newMaxShields);
    });
  }

  return newDronesOnBoard;
};
