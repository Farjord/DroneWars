// ========================================
// GAME FLOW MANAGER
// ========================================
// Master game flow controller - owns canonical phase state and transitions
// Handles conditional phase logic and round loop management

import { initializeDroneSelection } from '../utils/droneSelectionUtils.js';
import { initializeShipPlacement } from '../utils/shipPlacementUtils.js';
import fullDroneCollection from '../data/droneData.js';
import GameDataService from '../services/GameDataService.js';
import { gameEngine } from '../logic/gameLogic.js';

/**
 * GameFlowManager - Central authority for game phase flow and transitions
 */
class GameFlowManager {
  constructor() {
    if (GameFlowManager.instance) {
      return GameFlowManager.instance;
    }
    GameFlowManager.instance = this;

    // Game flow phase definitions
    this.PRE_GAME_PHASES = ['droneSelection', 'deckSelection', 'placement', 'gameInitializing'];
    this.ROUND_PHASES = ['determineFirstPlayer', 'energyReset', 'mandatoryDiscard', 'optionalDiscard', 'draw', 'allocateShields', 'mandatoryDroneRemoval', 'deployment', 'deploymentComplete', 'action'];

    // Phase type classification
    this.SIMULTANEOUS_PHASES = ['droneSelection', 'deckSelection', 'placement', 'mandatoryDiscard', 'optionalDiscard', 'allocateShields', 'mandatoryDroneRemoval', 'deploymentComplete'];
    this.SEQUENTIAL_PHASES = ['deployment', 'action'];
    this.AUTOMATIC_PHASES = ['gameInitializing', 'energyReset', 'draw', 'determineFirstPlayer']; // Automatic phases handled directly by GameFlowManager

    // Current game state
    this.currentPhase = 'preGame';
    this.gameStage = 'preGame'; // 'preGame', 'roundLoop', 'gameOver'
    this.roundNumber = 0;
    this.isProcessingAutomaticPhase = false; // Flag to track automatic phase processing

    // Event listeners
    this.listeners = [];

    // External system references (injected)
    this.gameStateManager = null;
    this.actionProcessor = null;
    this.isMultiplayer = false;
    this.gameDataService = null;

    // Initialization guard
    this.isInitialized = false;

    console.log('🎮 GameFlowManager initialized');
  }

  /**
   * Initialize with external system references
   * @param {Object} gameStateManager - GameStateManager instance
   * @param {Object} actionProcessor - ActionProcessor instance
   * @param {Function} isMultiplayerFn - Function to check if game is multiplayer
   * @param {Object} aiPhaseProcessor - AIPhaseProcessor instance
   */
  initialize(gameStateManager, actionProcessor, isMultiplayerFn, aiPhaseProcessor) {
    // Check if already initialized
    if (this.isInitialized) {
      console.log('🔧 GameFlowManager already initialized, skipping...');
      return;
    }

    this.gameStateManager = gameStateManager;
    this.actionProcessor = actionProcessor;
    this.isMultiplayer = isMultiplayerFn;

    // Initialize GameDataService for phase requirement checks
    if (!this.gameDataService) {
      this.gameDataService = GameDataService.getInstance(gameStateManager);
    }

    // Initialize AIPhaseProcessor with execution dependencies (single-player only)
    // Only re-initialize if in single-player mode and AI has already been set up
    if (aiPhaseProcessor && aiPhaseProcessor.initialize && this.isMultiplayer && !this.isMultiplayer()) {
      // Get current initialization state
      const currentPersonality = aiPhaseProcessor.currentAIPersonality;
      const currentDronePool = aiPhaseProcessor.dronePool;
      const currentPersonalities = aiPhaseProcessor.aiPersonalities;

      // Only re-initialize if AI has been properly set up with personality and drones
      if (currentPersonality && currentDronePool && currentPersonalities) {
        aiPhaseProcessor.initialize(
          currentPersonalities,
          currentDronePool,
          currentPersonality,
          actionProcessor,
          gameStateManager
        );
        console.log('🔄 GameFlowManager re-initialized AIPhaseProcessor with dependencies');
      }
    }

    // Subscribe to completion events from other managers
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('🔧 GameFlowManager initialized with external systems');
  }

  /**
   * Set up event listeners for manager completion events
   */
  setupEventListeners() {
    // Subscribe to GameStateManager for both sequential and simultaneous phase completion detection
    if (this.gameStateManager) {
      this.gameStateManager.subscribe((event) => {
        const { state, type: eventType } = event;
        this.checkSequentialPhaseCompletion(state, eventType);
        this.checkSimultaneousPhaseCompletion(state, eventType);
      });
    }

    // Note: Direct state monitoring replaces both SequentialPhaseManager and SimultaneousActionManager event subscriptions
    // GameFlowManager now directly detects when both sequential and simultaneous phases should complete
  }

  /**
   * Subscribe to game flow events
   * @param {Function} listener - Event listener function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit events to all listeners
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  emit(eventType, data) {
    console.log(`🔔 GameFlowManager emitting: ${eventType}`, data);
    this.listeners.forEach(listener => {
      try {
        listener({ type: eventType, ...data });
      } catch (error) {
        console.error('GameFlowManager listener error:', error);
      }
    });
  }

  /**
   * Get current phase information
   * @returns {Object} Current phase state
   */
  getCurrentPhaseInfo() {
    return {
      currentPhase: this.currentPhase,
      gameStage: this.gameStage,
      roundNumber: this.roundNumber,
      isPreGame: this.gameStage === 'preGame',
      isRoundLoop: this.gameStage === 'roundLoop',
      isGameOver: this.gameStage === 'gameOver'
    };
  }

  /**
   * Start the game flow with initial phase
   * @param {string} startingPhase - Initial phase to start with
   */
  async startGameFlow(startingPhase = 'droneSelection') {
    // Guard: Guest mode does not run game flow logic
    const gameMode = this.gameStateManager.get('gameMode');
    if (gameMode === 'guest') {
      console.log('🔒 Guest mode: Skipping game flow logic (waiting for host state)');
      return;
    }

    console.log(`🚀 GameFlowManager starting game flow with phase: ${startingPhase}`);

    this.currentPhase = startingPhase;
    // Note: gameStage and roundNumber initialized in GameStateManager constructor
    this.gameStage = this.gameStateManager.get('gameStage');
    this.roundNumber = this.gameStateManager.get('roundNumber');

    // Initialize phase-specific data when entering phases
    let phaseData = {};
    if (startingPhase === 'droneSelection') {
      console.log('🎲 GameFlowManager initializing drone selection phase data');
      const droneSelectionData = initializeDroneSelection(fullDroneCollection);
      const placementData = initializeShipPlacement();
      phaseData = { ...droneSelectionData, ...placementData };
    }

    // Update GameStateManager with initial phase and phase data via ActionProcessor
    if (this.actionProcessor && this.gameStateManager) {
      // Use processPhaseTransition for phase change
      await this.actionProcessor.processPhaseTransition({
        newPhase: startingPhase,
        resetPassInfo: false  // Don't reset pass info during initialization
      });

      // Apply phase data (gameStage and roundNumber already initialized in GameStateManager)
      if (Object.keys(phaseData).length > 0) {
        this.gameStateManager.setState(phaseData, 'GAME_INITIALIZATION', 'phaseInitialization');
      }
    }

    this.emit('phaseTransition', {
      newPhase: startingPhase,
      previousPhase: null,
      gameStage: this.gameStage
    });
  }

  /**
   * Handle completion of simultaneous phases
   * @param {string} phase - The completed phase
   * @param {Object} data - Phase completion data
   */
  async onSimultaneousPhaseComplete(phase, data) {
    // Guard: Guest mode does not handle phase completions
    const gameMode = this.gameStateManager.get('gameMode');
    if (gameMode === 'guest') {
      return;
    }

    console.log(`✅ GameFlowManager: Simultaneous phase '${phase}' completed`, data);

    // Apply commitments to permanent game state before transitioning
    if (this.actionProcessor) {
      const stateUpdates = this.actionProcessor.applyPhaseCommitments(phase);
      if (Object.keys(stateUpdates).length > 0) {
        this.gameStateManager.setState(stateUpdates, 'COMMITMENT_APPLICATION', `${phase}_completion`);
        console.log(`📋 GameFlowManager: Applied ${phase} commitments to game state`);
      }
    }

    // Determine next phase based on current game stage
    const nextPhase = this.getNextPhase(phase);

    if (nextPhase) {
      // Check if we're transitioning from simultaneous to sequential phase
      if (this.isSequentialPhase(nextPhase)) {
        console.log(`🔄 GameFlowManager: Handover to sequential phase '${nextPhase}'`);
        this.initiateSequentialPhase(nextPhase);
      } else {
        // Continue with normal simultaneous phase transition
        console.log(`🔄 GameFlowManager: Continuing with simultaneous phase '${nextPhase}'`);
        await this.transitionToPhase(nextPhase);
      }
      // Note: Commitment cleanup handled by ActionProcessor.processPhaseTransition()
    } else {
      console.log('🎯 GameFlowManager: Game flow completed or needs special handling');
      // Note: Commitment cleanup handled by ActionProcessor.processPhaseTransition()
    }
  }

  /**
   * Check if sequential phases should complete based on state changes
   * @param {Object} state - Current game state
   * @param {string} eventType - Type of state change
   */
  checkSequentialPhaseCompletion(state, eventType) {
    // Guard: Guest mode does not check phase completions
    if (state.gameMode === 'guest') {
      return;
    }

    // Only check on passInfo changes
    if (eventType !== 'PASS_INFO_SET') {
      return;
    }

    // Only check for sequential phases
    const sequentialPhases = ['deployment', 'action'];
    if (!sequentialPhases.includes(state.turnPhase)) {
      return;
    }

    // Check if both players have passed
    if (state.passInfo && state.passInfo.player1Passed && state.passInfo.player2Passed) {
      console.log(`🎯 GameFlowManager: Detected sequential phase completion via state monitoring: ${state.turnPhase}`);

      // Call the completion handler directly
      this.onSequentialPhaseComplete(state.turnPhase, {
        firstPasser: state.passInfo.firstPasser
      });
    }
  }

  /**
   * Check for simultaneous phase completion via commitment state monitoring
   * @param {Object} state - Current game state
   * @param {string} eventType - Type of state change event
   */
  checkSimultaneousPhaseCompletion(state, eventType) {
    // Guard: Guest mode does not check phase completions
    if (state.gameMode === 'guest') {
      return;
    }
    // Only check on commitment changes - ignore all other state updates
    if (eventType !== 'COMMITMENT_UPDATE' || !state.commitments) {
      return;
    }

    console.log('🔍 checkSimultaneousPhaseCompletion called:', { eventType, currentPhase: state.turnPhase });

    const currentPhase = state.turnPhase;

    // Only check for simultaneous phases
    if (!this.SIMULTANEOUS_PHASES.includes(currentPhase)) {
      console.log('🔍 Early return: Not a simultaneous phase', { currentPhase, simultaneousPhases: this.SIMULTANEOUS_PHASES });
      return;
    }

    // Check if commitment data exists for current phase
    const phaseCommitments = state.commitments[currentPhase];
    if (!phaseCommitments) {
      console.log('🔍 Early return: No commitments for current phase', { currentPhase, allCommitments: Object.keys(state.commitments) });
      return;
    }

    // Check if both players have committed
    const bothComplete = phaseCommitments.player1?.completed &&
                        phaseCommitments.player2?.completed;

    console.log('🔍 Checking completion status:', { currentPhase, player1Complete: phaseCommitments.player1?.completed, player2Complete: phaseCommitments.player2?.completed, bothComplete });

    if (bothComplete) {
      console.log(`🎯 GameFlowManager: Detected simultaneous phase completion via state monitoring: ${currentPhase}`);

      // Call the completion handler directly
      this.onSimultaneousPhaseComplete(currentPhase, phaseCommitments);
    }
  }

  /**
   * Handle completion of sequential phases
   * @param {string} phase - The completed phase
   * @param {Object} data - Phase completion data
   */
  async onSequentialPhaseComplete(phase, data) {
    console.log(`✅ GameFlowManager: Sequential phase '${phase}' completed`, data);

    // GameFlowManager orchestrates ALL phase transitions
    // Determine next phase based on current game stage
    const nextPhase = this.getNextPhase(phase);

    if (nextPhase) {
      await this.transitionToPhase(nextPhase);
    } else {
      // End of action phase - start new round
      if (phase === 'action') {
        await this.startNewRound();
      }
    }
  }

  /**
   * Determine the next phase in the flow
   * @param {string} currentPhase - Current phase that just completed
   * @returns {string|null} Next phase name or null if special handling needed
   */
  getNextPhase(currentPhase) {
    if (this.gameStage === 'preGame') {
      return this.getNextPreGamePhase(currentPhase);
    } else if (this.gameStage === 'roundLoop') {
      return this.getNextRoundPhase(currentPhase);
    }

    return null;
  }

  /**
   * Process automatic phases directly without SimultaneousActionManager
   * @param {string} phase - Automatic phase to process
   */
  async processAutomaticPhase(phase) {
    console.log(`🤖 GameFlowManager: Processing automatic phase '${phase}'`);

    // Set flag to indicate we're processing an automatic phase
    this.isProcessingAutomaticPhase = true;

    let nextPhase = null;

    try {
      if (phase === 'gameInitializing') {
        nextPhase = await this.processGameInitializingPhase();
      } else if (phase === 'energyReset') {
        nextPhase = await this.processAutomaticEnergyResetPhase();
      } else if (phase === 'draw') {
        nextPhase = await this.processAutomaticDrawPhase();
      } else if (phase === 'determineFirstPlayer') {
        nextPhase = await this.processAutomaticFirstPlayerPhase();
      } else {
        console.warn(`⚠️ No handler for automatic phase: ${phase}`);
      }

      // Handle phase transition while still in automatic processing mode
      if (nextPhase) {
        console.log(`🔄 GameFlowManager: Transitioning from automatic phase '${phase}' to '${nextPhase}'`);
        await this.transitionToPhase(nextPhase);
      } else {
        console.warn(`⚠️ No next phase found after automatic phase: ${phase}`);
      }

    } finally {
      // Always clear the flag when automatic phase processing is complete
      this.isProcessingAutomaticPhase = false;
    }
  }


  /**
   * Process the automatic draw phase
   */
  async processAutomaticDrawPhase() {
    console.log('🃏 GameFlowManager: Processing automatic draw phase');

    const previousPhase = 'draw';

    try {
      // Import card drawing utilities
      const { performAutomaticDraw } = await import('../utils/cardDrawUtils.js');

      if (!this.gameStateManager) {
        console.error('❌ GameStateManager not available for automatic draw');
        return;
      }

      // Get current game state
      const currentGameState = this.gameStateManager.getState();

      // Perform automatic card drawing for both players
      const drawResult = performAutomaticDraw(currentGameState, this.gameStateManager);

      // Update game state with draw results via ActionProcessor
      await this.actionProcessor.queueAction({
        type: 'draw',
        payload: {
          player1: drawResult.player1,
          player2: drawResult.player2
        }
      });

      console.log('✅ Automatic draw phase completed, transitioning to next phase');

      // Emit completion event for draw phase
      this.emit('phaseTransition', {
        newPhase: 'draw',
        previousPhase: previousPhase,
        gameStage: this.gameStage,
        roundNumber: this.roundNumber,
        automaticProcessed: true
      });

      // Return next phase for transition by processAutomaticPhase
      const nextPhase = this.getNextPhase('draw');
      console.log('✅ Automatic draw completed, returning next phase:', nextPhase);
      return nextPhase;

    } catch (error) {
      console.error('❌ Error during automatic draw phase:', error);
    }
  }

  /**
   * Process the automatic first player determination phase
   */
  async processAutomaticFirstPlayerPhase() {
    console.log('🎯 GameFlowManager: Processing automatic first player determination phase');

    const previousPhase = 'determineFirstPlayer';

    try {
      // Call ActionProcessor to determine first player (this also shows first announcement)
      const firstPlayerResult = await this.actionProcessor.processFirstPlayerDetermination();
      console.log('🎯 First player determination completed:', firstPlayerResult);

      // The first announcement "DETERMINING FIRST PLAYER" is already shown by processPhaseTransition
      // Now show the second announcement with the result

      if (this.animationManager && firstPlayerResult.stateUpdates) {
        const localPlayerId = this.gameStateManager.getLocalPlayerId();
        const firstPlayer = firstPlayerResult.stateUpdates.firstPlayerOfRound;
        const isLocalPlayerFirst = firstPlayer === localPlayerId;

        const announcementText = isLocalPlayerFirst ? 'YOU ARE FIRST PLAYER' : 'OPPONENT IS FIRST PLAYER';

        const secondAnnouncementEvent = {
          animationName: 'PHASE_ANNOUNCEMENT',
          payload: {
            phaseText: announcementText,
            phaseName: 'firstPlayerResult',
            timestamp: Date.now()
          }
        };

        // Execute second announcement (blocks gameplay during display)
        await this.animationManager.executeAnimations([secondAnnouncementEvent]);
        console.log('🎬 [FIRST PLAYER] Second announcement complete');
      }

      // Emit completion event for first player phase
      this.emit('phaseTransition', {
        newPhase: 'determineFirstPlayer',
        previousPhase: previousPhase,
        gameStage: this.gameStage,
        roundNumber: this.roundNumber,
        automaticProcessed: true
      });

      // Return next phase for transition by processAutomaticPhase
      const nextPhase = this.getNextPhase('determineFirstPlayer');
      console.log('✅ Automatic first player determination completed, returning next phase:', nextPhase);
      return nextPhase;

    } catch (error) {
      console.error('❌ Error during automatic first player determination:', error);
    }
  }

  /**
   * Process the automatic energy reset phase
   */
  async processAutomaticEnergyResetPhase() {
    console.log('⚡ GameFlowManager: Processing automatic energy reset phase');

    const previousPhase = 'energyReset';

    try {
      if (!this.gameStateManager) {
        console.error('❌ GameStateManager not available for energy reset');
        return;
      }

      // Get current game state
      const currentGameState = this.gameStateManager.getState();

      // Create GameDataService instance for effective stats calculation
      const GameDataService = (await import('../services/GameDataService.js')).default;
      const gameDataService = GameDataService.getInstance(this.gameStateManager);

      // Calculate effective ship stats for both players
      const player1EffectiveStats = gameDataService.getEffectiveShipStats(
        currentGameState.player1,
        currentGameState.placedSections
      );
      const player2EffectiveStats = gameDataService.getEffectiveShipStats(
        currentGameState.player2,
        currentGameState.opponentPlacedSections
      );

      // Ready drones (unexhaust, restore shields, remove temporary mods) and reset resources
      const allPlacedSections = {
        player1: currentGameState.placedSections,
        player2: currentGameState.opponentPlacedSections
      };

      // Use readyDronesAndRestoreShields to properly reset drone states
      const readiedPlayer1 = gameEngine.readyDronesAndRestoreShields(
        currentGameState.player1,
        currentGameState.player2,
        allPlacedSections  // Pass full structure with both players
      );
      const readiedPlayer2 = gameEngine.readyDronesAndRestoreShields(
        currentGameState.player2,
        currentGameState.player1,
        allPlacedSections  // Pass full structure with both players
      );

      // Apply energy and deployment budget on top of readied states
      // Round 1: Use initialDeploymentBudget (includes first lane bonus)
      // Round 2+: Use deploymentBudget (ongoing resource from ship sections)
      const updatedPlayer1 = {
        ...readiedPlayer1,
        energy: player1EffectiveStats.totals.energyPerTurn,
        initialDeploymentBudget: this.roundNumber === 1 ? player1EffectiveStats.totals.initialDeployment : 0,
        deploymentBudget: this.roundNumber === 1 ? 0 : player1EffectiveStats.totals.deploymentBudget
      };

      const updatedPlayer2 = {
        ...readiedPlayer2,
        energy: player2EffectiveStats.totals.energyPerTurn,
        initialDeploymentBudget: this.roundNumber === 1 ? player2EffectiveStats.totals.initialDeployment : 0,
        deploymentBudget: this.roundNumber === 1 ? 0 : player2EffectiveStats.totals.deploymentBudget
      };

      // Calculate shields to allocate from Power Cell stats (round 2+ only)
      const shieldsToAllocate = this.roundNumber >= 2 ? player1EffectiveStats.totals.shieldsPerTurn : 0;
      const opponentShieldsToAllocate = this.roundNumber >= 2 ? player2EffectiveStats.totals.shieldsPerTurn : 0;

      // Update player states via ActionProcessor
      await this.actionProcessor.queueAction({
        type: 'energyReset',
        payload: {
          player1: updatedPlayer1,
          player2: updatedPlayer2,
          shieldsToAllocate,
          opponentShieldsToAllocate
        }
      });

      console.log(`✅ Energy reset complete - Player 1: ${updatedPlayer1.energy} energy, Player 2: ${updatedPlayer2.energy} energy`);

      // Emit completion event for energy reset phase
      this.emit('phaseTransition', {
        newPhase: 'energyReset',
        previousPhase: previousPhase,
        gameStage: this.gameStage,
        roundNumber: this.roundNumber,
        automaticProcessed: true
      });

      // Return next phase for transition by processAutomaticPhase
      const nextPhase = this.getNextPhase('energyReset');
      console.log('✅ Automatic energy reset completed, returning next phase:', nextPhase);
      return nextPhase;

    } catch (error) {
      console.error('❌ Error during automatic energy reset phase:', error);
    }
  }

  /**
   * Process the game initializing phase
   * This phase ensures UI components are mounted before any round phases begin
   */
  async processGameInitializingPhase() {
    console.log('🎯 GameFlowManager: Processing game initializing phase');

    const previousPhase = 'gameInitializing';

    try {
      // Emit the phase transition event to allow App.jsx to mount
      this.emit('phaseTransition', {
        newPhase: 'gameInitializing',
        previousPhase: 'placement',
        gameStage: this.gameStage,
        roundNumber: this.roundNumber
      });

      // Brief delay to allow App.jsx to mount and subscribe to events
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get next phase (which should be determineFirstPlayer)
      const nextPhase = this.getNextPhase('gameInitializing');
      console.log('✅ Game initialization completed, returning next phase:', nextPhase);
      return nextPhase;

    } catch (error) {
      console.error('❌ Error during game initialization:', error);
      throw error;
    }
  }

  /**
   * Get next phase in pre-game sequence
   * @param {string} currentPhase - Current pre-game phase
   * @returns {string|null} Next pre-game phase or null if pre-game complete
   */
  getNextPreGamePhase(currentPhase) {
    const currentIndex = this.PRE_GAME_PHASES.indexOf(currentPhase);

    if (currentIndex >= 0 && currentIndex < this.PRE_GAME_PHASES.length - 1) {
      return this.PRE_GAME_PHASES[currentIndex + 1];
    }

    // Pre-game complete, transition to round loop
    if (currentPhase === 'gameInitializing') {
      // Start the first round with first player determination
      return 'determineFirstPlayer'; // Start with first player determination
    }

    return null;
  }

  /**
   * Get next phase in round loop sequence
   * @param {string} currentPhase - Current round phase
   * @returns {string|null} Next round phase or null if round complete
   */
  getNextRoundPhase(currentPhase) {
    // Find next required phase
    const currentIndex = this.ROUND_PHASES.indexOf(currentPhase);

    for (let i = currentIndex + 1; i < this.ROUND_PHASES.length; i++) {
      const candidatePhase = this.ROUND_PHASES[i];
      if (this.isPhaseRequired(candidatePhase)) {
        return candidatePhase;
      }
    }

    // End of round phases
    return null;
  }

  /**
   * Check if a phase is required based on current game state
   * @param {string} phase - Phase to check
   * @returns {boolean} True if phase is required
   */
  isPhaseRequired(phase) {
    if (!this.gameStateManager) {
      console.warn('⚠️ GameStateManager not available for phase requirement check');
      return true; // Default to required if we can't check
    }

    const gameState = this.gameStateManager.getState();

    switch(phase) {
      case 'energyReset':
        return true; // Always required - automatic phase
      case 'mandatoryDiscard':
        return this.anyPlayerExceedsHandLimit(gameState);
      case 'optionalDiscard':
        return this.anyPlayerHasCards(gameState); // Only required if players have cards
      case 'draw':
        return true; // Always required - automatic phase
      case 'determineFirstPlayer':
        return true; // Always required for round start
      case 'allocateShields':
        return this.anyPlayerHasShieldsToAllocate(gameState);
      case 'mandatoryDroneRemoval':
        return this.anyPlayerExceedsDroneLimit(gameState);
      case 'deployment':
      case 'action':
        return true; // Always required
      case 'deploymentComplete':
        return false; // This phase was removed but may still be in legacy phase list
      default:
        return true; // Default to required for unknown phases
    }
  }

  /**
   * Check if any player exceeds hand limit
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player needs to discard
   */
  anyPlayerExceedsHandLimit(gameState) {
    // Use GameDataService to check effective hand limits
    if (!this.gameDataService) {
      console.warn('⚠️ GameDataService not initialized for hand limit check');
      return false;
    }

    // Check player1
    const player1HandCount = gameState.player1.hand ? gameState.player1.hand.length : 0;
    const player1Stats = this.gameDataService.getEffectiveShipStats(gameState.player1, gameState.placedSections);
    const player1HandLimit = player1Stats.totals.handLimit;

    if (player1HandCount > player1HandLimit) {
      return true;
    }

    // Check player2
    const player2HandCount = gameState.player2.hand ? gameState.player2.hand.length : 0;
    const player2Stats = this.gameDataService.getEffectiveShipStats(gameState.player2, gameState.opponentPlacedSections);
    const player2HandLimit = player2Stats.totals.handLimit;

    if (player2HandCount > player2HandLimit) {
      return true;
    }

    return false;
  }

  /**
   * Check if any player has shields to allocate
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player has unallocated shields
   */
  anyPlayerHasShieldsToAllocate(gameState) {
    // Shield allocation phase starts from round 2 onwards
    if (gameState.roundNumber < 2) {
      return false;
    }

    // Check if either player has shields available to allocate
    return gameState.shieldsToAllocate > 0 || gameState.opponentShieldsToAllocate > 0;
  }

  /**
   * Check if any player has cards in hand
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player has at least 1 card in hand
   */
  anyPlayerHasCards(gameState) {
    const player1HasCards = gameState.player1.hand && gameState.player1.hand.length > 0;
    const player2HasCards = gameState.player2.hand && gameState.player2.hand.length > 0;

    return player1HasCards || player2HasCards;
  }

  /**
   * Check if any player exceeds drone limit
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player has too many drones
   */
  anyPlayerExceedsDroneLimit(gameState) {
    // Use GameDataService to check effective drone limits
    if (!this.gameDataService) {
      console.warn('⚠️ GameDataService not initialized for drone limit check');
      return false;
    }

    // Check player1
    const player1DronesCount = Object.values(gameState.player1.dronesOnBoard || {}).flat().length;
    const player1Stats = this.gameDataService.getEffectiveShipStats(gameState.player1, gameState.placedSections);
    const player1DroneLimit = player1Stats.totals.droneLimit;

    if (player1DronesCount > player1DroneLimit) {
      return true;
    }

    // Check player2
    const player2DronesCount = Object.values(gameState.player2.dronesOnBoard || {}).flat().length;
    const player2Stats = this.gameDataService.getEffectiveShipStats(gameState.player2, gameState.opponentPlacedSections);
    const player2DroneLimit = player2Stats.totals.droneLimit;

    if (player2DronesCount > player2DroneLimit) {
      return true;
    }

    return false;
  }

  /**
   * Check if a phase is a simultaneous phase
   * @param {string} phase - Phase name to check
   * @returns {boolean} True if phase is simultaneous
   */
  isSimultaneousPhase(phase) {
    return this.SIMULTANEOUS_PHASES.includes(phase);
  }

  /**
   * Check if a phase is a sequential phase
   * @param {string} phase - Phase name to check
   * @returns {boolean} True if phase is sequential
   */
  isSequentialPhase(phase) {
    return this.SEQUENTIAL_PHASES.includes(phase);
  }

  /**
   * Check if a phase is an automatic phase
   * @param {string} phase - Phase name to check
   * @returns {boolean} True if phase is automatic
   */
  isAutomaticPhase(phase) {
    return this.AUTOMATIC_PHASES.includes(phase);
  }

  /**
   * Initiate a sequential phase via ActionProcessor
   * @param {string} phase - Sequential phase to start ('deployment' or 'action')
   */
  initiateSequentialPhase(phase) {
    console.log(`🎯 GameFlowManager: Initiating sequential phase '${phase}' via ActionProcessor`);

    // Update current phase tracking
    const previousPhase = this.currentPhase;
    this.currentPhase = phase;

    // Update GameStateManager via ActionProcessor to avoid bypass validation
    if (this.actionProcessor && this.gameStateManager) {
      // Use ActionProcessor to safely update game state for sequential phases
      console.log(`🔄 Starting ${phase} phase through ActionProcessor`);

      // Update the phase through ActionProcessor with proper validation
      this.actionProcessor.processPhaseTransition({
        newPhase: phase,
        gameStage: this.gameStage,
        roundNumber: this.roundNumber
      });
    } else {
      console.warn('⚠️ ActionProcessor or GameStateManager not available for sequential phase initiation');
    }

    // Emit transition event
    this.emit('phaseTransition', {
      newPhase: phase,
      previousPhase,
      gameStage: this.gameStage,
      roundNumber: this.roundNumber,
      handoverType: 'simultaneous-to-sequential'
    });
  }

  /**
   * Transition to a new phase
   * @param {string} newPhase - Phase to transition to
   */
  async transitionToPhase(newPhase) {
    const previousPhase = this.currentPhase;
    this.currentPhase = newPhase;

    // Handle special phase transitions
    if (this.ROUND_PHASES.includes(newPhase) && this.gameStage !== 'roundLoop') {
      this.gameStage = 'roundLoop';
      if (this.roundNumber === 0) {
        this.roundNumber = 1;
        // Update gameState with initial round number
        this.gameStateManager.setState({
          roundNumber: 1,
          turn: 1
        });
      }
    }

    console.log(`🔄 GameFlowManager: Transitioning from '${previousPhase}' to '${newPhase}' (${this.gameStage})`);

    // Initialize phase-specific data when transitioning to certain phases
    let phaseData = {};
    let firstPlayerResult = null;

    if (newPhase === 'placement') {
      console.log('🚢 GameFlowManager: Initializing placement phase data');
      const placementData = initializeShipPlacement();
      phaseData = placementData;
    }

    // Update GameStateManager with new phase via ActionProcessor
    if (this.actionProcessor && this.gameStateManager) {
      // Use ActionProcessor for phase transition (through queueAction to ensure broadcast to guest)
      await this.actionProcessor.queueAction({
        type: 'phaseTransition',
        payload: {
          newPhase: newPhase,
          resetPassInfo: true  // Reset pass info for new phases
        }
      });

      // Apply game stage, round number, and phase-specific data directly
      // These are GameFlowManager-specific metadata not handled by standard phase transitions
      this.gameStateManager.setState({
        gameStage: this.gameStage,
        roundNumber: this.roundNumber,
        ...phaseData
      }, 'PHASE_TRANSITION', 'gameFlowManagerMetadata');
    }

    // Handle automatic phases directly
    if (this.isAutomaticPhase(newPhase)) {
      console.log(`🤖 GameFlowManager: Auto-processing automatic phase '${newPhase}'`);
      await this.processAutomaticPhase(newPhase);
      return; // Don't emit transition event yet - will emit after automatic processing
    }

    // Emit transition event for non-automatic phases
    this.emit('phaseTransition', {
      newPhase,
      previousPhase,
      gameStage: this.gameStage,
      roundNumber: this.roundNumber,
      firstPlayerResult
    });
  }

  /**
   * Start a new round (loop back to beginning of round phases)
   */
  async startNewRound() {
    this.roundNumber++;
    console.log(`🔄 GameFlowManager: Starting round ${this.roundNumber}`);

    // Update gameState with new round number (and turn for backwards compatibility)
    this.gameStateManager.setState({
      roundNumber: this.roundNumber,
      turn: this.roundNumber
    });

    // Find first required phase in new round
    const firstRequiredPhase = this.ROUND_PHASES.find(phase => this.isPhaseRequired(phase));

    // Note: PassInfo will be reset by ActionProcessor.processPhaseTransition()
    // when transitioning to the first phase (resetPassInfo defaults to true)
    if (firstRequiredPhase) {
      await this.transitionToPhase(firstRequiredPhase);
    } else {
      console.warn('⚠️ No required phases found for new round, defaulting to deployment');
      await this.transitionToPhase('deployment');
    }
  }

  /**
   * Handle game over condition
   * @param {string} winnerId - ID of winning player
   */
  endGame(winnerId) {
    console.log(`🏆 GameFlowManager: Game ended, winner: ${winnerId}`);

    this.gameStage = 'gameOver';
    this.currentPhase = 'gameOver';

    // Transition to game over phase via ActionProcessor
    if (this.actionProcessor && this.gameStateManager) {
      // Use ActionProcessor for phase transition
      this.actionProcessor.processPhaseTransition({
        newPhase: 'gameOver',
        resetPassInfo: false  // Don't reset pass info for game over
      });

      // Set game stage and winner directly for game-level metadata
      this.gameStateManager.setState({
        gameStage: 'gameOver',
        winner: winnerId
      }, 'GAME_ENDED', 'gameEndMetadata');
    }

    this.emit('gameEnded', {
      winnerId,
      finalRound: this.roundNumber
    });
  }

  /**
   * Reset game flow for new game
   */
  reset() {
    console.log('🔄 GameFlowManager: Resetting game flow');

    this.currentPhase = 'preGame';
    this.gameStage = 'preGame';
    this.roundNumber = 0;

    this.emit('gameReset', {});
  }

  /**
   * Get debug information about current flow state
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      currentPhase: this.currentPhase,
      gameStage: this.gameStage,
      roundNumber: this.roundNumber,
      preGamePhases: this.PRE_GAME_PHASES,
      roundPhases: this.ROUND_PHASES,
      systemsConnected: {
        gameStateManager: !!this.gameStateManager,
        actionProcessor: !!this.actionProcessor
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const gameFlowManager = new GameFlowManager();

export default gameFlowManager;