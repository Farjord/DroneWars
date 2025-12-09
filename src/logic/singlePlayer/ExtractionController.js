// ========================================
// EXTRACTION CONTROLLER
// ========================================
// Manages extraction flow, blockade encounters, and run completion
// Handles both successful extraction and run abandonment

import gameStateManager from '../../managers/GameStateManager.js';
import DroneDamageProcessor from './DroneDamageProcessor.js';
import DetectionManager from '../detection/DetectionManager.js';
import { mapTiers } from '../../data/mapData.js';
import { ECONOMY } from '../../data/economyData.js';
import { debugLog } from '../../utils/debugLogger.js';
import ReputationService from '../reputation/ReputationService.js';

/**
 * Calculate total credits from salvage items in a loot array
 * Only sums creditValue from items with type === 'salvageItem'
 * @param {Array} loot - Array of loot items (cards, blueprints, salvageItems)
 * @returns {number} Total credit value from salvage items
 */
export function calculateExtractedCredits(loot) {
  if (!loot || !Array.isArray(loot)) {
    return 0;
  }

  return loot
    .filter(item => item.type === 'salvageItem')
    .reduce((sum, item) => sum + (item.creditValue || 0), 0);
}

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
   * Calculate extraction limit based on deck type, damaged ship sections, and reputation
   *
   * Base limits:
   * - Starter deck (Slot 0): 3 items
   * - Custom decks (Slots 1-5): 6 items + reputation bonuses
   *
   * Damage reduces limit by 1 for each damaged section
   *
   * @param {Object} currentRunState - Current run state with shipSections and shipSlotId
   * @returns {number} Extraction limit (0 to max)
   */
  calculateExtractionLimit(currentRunState) {
    const isStarterDeck = currentRunState.shipSlotId === 0;

    // Base limit differs by deck type
    const baseLimit = isStarterDeck
      ? (ECONOMY.STARTER_DECK_EXTRACTION_LIMIT || 3)
      : (ECONOMY.CUSTOM_DECK_EXTRACTION_LIMIT || 6);

    // Reputation bonus (custom decks only)
    let reputationBonus = 0;
    if (!isStarterDeck) {
      reputationBonus = ReputationService.getExtractionBonus();
    }

    // Count damaged sections (hull <= threshold.damaged)
    const shipSections = currentRunState.shipSections || {};
    let damagedCount = 0;
    Object.values(shipSections).forEach(section => {
      const threshold = section.thresholds?.damaged ?? 5; // Default threshold if not defined
      if (section.hull <= threshold) {
        damagedCount++;
      }
    });

    // Final calculation: base + reputation bonus - damage penalty
    return Math.max(0, baseLimit + reputationBonus - damagedCount);
  }

  /**
   * Complete successful extraction
   * Processes drone damage, transfers loot, updates profile
   * Enforces extraction limits on ALL deck types (starter and custom)
   *
   * @param {Object} currentRunState - Current run state
   * @param {Array|null} selectedLoot - Optional: pre-selected loot items (for limit enforcement)
   * @returns {Object} Extraction summary for modal display, or { action: 'selectLoot' } if over limit
   */
  completeExtraction(currentRunState, selectedLoot = null) {
    const state = gameStateManager.getState();
    const shipSlot = state.singlePlayerShipSlots?.find(
      s => s.id === currentRunState.shipSlotId
    );

    // Check extraction limit for ALL deck types (starter and custom)
    const isStarterDeck = currentRunState.shipSlotId === 0;
    const extractionLimit = this.calculateExtractionLimit(currentRunState);
    const lootCount = currentRunState.collectedLoot.length;

    if (lootCount > extractionLimit && selectedLoot === null) {
      // Over limit - need player to select which loot to keep
      debugLog('EXTRACTION', `Loot exceeds limit (${lootCount}/${extractionLimit}), selection required`);
      return {
        action: 'selectLoot',
        limit: extractionLimit,
        collectedLoot: currentRunState.collectedLoot
      };
    }

    // Determine which loot to transfer
    const lootToTransfer = selectedLoot || currentRunState.collectedLoot;

    debugLog('EXTRACTION', 'Completing extraction', {
      lootCount: lootToTransfer.length,
      credits: currentRunState.creditsEarned,
      hull: `${currentRunState.currentHull}/${currentRunState.maxHull}`,
      isStarterDeck,
      selectedLoot: selectedLoot ? 'yes' : 'no'
    });

    // Update runState with filtered loot before endRun processes it
    if (selectedLoot) {
      gameStateManager.setState({
        currentRunState: {
          ...currentRunState,
          collectedLoot: selectedLoot
        }
      });
    }

    // 1. Process drone damage (if hull < 50%)
    let dronesDamaged = [];
    if (shipSlot) {
      dronesDamaged = DroneDamageProcessor.process(shipSlot, currentRunState);
    }

    // 2. Build summary before endRun clears state
    // Calculate credits from extracted salvage items (not legacy creditsEarned)
    const extractedCredits = calculateExtractedCredits(lootToTransfer);

    const summary = {
      success: true,
      cardsAcquired: lootToTransfer.filter(i => i.type === 'card').length,
      blueprintsAcquired: lootToTransfer.filter(i => i.type === 'blueprint').length,
      creditsEarned: extractedCredits,
      dronesDamaged,
      finalHull: currentRunState.currentHull,
      maxHull: currentRunState.maxHull,
      hullPercent: currentRunState.maxHull > 0
        ? ((currentRunState.currentHull / currentRunState.maxHull) * 100).toFixed(0)
        : 100,
      itemsDiscarded: selectedLoot ? lootCount - selectedLoot.length : 0
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
    debugLog('SP_COMBAT', '=== ABANDON RUN START ===');
    debugLog('SP_COMBAT', 'Current state before abandon:', {
      appState: gameStateManager.get('appState'),
      turnPhase: gameStateManager.get('turnPhase'),
      gameActive: gameStateManager.get('gameActive'),
      gameStage: gameStateManager.get('gameStage'),
      roundNumber: gameStateManager.get('roundNumber'),
      hasPlayer1: !!gameStateManager.get('player1'),
      hasPlayer2: !!gameStateManager.get('player2'),
      hasCurrentRunState: !!gameStateManager.get('currentRunState')
    });
    debugLog('EXTRACTION', 'Run abandoned - MIA triggered');

    // Get isStarterDeck BEFORE endRun clears the run state
    const state = gameStateManager.getState();
    const runState = state?.currentRunState;
    const isStarterDeck = runState?.shipSlotId === 0;

    // If abandoning mid-combat, reset game state first
    if (gameStateManager.get('appState') === 'inGame') {
      debugLog('SP_COMBAT', 'Abandoning mid-combat - resetting game state');
      gameStateManager.resetGameState();
    }

    // End run as failure (MIA)
    gameStateManager.endRun(false);

    debugLog('SP_COMBAT', 'State after endRun():', {
      appState: gameStateManager.get('appState'),
      turnPhase: gameStateManager.get('turnPhase'),
      gameActive: gameStateManager.get('gameActive'),
      hasCurrentRunState: !!gameStateManager.get('currentRunState')
    });

    // Show failed run loading screen (will transition to hangar on complete)
    gameStateManager.setState({
      showFailedRunScreen: true,
      failedRunType: 'abandon',
      failedRunIsStarterDeck: isStarterDeck
    });

    debugLog('SP_COMBAT', '=== SHOWING FAILED RUN SCREEN (abandon) ===');
  }

  /**
   * Handle post-blockade extraction
   * Called after winning a blockade combat
   * @param {Object} currentRunState - Current run state
   * @param {Array|null} selectedLoot - Optional: pre-selected loot items (for limit enforcement)
   * @returns {Object} Extraction summary
   */
  completePostBlockadeExtraction(currentRunState, selectedLoot = null) {
    debugLog('EXTRACTION', 'Post-blockade extraction');
    return this.completeExtraction(currentRunState, selectedLoot);
  }
}

// Export singleton instance
export default new ExtractionController();
