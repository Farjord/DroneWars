// ========================================
// GAME FLOW MANAGER
// ========================================
// Master game flow controller - owns canonical phase state and transitions
// Handles conditional phase logic and round loop management

import { initializeDroneSelection } from '../utils/droneSelectionUtils.js';
import { SeededRandom } from '../utils/seededRandom.js';
import { initializeShipPlacement } from '../utils/shipPlacementUtils.js';
import fullDroneCollection from '../data/droneData.js';
import GameDataService from '../services/GameDataService.js';
import { gameEngine } from '../logic/gameLogic.js';
import PhaseManager from './PhaseManager.js';
import tacticalMapStateManager from './TacticalMapStateManager.js';
import { debugLog, timingLog, getTimestamp } from '../utils/debugLogger.js';
import PhaseRequirementChecker from '../logic/phase/PhaseRequirementChecker.js';
import RoundInitializationProcessor from './RoundInitializationProcessor.js';

/**
 * GameFlowManager - Central authority for game phase flow and transitions
 */
class GameFlowManager {
  constructor(phaseAnimationQueue = null) {
    if (GameFlowManager.instance) {
      return GameFlowManager.instance;
    }
    GameFlowManager.instance = this;

    // Game flow phase definitions
    this.PRE_GAME_PHASES = ['deckSelection', 'droneSelection', 'placement', 'roundInitialization'];
    this.ROUND_PHASES = ['mandatoryDiscard', 'optionalDiscard', 'roundInitialization', 'allocateShields', 'mandatoryDroneRemoval', 'deployment', 'action'];

    // Phase type classification
    this.SIMULTANEOUS_PHASES = ['droneSelection', 'deckSelection', 'placement', 'mandatoryDiscard', 'optionalDiscard', 'allocateShields', 'mandatoryDroneRemoval'];
    this.SEQUENTIAL_PHASES = ['deployment', 'action'];
    this.AUTOMATIC_PHASES = ['roundInitialization']; // Automatic phase handled directly by GameFlowManager

    // Current game state
    this.currentPhase = 'preGame';
    this.gameStage = 'preGame'; // 'preGame', 'roundLoop', 'gameOver'
    this.roundNumber = 0;
    this.isProcessingAutomaticPhase = false; // Flag to track automatic phase processing
    this.isInCheckpointCascade = false; // Flag to prevent recursive auto-processing during optimistic cascade
    this._quickDeployExecutedThisRound = false; // Flag to track quick deploy execution (prevents race condition)

    // Event listeners
    this.listeners = [];

    // External system references (injected)
    this.gameStateManager = null;
    this.actionProcessor = null;
    this.actionProcessorUnsubscribe = null; // Store unsubscribe function to prevent duplicate subscriptions
    this.phaseAnimationQueue = phaseAnimationQueue; // For non-blocking phase announcements
    this.isMultiplayer = false;
    this.gameDataService = null;
    this.phaseManager = null; // Phase Manager instance (initialized later)

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

    // Initialize PhaseManager for authoritative phase transitions
    const gameMode = gameStateManager.get('gameMode') || 'local';
    this.phaseManager = new PhaseManager(gameStateManager, gameMode);
    debugLog('PHASE_TRANSITIONS', `✅ PhaseManager initialized in GameFlowManager (mode: ${gameMode})`);

    // Inject PhaseManager into ActionProcessor
    if (actionProcessor && this.phaseManager) {
      actionProcessor.setPhaseManager(this.phaseManager);
    }

    // Initialize GameDataService and PhaseRequirementChecker for phase requirement checks
    if (!this.gameDataService) {
      this.gameDataService = GameDataService.getInstance(gameStateManager);
    }
    if (!this.phaseRequirementChecker) {
      this.phaseRequirementChecker = new PhaseRequirementChecker(this.gameDataService);
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
          gameStateManager,
          { isAnimationBlocking: () => actionProcessor?.phaseAnimationQueue?.isPlaying() || actionProcessor?.animationManager?.isBlocking }
        );
        debugLog('PHASE_TRANSITIONS', '🔄 GameFlowManager re-initialized AIPhaseProcessor with dependencies');
      }
    }

    // Subscribe to completion events from other managers
    this.setupEventListeners();

    // Subscribe to ActionProcessor events for turn transitions
    this.resubscribe();

    this.isInitialized = true;
    debugLog('PHASE_TRANSITIONS', '🔧 GameFlowManager initialized with external systems');
  }

  /**
   * Set up event listeners for manager completion events
   */
  setupEventListeners() {
    // Track previous passInfo for guest opponent pass detection
    let previousPassInfo = null;

    // Subscribe to GameStateManager for simultaneous phase completion detection
    if (this.gameStateManager) {
      this.gameStateManager.subscribe((event) => {
        const { state, type: eventType } = event;

        // Guest mode: Only trigger checkpoint detection when receiving Host broadcast
        // Guest waits for Host's authoritative state (including roundNumber) before starting cascade
        // GuestMessageQueueService explicitly calls checkSimultaneousPhaseCompletion after applying Host state
        if (state.gameMode !== 'guest') {
          this.checkSimultaneousPhaseCompletion(state, eventType);
        }

        // Guest-specific: Monitor state changes for opponent pass detection
        // When host passes, guest receives state update (not action execution)
        // so we need to detect pass from passInfo changes
        if (state.gameMode === 'guest' && state.passInfo) {
          const localPlayerId = this.gameStateManager.getLocalPlayerId();
          const opponentId = localPlayerId === 'player1' ? 'player2' : 'player1';
          const opponentPassKey = `${opponentId}Passed`;

          // Detect when opponent's pass flag changes from false to true
          const opponentPassedNow = state.passInfo[opponentPassKey];
          const opponentPassedBefore = previousPassInfo?.[opponentPassKey];

          if (opponentPassedNow && !opponentPassedBefore) {
            debugLog('PASS_LOGIC', '🔔 [GUEST] Detected opponent pass from state change', {
              opponentId,
              passInfo: state.passInfo,
              previousPassInfo
            });

            // Queue opponent pass notification
            if (this.phaseAnimationQueue) {
              this.phaseAnimationQueue.queueAnimation('playerPass', 'OPPONENT PASSED', null, 'GFM:opponent_detected:164');

              debugLog('PASS_LOGIC', '📋 [GUEST] Queued OPPONENT PASSED animation from state detection');

              // Trigger playback if not already playing
              if (!this.phaseAnimationQueue.isPlaying()) {
                this.phaseAnimationQueue.startPlayback('GFM:opponent_detected:170');
                debugLog('PASS_LOGIC', '🎬 [GUEST] Started playback for OPPONENT PASSED');
              }
            }
          }

          // Update previous passInfo for next comparison
          previousPassInfo = { ...state.passInfo };
        }
      });
    }

    // Note: ActionProcessor subscription is NOT set up here.
    // It is set up lazily via resubscribe() called from GameStateManager.startGame()
    // This ensures cleanup operations (like MenuScreen) don't break turn transitions.
    // See: GameFlowManager.subscription.test.js for architectural documentation.

    // Note: Direct state monitoring replaces both SequentialPhaseManager and SimultaneousActionManager event subscriptions
    // GameFlowManager now directly detects when both sequential and simultaneous phases should complete
    // ActionProcessor events handle turn transitions after individual actions
  }

  /**
   * Re-establish ActionProcessor event subscription
   * Call this after actionProcessor.clearQueue() which wipes out listeners
   */
  resubscribe() {
    // Unsubscribe existing listener first to prevent duplicate subscriptions
    // This fixes turn transitions flipping back in VS/Multiplayer mode
    if (this.actionProcessorUnsubscribe) {
      this.actionProcessorUnsubscribe();
      this.actionProcessorUnsubscribe = null;
    }

    if (this.actionProcessor) {
      this.actionProcessorUnsubscribe = this.actionProcessor.subscribe((event) => {
        if (event.type === 'action_completed') {
          debugLog('PASS_LOGIC', `📥 [GAME FLOW] Received action_completed event (resubscribed)`, {
            actionType: event.actionType,
            gameMode: this.gameStateManager?.getState()?.gameMode
          });
          if (event.actionType === 'snaredConsumption' || event.actionType === 'suppressedConsumption') {
            debugLog('CONSUMPTION_DEBUG', '🟢 [4] GameFlowManager: Received action_completed', { actionType: event.actionType, shouldEndTurn: event.result?.shouldEndTurn });
          }
          this.handleActionCompletion(event).catch(err => {
            debugLog('CONSUMPTION_DEBUG', '🔴 handleActionCompletion FAILED', { error: err.message, stack: err.stack });
          });
        }
      });
      debugLog('PHASE_TRANSITIONS', '🔄 GameFlowManager re-subscribed to ActionProcessor');
    }
  }

  /**
   * Handle action completion events from ActionProcessor
   * Processes turn transitions based on shouldEndTurn flag
   * @param {Object} event - Action completion event
   */
  async handleActionCompletion(event) {
    const { actionType, result } = event;

    // Log entry for debugging
    const currentState = this.gameStateManager.getState();
    debugLog('PASS_LOGIC', `🎯 [${currentState.gameMode.toUpperCase()}] handleActionCompletion called`, {
      actionType,
      gameMode: currentState.gameMode,
      turnPhase: currentState.turnPhase
    });

    debugLog('TURN_TRANSITION_DEBUG', 'handleActionCompletion entry', {
      actionType,
      shouldEndTurn: result?.shouldEndTurn,
      gameMode: currentState.gameMode,
      turnPhase: currentState.turnPhase,
      currentPlayer: currentState.currentPlayer
    });

    // CRITICAL: Handle pass playback BEFORE guest guard
    // Guest needs to trigger "YOU PASSED" animation when they pass locally
    if (actionType === 'playerPass') {
      debugLog('PASS_LOGIC', `✅ [${currentState.gameMode.toUpperCase()}] Reached pass handling logic`, {
        actionType,
        gameMode: currentState.gameMode
      });

      const updatedState = this.gameStateManager.getState();
      const bothPassed = updatedState.passInfo?.player1Passed && updatedState.passInfo?.player2Passed;

      debugLog('PASS_LOGIC', `🔍 Both-passed check after ${actionType}:`, {
        player1Passed: updatedState.passInfo?.player1Passed,
        player2Passed: updatedState.passInfo?.player2Passed,
        bothPassed,
        currentPhase: updatedState.turnPhase
      });

      // For guest mode: Only handle pass animation playback, not phase transitions
      if (currentState.gameMode === 'guest') {
        // ALWAYS trigger playback if animation is queued, regardless of bothPassed
        // This fixes race condition where guest's optimistic pass processing sets bothPassed=true
        // before handleActionCompletion executes, causing animation to be skipped
        debugLog('PASS_LOGIC', `⏰ [GUEST] Checking for queued pass animations`, {
          currentPhase: updatedState.turnPhase,
          bothPassed,
          queueLength: this.phaseAnimationQueue?.getQueueLength() || 0,
          alreadyPlaying: this.phaseAnimationQueue?.isPlaying() || false
        });

        if (this.phaseAnimationQueue) {
          const queueLength = this.phaseAnimationQueue.getQueueLength();
          if (queueLength > 0 && !this.phaseAnimationQueue.isPlaying()) {
            debugLog('PASS_LOGIC', `🎬 [GUEST] Starting pass notification playback`, {
              queuedAnimations: queueLength,
              bothPassed,
              explanation: bothPassed
                ? 'Starting playback despite bothPassed=true (optimistic processing race condition fixed)'
                : 'Starting playback for single player pass'
            });
            this.phaseAnimationQueue.startPlayback('GFM:guest_pass:256');
          } else {
            debugLog('PASS_LOGIC', `ℹ️ [GUEST] No playback needed`, {
              queueLength,
              alreadyPlaying: this.phaseAnimationQueue.isPlaying()
            });
          }
        }

        // PHASE MANAGER INTEGRATION: Guest now waits for Host's PhaseManager broadcast
        // Guest shows immediate UI feedback (animations) but doesn't transition phases
        debugLog('PHASE_TRANSITIONS', `✅ [GUEST] Pass processed, waiting for Host's PhaseManager broadcast`);
        return;
      }

      // Host and Local modes: Handle both phase transitions and playback
      // Guest mode was already filtered out above (line 235)
      if (bothPassed) {
        debugLog('PHASE_TRANSITIONS', `✅ [${currentState.gameMode.toUpperCase()}] Both players passed, triggering phase transition synchronously`);

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
          this.actionProcessor.broadcastStateToGuest('phase_transition_both_passed');
          debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted state after phase transition`);
        }
        return;
      } else {
        // Single player passed - start PhaseAnimationQueue playback for pass notification
        // (Pass notification was queued by ActionProcessor.processPlayerPass)
        // This handles both Host and Local modes
        if (this.phaseAnimationQueue) {
          const queueLength = this.phaseAnimationQueue.getQueueLength();
          if (queueLength > 0 && !this.phaseAnimationQueue.isPlaying()) {
            debugLog('TIMING', `🎬 [${currentState.gameMode.toUpperCase()}] Starting pass notification playback`, {
              queuedAnimations: queueLength
            });
            this.phaseAnimationQueue.startPlayback('GFM:host_pass:302');
          }
        }
      }
    }

    // Guard: Guest mode doesn't handle turn transitions (host sends them)
    // This guard is AFTER pass playback handling so guests can trigger their own animations
    // Only apply in actual P2P networked mode (when p2pManager exists)
    if (currentState.gameMode === 'guest' && this.actionProcessor?.p2pManager) {
      debugLog('PASS_LOGIC', `🚫 [GUEST] Early return - guest mode blocks turn transitions (P2P)`, {
        actionType
      });
      return;
    }

    // Only process for sequential phases
    const sequentialPhases = ['deployment', 'action'];
    if (actionType === 'snaredConsumption' || actionType === 'suppressedConsumption') {
      debugLog('CONSUMPTION_DEBUG', '🟢 [5] GameFlowManager: Phase guard check', { turnPhase: currentState.turnPhase, willPass: sequentialPhases.includes(currentState.turnPhase) });
    }
    if (!sequentialPhases.includes(currentState.turnPhase)) {
      return;
    }

    debugLog('PHASE_TRANSITIONS', `🎯 GameFlowManager: Action completed - ${actionType}`, {
      shouldEndTurn: result?.shouldEndTurn,
      currentPlayer: currentState.currentPlayer
    });

    // Check if action should end turn
    if (actionType === 'snaredConsumption' || actionType === 'suppressedConsumption') {
      debugLog('CONSUMPTION_DEBUG', '🟢 [6] GameFlowManager: shouldEndTurn check', { shouldEndTurn: result?.shouldEndTurn, currentPlayer: currentState.currentPlayer });
    }
    if (result && result.shouldEndTurn) {
      const updatedState = this.gameStateManager.getState();
      const nextPlayer = updatedState.currentPlayer === 'player1' ? 'player2' : 'player1';

      debugLog('CONSUMPTION_DEBUG', '🟢 [7] GameFlowManager: Calling processTurnTransition', { nextPlayer });
      debugLog('PHASE_TRANSITIONS', `🔄 GameFlowManager: Processing turn transition to ${nextPlayer}`);

      // Process turn transition via ActionProcessor
      await this.actionProcessor.processTurnTransition({
        newPlayer: nextPlayer
      });

      const stateAfterTransition = this.gameStateManager.getState();
      debugLog('TURN_TRANSITION_DEBUG', 'After processTurnTransition', {
        previousPlayer: updatedState.currentPlayer,
        newPlayer: stateAfterTransition.currentPlayer,
        turnPhase: stateAfterTransition.turnPhase
      });

      debugLog('PHASE_TRANSITIONS', `✅ GameFlowManager: Turn transition completed`);

      // Broadcast state to guest AFTER turn transition completes (host only)
      // This ensures guest receives complete state including new currentPlayer
      if (currentState.gameMode === 'host' && this.actionProcessor.p2pManager) {
        debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] Turn transition → ${nextPlayer}`);
        this.actionProcessor.broadcastStateToGuest('turn_transition');
        debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted state after turn transition`);
      }
    } else {
      debugLog('PHASE_TRANSITIONS', `⏭️ GameFlowManager: Action has goAgain, keeping same player`);

      // Broadcast even for goAgain actions (action completed, just same player's turn)
      if (currentState.gameMode === 'host' && this.actionProcessor.p2pManager) {
        debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] GoAgain action → same player`);
        this.actionProcessor.broadcastStateToGuest('go_again_action');
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
        debugLog('PHASE_TRANSITIONS', 'Listener error:', error);
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
      roundNumber: this.gameStateManager.get('roundNumber'),
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
    const gameMode = this.gameStateManager.get('gameMode');

    // PHASE MANAGER INTEGRATION: Guest guard - Guest cannot trigger phase completion
    // Guest waits for PhaseManager broadcasts from Host
    if (gameMode === 'guest') {
      debugLog('PHASE_TRANSITIONS', `🚫 Guest attempted to complete simultaneous phase ${phase} - BLOCKED`);
      debugLog('PHASE_TRANSITIONS', `✅ Guest will wait for Host's PhaseManager broadcast instead`);
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
          const gameState = this.gameStateManager.getState();

          // Initialize for player1
          if (deckCommitments.player1?.drones) {
            const player1Drones = this.extractDronesFromDeck(deckCommitments.player1.drones);
            const player1Rng = SeededRandom.forDroneSelection(gameState, 'player1');
            const player1DroneData = initializeDroneSelection(player1Drones, 2, player1Rng);
            stateUpdates.player1DroneSelectionTrio = player1DroneData.droneSelectionTrio;
            stateUpdates.player1DroneSelectionPool = player1DroneData.droneSelectionPool;
            debugLog('PHASE_TRANSITIONS', `🎲 Player1 deck has ${player1Drones.length} drones for selection`);
            debugLog('DRONE_SELECTION', 'Created player1DroneSelectionTrio:',
              player1DroneData.droneSelectionTrio.map(d => d.name));
          } else {
            debugLog('DRONE_SELECTION', 'No drones found in player1 deck commitment');
          }

          // Initialize for player2
          if (deckCommitments.player2?.drones) {
            const player2Drones = this.extractDronesFromDeck(deckCommitments.player2.drones);
            const player2Rng = SeededRandom.forDroneSelection(gameState, 'player2');
            const player2DroneData = initializeDroneSelection(player2Drones, 2, player2Rng);
            stateUpdates.player2DroneSelectionTrio = player2DroneData.droneSelectionTrio;
            stateUpdates.player2DroneSelectionPool = player2DroneData.droneSelectionPool;
            debugLog('PHASE_TRANSITIONS', `🎲 Player2 deck has ${player2Drones.length} drones for selection`);
            debugLog('DRONE_SELECTION', 'Created player2DroneSelectionTrio:',
              player2DroneData.droneSelectionTrio.map(d => d.name));
          } else {
            debugLog('DRONE_SELECTION', 'No drones found in player2 deck commitment');
          }

          debugLog('DRONE_SELECTION', 'stateUpdates keys:', Object.keys(stateUpdates));
        } else {
          debugLog('DRONE_SELECTION', 'No deck commitments found - cannot initialize drone selection');
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

    // CRITICAL BROADCAST: For placement phase, broadcast immediately after commitment application
    // This allows guest to receive "both complete" signal and start optimistic cascade
    // BEFORE host enters blocking automatic phase processing
    if (phase === 'placement' && gameMode === 'host' && this.actionProcessor.p2pManager) {
      debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] Placement commitments applied - immediate broadcast to guest`);
      this.actionProcessor.broadcastStateToGuest();
      debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted placement completion state before automatic cascade`);
    }

    // Queue ROUND announcement if transitioning from placement to first round phase (Round 1)
    // This ensures ROUND shows immediately before round phases begin
    if (phase === 'placement') {
      const nextPhase = this.getNextPhase(phase);
      // Check if next phase is any round phase (entering round loop)
      if (nextPhase && this.ROUND_PHASES.includes(nextPhase)) {
        debugLog('PHASE_TRANSITIONS', `🎯 Queueing ROUND announcement before transitioning to first round phase: ${nextPhase}`);

        await this.actionProcessor.processPhaseTransition({
          newPhase: 'roundAnnouncement',
          resetPassInfo: false,
          guestAnnouncementOnly: gameMode === 'guest'
        });

        debugLog('PHASE_TRANSITIONS', `✅ ROUND announcement queued before first round phase: ${nextPhase}`);
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

        // Start animation playback for host after transitioning to sequential phase
        // This ensures queued phase announcements (like DEPLOYMENT) play for the host
        // (Guest gets playback via cascade finally block, but host needs it here)
        if (this.phaseAnimationQueue) {
          const queueLength = this.phaseAnimationQueue.getQueueLength();
          if (queueLength > 0 && !this.phaseAnimationQueue.isPlaying()) {
            debugLog('TIMING', `🎬 [HOST] Starting animation playback after simultaneous→sequential transition`, {
              queuedAnimations: queueLength,
              phase: nextPhase,
              gameMode
            });
            this.phaseAnimationQueue.startPlayback('GFM:sim_to_seq:599');
          }
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

        // Start animation playback after transitioning to another simultaneous phase
        // This ensures queued phase announcements play before players can interact
        if (this.phaseAnimationQueue) {
          const queueLength = this.phaseAnimationQueue.getQueueLength();
          if (queueLength > 0 && !this.phaseAnimationQueue.isPlaying()) {
            debugLog('TIMING', `🎬 [${gameMode.toUpperCase()}] Starting animation playback after simultaneous→simultaneous transition`, {
              queuedAnimations: queueLength,
              phase: nextPhase,
              gameMode
            });
            this.phaseAnimationQueue.startPlayback('GFM:sim_to_sim:625');
          }
        }
      }
      // Note: Commitment cleanup handled by ActionProcessor.processPhaseTransition()
    } else {
      debugLog('PHASE_TRANSITIONS', '🎯 GameFlowManager: Game flow completed or needs special handling');
      // Note: Commitment cleanup handled by ActionProcessor.processPhaseTransition()
    }
  }

  /**
   * Check for simultaneous phase completion via commitment state monitoring
   * @param {Object} state - Current game state
   * @param {string} eventType - Type of state change event
   */
  checkSimultaneousPhaseCompletion(state, eventType) {
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

    // PHASE MANAGER INTEGRATION: Guest guard - Guest cannot trigger phase completion
    // Guest waits for PhaseManager broadcasts from Host
    const gameMode = this.gameStateManager.get('gameMode');
    if (gameMode === 'guest') {
      debugLog('PHASE_TRANSITIONS', `🚫 Guest attempted to complete sequential phase ${phase} - BLOCKED`);
      return;
    }

    // GameFlowManager orchestrates ALL phase transitions
    // Determine next phase based on current game stage
    const nextPhase = this.getNextPhase(phase);

    if (nextPhase) {
      // Queue DEPLOYMENT COMPLETE announcement when transitioning from deployment to action
      if (phase === 'deployment' && nextPhase === 'action') {
        await this.actionProcessor.processPhaseTransition({
          newPhase: 'deploymentComplete',
          resetPassInfo: false,
          guestAnnouncementOnly: true  // Always pseudo-phase (announcement-only)
        });
      }

      await this.transitionToPhase(nextPhase);
    } else {
      // End of action phase - start new round
      if (phase === 'action') {
        // Queue ACTION PHASE COMPLETE announcement before starting new round
        await this.actionProcessor.processPhaseTransition({
          newPhase: 'actionComplete',
          resetPassInfo: false,
          guestAnnouncementOnly: true  // Always pseudo-phase (announcement-only)
        });

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
   * Get next milestone phase for guest validation
   * Determines which milestone phase guest should expect from host
   * @param {string} currentPhase - Current phase guest is in
   * @returns {string} Next milestone phase to validate against
   */
  getNextMilestonePhase(currentPhase) {
    // Get all phases for current game stage
    const phases = this.gameStage === 'roundLoop' ? this.ROUND_PHASES : this.PRE_GAME_PHASES;

    // Find current phase index
    const currentIndex = phases.indexOf(currentPhase);

    // Search forward for next milestone phase
    for (let i = currentIndex + 1; i < phases.length; i++) {
      if (this.gameStateManager.isMilestonePhase(phases[i])) {
        return phases[i];
      }
    }

    // Fallback to deployment (most common milestone)
    return 'deployment';
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

    try {
      // Process phase logic without transitioning (using new separated method)
      const nextPhase = await this.processPhaseLogicOnly(phase, previousPhase);

      // Handle phase transition while still in automatic processing mode
      // Note: Each phase handler broadcasts at optimal timing (after state update, before blocking animations)
      if (nextPhase) {
        debugLog('PHASE_TRANSITIONS', `🔄 GameFlowManager: Transitioning from automatic phase '${phase}' to '${nextPhase}'`);
        await this.transitionToPhase(nextPhase);
      } else {
        debugLog('PHASE_TRANSITIONS', `No next phase found after automatic phase: ${phase}`);
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

          debugLog('GUEST_CASCADE', `🎬 [ANIMATION SOURCE] Phase "${phase}" generated animations (OPTIMISTIC_CASCADE)`, {
            actionCount: animations.actionAnimations.length,
            systemCount: animations.systemAnimations.length,
            actionTypes: animations.actionAnimations.map(a => a.animationName),
            systemTypes: animations.systemAnimations.map(a => a.animationName)
          });
          this.gameStateManager.trackOptimisticAnimations(animations);
        }
      }

      // HOST/LOCAL: Start animation playback after automatic cascade completes
      // Only start if we're NOT in guest mode, NOT in cascade mode, and landed on non-automatic phase
      const currentState = this.gameStateManager.getState();
      const isGuest = currentState.gameMode === 'guest';
      const inCascade = this.isInCheckpointCascade;
      const currentPhase = currentState.turnPhase;

      if (!isGuest && !inCascade && !this.isAutomaticPhase(currentPhase) && this.phaseAnimationQueue) {
        // We've finished automatic cascade and landed on non-automatic phase - start playback
        const queueLength = this.phaseAnimationQueue.getQueueLength();
        if (queueLength > 0) {
          debugLog('TIMING', `🎬 [HOST/LOCAL] Starting animation playback after automatic cascade`, {
            queuedAnimations: queueLength,
            finalPhase: currentPhase,
            gameMode: currentState.gameMode
          });
          this.phaseAnimationQueue.startPlayback('GFM:auto_cascade:880');
        }
      }
    }
  }

  /**
   * Process automatic phase logic ONLY (no transition)
   * Used by guest optimistic cascade for explicit transition control
   * Separates phase processing from phase transitioning (Hearthstone-style architecture)
   * @param {string} phase - Phase to process
   * @param {string} previousPhase - Previous phase
   * @returns {Promise<string|null>} Next phase name (without transitioning to it)
   */
  async processPhaseLogicOnly(phase, previousPhase) {
    const gameMode = this.gameStateManager.get('gameMode');
    const phaseStartTime = timingLog('[AUTO PHASE] Processing started', {
      phase,
      previousPhase,
      gameMode
    });

    debugLog('PHASE_TRANSITIONS', `🔧 [PHASE LOGIC START] ${phase}`);

    let nextPhase = null;

    // Route to appropriate phase handler
    if (phase === 'roundInitialization') {
      debugLog('PHASE_TRANSITIONS', `   ↳ Calling processRoundInitialization()`);
      nextPhase = await this.processRoundInitialization(previousPhase);
    } else {
      debugLog('PHASE_TRANSITIONS', `No handler for automatic phase: ${phase}`);
    }

    debugLog('PHASE_TRANSITIONS', `🔧 [PHASE LOGIC END] ${phase} → returns next: ${nextPhase || 'null'}`);

    timingLog('[AUTO PHASE] Processing complete', {
      phase,
      nextPhase
    }, phaseStartTime);

    return nextPhase;
  }

  /**
   * Process automatic phases until reaching a checkpoint (Guest optimistic processing)
   * Used after placement completes to process: roundInitialization → first required round phase
   * Stops at first milestone phase (checkpoint) for validation with host
   *
   * @param {string} startPhase - Phase to start processing from (typically 'roundInitialization')
   */
  async processAutomaticPhasesUntilCheckpoint(startPhase) {
    debugLog('GUEST_CASCADE', `🚀 [GUEST OPTIMISTIC] Starting automatic processing from: ${startPhase}`);

    // Set flag to prevent recursive auto-processing during this cascade
    this.isInCheckpointCascade = true;

    try {
      // Transition TO start phase first (queues phase announcement if exists)
      // This ensures the first automatic phase announcement is shown to the guest
      // Example: optionalDiscard completes → startPhase='draw' → queues DRAW announcement
      await this.transitionToPhase(startPhase);

      let currentPhase = startPhase;
      const phasesProcessed = [];

      while (true) {
        // Process current phase logic and get next phase
        const nextPhase = await this.processPhaseLogicOnly(currentPhase, null);
        phasesProcessed.push(currentPhase);

        debugLog('GUEST_CASCADE', `🔄 [GUEST OPTIMISTIC] Processed ${currentPhase}, next: ${nextPhase || 'none'}`);

        // No next phase - end of sequence
        if (!nextPhase) {
          debugLog('GUEST_CASCADE', `🏁 [GUEST OPTIMISTIC] Complete - no more phases. Processed: ${phasesProcessed.join(' → ')}`);
          break;
        }

        // Next phase is a checkpoint - transition to it and stop
        if (this.gameStateManager.isMilestonePhase(nextPhase)) {
          await this.transitionToPhase(nextPhase);
          phasesProcessed.push(nextPhase);
          debugLog('GUEST_CASCADE', `🎯 [GUEST OPTIMISTIC] Reached checkpoint: ${nextPhase}. Processed: ${phasesProcessed.join(' → ')}`);
          break;
        }

        // Continue to next automatic phase
        await this.transitionToPhase(nextPhase);
        currentPhase = nextPhase;
      }

      debugLog('GUEST_CASCADE', `✅ [GUEST OPTIMISTIC] Processing complete. Total phases: ${phasesProcessed.length}`);
    } finally {
      // Always clear the flag when cascade processing completes
      this.isInCheckpointCascade = false;

      // Start animation playback for guest after optimistic processing completes
      // Guest has queued all phase announcements (DETERMINING FIRST PLAYER, ENERGY RESET, etc.)
      // and is now waiting at checkpoint - start playback so user sees announcements
      if (this.phaseAnimationQueue) {
        const queueLength = this.phaseAnimationQueue.getQueueLength();
        if (queueLength > 0 && !this.phaseAnimationQueue.isPlaying()) {
          debugLog('TIMING', `🎬 [GUEST] Starting animation playback after optimistic cascade`, {
            queuedAnimations: queueLength,
            note: 'Guest will see all phase announcements while waiting at checkpoint'
          });
          this.phaseAnimationQueue.startPlayback('GFM:guest_cascade:987');
        }
      }
    }
  }

  /**
   * Process the roundInitialization phase
   * Combines: gameInitializing → determineFirstPlayer → energyReset → draw
   * This atomic phase handles all round setup in one transition
   * @param {string} previousPhase - The phase we're transitioning from (should be 'placement')
   */
  async processRoundInitialization(previousPhase) {
    debugLog('PHASE_TRANSITIONS', '🎯 GameFlowManager: Processing roundInitialization phase (atomic round setup)');

    try {
      const gameMode = this.gameStateManager.get('gameMode');

      // Delegate Steps 1-5 to RoundInitializationProcessor
      const processor = new RoundInitializationProcessor(this.gameStateManager, this.actionProcessor);
      const result = await processor.process({
        isRoundLoop: this.gameStage === 'roundLoop',
        executeQuickDeploy: (quickDeploy) => this.executeQuickDeploy(quickDeploy)
      });

      // Apply flow-control state from processor result
      if (result.gameStageTransitioned) {
        this.gameStage = 'roundLoop';
      }
      if (result.quickDeployExecuted) {
        this._quickDeployExecutedThisRound = true;
      }

      const currentRoundNumber = this.gameStateManager.get('roundNumber');

      // Emit single phaseTransition event for roundInitialization
      this.emit('phaseTransition', {
        newPhase: 'roundInitialization',
        previousPhase: previousPhase,
        gameStage: this.gameStage,
        roundNumber: currentRoundNumber,
        automaticProcessed: true
      });

      // Broadcast state to guest ONCE after all updates complete (host only)
      if (gameMode === 'host' && this.actionProcessor.p2pManager) {
        debugLog('PHASE_TRANSITIONS', `📡 Broadcasting state after roundInitialization`);
        this.actionProcessor.broadcastStateToGuest();
      }

      // Return next phase
      const nextPhase = this.getNextPhase('roundInitialization');
      debugLog('PHASE_TRANSITIONS', `✅ roundInitialization complete, next phase: ${nextPhase}`);
      return nextPhase;

    } catch (error) {
      debugLog('PHASE_TRANSITIONS', 'Error during roundInitialization phase:', error);
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

    // roundInitialization complete, transition to round loop
    if (currentPhase === 'roundInitialization') {
      // After roundInitialization, find first required round phase
      // Start with mandatoryDiscard (first phase in ROUND_PHASES)
      return this.getNextRequiredPhase('roundInitialization');
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
   * Get next required phase in round (skips conditional phases that aren't needed)
   * Used by guest optimistic cascade for conditional phase handling
   * @param {string} currentPhase - Current round phase
   * @returns {string|null} Next required phase or null if no more phases
   */
  getNextRequiredPhase(currentPhase) {
    const currentIndex = this.ROUND_PHASES.indexOf(currentPhase);

    for (let i = currentIndex + 1; i < this.ROUND_PHASES.length; i++) {
      const candidatePhase = this.ROUND_PHASES[i];
      if (this.isPhaseRequired(candidatePhase)) {
        debugLog('GUEST_CASCADE', `🔍 [SKIP CONDITIONAL] Skipping "${this.ROUND_PHASES[i-1]}", next required: "${candidatePhase}"`);
        return candidatePhase;
      }
    }

    return null;
  }

  // Lazy-init for paths that set gameStateManager without calling initialize()
  _ensurePhaseRequirementChecker() {
    if (!this.phaseRequirementChecker) {
      if (!this.gameDataService && this.gameStateManager) {
        this.gameDataService = GameDataService.getInstance(this.gameStateManager);
      }
      this.phaseRequirementChecker = new PhaseRequirementChecker(this.gameDataService);
    }
  }

  /**
   * Check if a phase is required based on current game state
   * @param {string} phase - Phase to check
   * @returns {boolean} True if phase is required
   */
  isPhaseRequired(phase) {
    if (!this.gameStateManager) {
      debugLog('PHASE_TRANSITIONS', 'GameStateManager not available for phase requirement check');
      return true;
    }

    this._ensurePhaseRequirementChecker();
    const gameState = this.gameStateManager.getState();
    const result = this.phaseRequirementChecker.isPhaseRequired(phase, gameState, {
      quickDeployExecutedThisRound: this._quickDeployExecutedThisRound
    });

    // Side effect: clear the quick deploy flag after it's been consumed
    if (phase === 'deployment' && this._quickDeployExecutedThisRound && gameState.roundNumber === 1) {
      this._quickDeployExecutedThisRound = false;
    }

    return result;
  }

  /**
   * Check if any player exceeds hand limit
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player needs to discard
   */
  anyPlayerExceedsHandLimit(gameState) {
    this._ensurePhaseRequirementChecker();
    return this.phaseRequirementChecker.anyPlayerExceedsHandLimit(gameState);
  }

  /**
   * Check if any player has shields to allocate
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player has unallocated shields
   */
  anyPlayerHasShieldsToAllocate(gameState) {
    this._ensurePhaseRequirementChecker();
    return this.phaseRequirementChecker.anyPlayerHasShieldsToAllocate(gameState);
  }

  /**
   * Check if any player has cards in hand
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player has at least 1 card in hand
   */
  anyPlayerHasCards(gameState) {
    this._ensurePhaseRequirementChecker();
    return this.phaseRequirementChecker.anyPlayerHasCards(gameState);
  }

  /**
   * Check if any player exceeds drone limit
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if any player has too many drones
   */
  anyPlayerExceedsDroneLimit(gameState) {
    this._ensurePhaseRequirementChecker();
    return this.phaseRequirementChecker.anyPlayerExceedsDroneLimit(gameState);
  }

  /**
   * Check if a SPECIFIC player exceeds their hand limit
   * Used for asymmetric auto-completion (one player needs action, other doesn't)
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if this specific player exceeds their hand limit
   */
  playerExceedsHandLimit(playerId, gameState) {
    this._ensurePhaseRequirementChecker();
    return this.phaseRequirementChecker.playerExceedsHandLimit(playerId, gameState);
  }

  /**
   * Check if a SPECIFIC player exceeds their drone limit
   * Used for asymmetric auto-completion (one player needs action, other doesn't)
   * @param {string} playerId - 'player1' or 'player2'
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if this specific player exceeds their drone limit
   */
  playerExceedsDroneLimit(playerId, gameState) {
    this._ensurePhaseRequirementChecker();
    return this.phaseRequirementChecker.playerExceedsDroneLimit(playerId, gameState);
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
        roundNumber: this.gameStateManager.get('roundNumber')
      });
    } else {
      debugLog('PHASE_TRANSITIONS', 'ActionProcessor or GameStateManager not available for sequential phase initiation');
    }

    // Emit transition event
    this.emit('phaseTransition', {
      newPhase: phase,
      previousPhase,
      gameStage: this.gameStage,
      roundNumber: this.gameStateManager.get('roundNumber'),
      handoverType: 'simultaneous-to-sequential'
    });
  }

  /**
   * Transition to a new phase
   * @param {string} newPhase - Phase to transition to
   */
  async transitionToPhase(newPhase, trigger = 'unknown') {
    const previousPhase = this.currentPhase;
    const gameMode = this.gameStateManager.get('gameMode');

    // PHASE MANAGER INTEGRATION: Guest cannot call transitionToPhase directly
    // Guest waits for PhaseManager broadcasts from Host
    if (gameMode === 'guest') {
      debugLog('PHASE_TRANSITIONS', `🎬 [GUEST] Queueing announcement for ${newPhase} (state transition blocked)`);

      // Guest cannot transition state, but CAN queue announcements for UI feedback
      // Call ActionProcessor to queue announcement, then return before state transition
      if (this.actionProcessor && this.gameStateManager) {
        await this.actionProcessor.queueAction({
          type: 'phaseTransition',
          payload: {
            newPhase: newPhase,
            resetPassInfo: false,
            guestAnnouncementOnly: true  // Flag to skip state changes
          }
        });
      }

      return; // Block state transition (authority stays with Host)
    }

    // Guard against redundant transitions
    if (newPhase === previousPhase) {
      timingLog('[PHASE] Redundant transition blocked', {
        phase: newPhase,
        trigger: trigger,
        location: 'GameFlowManager.transitionToPhase'
      });
      debugLog('PHASE_TRANSITIONS', `⚠️ Blocked redundant transition: already in ${newPhase}`);
      return;
    }

    // PHASE MANAGER INTEGRATION: Let PhaseManager handle the authoritative transition
    // PhaseManager updates its internal phase state and handles broadcasting
    if (this.phaseManager) {
      const phaseManagerSuccess = this.phaseManager.transitionToPhase(newPhase);
      if (!phaseManagerSuccess) {
        debugLog('PHASE_TRANSITIONS', `❌ PhaseManager rejected transition to ${newPhase}`);
        return;
      }
      debugLog('PHASE_TRANSITIONS', `✅ PhaseManager accepted transition to ${newPhase}`);
    }

    const transitionStartTime = timingLog('[PHASE] Transition started', {
      from: previousPhase,
      to: newPhase,
      gameMode,
      trigger: trigger
    });

    this.currentPhase = newPhase;

    // Handle special phase transitions
    // Note: roundNumber is now initialized in processRoundInitialization(), not here
    if (this.ROUND_PHASES.includes(newPhase) && this.gameStage !== 'roundLoop') {
      this.gameStage = 'roundLoop';
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
          roundNumber: this.gameStateManager.get('roundNumber'),  // Use gameState as source of truth
          ...phaseData
        }, 'PHASE_TRANSITION', 'gameFlowManagerMetadata');
      } finally {
        this.gameStateManager._updateContext = null;
      }
    }

    // Handle automatic phases directly
    // SKIP during cascade mode - cascade loop handles processing explicitly
    if (this.isAutomaticPhase(newPhase) && !this.isInCheckpointCascade) {
      debugLog('PHASE_TRANSITIONS', `🤖 GameFlowManager: Auto-processing automatic phase '${newPhase}'`);
      await this.processAutomaticPhase(newPhase, previousPhase);
      return; // Don't emit transition event yet - will emit after automatic processing
    }

    // During cascade mode, automatic phases are handled by cascade loop
    if (this.isAutomaticPhase(newPhase) && this.isInCheckpointCascade) {
      debugLog('GUEST_CASCADE', `⏭️ [TRANSITION] Skipping auto-process - cascade mode handles explicitly`, { phase: newPhase });
    }

    // Emit transition event for non-automatic phases
    this.emit('phaseTransition', {
      newPhase,
      previousPhase,
      gameStage: this.gameStage,
      roundNumber: this.gameStateManager.get('roundNumber'),
      firstPlayerResult
    });

    // CHECKPOINT VALIDATION: Handled automatically in GuestMessageQueueService
    // Guest stops at checkpoint phases and waits for matching host broadcast
    // Validation happens when host reaches same checkpoint (no explicit call needed)

    // Auto-complete commitments for players who don't need to act (single-player mandatory phases)
    if (this.isSimultaneousPhase(newPhase)) {
      await this.autoCompleteUnnecessaryCommitments(newPhase);
    }

    // Start animation playback for sequential phase transitions
    // Sequential→Sequential transitions (e.g., deployment→action) don't go through automatic cascade
    // so we need to manually trigger animation playback here
    // Works for BOTH host and guest now (guest receives pass notifications from optimistic execution)
    const currentState = this.gameStateManager.getState();
    const inCascade = this.isInCheckpointCascade;

    if (!inCascade && this.isSequentialPhase(newPhase) && this.phaseAnimationQueue) {
      const queueLength = this.phaseAnimationQueue.getQueueLength();
      if (queueLength > 0 && !this.phaseAnimationQueue.isPlaying()) {
        debugLog('TIMING', `🎬 [${currentState.gameMode.toUpperCase()}] Starting animation playback after sequential transition`, {
          queuedAnimations: queueLength,
          phase: newPhase,
          gameMode: currentState.gameMode
        });
        this.phaseAnimationQueue.startPlayback('GFM:seq_transition:2060');
      }
    }

    timingLog('[PHASE] Transition complete', {
      phase: newPhase,
      gameMode,
      trigger: trigger
    }, transitionStartTime);
  }

  /**
   * Auto-complete commitments for players who don't need to act in mandatory phases
   * This handles asymmetric scenarios where one player needs action but the other doesn't.
   * @param {string} phase - The phase to check
   */
  async autoCompleteUnnecessaryCommitments(phase) {
    // Handle all mandatory simultaneous phases consistently
    const mandatoryPhases = ['allocateShields', 'mandatoryDiscard', 'mandatoryDroneRemoval'];
    if (!mandatoryPhases.includes(phase)) {
      return;
    }

    const gameState = this.gameStateManager.getState();
    const isSinglePlayer = gameState.gameMode === 'local';
    const localPlayerId = this.gameStateManager.getLocalPlayerId();

    // Check which players need to act based on the phase
    let player1NeedsToAct = false;
    let player2NeedsToAct = false;

    switch (phase) {
      case 'allocateShields':
        player1NeedsToAct = (gameState.shieldsToAllocate || 0) > 0;
        player2NeedsToAct = (gameState.opponentShieldsToAllocate || 0) > 0;
        break;
      case 'mandatoryDiscard':
        player1NeedsToAct = this.playerExceedsHandLimit('player1', gameState);
        player2NeedsToAct = this.playerExceedsHandLimit('player2', gameState);
        break;
      case 'mandatoryDroneRemoval':
        player1NeedsToAct = this.playerExceedsDroneLimit('player1', gameState);
        player2NeedsToAct = this.playerExceedsDroneLimit('player2', gameState);
        break;
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
    // Reset quick deploy flag for new round
    this._quickDeployExecutedThisRound = false;

    // Capture first passer from the round that just ended BEFORE incrementing round number
    const currentGameState = this.gameStateManager.getState();
    const firstPasserFromPreviousRound = currentGameState.passInfo?.firstPasser || null;

    // Read current round number from GameStateManager (source of truth) and increment
    const currentRound = this.gameStateManager.get('roundNumber');
    const nextRound = currentRound + 1;
    this.roundNumber = nextRound; // Sync local copy with source of truth

    debugLog('PHASE_TRANSITIONS', `🔄 GameFlowManager: Starting round ${nextRound}`, {
      currentRound,
      nextRound,
      firstPasserFromPreviousRound
    });

    // Update gameState with new round number and first passer from previous round
    try {
      this.gameStateManager._updateContext = 'GameFlowManager';
      this.gameStateManager.setState({
        roundNumber: nextRound,
        turn: 1,  // Reset turn counter to 1 at start of each round (increments on action phase passes)
        firstPasserOfPreviousRound: firstPasserFromPreviousRound
      }, 'ROUND_START', 'gameFlowManagerMetadata');
    } finally {
      this.gameStateManager._updateContext = null;
    }

    // Queue ROUND announcement before transitioning to first phase of new round
    // This ensures ROUND shows immediately, not after other announcements
    const gameMode = this.gameStateManager.get('gameMode');
    debugLog('PHASE_TRANSITIONS', `🎯 Queueing ROUND ${nextRound} announcement before starting round phases`);

    await this.actionProcessor.processPhaseTransition({
      newPhase: 'roundAnnouncement',
      resetPassInfo: false,
      guestAnnouncementOnly: gameMode === 'guest'
    });

    debugLog('PHASE_TRANSITIONS', `✅ ROUND ${nextRound} announcement queued`);

    // Find first required phase in new round
    const firstRequiredPhase = this.ROUND_PHASES.find(phase => this.isPhaseRequired(phase));

    // Note: PassInfo will be reset by ActionProcessor.processPhaseTransition()
    // when transitioning to the first phase (resetPassInfo defaults to true)
    if (firstRequiredPhase) {
      await this.transitionToPhase(firstRequiredPhase);
    } else {
      debugLog('PHASE_TRANSITIONS', 'No required phases found for new round, defaulting to deployment');
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
      finalRound: this.gameStateManager.get('roundNumber')
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
    this._quickDeployExecutedThisRound = false;

    // Clear event listeners to prevent stale subscriptions
    this.listeners = [];

    // Reset checkpoint cascade flag
    this.isInCheckpointCascade = false;

    // Reset PhaseManager state (clears transitionHistory, passInfo, commitments)
    if (this.phaseManager?.reset) {
      this.phaseManager.reset();
      debugLog('PHASE_TRANSITIONS', '✅ PhaseManager reset');
    }

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
      roundNumber: this.gameStateManager.get('roundNumber'),
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
      debugLog('PHASE_TRANSITIONS', 'Invalid drone names provided to extractDronesFromDeck');
      return [];
    }

    const drones = droneNames.map(name => {
      const drone = fullDroneCollection.find(d => d.name === name);
      if (!drone) {
        debugLog('PHASE_TRANSITIONS', `Drone "${name}" not found in collection`);
      }
      return drone;
    }).filter(Boolean); // Remove any undefined entries

    debugLog('PHASE_TRANSITIONS', `📦 Extracted ${drones.length} drones from deck: ${drones.map(d => d.name).join(', ')}`);
    return drones;
  }

  /**
   * Execute quick deploy - deploy player's drones with ON_DEPLOY effects and interleaved AI response
   * Called from isPhaseRequired when pendingQuickDeploy exists
   *
   * Flow: Player deploys drone → ON_DEPLOY triggers → AI deploys one drone → repeat
   * This ensures ON_DEPLOY effects (like Scanner's MARK_RANDOM_ENEMY) see the correct board state
   *
   * @param {Object} quickDeploy - Quick deploy template with placements array and deploymentOrder
   */
  async executeQuickDeploy(quickDeploy) {
    debugLog('QUICK_DEPLOY', '⚡ Executing quick deploy:', quickDeploy.name);

    try {
      const { default: DeploymentProcessor } = await import('../logic/deployment/DeploymentProcessor.js');
      const deploymentProcessor = new DeploymentProcessor();

      // Map lane indices (0, 1, 2) to lane IDs (lane1, lane2, lane3)
      const laneIdMap = { 0: 'lane1', 1: 'lane2', 2: 'lane3' };

      // Use deploymentOrder if present, otherwise fall back to array order
      const order = quickDeploy.deploymentOrder || quickDeploy.placements.map((_, i) => i);

      debugLog('QUICK_DEPLOY', `📋 Deployment order: [${order.join(', ')}]`);

      // Create log callback for combat log entries
      const logCallback = (entry) => this.gameStateManager.addLogEntry(entry);

      const turn = 1; // Quick deploy is always turn 1

      // Execute interleaved player/AI deployments
      for (const placementIndex of order) {
        const placement = quickDeploy.placements[placementIndex];
        if (!placement) {
          debugLog('QUICK_DEPLOY', `Invalid placement index: ${placementIndex}`);
          continue;
        }

        const droneData = fullDroneCollection.find(d => d.name === placement.droneName);
        if (!droneData) {
          debugLog('QUICK_DEPLOY', `Drone not found: ${placement.droneName}`);
          continue;
        }

        const laneId = laneIdMap[placement.lane];

        // Get FRESH state for each deployment (so AI sees previous deployments)
        const currentState = this.gameStateManager.getState();
        let playerState = JSON.parse(JSON.stringify(currentState.player1));
        let opponentState = JSON.parse(JSON.stringify(currentState.player2));

        // Get fresh placedSections each iteration (in case ON_DEPLOY modified them)
        const placedSections = {
          player1: currentState.placedSections,
          player2: currentState.opponentPlacedSections
        };

        debugLog('QUICK_DEPLOY', `  Deploying ${droneData.name} to ${laneId} (placement index ${placementIndex})`);

        // Deploy player drone (DeploymentProcessor handles ON_DEPLOY effects)
        const result = deploymentProcessor.executeDeployment(
          droneData,
          laneId,
          turn,
          playerState,
          opponentState,
          placedSections,
          logCallback, // Log deployments to combat log
          'player1'
        );

        if (result.success) {
          // Update state IMMEDIATELY so AI sees the new drone
          this.gameStateManager.setState({
            player1: result.newPlayerState,
            player2: result.opponentState || opponentState  // In case ON_DEPLOY affected opponent
          });

          debugLog('QUICK_DEPLOY', `  ✅ Deployed ${droneData.name} successfully`);

          // AI deploys ONE drone in response (with logging and ON_DEPLOY effects)
          if (this.actionProcessor && this.actionProcessor.aiPhaseProcessor) {
            const aiProcessor = this.actionProcessor.aiPhaseProcessor;
            if (aiProcessor.executeSingleDeployment) {
              await aiProcessor.executeSingleDeployment();
            }
          }
        } else {
          debugLog('QUICK_DEPLOY', `Failed to deploy ${droneData.name}: ${result.error}`);
        }
      }

      debugLog('QUICK_DEPLOY', '✅ Player quick deploy complete, AI finishing deployment');

      // AI deploys any remaining drones
      if (this.actionProcessor && this.actionProcessor.aiPhaseProcessor) {
        await this.actionProcessor.aiPhaseProcessor.finishDeploymentPhase();
      }

      // Clear pending quick deploy
      this.gameStateManager.setState({
        pendingQuickDeploy: null
      });

      // Clear pending quick deploy from run state as well
      const runState = tacticalMapStateManager.getState();
      if (runState && runState.pendingQuickDeploy) {
        tacticalMapStateManager.setState({
          pendingQuickDeploy: null
        });
      }

      debugLog('QUICK_DEPLOY', '✅ Quick deploy execution complete');
    } catch (error) {
      debugLog('QUICK_DEPLOY', 'Error during execution:', error);
      // Clear pending quick deploy on error to prevent infinite loop
      this.gameStateManager.setState({ pendingQuickDeploy: null });
    }
  }
}

// Export class for manual instantiation with PhaseAnimationQueue
export default GameFlowManager;