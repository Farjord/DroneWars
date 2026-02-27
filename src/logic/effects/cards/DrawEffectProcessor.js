// ========================================
// DRAW EFFECT PROCESSOR
// ========================================
// Handles DRAW effect type - drawing cards from deck to hand
// Automatically reshuffles discard pile into deck when empty

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import TriggerProcessor from '../../triggers/TriggerProcessor.js';
import { TRIGGER_TYPES } from '../../triggers/triggerConstants.js';

/**
 * DrawEffectProcessor - Handles card drawing
 * Behavior:
 * - Draws N cards from deck to hand (where N = effect.value)
 * - If deck is empty, reshuffles discard pile into deck
 * - If both deck and discard are empty, stops drawing
 */
class DrawEffectProcessor extends BaseEffectProcessor {
  /**
   * Process DRAW effect
   *
   * @param {Object} effect - Effect configuration with value property
   * @param {number} effect.value - Number of cards to draw
   * @param {Object} context - Effect execution context
   * @param {string} context.actingPlayerId - Player drawing cards
   * @param {Object} context.playerStates - Current player states
   * @returns {Object} Result with updated player states
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates } = context;

    // Clone player states to prevent mutations
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const actingPlayerState = this.getActingPlayerState(newPlayerStates, actingPlayerId);

    // Work with copies of deck, hand, and discard pile
    let newDeck = [...actingPlayerState.deck];
    let newHand = [...actingPlayerState.hand];
    let newDiscard = [...actingPlayerState.discardPile];

    const initialDeckSize = newDeck.length;
    const initialHandSize = newHand.length;
    let reshuffled = false;

    // Draw the specified number of cards
    for (let i = 0; i < effect.value; i++) {
      // If deck is empty, reshuffle discard pile
      if (newDeck.length === 0) {
        if (newDiscard.length > 0) {
          // Shuffle discard pile into deck
          newDeck = [...newDiscard].sort(() => 0.5 - Math.random());
          newDiscard = [];
          reshuffled = true;
        } else {
          // No more cards available - stop drawing
          break;
        }
      }

      // Draw one card from deck to hand
      const drawn = newDeck.pop();
      newHand.push(drawn);
    }

    // Update player state with new deck, hand, and discard
    actingPlayerState.deck = newDeck;
    actingPlayerState.hand = newHand;
    actingPlayerState.discardPile = newDiscard;

    const actualCardsDrawn = newHand.length - initialHandSize;
    if (actualCardsDrawn > 0) {
      const logCallback = context.callbacks?.logCallback || null;
      const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';
      const triggerProcessor = new TriggerProcessor();
      const drawResult = triggerProcessor.fireTrigger(TRIGGER_TYPES.ON_CARD_DRAWN, {
        lane: null,
        triggeringPlayerId: actingPlayerId,
        actingPlayerId,
        playerStates: newPlayerStates,
        placedSections: context.placedSections,
        logCallback,
        scalingAmount: actualCardsDrawn
      });
      if (drawResult.triggered) {
        newPlayerStates[actingPlayerId] = drawResult.newPlayerStates[actingPlayerId];
        newPlayerStates[opponentId] = drawResult.newPlayerStates[opponentId];
      }
    }

    const result = this.createResult(newPlayerStates);

    this.logProcessComplete(effect, result, context);

    return result;
  }
}

export default DrawEffectProcessor;
