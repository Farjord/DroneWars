// ========================================
// TACTICAL ITEM MANAGER
// ========================================
// Handles tactical item purchase, use, and card pack shop.
// Extracted from GameStateManager — receives GSM via constructor injection.

import { getTacticalItemById } from '../data/tacticalItemData.js';
import { getPackCostForTier } from '../data/cardPackData.js';
import rewardManager from './RewardManager.js';
import { debugLog } from '../utils/debugLogger.js';

class TacticalItemManager {
  constructor(gsm) {
    this.gsm = gsm;
  }

  // --- Tactical Item Purchase/Use ---

  purchaseTacticalItem(itemId) {
    const item = getTacticalItemById(itemId);

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    const profile = this.gsm.state.singlePlayerProfile;

    if (profile.credits < item.cost) {
      return { success: false, error: 'Insufficient credits' };
    }

    const currentQty = profile.tacticalItems?.[itemId] || 0;

    if (currentQty >= item.maxCapacity) {
      return { success: false, error: `Already at max capacity (${item.maxCapacity})` };
    }

    const newQuantity = currentQty + 1;

    this.gsm.setState({
      singlePlayerProfile: {
        ...profile,
        credits: profile.credits - item.cost,
        tacticalItems: {
          ...profile.tacticalItems,
          [itemId]: newQuantity
        }
      }
    });

    debugLog('SP_SHOP', `Purchased ${item.name} for ${item.cost} credits. Now have ${newQuantity}`);

    return { success: true, newQuantity };
  }

  useTacticalItem(itemId) {
    const profile = this.gsm.state.singlePlayerProfile;
    const currentQty = profile.tacticalItems?.[itemId] || 0;

    if (currentQty <= 0) {
      return { success: false, error: 'No items available' };
    }

    const remaining = currentQty - 1;

    this.gsm.setState({
      singlePlayerProfile: {
        ...profile,
        tacticalItems: {
          ...profile.tacticalItems,
          [itemId]: remaining
        }
      }
    });

    debugLog('SP_SHOP', `Used tactical item ${itemId}. Remaining: ${remaining}`);

    return { success: true, remaining };
  }

  getTacticalItemCount(itemId) {
    return this.gsm.state.singlePlayerProfile?.tacticalItems?.[itemId] || 0;
  }

  // --- Card Pack Shop ---

  purchaseCardPack() {
    const profile = this.gsm.state.singlePlayerProfile;
    const shopPack = profile?.shopPack;

    if (!shopPack) {
      return { success: false, error: 'No pack available' };
    }

    const { packType, tier, seed } = shopPack;
    const cost = getPackCostForTier(tier);

    if (profile.credits < cost) {
      return { success: false, error: 'Insufficient credits' };
    }

    const result = rewardManager.generateShopPack(packType, tier, seed);

    if (!result.cards || result.cards.length === 0) {
      return { success: false, error: 'Failed to generate cards' };
    }

    const newCredits = profile.credits - cost;

    const newInventory = { ...this.gsm.state.singlePlayerInventory };
    result.cards.forEach(card => {
      newInventory[card.cardId] = (newInventory[card.cardId] || 0) + 1;
    });

    this.gsm.setState({
      singlePlayerProfile: {
        ...profile,
        credits: newCredits,
        shopPack: null
      },
      singlePlayerInventory: newInventory
    });

    debugLog('SP_SHOP', `Purchased ${packType} T${tier} for ${cost} credits`, { cards: result.cards.map(c => c.cardId) });

    return { success: true, cards: result.cards, cost };
  }
}

export default TacticalItemManager;
