/**
 * Save Game Service
 * Handles saving and loading single-player game state
 * Uses file download/upload (no backend required)
 */

import { validateSaveFile, SAVE_VERSION } from '../data/saveGameSchema.js';

class SaveGameService {
  constructor() {
    this.currentSave = null;
  }

  /**
   * Serialize game state to JSON
   * @param {Object} playerProfile - Player profile data
   * @param {Object} inventory - Card inventory (master quantities)
   * @param {Array} droneInstances - Drone instances with damage tracking
   * @param {Array} shipComponentInstances - Ship component instances with hull tracking
   * @param {Array} discoveredCards - Card discovery states
   * @param {Array} shipSlots - Ship slots (6 total)
   * @param {Object|null} currentRunState - Current run state or null
   * @param {Array} quickDeployments - Quick deploy templates (max 5)
   * @returns {Object} Save data object
   */
  serialize(playerProfile, inventory, droneInstances, shipComponentInstances, discoveredCards, shipSlots, currentRunState = null, quickDeployments = []) {
    const saveData = {
      saveVersion: SAVE_VERSION,
      savedAt: Date.now(),
      playerProfile: {
        ...playerProfile,
        lastPlayedAt: Date.now(),
      },
      inventory: JSON.parse(JSON.stringify(inventory)),  // Deep copy
      droneInstances: JSON.parse(JSON.stringify(droneInstances)),  // Deep copy
      shipComponentInstances: JSON.parse(JSON.stringify(shipComponentInstances)),  // Deep copy
      discoveredCards: JSON.parse(JSON.stringify(discoveredCards)),  // Deep copy
      shipSlots: JSON.parse(JSON.stringify(shipSlots)),  // Deep copy
      currentRunState: currentRunState ? JSON.parse(JSON.stringify(currentRunState)) : null,
      quickDeployments: JSON.parse(JSON.stringify(quickDeployments || [])),  // Deep copy
    };

    return saveData;
  }

  /**
   * Deserialize JSON to game state
   * @param {Object} saveData - Save data from file
   * @returns {Object} Game state { playerProfile, inventory, droneInstances, shipComponentInstances, discoveredCards, shipSlots, currentRunState }
   */
  deserialize(saveData) {
    // Validate
    const validation = validateSaveFile(saveData);
    if (!validation.valid) {
      throw new Error(`Invalid save file: ${validation.errors.join(', ')}`);
    }

    // Check for MIA condition
    if (saveData.currentRunState !== null) {
      console.warn('Save file has active run state - triggering MIA protocol');
      saveData = this.triggerMIA(saveData);
    }

    return {
      playerProfile: saveData.playerProfile,
      inventory: saveData.inventory,
      droneInstances: saveData.droneInstances,
      shipComponentInstances: saveData.shipComponentInstances,
      discoveredCards: saveData.discoveredCards,
      shipSlots: saveData.shipSlots,
      currentRunState: null,  // Always null on load (MIA if was active)
      quickDeployments: saveData.quickDeployments || [],  // Backwards compat default
    };
  }

  /**
   * Trigger MIA protocol
   * Called when save file has currentRunState (unexpected exit during run)
   * @param {Object} saveData - Save data with active run
   * @returns {Object} Modified save data with MIA applied
   */
  triggerMIA(saveData) {
    const runState = saveData.currentRunState;
    if (!runState) return saveData;

    // Find active ship slot
    const activeSlot = saveData.shipSlots.find(slot => slot.id === runState.shipSlotId);
    if (!activeSlot) {
      console.warn('MIA: Could not find ship slot', runState.shipSlotId);
      return saveData;
    }

    // Mark ship as MIA
    activeSlot.status = 'mia';

    // Wipe collected loot (not transferred to inventory)
    console.log('MIA triggered: Loot lost', runState.collectedLoot);

    // Clear run state
    saveData.currentRunState = null;

    return saveData;
  }

  /**
   * Download save file as JSON
   * @param {Object} saveData - Save data to download
   * @param {string} filename - Filename for download
   * @returns {Object} Result { success: boolean, error?: string }
   */
  download(saveData, filename = 'eremos_save.json') {
    try {
      // Convert to JSON string (pretty-printed for readability)
      const jsonString = JSON.stringify(saveData, null, 2);

      // Create blob (no encoding - plain JSON)
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Save file downloaded:', filename);
      return { success: true };
    } catch (error) {
      console.error('Failed to download save:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load save file from upload
   * @param {File} file - Uploaded file object
   * @returns {Promise<Object>} Game state after deserialization
   */
  async load(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          // Parse JSON directly (no decoding)
          const saveData = JSON.parse(e.target.result);

          // Deserialize (includes validation and MIA detection)
          const gameState = this.deserialize(saveData);

          console.log('Save file loaded successfully');
          resolve(gameState);
        } catch (error) {
          console.error('Failed to parse save file:', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Quick save to localStorage (for testing/convenience)
   * @param {Object} saveData - Save data to store
   * @param {string} slotName - localStorage slot name
   * @returns {Object} Result { success: boolean, error?: string }
   */
  quickSave(saveData, slotName = 'quicksave') {
    try {
      const jsonString = JSON.stringify(saveData);
      localStorage.setItem(`eremos_${slotName}`, jsonString);
      console.log('Quick saved to localStorage:', slotName);
      return { success: true };
    } catch (error) {
      console.error('Failed to quick save:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Quick load from localStorage
   * @param {string} slotName - localStorage slot name
   * @returns {Object} Game state
   */
  quickLoad(slotName = 'quicksave') {
    try {
      const jsonString = localStorage.getItem(`eremos_${slotName}`);
      if (!jsonString) {
        throw new Error('No save found in slot: ' + slotName);
      }

      const saveData = JSON.parse(jsonString);
      const gameState = this.deserialize(saveData);

      console.log('Quick loaded from localStorage:', slotName);
      return gameState;
    } catch (error) {
      console.error('Failed to quick load:', error);
      throw error;
    }
  }

  /**
   * Check if save exists in localStorage
   * @param {string} slotName - localStorage slot name
   * @returns {boolean} True if save exists
   */
  hasSave(slotName = 'quicksave') {
    return localStorage.getItem(`eremos_${slotName}`) !== null;
  }
}

// Singleton instance
const saveGameService = new SaveGameService();
export default saveGameService;
