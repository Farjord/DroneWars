// ========================================
// SINGLE-PLAYER INVENTORY MANAGER
// ========================================
// Handles save/load, card inventory, card discovery, and ship components.
// Extracted from GameStateManager — receives GSM via constructor injection.

import { createNewSave } from '../logic/save/saveGameFactory.js';
import { generateRandomShopPack } from '../data/cardPackData.js';
import tacticalMapStateManager from './TacticalMapStateManager.js';
import { debugLog } from '../utils/debugLogger.js';

class SinglePlayerInventoryManager {
  constructor(gsm) {
    this.gsm = gsm;
  }

  // --- Profile Creation / Save / Load ---

  createNewSinglePlayerProfile() {
    const newSave = createNewSave();
    this.loadSinglePlayerSave(newSave);
    debugLog('SP_SAVE', 'New single-player profile created');
  }

  loadSinglePlayerSave(saveData) {
    // Migration: Calculate highestUnlockedSlot for saves without it
    const profile = { ...saveData.playerProfile };
    if (profile.highestUnlockedSlot === undefined) {
      const activeSlotIds = (saveData.shipSlots || [])
        .filter(s => s.id > 0 && s.status !== 'empty')
        .map(s => s.id);
      profile.highestUnlockedSlot = activeSlotIds.length > 0 ? Math.max(...activeSlotIds) : 0;
      debugLog('SP_SAVE', `Migration: Set highestUnlockedSlot to ${profile.highestUnlockedSlot}`);
    }

    // Migration: Generate shop pack if not present (new saves and old saves)
    if (!profile.shopPack) {
      const highestTier = profile.stats?.highestTierCompleted || 0;
      profile.shopPack = generateRandomShopPack(highestTier, Date.now());
      debugLog('SP_SAVE', 'Migration: Generated shop pack', { shopPack: profile.shopPack });
    }

    this.gsm.setState({
      singlePlayerProfile: profile,
      singlePlayerInventory: saveData.inventory,
      singlePlayerDroneInstances: saveData.droneInstances,
      singlePlayerShipComponentInstances: saveData.shipComponentInstances,
      singlePlayerDiscoveredCards: saveData.discoveredCards,
      singlePlayerShipSlots: saveData.shipSlots,
      quickDeployments: saveData.quickDeployments || [],
    });

    // Load run state to TacticalMapStateManager if present
    if (saveData.currentRunState) {
      tacticalMapStateManager.loadFromSave(saveData.currentRunState);
      debugLog('SP_SAVE', 'Run state loaded to TacticalMapStateManager');
    }

    debugLog('SP_SAVE', 'Single-player save loaded');
  }

  getSaveData() {
    return {
      playerProfile: this.gsm.state.singlePlayerProfile,
      inventory: this.gsm.state.singlePlayerInventory,
      droneInstances: this.gsm.state.singlePlayerDroneInstances,
      shipComponentInstances: this.gsm.state.singlePlayerShipComponentInstances,
      discoveredCards: this.gsm.state.singlePlayerDiscoveredCards,
      shipSlots: this.gsm.state.singlePlayerShipSlots,
      currentRunState: tacticalMapStateManager.getState(),
      quickDeployments: this.gsm.state.quickDeployments || [],
    };
  }

  // --- Card Discovery ---

  updateCardDiscoveryState(cardId, newState) {
    const validStates = ['owned', 'discovered', 'undiscovered'];
    if (!validStates.includes(newState)) {
      throw new Error(`Invalid discovery state: ${newState}`);
    }

    const discoveredCards = [...this.gsm.state.singlePlayerDiscoveredCards];
    const index = discoveredCards.findIndex(entry => entry.cardId === cardId);

    if (index >= 0) {
      discoveredCards[index] = { ...discoveredCards[index], state: newState };
    } else {
      discoveredCards.push({ cardId, state: newState });
    }

    this.gsm.setState({ singlePlayerDiscoveredCards: discoveredCards });
    debugLog('SP_INVENTORY', `Card ${cardId} discovery state updated to ${newState}`);
  }

  addDiscoveredCard(cardId) {
    this.updateCardDiscoveryState(cardId, 'discovered');
  }

  // --- Inventory ---

  addToInventory(cardId, quantity = 1) {
    const newInventory = {
      ...this.gsm.state.singlePlayerInventory,
      [cardId]: (this.gsm.state.singlePlayerInventory[cardId] || 0) + quantity
    };

    this.gsm.setState({ singlePlayerInventory: newInventory });
    this.updateCardDiscoveryState(cardId, 'owned');
    debugLog('SP_INVENTORY', `Added ${quantity}x ${cardId} to inventory`);
  }

  // --- Ship Components ---

  addShipComponentInstance(instance) {
    const instances = [...this.gsm.state.singlePlayerShipComponentInstances];
    instances.push(instance);
    this.gsm.setState({ singlePlayerShipComponentInstances: instances });
    debugLog('SP_INVENTORY', 'Ship component instance added', { instance });
  }

  updateShipComponentHull(instanceId, newHull) {
    const instances = [...this.gsm.state.singlePlayerShipComponentInstances];
    const index = instances.findIndex(inst => inst.instanceId === instanceId);

    if (index >= 0) {
      instances[index] = { ...instances[index], currentHull: newHull };
      this.gsm.setState({ singlePlayerShipComponentInstances: instances });
      debugLog('SP_INVENTORY', `Ship component ${instanceId} hull updated to ${newHull}`);
    } else {
      debugLog('SP_INVENTORY', `⚠️ Ship component instance ${instanceId} not found`);
    }
  }

  getShipComponentInstance(instanceId) {
    return this.gsm.state.singlePlayerShipComponentInstances.find(inst => inst.instanceId === instanceId) || null;
  }
}

export default SinglePlayerInventoryManager;
