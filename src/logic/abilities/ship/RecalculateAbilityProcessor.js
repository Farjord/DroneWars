// ========================================
// RECALCULATE ABILITY PROCESSOR
// ========================================
// Handles the Recalculate ship ability (Bridge)
// Deduct energy, draw a card, then mandatory discard

import { debugLog } from '../../../utils/debugLogger.js';
import DrawEffectProcessor from '../../effects/cards/DrawEffectProcessor.js';

/**
 * RecalculateAbilityProcessor
 *
 * Flow:
 * 1. Player presses Recalculate → Confirmation modal
 * 2. Player confirms → Deduct energy + draw card
 * 3. Mandatory discard state (can do nothing else)
 * 4. Player selects card → Confirms discard → End turn
 *
 * This is a multi-step processor:
 * - process() - Deduct energy, draw card, return mandatoryAction
 * - complete() - Called after discard, ends turn
 */
class RecalculateAbilityProcessor {
  /**
   * Process the Recalculate ability (initial execution)
   *
   * @param {Object} payload - Action payload
   * @param {string} payload.sectionName - Ship section name (for logging)
   * @param {string} payload.playerId - Player ID
   * @param {Object} playerStates - Current game state { player1, player2 }
   * @param {string} localPlayerId - Local human player ID (for AI detection)
   * @param {string} gameMode - 'local', 'host', or 'guest'
   * @returns {Object} { newPlayerStates, mandatoryAction?, shouldEndTurn }
   */
  process(payload, playerStates, localPlayerId = 'player1', gameMode = 'local') {
    const { sectionName, playerId } = payload;

    debugLog('SHIP_ABILITY', `📊 RecalculateAbilityProcessor: ${playerId} using Recalculate`);

    // Deep clone player states
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const playerState = newPlayerStates[playerId];

    // Increment ship section ability activation counter for per-round limits
    if (playerState.shipSections?.[sectionName]) {
      playerState.shipSections[sectionName].abilityActivationCount =
        (playerState.shipSections[sectionName].abilityActivationCount || 0) + 1;
    }

    // Step 1: Deduct energy cost FIRST (1 energy)
    if (playerState.energy < 1) {
      debugLog('SHIP_ABILITY', '⚠️ RecalculateAbilityProcessor: Insufficient energy');
      return {
        newPlayerStates: playerStates, // Return original state
        shouldEndTurn: false,
        animationEvents: [],
        error: 'Insufficient energy'
      };
    }

    playerState.energy -= 1;
    debugLog('SHIP_ABILITY', `💰 RecalculateAbilityProcessor: Deducted 1 energy (${playerState.energy + 1} → ${playerState.energy})`);

    // Step 2: Draw 1 card
    const drawProcessor = new DrawEffectProcessor();
    const drawResult = drawProcessor.process(
      { type: 'DRAW', value: 1 },
      {
        actingPlayerId: playerId,
        playerStates: newPlayerStates,
        localPlayerId,
        gameMode
      }
    );

    // Update states with drawn cards
    const updatedPlayerStates = drawResult.newPlayerStates;
    const updatedPlayerState = updatedPlayerStates[playerId];

    debugLog('SHIP_ABILITY', `📥 RecalculateAbilityProcessor: Drew 1 card, hand size now: ${updatedPlayerState.hand.length}`);

    // Step 3: Determine if AI or human
    const isAI = gameMode === 'local' && playerId === 'player2';

    if (isAI) {
      // AI auto-discards worst card immediately
      debugLog('SHIP_ABILITY', `🤖 RecalculateAbilityProcessor: AI auto-discarding worst card`);

      if (updatedPlayerState.hand.length > 0) {
        // Find worst card to discard (lowest energy cost)
        const worstCard = this.selectWorstCard(updatedPlayerState.hand);

        // Remove from hand and add to discard pile
        updatedPlayerState.hand = updatedPlayerState.hand.filter(c => c.instanceId !== worstCard.instanceId);
        updatedPlayerState.discardPile.push(worstCard);

        debugLog('SHIP_ABILITY', `🗑️ RecalculateAbilityProcessor: AI discarded ${worstCard.name}`);
      }

      // AI completes in one step
      return {
        newPlayerStates: updatedPlayerStates,
        shouldEndTurn: true,
        animationEvents: []
      };
    } else {
      // Human player needs UI selection for discard
      debugLog('SHIP_ABILITY', `👤 RecalculateAbilityProcessor: Human player needs to select 1 card to discard`);

      return {
        newPlayerStates: updatedPlayerStates, // State with drawn card already applied
        mandatoryAction: {
          type: 'discard',
          player: playerId,
          count: 1,
          fromAbility: true,
          abilityName: 'Recalculate',
          sectionName: sectionName,
          actingPlayerId: playerId
        },
        shouldEndTurn: false, // Don't end turn yet - waiting for discard
        animationEvents: []
      };
    }
  }

  /**
   * Complete the Recalculate ability after mandatory discard
   * Called by App.jsx after the player confirms the discard
   *
   * @param {Object} payload - Completion payload
   * @param {Object} playerStates - Current game state after discard
   * @returns {Object} { newPlayerStates, shouldEndTurn: true }
   */
  complete(payload, playerStates) {
    const { playerId } = payload;

    debugLog('SHIP_ABILITY', `✅ RecalculateAbilityProcessor: Complete - ending turn for ${playerId}`);

    // No state changes needed - discard already processed
    // Just return shouldEndTurn: true
    return {
      newPlayerStates: playerStates,
      shouldEndTurn: true,
      animationEvents: []
    };
  }

  /**
   * Select the worst card from hand to discard (for AI)
   * Prioritizes lowest energy cost, then lowest overall value
   *
   * @param {Array} hand - Array of cards in hand
   * @returns {Object} Card to discard
   */
  selectWorstCard(hand) {
    if (hand.length === 0) return null;

    // Sort by energy cost (ascending), then by name (for consistency)
    const sorted = [...hand].sort((a, b) => {
      if (a.cost.energy !== b.cost.energy) {
        return a.cost.energy - b.cost.energy;
      }
      return a.name.localeCompare(b.name);
    });

    return sorted[0];
  }
}

// Export singleton instance
export default new RecalculateAbilityProcessor();
