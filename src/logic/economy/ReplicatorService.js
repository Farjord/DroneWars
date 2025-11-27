/**
 * ReplicatorService.js
 * Handles card replication operations
 * Uses CreditManager for transactions, economyData for costs
 */

import gameStateManager from '../../managers/GameStateManager.js';
import creditManager from './CreditManager.js';
import { ECONOMY } from '../../data/economyData.js';
import fullCardCollection from '../../data/cardData.js';
import { debugLog } from '../../utils/debugLogger.js';

class ReplicatorService {
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
   * @returns {Object} Object with rarity keys and cost values
   */
  getAllCosts() {
    return { ...ECONOMY.REPLICATION_COSTS };
  }

  /**
   * Check if a card can be replicated
   * - Must own at least 1 copy
   * - Must NOT be a Slot 0 (starter deck) card
   * @param {string} cardId - The card ID
   * @returns {{ canReplicate: boolean, reason?: string }}
   */
  canReplicate(cardId) {
    const state = gameStateManager.getState();
    const inventory = state.singlePlayerInventory || {};
    const slots = state.singlePlayerShipSlots || [];

    // Check if owned
    if (!inventory[cardId] || inventory[cardId] <= 0) {
      return { canReplicate: false, reason: 'Card not owned' };
    }

    // Check if it's a Slot 0 card (starter deck - infinite copies, cannot replicate)
    const slot0 = slots.find(s => s.id === 0);
    if (slot0 && slot0.decklist) {
      const isSlot0Card = slot0.decklist.some(item => item.id === cardId);
      if (isSlot0Card) {
        return { canReplicate: false, reason: 'Cannot replicate starter deck cards' };
      }
    }

    // Check if can afford
    const cost = this.getReplicationCost(cardId);
    if (!creditManager.canAfford(cost)) {
      return { canReplicate: false, reason: `Insufficient credits (need ${cost})` };
    }

    return { canReplicate: true };
  }

  /**
   * Get all cards that can be replicated
   * Filters inventory to owned cards not in Slot 0
   * @returns {Array} Array of { card, quantity, replicationCost }
   */
  getReplicatableCards() {
    const state = gameStateManager.getState();
    const inventory = state.singlePlayerInventory || {};
    const slots = state.singlePlayerShipSlots || [];

    // Get Slot 0 card IDs to exclude
    const slot0 = slots.find(s => s.id === 0);
    const slot0CardIds = new Set();
    if (slot0 && slot0.decklist) {
      slot0.decklist.forEach(item => slot0CardIds.add(item.id));
    }

    // Build list of replicatable cards
    return fullCardCollection
      .filter(card => {
        const quantity = inventory[card.id] || 0;
        return quantity > 0 && !slot0CardIds.has(card.id);
      })
      .map(card => ({
        card,
        quantity: inventory[card.id],
        replicationCost: this.getReplicationCost(card.id)
      }));
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
