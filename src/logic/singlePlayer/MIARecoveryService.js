/**
 * MIARecoveryService.js
 * Handles recovery and scrapping of MIA ship slots
 * Uses CreditManager for transactions, economyData for costs
 * Recovery cost scales with deck value (50% of total replication/blueprint value)
 */

import gameStateManager from '../../managers/GameStateManager.js';
import creditManager from '../economy/CreditManager.js';
import { ECONOMY } from '../../data/economyData.js';
import { debugLog } from '../../utils/debugLogger.js';
import { starterPoolShipIds, starterPoolCards, starterPoolDroneNames } from '../../data/saveGameSchema.js';
import { starterDeck } from '../../data/playerDeckData.js';
import fullCardCollection from '../../data/cardData.js';
import fullDroneCollection from '../../data/droneData.js';
import shipCollection from '../../data/shipData.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';

// Pre-calculate starter component IDs for quick lookup
const starterComponentIds = Object.keys(starterDeck?.shipComponents || {});

class MIARecoveryService {

  /**
   * Calculate the recovery cost for an MIA ship slot based on deck value
   * Cost = max(FLOOR, totalValue * MULTIPLIER)
   *
   * Value calculation:
   * - Cards: sum of replication costs by rarity (non-starter only)
   * - Ship: blueprint cost by rarity (non-starter only)
   * - Drones: sum of blueprint costs by rarity (non-starter only)
   * - Components: sum of blueprint costs by rarity (non-starter only)
   *
   * @param {number} shipSlotId - The ID of the slot to calculate cost for
   * @returns {number} The recovery cost in credits
   */
  calculateRecoveryCost(shipSlotId) {
    const state = gameStateManager.getState();
    const shipSlot = state.singlePlayerShipSlots?.find(s => s.id === shipSlotId);

    // If slot not found, return floor
    if (!shipSlot) {
      return ECONOMY.MIA_RECOVERY_FLOOR;
    }

    let totalValue = 0;

    // Calculate card values (non-starter only)
    if (shipSlot.decklist && shipSlot.decklist.length > 0) {
      shipSlot.decklist.forEach(item => {
        // Skip starter cards
        if (starterPoolCards.includes(item.id)) {
          return;
        }

        const card = fullCardCollection.find(c => c.id === item.id);
        if (card) {
          const replicationCost = ECONOMY.REPLICATION_COSTS[card.rarity] || ECONOMY.REPLICATION_COSTS.Common;
          totalValue += replicationCost * item.quantity;
        }
      });
    }

    // Calculate ship value (non-starter only)
    if (shipSlot.shipId && !starterPoolShipIds.includes(shipSlot.shipId)) {
      const ship = shipCollection.find(s => s.id === shipSlot.shipId);
      if (ship) {
        const blueprintCost = ECONOMY.STARTER_BLUEPRINT_COSTS[ship.rarity] || ECONOMY.STARTER_BLUEPRINT_COSTS.Common;
        totalValue += blueprintCost;
      }
    }

    // Calculate drone values (non-starter only)
    if (shipSlot.droneSlots && shipSlot.droneSlots.length > 0) {
      shipSlot.droneSlots.forEach(slot => {
        if (!slot.assignedDrone) return;

        // Skip starter drones
        if (starterPoolDroneNames.includes(slot.assignedDrone)) {
          return;
        }

        const drone = fullDroneCollection.find(d => d.name === slot.assignedDrone);
        if (drone) {
          const blueprintCost = ECONOMY.STARTER_BLUEPRINT_COSTS[drone.rarity] || ECONOMY.STARTER_BLUEPRINT_COSTS.Common;
          totalValue += blueprintCost;
        }
      });
    }

    // Calculate component values (non-starter only)
    // Components are stored as { componentId: lane }
    if (shipSlot.shipComponents) {
      Object.keys(shipSlot.shipComponents).forEach(componentId => {
        // Skip starter components
        if (starterComponentIds.includes(componentId)) {
          return;
        }

        const component = shipComponentCollection.find(c => c.id === componentId);
        if (component) {
          const blueprintCost = ECONOMY.STARTER_BLUEPRINT_COSTS[component.rarity] || ECONOMY.STARTER_BLUEPRINT_COSTS.Common;
          totalValue += blueprintCost;
        }
      });
    }

    // Apply multiplier and floor
    const calculatedCost = totalValue * ECONOMY.MIA_RECOVERY_MULTIPLIER;
    const finalCost = Math.max(ECONOMY.MIA_RECOVERY_FLOOR, Math.floor(calculatedCost));

    debugLog('MIA', `Calculated recovery cost for slot ${shipSlotId}: ${finalCost} (value: ${totalValue})`);

    return finalCost;
  }

  /**
   * Recover an MIA ship slot by paying credits (cost scales with deck value)
   * @param {number} shipSlotId - The ID of the slot to recover
   * @returns {{ success: boolean, error?: string, cost?: number }}
   */
  recover(shipSlotId) {
    const state = gameStateManager.getState();
    const shipSlot = state.singlePlayerShipSlots.find(s => s.id === shipSlotId);
    const salvageCost = this.calculateRecoveryCost(shipSlotId);

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
   * Get recovery cost for a specific slot (cost scales with deck value)
   * @param {number} shipSlotId - The ID of the slot to get cost for
   * @returns {number} The recovery cost in credits
   */
  getSalvageCost(shipSlotId) {
    return this.calculateRecoveryCost(shipSlotId);
  }

  /**
   * Check if player can afford recovery for a specific slot
   * @param {number} shipSlotId - The ID of the slot to check
   * @returns {boolean}
   */
  canAffordRecovery(shipSlotId) {
    const cost = this.calculateRecoveryCost(shipSlotId);
    return creditManager.canAfford(cost);
  }
}

export default new MIARecoveryService();
