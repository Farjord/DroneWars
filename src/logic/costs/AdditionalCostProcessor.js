import EffectRouter from '../EffectRouter.js';
import MovementEffectProcessor from '../effects/movement/MovementEffectProcessor.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * AdditionalCostProcessor
 * Handles execution of additional costs (exhaust drone, discard card, etc.)
 *
 * Design: Reuses effect processors to execute costs - no code duplication
 */
class AdditionalCostProcessor {
  constructor() {
    this.effectRouter = new EffectRouter();
    this.movementProcessor = new MovementEffectProcessor();
  }

  /**
   * Execute an additional cost
   *
   * @param {Object} additionalCost - Cost definition from card
   * @param {Object} costSelection - Selected cost target(s)
   * @param {string} actingPlayerId - Player paying the cost
   * @param {Object} playerStates - Current game state
   * @param {Object} callbacks - Game callbacks
   * @param {Object} placedSections - Ship sections for aura updates
   * @returns {Object} { newPlayerStates, animationEvents }
   */
  executeCost(additionalCost, costSelection, actingPlayerId, playerStates, callbacks, placedSections) {
    debugLog('ADDITIONAL_COST', '💰 AdditionalCostProcessor: executeCost started', {
      costType: additionalCost.type,
      costSelection,
      actingPlayerId
    });

    const costType = additionalCost.type;

    // Special handling for movement costs
    if (costType === 'SINGLE_MOVE' || costType === 'MULTI_MOVE') {
      debugLog('ADDITIONAL_COST', '🚚 Executing movement cost', {
        costType,
        droneId: costSelection.drone?.id,
        sourceLane: costSelection.sourceLane,
        toLane: costSelection.toLane
      });

      const result = this.executeMovementCost(additionalCost, costSelection, actingPlayerId, playerStates, callbacks, placedSections);

      debugLog('ADDITIONAL_COST', '✅ Movement cost executed', {
        stateChanged: result.newPlayerStates !== playerStates,
        animationEventCount: result.animationEvents.length
      });

      return result;
    }

    // Special handling for discard costs
    if (costType === 'DISCARD_CARD') {
      debugLog('ADDITIONAL_COST', '🗑️ Executing discard cost', {
        cardId: costSelection.card?.id,
        cardName: costSelection.card?.name,
        cardCost: costSelection.card?.cost
      });

      const result = this.executeDiscardCost(costSelection, actingPlayerId, playerStates);

      debugLog('ADDITIONAL_COST', '✅ Discard cost executed', {
        stateChanged: result.newPlayerStates !== playerStates
      });

      return result;
    }

    // General case: Convert cost to effect and route through effect system
    debugLog('ADDITIONAL_COST', '⚙️ Executing cost via effect router', {
      costType,
      targetId: costSelection.target?.id,
      targetOwner: costSelection.owner
    });

    const costAsEffect = {
      type: costType,
      // Additional properties from cost definition
      ...additionalCost
    };

    // Enrich target with owner info from costSelection
    const enrichedTarget = {
      ...costSelection.target,
      owner: costSelection.owner  // Include owner from costSelection
    };

    const context = {
      target: enrichedTarget,
      actingPlayerId,
      playerStates,
      callbacks,
      card: { name: 'Additional Cost' }  // Dummy card for logging
    };

    const result = this.effectRouter.routeEffect(costAsEffect, context);

    debugLog('ADDITIONAL_COST', '✅ Cost executed via effect router', {
      costType,
      stateChanged: result.newPlayerStates !== playerStates,
      animationEventCount: result.animationEvents?.length || 0
    });

    return {
      newPlayerStates: result.newPlayerStates,
      animationEvents: result.animationEvents || []
    };
  }

  /**
   * Execute movement cost (SINGLE_MOVE or MULTI_MOVE)
   */
  executeMovementCost(additionalCost, costSelection, actingPlayerId, playerStates, callbacks, placedSections) {
    const { sourceLane, toLane, drone } = costSelection;

    // Clone player states (don't mutate original)
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    // Calculate opponent player ID
    const opponentPlayerId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    const movementEffect = {
      type: additionalCost.type,
      properties: additionalCost.properties || []
    };

    // Create card object for movement processor
    const card = {
      name: 'Movement Cost',
      effect: movementEffect
    };

    // Create context with all required properties
    const context = {
      actingPlayerId,
      playerStates: newPlayerStates,
      card,
      placedSections,
      callbacks,
      target: drone,
      fromLane: sourceLane,
      toLane: toLane,
      selectedDrone: drone
    };

    // Call movement processor with all 8 parameters
    let result;
    if (additionalCost.type === 'SINGLE_MOVE') {
      result = this.movementProcessor.executeSingleMove(
        card,              // 1. Card object
        drone,             // 2. Drone to move
        sourceLane,        // 3. From lane
        toLane,            // 4. To lane
        actingPlayerId,    // 5. Acting player
        newPlayerStates,   // 6. Cloned player states
        opponentPlayerId,  // 7. Opponent player ID
        context            // 8. Execution context
      );
    } else {
      // MULTI_MOVE - similar pattern
      result = this.movementProcessor.executeMultiMove(
        card,
        [drone],  // Array of drones
        sourceLane,
        toLane,
        actingPlayerId,
        newPlayerStates,
        opponentPlayerId,
        context
      );
    }

    // Normalize return value to match expected structure
    // Movement animations are handled elsewhere, so return empty array
    return {
      newPlayerStates: result.newPlayerStates,
      animationEvents: []
    };
  }

  /**
   * Execute discard cost
   */
  executeDiscardCost(costSelection, actingPlayerId, playerStates) {
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    const actingPlayerState = newPlayerStates[actingPlayerId];
    const cardToDiscard = costSelection.card;

    // Remove card from hand
    const cardIndex = actingPlayerState.hand.findIndex(c => c.id === cardToDiscard.id);
    if (cardIndex !== -1) {
      actingPlayerState.hand.splice(cardIndex, 1);
      actingPlayerState.discardPile.push(cardToDiscard);

      debugLog('ADDITIONAL_COST', '🗑️ Card discarded as cost', {
        cardName: cardToDiscard.name,
        cardCost: cardToDiscard.cost
      });
    }

    return {
      newPlayerStates,
      animationEvents: [
        {
          type: 'CARD_DISCARD',
          playerId: actingPlayerId,
          cardId: cardToDiscard.id,
          cardName: cardToDiscard.name
        }
      ]
    };
  }

  /**
   * Get cost value for dynamic effects (e.g., "buff equal to discarded card's cost")
   *
   * @param {Object} costSelection - Selected cost
   * @returns {number} Cost value
   */
  getCostValue(costSelection) {
    if (costSelection.type === 'DISCARD_CARD') {
      return costSelection.card.cost;
    }
    // Future: support other cost value types
    return 0;
  }
}

export default AdditionalCostProcessor;
