// ========================================
// DRAW THEN DISCARD EFFECT PROCESSOR
// ========================================
// Handles DRAW_THEN_DISCARD effect type
// Used by Bridge ship ability "Recalculate"
// Composite effect that draws cards then prompts for discard
//
// PATTERN: Multi-step UI selection (like SEARCH_AND_DRAW)
// - Immediately executes DRAW effect
// - Returns needsDiscardSelection for human players
// - Auto-discards for AI players

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';
import DrawEffectProcessor from './DrawEffectProcessor.js';

/**
 * Processor for DRAW_THEN_DISCARD effect type
 *
 * A composite effect that:
 * 1. Immediately draws specified number of cards
 * 2. Prompts player to discard specified number of cards
 *
 * Supports:
 * - Human player UI selection (needsDiscardSelection pattern)
 * - AI auto-discard (evaluates worst cards)
 * - Separate draw/discard counts (flexible values)
 *
 * Used by Bridge ship ability "Recalculate"
 *
 * @extends BaseEffectProcessor
 */
class DrawThenDiscardProcessor extends BaseEffectProcessor {
  /**
   * Process DRAW_THEN_DISCARD effect
   *
   * @param {Object} effect - Effect definition
   * @param {string} effect.type - Must be 'DRAW_THEN_DISCARD'
   * @param {Object} effect.value - { draw: number, discard: number }
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player performing action
   * @param {Object} context.playerStates - Current player states
   * @param {string} context.localPlayerId - Local human player ID
   * @param {string} context.gameMode - 'local' or 'host' or 'guest'
   * @returns {Object} Result { newPlayerStates, needsDiscardSelection? } or full result for AI
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, localPlayerId = 'player1', gameMode = 'local' } = context;
    let currentStates = this.clonePlayerStates(playerStates);

    debugLog('EFFECT_PROCESSING', `[DRAW_THEN_DISCARD] ${actingPlayerId} executing draw-then-discard`, {
      drawCount: effect.value.draw,
      discardCount: effect.value.discard,
      isAI: gameMode === 'local' && actingPlayerId === 'player2'
    });

    // Step 1: Execute DRAW effect immediately
    const drawProcessor = new DrawEffectProcessor();
    const drawResult = drawProcessor.process(
      { type: 'DRAW', value: effect.value.draw },
      { ...context, playerStates: currentStates }
    );

    // Update states with drawn cards
    currentStates = drawResult.newPlayerStates;
    const actingPlayerState = currentStates[actingPlayerId];

    debugLog('EFFECT_PROCESSING', `[DRAW_THEN_DISCARD] Drew ${effect.value.draw} cards, hand size now: ${actingPlayerState.hand.length}`);

    // Step 2: Determine if AI or human
    const isAI = gameMode === 'local' && actingPlayerId === 'player2';

    if (isAI) {
      // AI auto-discards worst cards
      debugLog('EFFECT_PROCESSING', `[DRAW_THEN_DISCARD] AI auto-discarding ${effect.value.discard} worst cards`);

      for (let i = 0; i < effect.value.discard; i++) {
        if (actingPlayerState.hand.length === 0) break;

        // Find worst card to discard (lowest energy cost first, then lowest overall value)
        const cardToDiscard = this.selectWorstCard(actingPlayerState.hand);

        // Remove from hand and add to discard pile
        actingPlayerState.hand = actingPlayerState.hand.filter(c => c.instanceId !== cardToDiscard.instanceId);
        actingPlayerState.discardPile.push(cardToDiscard);

        debugLog('EFFECT_PROCESSING', `[DRAW_THEN_DISCARD] AI discarded: ${cardToDiscard.name}`);
      }

      const result = this.createResult(currentStates);
      this.logProcessComplete(effect, result, context);
      return result;
    } else {
      // Human player needs UI selection
      debugLog('EFFECT_PROCESSING', `[DRAW_THEN_DISCARD] Human player needs to select ${effect.value.discard} cards to discard`);

      const result = {
        newPlayerStates: currentStates, // State with drawn cards already applied
        additionalEffects: [],
        needsDiscardSelection: effect.value.discard // Number of cards to discard
      };

      this.logProcessComplete(effect, result, context);
      return result;
    }
  }

  /**
   * Select worst card from hand for AI discard
   * Priority: Lowest energy cost, then lowest impact
   *
   * @private
   * @param {Array} hand - Array of cards in hand
   * @returns {Object} Card to discard
   */
  selectWorstCard(hand) {
    if (hand.length === 0) return null;
    if (hand.length === 1) return hand[0];

    // Sort by energy cost (ascending), then by card value heuristic
    const sorted = [...hand].sort((a, b) => {
      // Prioritize discarding 0-cost cards
      if (a.cost.energy !== b.cost.energy) {
        return a.cost.energy - b.cost.energy;
      }

      // For same cost, prefer discarding cards with simpler effects
      const valueA = this.estimateCardValue(a);
      const valueB = this.estimateCardValue(b);
      return valueA - valueB;
    });

    return sorted[0];
  }

  /**
   * Rough heuristic for card value (for AI discard selection)
   * Higher value = better card, keep it
   *
   * @private
   * @param {Object} card - Card to evaluate
   * @returns {number} Estimated value score
   */
  estimateCardValue(card) {
    let value = 0;

    // Cards with goAgain are more valuable
    if (card.effects[0].goAgain) value += 10;

    // Damage/attack cards are valuable
    if (card.effects[0].type === 'DAMAGE' || card.effects[0].type === 'ATTACK') {
      value += (card.effects[0].value || 0) * 2;
    }

    // Healing is valuable
    if (card.effects[0].type === 'HEAL_HULL' || card.effects[0].type === 'HEAL_SHIELDS') {
      value += (card.effects[0].value || 0) * 1.5;
    }

    // Stat modifications are moderately valuable
    if (card.effects[0].type === 'MODIFY_STAT') {
      value += 5;
    }

    // Draw/energy generation is valuable
    if (card.effects[0].type === 'DRAW' || card.effects[0].type === 'GAIN_ENERGY') {
      value += (card.effects[0].value || 0) * 3;
    }

    return value;
  }
}

export default DrawThenDiscardProcessor;
