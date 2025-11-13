// ========================================
// SEARCH AND DRAW EFFECT PROCESSOR
// ========================================
// Handles SEARCH_AND_DRAW card effects
// - Filtered searches (search entire deck for matching cards)
// - Unfiltered searches (search top X cards)
// - needsCardSelection pattern for human players
// - AI auto-selection for single-player mode

import BaseEffectProcessor from '../BaseEffectProcessor.js';

/**
 * SearchAndDrawProcessor - Handles SEARCH_AND_DRAW card effects
 *
 * Effect Properties:
 * - searchCount: Number of cards to search
 * - drawCount: Number of cards player can select
 * - filter: Optional filter object (type, cost, effectType, name)
 * - shuffleAfter: Whether to shuffle deck after search
 *
 * Returns needsCardSelection for human players or executes immediately for AI
 */
class SearchAndDrawProcessor extends BaseEffectProcessor {
  /**
   * Process SEARCH_AND_DRAW effect
   *
   * @param {Object} effect - Effect configuration
   * @param {number} effect.searchCount - Number of cards to search
   * @param {number} effect.drawCount - Number of cards to select
   * @param {Object} effect.filter - Optional filter criteria
   * @param {boolean} effect.shuffleAfter - Whether to shuffle deck after
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with needsCardSelection or executed state
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, placedSections, localPlayerId = 'player1', gameMode = 'local' } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);

    const targetPlayerId = actingPlayerId || 'player1';
    const actingPlayerState = newPlayerStates[targetPlayerId];
    let newDeck = [...actingPlayerState.deck];
    let newDiscard = [...actingPlayerState.discardPile];

    // Handle filtered vs unfiltered searches
    let searchedCards, remainingDeck;

    if (effect.filter) {
      // Filtered search - search entire deck for matching cards
      if (newDeck.length === 0 && newDiscard.length > 0) {
        // Shuffle discard into deck if needed
        newDeck = [...newDiscard.sort(() => 0.5 - Math.random())];
        newDiscard = [];
      }

      // Find all cards matching the filter
      const matchingCards = newDeck.filter(card => this.cardMatchesFilter(card, effect.filter));

      // Take up to searchCount matching cards
      searchedCards = matchingCards.slice(0, effect.searchCount);

      // Remove found cards from deck
      remainingDeck = newDeck.filter(card => !searchedCards.includes(card));
    } else {
      // Unfiltered search - search top X cards
      const cardsNeeded = effect.searchCount;
      if (newDeck.length < cardsNeeded && newDiscard.length > 0) {
        // Shuffle discard into deck if needed
        newDeck = [...newDeck, ...newDiscard.sort(() => 0.5 - Math.random())];
        newDiscard = [];
      }

      // Get the top cards for searching
      searchedCards = newDeck.slice(-effect.searchCount).reverse(); // Top cards in correct order
      remainingDeck = newDeck.slice(0, -effect.searchCount);
    }

    // Determine if this is an AI player
    // In single-player (gameMode === 'local'), only player2 is AI
    // In multiplayer, both players are human and need card selection UI
    const isAI = gameMode === 'local' && targetPlayerId === 'player2';

    // For AI players (single-player player2 only), automatically select the best cards
    if (isAI) {
      const selectedCards = this.selectBestCardsForAI(searchedCards, effect.drawCount, newPlayerStates, placedSections);
      const unselectedCards = searchedCards.filter(card => !selectedCards.includes(card));

      // Add selected cards to hand
      const newHand = [...actingPlayerState.hand, ...selectedCards];

      // Return unselected cards to top of deck in original order
      let finalDeck = [...remainingDeck, ...unselectedCards];

      // Shuffle if required
      if (effect.shuffleAfter) {
        finalDeck = finalDeck.sort(() => 0.5 - Math.random());
      }

      newPlayerStates[targetPlayerId] = {
        ...actingPlayerState,
        deck: finalDeck,
        hand: newHand,
        discardPile: newDiscard
      };

      const result = this.createResult(newPlayerStates);
      this.logProcessComplete(effect, result, context);
      return result;
    } else {
      // For human players (local or remote), return data for modal selection
      const result = {
        newPlayerStates: playerStates, // Don't change state yet
        additionalEffects: [],
        needsCardSelection: {
          type: 'search_and_draw',
          searchedCards: searchedCards,
          drawCount: effect.drawCount,
          shuffleAfter: effect.shuffleAfter,
          remainingDeck: remainingDeck,
          discardPile: newDiscard,
          filter: effect.filter
        }
      };
      this.logProcessComplete(effect, result, context);
      return result;
    }
  }

  /**
   * Check if a card matches the given filter criteria
   *
   * @param {Object} card - Card to check
   * @param {Object} filter - Filter criteria
   * @returns {boolean} True if card matches filter
   */
  cardMatchesFilter(card, filter) {
    // Type filtering (e.g., 'Upgrade', 'Action', 'Drone')
    if (filter.type && card.type !== filter.type) {
      return false;
    }

    // Cost filtering (e.g., maxCost: 3)
    if (filter.maxCost !== undefined && card.cost > filter.maxCost) {
      return false;
    }

    if (filter.minCost !== undefined && card.cost < filter.minCost) {
      return false;
    }

    // Effect type filtering (e.g., 'DAMAGE', 'HEAL')
    if (filter.effectType && card.effect?.type !== filter.effectType) {
      return false;
    }

    // Name filtering (for specific card searches)
    if (filter.name && card.name !== filter.name) {
      return false;
    }

    // More filters can be added here as needed
    return true;
  }

  /**
   * Select best cards for AI player
   *
   * @param {Array} availableCards - Cards available for selection
   * @param {number} drawCount - Number of cards to select
   * @param {Object} playerStates - Current player states
   * @param {Object} placedSections - Placed ship sections
   * @returns {Array} Selected cards
   */
  selectBestCardsForAI(availableCards, drawCount, playerStates, placedSections) {
    // Simple AI selection logic - can be enhanced later
    const scoredCards = availableCards.map(card => ({
      card,
      score: this.evaluateCardForAI(card, playerStates.player2, playerStates.player1, placedSections)
    }));

    return scoredCards
      .sort((a, b) => b.score - a.score)
      .slice(0, drawCount)
      .map(item => item.card);
  }

  /**
   * Evaluate a card's value for AI player
   *
   * @param {Object} card - Card to evaluate
   * @param {Object} aiState - AI player state
   * @param {Object} humanState - Human player state
   * @param {Object} placedSections - Placed ship sections
   * @returns {number} Card score (higher is better)
   */
  evaluateCardForAI(card, aiState, humanState, placedSections) {
    let score = 0;

    // Base affordability check
    if (card.cost > aiState.energy) {
      return -100; // Can't afford it
    }

    // Basic scoring by effect type
    switch (card.effect?.type) {
      case 'DAMAGE':
        score = 15 + (card.effect.value || 0) * 3;
        break;
      case 'DRAW':
        score = 12 + (card.effect.value || 0) * 2;
        break;
      case 'GAIN_ENERGY':
        score = 8 + (card.effect.value || 0) * 2;
        break;
      case 'HEAL_HULL':
        score = 10;
        break;
      case 'DESTROY':
        score = 20;
        break;
      default:
        score = 5; // Base value for unknown cards
    }

    // Prefer lower cost cards for efficiency
    score -= card.cost;

    return score;
  }
}

export default SearchAndDrawProcessor;
