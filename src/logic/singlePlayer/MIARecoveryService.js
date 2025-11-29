/**
 * MIARecoveryService.js
 * Handles recovery and scrapping of MIA ship slots
 * Uses CreditManager for transactions, economyData for costs
 */

import gameStateManager from '../../managers/GameStateManager.js';
import creditManager from '../economy/CreditManager.js';
import { ECONOMY } from '../../data/economyData.js';
import { debugLog } from '../../utils/debugLogger.js';
import { starterPoolShipIds } from '../../data/saveGameSchema.js';

class MIARecoveryService {

  /**
   * Recover an MIA ship slot by paying credits
   * @param {number} shipSlotId - The ID of the slot to recover
   * @returns {{ success: boolean, error?: string, cost?: number }}
   */
  recover(shipSlotId) {
    const state = gameStateManager.getState();
    const shipSlot = state.singlePlayerShipSlots.find(s => s.id === shipSlotId);
    const salvageCost = ECONOMY.MIA_SALVAGE_COST;

    // Validate slot exists and is MIA
    if (!shipSlot) {
      return { success: false, error: 'Ship slot not found' };
    }

    if (shipSlot.status !== 'mia') {
      return { success: false, error: 'Ship is not MIA' };
    }

    debugLog('MIA', `Recovering ship slot ${shipSlotId} for ${salvageCost} credits`);

    // Deduct credits via CreditManager
    const deductResult = creditManager.deduct(salvageCost, `MIA Recovery: ${shipSlot.name}`);
    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    // Restore ship to active
    shipSlot.status = 'active';

    // Clear damaged state on all drones
    if (shipSlot.drones && shipSlot.drones.length > 0) {
      shipSlot.drones.forEach(drone => {
        drone.isDamaged = false;
      });
    }

    // Update state (shipSlots only - credits handled by CreditManager)
    gameStateManager.setState({
      singlePlayerShipSlots: [...state.singlePlayerShipSlots]
    });

    debugLog('MIA', `Ship slot ${shipSlotId} (${shipSlot.name}) recovered successfully`);

    return { success: true, cost: salvageCost };
  }

  /**
   * Scrap an MIA ship slot, removing cards from inventory
   * @param {number} shipSlotId - The ID of the slot to scrap
   * @returns {{ success: boolean, error?: string, cardsRemoved?: Array }}
   */
  scrap(shipSlotId) {
    const state = gameStateManager.getState();
    const shipSlot = state.singlePlayerShipSlots.find(s => s.id === shipSlotId);
    const inventory = { ...state.singlePlayerInventory };

    // Validate slot exists and is MIA
    if (!shipSlot) {
      return { success: false, error: 'Ship slot not found' };
    }

    if (shipSlot.status !== 'mia') {
      return { success: false, error: 'Ship is not MIA' };
    }

    // Cannot scrap immutable slots (Slot 0 / Starter Deck)
    if (shipSlot.isImmutable) {
      return { success: false, error: 'Cannot scrap starter deck' };
    }

    debugLog('MIA', `Scrapping ship slot ${shipSlotId}`);

    // Remove cards from inventory based on deck quantities
    const cardsRemoved = [];
    if (shipSlot.decklist && shipSlot.decklist.length > 0) {
      shipSlot.decklist.forEach(item => {
        const cardId = item.id;
        const qty = item.quantity;

        if (inventory[cardId] && inventory[cardId] > 0) {
          const removeQty = Math.min(qty, inventory[cardId]);
          inventory[cardId] -= removeQty;

          // Clean up zero entries
          if (inventory[cardId] <= 0) {
            delete inventory[cardId];
          }

          cardsRemoved.push({ cardId, quantity: removeQty });
          debugLog('MIA', `Removed ${removeQty}x ${cardId} from inventory`);
        }
      });
    }

    // Remove ship from inventory (if not starter pool)
    if (shipSlot.shipId && !starterPoolShipIds.includes(shipSlot.shipId)) {
      if (inventory[shipSlot.shipId] && inventory[shipSlot.shipId] > 0) {
        inventory[shipSlot.shipId] -= 1;
        debugLog('MIA', `Removed ship ${shipSlot.shipId} from inventory`);
        if (inventory[shipSlot.shipId] <= 0) {
          delete inventory[shipSlot.shipId];
        }
      }
    }

    // Reset slot to empty state
    const slotName = shipSlot.name;
    shipSlot.status = 'empty';
    shipSlot.name = `Ship Slot ${shipSlotId}`;
    shipSlot.decklist = [];
    shipSlot.drones = [];
    shipSlot.shipComponents = {};
    shipSlot.shipId = null;

    // Update state
    gameStateManager.setState({
      singlePlayerInventory: inventory,
      singlePlayerShipSlots: [...state.singlePlayerShipSlots]
    });

    debugLog('MIA', `Ship slot ${shipSlotId} (${slotName}) scrapped, ${cardsRemoved.length} card types removed`);

    return { success: true, cardsRemoved };
  }

  /**
   * Get recovery cost for a slot
   * @returns {number} The salvage cost in credits
   */
  getSalvageCost() {
    return ECONOMY.MIA_SALVAGE_COST;
  }

  /**
   * Check if player can afford recovery
   * @returns {boolean}
   */
  canAffordRecovery() {
    return creditManager.canAfford(ECONOMY.MIA_SALVAGE_COST);
  }
}

export default new MIARecoveryService();
