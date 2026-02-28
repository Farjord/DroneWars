// ========================================
// HAND LIMIT MANAGER
// ========================================
// Handles hand limit enforcement and discard phases
// Extracted from gameLogic.js Phase 9.6

import { debugLog } from '../../utils/debugLogger.js';

/**
 * HandLimitManager
 * Manages hand size limits and discard mechanics
 *
 * Key responsibilities:
 * - Check hand limit violations for both players
 * - Enforce mandatory hand limits (auto-discard)
 * - Process voluntary discard phases
 *
 * This is a stateless singleton - all methods are pure functions
 * that transform state without side effects.
 */
class HandLimitManager {
  /**
   * Check hand limit violations for both players
   * Pure function that determines if either player needs to discard
   *
   * @param {Object} playerStates - { player1: playerState, player2: playerState }
   * @param {Object} effectiveStats - { player1: stats, player2: stats }
   * @returns {Object} Violation information for both players
   */
  checkHandLimitViolations(playerStates, effectiveStats) {
    const violations = {};

    for (const playerId of ['player1', 'player2']) {
      const playerState = playerStates[playerId];
      const stats = effectiveStats[playerId];

      const hasViolation = playerState.hand.length > stats.totals.handLimit;
      const discardCount = hasViolation ? playerState.hand.length - stats.totals.handLimit : 0;

      violations[playerId] = {
        needsDiscard: hasViolation,
        discardCount: discardCount,
        currentHandSize: playerState.hand.length,
        handLimit: stats.totals.handLimit
      };
    }

    violations.hasAnyViolations = violations.player1.needsDiscard || violations.player2.needsDiscard;

    return violations;
  }

  /**
   * Enforce hand limits by automatically discarding excess cards
   * Used for mandatory discard phase and AI execution
   *
   * Pure function that returns new player state with hand limit enforced
   *
   * @param {Object} playerState - Current player state
   * @param {number} handLimit - Maximum allowed hand size
   * @param {Object} [rng=null] - Optional SeededRandom instance for deterministic discard
   * @returns {Object} New player state with enforced hand limit
   */
  enforceHandLimits(playerState, handLimit, rng = null) {
    if (playerState.hand.length <= handLimit) {
      return {
        ...playerState,
        discardCount: 0
      };
    }

    const newHand = [...playerState.hand];
    const newDiscardPile = [...playerState.discardPile];
    const discardCount = newHand.length - handLimit;

    // Randomly discard excess cards
    for (let i = 0; i < discardCount; i++) {
      if (newHand.length > 0) {
        const randomIndex = rng
          ? rng.randomInt(0, newHand.length)
          : Math.floor(Math.random() * newHand.length);
        const cardToDiscard = newHand.splice(randomIndex, 1)[0];
        newDiscardPile.push(cardToDiscard);
      }
    }

    return {
      ...playerState,
      hand: newHand,
      discardPile: newDiscardPile,
      discardCount: discardCount
    };
  }

  /**
   * Process discard phase for a player
   * Handles both voluntary (human selection) and random discarding
   *
   * Pure function that handles voluntary card discarding
   *
   * @param {Object} playerState - Current player state
   * @param {number} discardCount - Number of cards to discard
   * @param {Array} cardsToDiscard - Optional specific cards to discard
   * @param {Object} [rng=null] - Optional SeededRandom instance for deterministic discard
   * @returns {Object} New player state after discarding
   */
  processDiscardPhase(playerState, discardCount, cardsToDiscard = null, rng = null) {
    if (discardCount <= 0) {
      return {
        ...playerState,
        discardCount: 0
      };
    }

    const newHand = [...playerState.hand];
    const newDiscardPile = [...playerState.discardPile];
    let actualDiscardCount = 0;

    if (cardsToDiscard && cardsToDiscard.length > 0) {
      // Discard specific cards
      cardsToDiscard.forEach(card => {
        const cardIndex = newHand.findIndex(handCard =>
          handCard.instanceId === card.instanceId ||
          (handCard.name === card.name && handCard.id === card.id)
        );

        if (cardIndex !== -1 && actualDiscardCount < discardCount) {
          const discardedCard = newHand.splice(cardIndex, 1)[0];
          newDiscardPile.push(discardedCard);
          actualDiscardCount++;
        }
      });
    } else {
      // Random discard if no specific cards provided
      for (let i = 0; i < discardCount && newHand.length > 0; i++) {
        const randomIndex = rng
          ? rng.randomInt(0, newHand.length)
          : Math.floor(Math.random() * newHand.length);
        const cardToDiscard = newHand.splice(randomIndex, 1)[0];
        newDiscardPile.push(cardToDiscard);
        actualDiscardCount++;
      }
    }

    return {
      ...playerState,
      hand: newHand,
      discardPile: newDiscardPile,
      discardCount: actualDiscardCount
    };
  }
}

// Export singleton instance
export default new HandLimitManager();
