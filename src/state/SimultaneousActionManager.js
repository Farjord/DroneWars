// ========================================
// SIMULTANEOUS ACTION MANAGER
// ========================================
// Pure commitment coordinator for simultaneous phases
// Handles player action collection, validation, and AI auto-completion

import { gameEngine } from '../logic/gameLogic.js';

/**
 * SimultaneousActionManager - Pure coordinator for simultaneous phase commitments
 */
class SimultaneousActionManager {
  constructor() {
    if (SimultaneousActionManager.instance) {
      return SimultaneousActionManager.instance;
    }
    SimultaneousActionManager.instance = this;

    // Event listeners for phase completion notifications
    this.listeners = [];

    // Internal tracking for simultaneous phase commitments
    this.phaseCommitments = {
      droneSelection: {
        player1: { completed: false, drones: [] },
        player2: { completed: false, drones: [] }
      },
      deckSelection: {
        player1: { completed: false, deck: [] },
        player2: { completed: false, deck: [] }
      },
      placement: {
        player1: { completed: false, placement: [] },
        player2: { completed: false, placement: [] }
      },
      mandatoryDiscard: {
        player1: { completed: false, discardedCards: [] },
        player2: { completed: false, discardedCards: [] }
      },
      optionalDiscard: {
        player1: { completed: false, discardedCards: [] },
        player2: { completed: false, discardedCards: [] }
      },
      determineFirstPlayer: {
        player1: { completed: false, acknowledged: false },
        player2: { completed: false, acknowledged: false }
      },
      allocateShields: {
        player1: { completed: false, shieldAllocation: [] },
        player2: { completed: false, shieldAllocation: [] }
      },
      mandatoryDroneRemoval: {
        player1: { completed: false, removedDrones: [] },
        player2: { completed: false, removedDrones: [] }
      }
    };

    // References to external systems (injected later)
    this.gameStateManager = null;
    this.aiPhaseProcessor = null;
    this.isMultiplayer = false;

    console.log('🤝 SimultaneousActionManager initialized');
  }

  /**
   * Initialize with external system references
   * @param {Object} gameStateManager - GameStateManager instance
   * @param {Object} aiPhaseProcessor - AI processing system
   * @param {Function} isMultiplayerFn - Function to check if game is multiplayer
   */
  initialize(gameStateManager, aiPhaseProcessor, isMultiplayerFn) {
    this.gameStateManager = gameStateManager;
    this.aiPhaseProcessor = aiPhaseProcessor;
    this.isMultiplayer = isMultiplayerFn;
    console.log('🔧 SimultaneousActionManager initialized with external systems');
  }

  /**
   * Subscribe to phase completion events
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
   * @param {string} eventType - Type of event ('playerCompleted' | 'phaseCompleted')
   * @param {Object} data - Event data
   */
  emit(eventType, data) {
    console.log(`🔔 SimultaneousActionManager emitting: ${eventType}`, data);
    this.listeners.forEach(listener => {
      try {
        listener({ type: eventType, ...data });
      } catch (error) {
        console.error('SimultaneousActionManager listener error:', error);
      }
    });
  }

  /**
   * Submit drone selection for a player during droneSelection phase
   * @param {string} playerId - The player ID submitting the selection
   * @param {Array} selectedDrones - Array of selected drone objects
   * @returns {Object} Submission result with success flag and data
   */
  submitDroneSelection(playerId, selectedDrones) {
    console.log(`🚀 SimultaneousActionManager.submitDroneSelection: ${playerId} submitting ${selectedDrones.length} drones`);

    return this.commitPlayerAction(playerId, 'droneSelection', {
      drones: selectedDrones
    }, {
      validate: (data) => data.drones.length === 5,
      errorMessage: 'Must select exactly 5 drones'
    });
  }

  /**
   * Submit deck selection for a player during deckSelection phase
   * @param {string} playerId - The player ID submitting the selection
   * @param {Array} selectedDeck - Array of selected card objects
   * @returns {Object} Submission result with success flag and data
   */
  submitDeckSelection(playerId, selectedDeck) {
    console.log(`🚀 SimultaneousActionManager.submitDeckSelection: ${playerId} submitting deck with ${selectedDeck.length} cards`);

    return this.commitPlayerAction(playerId, 'deckSelection', {
      deck: selectedDeck
    }, {
      validate: (data) => data.deck && data.deck.length > 0,
      errorMessage: 'Must select a deck with at least 1 card'
    });
  }

  /**
   * Submit ship placement for a player during placement phase
   * @param {string} playerId - The player ID submitting the placement
   * @param {Array} placedSections - Array of placed ship sections
   * @returns {Object} Submission result with success flag and data
   */
  submitPlacement(playerId, placedSections) {
    console.log(`🚀 SimultaneousActionManager.submitPlacement: ${playerId} submitting placement with ${placedSections.length} sections`);

    return this.commitPlayerAction(playerId, 'placement', {
      placement: placedSections
    }, {
      validate: (data) => !data.placement.some(section => section === null || section === undefined),
      errorMessage: 'All ship sections must be placed before confirming'
    });
  }


  /**
   * Submit mandatory discard for a player
   * @param {string} playerId - The player ID submitting the discard
   * @param {Array} discardedCards - Array of discarded card objects
   * @returns {Object} Submission result
   */
  submitMandatoryDiscard(playerId, discardedCards) {
    console.log(`🚀 SimultaneousActionManager.submitMandatoryDiscard: ${playerId} discarding ${discardedCards.length} cards`);

    return this.commitPlayerAction(playerId, 'mandatoryDiscard', {
      discardedCards
    }, {
      validate: (data) => Array.isArray(data.discardedCards),
      errorMessage: 'Invalid discard data'
    });
  }

  /**
   * Submit optional discard for a player
   * @param {string} playerId - The player ID submitting the discard
   * @param {Array} discardedCards - Array of cards to discard (can be empty)
   * @returns {Object} Submission result
   */
  submitOptionalDiscard(playerId, discardedCards) {
    console.log(`🚀 SimultaneousActionManager.submitOptionalDiscard: ${playerId} discarding ${discardedCards.length} cards`);

    return this.commitPlayerAction(playerId, 'optionalDiscard', {
      discardedCards
    }, {
      validate: (data) => Array.isArray(data.discardedCards),
      errorMessage: 'Invalid optional discard data'
    });
  }

  /**
   * Submit shield allocation for a player
   * @param {string} playerId - The player ID submitting the allocation
   * @param {Array} shieldAllocation - Array of shield allocation data
   * @returns {Object} Submission result
   */
  submitShieldAllocation(playerId, shieldAllocation) {
    console.log(`🚀 SimultaneousActionManager.submitShieldAllocation: ${playerId} allocating shields`);

    return this.commitPlayerAction(playerId, 'allocateShields', {
      shieldAllocation
    }, {
      validate: (data) => Array.isArray(data.shieldAllocation),
      errorMessage: 'Invalid shield allocation data'
    });
  }

  /**
   * Allocate a single shield to a section during allocateShields phase
   * @param {string} playerId - The player ID allocating the shield
   * @param {string} sectionName - Section to allocate shield to
   * @returns {Object} Allocation result
   */
  allocateShieldToSection(playerId, sectionName) {
    console.log(`🛡️ SimultaneousActionManager.allocateShieldToSection: ${playerId} allocating shield to ${sectionName}`);

    const currentState = this.gameStateManager.getState();

    // Use gameLogic to process the shield allocation
    const result = gameEngine.processShieldAllocation(currentState, playerId, sectionName);

    if (result.success) {
      // Update player state with new shield allocation
      this.gameStateManager.updatePlayerState(playerId, result.newPlayerState);

      // Update shields to allocate count
      this.gameStateManager.updateState({
        shieldsToAllocate: result.newShieldsToAllocate
      });

      console.log(`✅ Shield allocated to ${sectionName} for ${playerId}`);
      return { success: true, result };
    } else {
      console.log(`❌ Shield allocation failed: ${result.error}`);
      return { success: false, error: result.error };
    }
  }

  /**
   * Reset shield allocation for a player during allocateShields phase
   * @param {string} playerId - The player ID resetting allocation
   * @returns {Object} Reset result
   */
  resetShieldAllocation(playerId) {
    console.log(`🔄 SimultaneousActionManager.resetShieldAllocation: ${playerId} resetting shields`);

    const currentState = this.gameStateManager.getState();

    // Use gameLogic to process the reset
    const result = gameEngine.processResetShieldAllocation(currentState, playerId);

    if (result.success) {
      // Update player state with reset shield allocation
      this.gameStateManager.updatePlayerState(playerId, result.newPlayerState);

      // Update shields to allocate count
      this.gameStateManager.updateState({
        shieldsToAllocate: result.newShieldsToAllocate
      });

      console.log(`✅ Shield allocation reset for ${playerId}`);
      return { success: true, result };
    } else {
      console.log(`❌ Shield allocation reset failed: ${result.error}`);
      return { success: false, error: result.error };
    }
  }

  /**
   * End shield allocation phase for local player
   * @param {string} playerId - The player ID ending allocation (usually local player)
   * @returns {Object} End result with phase transition
   */
  endShieldAllocation(playerId) {
    console.log(`🏁 SimultaneousActionManager.endShieldAllocation: ${playerId} ending allocation phase`);

    const currentState = this.gameStateManager.getState();

    // Use gameLogic to process the end allocation (includes AI completion)
    const result = gameEngine.processEndShieldAllocation(currentState, playerId);

    if (result.success) {
      // Update both player states
      this.gameStateManager.setPlayerStates(result.player1State, result.player2State);

      // Phase transitions and player determination are handled by GameFlowManager
      // SimultaneousActionManager only handles player state updates from phase results

      console.log(`✅ Shield allocation ended, transitioning to ${result.newPhase || 'next phase'}`);
      return { success: true, result };
    } else {
      console.log(`❌ Shield allocation end failed: ${result.error}`);
      return { success: false, error: result.error };
    }
  }

  /**
   * Submit mandatory drone removal for a player
   * @param {string} playerId - The player ID submitting the removal
   * @param {Array} removedDrones - Array of removed drone objects
   * @returns {Object} Submission result
   */
  submitMandatoryDroneRemoval(playerId, removedDrones) {
    console.log(`🚀 SimultaneousActionManager.submitMandatoryDroneRemoval: ${playerId} removing ${removedDrones.length} drones`);

    return this.commitPlayerAction(playerId, 'mandatoryDroneRemoval', {
      removedDrones
    }, {
      validate: (data) => Array.isArray(data.removedDrones),
      errorMessage: 'Invalid drone removal data'
    });
  }

  /**
   * Acknowledge first player determination
   * @param {string} playerId - The player ID acknowledging
   * @returns {Object} Acknowledgment result
   */
  acknowledgeFirstPlayer(playerId) {
    console.log(`🎯 SimultaneousActionManager.acknowledgeFirstPlayer: ${playerId} acknowledging first player`);

    return this.commitPlayerAction(playerId, 'determineFirstPlayer', {
      acknowledged: true
    });
  }

  /**
   * Initialize first player determination phase
   * Called when the phase starts to process the determination
   * @returns {Object} First player result for UI
   */
  async initializeFirstPlayerPhase() {
    console.log('🎯 SimultaneousActionManager.initializeFirstPlayerPhase: Processing first player determination');

    const firstPlayerResult = await this.processFirstPlayerDetermination();
    return firstPlayerResult;
  }

  /**
   * Process first player determination logic
   * @private
   * @returns {Object} First player result
   */
  async processFirstPlayerDetermination() {
    try {
      // Import first player utilities
      const { processFirstPlayerDetermination } = await import('../utils/firstPlayerUtils.js');

      if (!this.gameStateManager) {
        console.error('❌ GameStateManager not available for first player determination');
        return;
      }

      // Get current game state
      const currentGameState = this.gameStateManager.getState();

      // Process first player determination
      const firstPlayerResult = processFirstPlayerDetermination(currentGameState);

      // State updates are handled by GameFlowManager when transitioning to determineFirstPlayer phase
      // SimultaneousActionManager only calculates and returns the result

      console.log('✅ First player determination completed');
      return firstPlayerResult;

    } catch (error) {
      console.error('❌ Error during first player determination:', error);
      return null;
    }
  }

  /**
   * Generic method to commit player action for any simultaneous phase
   * @param {string} playerId - The player ID
   * @param {string} phase - The phase name
   * @param {Object} actionData - The action data to commit
   * @param {Object} options - Validation options
   * @returns {Object} Commitment result
   */
  commitPlayerAction(playerId, phase, actionData, options = {}) {
    // Validation
    if (options.validate && !options.validate(actionData)) {
      return {
        success: false,
        error: options.errorMessage || `Invalid data for ${phase}`,
        data: actionData
      };
    }

    // Store commitment
    if (!this.phaseCommitments[phase]) {
      console.error(`❌ commitPlayerAction: Phase '${phase}' does not exist in phaseCommitments`);
      console.log('Available phases:', Object.keys(this.phaseCommitments));
      return {
        success: false,
        error: `Invalid phase: ${phase}`,
        data: { playerId, phase }
      };
    }

    if (!this.phaseCommitments[phase][playerId]) {
      console.error(`❌ commitPlayerAction: Player '${playerId}' does not exist in phase '${phase}'`);
      console.log(`Available players for ${phase}:`, Object.keys(this.phaseCommitments[phase]));
      return {
        success: false,
        error: `Invalid player ID: ${playerId}`,
        data: { playerId, phase }
      };
    }

    this.phaseCommitments[phase][playerId] = {
      completed: true,
      ...actionData
    };

    console.log(`✅ ${playerId} ${phase} committed:`, actionData);

    // Update GameStateManager with player's data (if specific update logic exists)
    this.updateGameStateForPhase(playerId, phase, actionData);

    // Emit player completion event
    this.emit('playerCompleted', {
      phase,
      playerId,
      data: actionData
    });

    // Auto-handle AI completion in single-player mode
    if (playerId === 'player1' && !this.isMultiplayer()) {
      console.log('🤖 Single-player mode: Triggering AI auto-completion for player2');
      this.handleAIPhaseCompletion(phase);
    }

    // Check if both players have completed
    const bothComplete = this.areBothPlayersComplete(phase);
    if (bothComplete) {
      console.log(`🎯 Both players completed ${phase}, emitting completion event`);

      this.emit('phaseCompleted', {
        phase,
        data: this.phaseCommitments[phase]
      });
    }

    return {
      success: true,
      data: {
        playerId,
        phase,
        actionData,
        bothPlayersComplete: bothComplete
      }
    };
  }

  /**
   * Update GameStateManager with phase-specific data
   * @param {string} playerId - Player ID
   * @param {string} phase - Phase name
   * @param {Object} actionData - Action data
   */
  updateGameStateForPhase(playerId, phase, actionData) {
    if (!this.gameStateManager) return;

    switch(phase) {
      case 'droneSelection':
        // Create initial drone counts for the player
        const initialCounts = {};
        actionData.drones.forEach(drone => {
          initialCounts[drone.name] = 0;
        });

        this.gameStateManager.updatePlayerState(playerId, {
          activeDronePool: actionData.drones,
          deployedDroneCounts: initialCounts
        });
        break;

      case 'deckSelection':
        this.gameStateManager.updatePlayerState(playerId, {
          deck: actionData.deck
        });
        break;

      case 'placement':
        const placementKey = playerId === 'player1' ? 'placedSections' : 'opponentPlacedSections';
        console.log(`[PLACEMENT DATA DEBUG] SimultaneousActionManager storing placement for ${playerId}:`, {
          placementKey,
          placementData: actionData.placement
        });
        this.gameStateManager.setState({
          [placementKey]: actionData.placement
        });
        break;

      case 'determineFirstPlayer':
        // No state update needed - this phase is acknowledgment only
        // First player is already set by GameFlowManager
        break;

      case 'mandatoryDiscard':
        // Handle discard logic
        break;

      case 'optionalDiscard':
        // Handle optional discard logic
        break;

      case 'allocateShields':
        // Handle shield allocation logic
        break;

      case 'mandatoryDroneRemoval':
        // Handle drone removal logic
        break;

      default:
        console.warn(`⚠️ No specific GameState update logic for phase: ${phase}`);
    }
  }

  /**
   * Handle AI phase completion in single-player mode
   * @param {string} phase - Phase name
   */
  async handleAIPhaseCompletion(phase) {
    if (!this.aiPhaseProcessor) {
      console.warn('⚠️ AI Phase Processor not available');
      return;
    }

    try {
      console.log(`🤖 Processing AI completion for phase: ${phase}`);

      let aiResult;
      switch(phase) {
        case 'droneSelection':
          aiResult = await this.aiPhaseProcessor.processDroneSelection();
          this.submitDroneSelection('player2', aiResult);
          break;

        case 'deckSelection':
          aiResult = await this.aiPhaseProcessor.processDeckSelection();
          this.submitDeckSelection('player2', aiResult);
          break;

        case 'placement':
          aiResult = await this.aiPhaseProcessor.processPlacement();
          this.submitPlacement('player2', aiResult);
          break;

        case 'mandatoryDiscard':
          // AI mandatory discard logic through AIPhaseProcessor
          const mandatoryDiscardGameState = this.gameStateManager.getState();
          aiResult = await this.aiPhaseProcessor.executeMandatoryDiscardTurn(mandatoryDiscardGameState);

          // Update AI player state if needed
          if (aiResult.updatedPlayerState) {
            this.gameStateManager.updatePlayerState('player2', aiResult.updatedPlayerState);
          }

          this.submitMandatoryDiscard('player2', aiResult.cardsToDiscard);
          break;

        case 'optionalDiscard':
          // AI optional discard logic through AIPhaseProcessor
          const gameState = this.gameStateManager.getState();
          aiResult = await this.aiPhaseProcessor.executeOptionalDiscardTurn(gameState);

          // Update AI player state with both discard and draw results
          if (aiResult.updatedPlayerState) {
            this.gameStateManager.updatePlayerState('player2', aiResult.updatedPlayerState);
          }

          this.submitOptionalDiscard('player2', aiResult.cardsToDiscard);
          break;

        case 'allocateShields':
          // AI shield allocation logic when implemented
          this.submitShieldAllocation('player2', []);
          break;

        case 'mandatoryDroneRemoval':
          // AI mandatory drone removal logic through AIPhaseProcessor
          const droneRemovalGameState = this.gameStateManager.getState();
          aiResult = await this.aiPhaseProcessor.executeMandatoryDroneRemovalTurn(droneRemovalGameState);

          // Update AI player state if needed
          if (aiResult.updatedPlayerState) {
            this.gameStateManager.updatePlayerState('player2', aiResult.updatedPlayerState);
          }

          this.submitMandatoryDroneRemoval('player2', aiResult.dronesToRemove);
          break;

        case 'determineFirstPlayer':
          // AI automatically acknowledges first player determination
          this.acknowledgeFirstPlayer('player2');
          break;

        default:
          console.warn(`⚠️ No AI handler for phase: ${phase}`);
      }

    } catch (error) {
      console.error('AI phase completion error:', error);
    }
  }

  /**
   * Check if both players have completed a phase
   * @param {string} phase - Phase name
   * @returns {boolean} True if both players completed
   */
  areBothPlayersComplete(phase) {
    const commitments = this.phaseCommitments[phase];
    if (!commitments) {
      console.log(`❌ No commitments found for phase: ${phase}`);
      return false;
    }

    const player1Complete = commitments.player1.completed;
    const player2Complete = commitments.player2.completed;
    const bothComplete = player1Complete && player2Complete;

    console.log(`🔍 Phase '${phase}' completion check: player1=${player1Complete}, player2=${player2Complete}, both=${bothComplete}`);

    return bothComplete;
  }

  /**
   * Get current phase commitment status
   * @param {string} phase - Phase name
   * @returns {Object} Current commitment status
   */
  getPhaseCommitmentStatus(phase) {
    return {
      phase,
      commitments: this.phaseCommitments[phase] || {},
      bothComplete: this.areBothPlayersComplete(phase)
    };
  }

  /**
   * Reset phase commitments for a specific phase or all phases
   * @param {string} phase - Optional phase name, if not provided resets all
   */
  resetPhaseCommitments(phase = null) {
    if (phase) {
      if (this.phaseCommitments[phase]) {
        this.phaseCommitments[phase].player1 = { completed: false };
        this.phaseCommitments[phase].player2 = { completed: false };
        console.log(`🔄 Reset commitments for phase: ${phase}`);
      }
    } else {
      // Reset all phases
      Object.keys(this.phaseCommitments).forEach(phaseName => {
        this.phaseCommitments[phaseName].player1 = { completed: false };
        this.phaseCommitments[phaseName].player2 = { completed: false };
      });
      console.log('🔄 Reset all phase commitments');
    }
  }

  /**
   * Get debug information about current commitments
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      commitments: this.phaseCommitments,
      systemsConnected: {
        gameStateManager: !!this.gameStateManager,
        aiPhaseProcessor: !!this.aiPhaseProcessor
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const simultaneousActionManager = new SimultaneousActionManager();

export default simultaneousActionManager;