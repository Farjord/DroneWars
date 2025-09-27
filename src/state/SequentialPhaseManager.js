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

    // Phase transition detected
    if (state.turnPhase !== this.currentPhase) {
      if (isSequentialPhase && !this.isPhaseActive) {
        this.initializePhase(state.turnPhase, state.currentPlayer);
      } else if (!isSequentialPhase && this.isPhaseActive) {
        this.cleanupPhase();
      }
    }

    // Turn change detected within active phase
    if (this.isPhaseActive && state.currentPlayer !== this.currentPlayer) {
      this.onTurnChange(state.currentPlayer);
    }

    // Pass info update detected
    if (this.isPhaseActive && state.passInfo) {
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

    // Reset pass info for new phase
    this.passInfo = {
      player1Passed: false,
      player2Passed: false,
      firstPasser: null
    };

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

      // Let AIPhaseProcessor handle everything (decision + execution)
      let result;
      if (this.currentPhase === 'deployment') {
        result = await this.aiPhaseProcessor.executeDeploymentTurn(state);
      } else if (this.currentPhase === 'action') {
        result = await this.aiPhaseProcessor.executeActionTurn(state);
      } else {
        console.error(`❌ Unknown sequential phase: ${this.currentPhase}`);
        // Force pass for unknown phases
        result = await this.aiPhaseProcessor.executePass(this.currentPhase);
      }

      console.log('🤖 AI turn completed:', result);

      // Emit completion event for UI updates
      this.emit({
        type: 'ai_turn_completed',
        phase: this.currentPhase,
        result: result
      });

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
    }
  }

  /**
   * Process player pass
   * @param {string} playerId - Player who is passing
   */
  async processPlayerPass(playerId) {
    console.log(`🏳️ SequentialPhaseManager: ${playerId} passed`);

    // Update pass info
    const wasFirstToPass = !this.passInfo.player1Passed && !this.passInfo.player2Passed;
    this.passInfo[playerId + 'Passed'] = true;
    if (wasFirstToPass) {
      this.passInfo.firstPasser = playerId;
    }

    // Update GameStateManager
    this.gameStateManager.setPassInfo(this.passInfo);

    // Emit pass event
    this.emit({
      type: 'player_passed',
      player: playerId,
      phase: this.currentPhase,
      firstPasser: this.passInfo.firstPasser
    });

    // Check if phase should end
    await this.checkPhaseCompletion();
  }

  /**
   * Check if phase should complete (both players passed)
   */
  async checkPhaseCompletion() {
    if (this.passInfo.player1Passed && this.passInfo.player2Passed) {
      console.log(`✅ Both players passed - ${this.currentPhase} phase complete`);

      // Emit phase completion event
      this.emit({
        type: 'phase_completed',
        phase: this.currentPhase,
        firstPasser: this.passInfo.firstPasser
      });

      // Trigger phase transition through ActionProcessor
      let nextPhase;
      if (this.currentPhase === 'deployment') {
        nextPhase = 'action';
      } else if (this.currentPhase === 'action') {
        nextPhase = 'roundEnd';
      }

      if (nextPhase) {
        await this.actionProcessor.queueAction({
          type: 'phaseTransition',
          payload: { newPhase: nextPhase }
        });
      }

      // Clean up this phase
      this.cleanupPhase();
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