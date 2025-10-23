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
import { debugLog } from '../utils/debugLogger.js';

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
    this.PRE_GAME_PHASES = ['deckSelection', 'droneSelection', 'placement', 'gameInitializing'];
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

    debugLog('PHASE_TRANSITIONS', '🎮 GameFlowManager initialized');
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
      debugLog('PHASE_TRANSITIONS', '🔧 GameFlowManager already initialized, skipping...');
      return;
    }

    this.gameStateManager = gameStateManager;
    this.actionProcessor = actionProcessor;
    this.isMultiplayer = isMultiplayerFn;

    // Store Guest mode flag for optimistic execution logic
    this.isGuestMode = () => gameStateManager.get('gameMode') === 'guest';

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
        debugLog('PHASE_TRANSITIONS', '🔄 GameFlowManager re-initialized AIPhaseProcessor with dependencies');
      }
    }

    // Subscribe to completion events from other managers
    this.setupEventListeners();

    this.isInitialized = true;
    debugLog('PHASE_TRANSITIONS', '🔧 GameFlowManager initialized with external systems');
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

    // Subscribe to ActionProcessor for turn transition handling
    if (this.actionProcessor) {
      this.actionProcessor.subscribe((event) => {
        if (event.type === 'action_completed') {
          this.handleActionCompletion(event);
        }
      });
    }

    // Note: Direct state monitoring replaces both SequentialPhaseManager and SimultaneousActionManager event subscriptions
    // GameFlowManager now directly detects when both sequential and simultaneous phases should complete
    // ActionProcessor events handle turn transitions after individual actions
  }

  /**
   * Handle action completion events from ActionProcessor
   * Processes turn transitions based on shouldEndTurn flag
   * @param {Object} event - Action completion event
   */
  async handleActionCompletion(event) {
    const { actionType, result } = event;

    // Guard: Guest mode doesn't handle turn transitions (host sends them)
    const currentState = this.gameStateManager.getState();
    if (currentState.gameMode === 'guest') {
      return;
    }

    // Only process for sequential phases
    const sequentialPhases = ['deployment', 'action'];
    if (!sequentialPhases.includes(currentState.turnPhase)) {
      return;
    }

    debugLog('PHASE_TRANSITIONS', `🎯 GameFlowManager: Action completed - ${actionType}`, {
      shouldEndTurn: result?.shouldEndTurn,
      currentPlayer: currentState.currentPlayer
    });

    // CRITICAL: Synchronously check for both-passed condition BEFORE broadcasting
    // This prevents race condition where guest receives wrong phase
    if (actionType === 'playerPass') {
      const updatedState = this.gameStateManager.getState();
      const bothPassed = updatedState.passInfo?.player1Passed && updatedState.passInfo?.player2Passed;

      debugLog('PASS_LOGIC', `🔍 Both-passed check after ${actionType}:`, {
        player1Passed: updatedState.passInfo?.player1Passed,
        player2Passed: updatedState.passInfo?.player2Passed,
        bothPassed,
        currentPhase: updatedState.turnPhase
      });

      if (bothPassed) {
        debugLog('PHASE_TRANSITIONS', `✅ Both players passed, triggering phase transition synchronously`);

        // Trigger phase transition synchronously BEFORE broadcasting
        await this.onSequentialPhaseComplete(updatedState.turnPhase, {
          reason: 'both_passed',
          passInfo: updatedState.passInfo
        });

        debugLog('PHASE_TRANSITIONS', `✅ Phase transition completed, broadcasting updated state`);

        // Broadcast state AFTER phase transition completes
        // This ensures guest receives correct phase and all associated state updates
        if (currentState.gameMode === 'host' && this.actionProcessor.p2pManager) {
          debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] Phase transition after both-passed`);
          this.actionProcessor.broadcastStateToGuest();
          debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted state after phase transition`);
        }
        return;
      }
    }

    // Check if action should end turn
    if (result && result.shouldEndTurn) {
      const updatedState = this.gameStateManager.getState();
      const nextPlayer = updatedState.currentPlayer === 'player1' ? 'player2' : 'player1';

      debugLog('PHASE_TRANSITIONS', `🔄 GameFlowManager: Processing turn transition to ${nextPlayer}`);

      // Process turn transition via ActionProcessor
      await this.actionProcessor.processTurnTransition({
        newPlayer: nextPlayer
      });

      debugLog('PHASE_TRANSITIONS', `✅ GameFlowManager: Turn transition completed`);

      // Broadcast state to guest AFTER turn transition completes (host only)
      // This ensures guest receives complete state including new currentPlayer
      if (currentState.gameMode === 'host' && this.actionProcessor.p2pManager) {
        debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] Turn transition → ${nextPlayer}`);
        this.actionProcessor.broadcastStateToGuest();
        debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted state after turn transition`);
      }
    } else {
      debugLog('PHASE_TRANSITIONS', `⏭️ GameFlowManager: Action has goAgain, keeping same player`);

      // Broadcast even for goAgain actions (action completed, just same player's turn)
      if (currentState.gameMode === 'host' && this.actionProcessor.p2pManager) {
        debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] GoAgain action → same player`);
        this.actionProcessor.broadcastStateToGuest();
        debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted state after goAgain action`);
      }
    }
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
    debugLog('PHASE_TRANSITIONS', `🔔 GameFlowManager emitting: ${eventType}`, data);
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
  async startGameFlow(startingPhase = 'deckSelection') {
    // Guard: Guest mode does not run game flow logic
    const gameMode = this.gameStateManager.get('gameMode');
    if (gameMode === 'guest') {
      debugLog('PHASE_TRANSITIONS', '🔒 Guest mode: Skipping game flow logic (waiting for host state)');
      return;
    }

    debugLog('PHASE_TRANSITIONS', `🚀 GameFlowManager starting game flow with phase: ${startingPhase}`);

    this.currentPhase = startingPhase;
    // Note: gameStage and roundNumber initialized in GameStateManager constructor
    this.gameStage = this.gameStateManager.get('gameStage');
    this.roundNumber = this.gameStateManager.get('roundNumber');

    // Initialize phase-specific data when entering phases
    let phaseData = {};
    if (startingPhase === 'deckSelection') {
      debugLog('PHASE_TRANSITIONS', '🎲 GameFlowManager initializing deck selection phase data');
      // Initialize ship placement data (used later in placement phase)
      const placementData = initializeShipPlacement();
      phaseData = { ...placementData };
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
        try {
          this.gameStateManager._updateContext = 'GameFlowManager';
          this.gameStateManager.setState(phaseData, 'GAME_INITIALIZATION', 'phaseInitialization');
        } finally {
          this.gameStateManager._updateContext = null;
        }
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

    debugLog('PHASE_TRANSITIONS', `✅ GameFlowManager: Simultaneous phase '${phase}' completed`, data);

    // Apply commitments to permanent game state before transitioning
    if (this.actionProcessor) {
      const stateUpdates = this.actionProcessor.applyPhaseCommitments(phase);

      // Initialize drone selection data when deckSelection completes
      // This must happen on host so data gets broadcast to guest
      if (phase === 'deckSelection') {
        debugLog('PHASE_TRANSITIONS', '🎲 GameFlowManager: Initializing drone selection data for both players after deck selection');
        const commitments = this.gameStateManager.get('commitments');
        const deckCommitments = commitments?.deckSelection;

        debugLog('DRONE_SELECTION', 'Deck commitments:', {
          hasCommitments: !!deckCommitments,
          player1HasDrones: !!deckCommitments?.player1?.drones,
          player2HasDrones: !!deckCommitments?.player2?.drones,
          player1DroneCount: deckCommitments?.player1?.drones?.length,
          player2DroneCount: deckCommitments?.player2?.drones?.length,
          player1Drones: deckCommitments?.player1?.drones,
          player2Drones: deckCommitments?.player2?.drones
        });

        if (deckCommitments) {
          // Initialize for player1
          if (deckCommitments.player1?.drones) {
            const player1Drones = this.extractDronesFromDeck(deckCommitments.player1.drones);
            const player1DroneData = initializeDroneSelection(player1Drones, 2);
            stateUpdates.player1DroneSelectionTrio = player1DroneData.droneSelectionTrio;
            stateUpdates.player1DroneSelectionPool = player1DroneData.droneSelectionPool;
            debugLog('PHASE_TRANSITIONS', `🎲 Player1 deck has ${player1Drones.length} drones for selection`);
            debugLog('DRONE_SELECTION', 'Created player1DroneSelectionTrio:',
              player1DroneData.droneSelectionTrio.map(d => d.name));
          } else {
            console.warn('⚠️ No drones found in player1 deck commitment');
          }

          // Initialize for player2
          if (deckCommitments.player2?.drones) {
            const player2Drones = this.extractDronesFromDeck(deckCommitments.player2.drones);
            const player2DroneData = initializeDroneSelection(player2Drones, 2);
            stateUpdates.player2DroneSelectionTrio = player2DroneData.droneSelectionTrio;
            stateUpdates.player2DroneSelectionPool = player2DroneData.droneSelectionPool;
            debugLog('PHASE_TRANSITIONS', `🎲 Player2 deck has ${player2Drones.length} drones for selection`);
            debugLog('DRONE_SELECTION', 'Created player2DroneSelectionTrio:',
              player2DroneData.droneSelectionTrio.map(d => d.name));
          } else {
            console.warn('⚠️ No drones found in player2 deck commitment');
          }

          debugLog('DRONE_SELECTION', 'stateUpdates keys:', Object.keys(stateUpdates));
        } else {
          console.error('❌ No deck commitments found - cannot initialize drone selection');
        }
      }

      if (Object.keys(stateUpdates).length > 0) {
        try {
          this.gameStateManager._updateContext = 'GameFlowManager';
          this.gameStateManager.setState(stateUpdates, 'COMMITMENT_APPLICATION', `${phase}_completion`);
        } finally {
          this.gameStateManager._updateContext = null;
        }
        debugLog('PHASE_TRANSITIONS', `📋 GameFlowManager: Applied ${phase} commitments to game state`);
      }
    }

    // Determine next phase based on current game stage
    const nextPhase = this.getNextPhase(phase);

    if (nextPhase) {
      // Check if we're transitioning from simultaneous to sequential phase
      if (this.isSequentialPhase(nextPhase)) {
        debugLog('PHASE_TRANSITIONS', `🔄 GameFlowManager: Handover to sequential phase '${nextPhase}'`);
        this.initiateSequentialPhase(nextPhase);

        // Broadcast state to guest AFTER phase transition completes (host only)
        // This ensures guest receives the updated turnPhase immediately
        if (gameMode === 'host' && this.actionProcessor.p2pManager) {
          debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] Phase: simultaneous→sequential → ${nextPhase}`);
          this.actionProcessor.broadcastStateToGuest();
          debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted state after simultaneous→sequential transition to ${nextPhase}`);
        }
      } else {
        // Continue with normal simultaneous phase transition
        debugLog('PHASE_TRANSITIONS', `🔄 GameFlowManager: Continuing with simultaneous phase '${nextPhase}'`);
        await this.transitionToPhase(nextPhase);

        // Broadcast state to guest AFTER phase transition completes (host only)
        // This ensures guest receives the updated turnPhase immediately
        if (gameMode === 'host' && this.actionProcessor.p2pManager) {
          debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] Phase: simultaneous→simultaneous → ${nextPhase}`);
          this.actionProcessor.broadcastStateToGuest();
          debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted state after phase transition to ${nextPhase}`);
        }
      }
      // Note: Commitment cleanup handled by ActionProcessor.processPhaseTransition()
    } else {
      debugLog('PHASE_TRANSITIONS', '🎯 GameFlowManager: Game flow completed or needs special handling');
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
      debugLog('PHASE_TRANSITIONS', `🎯 GameFlowManager: Detected sequential phase completion via state monitoring: ${state.turnPhase}`);

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

    debugLog('PHASE_TRANSITIONS', '🔍 checkSimultaneousPhaseCompletion called:', { eventType, currentPhase: state.turnPhase });

    const currentPhase = state.turnPhase;

    // Only check for simultaneous phases
    if (!this.SIMULTANEOUS_PHASES.includes(currentPhase)) {
      debugLog('PHASE_TRANSITIONS', '🔍 Early return: Not a simultaneous phase', { currentPhase, simultaneousPhases: this.SIMULTANEOUS_PHASES });
      return;
    }

    // Check if commitment data exists for current phase
    const phaseCommitments = state.commitments[currentPhase];
    if (!phaseCommitments) {
      debugLog('PHASE_TRANSITIONS', '🔍 Early return: No commitments for current phase', { currentPhase, allCommitments: Object.keys(state.commitments) });
      return;
    }

    // Check if both players have committed
    const bothComplete = phaseCommitments.player1?.completed &&
                        phaseCommitments.player2?.completed;

    debugLog('PHASE_TRANSITIONS', '🔍 Checking completion status:', { currentPhase, player1Complete: phaseCommitments.player1?.completed, player2Complete: phaseCommitments.player2?.completed, bothComplete });

    if (bothComplete) {
      debugLog('PHASE_TRANSITIONS', `🎯 GameFlowManager: Detected simultaneous phase completion via state monitoring: ${currentPhase}`);

      // Emit immediate event so UI can clear waiting overlays right away
      this.emit('bothPlayersComplete', {
        phase: currentPhase,
        commitments: phaseCommitments
      });

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
    debugLog('PHASE_TRANSITIONS', `✅ GameFlowManager: Sequential phase '${phase}' completed`, data);

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
   * @param {string} previousPhase - The phase we're transitioning from
   */
  async processAutomaticPhase(phase, previousPhase) {
    debugLog('PHASE_TRANSITIONS', `🤖 GameFlowManager: Processing automatic phase '${phase}' from '${previousPhase}'`);

    // GUEST MODE: Sync internal state from GameStateManager before processing
    // Guest's GameFlowManager initializes with defaults but needs to match Host's gameStage/roundNumber
    if (this.isGuestMode && this.isGuestMode()) {
      const currentGameState = this.gameStateManager.getState();
      this.gameStage = currentGameState.gameStage || 'preGame';
      this.roundNumber = currentGameState.roundNumber || 0;

      debugLog('OPTIMISTIC_EXECUTION', `🔄 [GUEST] Synced GameFlowManager state from GameStateManager: {gameStage: '${this.gameStage}', roundNumber: ${this.roundNumber}}`);
    }

    // Set flag to indicate we're processing an automatic phase
    this.isProcessingAutomaticPhase = true;

    let nextPhase = null;

    try {
      if (phase === 'gameInitializing') {
        nextPhase = await this.processGameInitializingPhase(previousPhase);
      } else if (phase === 'energyReset') {
        nextPhase = await this.processAutomaticEnergyResetPhase(previousPhase);
      } else if (phase === 'draw') {
        nextPhase = await this.processAutomaticDrawPhase(previousPhase);
      } else if (phase === 'determineFirstPlayer') {
        nextPhase = await this.processAutomaticFirstPlayerPhase(previousPhase);
      } else {
        console.warn(`⚠️ No handler for automatic phase: ${phase}`);
      }

      // Handle phase transition while still in automatic processing mode
      // Note: Each phase handler now broadcasts at optimal timing (after state update, before blocking animations)
      if (nextPhase) {
        debugLog('PHASE_TRANSITIONS', `🔄 GameFlowManager: Transitioning from automatic phase '${phase}' to '${nextPhase}'`);
        await this.transitionToPhase(nextPhase);
      } else {
        console.warn(`⚠️ No next phase found after automatic phase: ${phase}`);
      }

    } finally {
      // Always clear the flag when automatic phase processing is complete
      this.isProcessingAutomaticPhase = false;

      // GUEST OPTIMISTIC EXECUTION: Track animations for deduplication
      // When Guest processes automatic phases locally, track animations so they're
      // filtered out when Host broadcast arrives (same pattern as drone deployment)
      if (this.isGuestMode && this.isGuestMode()) {
        const actionAnims = this.actionProcessor.getAndClearPendingActionAnimations();
        const systemAnims = this.actionProcessor.getAndClearPendingSystemAnimations();

        if ((actionAnims && actionAnims.length > 0) || (systemAnims && systemAnims.length > 0)) {
          const animations = {
            actionAnimations: actionAnims || [],
            systemAnimations: systemAnims || []
          };

          debugLog('OPTIMISTIC_EXECUTION', `🎬 [GUEST] Tracking ${animations.actionAnimations.length + animations.systemAnimations.length} animations for deduplication`);
          this.gameStateManager.trackOptimisticAnimations(animations);
        }
      }
    }
  }

  /**
   * Process placement completion and automatic phase cascade (Guest optimistic execution)
   * Called when Guest knows both players have committed to placement
   * Processes placement → gameInitializing → determineFirstPlayer → energyReset → (stop at next phase)
   */
  async processPlacementAndAutomaticCascade() {
    debugLog('OPTIMISTIC_EXECUTION', '🚀 [GUEST] Processing placement completion + automatic cascade');

    // 1. Apply placement commitments to game state
    const commitments = this.gameStateManager.get('commitments');
    const placementCommitments = commitments?.placement;

    if (!placementCommitments?.player1?.completed || !placementCommitments?.player2?.completed) {
      debugLog('OPTIMISTIC_EXECUTION', '⚠️ [GUEST] Cannot process cascade - not all players committed');
      return;
    }

    // Apply placement data to state (same as Host does)
    const stateUpdates = {
      placedSections: placementCommitments.player1.actionData.placedSections,
      opponentPlacedSections: placementCommitments.player2.actionData.placedSections
    };

    this.gameStateManager.setState(stateUpdates);
    debugLog('OPTIMISTIC_EXECUTION', '✅ [GUEST] Applied placement commitments to state');

    // 2. Process automatic phase cascade
    let currentPhase = 'gameInitializing';
    let prevPhase = 'placement';

    while (true) {
      if (!this.isAutomaticPhase(currentPhase)) {
        debugLog('OPTIMISTIC_EXECUTION', `🛑 [GUEST] Cascade stopped at: ${currentPhase}`);
        break;
      }

      debugLog('OPTIMISTIC_EXECUTION', `⚡ [GUEST] Cascade processing: ${currentPhase}`);
      await this.processAutomaticPhase(currentPhase, prevPhase);

      const nextPhase = this.getNextPhase(currentPhase);
      if (!nextPhase) {
        debugLog('OPTIMISTIC_EXECUTION', '✅ [GUEST] Cascade complete - no next phase');
        break;
      }

      prevPhase = currentPhase;
      currentPhase = nextPhase;
    }

    debugLog('OPTIMISTIC_EXECUTION', '✅ [GUEST] Placement + automatic cascade complete');
  }


  /**
   * Process the automatic draw phase
   * @param {string} previousPhase - The phase we're transitioning from
   */
  async processAutomaticDrawPhase(previousPhase) {
    debugLog('PHASE_TRANSITIONS', '🃏 GameFlowManager: Processing automatic draw phase');

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

      // Broadcast state to guest AFTER draw completes (host only)
      // This ensures guest receives updated hands and deck states immediately
      const gameMode = this.gameStateManager.get('gameMode');
      if (gameMode === 'host' && this.actionProcessor.p2pManager) {
        debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] Automatic: draw`);
        this.actionProcessor.broadcastStateToGuest();
        debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted state after draw`);
      }

      debugLog('PHASE_TRANSITIONS', '✅ Automatic draw phase completed, transitioning to next phase');

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
      debugLog('PHASE_TRANSITIONS', '✅ Automatic draw completed, returning next phase:', nextPhase);
      return nextPhase;

    } catch (error) {
      console.error('❌ Error during automatic draw phase:', error);
    }
  }

  /**
   * Process the automatic first player determination phase
   * @param {string} previousPhase - The phase we're transitioning from
   */
  async processAutomaticFirstPlayerPhase(previousPhase) {
    debugLog('PHASE_TRANSITIONS', '🎯 GameFlowManager: Processing automatic first player determination phase');

    try {
      // Call ActionProcessor to determine first player (this also shows first announcement)
      const firstPlayerResult = await this.actionProcessor.processFirstPlayerDetermination();
      debugLog('PHASE_TRANSITIONS', '🎯 First player determination completed:', firstPlayerResult);

      // Broadcast state to guest AFTER state update, BEFORE blocking animation (host only)
      // This ensures guest receives state immediately and can start animations in sync with host
      const gameMode = this.gameStateManager.get('gameMode');
      if (gameMode === 'host' && this.actionProcessor.p2pManager) {
        debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] Automatic: firstPlayer`);
        this.actionProcessor.broadcastStateToGuest();
        debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted state after first player determination`);
      }

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
        // Use ActionProcessor to capture for guest broadcasting, mark as system animation
        // waitForCompletion = true ensures gameplay pauses during announcement
        await this.actionProcessor.executeAndCaptureAnimations([secondAnnouncementEvent], true, true);
        debugLog('PHASE_TRANSITIONS', '🎬 [FIRST PLAYER] Second announcement complete');
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
      debugLog('PHASE_TRANSITIONS', '✅ Automatic first player determination completed, returning next phase:', nextPhase);
      return nextPhase;

    } catch (error) {
      console.error('❌ Error during automatic first player determination:', error);
    }
  }

  /**
   * Process the automatic energy reset phase
   * @param {string} previousPhase - The phase we're transitioning from
   */
  async processAutomaticEnergyResetPhase(previousPhase) {
    debugLog('PHASE_TRANSITIONS', '⚡ GameFlowManager: Processing automatic energy reset phase');

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

      // Broadcast state to guest AFTER energy reset completes (host only)
      // This ensures guest receives updated energy and shields immediately
      const gameMode = this.gameStateManager.get('gameMode');
      if (gameMode === 'host' && this.actionProcessor.p2pManager) {
        debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] Automatic: energyReset`);
        this.actionProcessor.broadcastStateToGuest();
        debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted state after energy reset`);
      }

      debugLog('PHASE_TRANSITIONS', `✅ Energy reset complete - Player 1: ${updatedPlayer1.energy} energy, Player 2: ${updatedPlayer2.energy} energy`);

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
      debugLog('PHASE_TRANSITIONS', '✅ Automatic energy reset completed, returning next phase:', nextPhase);
      return nextPhase;

    } catch (error) {
      console.error('❌ Error during automatic energy reset phase:', error);
    }
  }

  /**
   * Process the game initializing phase
   * This phase ensures UI components are mounted before any round phases begin
   * @param {string} previousPhase - The phase we're transitioning from
   */
  async processGameInitializingPhase(previousPhase) {
    debugLog('PHASE_TRANSITIONS', '🎯 GameFlowManager: Processing game initializing phase');

    try {
      // Emit the phase transition event to allow App.jsx to mount
      this.emit('phaseTransition', {
        newPhase: 'gameInitializing',
        previousPhase: previousPhase,
        gameStage: this.gameStage,
        roundNumber: this.roundNumber
      });

      // Brief delay to allow App.jsx to mount and subscribe to events
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get next phase (which should be determineFirstPlayer)
      const nextPhase = this.getNextPhase('gameInitializing');
      debugLog('PHASE_TRANSITIONS', '✅ Game initialization completed, returning next phase:', nextPhase);
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
    const player1DroneLimit = player1Stats.totals.cpuLimit;

    if (player1DronesCount > player1DroneLimit) {
      return true;
    }

    // Check player2
    const player2DronesCount = Object.values(gameState.player2.dronesOnBoard || {}).flat().length;
    const player2Stats = this.gameDataService.getEffectiveShipStats(gameState.player2, gameState.opponentPlacedSections);
    const player2DroneLimit = player2Stats.totals.cpuLimit;

    debugLog('PHASE_TRANSITIONS', '🔍 Checking player2 drone limit:', {
      player2DronesCount,
      player2DroneLimit,
      exceeds: player2DronesCount > player2DroneLimit,
      opponentPlacedSections: gameState.opponentPlacedSections
    });

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
    debugLog('PHASE_TRANSITIONS', `🎯 GameFlowManager: Initiating sequential phase '${phase}' via ActionProcessor`);

    // Update current phase tracking
    const previousPhase = this.currentPhase;
    this.currentPhase = phase;

    // Update GameStateManager via ActionProcessor to avoid bypass validation
    if (this.actionProcessor && this.gameStateManager) {
      // Use ActionProcessor to safely update game state for sequential phases
      debugLog('PHASE_TRANSITIONS', `🔄 Starting ${phase} phase through ActionProcessor`);

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
        try {
          this.gameStateManager._updateContext = 'GameFlowManager';
          this.gameStateManager.setState({
            roundNumber: 1,
            turn: 1
          });
        } finally {
          this.gameStateManager._updateContext = null;
        }
      }
    }

    debugLog('PHASE_TRANSITIONS', `🔄 GameFlowManager: Transitioning from '${previousPhase}' to '${newPhase}' (${this.gameStage})`);

    // Initialize phase-specific data when transitioning to certain phases
    let phaseData = {};
    let firstPlayerResult = null;

    // Note: Drone selection initialization moved to onSimultaneousPhaseComplete
    // to ensure data is created on host and broadcast to guest

    if (newPhase === 'placement') {
      debugLog('PHASE_TRANSITIONS', '🚢 GameFlowManager: Initializing placement phase data');
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
      try {
        this.gameStateManager._updateContext = 'GameFlowManager';
        this.gameStateManager.setState({
          gameStage: this.gameStage,
          roundNumber: this.roundNumber,
          ...phaseData
        }, 'PHASE_TRANSITION', 'gameFlowManagerMetadata');
      } finally {
        this.gameStateManager._updateContext = null;
      }
    }

    // Handle automatic phases directly
    if (this.isAutomaticPhase(newPhase)) {
      debugLog('PHASE_TRANSITIONS', `🤖 GameFlowManager: Auto-processing automatic phase '${newPhase}'`);
      await this.processAutomaticPhase(newPhase, previousPhase);
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

    // Auto-complete commitments for players who don't need to act (single-player mandatory phases)
    if (this.isSimultaneousPhase(newPhase)) {
      await this.autoCompleteUnnecessaryCommitments(newPhase);
    }
  }

  /**
   * Auto-complete commitments for players who don't need to act in mandatory phases
   * @param {string} phase - The phase to check
   */
  async autoCompleteUnnecessaryCommitments(phase) {
    // Only handle mandatory simultaneous phases
    const mandatoryPhases = ['mandatoryDiscard', 'mandatoryDroneRemoval', 'allocateShields'];
    if (!mandatoryPhases.includes(phase)) {
      return;
    }

    const gameState = this.gameStateManager.getState();
    const isSinglePlayer = gameState.gameMode === 'local';
    const localPlayerId = this.gameStateManager.getLocalPlayerId();

    // Check which players need to act
    let player1NeedsToAct = false;
    let player2NeedsToAct = false;

    if (phase === 'mandatoryDiscard') {
      const player1HandCount = gameState.player1.hand?.length || 0;
      const player1Stats = this.gameDataService.getEffectiveShipStats(gameState.player1, gameState.placedSections);
      player1NeedsToAct = player1HandCount > player1Stats.totals.handLimit;

      const player2HandCount = gameState.player2.hand?.length || 0;
      const player2Stats = this.gameDataService.getEffectiveShipStats(gameState.player2, gameState.opponentPlacedSections);
      player2NeedsToAct = player2HandCount > player2Stats.totals.handLimit;
    } else if (phase === 'mandatoryDroneRemoval') {
      const player1DronesCount = Object.values(gameState.player1.dronesOnBoard || {}).flat().length;
      const player1Stats = this.gameDataService.getEffectiveShipStats(gameState.player1, gameState.placedSections);
      player1NeedsToAct = player1DronesCount > player1Stats.totals.cpuLimit;

      const player2DronesCount = Object.values(gameState.player2.dronesOnBoard || {}).flat().length;
      const player2Stats = this.gameDataService.getEffectiveShipStats(gameState.player2, gameState.opponentPlacedSections);
      player2NeedsToAct = player2DronesCount > player2Stats.totals.cpuLimit;
    } else if (phase === 'allocateShields') {
      player1NeedsToAct = (gameState.shieldsToAllocate || 0) > 0;
      player2NeedsToAct = (gameState.opponentShieldsToAllocate || 0) > 0;
    }

    debugLog('COMMITMENTS', `🔍 Auto-completion check for ${phase}:`, {
      player1NeedsToAct,
      player2NeedsToAct,
      isSinglePlayer,
      localPlayerId
    });

    // Auto-commit for players who don't need to act
    // In multiplayer: Only auto-commit for local player
    // In single-player: Auto-commit for both players (including AI)

    if (!player1NeedsToAct) {
      if (isSinglePlayer || localPlayerId === 'player1') {
        debugLog('COMMITMENTS', `✅ Player1 doesn't need to act in ${phase}, auto-committing`);
        await this.actionProcessor.processCommitment({
          playerId: 'player1',
          phase: phase,
          actionData: { autoCompleted: true }
        });
      }
    }

    if (!player2NeedsToAct) {
      if (isSinglePlayer || localPlayerId === 'player2') {
        debugLog('COMMITMENTS', `✅ Player2 doesn't need to act in ${phase}, auto-committing`);
        await this.actionProcessor.processCommitment({
          playerId: 'player2',
          phase: phase,
          actionData: { autoCompleted: true }
        });
      }
    }

    // If AI needs to act but human doesn't, trigger AI (single-player only)
    if (isSinglePlayer && player2NeedsToAct && !player1NeedsToAct) {
      debugLog('COMMITMENTS', `🤖 Triggering AI commitment for ${phase}`);
      await this.actionProcessor.handleAICommitment(phase, gameState);
    }
  }

  /**
   * Start a new round (loop back to beginning of round phases)
   */
  async startNewRound() {
    // Capture first passer from the round that just ended BEFORE incrementing round number
    const currentGameState = this.gameStateManager.getState();
    const firstPasserFromPreviousRound = currentGameState.passInfo?.firstPasser || null;

    this.roundNumber++;
    debugLog('PHASE_TRANSITIONS', `🔄 GameFlowManager: Starting round ${this.roundNumber}`, {
      firstPasserFromPreviousRound
    });

    // Update gameState with new round number and first passer from previous round
    try {
      this.gameStateManager._updateContext = 'GameFlowManager';
      this.gameStateManager.setState({
        roundNumber: this.roundNumber,
        turn: this.roundNumber,
        firstPasserOfPreviousRound: firstPasserFromPreviousRound
      }, 'ROUND_START', 'gameFlowManagerMetadata');
    } finally {
      this.gameStateManager._updateContext = null;
    }

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
    debugLog('PHASE_TRANSITIONS', `🏆 GameFlowManager: Game ended, winner: ${winnerId}`);

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
      try {
        this.gameStateManager._updateContext = 'GameFlowManager';
        this.gameStateManager.setState({
          gameStage: 'gameOver',
          winner: winnerId
        }, 'GAME_ENDED', 'gameEndMetadata');
      } finally {
        this.gameStateManager._updateContext = null;
      }
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
    debugLog('PHASE_TRANSITIONS', '🔄 GameFlowManager: Resetting game flow');

    this.currentPhase = 'preGame';
    this.gameStage = 'preGame';
    this.roundNumber = 0;
    this.isProcessingAutomaticPhase = false;

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

  /**
   * Extract drone objects from a drone name list (from deck)
   * @param {Array} droneNames - Array of drone names from deck
   * @returns {Array} Array of drone objects from collection
   */
  extractDronesFromDeck(droneNames) {
    if (!droneNames || !Array.isArray(droneNames)) {
      console.warn('⚠️ Invalid drone names provided to extractDronesFromDeck');
      return [];
    }

    const drones = droneNames.map(name => {
      const drone = fullDroneCollection.find(d => d.name === name);
      if (!drone) {
        console.warn(`⚠️ Drone "${name}" not found in collection`);
      }
      return drone;
    }).filter(Boolean); // Remove any undefined entries

    debugLog('PHASE_TRANSITIONS', `📦 Extracted ${drones.length} drones from deck: ${drones.map(d => d.name).join(', ')}`);
    return drones;
  }
}

// Create singleton instance
const gameFlowManager = new GameFlowManager();

export default gameFlowManager;