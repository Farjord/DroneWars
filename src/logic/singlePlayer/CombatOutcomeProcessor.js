// ========================================
// COMBAT OUTCOME PROCESSOR
// ========================================
// Handles combat end outcomes for Exploring the Eremos mode
// Processes wins (loot, hull update) and losses (MIA)

import gameStateManager from '../../managers/GameStateManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import lootGenerator from '../loot/LootGenerator.js';
import ExtractionController from './ExtractionController.js';
import aiPersonalities from '../../data/aiData.js';
import MissionService from '../missions/MissionService.js';

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

    // Check if this is a boss combat
    if (encounterInfo.isBossCombat) {
      debugLog('SP_COMBAT', 'Boss combat detected, using boss-specific processing');
      if (winner === 'player1') {
        return this.processBossVictory(gameState, encounterInfo);
      } else {
        return this.processBossDefeat(gameState, encounterInfo);
      }
    }

    // Regular extraction combat
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

    // 2b. Check for pending salvage loot from PoI encounter (when combat was triggered during salvage)
    // This combines salvage loot with combat rewards into a single LootRevealModal
    const pendingSalvageLoot = currentRunState.pendingSalvageLoot;
    if (pendingSalvageLoot) {
      debugLog('SP_COMBAT', 'Combining with pending salvage loot:', pendingSalvageLoot);

      // Prepend salvage cards (PoI loot first, then combat loot)
      salvageLoot.cards = [
        ...(pendingSalvageLoot.cards || []),
        ...(salvageLoot.cards || [])
      ];
      // Combine salvage items by adding credit values
      // Keep the combat salvage item but add pending credits to its value
      const pendingCredits = pendingSalvageLoot.salvageItem?.creditValue || pendingSalvageLoot.credits || 0;
      if (salvageLoot.salvageItem && pendingCredits > 0) {
        salvageLoot.salvageItem = {
          ...salvageLoot.salvageItem,
          creditValue: salvageLoot.salvageItem.creditValue + pendingCredits
        };
      }

      debugLog('SP_COMBAT', 'Combined loot:', salvageLoot);
    }

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
      combatsWon: (currentRunState.combatsWon || 0) + 1,
      pendingSalvageLoot: null  // Clear after combining with combat loot
    };

    // 5. Store pending loot and enter loot reveal state
    // Do NOT return to tactical map yet - WinnerModal will show "Collect Salvage" button
    gameStateManager.setState({
      currentRunState: updatedRunState,
      pendingLoot: salvageLoot  // Store for LootRevealModal
    });

    // 6. Record mission progress for combat victory
    MissionService.recordProgress('COMBAT_WIN', {});

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

    // Add salvage item (replaces flat credits)
    if (loot.salvageItem) {
      newCardLoot.push({
        type: 'salvageItem',
        itemId: loot.salvageItem.itemId,
        name: loot.salvageItem.name,
        creditValue: loot.salvageItem.creditValue,
        image: loot.salvageItem.image,
        description: loot.salvageItem.description,
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
      creditsEarned: (currentRunState.creditsEarned || 0) + (loot.salvageItem?.creditValue || 0),
      aiCoresEarned: (currentRunState.aiCoresEarned || 0) + (loot.aiCores || 0)
    };

    // Check if this was a blockade encounter (extraction interception) BEFORE clearing state
    // Use singlePlayerEncounter.isBlockade as primary, fall back to currentRunState.isBlockadeCombat
    // The fallback handles race conditions where singlePlayerEncounter may be cleared early
    const encounter = gameStateManager.getState().singlePlayerEncounter;
    const isBlockade = encounter?.isBlockade || currentRunState?.isBlockadeCombat;

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
          pendingBlockadeExtraction: true,  // Flag for TacticalMapScreen to auto-extract
          blockadeCleared: true  // Persistent flag - prevents re-rolling blockade if auto-extract fails
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
   * Process boss combat victory
   * Awards first-time or repeat rewards based on boss progress
   * Returns to hangar after loot collection (not tactical map)
   * @param {Object} gameState - Game state
   * @param {Object} encounterInfo - Encounter metadata with bossId
   * @returns {Object} Victory result with boss-specific rewards
   */
  processBossVictory(gameState, encounterInfo) {
    debugLog('SP_COMBAT', '=== Boss Victory ===');

    const bossId = encounterInfo.bossId;
    const state = gameStateManager.getState();
    const profile = state.singlePlayerProfile || {};
    const bossProgress = profile.bossProgress || { defeatedBosses: [], totalBossVictories: 0, totalBossAttempts: 0 };

    // Find boss AI configuration to get rewards
    const bossAI = aiPersonalities.find(ai => ai.bossId === bossId);
    const bossConfig = bossAI?.bossConfig || {};

    // Determine if this is first victory against this boss
    const isFirstBossVictory = !bossProgress.defeatedBosses.includes(bossId);
    const rewards = isFirstBossVictory ? bossConfig.firstTimeReward : bossConfig.repeatReward;

    debugLog('SP_COMBAT', 'Boss ID:', bossId);
    debugLog('SP_COMBAT', 'First victory:', isFirstBossVictory);
    debugLog('SP_COMBAT', 'Rewards:', rewards);

    // Build boss loot object
    const bossLoot = {
      credits: rewards?.credits || 0,
      aiCores: rewards?.aiCores || 0,
      reputation: rewards?.reputation || 0,
      isBossReward: true
    };

    // Update boss progress in profile
    const updatedDefeatedBosses = isFirstBossVictory
      ? [...bossProgress.defeatedBosses, bossId]
      : bossProgress.defeatedBosses;

    gameStateManager.setState({
      singlePlayerProfile: {
        ...profile,
        bossProgress: {
          ...bossProgress,
          defeatedBosses: updatedDefeatedBosses,
          totalBossVictories: bossProgress.totalBossVictories + 1
        }
      },
      pendingLoot: bossLoot
    });

    // Record mission progress for combat victory (boss fights count as combat wins)
    MissionService.recordProgress('COMBAT_WIN', {});

    debugLog('SP_COMBAT', '=== Boss victory processed, awaiting loot collection ===');

    return {
      success: true,
      outcome: 'victory',
      isBossReward: true,
      isFirstBossVictory,
      loot: bossLoot,
      message: isFirstBossVictory
        ? `First victory! Claimed ${bossLoot.credits} credits, ${bossLoot.aiCores} AI Cores, ${bossLoot.reputation} reputation.`
        : `Victory! Claimed ${bossLoot.credits} credits, ${bossLoot.aiCores} AI Cores.`
    };
  }

  /**
   * Process boss combat defeat
   * Marks ship as MIA and returns to hangar with failed screen
   * @param {Object} gameState - Game state
   * @param {Object} encounterInfo - Encounter metadata with bossId
   * @returns {Object} Defeat result
   */
  processBossDefeat(gameState, encounterInfo) {
    debugLog('SP_COMBAT', '=== Boss Defeat - MIA ===');

    const currentRunState = gameStateManager.getState().currentRunState || {};

    // Determine if this is a starter deck (for display purposes)
    const isStarterDeck = currentRunState.shipSlotId === 0;

    // End run as failure (marks MIA)
    gameStateManager.endRun(false);

    // Clear combat state
    gameStateManager.resetGameState();

    // Show failed run screen with boss-specific type
    gameStateManager.setState({
      showFailedRunScreen: true,
      failedRunType: 'boss',
      failedRunIsStarterDeck: isStarterDeck
    });

    debugLog('SP_COMBAT', '=== Showing Failed Run Screen (boss defeat) ===');

    return {
      success: true,
      outcome: 'defeat',
      message: 'Ship destroyed by boss. Mission failed. Ship slot marked as MIA.'
    };
  }

  /**
   * Finalize boss loot collection
   * Applies rewards directly to profile and returns to hangar
   * @param {Object} loot - Boss loot { credits, aiCores, reputation, isBossReward }
   */
  finalizeBossLootCollection(loot) {
    debugLog('SP_COMBAT', '=== Finalizing Boss Loot Collection ===');
    debugLog('SP_COMBAT', 'Boss loot:', loot);

    const state = gameStateManager.getState();
    const profile = state.singlePlayerProfile || {};

    // Apply rewards directly to profile
    const updatedProfile = {
      ...profile,
      credits: (profile.credits || 0) + (loot.credits || 0),
      aiCores: (profile.aiCores || 0) + (loot.aiCores || 0),
      reputation: {
        ...profile.reputation,
        current: (profile.reputation?.current || 0) + (loot.reputation || 0)
      }
    };

    // Clear combat state and return to hangar
    gameStateManager.resetGameState();

    gameStateManager.setState({
      appState: 'hangar',
      singlePlayerProfile: updatedProfile,
      pendingLoot: null,
      singlePlayerEncounter: null
    });

    debugLog('SP_COMBAT', '=== Returned to Hangar (boss loot collected) ===');
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
