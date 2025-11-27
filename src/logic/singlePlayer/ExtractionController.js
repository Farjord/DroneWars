// ========================================
// EXTRACTION CONTROLLER
// ========================================
// Manages extraction flow, blockade encounters, and run completion
// Handles both successful extraction and run abandonment

import gameStateManager from '../../managers/GameStateManager.js';
import DroneDamageProcessor from './DroneDamageProcessor.js';
import DetectionManager from '../detection/DetectionManager.js';
import { mapTiers } from '../../data/mapData.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * ExtractionController - Singleton manager for extraction logic
 *
 * Extraction flow:
 * 1. Player reaches extraction gate
 * 2. Blockade check: roll < detection = combat encounter
 * 3. If safe or after winning blockade: process extraction
 * 4. Drone damage check if hull < 50%
 * 5. Transfer loot, show summary, return to hangar
 */
class ExtractionController {
  constructor() {
    if (ExtractionController.instance) {
      return ExtractionController.instance;
    }
    ExtractionController.instance = this;
  }

  /**
   * Check if extraction triggers a blockade encounter
   * Higher threat level = higher chance of blockade
   * @param {number} detection - Current detection level (0-100)
   * @returns {boolean} True if blockade triggered
   */
  checkBlockade(detection) {
    const roll = Math.random() * 100;
    const blocked = roll < detection;

    debugLog('EXTRACTION', 'Blockade check', {
      roll: roll.toFixed(2),
      detection: detection.toFixed(2),
      blocked
    });

    return blocked;
  }

  /**
   * Get blockade AI based on tier
   * @param {number} tier - Map tier (1, 2, or 3)
   * @returns {string} AI name for blockade encounter
   */
  getBlockadeAI(tier) {
    const tierConfig = mapTiers.find(t => t.tier === tier) || mapTiers[0];
    const highThreatAIs = tierConfig.threatTables?.high || ['Heavy Cruiser Defense Pattern'];
    return highThreatAIs[Math.floor(Math.random() * highThreatAIs.length)];
  }

  /**
   * Initiate extraction at gate
   * @param {Object} currentRunState - Current run state
   * @returns {Object} { action: 'combat', aiId } or { action: 'extract' }
   */
  initiateExtraction(currentRunState) {
    const detection = DetectionManager.getCurrentDetection();

    debugLog('EXTRACTION', 'Initiating extraction', {
      detection: detection.toFixed(2),
      tier: currentRunState.mapTier
    });

    // Check for blockade
    if (this.checkBlockade(detection)) {
      const aiId = this.getBlockadeAI(currentRunState.mapTier);
      debugLog('EXTRACTION', `BLOCKADE! Combat with: ${aiId}`);

      return {
        action: 'combat',
        aiId,
        isBlockade: true
      };
    }

    // Safe extraction
    debugLog('EXTRACTION', 'Safe extraction - no blockade');
    return { action: 'extract' };
  }

  /**
   * Complete successful extraction
   * Processes drone damage, transfers loot, updates profile
   * @param {Object} currentRunState - Current run state
   * @returns {Object} Extraction summary for modal display
   */
  completeExtraction(currentRunState) {
    const state = gameStateManager.getState();
    const shipSlot = state.singlePlayerShipSlots?.find(
      s => s.id === currentRunState.shipSlotId
    );

    debugLog('EXTRACTION', 'Completing extraction', {
      lootCount: currentRunState.collectedLoot.length,
      credits: currentRunState.creditsEarned,
      hull: `${currentRunState.currentHull}/${currentRunState.maxHull}`
    });

    // 1. Process drone damage (if hull < 50%)
    let dronesDamaged = [];
    if (shipSlot) {
      dronesDamaged = DroneDamageProcessor.process(shipSlot, currentRunState);
    }

    // 2. Build summary before endRun clears state
    const summary = {
      success: true,
      cardsAcquired: currentRunState.collectedLoot.filter(i => i.type === 'card').length,
      blueprintsAcquired: currentRunState.collectedLoot.filter(i => i.type === 'blueprint').length,
      creditsEarned: currentRunState.creditsEarned,
      dronesDamaged,
      finalHull: currentRunState.currentHull,
      maxHull: currentRunState.maxHull,
      hullPercent: currentRunState.maxHull > 0
        ? ((currentRunState.currentHull / currentRunState.maxHull) * 100).toFixed(0)
        : 100
    };

    // 3. End run with success (transfers loot, adds credits)
    gameStateManager.endRun(true);

    debugLog('EXTRACTION', 'Extraction complete', summary);

    return summary;
  }

  /**
   * Abandon run (triggers MIA)
   * Player loses all collected loot, deck marked as MIA
   */
  abandonRun() {
    debugLog('EXTRACTION', 'Run abandoned - MIA triggered');

    // End run as failure (MIA)
    gameStateManager.endRun(false);

    // Return to hangar
    gameStateManager.setState({ appState: 'hangar' });
  }

  /**
   * Handle post-blockade extraction
   * Called after winning a blockade combat
   * @param {Object} currentRunState - Current run state
   * @returns {Object} Extraction summary
   */
  completePostBlockadeExtraction(currentRunState) {
    debugLog('EXTRACTION', 'Post-blockade extraction');
    return this.completeExtraction(currentRunState);
  }
}

// Export singleton instance
export default new ExtractionController();
