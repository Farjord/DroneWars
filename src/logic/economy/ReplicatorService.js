/**
 * ReplicatorService.js
 * Handles card replication operations
 * Uses CreditManager for transactions, economyData for costs
 */

import gameStateManager from '../../managers/GameStateManager.js';
import creditManager from './CreditManager.js';
import { ECONOMY } from '../../data/economyData.js';
import fullCardCollection from '../../data/cardData.js';
import { starterPoolCards } from '../../data/saveGameSchema.js';
import { debugLog } from '../../utils/debugLogger.js';

class ReplicatorService {
  /**
   * Check if a card is a starter deck card
   * @param {string} cardId - The card ID
   * @returns {boolean}
   */
  isStarterCard(cardId) {
    return starterPoolCards.includes(cardId);
  }

  /**
   * Get replication cost for a card by ID
   * @param {string} cardId - The card ID
   * @returns {number} Cost in credits
   */
  getReplicationCost(cardId) {
    const card = fullCardCollection.find(c => c.id === cardId);
    if (!card) {
      debugLog('REPLICATE', `Card not found: ${cardId}, using Common cost`);
      return ECONOMY.REPLICATION_COSTS.Common;
    }

    const rarity = card.rarity || 'Common';
    return ECONOMY.REPLICATION_COSTS[rarity] || ECONOMY.REPLICATION_COSTS.Common;
  }

  /**
   * Get replication cost by rarity directly
   * @param {string} rarity - The card rarity
   * @returns {number} Cost in credits
   */
  getReplicationCostByRarity(rarity) {
    return ECONOMY.REPLICATION_COSTS[rarity] || ECONOMY.REPLICATION_COSTS.Common;
  }

  /**
   * Get all replication costs (for UI display)
   * @returns {Object} Costs by rarity
   */
  getAllCosts() {
    return { ...ECONOMY.REPLICATION_COSTS };
  }

  /**
   * Check if a card can be replicated
   * - Starter cards: CANNOT be replicated (they are infinite by default)
   * - Regular cards: must own at least 1 copy
   * @param {string} cardId - The card ID
   * @returns {{ canReplicate: boolean, reason?: string, isStarterCard?: boolean }}
   */
  canReplicate(cardId) {
    const state = gameStateManager.getState();
    const inventory = state.singlePlayerInventory || {};
    const isStarter = this.isStarterCard(cardId);

    // Starter cards cannot be replicated - they are always available in unlimited quantities
    if (isStarter) {
      return { canReplicate: false, reason: 'Starter cards cannot be replicated' };
    }

    // Regular cards require ownership
    if (!inventory[cardId] || inventory[cardId] <= 0) {
      return { canReplicate: false, reason: 'Card not owned' };
    }

    // Check if can afford
    const cost = this.getReplicationCost(cardId);
    if (!creditManager.canAfford(cost)) {
      return { canReplicate: false, reason: `Insufficient credits (need ${cost})` };
    }

    return { canReplicate: true, isStarterCard: false };
  }

  /**
   * Get all cards that can be replicated
   * Only includes owned regular cards - starter cards are excluded (they are infinite)
   * @returns {Array} Array of { card, quantity, replicationCost, isStarterCard }
   */
  getReplicatableCards() {
    const state = gameStateManager.getState();
    const inventory = state.singlePlayerInventory || {};

    // Build list of replicatable cards
    // Exclude starter cards (they are infinite and don't need replication)
    // Only include owned non-starter cards
    return fullCardCollection
      .filter(card => {
        const isStarter = this.isStarterCard(card.id);
        const quantity = inventory[card.id] || 0;
        // Starter cards are excluded; only owned non-starter cards can be replicated
        return !isStarter && quantity > 0;
      })
      .map(card => {
        return {
          card,
          quantity: inventory[card.id] || 0,
          replicationCost: this.getReplicationCost(card.id),
          isStarterCard: false
        };
      });
  }

  /**
   * Replicate a card (create a copy)
   * @param {string} cardId - The card ID to replicate
   * @returns {{ success: boolean, error?: string, cost?: number, newQuantity?: number }}
   */
  replicate(cardId) {
    // Validate can replicate
    const canReplicateResult = this.canReplicate(cardId);
    if (!canReplicateResult.canReplicate) {
      return { success: false, error: canReplicateResult.reason };
    }

    const card = fullCardCollection.find(c => c.id === cardId);
    const cost = this.getReplicationCost(cardId);

    // Deduct credits via CreditManager
    const deductResult = creditManager.deduct(cost, `Replicate: ${card?.name || cardId}`);
    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    // Add card to inventory
    const state = gameStateManager.getState();
    const inventory = { ...state.singlePlayerInventory };
    const currentQuantity = inventory[cardId] || 0;
    inventory[cardId] = currentQuantity + 1;

    gameStateManager.setState({
      singlePlayerInventory: inventory
    });

    debugLog('REPLICATE', `Replicated ${card?.name || cardId} for ${cost} credits. New quantity: ${inventory[cardId]}`);

    return { success: true, cost, newQuantity: inventory[cardId] };
  }
}

export default new ReplicatorService();
