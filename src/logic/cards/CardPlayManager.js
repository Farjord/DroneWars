// ========================================
// CARD PLAY MANAGER
// ========================================
// Handles card play orchestration and completion
// Extracted from gameLogic.js Phase 9.11 (Final Cleanup)

import EffectRouter from '../EffectRouter.js';
import ConditionalEffectProcessor from '../effects/conditional/ConditionalEffectProcessor.js';
import AdditionalCostProcessor from '../costs/AdditionalCostProcessor.js';
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
    this.additionalCostProcessor = new AdditionalCostProcessor();
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

    const effect = card.effect;
    if (effect.type === 'DRAW') outcome = `Drew ${effect.value} card(s).`;
    if (effect.type === 'GAIN_ENERGY') outcome = `Gained ${effect.value} energy.`;
    if (effect.type === 'HEAL_HULL') outcome = `Healed ${effect.value} hull on ${targetName}.`;
    if (effect.type === 'HEAL_SHIELDS') outcome = `Healed ${effect.value} shields on ${targetName}.`;
    if (effect.type === 'READY_DRONE') outcome = `Readied ${targetName}.`;
    if (effect.type === 'DAMAGE') {
      if (effect.scope === 'FILTERED') {
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

    // NEW: Check if this card has additional costs requiring selection
    const hasAdditionalCost = card.additionalCost && actingPlayerId === localPlayerId;

    if (hasAdditionalCost) {
      debugLog('CARD_PLAY', '💰 Card has additional cost - entering multi-step flow', {
        cardName: card.name,
        costType: card.additionalCost.type
      });

      return {
        newPlayerStates: playerStates,  // No state changes yet
        needsAdditionalCostSelection: {
          card,
          phase: 'select_cost',
          costDefinition: card.additionalCost
        },
        shouldEndTurn: false,
        animationEvents: []
      };
    }

    // Check if this card will need player selection (local human player only)
    // For these cards, costs will be paid after selection in the completion handler
    const willNeedSelection = actingPlayerId === localPlayerId && (
      card.effect.type === 'SEARCH_AND_DRAW' ||
      card.effect.type === 'SINGLE_MOVE' ||
      card.effect.type === 'MULTI_MOVE'
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
    let effectToResolve = card.effect;
    let preAdditionalEffects = [];

    if (card.conditionalEffects && card.conditionalEffects.length > 0) {
      const preResult = this.conditionalProcessor.processPreConditionals(
        card.conditionalEffects,
        card.effect,
        conditionalContext
      );
      effectToResolve = preResult.modifiedEffect; // May have BONUS_DAMAGE applied
      currentStates = preResult.newPlayerStates;
      preAdditionalEffects = preResult.additionalEffects || [];

      debugLog('EFFECT_PROCESSING', '[CardPlayManager] PRE conditionals processed', {
        originalValue: card.effect?.value,
        modifiedValue: effectToResolve?.value,
        additionalEffectsQueued: preAdditionalEffects.length
      });
    }

    // Resolve the primary effect (with PRE modifications applied)
    const result = this.resolveCardEffect(effectToResolve, target, actingPlayerId, currentStates, placedSections, callbacks, card, localPlayerId, gameMode);

    // Process POST conditionals (after primary effect)
    // Skip for movement cards - POST conditionals are processed in processMovementCompletion
    // after the player selects which drone to move
    let postAdditionalEffects = [];
    let dynamicGoAgain = false;
    const isMovementCard = card.effect?.type === 'SINGLE_MOVE' || card.effect?.type === 'MULTI_MOVE';

    if (!isMovementCard && card.conditionalEffects && card.conditionalEffects.length > 0) {
      const postContext = {
        ...conditionalContext,
        playerStates: result.newPlayerStates
      };

      const postResult = this.conditionalProcessor.processPostConditionals(
        card.conditionalEffects,
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
        const targetingAffinity = card.targeting?.affinity || 'ANY';

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

    debugLog('CARDS', '[ANIMATION EVENTS] resolveCardPlay emitted:', allAnimationEvents);

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

    // Debug: Log card and hand state before filtering
    const handSizeBefore = actingPlayerState.hand.length;
    const handInstanceIds = actingPlayerState.hand.map(c => c.instanceId);
    debugLog('CARD_DISCARD', `🗑️ finishCardPlay called`, {
      cardName: card.name,
      cardInstanceId: card.instanceId,
      handSizeBefore,
      handInstanceIds,
      cardInstanceIdInHand: handInstanceIds.includes(card.instanceId)
    });

    // Remove card from hand and add to discard pile (final cleanup)
    actingPlayerState.hand = actingPlayerState.hand.filter(c => c.instanceId !== card.instanceId);
    actingPlayerState.discardPile.push(card);

    // Debug: Log hand state after filtering
    debugLog('CARD_DISCARD', `🗑️ finishCardPlay completed`, {
      cardName: card.name,
      handSizeAfter: actingPlayerState.hand.length,
      cardsRemoved: handSizeBefore - actingPlayerState.hand.length,
      discardPileSize: actingPlayerState.discardPile.length
    });

    // Determine if turn should end
    // Static goAgain from card definition OR dynamic goAgain from POST conditional
    const hasGoAgain = card.effect?.goAgain || dynamicGoAgain;
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
   *
   * @param {Object} effect - Effect definition
   * @param {Object} target - Target drone/lane/section
   * @param {string} actingPlayerId - 'player1' or 'player2'
   * @param {Object} playerStates - { player1, player2 }
   * @param {Object} placedSections - Placed ship sections
   * @param {Object} callbacks - Callback functions
   * @param {Object} card - Card being played (optional)
   * @param {string} localPlayerId - Local player ID (default 'player1')
   * @param {string} gameMode - 'local' or 'multiplayer' (default 'local')
   * @returns {Object} { newPlayerStates, animationEvents, needsCardSelection }
   */
  resolveCardEffect(effect, target, actingPlayerId, playerStates, placedSections, callbacks, card = null, localPlayerId = 'player1', gameMode = 'local') {
    // All effects now route through resolveSingleEffect (which delegates to EffectRouter)
    return this.resolveSingleEffect(effect, target, actingPlayerId, playerStates, placedSections, callbacks, card, localPlayerId, gameMode);
  }

  /**
   * Resolve single effect
   *
   * Routes effect through EffectRouter with fallback for non-extracted effects.
   * This is the main delegation point to effect processors.
   *
   * @param {Object} effect - Effect definition
   * @param {Object} target - Target drone/lane/section
   * @param {string} actingPlayerId - 'player1' or 'player2'
   * @param {Object} playerStates - { player1, player2 }
   * @param {Object} placedSections - Placed ship sections
   * @param {Object} callbacks - Callback functions
   * @param {Object} card - Card being played (optional)
   * @param {string} localPlayerId - Local player ID (default 'player1')
   * @param {string} gameMode - 'local' or 'multiplayer' (default 'local')
   * @returns {Object} { newPlayerStates, animationEvents, additionalEffects, needsCardSelection }
   */
  resolveSingleEffect(effect, target, actingPlayerId, playerStates, placedSections, callbacks, card = null, localPlayerId = 'player1', gameMode = 'local') {
    // Phase 1 & Phase 3 Refactoring: Try modular processor first
    const context = { actingPlayerId, playerStates, placedSections, target, callbacks, card, localPlayerId, gameMode };
    const modularResult = this.effectRouter.routeEffect(effect, context);
    if (modularResult !== null) {
      return modularResult; // Effect handled by modular processor
    }

    // Fallback to monolithic switch for non-extracted effects
    debugLog('EFFECT_FALLBACK', `⚠️ Falling back to monolithic switch for ${effect.type}`, {
      effectType: effect.type,
      actingPlayer: actingPlayerId,
      hasTarget: !!target,
      hasCard: !!card
    });

    switch (effect.type) {
      case 'SINGLE_MOVE':
      case 'MULTI_MOVE':
        // Note: These movement effects reference resolveMovementEffect which should be
        // imported from gameLogic.js if still needed, or handled by MovementEffectProcessor
        console.warn(`Movement effect ${effect.type} reached fallback - should be handled by MovementEffectProcessor`);
        return { newPlayerStates: playerStates, additionalEffects: [] };
      default:
        console.warn(`Unknown effect type: ${effect.type}`);
        return { newPlayerStates: playerStates, additionalEffects: [] };
    }
  }

  /**
   * Complete a card with additional cost after selections are made
   *
   * @param {Object} card - Card being played
   * @param {Object} costSelection - Selected cost target(s)
   * @param {Object} effectTarget - Selected effect target
   * @param {string} actingPlayerId - Player playing the card
   * @param {Object} playerStates - Current game state
   * @param {Object} placedSections - Ship sections
   * @param {Object} callbacks - Game callbacks
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents }
   */
  processAdditionalCostCardCompletion(card, costSelection, effectTarget, actingPlayerId, playerStates, placedSections, callbacks) {
    debugLog('ADDITIONAL_COST', '🎯 CardPlayManager: processAdditionalCostCardCompletion started', {
      cardName: card.name,
      costSelection,
      effectTargetId: effectTarget.id,
      actingPlayerId
    });

    let currentStates = playerStates;
    let allAnimationEvents = [];

    // Add CARD_REVEAL animation at the start
    allAnimationEvents.push({
      type: 'CARD_REVEAL',
      cardId: card.id,
      cardName: card.name,
      cardData: card,
      targetPlayer: actingPlayerId,
      timestamp: Date.now()
    });

    // Step 1: Pay energy cost
    debugLog('ADDITIONAL_COST', '💵 Step 1: Paying energy cost', {
      cardCost: card.cost,
      currentEnergy: currentStates[actingPlayerId].energy
    });

    if (card.cost) {
      currentStates = this.payCardCosts(card, actingPlayerId, currentStates);
      debugLog('ADDITIONAL_COST', '✅ Energy cost paid', {
        newEnergy: currentStates[actingPlayerId].energy
      });
    }

    // Step 2: Execute additional cost
    debugLog('ADDITIONAL_COST', '💰 Step 2: Executing additional cost', {
      costType: card.additionalCost.type,
      costSelection
    });

    const costResult = this.additionalCostProcessor.executeCost(
      card.additionalCost,
      costSelection,
      actingPlayerId,
      currentStates,
      callbacks,
      placedSections
    );

    debugLog('ADDITIONAL_COST', '✅ Additional cost executed', {
      stateChanged: costResult.newPlayerStates !== currentStates,
      animationEventCount: costResult.animationEvents.length
    });

    currentStates = costResult.newPlayerStates;
    allAnimationEvents.push(...costResult.animationEvents);

    // Step 3: Execute primary effect with cost context
    debugLog('ADDITIONAL_COST', '⚡ Step 3: Executing primary effect', {
      effectType: card.effect.type,
      effectTargetId: effectTarget?.id,
      hasCostContext: true
    });

    const costContext = {
      costSelection,
      costValue: this.additionalCostProcessor.getCostValue(costSelection)
    };

    // Replace dynamic value tokens with actual values
    let effectToProcess = card.effect;
    if (effectToProcess.mod && effectToProcess.mod.value === 'COST_CARD_VALUE') {
      effectToProcess = {
        ...effectToProcess,
        mod: {
          ...effectToProcess.mod,
          value: costContext.costValue
        }
      };
      debugLog('ADDITIONAL_COST', '🔄 Replaced COST_CARD_VALUE with actual value', {
        value: costContext.costValue
      });
    }

    const effectContext = {
      target: effectTarget,
      actingPlayerId,
      playerStates: currentStates,
      placedSections,
      callbacks,
      card,
      costSelection: costContext  // Pass cost context to effects
    };

    // Initialize effectResult outside if/else so it's available to code below
    let effectResult = null;

    // SPECIAL CASE: SINGLE_MOVE effects where effectTarget and destination are both known
    // For cards like "Forced Repositioning", the effect moves the selected enemy drone to the SAME lane as the cost destination
    if (effectToProcess.type === 'SINGLE_MOVE' && effectTarget && costSelection.toLane) {
      debugLog('ADDITIONAL_COST', '✅ Effect target and destination both known, executing movement directly', {
        drone: effectTarget.id,
        droneName: effectTarget.name,
        fromLane: costSelection.sourceLane,  // Effect drone comes from cost source lane
        toLane: costSelection.toLane         // Effect drone goes to cost destination lane
      });

      // Build context for movement execution
      const opponentPlayerId = actingPlayerId === 'player1' ? 'player2' : 'player1';
      const moveContext = {
        callbacks,
        placedSections
      };

      // Create card object with processed effect
      const cardWithProcessedEffect = {
        ...card,
        effect: effectToProcess
      };

      // Execute the movement directly
      const moveResult = this.additionalCostProcessor.movementProcessor.executeSingleMove(
        cardWithProcessedEffect,
        effectTarget,
        costSelection.sourceLane,  // Source: where cost drone was
        costSelection.toLane,      // Destination: where cost drone moved to
        actingPlayerId,
        currentStates,
        opponentPlayerId,
        moveContext
      );

      debugLog('ADDITIONAL_COST', '✅ Effect movement executed', {
        stateChanged: moveResult.newPlayerStates !== currentStates,
        animationEventCount: 0  // moveResult doesn't have animationEvents
      });

      currentStates = moveResult.newPlayerStates;
      // Note: moveResult doesn't have animationEvents property, so don't push it

      // Create effectResult compatible structure for code below
      effectResult = {
        newPlayerStates: moveResult.newPlayerStates,
        animationEvents: [],  // Movement doesn't generate animation events
        effectResult: moveResult.effectResult,  // Pass through for POST conditionals
        goAgain: card.effect.goAgain || false  // Check card effect for goAgain
      };
    } else {
      // Normal effect execution (for effects that don't have all info yet)
      effectResult = this.resolveCardEffect(effectToProcess, effectTarget, actingPlayerId, currentStates, placedSections, callbacks, card);

      debugLog('ADDITIONAL_COST', '✅ Primary effect executed', {
        stateChanged: effectResult.newPlayerStates !== currentStates,
        animationEventCount: effectResult.animationEvents?.length || 0,
        needsSelection: !!effectResult.needsCardSelection
      });

      // If effect needs card selection (e.g., movement without full info), return selection requirement
      if (effectResult.needsCardSelection) {
        debugLog('ADDITIONAL_COST', '🔄 Effect needs card selection - returning to UI', {
          selectionType: effectResult.needsCardSelection.type,
          phase: effectResult.needsCardSelection.phase
        });

        return {
          needsEffectSelection: {
            card,
            costSelection,
            effect: effectToProcess,
            effectTarget,
            selectionData: effectResult.needsCardSelection,
            currentStates: currentStates,  // Preserve state from cost execution
            allAnimationEvents: allAnimationEvents,  // Preserve animations so far
            placedSections  // Preserve placed sections
          },
          success: false,  // Not complete yet
          shouldContinue: true  // Signal caller to handle multi-step
        };
      }

      currentStates = effectResult.newPlayerStates;
      allAnimationEvents.push(...(effectResult.animationEvents || []));
    }

    // Step 4: Process POST conditionals
    if (card.conditionalEffects && card.conditionalEffects.length > 0) {
      debugLog('ADDITIONAL_COST', '🔀 Step 4: Processing POST conditionals', {
        conditionalCount: card.conditionalEffects.length
      });

      const postResult = this.conditionalProcessor.processPostConditionals(
        card.conditionalEffects,
        effectContext,
        effectResult.effectResult || null
      );

      debugLog('ADDITIONAL_COST', '✅ POST conditionals processed', {
        stateChanged: postResult.newPlayerStates !== currentStates
      });

      currentStates = postResult.newPlayerStates;
      allAnimationEvents.push(...(postResult.animationEvents || []));
    }

    // Step 5: Finish card play
    debugLog('ADDITIONAL_COST', '🏁 Step 5: Finishing card play', {
      goAgain: effectResult.goAgain || false
    });

    const finishResult = this.finishCardPlay(card, actingPlayerId, currentStates, effectResult.goAgain || false);

    debugLog('ADDITIONAL_COST', '✅ Card play finished', {
      shouldEndTurn: finishResult.shouldEndTurn,
      totalAnimationEvents: allAnimationEvents.length
    });

    return {
      newPlayerStates: finishResult.newPlayerStates,
      shouldEndTurn: finishResult.shouldEndTurn,
      animationEvents: allAnimationEvents
    };
  }

  /**
   * Complete additional cost card effect selection
   *
   * Called when user has completed selecting the target for an additional cost card's
   * primary effect (e.g., selecting which drone to move for Forced Repositioning)
   *
   * @param {Object} selectionContext - Context from needsEffectSelection
   * @param {Object} effectSelection - User's selection (e.g., { drone, fromLane, toLane })
   * @param {Object} callbacks - UI callbacks
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents }
   */
  completeAdditionalCostEffectSelection(selectionContext, effectSelection, callbacks) {
    const { card, costSelection, effect, currentStates, allAnimationEvents, placedSections } = selectionContext;
    const actingPlayerId = effectSelection.playerId;
    const opponentPlayerId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    debugLog('ADDITIONAL_COST_EFFECT_FLOW', '🎯 CardPlayManager: completeAdditionalCostEffectSelection ENTRY', {
      cardName: card.name,
      effectType: effect.type,
      selectionType: effectSelection.type,
      droneId: effectSelection.drone?.id,
      fromLane: effectSelection.fromLane,
      toLane: effectSelection.toLane
    });

    debugLog('ADDITIONAL_COST', '🎯 Completing effect selection', {
      cardName: card.name,
      effectType: effect.type,
      selectionType: effectSelection.type
    });

    let finalStates = currentStates;

    // Build context object for movement methods
    const context = {
      callbacks,
      placedSections
    };

    // Execute the effect with the user's selection
    if (effect.type === 'SINGLE_MOVE') {
      debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   🔵 Executing SINGLE_MOVE effect', {
        droneId: effectSelection.drone.id,
        fromLane: effectSelection.fromLane,
        toLane: effectSelection.toLane
      });

      const moveResult = this.movementProcessor.executeSingleMove(
        card,  // Pass full card object
        effectSelection.drone,
        effectSelection.fromLane,
        effectSelection.toLane,
        actingPlayerId,
        finalStates,
        opponentPlayerId,
        context
      );

      debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   ✅ Movement executed', {
        stateChanged: moveResult.newPlayerStates !== finalStates,
        animationCount: moveResult.animationEvents?.length || 0
      });

      finalStates = moveResult.newPlayerStates;
      allAnimationEvents.push(...(moveResult.animationEvents || []));
    } else if (effect.type === 'MULTI_MOVE') {
      debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   🔵 Executing MULTI_MOVE effect', {
        droneCount: effectSelection.drones?.length,
        fromLane: effectSelection.fromLane,
        toLane: effectSelection.toLane
      });

      const moveResult = this.movementProcessor.executeMultiMove(
        card,  // Pass full card object
        effectSelection.drones,
        effectSelection.fromLane,
        effectSelection.toLane,
        actingPlayerId,
        finalStates,
        opponentPlayerId,
        context
      );

      debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   ✅ Movement executed', {
        stateChanged: moveResult.newPlayerStates !== finalStates,
        animationCount: moveResult.animationEvents?.length || 0
      });

      finalStates = moveResult.newPlayerStates;
      allAnimationEvents.push(...(moveResult.animationEvents || []));
    }
    // Add other effect types as needed

    // Process POST conditionals if present
    if (card.conditionalEffects && card.conditionalEffects.length > 0) {
      debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   🔀 Processing POST conditionals');
      debugLog('ADDITIONAL_COST', '🔀 Processing POST conditionals after effect selection');

      const effectContext = {
        target: effectSelection.target || effectSelection.drone,
        actingPlayerId,
        playerStates: finalStates,
        placedSections: placedSections || {},
        callbacks,
        card,
        costSelection: { costSelection, costValue: this.additionalCostProcessor.getCostValue(costSelection) }
      };

      const postResult = this.conditionalProcessor.processPostConditionals(
        card.conditionalEffects,
        effectContext,
        null  // effectResult from primary effect
      );

      debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   ✅ POST conditionals processed');

      finalStates = postResult.newPlayerStates;
      allAnimationEvents.push(...(postResult.animationEvents || []));
    }

    // Finish card play
    debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   🏁 Finishing card play');
    debugLog('ADDITIONAL_COST', '🏁 Finishing card play after effect selection');
    const finishResult = this.finishCardPlay(card, actingPlayerId, finalStates, false);

    debugLog('ADDITIONAL_COST_EFFECT_FLOW', '✅ CardPlayManager complete', {
      shouldEndTurn: finishResult.shouldEndTurn,
      totalAnimations: allAnimationEvents.length
    });

    return {
      newPlayerStates: finishResult.newPlayerStates,
      shouldEndTurn: finishResult.shouldEndTurn,
      animationEvents: allAnimationEvents
    };
  }
}

// Export singleton instance
export default new CardPlayManager();
