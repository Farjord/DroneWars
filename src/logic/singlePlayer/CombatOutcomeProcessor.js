// ========================================
// COMBAT OUTCOME PROCESSOR
// ========================================
// Handles combat end outcomes for Exploring the Eremos mode
// Processes wins (loot, hull update) and losses (MIA)

import gameStateManager from '../../managers/GameStateManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import lootGenerator from '../loot/LootGenerator.js';
import ExtractionController from './ExtractionController.js';

/**
 * CombatOutcomeProcessor
 * Handles the aftermath of single-player combat encounters
 */
class CombatOutcomeProcessor {
  constructor() {
    if (CombatOutcomeProcessor.instance) {
      return CombatOutcomeProcessor.instance;
    }
    CombatOutcomeProcessor.instance = this;
  }

  /**
   * Process combat end and handle outcome
   * @param {Object} gameState - Current game state with winner
   * @returns {Object} Outcome result { success, outcome, loot?, message }
   */
  processCombatEnd(gameState) {
    const winner = gameState.winner;
    const encounterInfo = gameState.singlePlayerEncounter || {};

    debugLog('SP_COMBAT', '=== Processing Combat Outcome ===');
    debugLog('SP_COMBAT', 'Winner:', winner);
    debugLog('SP_COMBAT', 'Encounter Info:', encounterInfo);

    if (winner === 'player1') {
      return this.processVictory(gameState, encounterInfo);
    } else {
      return this.processDefeat(gameState, encounterInfo);
    }
  }

  /**
   * Process player victory
   * Generates loot and stores in pendingLoot for reveal modal
   * Does NOT return to tactical map - that happens after loot reveal
   * @param {Object} gameState - Game state
   * @param {Object} encounterInfo - Encounter metadata
   * @returns {Object} Victory result with pendingLoot
   */
  processVictory(gameState, encounterInfo) {
    debugLog('SP_COMBAT', '=== Player Victory ===');

    // 1. Extract per-section hull values from combat state
    const combatSections = gameState.player1?.shipSections || {};
    const currentRunState = gameStateManager.getState().currentRunState || {};

    // Build updated ship sections with hull values from combat
    const updatedShipSections = {
      bridge: {
        ...(currentRunState.shipSections?.bridge || {}),
        hull: combatSections.bridge?.hull ?? 10
      },
      powerCell: {
        ...(currentRunState.shipSections?.powerCell || {}),
        hull: combatSections.powerCell?.hull ?? 10
      },
      droneControlHub: {
        ...(currentRunState.shipSections?.droneControlHub || {}),
        hull: combatSections.droneControlHub?.hull ?? 10
      }
    };

    // Calculate total hull from sections
    const currentHull =
      updatedShipSections.bridge.hull +
      updatedShipSections.powerCell.hull +
      updatedShipSections.droneControlHub.hull;

    debugLog('SP_COMBAT', 'Per-section hull:', updatedShipSections);
    debugLog('SP_COMBAT', 'Total remaining hull:', currentHull);

    // 2. Generate salvage loot using LootGenerator
    const enemyDeck = gameState.player2?.deck || [];
    const enemyTier = encounterInfo?.tier || 1;
    const aiDifficulty = encounterInfo?.aiDifficulty || null;
    const salvageLoot = lootGenerator.generateCombatSalvage(enemyDeck, enemyTier, aiDifficulty);
    debugLog('SP_COMBAT', 'Generated salvage loot:', salvageLoot);

    // 3. Check for drone blueprint POI reward
    const rewardType = encounterInfo?.reward?.rewardType;
    if (rewardType?.startsWith('DRONE_BLUEPRINT_')) {
      debugLog('SP_COMBAT', 'Drone blueprint POI - generating blueprint:', rewardType);
      const droneBlueprint = lootGenerator.generateDroneBlueprint(rewardType, enemyTier);
      if (droneBlueprint) {
        salvageLoot.blueprint = droneBlueprint;
        debugLog('SP_COMBAT', 'Drone blueprint generated:', droneBlueprint);
      }
    }

    // 4. Update run state with hull (but NOT loot yet - that happens after reveal)
    const updatedRunState = {
      ...currentRunState,
      shipSections: updatedShipSections,
      currentHull: currentHull,
      combatsWon: (currentRunState.combatsWon || 0) + 1
    };

    // 5. Store pending loot and enter loot reveal state
    // Do NOT return to tactical map yet - WinnerModal will show "Collect Salvage" button
    gameStateManager.setState({
      currentRunState: updatedRunState,
      pendingLoot: salvageLoot  // Store for LootRevealModal
    });

    debugLog('SP_COMBAT', '=== Victory processed, awaiting loot collection ===');

    return {
      success: true,
      outcome: 'victory',
      loot: salvageLoot,
      hull: currentHull,
      message: `Victory! ${salvageLoot.cards.length} cards to salvage.`
    };
  }

  /**
   * Finalize loot collection after user has revealed cards
   * Called from LootRevealModal's onCollect callback
   * @param {Object} loot - The loot object { cards, credits, aiCores, blueprint }
   */
  finalizeLootCollection(loot) {
    debugLog('SP_COMBAT', '=== Finalizing Loot Collection ===');
    debugLog('SP_COMBAT', 'Loot to add:', loot);

    const currentRunState = gameStateManager.getState().currentRunState || {};
    const existingLoot = currentRunState.collectedLoot || [];

    // Convert loot.cards to collectedLoot format
    const newCardLoot = (loot.cards || []).map(card => ({
      type: 'card',
      cardId: card.cardId,
      cardName: card.cardName,
      rarity: card.rarity,
      source: 'combat_salvage'
    }));

    // Add credits as a loot item
    if (loot.credits > 0) {
      newCardLoot.push({
        type: 'credits',
        amount: loot.credits,
        source: 'combat_salvage'
      });
    }

    // Add AI Cores as a loot item (from defeating AI enemies)
    if (loot.aiCores > 0) {
      newCardLoot.push({
        type: 'aiCores',
        amount: loot.aiCores,
        source: 'combat_salvage'
      });
    }

    // Add blueprint if present (supports both legacy card blueprints and drone blueprints)
    if (loot.blueprint) {
      const blueprintLoot = {
        type: 'blueprint',
        blueprintId: loot.blueprint.blueprintId,
        source: loot.blueprint.source || 'combat_salvage_rare'
      };

      // Add drone-specific fields if present
      if (loot.blueprint.blueprintType === 'drone') {
        blueprintLoot.blueprintType = 'drone';
        blueprintLoot.rarity = loot.blueprint.rarity;
        blueprintLoot.droneData = loot.blueprint.droneData;
      }

      newCardLoot.push(blueprintLoot);
    }

    // Update run state with collected loot
    const updatedRunState = {
      ...currentRunState,
      collectedLoot: [...existingLoot, ...newCardLoot],
      creditsEarned: (currentRunState.creditsEarned || 0) + (loot.credits || 0),
      aiCoresEarned: (currentRunState.aiCoresEarned || 0) + (loot.aiCores || 0)
    };

    // Check if this was a blockade encounter (extraction interception) BEFORE clearing state
    const encounter = gameStateManager.getState().singlePlayerEncounter;
    const isBlockade = encounter?.isBlockade;

    // Clear ALL combat state using centralized cleanup
    gameStateManager.resetGameState();

    if (isBlockade) {
      // Blockade victory - return to tactical map with flag to trigger extraction
      // This allows TacticalMapScreen to handle loot selection modal if needed
      // and properly show the run summary
      debugLog('SP_COMBAT', '=== Blockade Victory - Returning to tactical map for extraction ===');

      gameStateManager.setState({
        appState: 'tacticalMap',
        currentRunState: {
          ...updatedRunState,
          pendingBlockadeExtraction: true  // Flag for TacticalMapScreen to auto-extract
        },
        pendingLoot: null
      });

      debugLog('SP_COMBAT', '=== Returned to Tactical Map (pending blockade extraction) ===');
    } else {
      // Regular POI/ambush combat - return to tactical map
      gameStateManager.setState({
        appState: 'tacticalMap',
        currentRunState: updatedRunState,
        pendingLoot: null  // Clear pending loot
      });

      debugLog('SP_COMBAT', '=== Returned to Tactical Map (loot collected) ===');
    }
  }

  /**
   * Process player defeat (MIA)
   * @param {Object} gameState - Game state
   * @param {Object} encounterInfo - Encounter metadata
   * @returns {Object} Defeat result
   */
  processDefeat(gameState, encounterInfo) {
    debugLog('SP_COMBAT', '=== Player Defeat - MIA ===');

    // 1. Track combat loss before ending run
    const currentRunState = gameStateManager.getState().currentRunState || {};

    // Update combatsLost stat before run ends
    if (currentRunState) {
      gameStateManager.setState({
        currentRunState: {
          ...currentRunState,
          combatsLost: (currentRunState.combatsLost || 0) + 1,
          // Set hull to 0 for defeat
          currentHull: 0
        }
      });
    }

    // 2. Determine if this is a starter deck (for display purposes)
    const isStarterDeck = currentRunState.shipSlotId === 0;

    // 3. End run as failure (this generates summary and marks MIA)
    gameStateManager.endRun(false);

    // 4. Clear ALL combat state using centralized cleanup
    gameStateManager.resetGameState();

    // 5. Show failed run loading screen (will transition to hangar on complete)
    gameStateManager.setState({
      showFailedRunScreen: true,
      failedRunType: 'combat',
      failedRunIsStarterDeck: isStarterDeck
    });

    debugLog('SP_COMBAT', '=== Showing Failed Run Screen (combat loss) ===');

    return {
      success: true,
      outcome: 'defeat',
      message: 'Ship destroyed. Mission failed. Ship slot marked as MIA.'
    };
  }

  /**
   * Calculate remaining hull from ship sections
   * NOTE: Combat modifies .hull property, not .currentHull
   * @param {Object} shipSections - Ship sections object
   * @returns {number} Total remaining hull
   */
  calculateRemainingHull(shipSections) {
    let totalHull = 0;

    if (shipSections.bridge) {
      totalHull += shipSections.bridge.hull ?? shipSections.bridge.maxHull ?? 10;
    }
    if (shipSections.powerCell) {
      totalHull += shipSections.powerCell.hull ?? shipSections.powerCell.maxHull ?? 10;
    }
    if (shipSections.droneControlHub) {
      totalHull += shipSections.droneControlHub.hull ?? shipSections.droneControlHub.maxHull ?? 10;
    }

    return totalHull;
  }

  /**
   * Check if combat should be auto-resolved (for testing)
   * @param {Object} gameState - Current game state
   * @returns {boolean} Whether to auto-resolve
   */
  shouldAutoResolve(gameState) {
    // Auto-resolve if in test mode or if explicitly requested
    return gameState.testMode || gameState.autoResolveCombat;
  }
}

// Export singleton
export default new CombatOutcomeProcessor();
