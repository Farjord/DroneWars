/**
 * EnhancerService.js
 * Handles card enhancement operations — consume N copies + credits to produce 1 enhanced version.
 * Starter cards can be enhanced for credits only (no copy requirement).
 */

import gameStateManager from '../../managers/GameStateManager.js';
import creditManager from './CreditManager.js';
import { ECONOMY } from '../../data/economyData.js';
import fullCardCollection from '../../data/cardData.js';
import { starterPoolCards } from '../../data/saveGameSchema.js';
import { debugLog } from '../../utils/debugLogger.js';

class EnhancerService {
  /**
   * Check if a card is a starter deck card
   */
  isStarterCard(cardId) {
    return starterPoolCards.includes(cardId);
  }

  /**
   * Get enhancement credit cost for a card by ID
   */
  getEnhancementCost(cardId) {
    const card = fullCardCollection.find(c => c.id === cardId);
    if (!card) {
      return ECONOMY.ENHANCEMENT_COSTS.Common;
    }
    const rarity = card.rarity || 'Common';
    return ECONOMY.ENHANCEMENT_COSTS[rarity] || ECONOMY.ENHANCEMENT_COSTS.Common;
  }

  /**
   * Get number of base copies required to enhance
   */
  getCopiesRequired(cardId) {
    const card = fullCardCollection.find(c => c.id === cardId);
    if (!card) {
      return ECONOMY.ENHANCEMENT_COPIES_REQUIRED.Common;
    }
    const rarity = card.rarity || 'Common';
    return ECONOMY.ENHANCEMENT_COPIES_REQUIRED[rarity] || ECONOMY.ENHANCEMENT_COPIES_REQUIRED.Common;
  }

  /**
   * Get the enhanced version of a base card, or null if none exists
   */
  getEnhancedVersion(baseCardId) {
    const enhancedId = baseCardId + '_ENHANCED';
    return fullCardCollection.find(c => c.id === enhancedId) || null;
  }

  /**
   * Check if a card can be enhanced
   * @returns {{ canEnhance: boolean, reason?: string }}
   */
  canEnhance(cardId) {
    // Cannot enhance a card that is already enhanced
    if (cardId.endsWith('_ENHANCED')) {
      return { canEnhance: false, reason: 'Card is already enhanced' };
    }

    // Must have an enhanced version defined
    if (!this.getEnhancedVersion(cardId)) {
      return { canEnhance: false, reason: 'No enhanced version available' };
    }

    const cost = this.getEnhancementCost(cardId);
    const isStarter = this.isStarterCard(cardId);

    // Credit check applies to all cards
    if (!creditManager.canAfford(cost)) {
      return { canEnhance: false, reason: `Insufficient credits (need ${cost})` };
    }

    // Starter cards: credits only, no copy requirement
    if (isStarter) {
      return { canEnhance: true };
    }

    // Regular cards: need N copies in inventory
    const state = gameStateManager.getState();
    const inventory = state.singlePlayerInventory || {};
    const owned = inventory[cardId] || 0;
    const copiesRequired = this.getCopiesRequired(cardId);

    if (owned < copiesRequired) {
      return { canEnhance: false, reason: `Need ${copiesRequired} copies (have ${owned})` };
    }

    return { canEnhance: true };
  }

  /**
   * Get all cards eligible for enhancement display.
   * Regular cards: need enough copies + an enhanced version.
   * Starter cards: need credits + an enhanced version (shown if enhanceable).
   */
  getEnhanceableCards() {
    const state = gameStateManager.getState();
    const inventory = state.singlePlayerInventory || {};

    const results = [];

    for (const card of fullCardCollection) {
      // Skip enhanced cards, aiOnly cards
      if (card.id.endsWith('_ENHANCED')) continue;
      if (card.aiOnly) continue;

      // Must have an enhanced version
      const enhanced = this.getEnhancedVersion(card.id);
      if (!enhanced) continue;

      const isStarter = this.isStarterCard(card.id);
      const owned = inventory[card.id] || 0;
      const copiesRequired = this.getCopiesRequired(card.id);
      const cost = this.getEnhancementCost(card.id);

      if (isStarter) {
        // Starter cards are always shown if they have an enhanced version
        results.push({
          card,
          enhancedCard: enhanced,
          quantity: owned,
          copiesRequired: 0,
          cost,
          isStarterCard: true,
          canEnhance: creditManager.canAfford(cost)
        });
      } else if (owned >= copiesRequired) {
        // Regular cards only shown if player has enough copies
        results.push({
          card,
          enhancedCard: enhanced,
          quantity: owned,
          copiesRequired,
          cost,
          isStarterCard: false,
          canEnhance: creditManager.canAfford(cost)
        });
      }
    }

    return results;
  }

  /**
   * Enhance a card: consume copies + credits, produce 1 enhanced version.
   * @returns {{ success: boolean, error?: string, cost?: number, removedCopies?: number, enhancedCardId?: string, deckWarnings?: Array }}
   */
  enhance(cardId) {
    const canResult = this.canEnhance(cardId);
    if (!canResult.canEnhance) {
      return { success: false, error: canResult.reason };
    }

    const isStarter = this.isStarterCard(cardId);
    const cost = this.getEnhancementCost(cardId);
    const copiesRequired = isStarter ? 0 : this.getCopiesRequired(cardId);
    const enhancedCardId = cardId + '_ENHANCED';

    // Deduct credits
    const deductResult = creditManager.deduct(cost, `Enhance: ${cardId}`);
    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    const state = gameStateManager.getState();
    const inventory = { ...state.singlePlayerInventory };

    // Deduct copies from inventory (not for starters)
    if (!isStarter && copiesRequired > 0) {
      inventory[cardId] = (inventory[cardId] || 0) - copiesRequired;
      if (inventory[cardId] <= 0) {
        delete inventory[cardId];
      }
    }

    // Add enhanced card to inventory
    inventory[enhancedCardId] = (inventory[enhancedCardId] || 0) + 1;

    // Deck auto-fix: cap deck quantities to remaining inventory
    const shipSlots = state.singlePlayerShipSlots
      ? state.singlePlayerShipSlots.map(slot => ({
        ...slot,
        decklist: slot.decklist ? slot.decklist.map(e => ({ ...e })) : []
      }))
      : [];
    const deckWarnings = this._fixDecks(cardId, inventory[cardId] || 0, shipSlots);

    gameStateManager.setState({
      singlePlayerInventory: inventory,
      singlePlayerShipSlots: shipSlots
    });

    debugLog('ECONOMY', `Enhanced ${cardId} -> ${enhancedCardId} for ${cost} credits, consumed ${copiesRequired} copies`);

    return {
      success: true,
      cost,
      removedCopies: copiesRequired,
      enhancedCardId,
      deckWarnings
    };
  }

  /**
   * Fix decks after inventory reduction. Iterates slots sequentially,
   * caps each entry at min(deckQty, remaining), removes entries at 0.
   * @private
   */
  _fixDecks(cardId, remainingInventory, shipSlots) {
    const warnings = [];
    let remaining = remainingInventory;

    for (let i = 0; i < shipSlots.length; i++) {
      const slot = shipSlots[i];
      if (!slot.decklist) continue;

      const entryIndex = slot.decklist.findIndex(e => e.id === cardId);
      if (entryIndex === -1) continue;

      const entry = slot.decklist[entryIndex];
      const capped = Math.min(entry.quantity, remaining);

      if (capped < entry.quantity) {
        warnings.push({
          slotIndex: i,
          slotName: slot.name || `Slot ${i}`,
          previousQuantity: entry.quantity,
          newQuantity: capped
        });
      }

      if (capped <= 0) {
        slot.decklist.splice(entryIndex, 1);
      } else {
        entry.quantity = capped;
      }

      remaining -= capped;
    }

    return warnings;
  }
}

export default new EnhancerService();
