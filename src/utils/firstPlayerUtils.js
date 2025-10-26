// ========================================
// FIRST PLAYER DETERMINATION UTILITIES
// ========================================
// Standalone utility functions for first player determination logic
// Handles first player selection based on turn number and previous round data

import { debugLog } from './debugLogger.js';
import { SeededRandom } from './seededRandom.js';

/**
 * Determine who goes first this round
 * @param {Object} gameState - Current game state (used for seeded randomization)
 * @returns {string} Player ID who goes first ('player1' or 'player2')
 */
export const determineFirstPlayer = (gameState) => {
  const turn = gameState.turn;
  const roundNumber = gameState.roundNumber;
  const firstPlayerOverride = gameState.firstPlayerOverride;
  const firstPasserOfPreviousRound = gameState.firstPasserOfPreviousRound;

  debugLog('FIRST_PLAYER', `🎯 Determining first player for round ${roundNumber}`, {
    turn,
    roundNumber,
    firstPlayerOverride,
    firstPasserOfPreviousRound,
    gameSeed: gameState.gameSeed
  });

  // Check for override first
  if (firstPlayerOverride) {
    debugLog('FIRST_PLAYER', `✅ Using first player override: ${firstPlayerOverride}`);
    return firstPlayerOverride;
  }

  // First round - seeded random selection (ensures Host and Guest pick same player)
  if (roundNumber === 1) {
    const gameSeed = gameState.gameSeed || 12345; // Fallback for tests
    const rng = new SeededRandom(gameSeed);  // Use base game seed directly for determinism
    const randomValue = rng.random();
    const randomFirstPlayer = randomValue < 0.5 ? 'player1' : 'player2';
    debugLog('FIRST_PLAYER', `🎲 Round 1: Seeded random first player determination`, {
      gameSeed,
      randomValue,
      calculation: `${randomValue} < 0.5 ? 'player1' : 'player2'`,
      result: randomFirstPlayer,
      gameMode: gameState.gameMode
    });
    return randomFirstPlayer;
  }

  // Subsequent rounds - first passer from previous round goes first
  const firstPlayer = firstPasserOfPreviousRound || 'player1';
  debugLog('FIRST_PLAYER', `📋 Round ${roundNumber}: First passer from previous round goes first: ${firstPlayer}`);
  return firstPlayer;
};

/**
 * Get the reason text for why a player was chosen to go first
 * @param {Object} gameState - Current game state
 * @returns {string} Explanation text
 */
export const getFirstPlayerReasonText = (gameState) => {
  const roundNumber = gameState.roundNumber;
  const firstPlayerOverride = gameState.firstPlayerOverride;
  const firstPasserOfPreviousRound = gameState.firstPasserOfPreviousRound;

  if (firstPlayerOverride) {
    return "First player was set by game effect.";
  }

  if (roundNumber === 1) {
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
  debugLog('FIRST_PLAYER', '🎯 Processing first player determination');

  const firstPlayer = determineFirstPlayer(gameState);
  const reasonText = getFirstPlayerReasonText(gameState);

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

  debugLog('FIRST_PLAYER', '✅ First player determination completed:', result);
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