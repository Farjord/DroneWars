// ========================================
// EXTRACTION CONTROLLER
// ========================================
// Manages extraction flow, blockade encounters, and run completion
// Handles both successful extraction and run abandonment

import gameStateManager from '../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js';
import DroneDamageProcessor from './DroneDamageProcessor.js';
import DetectionManager from '../detection/DetectionManager.js';
import { mapTiers } from '../../data/mapData.js';
import { ECONOMY } from '../../data/economyData.js';
import { debugLog } from '../../utils/debugLogger.js';
import ReputationService from '../reputation/ReputationService.js';
import MissionService from '../missions/MissionService.js';

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
   * Check if Clearance Override (extract) tactical item is available
   * @returns {boolean} True if player has at least one extract item
   */
  checkExtractItemAvailable() {
    const count = gameStateManager.getTacticalItemCount('ITEM_EXTRACT');
    return count > 0;
  }

  /**
   * Initiate extraction at gate with optional item bypass
   * @param {Object} currentRunState - Current run state
   * @param {boolean} useItem - Whether to use Clearance Override item to bypass blockade
   * @returns {Object} { action: 'combat', aiId, isBlockade } or { action: 'extract', itemUsed? }
   */
  initiateExtractionWithItem(currentRunState, useItem = false) {
    // If using item, attempt to consume it and bypass blockade entirely
    if (useItem) {
      const result = gameStateManager.useTacticalItem('ITEM_EXTRACT');
      if (result.success) {
        debugLog('EXTRACTION', 'Clearance Override used - bypassing blockade', {
          remaining: result.remaining
        });
        return { action: 'extract', itemUsed: true };
      }
      // Item use failed - fall back to normal extraction
      debugLog('EXTRACTION', 'Clearance Override failed - falling back to normal extraction', {
        error: result.error
      });
    }

    // Normal extraction with blockade check
    return this.initiateExtraction(currentRunState);
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
      tacticalMapStateManager.setState({
        collectedLoot: selectedLoot
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

    // 4. Record mission progress for successful extraction
    MissionService.recordProgress('EXTRACTION_COMPLETE', {});

    // 5. Record credits earned for mission progress
    if (extractedCredits > 0) {
      MissionService.recordProgress('CREDITS_EARNED', { amount: extractedCredits });
    }

    debugLog('EXTRACTION', 'Extraction complete', summary);

    return summary;
  }

  /**
   * Abandon run (triggers MIA)
   * Player loses all collected loot, deck marked as MIA
   */
  abandonRun() {
    // IMMEDIATELY signal abort - this must be the FIRST operation
    // This allows async operations to detect the abort and cancel
    gameStateManager.setState({ runAbandoning: true });

    debugLog('MODE_TRANSITION', '=== MODE: current -> failedRunScreen (abandon) ===', {
      trigger: 'user_action',
      source: 'ExtractionController.abandonRun',
      detail: 'Run abandoned, initiating failed run flow',
      currentAppState: gameStateManager.get('appState')
    });

    debugLog('SP_COMBAT', '=== ABANDON RUN START ===');
    debugLog('SP_COMBAT', 'runAbandoning flag set to TRUE');
    debugLog('SP_COMBAT', 'Current state before abandon:', {
      appState: gameStateManager.get('appState'),
      turnPhase: gameStateManager.get('turnPhase'),
      gameActive: gameStateManager.get('gameActive'),
      gameStage: gameStateManager.get('gameStage'),
      roundNumber: gameStateManager.get('roundNumber'),
      hasPlayer1: !!gameStateManager.get('player1'),
      hasPlayer2: !!gameStateManager.get('player2'),
      hasCurrentRunState: tacticalMapStateManager.isRunActive()
    });
    debugLog('EXTRACTION', 'Run abandoned - MIA triggered');

    // Get isStarterDeck BEFORE endRun clears the run state
    const runState = tacticalMapStateManager.getState();
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
      hasCurrentRunState: tacticalMapStateManager.isRunActive()
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

  // ========================================
  // VARIABLE ESCAPE DAMAGE SYSTEM
  // ========================================
  // Escape damage is based on AI enemy type with random distribution
  // Uses seeded RNG for deterministic results when same seed is provided

  /**
   * Create seeded random number generator
   * Uses linear congruential generator for reproducible results
   * @param {number} seed - Initial seed value
   * @returns {Object} RNG with random() method
   */
  createRNG(seed) {
    let s = typeof seed === 'number' ? seed : Date.now();
    return {
      random: () => {
        // Linear congruential generator (same as LootGenerator)
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      },
      randomIntInclusive: function(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
      }
    };
  }

  /**
   * Get escape damage range for an AI personality
   * @param {Object} aiPersonality - AI personality object with escapeDamage field
   * @returns {{ min: number, max: number }} Damage range
   */
  getEscapeDamageForAI(aiPersonality) {
    if (!aiPersonality?.escapeDamage) {
      return { min: 2, max: 2 }; // Default fallback
    }
    return aiPersonality.escapeDamage;
  }

  /**
   * Check if escape COULD destroy ship (worst-case analysis for UI warning)
   * @param {Object} currentRunState - Current run state with shipSections
   * @param {Object} aiPersonality - AI personality with escapeDamage
   * @returns {{ couldDestroy: boolean, maxDamage: number, escapeDamageRange: Object }}
   */
  checkEscapeCouldDestroy(currentRunState, aiPersonality) {
    const escapeDamageRange = this.getEscapeDamageForAI(aiPersonality);
    const maxDamage = escapeDamageRange.max;
    const shipSections = currentRunState.shipSections || {};

    // Worst case: all damage hits a single section, pushing it to damaged state
    // Check if max damage could cause all sections to be in damaged state
    // This is conservative - if any section could survive, couldDestroy is false
    const couldDestroy = Object.values(shipSections).every(section => {
      // Worst case for this section: all max damage hits it
      const worstCaseHull = Math.max(0, section.hull - maxDamage);
      const threshold = section.thresholds?.damaged ?? 4;
      return worstCaseHull <= threshold;
    });

    return { couldDestroy, maxDamage, escapeDamageRange };
  }

  /**
   * Apply escape damage to ship sections with random distribution
   * Each damage point is randomly assigned to a section
   * Uses seeded RNG for deterministic results
   * @param {Object} currentRunState - Current run state with shipSections
   * @param {Object} aiPersonality - AI personality with escapeDamage range
   * @param {number} seed - Random seed for deterministic results (defaults to Date.now())
   * @returns {{ updatedSections: Object, wouldDestroy: boolean, totalDamage: number, damageHits: Array, initialSections: Object }}
   */
  applyEscapeDamage(currentRunState, aiPersonality, seed = Date.now()) {
    const rng = this.createRNG(seed);
    const shipSections = currentRunState.shipSections || {};
    const sectionKeys = Object.keys(shipSections);

    // Get damage range from AI and roll total using seeded RNG
    const damageRange = this.getEscapeDamageForAI(aiPersonality);
    const totalDamage = rng.randomIntInclusive(damageRange.min, damageRange.max);

    // Clone initial sections (for displaying before damage)
    const initialSections = {};
    Object.entries(shipSections).forEach(([key, section]) => {
      initialSections[key] = { ...section };
    });

    // Clone sections for modification (don't mutate original)
    const updatedSections = {};
    Object.entries(shipSections).forEach(([key, section]) => {
      updatedSections[key] = { ...section };
    });

    // Track each individual damage hit for real-time display
    const damageHits = [];

    // Distribute each damage point randomly using seeded RNG
    for (let i = 0; i < totalDamage; i++) {
      const randomIndex = Math.floor(rng.random() * sectionKeys.length);
      const randomKey = sectionKeys[randomIndex];
      updatedSections[randomKey].hull = Math.max(0, updatedSections[randomKey].hull - 1);

      // Record this hit
      damageHits.push({
        section: randomKey,
        newHull: updatedSections[randomKey].hull,
        maxHull: updatedSections[randomKey].maxHull
      });
    }

    // Check if ship would be destroyed (all sections damaged)
    const allDamaged = Object.values(updatedSections).every(section => {
      const threshold = section.thresholds?.damaged ?? 4;
      return section.hull <= threshold;
    });

    debugLog('EXTRACTION', 'Escape damage applied (variable)', {
      seed,
      damageRange,
      totalDamage,
      damageHits,
      sections: Object.entries(updatedSections).map(([name, s]) => ({
        name,
        hull: s.hull,
        threshold: s.thresholds?.damaged ?? 4
      })),
      wouldDestroy: allDamaged
    });

    return { updatedSections, wouldDestroy: allDamaged, totalDamage, damageHits, initialSections };
  }

  /**
   * Execute escape from encounter
   * Applies variable damage based on AI type and updates run state
   * Uses seeded RNG for deterministic results
   * @param {Object} currentRunState - Current run state
   * @param {Object} aiPersonality - AI personality with escapeDamage
   * @param {number} seed - Random seed for deterministic results (defaults to Date.now())
   * @returns {{ success: boolean, wouldDestroy: boolean, updatedSections: Object, totalDamage: number, damageHits: Array, initialSections: Object }}
   */
  executeEscape(currentRunState, aiPersonality, seed = Date.now()) {
    const { updatedSections, wouldDestroy, totalDamage, damageHits, initialSections } = this.applyEscapeDamage(currentRunState, aiPersonality, seed);

    // Update currentHull totals
    const totalHull = Object.values(updatedSections).reduce((sum, s) => sum + s.hull, 0);
    const maxHull = Object.values(updatedSections).reduce((sum, s) => sum + s.maxHull, 0);

    // Update run state with new section values
    tacticalMapStateManager.setState({
      shipSections: updatedSections,
      currentHull: totalHull,
      maxHull: maxHull
    });

    debugLog('EXTRACTION', 'Escape executed', {
      totalDamage,
      totalHull,
      maxHull,
      wouldDestroy,
      damageHits
    });

    return { success: true, wouldDestroy, updatedSections, totalDamage, damageHits, initialSections };
  }

  // ========================================
  // STATE TRANSITION METHODS
  // ========================================
  // Centralized methods for state transitions to ensure UI components
  // don't directly call gameStateManager.setState() (architecture violation)

  /**
   * Complete the failed run transition - handles the "Continue" button from FailedRunLoadingScreen
   * This method ensures App.jsx/TacticalMapScreen don't directly call gameStateManager.setState()
   * which would violate the architecture pattern
   */
  completeFailedRunTransition() {
    debugLog('MODE_TRANSITION', '=== MODE: failedRunScreen -> hangar ===', {
      trigger: 'async_event',
      source: 'ExtractionController.completeFailedRunTransition',
      detail: 'Failed run screen animation complete, returning to hangar'
    });
    debugLog('EXTRACTION', 'Completing failed run transition to hangar');

    gameStateManager.setState({
      showFailedRunScreen: false,
      failedRunType: null,
      failedRunIsStarterDeck: false,
      appState: 'hangar',
      runAbandoning: false  // Clear abort signaling flag
    });
  }

  /**
   * Complete extraction and transition to hangar
   * This method handles the extraction screen completion in a centralized way
   * ensuring TacticalMapScreen doesn't directly call gameStateManager.setState()
   */
  completeExtractionTransition() {
    debugLog('MODE_TRANSITION', '=== MODE: tacticalMap -> hangar (extraction complete) ===', {
      trigger: 'async_event',
      source: 'ExtractionController.completeExtractionTransition',
      detail: 'Extraction screen animation complete, returning to hangar'
    });
    debugLog('EXTRACTION', 'Completing extraction transition to hangar');

    gameStateManager.setState({ appState: 'hangar' });
  }
}

// Export singleton instance
export default new ExtractionController();
