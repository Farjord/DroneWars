// ========================================
// CARD DRAWING UTILITIES
// ========================================
// Standalone utility functions for card drawing phase logic
// Handles automatic card drawing, hand limits, and deck management

/**
 * Calculate the hand limit for a player based on their ship section stats
 * @param {Object} playerState - Player's current state
 * @param {Object} shipStats - Effective ship stats (from ship sections)
 * @returns {number} Maximum number of cards the player can hold
 */
export const calculateHandLimit = (playerState, shipStats) => {
  // Default hand limit is typically based on bridge stats
  // Ship stats should include 'Draw' property for hand limit
  const baseHandLimit = shipStats?.totals?.Draw || 5; // Default to 5 if not specified

  console.log(`📋 Calculated hand limit: ${baseHandLimit} for player ${playerState.name}`);
  return baseHandLimit;
};

/**
 * Reshuffle discard pile into deck when deck is empty
 * @param {Object} playerState - Player's current state
 * @returns {Object} Updated player state with reshuffled deck
 */
export const reshuffleDiscardIntoDeck = (playerState) => {
  if (playerState.deck.length > 0) {
    // Deck still has cards, no reshuffling needed
    return playerState;
  }

  if (playerState.discardPile.length === 0) {
    // Both deck and discard are empty - can't draw
    console.warn(`⚠️ ${playerState.name} has no cards left to draw (deck and discard both empty)`);
    return playerState;
  }

  // Reshuffle discard pile into deck
  const shuffledDeck = [...playerState.discardPile].sort(() => 0.5 - Math.random());

  console.log(`🔄 ${playerState.name} reshuffled ${shuffledDeck.length} cards from discard pile into deck`);

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
 * @returns {Object} Updated player state with drawn cards
 */
export const drawCardsForPlayer = (playerState, cardCount) => {
  if (cardCount <= 0) {
    return playerState;
  }

  let updatedPlayer = { ...playerState };

  // Reshuffle if needed
  updatedPlayer = reshuffleDiscardIntoDeck(updatedPlayer);

  // Calculate how many cards we can actually draw
  const availableCards = updatedPlayer.deck.length;
  const actualDrawCount = Math.min(cardCount, availableCards);

  if (actualDrawCount === 0) {
    console.warn(`⚠️ ${playerState.name} cannot draw any cards (no cards available)`);
    return updatedPlayer;
  }

  // Draw cards from deck to hand
  const drawnCards = updatedPlayer.deck.slice(0, actualDrawCount);
  const remainingDeck = updatedPlayer.deck.slice(actualDrawCount);
  const newHand = [...updatedPlayer.hand, ...drawnCards];

  console.log(`🃏 ${playerState.name} drew ${actualDrawCount} cards: ${drawnCards.map(c => c.name).join(', ')}`);

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
 * @returns {Object} Updated game state after drawing
 */
export const performAutomaticDraw = (gameState) => {
  console.log('🃏 Starting automatic draw phase for both players');

  // We need to calculate effective stats for hand limits
  // For now, use a default hand limit - this should be enhanced with actual ship stats
  const defaultHandLimit = 5;

  let updatedGameState = { ...gameState };
  const drawResults = {
    player1: { drawnCards: [] },
    player2: { drawnCards: [] }
  };

  // Process player1
  const player1HandLimit = defaultHandLimit; // TODO: Calculate based on ship stats
  const player1CardsToDraw = Math.max(0, player1HandLimit - gameState.player1.hand.length);

  if (player1CardsToDraw > 0) {
    const validation1 = validateDrawOperation(gameState.player1, player1CardsToDraw);
    if (validation1.success) {
      const oldHandSize = gameState.player1.hand.length;
      updatedGameState.player1 = drawCardsForPlayer(gameState.player1, player1CardsToDraw);
      // Extract the newly drawn cards
      drawResults.player1.drawnCards = updatedGameState.player1.hand.slice(oldHandSize);
    } else {
      console.warn(`Player 1 draw validation failed: ${validation1.message}`);
    }
  } else {
    console.log(`🃏 Player 1 already at hand limit (${gameState.player1.hand.length}/${player1HandLimit})`);
  }

  // Process player2
  const player2HandLimit = defaultHandLimit; // TODO: Calculate based on ship stats
  const player2CardsToDraw = Math.max(0, player2HandLimit - gameState.player2.hand.length);

  if (player2CardsToDraw > 0) {
    const validation2 = validateDrawOperation(gameState.player2, player2CardsToDraw);
    if (validation2.success) {
      const oldHandSize = gameState.player2.hand.length;
      updatedGameState.player2 = drawCardsForPlayer(gameState.player2, player2CardsToDraw);
      // Extract the newly drawn cards
      drawResults.player2.drawnCards = updatedGameState.player2.hand.slice(oldHandSize);
    } else {
      console.warn(`Player 2 draw validation failed: ${validation2.message}`);
    }
  } else {
    console.log(`🃏 Player 2 already at hand limit (${gameState.player2.hand.length}/${player2HandLimit})`);
  }

  console.log('✅ Automatic draw phase completed');

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

  console.log(`📊 ${playerState.name}: ${currentHandSize}/${handLimit} cards, needs ${cardsToDraw} more`);

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