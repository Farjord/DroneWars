// ========================================
// AI PHASE PROCESSOR
// ========================================
// Handles AI processing for simultaneous phases in single-player mode
// Provides instant AI decisions for SimultaneousActionManager commitment system

import GameDataService from '../services/GameDataService.js';
import { shipComponentsToPlacement } from '../utils/deckExportUtils.js';
import { debugLog } from '../utils/debugLogger.js';
import SeededRandom from '../utils/seededRandom.js';

/**
 * AIPhaseProcessor - Handles AI completion of simultaneous phases
 */
class AIPhaseProcessor {
  constructor() {
    this.aiPersonalities = null;
    this.dronePool = null;
    this.currentAIPersonality = null;
    this.gameDataService = null;

    // AI turn management
    this.isProcessing = false;
    this.turnTimer = null;

    // Initialization guards and cleanup tracking
    this.isInitialized = false;
    this.stateSubscriptionCleanup = null;
  }

  /**
   * Initialize with game data and AI personality
   * @param {Object} aiPersonalities - Available AI personalities
   * @param {Array} dronePool - Available drones for selection
   * @param {Object} currentPersonality - Current AI personality being used
   * @param {Object} actionProcessor - ActionProcessor instance for executing actions
   * @param {Object} gameStateManager - GameStateManager instance for state updates
   */
  initialize(aiPersonalities, dronePool, currentPersonality, actionProcessor = null, gameStateManager = null) {
    // Check if already initialized
    if (this.isInitialized) {
      debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor already initialized, skipping...');
      return;
    }

    // Clean up any previous subscription
    if (this.stateSubscriptionCleanup) {
      this.stateSubscriptionCleanup();
      this.stateSubscriptionCleanup = null;
    }

    this.aiPersonalities = aiPersonalities;
    this.dronePool = dronePool;
    this.currentAIPersonality = currentPersonality;
    this.actionProcessor = actionProcessor;
    this.gameStateManager = gameStateManager;

    // Initialize GameDataService for centralized data computation
    if (gameStateManager && !this.gameDataService) {
      this.gameDataService = GameDataService.getInstance(gameStateManager);

      // Create wrapper function for ship stats compatibility with aiLogic.js
      this.effectiveShipStatsWrapper = (playerState, placedSections) => {
        return this.gameDataService.getEffectiveShipStats(playerState, placedSections);
      };
    }

    // Subscribe to game state changes for AI turn detection
    if (gameStateManager) {
      this.stateSubscriptionCleanup = gameStateManager.subscribe((event) => {
        this.checkForAITurn(event.state);
      });
    }

    this.isInitialized = true;

    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor initialized with personality:', currentPersonality?.name || 'Default');
    if (actionProcessor) {
      debugLog('AI_DECISIONS', '🔗 AIPhaseProcessor connected to ActionProcessor for execution');
    }
    if (gameStateManager) {
      debugLog('AI_DECISIONS', '🔗 AIPhaseProcessor subscribed to GameStateManager for self-triggering');
    }
  }

  /**
   * Cleanup AI processor resources
   * Clears timers and unsubscribes from state changes
   */
  cleanup() {
    debugLog('AI_DECISIONS', '🧹 AIPhaseProcessor: Cleaning up resources');

    // Clear any pending AI turn timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    // Unsubscribe from game state changes
    if (this.stateSubscriptionCleanup) {
      this.stateSubscriptionCleanup();
      this.stateSubscriptionCleanup = null;
    }

    // Reset processing state
    this.isProcessing = false;
    this.isInitialized = false;

    debugLog('AI_DECISIONS', '✅ AIPhaseProcessor: Cleanup complete');
  }

  /**
   * Process AI drone selection for droneSelection phase
   * Selects 5 drones from AI's deck of 10 drones
   * @param {Object} aiPersonality - Optional AI personality override (future use)
   * @returns {Promise<Array>} Array of 5 selected drone objects
   */
  async processDroneSelection(aiPersonality = null) {
    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.processDroneSelection starting (selecting 5 from deck)...');

    // Get AI's deck drones from commitments (set during deckSelection phase)
    const gameState = this.gameStateManager.getState();
    const commitments = gameState.commitments;
    const deckCommitments = commitments?.deckSelection;

    if (!deckCommitments || !deckCommitments.player2) {
      throw new Error('AI deck commitment not found - deckSelection phase must complete first');
    }

    // Extract the AI's deck drones (5-10 drones allowed)
    const deckDroneNames = deckCommitments.player2.drones || [];
    debugLog('AI_DECISIONS', `🎲 AI deck contains ${deckDroneNames.length} drones:`, deckDroneNames.join(', '));

    if (deckDroneNames.length < 5 || deckDroneNames.length > 10) {
      throw new Error(`AI deck must have 5-10 drones, found ${deckDroneNames.length}`);
    }

    // Map drone names to full drone objects
    const availableDrones = this.extractDronesFromDeck(deckDroneNames);

    if (availableDrones.length < 5) {
      debugLog('AI_DECISIONS', '❌ Failed to extract minimum required drones from deck');
      throw new Error(`Only extracted ${availableDrones.length} drones from AI deck (minimum 5 required)`);
    }

    // Randomly select 5 drones from available pool (works for 5-10 drones)
    const selectedDrones = this.randomlySelectDrones(availableDrones, 5);

    const selectedNames = selectedDrones.map(d => d.name).join(', ');
    debugLog('AI_DECISIONS', `🤖 AI randomly selected 5 drones from ${availableDrones.length} available: ${selectedNames}`);

    return selectedDrones;
  }

  /**
   * Extract drone objects from drone names array
   * @param {Array} droneNames - Array of drone names
   * @returns {Array} Array of drone objects
   */
  extractDronesFromDeck(droneNames) {
    const drones = droneNames.map(name => {
      const drone = this.dronePool?.find(d => d.name === name);
      if (!drone) {
        debugLog('AI_DECISIONS', `⚠️ Drone "${name}" not found in drone collection`);
      }
      return drone;
    }).filter(Boolean); // Remove undefined entries

    return drones;
  }

  /**
   * Randomly select N drones from available pool
   * @param {Array} availableDrones - Pool of drones to select from
   * @param {number} count - Number of drones to select
   * @returns {Array} Array of randomly selected drones
   */
  randomlySelectDrones(availableDrones, count) {
    const gameState = this.gameStateManager?.getState();
    const rng = SeededRandom.fromGameState(gameState || {});
    const shuffled = rng.shuffle(availableDrones);
    return shuffled.slice(0, count);
  }

  /**
   * Process AI deck selection for deckSelection phase
   * Returns both deck (40 cards) and drones (10 drones)
   * @param {Object} aiPersonality - Optional AI personality override
   * @returns {Promise<Object>} Object with { deck: Array, drones: Array }
   */
  async processDeckSelection(aiPersonality = null) {
    const personality = aiPersonality || this.currentAIPersonality;

    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.processDeckSelection starting (selecting 40 cards + drones)...');

    // Get current game state for accessing gameSeed
    const gameState = this.gameStateManager.getState();

    // Select cards for deck
    let selectedDeck = [];
    if (personality && personality.decklist && personality.decklist.length > 0) {
      // Use AI's custom decklist from personality
      debugLog('AI_DECISIONS', `🎯 Using ${personality.name} personality decklist`);

      // Import the game engine to build the deck
      const { gameEngine } = await import('../logic/gameLogic.js');
      selectedDeck = gameEngine.buildDeckFromList(personality.decklist, 'player2', gameState.gameSeed);
    } else {
      // Fallback to standard deck
      debugLog('AI_DECISIONS', `🎯 Using standard deck as fallback`);

      const { gameEngine, startingDecklist } = await import('../logic/gameLogic.js');
      selectedDeck = gameEngine.buildDeckFromList(startingDecklist, 'player2', gameState.gameSeed);
    }

    // Select drones from personality's dronePool (5-10 drones allowed)
    let selectedDrones = [];
    if (personality && personality.dronePool && Array.isArray(personality.dronePool)) {
      // Use AI's dronePool from personality
      selectedDrones = [...personality.dronePool]; // Copy the personality's drone list
      debugLog('AI_DECISIONS', `🎯 Using ${personality.name} personality dronePool: ${selectedDrones.length} drones`);

      // Validate drone count
      if (selectedDrones.length < 5) {
        throw new Error(`AI personality '${personality.name}' has only ${selectedDrones.length} drones in dronePool. Minimum 5 required.`);
      }
      if (selectedDrones.length > 10) {
        throw new Error(`AI personality '${personality.name}' has ${selectedDrones.length} drones in dronePool. Maximum 10 allowed.`);
      }
    } else {
      // Fallback to standard drone list if personality doesn't have dronePool
      debugLog('AI_DECISIONS', `⚠️ Personality missing dronePool, using standard drone list as fallback`);
      const { startingDroneList } = await import('../logic/gameLogic.js');
      selectedDrones = [...startingDroneList];
    }

    debugLog('AI_DECISIONS', `✅ AI selected deck: ${selectedDeck.length} cards + ${selectedDrones.length} drones`);
    debugLog('AI_DECISIONS', `🎲 AI drones: ${selectedDrones.join(', ')}`);

    // Read shipComponents directly from personality
    const shipComponents = personality?.shipComponents || {
      'BRIDGE_001': 'l',
      'POWERCELL_001': 'm',
      'DRONECONTROL_001': 'r'
    };
    debugLog('AI_DECISIONS', `🎯 Using ${personality?.name || 'default'} ship components:`, shipComponents);

    return {
      deck: selectedDeck,
      drones: selectedDrones,
      shipComponents: shipComponents
    };
  }

  /**
   * Process AI ship placement for placement phase
   * @param {Object} aiPersonality - Optional AI personality override
   * @returns {Promise<Array>} Array of placed ship section keys [lane0, lane1, lane2]
   */
  async processPlacement(aiPersonality = null) {
    const personality = aiPersonality || this.currentAIPersonality;

    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.processPlacement starting...');

    // Convert shipComponents to legacy placement array
    let placedSections;

    if (personality?.shipComponents) {
      placedSections = shipComponentsToPlacement(personality.shipComponents);
      debugLog('AI_DECISIONS', `🎯 Using ${personality.name} placement: ${placedSections.join(', ')}`);
    } else {
      placedSections = ['bridge', 'powerCell', 'droneControlHub'];
      debugLog('AI_DECISIONS', `⚠️ No shipComponents in personality, using default: ${placedSections.join(', ')}`);
    }

    debugLog('AI_DECISIONS', `🤖 AI placement completed: ${placedSections.join(', ')}`);

    return placedSections;
  }

  /**
   * Execute AI turn for deployment phase
   * @param {Object} gameState - Current game state
   * @returns {Promise<Object>} Execution result
   */
  async executeDeploymentTurn(gameState) {
    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.executeDeploymentTurn starting...');

    // Check if AI should pass
    if (this.shouldPass(gameState, 'deployment')) {
      await this.actionProcessor.queueAction(this._buildPassAction('deployment', gameState.passInfo));
      return;
    }

    if (!this.actionProcessor) {
      throw new Error('AIPhaseProcessor not properly initialized - missing actionProcessor');
    }

    // Import aiLogic to make deployment decision
    const { aiBrain } = await import('../logic/aiLogic.js');
    const { gameEngine } = await import('../logic/gameLogic.js');

    // Call aiLogic with proper game state format
    const aiDecision = aiBrain.handleOpponentTurn({
      player1: gameState.player1,
      player2: gameState.player2,
      turn: gameState.turn,
      placedSections: gameState.placedSections,
      opponentPlacedSections: gameState.opponentPlacedSections,
      getShipStatus: gameEngine.getShipStatus,
      calculateEffectiveShipStats: this.effectiveShipStatsWrapper,
      gameStateManager: this.gameStateManager,
      addLogEntry: (entry, debugSource, aiDecisionContext) => {
        this.gameStateManager?.addLogEntry(entry, debugSource, aiDecisionContext);
      }
    });

    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor executing deployment decision:', aiDecision);

    // AI_DEPLOYMENT logging for bug investigation
    debugLog('AI_DEPLOYMENT', `🤖 AI decision made`, {
      decisionType: aiDecision.type,
      droneName: aiDecision.payload?.droneToDeploy?.name,
      targetLane: aiDecision.payload?.targetLane,
      score: aiDecision.score,
      turnUsed: gameState.roundNumber,
      actualTurn: gameState.turn,
      player2Energy: gameState.player2?.energy,
      player2Budget: gameState.player2?.deploymentBudget
    });

    // Execute the decision directly through ActionProcessor
    if (aiDecision.type === 'pass') {
      await this.actionProcessor.queueAction(this._buildPassAction('deployment', gameState.passInfo));
    } else if (aiDecision.type === 'deploy') {
      // Execute deployment
      const result = await this.actionProcessor.queueAction({
        type: 'deployment',
        payload: {
          droneData: aiDecision.payload.droneToDeploy,
          laneId: aiDecision.payload.targetLane,
          playerId: 'player2',
          turn: gameState.roundNumber
        }
      });

      // End turn after successful deployment (same as human players do)
      if (result.success) {
        debugLog('AI_DEPLOYMENT', `✅ Deployment executed`, {
          droneName: aiDecision.payload?.droneToDeploy?.name,
          targetLane: aiDecision.payload?.targetLane
        });
        await this.actionProcessor.queueAction({
          type: 'turnTransition',
          payload: {
            newPlayer: 'player1',
            reason: 'deploymentCompleted'
          }
        });
      } else {
        debugLog('AI_DEPLOYMENT', `❌ Deployment FAILED`, {
          droneName: aiDecision.payload?.droneToDeploy?.name,
          targetLane: aiDecision.payload?.targetLane,
          error: result.error,
          reason: result.reason,
          turnUsed: gameState.roundNumber,
          actualTurn: gameState.turn
        });

        // When deployment fails (e.g., CPU limit reached), pass the turn to prevent infinite loop
        debugLog('AI_DEPLOYMENT', `🔄 Deployment failed - forcing AI to pass turn to prevent infinite loop`);
        await this.actionProcessor.queueAction(this._buildPassAction('deployment', gameState.passInfo));
      }
    }
  }

  /**
   * Execute AI turn for action phase
   * @param {Object} gameState - Current game state
   * @returns {Promise<Object>} Execution result
   */
  async executeActionTurn(gameState) {
    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.executeActionTurn starting...');

    // Check if AI should pass
    if (this.shouldPass(gameState, 'action')) {
      await this.actionProcessor.queueAction(this._buildPassAction('action', gameState.passInfo));
      return;
    }

    if (!this.actionProcessor) {
      throw new Error('AIPhaseProcessor not properly initialized - missing actionProcessor');
    }

    // Import aiLogic to make action decision
    const { aiBrain } = await import('../logic/aiLogic.js');
    const { gameEngine } = await import('../logic/gameLogic.js');
    const TargetingRouter = (await import('../logic/TargetingRouter.js')).default;

    // Create targeting router instance for AI targeting
    const targetingRouter = new TargetingRouter();

    // Create getValidTargets wrapper for AI (maintains existing API)
    const getValidTargets = (actingPlayerId, source, definition, player1, player2) => {
      return targetingRouter.routeTargeting({
        actingPlayerId,
        source,
        definition,
        player1,
        player2
      });
    };

    // Call aiLogic with proper game state format
    const aiDecision = aiBrain.handleOpponentAction({
      player1: gameState.player1,
      player2: gameState.player2,
      placedSections: gameState.placedSections,
      opponentPlacedSections: gameState.opponentPlacedSections,
      getShipStatus: gameEngine.getShipStatus,
      getLaneOfDrone: gameEngine.getLaneOfDrone,
      getValidTargets,
      gameStateManager: this.gameStateManager,
      addLogEntry: (entry, debugSource, aiDecisionContext) => {
        this.gameStateManager?.addLogEntry(entry, debugSource, aiDecisionContext);
      }
    });

    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor executing action decision:', aiDecision);

    // Execute the decision directly through ActionProcessor
    if (aiDecision.type === 'pass') {
      await this.actionProcessor.queueAction(this._buildPassAction('action', gameState.passInfo));
      return null;
    } else {
      // Execute action through ActionProcessor
      const result = await this.actionProcessor.queueAction({
        type: 'aiAction',
        payload: { aiDecision: aiDecision }
      });

      // Return result so caller can check for interception needs
      return result;
    }
  }

  /**
   * Execute AI turn for optional discard phase
   * Handles both discard of excess cards and drawing to hand limit
   * @param {Object} gameState - Current game state
   * @returns {Promise<Object>} Execution result with updated player state
   */
  async executeOptionalDiscardTurn(gameState) {
    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.executeOptionalDiscardTurn starting...');

    if (!this.actionProcessor) {
      throw new Error('AIPhaseProcessor not properly initialized - missing actionProcessor');
    }

    const { gameEngine } = await import('../logic/gameLogic.js');
    const aiState = gameState.player2;
    const opponentPlacedSections = gameState.opponentPlacedSections;

    // Early return if AI has no cards
    if (!aiState.hand || aiState.hand.length === 0) {
      debugLog('AI_DECISIONS', '🤖 AI has no cards, auto-completing optional discard');
      return {
        type: 'optionalDiscard',
        cardsToDiscard: [],
        playerId: 'player2',
        updatedPlayerState: aiState
      };
    }

    // Calculate effective hand limit
    const effectiveStats = this.gameDataService.getEffectiveShipStats(aiState, opponentPlacedSections);
    const handLimit = effectiveStats.totals.handLimit;

    let updatedAiState = { ...aiState };
    let cardsToDiscard = [];

    // Handle hand limit enforcement (discard excess cards)
    if (updatedAiState.hand.length > handLimit) {
      const excessCards = updatedAiState.hand.length - handLimit;
      cardsToDiscard = updatedAiState.hand.slice(0, excessCards);

      updatedAiState = {
        ...updatedAiState,
        hand: updatedAiState.hand.slice(excessCards),
        discardPile: [...updatedAiState.discardPile, ...cardsToDiscard]
      };

      debugLog('AI_DECISIONS', `🤖 AI discarding ${excessCards} excess cards to meet hand limit of ${handLimit}`);
    }

    // Draw cards to hand limit using gameLogic function
    updatedAiState = gameEngine.drawToHandLimit(updatedAiState, handLimit);

    const cardsDrawn = updatedAiState.hand.length - (aiState.hand.length - cardsToDiscard.length);
    if (cardsDrawn > 0) {
      debugLog('AI_DECISIONS', `🤖 AI drew ${cardsDrawn} cards to reach hand limit`);
    }

    return {
      type: 'optionalDiscard',
      cardsToDiscard,
      playerId: 'player2',
      updatedPlayerState: updatedAiState
    };
  }

  /**
   * Execute AI turn for mandatory discard phase
   * @param {Object} gameState - Current game state
   * @returns {Promise<Object>} Execution result with cards to discard
   */
  async executeMandatoryDiscardTurn(gameState) {
    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.executeMandatoryDiscardTurn starting...');

    if (!this.actionProcessor) {
      throw new Error('AIPhaseProcessor not properly initialized - missing actionProcessor');
    }

    const aiState = gameState.player2;
    const opponentPlacedSections = gameState.opponentPlacedSections;

    // Calculate effective hand limit
    const effectiveStats = this.gameDataService.getEffectiveShipStats(aiState, opponentPlacedSections);
    const handLimit = effectiveStats.totals.handLimit;

    // Early return if AI is already at or below hand limit
    if (!aiState.hand || aiState.hand.length <= handLimit) {
      debugLog('AI_DECISIONS', '🤖 AI already at/below hand limit, auto-completing mandatory discard');
      return {
        type: 'mandatoryDiscard',
        cardsToDiscard: [],
        playerId: 'player2',
        updatedPlayerState: aiState
      };
    }

    // Calculate cards to discard
    const excessCards = aiState.hand.length - handLimit;
    let cardsToDiscard = [];

    // AI logic: discard lowest cost cards first, randomize within same cost
    // Group cards by cost
    const cardsByCost = aiState.hand.reduce((acc, card) => {
      if (!acc[card.cost]) acc[card.cost] = [];
      acc[card.cost].push(card);
      return acc;
    }, {});

    // Sort costs (lowest first)
    const sortedCosts = Object.keys(cardsByCost).map(Number).sort((a, b) => a - b);

    // Randomly shuffle within each cost group, then select from lowest costs
    const rng = SeededRandom.fromGameState(gameState);
    for (const cost of sortedCosts) {
      const shuffled = rng.shuffle(cardsByCost[cost]);
      cardsToDiscard.push(...shuffled);
      if (cardsToDiscard.length >= excessCards) break;
    }
    cardsToDiscard = cardsToDiscard.slice(0, excessCards);

    debugLog('AI_DECISIONS', `🤖 AI discarding ${cardsToDiscard.length} excess cards to meet hand limit`);

    return {
      type: 'mandatoryDiscard',
      cardsToDiscard,
      playerId: 'player2',
      updatedPlayerState: aiState
    };
  }

  /**
   * Execute AI turn for mandatory drone removal phase
   * @param {Object} gameState - Current game state
   * @returns {Promise<Object>} Execution result with drones to remove
   */
  async executeMandatoryDroneRemovalTurn(gameState) {
    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.executeMandatoryDroneRemovalTurn starting...');

    if (!this.actionProcessor) {
      throw new Error('AIPhaseProcessor not properly initialized - missing actionProcessor');
    }

    const aiState = gameState.player2;
    const opponentPlacedSections = gameState.opponentPlacedSections;

    // Calculate effective drone limit
    const effectiveStats = this.gameDataService.getEffectiveShipStats(aiState, opponentPlacedSections);
    const droneLimit = effectiveStats.totals.cpuLimit;

    // Count total non-token drones on board (token drones don't count toward CPU limit)
    const totalDrones = Object.values(aiState.dronesOnBoard || {}).flat().filter(d => !d.isToken).length;

    // Early return if AI is already at or below drone limit
    if (totalDrones <= droneLimit) {
      debugLog('AI_DECISIONS', '🤖 AI already at/below drone limit, auto-completing mandatory drone removal');
      return {
        type: 'mandatoryDroneRemoval',
        dronesToRemove: [],
        playerId: 'player2',
        updatedPlayerState: aiState
      };
    }

    // Calculate drones to remove
    const excessDrones = totalDrones - droneLimit;
    let dronesToRemove = [];

    // AI logic: remove lowest class (CPU cost) drones from strongest lanes
    // Calculate lane scores (AI power - opponent power)
    const opponentState = gameState.player1;
    const calculateLanePower = (drones, lane) => {
      return drones.reduce((sum, drone) => {
        const stats = this.gameDataService.getEffectiveStats(drone, lane);
        return sum + (stats.attack || 0) + (stats.hull || 0);
      }, 0);
    };

    const laneScores = {
      lane1: calculateLanePower(aiState.dronesOnBoard.lane1 || [], 'lane1') -
             calculateLanePower(opponentState.dronesOnBoard.lane1 || [], 'lane1'),
      lane2: calculateLanePower(aiState.dronesOnBoard.lane2 || [], 'lane2') -
             calculateLanePower(opponentState.dronesOnBoard.lane2 || [], 'lane2'),
      lane3: calculateLanePower(aiState.dronesOnBoard.lane3 || [], 'lane3') -
             calculateLanePower(opponentState.dronesOnBoard.lane3 || [], 'lane3')
    };

    // Collect all drones with their lane score
    const allDrones = [];
    Object.entries(aiState.dronesOnBoard || {}).forEach(([lane, drones]) => {
      drones.filter(drone => !drone.isToken).forEach(drone => {
        allDrones.push({ ...drone, lane, laneScore: laneScores[lane] });
      });
    });

    // Sort by lane score (highest first), then by class (lowest first)
    // This removes cheap drones from winning lanes, preserving expensive drones and protecting losing lanes
    allDrones.sort((a, b) => {
      if (b.laneScore !== a.laneScore) {
        return b.laneScore - a.laneScore; // Highest lane score first
      }
      return a.class - b.class; // Lowest class (CPU cost) first
    });

    dronesToRemove = allDrones.slice(0, excessDrones);

    debugLog('AI_DECISIONS', `🤖 AI removing ${dronesToRemove.length} excess drones to meet drone limit`);

    return {
      type: 'mandatoryDroneRemoval',
      dronesToRemove,
      playerId: 'player2',
      updatedPlayerState: aiState
    };
  }

  /**
   * Build a standard pass action for the AI player
   * @param {string} phase - Current turn phase
   * @param {Object} passInfo - Current pass state
   * @returns {Object} Action object for playerPass
   */
  _buildPassAction(phase, passInfo) {
    return {
      type: 'playerPass',
      payload: {
        playerId: 'player2',
        playerName: 'AI Player',
        turnPhase: phase,
        passInfo,
        opponentPlayerId: 'player1'
      }
    };
  }

  /**
   * Determine if AI should pass in the current phase
   * @param {Object} gameState - Current game state
   * @param {string} phase - Current phase (deployment, action)
   * @returns {boolean} True if AI should pass
   */
  shouldPass(gameState, phase) {
    const aiPassKey = 'player2Passed'; // AI is always player2

    // If AI has already passed, return true
    if (gameState.passInfo && gameState.passInfo[aiPassKey]) {
      debugLog('AI_DECISIONS', '🤖 AI has already passed');
      return true;
    }

    // Add AI personality-based pass logic here in the future
    // For now, only pass if already marked as passed
    return false;
  }

  /**
   * Execute AI shield allocation - distributes shields evenly across all placed sections
   * @param {Object} gameState - Current game state
   * @returns {Promise<void>} Shield allocation complete
   */
  async executeShieldAllocationTurn(gameState) {
    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.executeShieldAllocationTurn starting...');

    if (!this.actionProcessor) {
      throw new Error('AIPhaseProcessor not properly initialized - missing actionProcessor');
    }

    const aiPlacedSections = gameState.opponentPlacedSections;
    const shieldsToAllocate = gameState.opponentShieldsToAllocate || 0;

    if (shieldsToAllocate === 0 || aiPlacedSections.length === 0) {
      debugLog('AI_DECISIONS', '🤖 AI has no shields to allocate or no sections');
      return;
    }

    debugLog('AI_DECISIONS', `🤖 AI distributing ${shieldsToAllocate} shields across ${aiPlacedSections.length} sections`);

    // Distribute one shield at a time in round-robin fashion for even distribution
    let remainingShields = shieldsToAllocate;
    let currentSectionIndex = 0;

    while (remainingShields > 0) {
      const sectionName = aiPlacedSections[currentSectionIndex];

      // Use direct call instead of queueAction to avoid deadlock (we're already inside a queued action)
      await this.actionProcessor.processAddShield({
        sectionName,
        playerId: 'player2'
      });

      remainingShields--;
      currentSectionIndex = (currentSectionIndex + 1) % aiPlacedSections.length;
    }

    debugLog('AI_DECISIONS', '✅ AI shield allocation complete');
  }

  /**
   * Check if AI should take a turn based on current game state
   * @param {Object} state - Current game state
   */
  checkForAITurn(state) {
    // Don't process if AI is already taking a turn or in wrong mode
    if (this.isProcessing || state.gameMode !== 'local') {
      return;
    }

    // Don't process if game has ended
    if (state.winner || state.gameStage === 'gameOver') {
      return;
    }

    // Only trigger for sequential phases where AI needs to act
    const sequentialPhases = ['deployment', 'action'];
    if (!sequentialPhases.includes(state.turnPhase)) {
      return;
    }

    // Only trigger if it's AI's turn (AI is always player2)
    if (state.currentPlayer !== 'player2') {
      return;
    }

    // Check if AI has already passed this phase
    if (state.passInfo && state.passInfo.player2Passed) {
      return;
    }

    debugLog('AI_DECISIONS', `⏰ AIPhaseProcessor: Scheduling AI turn for ${state.turnPhase} phase`);

    // Clear any existing timer and schedule new turn
    clearTimeout(this.turnTimer);
    this.turnTimer = setTimeout(() => {
      this.executeTurn();  // No state parameter - will fetch fresh state
    }, 1500); // 1.5 second delay
  }

  /**
   * Execute AI turn for the current phase
   * Always fetches fresh state to avoid stale state issues
   */
  async executeTurn() {
    if (this.isProcessing) {
      debugLog('AI_DECISIONS', '⚠️ AIPhaseProcessor: Already processing a turn, skipping');
      return;
    }

    // Fetch fresh state - never trust captured state from delayed callbacks
    const state = this.gameStateManager.getState();

    // Validate it's still AI's turn (state may have changed during delay)
    if (state.currentPlayer !== 'player2') {
      debugLog('AI_DECISIONS', '⚠️ AIPhaseProcessor: Turn changed before execution, cancelling AI turn');
      return;
    }

    // Validate AI hasn't passed
    if (state.passInfo && state.passInfo.player2Passed) {
      debugLog('AI_DECISIONS', '⚠️ AIPhaseProcessor: AI has already passed, cancelling turn');
      return;
    }

    // Validate phase is still sequential
    const sequentialPhases = ['deployment', 'action'];
    if (!sequentialPhases.includes(state.turnPhase)) {
      debugLog('AI_DECISIONS', '⚠️ AIPhaseProcessor: Phase changed to non-sequential, cancelling turn');
      return;
    }

    // Check if animations are blocking AI actions
    const phaseAnimationQueue = this.gameStateManager?.gameFlowManager?.phaseAnimationQueue;
    const animationManager = this.actionProcessor?.animationManager;

    // Block AI if phase announcements are playing
    if (phaseAnimationQueue && phaseAnimationQueue.isPlaying()) {
      debugLog('AI_DECISIONS', '⏸️ AIPhaseProcessor: Phase animation playing, rescheduling AI turn');
      // Reschedule after animations complete
      this.turnTimer = setTimeout(() => {
        this.executeTurn();
      }, 500); // Check again in 0.5s
      return;
    }

    // Block AI if action animations are blocking
    if (animationManager && animationManager.isBlocking) {
      debugLog('AI_DECISIONS', '⏸️ AIPhaseProcessor: Action animation blocking, rescheduling AI turn');
      // Reschedule after animations complete
      this.turnTimer = setTimeout(() => {
        this.executeTurn();
      }, 500); // Check again in 0.5s
      return;
    }

    this.isProcessing = true;

    try {
      debugLog('AI_DECISIONS', `🤖 AIPhaseProcessor: Executing AI turn for ${state.turnPhase} phase`);

      let result;
      if (state.turnPhase === 'deployment') {
        result = await this.executeDeploymentTurn(state);
      } else if (state.turnPhase === 'action') {
        result = await this.executeActionTurn(state);
      } else {
        debugLog('AI_DECISIONS', `⚠️ AIPhaseProcessor: Unknown sequential phase: ${state.turnPhase}`);
        return;
      }

      // Check if result indicates human interception decision needed
      if (result?.needsInterceptionDecision) {
        debugLog('AI_DECISIONS', '🛡️ AIPhaseProcessor: AI attack needs human interception decision, pausing turn loop');

        // ActionProcessor already set interceptionPending state, just pause AI turn loop
        // Turn will resume after interception is resolved (state cleared)
        this.isProcessing = false;
        return; // Don't schedule another AI turn yet
      }

      // Check if AI should continue taking turns
      const currentState = this.gameStateManager.getState();
      if (currentState.currentPlayer === 'player2' &&
          currentState.passInfo &&
          !currentState.passInfo.player2Passed) {
        // AI should continue if:
        // 1. Human has passed but AI hasn't, OR
        // 2. AI played a goAgain card and still has the turn
        debugLog('AI_DECISIONS', '🔄 AIPhaseProcessor: AI continues taking turns (either human passed or goAgain card played)');
        // Schedule another turn
        setTimeout(() => {
          this.checkForAITurn(currentState);
        }, 100); // Small delay to let state settle
      }

    } catch (error) {
      debugLog('AI_DECISIONS', '❌ AIPhaseProcessor: Error executing turn:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Make AI interception decision
   * Called by ActionProcessor when AI is the defender
   *
   * @param {Array} interceptors - Valid interceptors (pre-filtered for speed/keywords)
   * @param {Object} attackDetails - Attack details including attacker and target
   * @returns {Promise<Object>} - { interceptor: drone | null }
   */
  async makeInterceptionDecision(interceptors, attackDetails) {
    if (!this.isInitialized) {
      throw new Error('AIPhaseProcessor not initialized');
    }

    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.makeInterceptionDecision called:', {
      interceptorCount: interceptors?.length || 0,
      target: attackDetails.target?.name,
      attacker: attackDetails.attacker?.name,
      targetType: attackDetails.targetType
    });

    const { aiBrain } = await import('../logic/aiLogic.js');

    // Delegate to aiLogic for decision with full attack context, gameDataService, and gameStateManager
    const result = aiBrain.makeInterceptionDecision(
      interceptors,
      attackDetails.attacker,  // The attacker drone (was incorrectly labeled as target before)
      attackDetails,           // Full attack context
      this.gameDataService,    // GameDataService for stat calculations
      this.gameStateManager    // GameStateManager for opportunity cost analysis
    );

    debugLog('AI_DECISIONS', '🤖 AI interception decision:', {
      willIntercept: !!result.interceptor,
      interceptorName: result.interceptor?.name
    });

    // Log interception decision to Action Log with Decision Matrix
    debugLog('AI_DECISIONS', '📝 [INTERCEPTION LOG] Preparing log entry:', {
      hasGameStateManager: !!this.gameStateManager,
      willIntercept: !!result.interceptor,
      decisionContextLength: result.decisionContext?.length || 0,
      attackerName: attackDetails.attacker?.name,
      targetType: attackDetails.targetType,
      targetName: attackDetails.target?.name || attackDetails.target?.id
    });

    if (this.gameStateManager) {
      const targetName = attackDetails.targetType === 'section'
        ? attackDetails.target.name || attackDetails.target.id
        : attackDetails.target.name;

      const logEntry = {
        player: 'AI Player',
        actionType: result.interceptor ? 'INTERCEPT' : 'DECLINE_INTERCEPT',
        source: attackDetails.attacker.name,
        target: result.interceptor ? result.interceptor.name : targetName,
        outcome: result.interceptor
          ? `Intercepted ${attackDetails.attacker.name} attacking ${targetName} with ${result.interceptor.name}`
          : `Declined to intercept ${attackDetails.attacker.name} attacking ${targetName}`
      };

      debugLog('AI_DECISIONS', '📋 [INTERCEPTION LOG] Log entry data:', logEntry);

      this.gameStateManager.addLogEntry(logEntry, 'aiInterception', result.decisionContext);

      debugLog('AI_DECISIONS', '✅ [INTERCEPTION LOG] Log entry added successfully');
    } else {
      debugLog('AI_DECISIONS', '❌ [INTERCEPTION LOG] gameStateManager is null/undefined - cannot add log entry!');
    }

    return result;
  }

  /**
   * Execute a single AI deployment in response to player's quick deploy
   * Returns result if deployment succeeded, null if AI passed or no drones available
   * @returns {Object|null} Deployment result or null
   */
  async executeSingleDeployment() {
    debugLog('QUICK_DEPLOY', '🤖 AI evaluating single deployment...');

    if (!this.gameStateManager) {
      debugLog('QUICK_DEPLOY', '[AI Single Deploy] GameStateManager not available');
      return null;
    }

    const gameState = this.gameStateManager.getState();

    // Check if AI should pass
    if (this.shouldPass(gameState, 'deployment')) {
      debugLog('QUICK_DEPLOY', '🤖 AI passes (shouldPass returned true)');
      return null;
    }

    // Get AI deployment decision (existing logic from handleQuickDeployResponse)
    const { aiBrain } = await import('../logic/aiLogic.js');
    const { gameEngine } = await import('../logic/gameLogic.js');
    const { default: DeploymentProcessor } = await import('../logic/deployment/DeploymentProcessor.js');

    // Pass addLogEntry callback so AI decisions are logged in combat log
    const addLogEntry = (entry, source, context) => {
      this.gameStateManager.addLogEntry(entry, source, context);
    };

    const aiDecision = aiBrain.handleOpponentTurn({
      player1: gameState.player1,
      player2: gameState.player2,
      turn: gameState.turn,
      placedSections: gameState.placedSections,
      opponentPlacedSections: gameState.opponentPlacedSections,
      getShipStatus: gameEngine.getShipStatus,
      calculateEffectiveShipStats: this.effectiveShipStatsWrapper,
      gameStateManager: this.gameStateManager,
      addLogEntry  // ← Logs AI deployment decisions
    });

    debugLog('QUICK_DEPLOY', '🤖 AI decision:', aiDecision?.type);

    if (aiDecision.type !== 'deploy') {
      debugLog('QUICK_DEPLOY', '🤖 AI decides not to deploy');
      return null;
    }

    // Execute deployment (DeploymentProcessor handles ON_DEPLOY)
    const { droneToDeploy, targetLane } = aiDecision.payload;
    debugLog('QUICK_DEPLOY', `🤖 AI deploying ${droneToDeploy?.name} to ${targetLane}`);

    const deploymentProcessor = new DeploymentProcessor();
    let player2State = JSON.parse(JSON.stringify(gameState.player2));
    const placedSections = {
      player1: gameState.placedSections,
      player2: gameState.opponentPlacedSections
    };

    // Log callback for DeploymentProcessor (logs drone placement details)
    const logCallback = (entry) => this.gameStateManager.addLogEntry(entry);

    const result = deploymentProcessor.executeDeployment(
      droneToDeploy,
      targetLane,
      gameState.roundNumber || 1,
      player2State,
      gameState.player1,
      placedSections,
      logCallback,  // ← Logs AI drone placements
      'player2'
    );

    if (result.success) {
      // Update game state with new AI state and any opponent changes from ON_DEPLOY
      this.gameStateManager.setState({
        player2: result.newPlayerState,
        player1: result.opponentState || gameState.player1
      });
      debugLog('QUICK_DEPLOY', `🤖 AI deployed ${droneToDeploy?.name} successfully`);
      return { success: true, drone: result.deployedDrone };
    }

    debugLog('QUICK_DEPLOY', `🤖 AI deployment failed: ${result.error}`);
    return null;
  }

  /**
   * Finish deployment phase by deploying all remaining AI drones
   * Called after player's quick deploy is complete
   */
  async finishDeploymentPhase() {
    debugLog('QUICK_DEPLOY', '🤖 AI finishing deployment phase...');

    let maxIterations = 10;  // Safety limit
    let deploymentsCount = 0;

    while (maxIterations-- > 0) {
      const result = await this.executeSingleDeployment();
      if (!result) break;
      deploymentsCount++;
    }

    debugLog('QUICK_DEPLOY', `🤖 AI finished deployment phase (${deploymentsCount} additional drones deployed)`);
  }
}

// Create singleton instance
const aiPhaseProcessor = new AIPhaseProcessor();

export default aiPhaseProcessor;