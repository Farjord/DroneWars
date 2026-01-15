// ========================================
// DISCARD EFFECT PROCESSOR
// ========================================
// Handles DISCARD effect type - forcing target player to discard cards
// Randomly removes cards from target player's hand to their discard pile

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * DiscardEffectProcessor - Handles forced discard
 *
 * Effect Type: DISCARD
 *
 * Behavior:
 * - Randomly removes N cards from target player's hand (where N = effect.count)
 * - Moves removed cards to target player's discard pile
 * - Defaults to targeting opponent
 * - Handles edge cases gracefully (empty hand, count exceeds hand size)
 */
class DiscardEffectProcessor extends BaseEffectProcessor {
  /**
   * Process DISCARD effect
   *
   * @param {Object} effect - Effect configuration
   * @param {number} effect.count - Number of cards to discard
   * @param {string} [effect.targetPlayer='opponent'] - Target player ('opponent' or 'self')
   * @param {Object} context - Effect execution context
   * @param {string} context.actingPlayerId - Player executing the effect
   * @param {Object} context.playerStates - Current player states
   * @returns {Object} Result with updated player states
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates } = context;

    // Clone player states to prevent mutations
    const newPlayerStates = this.clonePlayerStates(playerStates);

    // Determine target player (default to opponent)
    const targetPlayer = effect.targetPlayer || 'opponent';
    const targetPlayerId = targetPlayer === 'self'
      ? actingPlayerId
      : (actingPlayerId === 'player1' ? 'player2' : 'player1');

    const targetPlayerState = newPlayerStates[targetPlayerId];

    // Work with copies of hand and discard pile
    let newHand = [...targetPlayerState.hand];
    let newDiscard = [...targetPlayerState.discardPile];

    // Defensive: treat negative counts as 0
    const discardCount = Math.max(0, effect.count);

    // Calculate actual discard count (handle edge case: fewer cards than requested)
    const actualDiscardCount = Math.min(discardCount, newHand.length);

    // Randomly discard cards one at a time
    for (let i = 0; i < actualDiscardCount; i++) {
      // Select random index from remaining cards
      const randomIndex = Math.floor(Math.random() * newHand.length);

      // Remove card from hand and add to discard pile
      const discardedCard = newHand.splice(randomIndex, 1)[0];
      newDiscard.push(discardedCard);

      debugLog('EFFECT_PROCESSING', `[DISCARD] ${discardedCard.name} discarded from ${targetPlayerId}'s hand`, {
        cardId: discardedCard.id,
        cardName: discardedCard.name,
        targetPlayerId
      });
    }

    // Handle edge cases
    if (actualDiscardCount === 0 && discardCount > 0) {
      debugLog('EFFECT_PROCESSING', `[DISCARD] ⚠️ No cards to discard - ${targetPlayerId}'s hand is empty`, {
        requestedCount: discardCount,
        actualCount: 0,
        targetPlayerId
      });
    } else if (actualDiscardCount < discardCount) {
      debugLog('EFFECT_PROCESSING', `[DISCARD] ℹ️ Discarded ${actualDiscardCount} cards (requested ${discardCount}) - not enough cards in hand`, {
        requestedCount: discardCount,
        actualCount: actualDiscardCount,
        targetPlayerId
      });
    }

    // Update player state with new hand and discard pile
    targetPlayerState.hand = newHand;
    targetPlayerState.discardPile = newDiscard;

    const result = this.createResult(newPlayerStates);

    this.logProcessComplete(effect, result, context);

    return result;
  }
}

export default DiscardEffectProcessor;
