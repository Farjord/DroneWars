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
import { debugLog, timingLog, getTimestamp } from '../utils/debugLogger.js';

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
    this.isInCheckpointCascade = false; // Flag to prevent recursive auto-processing during optimistic cascade

    // Event listeners
    this.listeners = [];

    // External system references (injected)
    this.gameStateManager = null;
    this.actionProcessor = null;
    this.phaseAnimationQueue = phaseAnimationQueue; // For non-blocking phase announcements
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
    // Track previous passInfo for guest opponent pass detection
    let previousPassInfo = null;

    // Subscribe to GameStateManager for both sequential and simultaneous phase completion detection
    if (this.gameStateManager) {
      this.gameStateManager.subscribe((event) => {
        const { state, type: eventType } = event;
        this.checkSequentialPhaseCompletion(state, eventType);

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
              this.phaseAnimationQueue.queueAnimation('playerPass', 'OPPONENT PASSED', null);

              debugLog('PASS_LOGIC', '📋 [GUEST] Queued OPPONENT PASSED animation from state detection');

              // Trigger playback if not already playing
              if (!this.phaseAnimationQueue.isPlaying()) {
                this.phaseAnimationQueue.startPlayback();
                debugLog('PASS_LOGIC', '🎬 [GUEST] Started playback for OPPONENT PASSED');
              }
            }
          }

          // Update previous passInfo for next comparison
          previousPassInfo = { ...state.passInfo };
        }
      });
    }

    // Subscribe to ActionProcessor for turn transition handling
    if (this.actionProcessor) {
      this.actionProcessor.subscribe((event) => {
        if (event.type === 'action_completed') {
          debugLog('PASS_LOGIC', `📥 [GAME FLOW] Received action_completed event`, {
            actionType: event.actionType,
            gameMode: this.gameStateManager?.getState()?.gameMode
          });
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

    // Log entry for debugging
    const currentState = this.gameStateManager.getState();
    debugLog('PASS_LOGIC', `🎯 [${currentState.gameMode.toUpperCase()}] handleActionCompletion called`, {
      actionType,
      gameMode: currentState.gameMode,
      turnPhase: currentState.turnPhase
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
            this.phaseAnimationQueue.startPlayback();
          } else {
            debugLog('PASS_LOGIC', `ℹ️ [GUEST] No playback needed`, {
              queueLength,
              alreadyPlaying: this.phaseAnimationQueue.isPlaying()
            });
          }
        }

        // Guest handles phase transitions optimistically (same as Host)
        // This ensures Guest queues phase announcements locally without waiting for Host broadcast
        if (bothPassed) {
          debugLog('PASS_LOGIC', `✅ [GUEST] Both players passed - processing phase transition optimistically`);
          await this.onSequentialPhaseComplete(updatedState.turnPhase, {
            reason: 'both_passed',
            passInfo: updatedState.passInfo
          });
          // Note: Guest doesn't broadcast, but processes transition and queues announcement locally
          return;
        }

        // Single player pass - just play notification and wait
        return;
      }

      // Host mode: Handle both phase transitions and playback
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
          this.actionProcessor.broadcastStateToGuest('phase_transition_both_passed');
          debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted state after phase transition`);
        }
        return;
      } else {
        // Single player passed - start PhaseAnimationQueue playback for pass notification
        // (Pass notification was queued by ActionProcessor.processPlayerPass)
        if (this.phaseAnimationQueue) {
          const queueLength = this.phaseAnimationQueue.getQueueLength();
          if (queueLength > 0 && !this.phaseAnimationQueue.isPlaying()) {
            debugLog('TIMING', `🎬 [HOST] Starting pass notification playback`, {
              queuedAnimations: queueLength
            });
            this.phaseAnimationQueue.startPlayback();
          }
        }
      }
    }

    // Guard: Guest mode doesn't handle turn transitions (host sends them)
    // This guard is AFTER pass playback handling so guests can trigger their own animations
    if (currentState.gameMode === 'guest') {
      debugLog('PASS_LOGIC', `🚫 [GUEST] Early return - guest mode blocks turn transitions`, {
        actionType
      });
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
    const gameMode = this.gameStateManager.get('gameMode');

    // GUEST MODE: Trigger optimistic processing after ANY simultaneous checkpoint completes
    // This allows guest to process automatic phases (draw, energyReset, etc.) until next checkpoint
    if (gameMode === 'guest') {
      debugLog('GUEST_CASCADE', `🎯 [GUEST] ${phase} complete - triggering optimistic processing`);

      // Determine start phase for cascade based on which phase just completed
      let startPhase;
      if (phase === 'placement') {
        // Placement is special - starts from gameInitializing (initial game setup)
        startPhase = 'gameInitializing';
      } else {
        // For other simultaneous phases, get the NEXT phase and start from there
        // (e.g., optionalDiscard → draw, allocateShields → mandatoryDroneRemoval)
        startPhase = this.getNextPhase(phase);

        debugLog('GUEST_CASCADE', `🔍 [GUEST] Completed checkpoint: ${phase}, next phase: ${startPhase}`, {
          completedCheckpoint: phase,
          nextPhase: startPhase,
          reason: 'Determining cascade behavior based on next phase type'
        });

        if (!startPhase) {
          // Same logic as Host's onSequentialPhaseComplete (line 738-741)
          // End of action phase - start new round
          if (phase === 'action') {
            debugLog('GUEST_CASCADE', `🔄 [GUEST] Action phase complete, starting new round`);
            await this.startNewRound();
            return;
          }
          console.error(`❌ [GUEST] No next phase found after ${phase}`);
          return;
        }
      }

      // Check if next phase is already a checkpoint (e.g., allocateShields → deployment when mandatoryDroneRemoval skipped)
      // If so, just transition to it directly instead of starting a cascade
      const isNextPhaseCheckpoint = this.gameStateManager.isMilestonePhase(startPhase);

      debugLog('GUEST_CASCADE', `🔍 [GUEST] Checking next phase type`, {
        nextPhase: startPhase,
        isCheckpoint: isNextPhaseCheckpoint,
        behavior: isNextPhaseCheckpoint ? 'DIRECT_TRANSITION' : 'CASCADE_PROCESSING'
      });

      if (isNextPhaseCheckpoint) {
        debugLog('GUEST_CASCADE', `⚠️ [GUEST] DIRECT CHECKPOINT JUMP: ${phase} → ${startPhase}`, {
          from: phase,
          to: startPhase,
          warning: 'Skipping validation, jumping directly to next checkpoint',
          potentialIssue: 'Guest may skip Host validation step'
        });
        await this.transitionToPhase(startPhase);

        // Start animation playback after direct checkpoint jump
        // Ensures Guest sees phase announcements for milestone transitions
        if (this.phaseAnimationQueue) {
          const queueLength = this.phaseAnimationQueue.getQueueLength();
          if (queueLength > 0 && !this.phaseAnimationQueue.isPlaying()) {
            debugLog('TIMING', `🎬 [GUEST] Starting animation playback after direct checkpoint jump: ${phase} → ${startPhase}`, {
              queuedAnimations: queueLength,
              from: phase,
              to: startPhase
            });
            this.phaseAnimationQueue.startPlayback();
          }
        }

        return;
      }

      // Next phase is automatic - process cascade until next checkpoint
      debugLog('GUEST_CASCADE', `🔄 [GUEST] Starting cascade from phase: ${startPhase}`, {
        startPhase,
        behavior: 'Will process automatic phases until next checkpoint'
      });
      await this.processAutomaticPhasesUntilCheckpoint(startPhase);
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

    // CRITICAL BROADCAST: For placement phase, broadcast immediately after commitment application
    // This allows guest to receive "both complete" signal and start optimistic cascade
    // BEFORE host enters blocking automatic phase processing
    if (phase === 'placement' && gameMode === 'host' && this.actionProcessor.p2pManager) {
      debugLog('BROADCAST_TIMING', `📡 [BROADCAST SOURCE] Placement commitments applied - immediate broadcast to guest`);
      this.actionProcessor.broadcastStateToGuest();
      debugLog('MULTIPLAYER', `📡 GameFlowManager: Broadcasted placement completion state before automatic cascade`);
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
            this.phaseAnimationQueue.startPlayback();
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
            this.phaseAnimationQueue.startPlayback();
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
   * Check if sequential phases should complete based on state changes
   * @param {Object} state - Current game state
   * @param {string} eventType - Type of state change
   */
  checkSequentialPhaseCompletion(state, eventType) {
    // Guard: Only local mode uses state monitoring for phase completion
    // Host and Guest use explicit handling in passInfo subscription (lines 250, 267)
    if (state.gameMode !== 'local') {
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
          this.phaseAnimationQueue.startPlayback();
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

    debugLog('CASCADE_LOOP', `🔧 [PHASE LOGIC START] ${phase}`);

    let nextPhase = null;

    // Route to appropriate phase handler
    if (phase === 'gameInitializing') {
      debugLog('CASCADE_LOOP', `   ↳ Calling processGameInitializingPhase()`);
      nextPhase = await this.processGameInitializingPhase(previousPhase);
    } else if (phase === 'energyReset') {
      debugLog('CASCADE_LOOP', `   ↳ Calling processAutomaticEnergyResetPhase()`);
      nextPhase = await this.processAutomaticEnergyResetPhase(previousPhase);
    } else if (phase === 'draw') {
      debugLog('CASCADE_LOOP', `   ↳ Calling processAutomaticDrawPhase()`);
      nextPhase = await this.processAutomaticDrawPhase(previousPhase);
    } else if (phase === 'determineFirstPlayer') {
      debugLog('CASCADE_LOOP', `   ↳ Calling processAutomaticFirstPlayerPhase()`);
      nextPhase = await this.processAutomaticFirstPlayerPhase(previousPhase);
    } else {
      console.warn(`⚠️ No handler for automatic phase: ${phase}`);
    }

    debugLog('CASCADE_LOOP', `🔧 [PHASE LOGIC END] ${phase} → returns next: ${nextPhase || 'null'}`);

    timingLog('[AUTO PHASE] Processing complete', {
      phase,
      nextPhase
    }, phaseStartTime);

    return nextPhase;
  }

  /**
   * Process automatic phases until reaching a checkpoint (Guest optimistic processing)
   * Used after placement completes to process: gameInitializing → determineFirstPlayer → energyReset → draw → deployment
   * Stops at first milestone phase (checkpoint) for validation with host
   *
   * @param {string} startPhase - Phase to start processing from (typically 'gameInitializing')
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
          this.phaseAnimationQueue.startPlayback();
        }
      }
    }
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
      // Now queue the second announcement with the result

      if (firstPlayerResult.stateUpdates) {
        const localPlayerId = this.gameStateManager.getLocalPlayerId();
        const firstPlayer = firstPlayerResult.stateUpdates.firstPlayerOfRound;
        const isLocalPlayerFirst = firstPlayer === localPlayerId;

        const announcementText = isLocalPlayerFirst ? 'YOU ARE FIRST PLAYER' : 'OPPONENT IS FIRST PLAYER';

        // Queue animation for sequential playback (non-blocking)
        if (this.phaseAnimationQueue) {
          this.phaseAnimationQueue.queueAnimation('firstPlayerResult', announcementText);
        }

        // For host: capture animation for broadcasting
        if (this.gameStateManager.get('gameMode') === 'host' && this.actionProcessor.animationManager) {
          const secondAnnouncementEvent = {
            animationName: 'PHASE_ANNOUNCEMENT',
            payload: {
              phaseText: announcementText,
              phaseName: 'firstPlayerResult',
              timestamp: Date.now()
            }
          };

          // Capture for broadcasting (don't execute)
          this.actionProcessor.pendingSystemAnimations.push(secondAnnouncementEvent);
        }

        debugLog('PHASE_TRANSITIONS', '🎬 [FIRST PLAYER] Result announcement queued');
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

      debugLog('RESOURCE_RESET', `=== ROUND ${this.roundNumber} RESET: Energy & Deployment Budget ===`, {
        roundNumber: this.roundNumber,
        player1: {
          name: currentGameState.player1.name,
          placedSections: currentGameState.placedSections,
          shipSectionKeys: Object.keys(currentGameState.player1.shipSections),
          processedSections: Object.keys(player1EffectiveStats.bySection),
          calculated: {
            energyPerTurn: player1EffectiveStats.totals.energyPerTurn,
            maxEnergy: player1EffectiveStats.totals.maxEnergy,
            deploymentBudget: player1EffectiveStats.totals.deploymentBudget,
            initialDeployment: player1EffectiveStats.totals.initialDeployment
          },
          willApply: {
            energy: updatedPlayer1.energy,
            initialDeploymentBudget: updatedPlayer1.initialDeploymentBudget,
            deploymentBudget: updatedPlayer1.deploymentBudget
          }
        },
        player2: {
          name: currentGameState.player2.name,
          placedSections: currentGameState.opponentPlacedSections,
          shipSectionKeys: Object.keys(currentGameState.player2.shipSections),
          processedSections: Object.keys(player2EffectiveStats.bySection),
          calculated: {
            energyPerTurn: player2EffectiveStats.totals.energyPerTurn,
            maxEnergy: player2EffectiveStats.totals.maxEnergy,
            deploymentBudget: player2EffectiveStats.totals.deploymentBudget,
            initialDeployment: player2EffectiveStats.totals.initialDeployment
          },
          willApply: {
            energy: updatedPlayer2.energy,
            initialDeploymentBudget: updatedPlayer2.initialDeploymentBudget,
            deploymentBudget: updatedPlayer2.deploymentBudget
          }
        }
      });

      // Calculate shields to allocate from Power Cell stats (round 2+ only)
      const shieldsToAllocate = this.roundNumber >= 2 ? player1EffectiveStats.totals.shieldsPerTurn : 0;
      const opponentShieldsToAllocate = this.roundNumber >= 2 ? player2EffectiveStats.totals.shieldsPerTurn : 0;

      // DEBUG: Log the actual payload being sent to ActionProcessor
      debugLog('RESOURCE_RESET', `📤 [GAMEFLOWMANAGER] Sending energyReset payload to ActionProcessor`, {
        player1: {
          name: updatedPlayer1.name,
          energy: updatedPlayer1.energy,
          initialDeploymentBudget: updatedPlayer1.initialDeploymentBudget,
          deploymentBudget: updatedPlayer1.deploymentBudget,
          hasAllFields: {
            energy: 'energy' in updatedPlayer1,
            initialDeploymentBudget: 'initialDeploymentBudget' in updatedPlayer1,
            deploymentBudget: 'deploymentBudget' in updatedPlayer1
          }
        },
        player2: {
          name: updatedPlayer2.name,
          energy: updatedPlayer2.energy,
          initialDeploymentBudget: updatedPlayer2.initialDeploymentBudget,
          deploymentBudget: updatedPlayer2.deploymentBudget,
          hasAllFields: {
            energy: 'energy' in updatedPlayer2,
            initialDeploymentBudget: 'initialDeploymentBudget' in updatedPlayer2,
            deploymentBudget: 'deploymentBudget' in updatedPlayer2
          }
        }
      });

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

      // DEBUG: Log after energy reset action completes, before phase transition
      debugLog('RESOURCE_RESET', `⏭️ [GAMEFLOWMANAGER] Energy reset action complete, about to emit phaseTransition`, {
        timestamp: Date.now()
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

      // DEBUG: Log after phase transition emitted
      debugLog('RESOURCE_RESET', `📢 [GAMEFLOWMANAGER] phaseTransition event emitted`, {
        timestamp: Date.now(),
        newPhase: 'energyReset'
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

    // Check player2
    const player2HandCount = gameState.player2.hand ? gameState.player2.hand.length : 0;
    const player2Stats = this.gameDataService.getEffectiveShipStats(gameState.player2, gameState.opponentPlacedSections);
    const player2HandLimit = player2Stats.totals.handLimit;

    const player1Exceeds = player1HandCount > player1HandLimit;
    const player2Exceeds = player2HandCount > player2HandLimit;
    const anyExceeds = player1Exceeds || player2Exceeds;

    debugLog('PHASE_TRANSITIONS', `🃏 Hand limit check:`, {
      gameMode: gameState.gameMode,
      player1: { handCount: player1HandCount, handLimit: player1HandLimit, exceeds: player1Exceeds },
      player2: { handCount: player2HandCount, handLimit: player2HandLimit, exceeds: player2Exceeds },
      anyPlayerExceeds: anyExceeds
    });

    if (player1Exceeds || player2Exceeds) {
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
    const gameMode = gameState.gameMode || 'unknown';
    const currentPhase = gameState.turnPhase || 'unknown';

    debugLog('PHASE_TRANSITIONS', `🛡️ [SHIELD CHECK] Checking if shields phase required`, {
      gameMode,
      currentPhase,
      roundNumber: gameState.roundNumber,
      shieldsToAllocate: gameState.shieldsToAllocate,
      opponentShieldsToAllocate: gameState.opponentShieldsToAllocate
    });

    // Shield allocation phase starts from round 2 onwards
    if (gameState.roundNumber < 2) {
      debugLog('PHASE_TRANSITIONS', `🛡️ [SHIELD CHECK] Round ${gameState.roundNumber} < 2 - skipping shields phase`);
      return false;
    }

    // Check if either player has shields available to allocate
    const hasShields = gameState.shieldsToAllocate > 0 || gameState.opponentShieldsToAllocate > 0;

    debugLog('PHASE_TRANSITIONS', `🛡️ [SHIELD CHECK] Result: ${hasShields ? 'REQUIRED' : 'SKIP'}`, {
      player1Shields: gameState.shieldsToAllocate,
      player2Shields: gameState.opponentShieldsToAllocate,
      decision: hasShields ? 'Phase required - has shields' : 'Phase not required - no shields'
    });

    return hasShields;
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
  async transitionToPhase(newPhase, trigger = 'unknown') {
    const previousPhase = this.currentPhase;
    const gameMode = this.gameStateManager.get('gameMode');

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

    const transitionStartTime = timingLog('[PHASE] Transition started', {
      from: previousPhase,
      to: newPhase,
      gameMode,
      trigger: trigger
    });

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
      roundNumber: this.roundNumber,
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
        this.phaseAnimationQueue.startPlayback();
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
   * @param {string} phase - The phase to check
   */
  async autoCompleteUnnecessaryCommitments(phase) {
    // Only handle mandatory simultaneous phases
    // NOTE: mandatoryDiscard and mandatoryDroneRemoval excluded - use UI Continue button instead
    const mandatoryPhases = ['allocateShields'];
    if (!mandatoryPhases.includes(phase)) {
      return;
    }

    const gameState = this.gameStateManager.getState();
    const isSinglePlayer = gameState.gameMode === 'local';
    const localPlayerId = this.gameStateManager.getLocalPlayerId();

    // Check which players need to act
    let player1NeedsToAct = false;
    let player2NeedsToAct = false;

    if (phase === 'allocateShields') {
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
        turn: 1,  // Reset turn counter to 1 at start of each round (increments on action phase passes)
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

// Export class for manual instantiation with PhaseAnimationQueue
export default GameFlowManager;