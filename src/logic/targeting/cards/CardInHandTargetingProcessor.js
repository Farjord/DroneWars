import BaseTargetingProcessor from '../BaseTargetingProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * CardInHandTargetingProcessor
 * Handles targeting cards in the acting player's hand
 *
 * Used for cards with additional costs that require discarding a card from hand
 */
class CardInHandTargetingProcessor extends BaseTargetingProcessor {
  /**
   * Process CARD_IN_HAND targeting
   *
   * @param {Object} context - Targeting context
   * @param {string} context.actingPlayerId - Player performing targeting
   * @param {Object} context.player1 - Player 1 state
   * @param {Object} context.player2 - Player 2 state
   * @param {Object} context.definition - Card/ability definition
   * @param {string} context.playingCardId - ID of card being played (to exclude from targets)
   * @returns {Array} Array of valid card targets from hand
   */
  process(context) {
    this.logProcessStart(context);

    const { actingPlayerId, definition, playingCardId } = context;
    const { affinity } = definition.targeting;
    const actingPlayerState = this.getActingPlayerState(context);

    // Cards in hand are always friendly
    if (affinity !== 'FRIENDLY') {
      debugLog('TARGETING', '⚠️ CARD_IN_HAND must use affinity: FRIENDLY');
      this.logProcessComplete(context, []);
      return [];
    }

    // Return all cards in hand except the card being played
    // (The card being played is already selected and shouldn't be targetable)
    const cardsInHand = actingPlayerState.hand || [];
    const excludeCardId = playingCardId;

    const targets = cardsInHand
      .filter(card => card.id !== excludeCardId)
      .map(card => ({
        id: card.id,
        name: card.name,
        cost: card.cost,
        type: 'card',
        owner: actingPlayerId,
        // Include full card object for cost value calculations
        card: card
      }));

    this.logProcessComplete(context, targets);
    return targets;
  }
}

export default CardInHandTargetingProcessor;
