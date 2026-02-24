// ========================================
// CARD DRAWING UTILITIES
// ========================================
// Standalone utility functions for card drawing phase logic
// Handles automatic card drawing, hand limits, and deck management

import GameDataService from '../services/GameDataService.js';
import { debugLog } from './debugLogger.js';
import SeededRandom from './seededRandom.js';

/**
 * Calculate the hand limit for a player based on their ship section stats
 * @param {Object} playerState - Player's current state
 * @param {Object} shipStats - Effective ship stats (from ship sections)
 * @returns {number} Maximum number of cards the player can hold
 */
/**
 * Reshuffle discard pile into deck when deck is empty
 * Uses seeded RNG for deterministic multiplayer synchronization
 * @param {Object} playerState - Player's current state
 * @param {Object} gameState - Full game state (for seeded RNG)
 * @param {string} playerId - Player ID ('player1' or 'player2')
 * @returns {Object} Updated player state with reshuffled deck
 */
export const reshuffleDiscardIntoDeck = (playerState, gameState, playerId) => {
  if (playerState.deck.length > 0) {
    // Deck still has cards, no reshuffling needed
    return playerState;
  }

  if (playerState.discardPile.length === 0) {
    // Both deck and discard are empty - can't draw
    debugLog('CARDS', `⚠️ ${playerState.name} has no cards left to draw (deck and discard both empty)`);
    return playerState;
  }

  // Use seeded RNG for deterministic shuffling
  const rng = SeededRandom.forCardShuffle(gameState, playerId);
  const shuffledDeck = rng.shuffle(playerState.discardPile);

  debugLog('CARDS', `🔄 ${playerState.name} reshuffled ${shuffledDeck.length} cards from discard pile into deck (deterministic)`);

  return {
    ...playerState,
    deck: shuffledDeck,
    discardPile: []
  };
};

/**
 * Draw cards for a single player
 * @param {Object} playerState - Player's current state
 * @param {number} cardCount - Number of cards to draw
 * @param {Object} gameState - Full game state (for seeded RNG)
 * @param {string} playerId - Player ID ('player1' or 'player2')
 * @returns {Object} Updated player state with drawn cards
 */
export const drawCardsForPlayer = (playerState, cardCount, gameState, playerId) => {
  if (cardCount <= 0) {
    return playerState;
  }

  let updatedPlayer = { ...playerState };

  // Reshuffle if needed (using seeded RNG)
  updatedPlayer = reshuffleDiscardIntoDeck(updatedPlayer, gameState, playerId);

  // Calculate how many cards we can actually draw
  const availableCards = updatedPlayer.deck.length;
  const actualDrawCount = Math.min(cardCount, availableCards);

  if (actualDrawCount === 0) {
    debugLog('CARDS', `⚠️ ${playerState.name} cannot draw any cards (no cards available)`);
    return updatedPlayer;
  }

  // Draw cards from deck to hand
  const drawnCards = updatedPlayer.deck.slice(0, actualDrawCount);
  const remainingDeck = updatedPlayer.deck.slice(actualDrawCount);
  const newHand = [...updatedPlayer.hand, ...drawnCards];

  debugLog('CARDS', `🃏 ${playerState.name} drew ${actualDrawCount} cards: ${drawnCards.map(c => c.name).join(', ')}`);

  return {
    ...updatedPlayer,
    hand: newHand,
    deck: remainingDeck
  };
};

/**
 * Validate that a draw operation is possible
 * @param {Object} playerState - Player's current state
 * @param {number} cardCount - Number of cards to draw
 * @returns {Object} Validation result with success flag and message
 */
export const validateDrawOperation = (playerState, cardCount) => {
  if (cardCount <= 0) {
    return { success: true, message: 'No cards to draw' };
  }

  const totalAvailable = playerState.deck.length + playerState.discardPile.length;

  if (totalAvailable === 0) {
    return {
      success: false,
      message: `${playerState.name} has no cards available to draw`
    };
  }

  if (cardCount > totalAvailable) {
    return {
      success: false,
      message: `${playerState.name} cannot draw ${cardCount} cards (only ${totalAvailable} available)`
    };
  }

  return { success: true, message: 'Draw operation valid' };
};

/**
 * Perform automatic draw phase for both players
 * @param {Object} gameState - Current game state
 * @param {Object} gameStateManager - GameStateManager instance for GameDataService
 * @returns {Object} Updated game state after drawing
 */
export const performAutomaticDraw = (gameState, gameStateManager = null) => {
  debugLog('CARDS', '🃏 Starting automatic draw phase for both players');

  // Create GameDataService instance for effective stats calculation
  let gameDataService = null;
  if (gameStateManager) {
    gameDataService = GameDataService.getInstance(gameStateManager);
  }

  let updatedGameState = { ...gameState };
  const drawResults = {
    player1: { drawnCards: [] },
    player2: { drawnCards: [] }
  };

  // Process both players with shared logic
  const playerConfigs = [
    { playerId: 'player1', label: 'Player 1', sections: gameState.placedSections },
    { playerId: 'player2', label: 'Player 2', sections: gameState.opponentPlacedSections }
  ];

  for (const { playerId, label, sections } of playerConfigs) {
    let handLimit = 5; // Default fallback
    if (gameDataService && sections) {
      try {
        const effectiveStats = gameDataService.getEffectiveShipStats(gameState[playerId], sections);
        handLimit = effectiveStats.totals.handLimit;
        debugLog('CARDS', `📊 ${label} effective hand limit: ${handLimit} (with placed sections: ${sections.join(', ')})`);
      } catch (error) {
        debugLog('CARDS', `⚠️ Failed to calculate ${label} effective stats, using default hand limit:`, error);
      }
    } else {
      debugLog('CARDS', `⚠️ GameDataService not available, using default hand limit for ${label}`);
    }

    const cardsToDraw = Math.max(0, handLimit - gameState[playerId].hand.length);

    if (cardsToDraw > 0) {
      const validation = validateDrawOperation(gameState[playerId], cardsToDraw);
      if (validation.success) {
        const oldHandSize = gameState[playerId].hand.length;
        updatedGameState[playerId] = drawCardsForPlayer(gameState[playerId], cardsToDraw, gameState, playerId);
        drawResults[playerId].drawnCards = updatedGameState[playerId].hand.slice(oldHandSize);
      } else {
        debugLog('CARDS', `⚠️ ${label} draw validation failed: ${validation.message}`);
      }
    } else {
      debugLog('CARDS', `🃏 ${label} already at hand limit (${gameState[playerId].hand.length}/${handLimit})`);
    }
  }

  debugLog('CARDS', '✅ Automatic draw phase completed');

  return {
    player1: updatedGameState.player1,
    player2: updatedGameState.player2,
    drawResults
  };
};

/**
 * Calculate cards to draw for a player to reach hand limit
 * @param {Object} playerState - Player's current state
 * @param {number} handLimit - Maximum hand size
 * @returns {number} Number of cards to draw
 */
export const calculateCardsToDraw = (playerState, handLimit) => {
  const currentHandSize = playerState.hand.length;
  const cardsToDraw = Math.max(0, handLimit - currentHandSize);

  debugLog('CARDS', `📊 ${playerState.name}: ${currentHandSize}/${handLimit} cards, needs ${cardsToDraw} more`);

  return cardsToDraw;
};

/**
 * Get draw phase summary for logging/debugging
 * @param {Object} gameState - Game state before draw
 * @param {Object} updatedState - Game state after draw
 * @returns {Object} Summary of what happened during draw phase
 */
export const getDrawPhaseSummary = (gameState, updatedState) => {
  const player1Before = gameState.player1.hand.length;
  const player1After = updatedState.player1.hand.length;
  const player1Drew = player1After - player1Before;

  const player2Before = gameState.player2.hand.length;
  const player2After = updatedState.player2.hand.length;
  const player2Drew = player2After - player2Before;

  return {
    player1: {
      before: player1Before,
      after: player1After,
      drew: player1Drew
    },
    player2: {
      before: player2Before,
      after: player2After,
      drew: player2Drew
    },
    totalCardsDrawn: player1Drew + player2Drew
  };
};