// ========================================
// COMBAT OUTCOME PROCESSOR
// ========================================
// Handles combat end outcomes for Exploring the Eremos mode
// Processes wins (loot, hull update) and losses (MIA)

import gameStateManager from '../../managers/GameStateManager.js';
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import lootGenerator from '../loot/LootGenerator.js';
import ExtractionController from './ExtractionController.js';
import EncounterController from '../encounters/EncounterController.js';
import DetectionManager from '../detection/DetectionManager.js';
import aiPersonalities from '../../data/aiData.js';
import MissionService from '../missions/MissionService.js';
import { calculateLoadoutValue, calculateCombatReputation } from '../reputation/ReputationCalculator.js';
import { mapTiers } from '../../data/mapData.js';

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
    // Read from TacticalMapStateManager
    const currentRunState = tacticalMapStateManager.getState() || {};

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

    // 2. Calculate combat reputation earned (before loot generation)
    const encounterAI = encounterInfo?.aiId || gameState.singlePlayerEncounter?.aiId;

    // Skip combat rep for boss encounters (use boss reward system)
    if (!encounterInfo.isBossCombat && encounterAI) {
      const mapTier = currentRunState.mapTier || 1;

      // Get loadout value from current ship slot
      const gameStateObj = gameStateManager.getState();
      const shipSlot = gameStateObj.singlePlayerShipSlots?.find(s => s.id === currentRunState.shipSlotId);

      if (shipSlot) {
        const loadoutValue = calculateLoadoutValue(shipSlot);

        // Get map tier cap
        const mapConfig = mapTiers.find(t => t.tier === mapTier);
        const tierCap = mapConfig?.maxReputationPerCombat || 5000;

        // Calculate combat rep
        const combatRep = calculateCombatReputation(
          loadoutValue.totalValue,
          encounterAI,
          tierCap
        );

        // Add to run state tracking
        const combatRepEntry = {
          aiId: encounterAI,
          aiDifficulty: combatRep.aiDifficulty,
          deckValue: combatRep.deckValue,
          capUsed: combatRep.tierCap,
          repEarned: combatRep.repEarned,
          wasCapped: combatRep.wasCapped,
          timestamp: Date.now()
        };

        currentRunState.combatReputationEarned = [
          ...(currentRunState.combatReputationEarned || []),
          combatRepEntry
        ];

        debugLog('SP_COMBAT', 'Combat reputation calculated:', combatRepEntry);
      }
    } else if (encounterInfo.isBossCombat) {
      debugLog('SP_COMBAT', 'Boss combat - using boss reward system, skipping combat rep');
    }

    // 3. Generate salvage loot using LootGenerator
    const enemyDeck = gameState.player2?.deck || [];
    const enemyTier = encounterInfo?.tier || 1;
    const aiDifficulty = encounterInfo?.aiDifficulty || null;
    const salvageLoot = lootGenerator.generateCombatSalvage(enemyDeck, enemyTier, aiDifficulty);
    debugLog('SP_COMBAT', 'Generated salvage loot:', salvageLoot);

    // 2b. Check for pending salvage loot from PoI encounter
    // When combat was triggered during salvage (fromSalvage: true):
    //   - DON'T combine loot - POI loot stays separate for salvage screen
    //   - DON'T clear pendingSalvageLoot - it's needed when returning to salvage modal
    // When fromSalvage is false/undefined:
    //   - Combine loot as before (legacy behavior for regular POI combat)
    const pendingSalvageLoot = currentRunState.pendingSalvageLoot;
    const isFromSalvage = currentRunState?.pendingPOICombat?.fromSalvage === true;

    if (pendingSalvageLoot && !isFromSalvage) {
      // Legacy behavior: combine loot for non-salvage combat
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
    } else if (isFromSalvage) {
      debugLog('SP_COMBAT', 'Combat from salvage - keeping POI loot separate for salvage screen');
    }

    // 3. Check for drone blueprint POI reward
    // First check encounterInfo.reward.rewardType, fallback to pendingPOICombat.packType
    // NOTE: Drone blueprints are stored SEPARATELY as pendingDroneBlueprint (not in salvageLoot)
    // This allows WinnerModal to show a special modal AFTER regular salvage collection
    let pendingDroneBlueprint = null;
    const rewardType = encounterInfo?.reward?.rewardType
      || currentRunState?.pendingPOICombat?.packType;
    if (rewardType?.startsWith('DRONE_BLUEPRINT_')) {
      debugLog('SP_COMBAT', 'Drone blueprint POI - generating blueprint:', rewardType);

      // Read unlocked blueprints from profile
      const state = gameStateManager.getState();
      const profile = state.singlePlayerProfile || {};
      const unlockedBlueprints = profile.unlockedBlueprints || [];

      const droneBlueprint = lootGenerator.generateDroneBlueprint(rewardType, enemyTier, unlockedBlueprints);

      // Check if all blueprints in this category are exhausted
      if (droneBlueprint?.type === 'blueprint_exhausted') {
        debugLog('SP_COMBAT', 'All blueprints exhausted for', droneBlueprint.poiType, '- awarding bonus salvage');

        // Generate higher-tier salvage as compensation
        const rng = lootGenerator.createRNG(Date.now());

        // Determine what rarity would have been rolled (for fallback tier calculation)
        const tierKey = `tier${enemyTier}`;
        const rarityWeights = {
          tier1: { Common: 90, Uncommon: 10, Rare: 0 },
          tier2: { Common: 60, Uncommon: 35, Rare: 5 },
          tier3: { Common: 40, Uncommon: 45, Rare: 15 }
        };
        const weights = rarityWeights[tierKey] || rarityWeights.tier1;
        const rolledRarity = lootGenerator.rollRarity(weights, rng);

        // Generate bonus salvage
        const bonusSalvage = lootGenerator.generateBlueprintFallbackSalvage(rolledRarity, rng);

        // Add to salvageLoot
        if (salvageLoot.salvageItem) {
          // Combine credit values
          salvageLoot.salvageItem.creditValue += bonusSalvage.creditValue;
        } else {
          salvageLoot.salvageItem = bonusSalvage;
        }

        // Set pendingDroneBlueprint to null (no blueprint awarded)
        pendingDroneBlueprint = null;

        // Store exhaustion message for UI display
        gameStateManager.setState({
          blueprintExhaustedMessage: 'All blueprints in this category unlocked! Awarded bonus salvage.'
        });

        debugLog('SP_COMBAT', 'Bonus salvage awarded:', bonusSalvage);
      } else if (droneBlueprint) {
        // Store separately - NOT in salvageLoot.blueprint
        pendingDroneBlueprint = droneBlueprint;
        debugLog('SP_COMBAT', 'Drone blueprint generated (pending for special modal):', droneBlueprint);
      }
    }

    // 4. Update run state with hull (but NOT loot yet - that happens after reveal)
    // When fromSalvage: keep pendingSalvageLoot for later collection on salvage screen
    // When not fromSalvage: clear it since we already combined with combat loot
    const updatedRunState = {
      ...currentRunState,
      shipSections: updatedShipSections,
      currentHull: currentHull,
      combatsWon: (currentRunState.combatsWon || 0) + 1,
      combatReputationEarned: currentRunState.combatReputationEarned || [],  // Preserve combat rep array
      pendingSalvageLoot: isFromSalvage ? currentRunState.pendingSalvageLoot : null
    };

    // 5. Apply conditional threat increase for blueprint PoI victories (Phase 7)
    const pendingPOICombat = currentRunState?.pendingPOICombat;
    const fromBlueprintPoI = pendingPOICombat?.fromBlueprintPoI === true;

    if (fromBlueprintPoI) {
      // Get threat increase from PoI data
      const poi = currentRunState?.currentPOI;
      const threatIncrease = poi?.poiData?.threatIncrease || 0;

      if (poi?.poiData?.threatIncreaseOnVictoryOnly && threatIncrease > 0) {
        DetectionManager.addDetection(threatIncrease, `Blueprint PoI victory: ${poi.poiData.name}`);
        debugLog('SP_COMBAT', `Applied blueprint PoI threat increase: +${threatIncrease}%`);
      }

      // CRITICAL: Blueprint PoI victories do NOT reset Signal Lock
      // Player chose to engage, so tracking continues uninterrupted
      debugLog('SP_COMBAT', 'Signal Lock RETAINED (blueprint PoI victory)');
    }

    // 6. Store pending loot and enter loot reveal state
    // Do NOT return to tactical map yet - WinnerModal will show "Collect Salvage" button
    // Update TacticalMapStateManager with the run state changes
    const stateUpdates = {
      shipSections: updatedShipSections,
      currentHull: currentHull,
      combatsWon: updatedRunState.combatsWon,
      combatReputationEarned: updatedRunState.combatReputationEarned,  // Include combat rep tracking
      pendingSalvageLoot: updatedRunState.pendingSalvageLoot,
      pendingPOICombat: currentRunState.pendingPOICombat,
      pendingSalvageState: currentRunState.pendingSalvageState,
      encounterDetectionChance: fromBlueprintPoI ? currentRunState.encounterDetectionChance : 0  // Preserve Signal Lock for blueprint PoIs
    };

    // Mark blueprint PoI as looted after victory
    if (fromBlueprintPoI && currentRunState?.currentPOI) {
      const poi = currentRunState.currentPOI;
      const lootedPOIs = currentRunState.lootedPOIs || [];
      stateUpdates.lootedPOIs = [...lootedPOIs, { q: poi.q, r: poi.r }];
      debugLog('SP_COMBAT', `Marked blueprint PoI as looted: (${poi.q}, ${poi.r})`);
    }

    tacticalMapStateManager.setState(stateUpdates);

    // 6b. Reset Signal Lock (encounter detection) on combat victory
    // ONLY for non-blueprint encounters (regular ambushes/encounters)
    // Blueprint combat does NOT disrupt enemy tracking
    if (!fromBlueprintPoI) {
      EncounterController.resetEncounterDetection();
      debugLog('SP_COMBAT', 'Signal Lock reset (non-blueprint victory)');
    }

    // Store UI-level state in GameStateManager
    gameStateManager.setState({
      pendingLoot: salvageLoot,  // Store for LootRevealModal
      pendingDroneBlueprint,  // Store separately for special modal (null if no blueprint)
      hasPendingDroneBlueprint: pendingDroneBlueprint !== null  // Flag for UI to show blueprint modal
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

    // Read from TacticalMapStateManager
    const currentRunState = tacticalMapStateManager.getState() || {};

    // Log pendingPOICombat state for debugging consecutive combat issues
    debugLog('SP_COMBAT', '=== Checking pendingPOICombat State ===', {
      hadPendingPOICombat: !!currentRunState.pendingPOICombat,
      pendingPOICombatData: currentRunState.pendingPOICombat
    });
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

    // Add security tokens as loot items (for run inventory tracking)
    if (loot.token) {
      newCardLoot.push({
        type: 'token',
        tokenType: loot.token.tokenType || 'security',
        amount: loot.token.amount || 1,
        source: loot.token.source || 'combat_salvage'
      });
    }
    if (loot.tokens?.length > 0) {
      loot.tokens.forEach(token => {
        newCardLoot.push({
          type: 'token',
          tokenType: token.tokenType || 'security',
          amount: token.amount || 1,
          source: token.source || 'combat_salvage'
        });
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
    const fullState = gameStateManager.getState();
    const encounter = fullState.singlePlayerEncounter;
    const isBlockade = encounter?.isBlockade || currentRunState?.isBlockadeCombat;

    // Check for pending drone blueprint BEFORE clearing state
    // This triggers the special blueprint modal after regular salvage collection
    const pendingDroneBlueprint = fullState.pendingDroneBlueprint;

    // NOTE: resetGameState() is called conditionally below, NOT unconditionally here.
    // For pending drone blueprints, we must NOT call resetGameState() because it clears
    // player1/player2 states, which causes App.jsx to show "Initializing game board..."
    // instead of keeping the combat screen visible for the blueprint modal.

    if (isBlockade) {
      // Clear combat state for blockade case
      gameStateManager.resetGameState();
      // Blockade victory - return to tactical map with flag to trigger extraction
      // This allows TacticalMapScreen to handle loot selection modal if needed
      // and properly show the run summary
      debugLog('MODE_TRANSITION', '=== MODE: inGame -> tacticalMap (blockade victory) ===', {
        trigger: 'auto_trigger',
        source: 'CombatOutcomeProcessor.processVictory',
        detail: 'Blockade cleared, returning for auto-extraction'
      });
      debugLog('SP_COMBAT', '=== Blockade Victory - Returning to tactical map for extraction ===');

      // Update TacticalMapStateManager
      tacticalMapStateManager.setState({
        collectedLoot: updatedRunState.collectedLoot,
        creditsEarned: updatedRunState.creditsEarned,
        aiCoresEarned: updatedRunState.aiCoresEarned,
        pendingBlockadeExtraction: true,
        blockadeCleared: true,
        pendingPOICombat: currentRunState.pendingPOICombat,
        pendingSalvageState: currentRunState.pendingSalvageState
      });

      debugLog('RUN_STATE', 'CombatOutcome - Updated TacticalMapStateManager (blockade victory):', {
        backgroundIndex: tacticalMapStateManager.getState()?.mapData?.backgroundIndex,
        pendingWaypoints: tacticalMapStateManager.getState()?.pendingWaypoints?.length || 0
      });

      gameStateManager.setState({
        appState: 'tacticalMap',
        pendingLoot: null,
        // Preserve drone blueprint for special modal (if exists)
        pendingDroneBlueprint,
        hasPendingDroneBlueprint: !!pendingDroneBlueprint
      });

      debugLog('SP_COMBAT', '=== Returned to Tactical Map (pending blockade extraction) ===');
    } else if (pendingDroneBlueprint) {
      // Regular combat with pending drone blueprint - stay in combat screen
      // WinnerModal will show the DroneBlueprintRewardModal
      // Update TacticalMapStateManager
      tacticalMapStateManager.setState({
        collectedLoot: updatedRunState.collectedLoot,
        creditsEarned: updatedRunState.creditsEarned,
        aiCoresEarned: updatedRunState.aiCoresEarned,
        pendingPOICombat: currentRunState.pendingPOICombat,
        pendingSalvageState: currentRunState.pendingSalvageState
      });

      debugLog('RUN_STATE', 'CombatOutcome - Updated TacticalMapStateManager (pending blueprint):', {
        backgroundIndex: tacticalMapStateManager.getState()?.mapData?.backgroundIndex,
        pendingWaypoints: tacticalMapStateManager.getState()?.pendingWaypoints?.length || 0
      });

      gameStateManager.setState({
        pendingLoot: null,  // Clear pending loot
        pendingDroneBlueprint,
        hasPendingDroneBlueprint: true
        // NOTE: Do NOT set appState yet - WinnerModal handles transition after blueprint accepted
      });

      debugLog('SP_COMBAT', '=== Pending drone blueprint modal (staying in combat screen) ===');
    } else {
      // Regular POI/ambush combat without blueprint - return to tactical map
      // Clear combat state for regular case
      gameStateManager.resetGameState();

      debugLog('MODE_TRANSITION', '=== MODE: inGame -> tacticalMap (combat victory) ===', {
        trigger: 'auto_trigger',
        source: 'CombatOutcomeProcessor.processVictory',
        detail: 'Regular POI/ambush victory, returning to tactical map'
      });

      // Update TacticalMapStateManager
      tacticalMapStateManager.setState({
        collectedLoot: updatedRunState.collectedLoot,
        creditsEarned: updatedRunState.creditsEarned,
        aiCoresEarned: updatedRunState.aiCoresEarned,
        pendingPOICombat: currentRunState.pendingPOICombat,
        pendingSalvageState: currentRunState.pendingSalvageState
      });

      debugLog('RUN_STATE', 'CombatOutcome - Updated TacticalMapStateManager (regular victory):', {
        backgroundIndex: tacticalMapStateManager.getState()?.mapData?.backgroundIndex,
        pendingWaypoints: tacticalMapStateManager.getState()?.pendingWaypoints?.length || 0
      });

      gameStateManager.setState({
        appState: 'tacticalMap',
        pendingLoot: null  // Clear pending loot
      });

      debugLog('SP_COMBAT', '=== Returned to Tactical Map (loot collected) ===');
    }
  }

  /**
   * Finalize drone blueprint collection after special modal
   * Called when user accepts the drone blueprint from DroneBlueprintRewardModal
   * Adds blueprint to collectedLoot and returns to tactical map
   * @param {Object} blueprint - The drone blueprint to add { blueprintId, blueprintType, rarity, droneData }
   */
  finalizeBlueprintCollection(blueprint) {
    debugLog('SP_COMBAT', '=== Finalizing Blueprint Collection ===');
    debugLog('SP_COMBAT', 'Blueprint:', blueprint);

    // Read from TacticalMapStateManager
    const currentRunState = tacticalMapStateManager.getState() || {};
    const existingLoot = currentRunState.collectedLoot || [];

    // Add blueprint to collectedLoot
    const blueprintLoot = {
      type: 'blueprint',
      blueprintId: blueprint.blueprintId,
      blueprintType: blueprint.blueprintType || 'drone',
      rarity: blueprint.rarity,
      droneData: blueprint.droneData,
      source: 'drone_poi_reward'
    };

    // Update TacticalMapStateManager
    tacticalMapStateManager.setState({
      collectedLoot: [...existingLoot, blueprintLoot]
    });

    // Return to tactical map and clear blueprint state
    gameStateManager.setState({
      appState: 'tacticalMap',
      pendingDroneBlueprint: null,
      hasPendingDroneBlueprint: false,
      blueprintExhaustedMessage: null  // Clear exhaustion message
    });

    debugLog('SP_COMBAT', '=== Blueprint collected, returned to Tactical Map ===');
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
    // Read from TacticalMapStateManager
    const currentRunState = tacticalMapStateManager.getState() || {};

    // Update combatsLost stat before run ends
    if (tacticalMapStateManager.isRunActive()) {
      tacticalMapStateManager.setState({
        combatsLost: (currentRunState.combatsLost || 0) + 1,
        // Set hull to 0 for defeat
        currentHull: 0
      });
    }

    // 2. Determine if this is a starter deck (for display purposes)
    const isStarterDeck = currentRunState.shipSlotId === 0;

    // 3. End run as failure (this generates summary and marks MIA)
    gameStateManager.endRun(false);

    // 4. Clear ALL combat state using centralized cleanup
    gameStateManager.resetGameState();

    // 5. Show failed run loading screen (will transition to hangar on complete)
    debugLog('MODE_TRANSITION', '=== MODE: inGame -> failedRunScreen (combat defeat) ===', {
      trigger: 'auto_trigger',
      source: 'CombatOutcomeProcessor.processDefeat',
      detail: 'Ship destroyed in combat, showing failed run screen'
    });

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

    // Read from TacticalMapStateManager
    const currentRunState = tacticalMapStateManager.getState() || {};

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

    debugLog('MODE_TRANSITION', '=== MODE: inGame -> hangar (boss victory) ===', {
      trigger: 'user_action',
      source: 'CombatOutcomeProcessor.finalizeBossLootCollection',
      detail: 'Boss defeated and loot collected, returning to hangar'
    });

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
