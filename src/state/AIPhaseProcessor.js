// ========================================
// AI PHASE PROCESSOR
// ========================================
// Handles AI processing for simultaneous phases in single-player mode
// Provides instant AI decisions for SimultaneousActionManager commitment system

import GameDataService from '../services/GameDataService.js';
import { debugLog } from '../utils/debugLogger.js';

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
   * Process AI drone selection for droneSelection phase
   * NEW FLOW: Selects 5 drones from AI's deck of 10 drones
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
      console.error('❌ Failed to extract minimum required drones from deck');
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
        console.warn(`⚠️ Drone "${name}" not found in drone collection`);
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
    const shuffled = [...availableDrones].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Select 5 drones for AI based on personality preferences
   * @param {Array} availableDrones - Pool of available drones
   * @param {Object} personality - AI personality with preferences
   * @returns {Array} Array of 5 selected drone objects
   */
  selectDronesForAI(availableDrones, personality) {
    let selected = [];

    // Strategy 1: Use personality's preferred drones if available
    if (personality && personality.preferredDrones) {
      const preferredAvailable = availableDrones.filter(drone =>
        personality.preferredDrones.includes(drone.name)
      );

      // Take up to 3 preferred drones
      const preferredCount = Math.min(3, preferredAvailable.length);
      selected = preferredAvailable.slice(0, preferredCount);

      debugLog('AI_DECISIONS', `🎯 AI selected ${selected.length} preferred drones:`,
        selected.map(d => d.name).join(', '));
    }

    // Strategy 2: Fill remaining slots with balanced selection
    const remaining = availableDrones.filter(drone => !selected.includes(drone));
    const needed = 5 - selected.length;

    if (needed > 0) {
      // Prioritize different drone types for variety
      const balancedSelection = this.selectBalancedDrones(remaining, needed, personality);
      selected = [...selected, ...balancedSelection];
    }

    // Strategy 3: Random fallback if still not enough
    while (selected.length < 5 && remaining.length > 0) {
      const randomIndex = Math.floor(Math.random() * remaining.length);
      const drone = remaining.splice(randomIndex, 1)[0];
      selected.push(drone);
    }

    if (selected.length !== 5) {
      throw new Error(`AI selection failed: only selected ${selected.length} of 5 drones`);
    }

    return selected;
  }

  /**
   * Select drones with balanced approach (variety in types/costs)
   * @param {Array} availableDrones - Remaining available drones
   * @param {number} count - Number of drones to select
   * @param {Object} personality - AI personality for weighting
   * @returns {Array} Selected drones
   */
  selectBalancedDrones(availableDrones, count, personality) {
    const selected = [];
    const remaining = [...availableDrones];

    // Sort by a combination of cost and capabilities for balanced selection
    remaining.sort((a, b) => {
      const scoreA = (a.energyCost || 1) + (a.health || 0) + (a.attack || 0);
      const scoreB = (b.energyCost || 1) + (b.health || 0) + (b.attack || 0);
      return scoreB - scoreA; // Higher scoring drones first
    });

    // AI personality influences selection weights
    const aggressionWeight = personality?.aggression || 0.5;
    const economyWeight = personality?.economy || 0.5;

    for (let i = 0; i < count && remaining.length > 0; i++) {
      let selectedIndex = 0;

      // Add some variation based on personality
      if (aggressionWeight > 0.7) {
        // Aggressive AI: prefer high-attack drones
        selectedIndex = remaining.findIndex(drone => (drone.attack || 0) > 2);
        if (selectedIndex === -1) selectedIndex = 0;
      } else if (economyWeight > 0.7) {
        // Economic AI: prefer low-cost drones
        selectedIndex = remaining.findIndex(drone => (drone.energyCost || 1) <= 2);
        if (selectedIndex === -1) selectedIndex = 0;
      } else {
        // Balanced selection with some randomness
        const topChoices = Math.min(3, remaining.length);
        selectedIndex = Math.floor(Math.random() * topChoices);
      }

      selected.push(remaining.splice(selectedIndex, 1)[0]);
    }

    debugLog('AI_DECISIONS', `🎯 AI balanced selection (${count}):`,
      selected.map(d => d.name).join(', '));

    return selected;
  }

  /**
   * Process AI deck selection for deckSelection phase
   * NEW FLOW: Returns both deck (40 cards) and drones (10 drones)
   * @param {Object} aiPersonality - Optional AI personality override
   * @returns {Promise<Object>} Object with { deck: Array, drones: Array }
   */
  async processDeckSelection(aiPersonality = null) {
    const personality = aiPersonality || this.currentAIPersonality;

    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.processDeckSelection starting (selecting 40 cards + drones)...');

    // Select cards for deck
    let selectedDeck = [];
    if (personality && personality.decklist && personality.decklist.length > 0) {
      // Use AI's custom decklist from personality
      debugLog('AI_DECISIONS', `🎯 Using ${personality.name} personality decklist`);

      // Import the game engine to build the deck
      const { gameEngine } = await import('../logic/gameLogic.js');
      selectedDeck = gameEngine.buildDeckFromList(personality.decklist);
    } else {
      // Fallback to standard deck
      debugLog('AI_DECISIONS', `🎯 Using standard deck as fallback`);

      const { gameEngine, startingDecklist } = await import('../logic/gameLogic.js');
      selectedDeck = gameEngine.buildDeckFromList(startingDecklist);
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

    // Default ship components for AI (standard layout)
    const shipComponents = {
      'BRIDGE_001': 'l',
      'POWERCELL_001': 'm',
      'DRONECONTROL_001': 'r'
    };

    return {
      deck: selectedDeck,
      drones: selectedDrones,
      shipComponents: shipComponents
    };
  }

  /**
   * Process AI ship placement for placement phase
   * @param {Object} aiPersonality - Optional AI personality override
   * @returns {Promise<Array>} Array of placed ship sections (5 elements)
   */
  async processPlacement(aiPersonality = null) {
    const personality = aiPersonality || this.currentAIPersonality;

    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.processPlacement starting...');

    // Get available ship sections for AI
    const availableSections = ['bridge', 'powerCell', 'droneControlHub'];

    debugLog('AI_DECISIONS', `🎯 AI placing ${availableSections.length} ship sections`);

    // AI Placement Strategy: Simple but effective
    const placedSections = this.selectSectionsForPlacement(availableSections, personality);

    const placementNames = placedSections.join(', ');
    debugLog('AI_DECISIONS', `🤖 AI placement completed: ${placementNames}`);

    return placedSections;
  }

  /**
   * Select ship section placement for AI based on personality preferences
   * @param {Array} availableSections - Available ship sections to place
   * @param {Object} personality - AI personality with preferences
   * @returns {Array} Array of 5 placed sections in lane order
   */
  selectSectionsForPlacement(availableSections, personality) {
    const sections = [...availableSections];

    // AI placement strategies based on personality
    if (personality) {
      if (personality.aggression > 0.7) {
        // Aggressive AI: Weapons in front, Bridge protected
        const placement = this.arrangeAggressivePlacement(sections);
        debugLog('AI_DECISIONS', '🎯 AI using aggressive placement strategy');
        return placement;
      } else if (personality.economy > 0.7) {
        // Economic AI: Cargo Bay priority, efficient layout
        const placement = this.arrangeEconomicPlacement(sections);
        debugLog('AI_DECISIONS', '🎯 AI using economic placement strategy');
        return placement;
      }
    }

    // Default balanced placement: Bridge in middle, balanced defense
    const placement = this.arrangeBalancedPlacement(sections);
    debugLog('AI_DECISIONS', '🎯 AI using balanced placement strategy');
    return placement;
  }

  /**
   * Arrange sections for aggressive AI (droneControlHub forward for offensive)
   */
  arrangeAggressivePlacement(sections) {
    const placement = new Array(3).fill(null);
    const remaining = [...sections];

    // Priority order: droneControlHub front (offensive), bridge middle, powerCell back
    const priorities = ['droneControlHub', 'bridge', 'powerCell'];
    const positions = [0, 1, 2]; // drone control front, bridge middle, power back

    for (let i = 0; i < priorities.length && i < remaining.length; i++) {
      const sectionIndex = remaining.findIndex(s => s === priorities[i]);
      if (sectionIndex !== -1) {
        placement[positions[i]] = remaining.splice(sectionIndex, 1)[0];
      }
    }

    // Fill remaining positions
    for (let i = 0; i < placement.length; i++) {
      if (!placement[i] && remaining.length > 0) {
        placement[i] = remaining.shift();
      }
    }

    return placement;
  }

  /**
   * Arrange sections for economic AI (powerCell in center for bonus)
   */
  arrangeEconomicPlacement(sections) {
    const placement = new Array(3).fill(null);
    const remaining = [...sections];

    // Priority: powerCell center for energy bonus, bridge protected, droneControlHub front
    const priorities = ['powerCell', 'bridge', 'droneControlHub'];
    const positions = [1, 2, 0]; // power center, bridge back, drone control front

    for (let i = 0; i < priorities.length && i < remaining.length; i++) {
      const sectionIndex = remaining.findIndex(s => s === priorities[i]);
      if (sectionIndex !== -1) {
        placement[positions[i]] = remaining.splice(sectionIndex, 1)[0];
      }
    }

    // Fill remaining positions
    for (let i = 0; i < placement.length; i++) {
      if (!placement[i] && remaining.length > 0) {
        placement[i] = remaining.shift();
      }
    }

    return placement;
  }

  /**
   * Arrange sections for balanced AI (bridge center for bonus)
   */
  arrangeBalancedPlacement(sections) {
    const placement = new Array(3).fill(null);
    const remaining = [...sections];

    // Balanced: bridge center for bonus, powerCell and droneControlHub on sides
    const priorities = ['bridge', 'powerCell', 'droneControlHub'];
    const positions = [1, 0, 2]; // bridge center, power left, drone control right

    for (let i = 0; i < priorities.length && i < remaining.length; i++) {
      const sectionIndex = remaining.findIndex(s => s === priorities[i]);
      if (sectionIndex !== -1) {
        placement[positions[i]] = remaining.splice(sectionIndex, 1)[0];
      }
    }

    // Fill remaining positions
    for (let i = 0; i < placement.length; i++) {
      if (!placement[i] && remaining.length > 0) {
        placement[i] = remaining.shift();
      }
    }

    return placement;
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
      // Execute pass directly through ActionProcessor
      await this.actionProcessor.queueAction({
        type: 'playerPass',
        payload: {
          playerId: 'player2',
          playerName: 'AI Player',
          turnPhase: 'deployment',
          passInfo: gameState.passInfo,
          opponentPlayerId: 'player1'
        }
      });
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

    // Execute the decision directly through ActionProcessor
    if (aiDecision.type === 'pass') {
      await this.actionProcessor.queueAction({
        type: 'playerPass',
        payload: {
          playerId: 'player2',
          playerName: 'AI Player',
          turnPhase: 'deployment',
          passInfo: gameState.passInfo,
          opponentPlayerId: 'player1'
        }
      });
    } else if (aiDecision.type === 'deploy') {
      // Execute deployment
      const result = await this.actionProcessor.queueAction({
        type: 'deployment',
        payload: {
          droneData: aiDecision.payload.droneToDeploy,
          laneId: aiDecision.payload.targetLane,
          playerId: 'player2',
          turn: gameState.turn
        }
      });

      // End turn after successful deployment (same as human players do)
      if (result.success) {
        await this.actionProcessor.queueAction({
          type: 'turnTransition',
          payload: {
            newPlayer: 'player1',
            reason: 'deploymentCompleted'
          }
        });
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
      // Execute pass directly through ActionProcessor
      await this.actionProcessor.queueAction({
        type: 'playerPass',
        payload: {
          playerId: 'player2',
          playerName: 'AI Player',
          turnPhase: 'action',
          passInfo: gameState.passInfo,
          opponentPlayerId: 'player1'
        }
      });
      return;
    }

    if (!this.actionProcessor) {
      throw new Error('AIPhaseProcessor not properly initialized - missing actionProcessor');
    }

    // Import aiLogic to make action decision
    const { aiBrain } = await import('../logic/aiLogic.js');
    const { gameEngine } = await import('../logic/gameLogic.js');

    // Call aiLogic with proper game state format
    const aiDecision = aiBrain.handleOpponentAction({
      player1: gameState.player1,
      player2: gameState.player2,
      placedSections: gameState.placedSections,
      opponentPlacedSections: gameState.opponentPlacedSections,
      getShipStatus: gameEngine.getShipStatus,
      getLaneOfDrone: gameEngine.getLaneOfDrone,
      getValidTargets: gameEngine.getValidTargets,
      gameStateManager: this.gameStateManager,
      addLogEntry: (entry, debugSource, aiDecisionContext) => {
        this.gameStateManager?.addLogEntry(entry, debugSource, aiDecisionContext);
      }
    });

    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor executing action decision:', aiDecision);

    // Execute the decision directly through ActionProcessor
    if (aiDecision.type === 'pass') {
      await this.actionProcessor.queueAction({
        type: 'playerPass',
        payload: {
          playerId: 'player2',
          playerName: 'AI Player',
          turnPhase: 'action',
          passInfo: gameState.passInfo,
          opponentPlayerId: 'player1'
        }
      });
      return null; // No special result for pass
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

    // Simple AI logic: discard highest cost cards first to save energy
    const sortedHand = [...aiState.hand].sort((a, b) => b.cost - a.cost);
    cardsToDiscard = sortedHand.slice(0, excessCards);

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
    const droneLimit = effectiveStats.totals.droneLimit;

    // Count total drones on board
    const totalDrones = Object.values(aiState.dronesOnBoard || {}).flat().length;

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

    // Simple AI logic: remove weakest drones first
    const allDrones = [];
    Object.entries(aiState.dronesOnBoard || {}).forEach(([lane, drones]) => {
      drones.forEach(drone => {
        allDrones.push({ ...drone, lane });
      });
    });

    // Sort by effective power (lowest first)
    allDrones.sort((a, b) => {
      const aStats = this.gameDataService.getEffectiveStats(a, a.lane);
      const bStats = this.gameDataService.getEffectiveStats(b, b.lane);
      return aStats.power - bStats.power;
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
   * Execute AI pass for the current phase
   * @param {string} phase - Current phase
   * @returns {Promise<Object>} Pass execution result
   */
  async executePass(phase) {
    debugLog('AI_DECISIONS', `🏳️ AIPhaseProcessor: Returning pass decision for ${phase} phase`);

    // Return the pass decision for ActionProcessor to execute
    return {
      type: 'pass',
      phase: phase,
      playerId: 'player2'
    };
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

    const aiState = gameState.player2;
    const aiPlacedSections = gameState.opponentPlacedSections;

    // Get total shields available to allocate
    const shieldsToAllocate = gameState.opponentShieldsToAllocate || 0;

    if (shieldsToAllocate === 0) {
      debugLog('AI_DECISIONS', '🤖 AI has no shields to allocate');
      return;
    }

    // Get list of all placed sections
    const placedSectionNames = aiPlacedSections.map(section => section.name);

    if (placedSectionNames.length === 0) {
      debugLog('AI_DECISIONS', '🤖 AI has no placed sections to allocate shields to');
      return;
    }

    // Distribute shields evenly across all sections
    let remainingShields = shieldsToAllocate;
    let currentSectionIndex = 0;

    debugLog('AI_DECISIONS', `🤖 AI distributing ${shieldsToAllocate} shields evenly across ${placedSectionNames.length} sections`);

    // Distribute one shield at a time in round-robin fashion for even distribution
    while (remainingShields > 0) {
      const sectionName = placedSectionNames[currentSectionIndex];

      // Add shield to current section via ActionProcessor
      await this.actionProcessor.queueAction({
        type: 'addShield',
        payload: {
          sectionName,
          playerId: 'player2'
        }
      });

      remainingShields--;
      currentSectionIndex = (currentSectionIndex + 1) % placedSectionNames.length;

      debugLog('AI_DECISIONS', `🤖 AI allocated shield to ${sectionName}, ${remainingShields} remaining`);
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

    this.isProcessing = true;

    try {
      debugLog('AI_DECISIONS', `🤖 AIPhaseProcessor: Executing AI turn for ${state.turnPhase} phase`);

      let result;
      if (state.turnPhase === 'deployment') {
        result = await this.executeDeploymentTurn(state);
      } else if (state.turnPhase === 'action') {
        result = await this.executeActionTurn(state);
      } else {
        console.warn(`⚠️ AIPhaseProcessor: Unknown sequential phase: ${state.turnPhase}`);
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
      console.error('❌ AIPhaseProcessor: Error executing turn:', error);
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
      target: attackDetails.target?.name
    });

    const { aiBrain } = await import('../logic/aiLogic.js');

    // Delegate to aiLogic for decision
    const result = aiBrain.makeInterceptionDecision(interceptors, attackDetails.target);

    debugLog('AI_DECISIONS', '🤖 AI interception decision:', {
      willIntercept: !!result.interceptor,
      interceptorName: result.interceptor?.name
    });

    return result;
  }

  /**
   * Get AI processing capabilities
   * @returns {Object} Available AI processing methods
   */
  getCapabilities() {
    return {
      droneSelection: true, // ✅ implemented
      deckSelection: true, // ✅ implemented
      placement: true, // ✅ implemented
      deployment: true, // ✅ implemented
      action: true, // ✅ implemented
      interception: true, // ✅ implemented
      version: '1.3.0'
    };
  }
}

// Create singleton instance
const aiPhaseProcessor = new AIPhaseProcessor();

export default aiPhaseProcessor;