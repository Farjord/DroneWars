// ========================================
// PHASE MANAGER
// ========================================
// Central authority on phase types and action routing decisions
// Determines whether actions should go through ActionProcessor or direct updates

// Phase type constants
const SIMULTANEOUS_PHASES = [
  'preGame',
  'droneSelection',
  'deckSelection',
  'deckBuilding',
  'placement',
  'initialDraw',
  'allocateShields',
  'optionalDiscard'
];

const SEQUENTIAL_PHASES = [
  'deployment',
  'action'
];

/**
 * PhaseManager - Singleton for phase type detection, action routing, and simultaneous phase commitment
 */
class PhaseManager {
  constructor() {
    if (PhaseManager.instance) {
      return PhaseManager.instance;
    }
    PhaseManager.instance = this;

    // Event listeners for phase completion notifications
    this.listeners = [];

    // Internal tracking for simultaneous phase commitments
    this.phaseCommitments = {
      droneSelection: {
        player1: { completed: false, drones: [] },
        player2: { completed: false, drones: [] }
      },
      // Future phases can be added here
      deckSelection: {
        player1: { completed: false, deck: [] },
        player2: { completed: false, deck: [] }
      },
      placement: {
        player1: { completed: false, sections: [] },
        player2: { completed: false, sections: [] }
      }
    };

    // References to external systems (injected later)
    this.gameStateManager = null;
    this.aiPhaseProcessor = null;
    this.isMultiplayer = false;
  }

  /**
   * Check if a phase allows simultaneous player actions
   * @param {string} phase - The current game phase
   * @returns {boolean} True if phase is simultaneous
   */
  isSimultaneousPhase(phase) {
    return SIMULTANEOUS_PHASES.includes(phase);
  }

  /**
   * Check if a phase requires sequential player actions
   * @param {string} phase - The current game phase
   * @returns {boolean} True if phase is sequential
   */
  isSequentialPhase(phase) {
    return SEQUENTIAL_PHASES.includes(phase);
  }

  /**
   * Determine if an action should go through ActionProcessor
   * @param {string} phase - The current game phase
   * @param {string} actionType - The type of action being performed
   * @returns {boolean} True if should use ActionProcessor
   */
  shouldUseActionProcessor(phase, actionType) {
    // Sequential phases always use ActionProcessor
    if (this.isSequentialPhase(phase)) {
      return true;
    }

    // Special case: Shield reallocation during action phase uses ActionProcessor
    if (phase === 'action' && this.isShieldReallocationAction(actionType)) {
      return true;
    }

    // All simultaneous phases use direct updates
    return false;
  }

  /**
   * Check if action is specifically shield reallocation (action phase ability)
   * @param {string} actionType - The action type to check
   * @returns {boolean} True if shield reallocation action
   */
  isShieldReallocationAction(actionType) {
    const reallocationActions = [
      'reallocateShields',
      'moveShield',
      'redistributeShields'
    ];
    return reallocationActions.some(action =>
      actionType.toLowerCase().includes(action.toLowerCase())
    );
  }

  /**
   * Get the routing strategy for an action
   * @param {string} phase - The current game phase
   * @param {string} actionType - The type of action being performed
   * @returns {string} 'sequential' | 'simultaneous'
   */
  getActionRouting(phase, actionType) {
    return this.shouldUseActionProcessor(phase, actionType) ? 'sequential' : 'simultaneous';
  }

  /**
   * Check if action is a shield-related action
   * @param {string} actionType - The action type to check
   * @returns {boolean} True if shield-related action
   */
  isShieldAction(actionType) {
    const shieldActions = [
      'allocateShield',
      'reallocateShields',
      'shieldAllocation',
      'moveShield',
      'redistributeShields'
    ];
    return shieldActions.some(action =>
      actionType.toLowerCase().includes(action.toLowerCase())
    );
  }

  /**
   * Get debug information about routing decision
   * @param {string} phase - The current game phase
   * @param {string} actionType - The action type
   * @returns {Object} Debug information
   */
  getRoutingDebugInfo(phase, actionType) {
    const isSequential = this.isSequentialPhase(phase);
    const isSimultaneous = this.isSimultaneousPhase(phase);
    const shouldUseProcessor = this.shouldUseActionProcessor(phase, actionType);
    const routing = this.getActionRouting(phase, actionType);

    return {
      phase,
      actionType,
      phaseType: {
        isSequential,
        isSimultaneous,
        category: isSequential ? 'sequential' : 'simultaneous'
      },
      routing: {
        strategy: routing,
        shouldUseActionProcessor: shouldUseProcessor,
        recommendedPath: shouldUseProcessor ? 'processAction()' : 'updateGameState()'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initialize PhaseManager with external system references
   * @param {Object} gameStateManager - GameStateManager instance
   * @param {Object} aiPhaseProcessor - AI processing system
   * @param {Function} isMultiplayerFn - Function to check if game is multiplayer
   */
  initialize(gameStateManager, aiPhaseProcessor, isMultiplayerFn) {
    this.gameStateManager = gameStateManager;
    this.aiPhaseProcessor = aiPhaseProcessor;
    this.isMultiplayer = isMultiplayerFn;
    console.log('🔧 PhaseManager initialized with external systems');
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
    console.log(`🔔 PhaseManager emitting: ${eventType}`, data);
    this.listeners.forEach(listener => {
      try {
        listener({ type: eventType, ...data });
      } catch (error) {
        console.error('PhaseManager listener error:', error);
      }
    });
  }

  /**
   * Start a simultaneous phase - handle AI auto-completion if single-player
   * @param {string} phase - Phase name ('droneSelection' | 'deckSelection' | 'placement')
   */
  startSimultaneousPhase(phase) {
    console.log(`🚀 PhaseManager.startSimultaneousPhase: ${phase}`);

    // Reset phase commitments
    if (this.phaseCommitments[phase]) {
      this.phaseCommitments[phase].player1 = { completed: false, drones: [], deck: [], sections: [] };
      this.phaseCommitments[phase].player2 = { completed: false, drones: [], deck: [], sections: [] };
    }

    // Auto-handle AI in single-player mode
    if (!this.isMultiplayer()) {
      console.log('🤖 Single-player mode detected, triggering AI auto-completion for player2');
      this.handleAIPhaseCompletion(phase);
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

      if (phase === 'droneSelection') {
        const aiDroneSelection = await this.aiPhaseProcessor.processDroneSelection();
        this.submitDroneSelection('player2', aiDroneSelection);
      }
      // Future phases can be handled here

    } catch (error) {
      console.error('AI phase completion error:', error);
    }
  }

  /**
   * Submit drone selection for a player during droneSelection phase
   * @param {string} playerId - The player ID submitting the selection
   * @param {Array} selectedDrones - Array of selected drone objects
   * @returns {Object} Submission result with success flag and data
   */
  submitDroneSelection(playerId, selectedDrones) {
    console.log(`🚀 PhaseManager.submitDroneSelection: ${playerId} submitting ${selectedDrones.length} drones`);

    // Validation
    if (selectedDrones.length !== 5) {
      return {
        success: false,
        error: 'Must select exactly 5 drones',
        data: { selectedCount: selectedDrones.length }
      };
    }

    // Store commitment
    const phase = 'droneSelection';
    if (!this.phaseCommitments[phase] || !this.phaseCommitments[phase][playerId]) {
      return {
        success: false,
        error: `Invalid player ID: ${playerId}`,
        data: { playerId }
      };
    }

    this.phaseCommitments[phase][playerId] = {
      completed: true,
      drones: selectedDrones
    };

    const droneNames = selectedDrones.map(d => d.name).join(', ');
    console.log(`✅ ${playerId} drone selection committed: ${droneNames}`);

    // Emit player completion event
    this.emit('playerCompleted', {
      phase,
      playerId,
      data: { selectedDrones, droneNames }
    });

    // Check if both players have completed
    const bothComplete = this.areBothPlayersComplete(phase);
    if (bothComplete) {
      console.log('🎯 Both players completed drone selection, committing to GameState');
      this.commitDroneSelectionToGameState();

      this.emit('phaseCompleted', {
        phase,
        data: this.phaseCommitments[phase]
      });
    }

    return {
      success: true,
      data: {
        playerId,
        selectedDrones,
        droneNames,
        phase,
        bothPlayersComplete: bothComplete
      }
    };
  }

  /**
   * Check if both players have completed a phase
   * @param {string} phase - Phase name
   * @returns {boolean} True if both players completed
   */
  areBothPlayersComplete(phase) {
    const commitments = this.phaseCommitments[phase];
    if (!commitments) return false;

    return commitments.player1.completed && commitments.player2.completed;
  }

  /**
   * Commit drone selection to GameStateManager when both players complete
   */
  commitDroneSelectionToGameState() {
    if (!this.gameStateManager) {
      console.error('❌ GameStateManager not available for commitment');
      return;
    }

    const phase = 'droneSelection';
    const commitments = this.phaseCommitments[phase];

    if (!this.areBothPlayersComplete(phase)) {
      console.warn('⚠️ Attempting to commit before both players complete');
      return;
    }

    try {
      console.log('💾 Committing drone selections to GameStateManager');

      // Create initial drone counts for both players
      const player1InitialCounts = {};
      commitments.player1.drones.forEach(drone => {
        player1InitialCounts[drone.name] = 0;
      });

      const player2InitialCounts = {};
      commitments.player2.drones.forEach(drone => {
        player2InitialCounts[drone.name] = 0;
      });

      // Update both players' state
      this.gameStateManager.updatePlayerState('player1', {
        activeDronePool: commitments.player1.drones,
        deployedDroneCounts: player1InitialCounts
      });

      this.gameStateManager.updatePlayerState('player2', {
        activeDronePool: commitments.player2.drones,
        deployedDroneCounts: player2InitialCounts
      });

      // Add system log entries
      const player1Names = commitments.player1.drones.map(d => d.name).join(', ');
      const player2Names = commitments.player2.drones.map(d => d.name).join(', ');

      this.gameStateManager.addLogEntry({
        player: 'SYSTEM',
        actionType: 'DRONE_SELECTION',
        source: 'PhaseManager',
        target: 'Both Players',
        outcome: `Player1 selected: ${player1Names}. Player2 selected: ${player2Names}.`
      }, 'commitDroneSelectionToGameState');

      console.log('✅ Drone selections committed successfully');

    } catch (error) {
      console.error('❌ Error committing drone selections:', error);
    }
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
   * Reset phase commitments (useful for game restart)
   * @param {string} phase - Optional phase name, if not provided resets all
   */
  resetPhaseCommitments(phase = null) {
    if (phase) {
      if (this.phaseCommitments[phase]) {
        this.phaseCommitments[phase].player1 = { completed: false, drones: [], deck: [], sections: [] };
        this.phaseCommitments[phase].player2 = { completed: false, drones: [], deck: [], sections: [] };
        console.log(`🔄 Reset commitments for phase: ${phase}`);
      }
    } else {
      // Reset all phases
      Object.keys(this.phaseCommitments).forEach(phaseName => {
        this.phaseCommitments[phaseName].player1 = { completed: false, drones: [], deck: [], sections: [] };
        this.phaseCommitments[phaseName].player2 = { completed: false, drones: [], deck: [], sections: [] };
      });
      console.log('🔄 Reset all phase commitments');
    }
  }
}

// Create singleton instance
const phaseManager = new PhaseManager();

export default phaseManager;