// ========================================
// FIRST PLAYER DETERMINATION UTILITIES
// ========================================
// Standalone utility functions for first player determination logic
// Handles first player selection based on turn number and previous round data

import { debugLog } from './debugLogger.js';

/**
 * Determine who goes first this round
 * @param {number} turn - Current turn number
 * @param {string|null} firstPlayerOverride - Override for first player (if any)
 * @param {string|null} firstPasserOfPreviousRound - Who passed first in previous round
 * @returns {string} Player ID who goes first ('player1' or 'player2')
 */
export const determineFirstPlayer = (turn, firstPlayerOverride, firstPasserOfPreviousRound) => {
  debugLog('PHASE_TRANSITIONS', `🎯 Determining first player for turn ${turn}`, {
    firstPlayerOverride,
    firstPasserOfPreviousRound
  });

  // Check for override first
  if (firstPlayerOverride) {
    debugLog('PHASE_TRANSITIONS', `✅ Using first player override: ${firstPlayerOverride}`);
    return firstPlayerOverride;
  }

  // First turn - random selection
  if (turn === 1) {
    const randomFirstPlayer = Math.random() < 0.5 ? 'player1' : 'player2';
    debugLog('PHASE_TRANSITIONS', `🎲 Turn 1: Random first player selected: ${randomFirstPlayer}`);
    return randomFirstPlayer;
  }

  // Subsequent turns - first passer from previous round goes first
  const firstPlayer = firstPasserOfPreviousRound || 'player1';
  debugLog('PHASE_TRANSITIONS', `📋 Turn ${turn}: First passer from previous round goes first: ${firstPlayer}`);
  return firstPlayer;
};

/**
 * Get the reason text for why a player was chosen to go first
 * @param {number} turn - Current turn number
 * @param {string|null} firstPlayerOverride - Override for first player (if any)
 * @param {string|null} firstPasserOfPreviousRound - Who passed first in previous round
 * @returns {string} Explanation text
 */
export const getFirstPlayerReasonText = (turn, firstPlayerOverride, firstPasserOfPreviousRound) => {
  if (firstPlayerOverride) {
    return "First player was set by game effect.";
  }

  if (turn === 1) {
    return "The first player is determined randomly for the first round.";
  }

  return `The first player is ${firstPasserOfPreviousRound ? 'the player who passed first last round' : 'determined by previous round results'}.`;
};

/**
 * Process first player determination and return game state updates
 * @param {Object} gameState - Current game state
 * @returns {Object} Updated game state and effects
 */
export const processFirstPlayerDetermination = (gameState) => {
  debugLog('PHASE_TRANSITIONS', '🎯 Processing first player determination');

  const firstPlayer = determineFirstPlayer(
    gameState.turn,
    gameState.firstPlayerOverride,
    gameState.firstPasserOfPreviousRound
  );

  const reasonText = getFirstPlayerReasonText(
    gameState.turn,
    gameState.firstPlayerOverride,
    gameState.firstPasserOfPreviousRound
  );

  // Prepare state updates
  const stateUpdates = {
    currentPlayer: firstPlayer,
    firstPlayerOfRound: firstPlayer
  };

  // Clear override if it was used
  if (gameState.firstPlayerOverride) {
    stateUpdates.firstPlayerOverride = null;
  }

  // passInfo reset is handled by GameFlowManager at round boundaries

  const result = {
    stateUpdates,
    firstPlayer,
    reasonText,
    effects: {
      showFirstPlayerModal: true,
      modalData: {
        firstPlayer,
        reasonText
      }
    }
  };

  debugLog('PHASE_TRANSITIONS', '✅ First player determination completed:', result);
  return result;
};

/**
 * Validate first player determination inputs
 * @param {Object} gameState - Current game state
 * @returns {Object} Validation result
 */
export const validateFirstPlayerDetermination = (gameState) => {
  if (!gameState) {
    return {
      success: false,
      error: 'Game state is required for first player determination'
    };
  }

  if (typeof gameState.turn !== 'number' || gameState.turn < 1) {
    return {
      success: false,
      error: 'Invalid turn number for first player determination'
    };
  }

  return {
    success: true,
    message: 'First player determination inputs are valid'
  };
};