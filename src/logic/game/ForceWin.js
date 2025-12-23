// ========================================
// FORCE WIN - DEV FEATURE
// ========================================
// Allows developers to quickly win combat for testing
// extraction mode flows. Damages all opponent ship sections
// to trigger the natural win condition.

import winConditionChecker from './WinConditionChecker.js';

/**
 * Force a combat win by damaging all opponent ship sections.
 * This triggers the natural win condition check, ensuring the
 * full victory flow executes (WinnerModal, loot generation, etc.)
 *
 * @param {Object} params
 * @param {Object} params.player1State - Player 1's current state
 * @param {Object} params.player2State - Player 2's (opponent) current state
 * @param {Function} params.updatePlayerState - Function to update player state
 * @param {Object} params.callbacks - Win condition callbacks
 * @param {Function} params.callbacks.logCallback - Function to log game events
 * @param {Function} params.callbacks.setWinnerCallback - Function to set winner
 * @param {Function} params.callbacks.showWinnerModalCallback - Function to show winner modal
 */
export function forceWinCombat({ player1State, player2State, updatePlayerState, callbacks }) {
  // Log the dev action
  callbacks.logCallback({
    player: 'SYSTEM',
    actionType: 'DEV_ACTION',
    source: 'Force Win',
    target: 'Opponent Ship',
    outcome: 'All opponent ship sections destroyed (DEV)'
  }, 'forceWin');

  // Create damaged opponent state with all sections at hull = 0
  const damagedShipSections = {
    bridge: {
      ...player2State.shipSections.bridge,
      hull: 0
    },
    powerCell: {
      ...player2State.shipSections.powerCell,
      hull: 0
    },
    droneControlHub: {
      ...player2State.shipSections.droneControlHub,
      hull: 0
    }
  };

  // Update opponent's player state
  updatePlayerState('player2', {
    shipSections: damagedShipSections
  });

  // Create updated player2 state for win condition check
  const updatedPlayer2State = {
    ...player2State,
    shipSections: damagedShipSections
  };

  // Trigger win condition check with updated states
  winConditionChecker.checkGameStateForWinner(
    {
      player1: player1State,
      player2: updatedPlayer2State
    },
    callbacks
  );
}
