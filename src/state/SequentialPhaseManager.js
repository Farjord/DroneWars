// ========================================
// SEQUENTIAL PHASE MANAGER
// ========================================
// Manages turn-based gameplay for sequential phases (deployment, action).
// Handles turn flow, pass logic, and automatic AI turn triggering.
// Sister component to SimultaneousActionManager for sequential gameplay.

/**
 * SequentialPhaseManager - Coordinator for turn-based phase gameplay
 */
class SequentialPhaseManager {
  constructor() {
    // Current phase state
    this.currentPhase = null;
    this.currentPlayer = null;
    this.isPhaseActive = false;

    // Pass tracking
    this.passInfo = {
      player1Passed: false,
      player2Passed: false,
      firstPasser: null
    };

    // Turn processing state
    this.isProcessingTurn = false;
    this.turnTimer = null;

    // Phase completion guard
    this.phaseCompleted = false;

    // Dependencies (set during initialization)
    this.gameStateManager = null;
    this.actionProcessor = null;
    this.aiPhaseProcessor = null;

    // Event listeners
    this.listeners = new Set();

    // Configuration
    this.aiTurnDelay = 1500; // ms delay before AI acts

    console.log('🎮 SequentialPhaseManager initialized');
  }

  /**
   * Initialize with dependencies
   * @param {Object} gameStateManager - GameStateManager instance
   * @param {Object} actionProcessor - ActionProcessor instance
   * @param {Object} aiPhaseProcessor - AIPhaseProcessor instance
   */
  initialize(gameStateManager, actionProcessor, aiPhaseProcessor) {
    this.gameStateManager = gameStateManager;
    this.actionProcessor = actionProcessor;
    this.aiPhaseProcessor = aiPhaseProcessor;

    // Subscribe to game state changes
    if (this.gameStateManager) {
      this.gameStateManager.subscribe((event) => {
        this.handleStateChange(event);
      });
    }

    console.log('🔗 SequentialPhaseManager connected to dependencies');
  }

  /**
   * Handle game state changes
   * @param {Object} event - State change event
   */
  handleStateChange(event) {
    const state = this.gameStateManager.getState();

    // Check if we're in a sequential phase
    const sequentialPhases = ['deployment', 'action'];
    const isSequentialPhase = sequentialPhases.includes(state.turnPhase);

    // Phase transition detection - ALWAYS process this even if inactive
    if (state.turnPhase !== this.currentPhase) {
      if (isSequentialPhase) {
        // Transitioning to a sequential phase (either from non-sequential or between sequential phases)
        if (this.isPhaseActive) {
          // Clean up current phase if active
          this.cleanupPhase();
        }
        // Initialize the new phase
        this.initializePhase(state.turnPhase, state.currentPlayer);
      } else if (!isSequentialPhase && this.isPhaseActive) {
        // Transitioning out of sequential phase to non-sequential
        this.cleanupPhase();
      }
      return; // Exit after handling transition
    }

    // Guard: Don't process turn/pass changes if phase is not active
    if (!this.isPhaseActive) {
      return;
    }

    // Turn change detected within active phase
    if (state.currentPlayer !== this.currentPlayer) {
      this.onTurnChange(state.currentPlayer);
    }

    // Pass info update detected
    if (state.passInfo) {
      const passChanged = JSON.stringify(state.passInfo) !== JSON.stringify(this.passInfo);
      if (passChanged) {
        this.passInfo = { ...state.passInfo };
        this.checkPhaseCompletion();
      }
    }
  }

  /**
   * Initialize for a sequential phase
   * @param {string} phase - Phase name ('deployment' or 'action')
   * @param {string} firstPlayer - Player who goes first
   */
  initializePhase(phase, firstPlayer) {
    console.log(`🎯 SequentialPhaseManager: Initializing ${phase} phase, first player: ${firstPlayer}`);

    this.currentPhase = phase;
    this.currentPlayer = firstPlayer;
    this.isPhaseActive = true;

    // Reset pass info for new phase - critical to prevent carryover from previous sequential phase
    this.passInfo = {
      player1Passed: false,
      player2Passed: false,
      firstPasser: null
    };

    // Reset completion guard
    this.phaseCompleted = false;

    console.log(`🔄 SequentialPhaseManager: PassInfo reset for ${phase} phase:`, this.passInfo);

    // Emit phase start event
    this.emit({
      type: 'phase_started',
      phase: phase,
      firstPlayer: firstPlayer
    });

    // Check if AI should act first
    this.checkForAITurn();
  }

  /**
   * Handle turn change
   * @param {string} newPlayer - Player whose turn it is
   */
  onTurnChange(newPlayer) {
    console.log(`🔄 SequentialPhaseManager: Turn changed to ${newPlayer}`);

    // Clear any pending AI turn timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    this.currentPlayer = newPlayer;

    // Emit turn change event
    this.emit({
      type: 'turn_changed',
      player: newPlayer,
      phase: this.currentPhase
    });

    // Check if AI should act
    this.checkForAITurn();
  }

  /**
   * Check if AI should take a turn
   */
  checkForAITurn() {
    // Don't process if phase isn't active or already processing
    if (!this.isPhaseActive || this.isProcessingTurn) {
      return;
    }

    const state = this.gameStateManager.getState();

    // Check if it's single-player mode
    const isMultiplayer = state.gameMode !== 'local';
    if (isMultiplayer) {
      return; // Don't auto-manage AI in multiplayer
    }

    // Check if it's AI's turn (AI is always player2)
    const isAITurn = this.currentPlayer === 'player2';
    if (!isAITurn) {
      return; // Human player's turn
    }

    // Check if AI has already passed
    if (this.passInfo.player2Passed) {
      console.log('🤖 AI has already passed this phase');
      return;
    }

    // Schedule AI turn with delay
    console.log(`⏰ Scheduling AI turn in ${this.aiTurnDelay}ms`);
    this.turnTimer = setTimeout(() => {
      this.processAITurn();
    }, this.aiTurnDelay);
  }

  /**
   * Process AI turn - simplified to just trigger AI execution
   */
  async processAITurn() {
    if (this.isProcessingTurn) {
      console.log('⚠️ Already processing a turn, skipping AI turn');
      return;
    }

    this.isProcessingTurn = true;

    try {
      console.log(`🤖 SequentialPhaseManager: Triggering AI turn for ${this.currentPhase} phase`);

      // Get current game state
      const state = this.gameStateManager.getState();

      // Get AI decision (not executed)
      let decision;
      if (this.currentPhase === 'deployment') {
        decision = await this.aiPhaseProcessor.executeDeploymentTurn(state);
      } else if (this.currentPhase === 'action') {
        decision = await this.aiPhaseProcessor.executeActionTurn(state);
      } else {
        console.error(`❌ Unknown sequential phase: ${this.currentPhase}`);
        // Force pass for unknown phases
        decision = await this.aiPhaseProcessor.executePass(this.currentPhase);
      }

      console.log('🤖 AI decision received:', decision);

      // Execute the decision through standard flow
      if (decision.type === 'pass') {
        await this.actionProcessor.queueAction({
          type: 'playerPass',
          payload: {
            playerId: 'player2',
            playerName: 'AI Player',
            turnPhase: this.currentPhase,
            passInfo: state.passInfo,
            opponentPlayerId: 'player1'
          }
        });
      } else if (decision.type === 'deployment' && decision.decision?.type === 'pass') {
        await this.actionProcessor.queueAction({
          type: 'playerPass',
          payload: {
            playerId: 'player2',
            playerName: 'AI Player',
            turnPhase: this.currentPhase,
            passInfo: state.passInfo,
            opponentPlayerId: 'player1'
          }
        });
      } else if (decision.type === 'deployment') {
        // Execute deployment through standard flow
        const result = await this.actionProcessor.queueAction({
          type: 'deployment',
          payload: {
            droneData: decision.decision.payload.droneToDeploy,
            laneId: decision.decision.payload.targetLane,
            playerId: 'player2',
            turn: state.turn
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
      } else if (decision.type === 'action') {
        // Execute action through ActionProcessor (for future implementation)
        const result = await this.actionProcessor.queueAction({
          type: 'aiAction',
          payload: { aiDecision: decision.decision }
        });

        // Note: Action phase turn ending is handled differently (by actionProcessor itself)
      }

    } catch (error) {
      console.error('❌ Error processing AI turn:', error);
      // Force pass on error to prevent stuck game
      try {
        await this.aiPhaseProcessor.executePass(this.currentPhase);
      } catch (passError) {
        console.error('❌ Failed to force AI pass:', passError);
      }
    } finally {
      this.isProcessingTurn = false;

      // Check if AI should continue (human has passed)
      if (this.passInfo && this.passInfo.player1Passed && !this.passInfo.player2Passed) {
        console.log('🔄 Human has passed - AI continues taking turns');
        this.checkForAITurn();
      }
    }
  }


  /**
   * Check if phase should complete (both players passed)
   */
  async checkPhaseCompletion() {
    // Guard against multiple completion events for the same phase
    if (this.phaseCompleted) {
      console.log(`⚠️ Phase ${this.currentPhase} already completed, ignoring duplicate completion check`);
      return;
    }

    if (this.passInfo.player1Passed && this.passInfo.player2Passed) {
      console.log(`✅ Both players passed - ${this.currentPhase} phase complete`);

      // Mark phase as completed AND inactive to prevent duplicate events and race conditions
      this.phaseCompleted = true;
      this.isPhaseActive = false;

      console.log(`🔒 Phase ${this.currentPhase} deactivated before emitting completion`);

      // Emit phase completion event - phase is now inert and won't react to state changes
      this.emit({
        type: 'phase_completed',
        phase: this.currentPhase,
        firstPasser: this.passInfo.firstPasser
      });

      // SequentialPhaseManager does NOT handle phase transitions
      // GameFlowManager orchestrates phase transitions when it receives the completion event
    } else if (this.passInfo[this.currentPlayer + 'Passed']) {
      // Current player passed but other hasn't - switch turns
      const otherPlayer = this.currentPlayer === 'player1' ? 'player2' : 'player1';

      await this.actionProcessor.queueAction({
        type: 'turnTransition',
        payload: { newPlayer: otherPlayer }
      });
    }
  }

  /**
   * Clean up phase when it ends
   */
  cleanupPhase() {
    console.log(`🧹 SequentialPhaseManager: Cleaning up ${this.currentPhase} phase`);

    // Clear timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    // Reset state
    this.currentPhase = null;
    this.currentPlayer = null;
    this.isPhaseActive = false;
    this.isProcessingTurn = false;
    this.phaseCompleted = false;
    this.passInfo = {
      player1Passed: false,
      player2Passed: false,
      firstPasser: null
    };
  }

  /**
   * Check if a player can act
   * @param {string} playerId - Player ID to check
   * @returns {boolean} True if player can act
   */
  canPlayerAct(playerId) {
    if (!this.isPhaseActive) return false;
    if (this.currentPlayer !== playerId) return false;
    if (this.passInfo[playerId + 'Passed']) return false;
    return true;
  }

  /**
   * Get current phase status
   * @returns {Object} Phase status information
   */
  getStatus() {
    return {
      isActive: this.isPhaseActive,
      phase: this.currentPhase,
      currentPlayer: this.currentPlayer,
      passInfo: { ...this.passInfo },
      isProcessingTurn: this.isProcessingTurn
    };
  }

  // --- EVENT SYSTEM ---

  /**
   * Subscribe to manager events
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Emit event to all listeners
   * @param {Object} event - Event data
   */
  emit(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in SequentialPhaseManager listener:', error);
      }
    });
  }

  /**
   * Force end the current phase (emergency use)
   */
  forceEndPhase() {
    console.warn('⚠️ Force ending sequential phase');
    this.cleanupPhase();
  }
}

// Create singleton instance
const sequentialPhaseManager = new SequentialPhaseManager();

export default sequentialPhaseManager;