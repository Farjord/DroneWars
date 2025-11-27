// ========================================
// COMBAT OUTCOME PROCESSOR
// ========================================
// Handles combat end outcomes for Exploring the Eremos mode
// Processes wins (loot, hull update) and losses (MIA)

import gameStateManager from '../../managers/GameStateManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import lootGenerator from '../loot/LootGenerator.js';

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
    const salvageLoot = lootGenerator.generateCombatSalvage(enemyDeck, enemyTier);
    debugLog('SP_COMBAT', 'Generated salvage loot:', salvageLoot);

    // 3. Update run state with hull (but NOT loot yet - that happens after reveal)
    const updatedRunState = {
      ...currentRunState,
      shipSections: updatedShipSections,
      currentHull: currentHull,
      combatsWon: (currentRunState.combatsWon || 0) + 1
    };

    // 4. Store pending loot and enter loot reveal state
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
   * @param {Object} loot - The loot object { cards, credits, blueprint }
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

    // Add blueprint if present
    if (loot.blueprint) {
      newCardLoot.push({
        type: 'blueprint',
        blueprintId: loot.blueprint.blueprintId,
        source: 'combat_salvage_rare'
      });
    }

    // Update run state with collected loot
    const updatedRunState = {
      ...currentRunState,
      collectedLoot: [...existingLoot, ...newCardLoot],
      creditsEarned: (currentRunState.creditsEarned || 0) + (loot.credits || 0)
    };

    // Return to tactical map with FULL combat state cleanup
    gameStateManager.setState({
      appState: 'tacticalMap',
      gameActive: false,
      currentRunState: updatedRunState,
      pendingLoot: null,  // Clear pending loot

      // Clear ALL combat state (prevents contamination of subsequent combats)
      winner: null,
      singlePlayerEncounter: null,
      player1: null,
      player2: null,
      turnPhase: null,
      currentPlayer: null,
      turn: null,
      roundNumber: null,
      gameStage: null,
      passInfo: null,
      firstPlayerOfRound: null,
      firstPasserOfPreviousRound: null,
      placedSections: [],
      opponentPlacedSections: [],
      unplacedSections: [],
      gameLog: [],
      commitments: {},
      shieldsToAllocate: 0,
      opponentShieldsToAllocate: 0,
      droneSelectionPool: [],
      droneSelectionTrio: []
    });

    debugLog('SP_COMBAT', '=== Returned to Tactical Map (loot collected) ===');
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

    // 2. End run as failure (this generates summary and marks MIA)
    gameStateManager.endRun(false);

    // 3. Clear combat state and set appState (endRun doesn't set appState)
    gameStateManager.setState({
      appState: 'hangar',
      gameActive: false,

      // Clear ALL combat state (prevents contamination of subsequent combats)
      winner: null,
      singlePlayerEncounter: null,
      player1: null,
      player2: null,
      turnPhase: null,
      currentPlayer: null,
      turn: null,
      roundNumber: null,
      gameStage: null,
      passInfo: null,
      firstPlayerOfRound: null,
      firstPasserOfPreviousRound: null,
      placedSections: [],
      opponentPlacedSections: [],
      unplacedSections: [],
      gameLog: [],
      commitments: {},
      shieldsToAllocate: 0,
      opponentShieldsToAllocate: 0,
      droneSelectionPool: [],
      droneSelectionTrio: []
    });

    debugLog('SP_COMBAT', '=== Returned to Hangar (MIA, combat state cleared) ===');

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
