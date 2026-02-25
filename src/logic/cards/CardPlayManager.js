// ========================================
// CARD PLAY MANAGER
// ========================================
// Handles card play orchestration and completion
// Extracted from gameLogic.js Phase 9.11 (Final Cleanup)

import EffectRouter from '../EffectRouter.js';
import ConditionalEffectProcessor from '../effects/conditional/ConditionalEffectProcessor.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * CardPlayManager
 * Orchestrates card play resolution from start to finish
 *
 * Key responsibilities:
 * - Pay card costs (energy, hand discard)
 * - Route card effects through EffectRouter
 * - Handle card selection requirements (SEARCH_AND_DRAW, MOVE effects)
 * - Generate card reveal and visual effect animations
 * - Complete card play (discard, go-again logic)
 *
 * This is a stateless singleton - all methods are pure orchestration functions
 * that coordinate between effect processors without side effects.
 */
class CardPlayManager {
  constructor() {
    this.effectRouter = new EffectRouter();
    this.conditionalProcessor = new ConditionalEffectProcessor();
  }

  /**
   * Pay card costs (energy)
   *
   * Pure function that deducts card cost from acting player's energy.
   * Note: Card discard is handled in finishCardPlay() to ensure proper timing.
   *
   * @param {Object} card - Card being played
   * @param {string} actingPlayerId - 'player1' or 'player2'
   * @param {Object} playerStates - { player1, player2 }
   * @returns {Object} New player states with costs paid
   */
  payCardCosts(card, actingPlayerId, playerStates) {
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const actingPlayerState = newPlayerStates[actingPlayerId];

    // Pay energy cost
    if (card.cost) {
      actingPlayerState.energy -= card.cost;
    }

    // Pay momentum cost (if card has one)
    if (card.momentumCost) {
      actingPlayerState.momentum = (actingPlayerState.momentum || 0) - card.momentumCost;
      debugLog('CARD_PLAY', `💫 Momentum cost paid: ${card.momentumCost}`, {
        cardName: card.name,
        oldMomentum: actingPlayerState.momentum + card.momentumCost,
        newMomentum: actingPlayerState.momentum
      });
    }

    // Note: Card discard is now handled in finishCardPlay() to ensure proper timing
    // with card selection effects

    return newPlayerStates;
  }

  /**
   * Resolve card play
   *
   * Main orchestration function that:
   * 1. Logs the card play action
   * 2. Determines if card needs player selection
   * 3. Pays costs (unless selection needed - costs paid after selection)
   * 4. Routes effect through resolveCardEffect → EffectRouter
   * 5. Generates animation events (CARD_REVEAL, CARD_VISUAL)
   * 6. Completes card play (if no selection needed)
   *
   * @param {Object} card - Card being played
   * @param {Object} target - Target drone/lane/section
   * @param {string} actingPlayerId - 'player1' or 'player2'
   * @param {Object} playerStates - { player1, player2 }
   * @param {Object} placedSections - Placed ship sections
   * @param {Object} callbacks - { logCallback, resolveAttackCallback }
   * @param {string} localPlayerId - Local player ID for UI checks (default 'player1')
   * @param {string} gameMode - 'local' or 'multiplayer' (default 'local')
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents, needsCardSelection }
   */
  resolveCardPlay(card, target, actingPlayerId, playerStates, placedSections, callbacks, localPlayerId = 'player1', gameMode = 'local') {
    const { logCallback, resolveAttackCallback } = callbacks;

    // Generate outcome message for logging
    const targetName = target ? (target.name || target.id) : 'N/A';
    let outcome = 'Card effect applied.';

    const effect = card.effects[0];
    if (effect.type === 'DRAW') outcome = `Drew ${effect.value} card(s).`;
    if (effect.type === 'GAIN_ENERGY') outcome = `Gained ${effect.value} energy.`;
    if (effect.type === 'HEAL_HULL') outcome = `Healed ${effect.value} hull on ${targetName}.`;
    if (effect.type === 'HEAL_SHIELDS') outcome = `Healed ${effect.value} shields on ${targetName}.`;
    if (effect.type === 'READY_DRONE') outcome = `Readied ${targetName}.`;
    if (effect.type === 'DAMAGE') {
      if (card.effects[0]?.targeting?.affectedFilter) {
        outcome = `Dealt ${effect.value} damage to filtered targets in ${targetName}.`;
      } else {
        outcome = `Dealt ${effect.value} damage to ${targetName}.`;
      }
    }
    if (effect.type === 'MODIFY_STAT') {
      const mod = effect.mod;
      const durationText = mod.type === 'temporary' ? ' until the end of the turn' : ' permanently';
      outcome = `Gave ${targetName} a ${mod.value > 0 ? '+' : ''}${mod.value} ${mod.stat} bonus${durationText}.`;
    }

    // Log the card play
    if (logCallback) {
      logCallback({
        player: playerStates[actingPlayerId].name,
        actionType: 'PLAY_CARD',
        source: card.name,
        target: targetName,
        outcome: outcome
      });
    }



    // Check if this card will need player selection (local human player only)
    // For these cards, costs will be paid after selection in the completion handler
    const willNeedSelection = actingPlayerId === localPlayerId && (
      card.effects[0].type === 'SEARCH_AND_DRAW' ||
      card.effects[0].type === 'SINGLE_MOVE' ||
      card.effects[0].type === 'MULTI_MOVE'
    );

    // Pay card costs first (unless card needs selection - costs will be paid after selection)
    let currentStates = willNeedSelection ? playerStates : this.payCardCosts(card, actingPlayerId, playerStates);

    // Build context for conditional processing
    const conditionalContext = {
      target,
      actingPlayerId,
      playerStates: currentStates,
      placedSections,
      callbacks,
      card,
      actionsTakenThisTurn: callbacks?.actionsTakenThisTurn || 0
    };

    // Process PRE conditionals (before primary effect)
    let effectToResolve = card.effects[0];
    let preAdditionalEffects = [];

    if (card.effects[0].conditionals && card.effects[0].conditionals.length > 0) {
      const preResult = this.conditionalProcessor.processPreConditionals(
        card.effects[0].conditionals,
        card.effects[0],
        conditionalContext
      );
      effectToResolve = preResult.modifiedEffect; // May have BONUS_DAMAGE applied
      currentStates = preResult.newPlayerStates;
      preAdditionalEffects = preResult.additionalEffects || [];

      debugLog('EFFECT_PROCESSING', '[CardPlayManager] PRE conditionals processed', {
        originalValue: card.effects[0]?.value,
        modifiedValue: effectToResolve?.value,
        additionalEffectsQueued: preAdditionalEffects.length
      });
    }

    // Resolve the primary effect (with PRE modifications applied)
    const result = this.resolveCardEffect(effectToResolve, target, actingPlayerId, currentStates, placedSections, callbacks, card, localPlayerId, gameMode);

    // Process POST conditionals (after primary effect)
    // Skip for movement cards - POST conditionals are processed after movement selection
    // after the player selects which drone to move
    let postAdditionalEffects = [];
    let dynamicGoAgain = false;
    const isMovementCard = card.effects[0]?.type === 'SINGLE_MOVE' || card.effects[0]?.type === 'MULTI_MOVE';

    if (!isMovementCard && card.effects[0]?.conditionals && card.effects[0].conditionals.length > 0) {
      const postContext = {
        ...conditionalContext,
        playerStates: result.newPlayerStates
      };

      const postResult = this.conditionalProcessor.processPostConditionals(
        card.effects[0].conditionals,
        postContext,
        result.effectResult || null
      );

      result.newPlayerStates = postResult.newPlayerStates;
      postAdditionalEffects = postResult.additionalEffects || [];
      dynamicGoAgain = postResult.grantsGoAgain || false;

      debugLog('EFFECT_PROCESSING', '[CardPlayManager] POST conditionals processed', {
        wasDestroyed: result.effectResult?.wasDestroyed,
        additionalEffectsQueued: postAdditionalEffects.length,
        grantsGoAgain: dynamicGoAgain
      });
    }

    // Pick up goAgain from effect processor results (e.g., Rally Beacon on AI movement)
    if (result.goAgain) {
      dynamicGoAgain = true;
    }

    // Merge all additional effects (from PRE, primary, and POST)
    const allAdditionalEffects = [
      ...preAdditionalEffects,
      ...(result.additionalEffects || []),
      ...postAdditionalEffects
    ];

    // Start with card visual event if card has one
    const allAnimationEvents = [];

    // Only add CARD_REVEAL animation if the card doesn't need additional selection
    // For cards requiring selection (MULTI_MOVE, SINGLE_MOVE, SEARCH_AND_DRAW), animation will be added after selection completes
    if (!result.needsCardSelection) {
      allAnimationEvents.push({
        type: 'CARD_REVEAL',
        cardId: card.id,
        cardName: card.name,
        cardData: card,  // Full card object for rendering
        targetPlayer: actingPlayerId,
        timestamp: Date.now()
      });
    }

    // Add card visual event second (plays before damage feedback)
    if (card.visualEffect && target) {
      // Determine target context
      let targetPlayer = null;
      let targetLane = null;
      let targetType = null;

      // Check if target is a lane (lane-scoped effects like 'lane1', 'lane2', 'lane3')
      if (target.id && (target.id === 'lane1' || target.id === 'lane2' || target.id === 'lane3')) {
        // Lane-targeted cards: Determine which player's lane based on targeting affinity
        const targetingAffinity = card.effects[0]?.targeting?.affinity || 'ANY';

        if (targetingAffinity === 'ENEMY') {
          // Offensive card targeting opponent's lane (e.g., Sidewinder Missiles)
          targetPlayer = actingPlayerId === 'player1' ? 'player2' : 'player1';
          targetLane = target.id;
          targetType = 'lane';
        } else if (targetingAffinity === 'ANY') {
          // Multi-target effect affecting both players (e.g., Nuke)
          // Use 'center' to indicate visual should show from middle
          targetPlayer = 'center';
          targetLane = target.id;
          targetType = 'lane';
        }

        // Add card visual for lane-targeted effects
        if (targetPlayer && targetType) {
          allAnimationEvents.push({
            type: 'CARD_VISUAL',
            cardId: card.id,
            cardName: card.name,
            visualType: card.visualEffect.type,
            sourceId: actingPlayerId === 'player1' ? 'player1-hand' : 'player2-hand',
            sourcePlayer: actingPlayerId,
            targetId: target.id,
            targetPlayer: targetPlayer,
            targetLane: targetLane,
            targetType: targetType,
            timestamp: Date.now()
          });
        }
      } else {
        // Check if target is a drone in either player's board
        for (const playerId of ['player1', 'player2']) {
          for (const laneKey in currentStates[playerId].dronesOnBoard) {
            if (currentStates[playerId].dronesOnBoard[laneKey].some(d => d.id === target.id)) {
              targetPlayer = playerId;
              targetLane = laneKey;
              targetType = 'drone';
              break;
            }
          }
          if (targetPlayer) break;
        }

        // Check if target is a ship section
        if (!targetPlayer) {
          for (const playerId of ['player1', 'player2']) {
            if (currentStates[playerId].shipSections[target.name] || currentStates[playerId].shipSections[target.id]) {
              targetPlayer = playerId;
              targetType = 'section';
              break;
            }
          }
        }

        // Only add card visual if we found a valid single target
        if (targetPlayer && targetType) {
          allAnimationEvents.push({
            type: 'CARD_VISUAL',
            cardId: card.id,
            cardName: card.name,
            visualType: card.visualEffect.type,
            sourceId: actingPlayerId === 'player1' ? 'player1-hand' : 'player2-hand',
            sourcePlayer: actingPlayerId,
            targetId: target.id,
            targetPlayer: targetPlayer,
            targetLane: targetLane,
            targetType: targetType,
            timestamp: Date.now()
          });
        }
      }
    }

    // Then add damage/effect events (play after card visual completes)
    if (result.animationEvents) {
      allAnimationEvents.push(...result.animationEvents);
    }

    // If no card selection is needed, complete the card play immediately
    if (!result.needsCardSelection) {
      const completion = this.finishCardPlay(card, actingPlayerId, result.newPlayerStates, dynamicGoAgain);
      return {
        newPlayerStates: completion.newPlayerStates,
        shouldEndTurn: completion.shouldEndTurn,
        additionalEffects: allAdditionalEffects,
        animationEvents: allAnimationEvents,
        needsCardSelection: false
      };
    }

    // If card selection is needed, return original state without costs paid
    // Costs will be paid in the completion handler after selection
    return {
      newPlayerStates: playerStates, // Original state - costs will be paid after selection
      shouldEndTurn: false, // Turn ending will be handled in finishCardPlay after selection
      additionalEffects: allAdditionalEffects,
      animationEvents: allAnimationEvents,
      needsCardSelection: result.needsCardSelection // Pass through card selection requirements
    };
  }

  /**
   * Complete card play
   *
   * Final cleanup after card effects and selections are complete:
   * 1. Remove card from hand
   * 2. Add card to discard pile
   * 3. Determine if turn should end (based on goAgain)
   *
   * @param {Object} card - Card that was played
   * @param {string} actingPlayerId - 'player1' or 'player2'
   * @param {Object} playerStates - { player1, player2 }
   * @param {boolean} dynamicGoAgain - Go again granted by POST conditional effects
   * @returns {Object} { newPlayerStates, shouldEndTurn }
   */
  finishCardPlay(card, actingPlayerId, playerStates, dynamicGoAgain = false) {
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const actingPlayerState = newPlayerStates[actingPlayerId];

    // Remove card from hand and add to discard pile (final cleanup)
    actingPlayerState.hand = actingPlayerState.hand.filter(c => c.instanceId !== card.instanceId);
    actingPlayerState.discardPile.push(card);

    // Determine if turn should end
    // Static goAgain from card definition OR dynamic goAgain from POST conditional
    const hasGoAgain = card.effects[0]?.goAgain || dynamicGoAgain;
    const shouldEndTurn = !hasGoAgain;

    return {
      newPlayerStates,
      shouldEndTurn
    };
  }

  /**
   * Resolve card effect
   *
   * Simple router that delegates to resolveSingleEffect.
   */
  resolveCardEffect(effect, target, actingPlayerId, playerStates, placedSections, callbacks, card = null, localPlayerId = 'player1', gameMode = 'local') {
    return this.resolveSingleEffect(effect, target, actingPlayerId, playerStates, placedSections, callbacks, card, localPlayerId, gameMode);
  }

  /**
   * Resolve single effect
   *
   * Routes effect through EffectRouter with fallback for non-extracted effects.
   */
  resolveSingleEffect(effect, target, actingPlayerId, playerStates, placedSections, callbacks, card = null, localPlayerId = 'player1', gameMode = 'local') {
    const context = { actingPlayerId, playerStates, placedSections, target, callbacks, card, localPlayerId, gameMode };
    const modularResult = this.effectRouter.routeEffect(effect, context);
    if (modularResult !== null) {
      return modularResult;
    }

    switch (effect.type) {
      case 'SINGLE_MOVE':
      case 'MULTI_MOVE':
        debugLog('CARD_PLAY', `Movement effect ${effect.type} reached fallback - should be handled by MovementEffectProcessor`);
        return { newPlayerStates: playerStates, additionalEffects: [] };
      default:
        debugLog('CARD_PLAY', `Unknown effect type: ${effect.type}`);
        return { newPlayerStates: playerStates, additionalEffects: [] };
    }
  }
}

// Export singleton instance
export default new CardPlayManager();
