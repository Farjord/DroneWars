// ========================================
// GAME STATE MANAGER
// ========================================
// Centralized game state management for multiplayer support.
// Separates core game state from UI state and provides event-driven updates.

import { gameEngine, startingDecklist } from '../logic/gameLogic.js';
import ActionProcessor from './ActionProcessor.js';
import GameDataService from '../services/GameDataService.js';
import GuestMessageQueueService from './GuestMessageQueueService.js';
import fullDroneCollection from '../data/droneData.js';
import { initializeDroneSelection } from '../utils/droneSelectionUtils.js';
import { debugLog } from '../utils/debugLogger.js';
// PhaseManager dependency removed - using direct phase checks

class GameStateManager {
  constructor() {
    debugLog('STATE_SYNC', '🔄 GAMESTATE INITIALIZATION: Creating new GameStateManager instance');

    // Event listeners for state changes
    this.listeners = new Set();

    // Optimistic action tracking for client-side prediction (guest mode)
    this.optimisticActions = [];
    this.optimisticActionTimeout = 5000; // Clear after 5 seconds (covers longest animation sequences + network latency)

    // Core application state (minimal until game starts)
    this.state = {
      // --- APPLICATION STATE ---
      appState: 'menu', // 'menu', 'inGame', 'gameOver'

      // --- MULTIPLAYER STATE ---
      isConnected: false,
      opponentId: null,
      gameMode: 'local', // 'local', 'host', 'guest'

      // --- TESTING MODE ---
      testMode: false, // Indicates if this is a test game (bypasses normal flow)

      // --- GAME STATE (null until game starts) ---
      gameActive: false,
      turnPhase: null,
      turn: null,
      currentPlayer: null,
      firstPlayerOfRound: null,
      firstPasserOfPreviousRound: null,
      firstPlayerOverride: null,
      passInfo: null,
      winner: null,
      player1: null,
      player2: null,
      placedSections: [],
      opponentPlacedSections: [],
      unplacedSections: [],
      shieldsToAllocate: 0,
      droneSelectionPool: [],
      droneSelectionTrio: [],
      gameLog: [],

      // --- GAME FLOW METADATA (owned by GameFlowManager) ---
      gameStage: 'preGame', // 'preGame', 'roundLoop', 'gameOver'
      roundNumber: 0,

      // --- COMMITMENTS (for simultaneous phases) ---
      commitments: {},
    };

    // Initialize action processor using singleton pattern
    this.actionProcessor = ActionProcessor.getInstance(this);

    // Game flow manager reference (set during initialization)
    this.gameFlowManager = null;

    // Guest message queue service (initialized when guest joins)
    this.guestQueueService = null;

    // P2P integration will be set up lazily when needed
    this.p2pIntegrationSetup = false;

    // Log initial application state
    debugLog('STATE_SYNC', '🔄 GAMESTATE INITIALIZATION: GameStateManager created');
    debugLog('STATE_SYNC', '📱 App State:', this.state.appState);
    debugLog('STATE_SYNC', '🎮 Game Active:', this.state.gameActive);
    debugLog('STATE_SYNC', '✅ GAMESTATE INITIALIZATION: GameStateManager ready (no game active)');
  }

  // --- MANAGER REFERENCES ---

  /**
   * Set the GameFlowManager reference
   * @param {Object} gameFlowManager - GameFlowManager instance
   */
  setGameFlowManager(gameFlowManager) {
    this.gameFlowManager = gameFlowManager;
  }

  // --- P2P INTEGRATION ---

  /**
   * Set up P2P integration (called lazily when needed)
   * @param {Object} p2pManager - P2P manager instance
   */
  setupP2PIntegration(p2pManager) {
    if (this.p2pIntegrationSetup) return;

    // Wire up bidirectional integration
    this.actionProcessor.setP2PManager(p2pManager);
    p2pManager.setActionProcessor(this.actionProcessor);

    // Subscribe to P2P events
    p2pManager.subscribe((event) => {
      switch (event.type) {
        case 'multiplayer_mode_change':
          this.setMultiplayerMode(event.data.mode, event.data.isHost);

          // Initialize guest queue service when becoming guest
          if (event.data.mode === 'guest' && !this.guestQueueService) {
            debugLog('STATE_SYNC', '🎯 [GUEST QUEUE] Initializing service for guest mode');
            this.guestQueueService = new GuestMessageQueueService(this);
            this.guestQueueService.initialize(p2pManager);
          }
          break;
        case 'state_update_received':
          // Guest mode: Route through queue service for sequential processing
          // Host mode: Not applicable (host doesn't receive state updates)
          if (this.state.gameMode === 'guest') {
            if (this.guestQueueService) {
              // Queue service handles this - no need to do anything here
              // Service is already subscribed to P2P events
            } else {
              console.warn('⚠️ [GUEST QUEUE] Service not initialized, applying state directly (fallback)');
              this.applyHostState(event.data.state);
              // Note: Animations will be lost in fallback mode
            }
          }
          break;
        case 'state_sync_requested':
          // Send current state for initial sync (deprecated, kept for compatibility)
          const currentState = this.getState();
          p2pManager.sendData({
            type: 'GAME_STATE_SYNC',
            state: currentState,
            timestamp: Date.now(),
          });
          break;
      }
    });

    this.p2pIntegrationSetup = true;
  }

  /**
   * Apply state update from host (guest only)
   * Guest is a thin client that receives authoritative state from host
   * NOTE: Animations are handled by GuestMessageQueueService after render
   * @param {Object} hostState - Complete game state from host
   */
  applyHostState(hostState) {
    if (this.state.gameMode !== 'guest') {
      console.warn('⚠️ applyHostState should only be called in guest mode');
      return;
    }

    debugLog('STATE_SYNC', '[GUEST STATE UPDATE] Applying state from host:', {
      turnPhase: hostState.turnPhase,
      currentPlayer: hostState.currentPlayer,
      roundNumber: hostState.roundNumber
    });

    debugLog('STATE_SYNC', '[GUEST] Received player2 hand from host:', {
      handSize: hostState.player2?.hand?.length || 0,
      sampleCard: hostState.player2?.hand?.[0] || null,
      sampleInstanceId: hostState.player2?.hand?.[0]?.instanceId,
      hasInstanceId: hostState.player2?.hand?.[0]?.instanceId !== undefined
    });

    // Preserve guest's local gameMode (guest must know it's the guest)
    const localGameMode = this.state.gameMode;

    // Guest directly applies host's authoritative state without validation
    // No game logic execution on guest side
    this.state = { ...hostState };

    // Restore guest's gameMode so it knows which player it controls
    this.state.gameMode = localGameMode;

    debugLog('STATE_SYNC', '[GUEST] After applying state - player2 hand check:', {
      handSize: this.state.player2?.hand?.length || 0,
      sampleCard: this.state.player2?.hand?.[0] || null,
      sampleInstanceId: this.state.player2?.hand?.[0]?.instanceId,
      hasInstanceId: this.state.player2?.hand?.[0]?.instanceId !== undefined
    });

    // Emit state change for UI updates (triggers React re-render)
    this.emit('HOST_STATE_UPDATE', { hostState });

    // Animations are executed by GuestMessageQueueService after React renders
  }

  // --- EVENT SYSTEM ---

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function called when state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   * @param {string} type - Type of change
   * @param {Object} payload - Additional data
   */
  emit(type, payload = {}) {
    this.listeners.forEach(listener => {
      try {
        listener({ type, payload, state: this.getState() });
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  // --- STATE ACCESS ---

  /**
   * Get current state (read-only)
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get specific state property
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Update state and notify listeners
   * @param {Object} updates - State updates to apply
   * @param {string} eventType - Type of event for logging
   * @param {string} context - Context of the update for validation (e.g., 'phaseTransition')
   */
  setState(updates, eventType = 'STATE_UPDATE', context = null) {
    const prevState = { ...this.state };

    // Extract caller information from stack trace for detailed logging
    const stack = new Error().stack;
    const stackLines = stack ? stack.split('\n') : [];
    const callerInfo = this.extractCallerInfo(stackLines);

    // Check for architecture violations - App.jsx should NEVER directly update GameStateManager
    // However, App.jsx can call ActionProcessor/PhaseManager which then update GameStateManager
    const isAppJsxCaller = stackLines.some(line => line.includes('App.jsx'));
    const isViaActionProcessor = stackLines.some(line => line.includes('ActionProcessor'));
    const isViaPhaseManager = stackLines.some(line => line.includes('PhaseManager'));
    const isLegitimateCall = isViaActionProcessor || isViaPhaseManager;

    if (isAppJsxCaller && !isLegitimateCall) {
      console.error('🚨 ARCHITECTURE VIOLATION: App.jsx is directly updating GameStateManager!');
      console.error('📋 App.jsx should only call ActionProcessor or PhaseManager methods');
      console.error('🔍 Stack trace:', stack);
    }

    // Comprehensive state change logging
    const updateKeys = Object.keys(updates);
    const caller = `${callerInfo.primaryCaller} in ${callerInfo.primaryFile}`;

    debugLog('STATE_SYNC', `🔍 GAMESTATE CHANGE [${eventType}] from ${caller}:`, {
      changedKeys: updateKeys,
      allUpdates: updates,
      architectureViolation: isAppJsxCaller && !isLegitimateCall
    });

    // Special detailed logging for player state changes (skip during initialization)
    const isInitializationEvent = ['GAME_RESET', 'INITIALIZATION'].includes(eventType);
    if ((updates.player1 || updates.player2) && !isInitializationEvent) {
      this.logPlayerStateChanges(updates, prevState, caller, eventType);
    }

    // Log other critical state changes
    updateKeys.forEach(key => {
      if (!['player1', 'player2'].includes(key)) {
        const oldValue = prevState[key];
        const newValue = updates[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          debugLog('STATE_SYNC', `🔍 STATE CHANGE: ${key}`, {
            before: oldValue,
            after: newValue,
            caller: caller,
            eventType: eventType
          });
        }
      }
    });

    // Validate state consistency before update
    this.validateStateUpdate(updates, prevState, context);

    this.state = { ...this.state, ...updates };
    this.emit(eventType, { updates, prevState });
  }

  /**
   * Validate state updates for consistency and race conditions
   * @param {Object} updates - State updates being applied
   * @param {Object} prevState - Previous state before updates
   * @param {string} context - Context of the update (e.g., 'phaseTransition')
   */
  validateStateUpdate(updates, prevState, context = null) {
    // Get the current call stack to see if this update is coming from ActionProcessor
    const stack = new Error().stack;
    const isFromActionProcessor = stack && stack.includes('ActionProcessor');

    // Check for concurrent action processing - only warn about external updates
    // ActionProcessor is allowed to update state during action processing
    // GameFlowManager is allowed to update phase transitions as legitimate side effects
    if (this.actionProcessor.isActionInProgress() && Object.keys(updates).length > 0) {
      if (!isFromActionProcessor) {
        const dangerousUpdates = ['player1', 'player2', 'turnPhase', 'currentPlayer'];
        const hasDangerousUpdate = dangerousUpdates.some(key => key in updates);

        // Check if this is a legitimate phase transition from GameFlowManager
        const isFromGameFlowManager = stack && stack.includes('GameFlowManager');
        const isPhaseTransition = context === 'phaseTransition' || (updates.turnPhase && isFromGameFlowManager);

        // Only warn about truly problematic external updates, not legitimate manager flows
        const isLegitimateManagerUpdate = isPhaseTransition && isFromGameFlowManager;

        if (hasDangerousUpdate && !isLegitimateManagerUpdate) {
          console.warn('Race condition detected: External state update during action processing', {
            updates: Object.keys(updates),
            actionInProgress: true,
            queueLength: this.actionProcessor.getQueueLength(),
            context: context,
            isFromGameFlowManager: isFromGameFlowManager,
            isPhaseTransition: isPhaseTransition,
            stack: stack?.split('\n').slice(0, 5) // First 5 lines of stack for debugging
          });
        }
      }
    }

    // Check for ActionProcessor bypass during active gameplay phases
    this.validateActionProcessorUsage(updates, prevState, isFromActionProcessor, stack);

    // Validate player state consistency
    if (updates.player1 || updates.player2) {
      this.validatePlayerStates(updates.player1 || prevState.player1, updates.player2 || prevState.player2);
    }

    // Validate turn phase transitions
    if (updates.turnPhase && updates.turnPhase !== prevState.turnPhase) {
      this.validateTurnPhaseTransition(prevState.turnPhase, updates.turnPhase);
    }
  }

  /**
   * Validate player states for data integrity
   */
  validatePlayerStates(player1, player2) {
    if (!player1 || !player2) return;

    // Check for negative values
    const validatePlayerValues = (player, playerId) => {
      if (player.energy < 0) {
        console.error(`Invalid state: ${playerId} has negative energy: ${player.energy}`);
      }
      if (player.deploymentBudget < 0) {
        console.error(`Invalid state: ${playerId} has negative deployment budget: ${player.deploymentBudget}`);
      }
    };

    validatePlayerValues(player1, 'player1');
    validatePlayerValues(player2, 'player2');

    // Check for duplicate drone IDs
    const allDroneIds = new Set();
    [player1, player2].forEach((player, playerIndex) => {
      Object.values(player.dronesOnBoard).forEach(lane => {
        lane.forEach(drone => {
          if (allDroneIds.has(drone.id)) {
            console.error(`Duplicate drone ID detected: ${drone.id} in player${playerIndex + 1}`);
          }
          allDroneIds.add(drone.id);
        });
      });
    });
  }

  /**
   * Validate turn phase transitions
   */
  validateTurnPhaseTransition(fromPhase, toPhase) {
    // Skip validation for test mode - allows direct state initialization
    if (this.state.testMode) {
      return;
    }

    const validTransitions = {
      null: ['deckSelection', 'preGame'],
      'preGame': ['deckSelection', 'droneSelection'],
      'deckSelection': ['droneSelection'],
      'droneSelection': ['placement'],
      'placement': ['gameInitializing'],
      'gameInitializing': ['determineFirstPlayer'],
      'energyReset': ['mandatoryDiscard', 'optionalDiscard', 'draw', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'initialDraw': ['mandatoryDiscard', 'optionalDiscard', 'draw', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'mandatoryDiscard': ['optionalDiscard', 'draw', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'optionalDiscard': ['draw', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'draw': ['allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'determineFirstPlayer': ['energyReset'],
      'allocateShields': ['mandatoryDroneRemoval', 'deployment'],
      'mandatoryDroneRemoval': ['deployment'],
      'deployment': ['action', 'deploymentComplete', 'roundEnd'],
      'deploymentComplete': ['action'],
      'action': ['deployment', 'roundEnd', 'determineFirstPlayer', 'gameEnd'],
      'roundEnd': ['determineFirstPlayer', 'deployment', 'gameEnd'],
      'gameEnd': []
    };

    if (!validTransitions[fromPhase]?.includes(toPhase)) {
      console.warn(`Invalid turn phase transition: ${fromPhase} -> ${toPhase}`);
    }
  }

  /**
   * Validate ActionProcessor usage during active gameplay
   */
  validateActionProcessorUsage(updates, prevState, isFromActionProcessor, stack) {
    // Skip validation if this update is from ActionProcessor
    if (isFromActionProcessor) {
      return;
    }

    // Skip validation during initialization and setup phases
    if (this.isInitializationPhase(prevState.turnPhase)) {
      return;
    }

    // First check if GameFlowManager is currently processing an automatic phase
    debugLog('STATE_SYNC', '🔍 Checking automatic phase flag:', {
      hasGameFlowManager: !!this.gameFlowManager,
      isProcessingAutomaticPhase: this.gameFlowManager?.isProcessingAutomaticPhase,
      currentPhase: prevState.turnPhase,
      updatingFields: Object.keys(updates)
    });

    if (this.gameFlowManager && this.gameFlowManager.isProcessingAutomaticPhase) {
      debugLog('STATE_SYNC', '✅ Skipping validation - automatic phase processing active');
      return; // Skip validation during automatic phase processing
    }

    // Skip validation during simultaneous phases - direct updates are expected
    const simultaneousPhases = ['droneSelection', 'deckSelection', 'placement', 'gameInitializing', 'mandatoryDiscard', 'allocateShields', 'mandatoryDroneRemoval'];
    if (simultaneousPhases.includes(prevState.turnPhase)) {
      return;
    }

    // Skip validation during automatic phases - GameFlowManager handles these directly
    const automaticPhases = ['energyReset', 'draw', 'determineFirstPlayer'];
    if (automaticPhases.includes(prevState.turnPhase) || automaticPhases.includes(updates.turnPhase)) {
      return;
    }

    // Define critical game state changes that should go through ActionProcessor
    const criticalGameStateUpdates = [
      'player1',           // Player state changes
      'player2',           // Player state changes
      'currentPlayer',     // Turn management
      'turnPhase',        // Phase transitions
      'turn',             // Round progression
      'passInfo',         // Pass state management
      'winner',           // Game end state
      'firstPlayerOfRound', // Turn order management
      'firstPasserOfPreviousRound' // Turn order management
    ];

    // Define UI state updates that are allowed to bypass ActionProcessor
    const allowedUIStateUpdates = [
      'gameLog',          // Logging is UI state
      'shieldsToAllocate', // Already handled by shield allocation actions
      'placedSections',   // UI-level placement state (debatable)
      'opponentPlacedSections', // UI-level placement state (debatable)
      'unplacedSections', // UI-level placement state (debatable)
      'droneSelectionPool', // UI-level drone selection state
      'droneSelectionTrio'  // UI-level drone selection state
    ];

    // Check for critical updates that bypass ActionProcessor
    const criticalUpdates = Object.keys(updates).filter(key =>
      criticalGameStateUpdates.includes(key)
    );

    const allowedUpdates = Object.keys(updates).filter(key =>
      allowedUIStateUpdates.includes(key)
    );

    // Allow GameFlowManager to update player states during automatic phases
    const isGameFlowManagerUpdate = stack && stack.includes('GameFlowManager');
    const isAutomaticPhaseUpdate = ['energyReset', 'draw', 'determineFirstPlayer'].includes(prevState.turnPhase) ||
                                    ['deployment', 'action'].includes(prevState.turnPhase); // After automatic phases
    const isPlayerStateUpdate = criticalUpdates.every(update =>
      ['player1', 'player2'].includes(update)
    );

    // Also allow GameFlowManager to update phase-related fields
    const isPhaseTransitionUpdate = criticalUpdates.every(update =>
      ['turnPhase', 'gameStage', 'roundNumber', 'firstPlayerOfRound'].includes(update)
    );

    if (isGameFlowManagerUpdate && (isPlayerStateUpdate || isPhaseTransitionUpdate)) {
      return; // Allow GameFlowManager to manage phases and update player states
    }

    // Allow SequentialPhaseManager to update passInfo during sequential phases
    const isSequentialPhaseManagerUpdate = stack && stack.includes('SequentialPhaseManager');
    const isSequentialPhase = ['deployment', 'action'].includes(prevState.turnPhase);
    const isPassInfoUpdate = criticalUpdates.length === 1 && criticalUpdates[0] === 'passInfo';

    if (isSequentialPhaseManagerUpdate && isSequentialPhase && isPassInfoUpdate) {
      return; // Allow SequentialPhaseManager to manage pass state for sequential phases
    }

    if (criticalUpdates.length > 0 && !isFromActionProcessor) {
      // Extract caller information from stack trace
      const stackLines = stack?.split('\n') || [];
      const callerLine = stackLines.find(line =>
        line.includes('.jsx') && !line.includes('GameStateManager')
      ) || stackLines[2] || 'Unknown';

      console.warn('⚠️ ActionProcessor bypass detected: Critical game state updated directly', {
        updates: criticalUpdates,
        turnPhase: prevState.turnPhase,
        caller: callerLine.trim(),
        allUpdates: Object.keys(updates),
        actionInProgress: this.actionProcessor.isActionInProgress(),
        recommendation: 'Use processAction() instead of direct state updates'
      });

      // Log detailed debug information
      console.debug('🐛 ActionProcessor bypass debug info:', {
        stackTrace: stackLines.slice(0, 8),
        currentState: {
          turnPhase: prevState.turnPhase,
          currentPlayer: prevState.currentPlayer,
          turn: prevState.turn
        },
        updateDetails: updates
      });
    }

    // Log informational message for allowed UI updates (only in debug mode)
    if (allowedUpdates.length > 0 && !isFromActionProcessor && process.env.NODE_ENV === 'development') {
      console.debug('ℹ️ UI state update (allowed):', {
        updates: allowedUpdates,
        turnPhase: prevState.turnPhase
      });
    }

    // Validate that appropriate functions are updating game state
    this.validateFunctionAppropriateForStateUpdate(updates, prevState, isFromActionProcessor, stack);

    // Validate ownership boundaries - each manager should only update fields it owns
    this.validateOwnershipBoundaries(updates, stack);
  }

  /**
   * Log detailed player state changes for debugging
   */
  logPlayerStateChanges(updates, prevState, caller, eventType) {
    ['player1', 'player2'].forEach(playerId => {
      if (updates[playerId]) {
        const oldPlayer = prevState[playerId];
        const newPlayer = updates[playerId];

        debugLog('STATE_SYNC', `🚨 PLAYER STATE CHANGE [${playerId}] [${eventType}] from ${caller}:`);

        // Critical properties that commonly cause AI issues
        const criticalProps = ['energy', 'activeDronePool', 'hand', 'deck', 'dronesOnBoard', 'deploymentBudget', 'initialDeploymentBudget'];

        criticalProps.forEach(prop => {
          const oldValue = oldPlayer ? oldPlayer[prop] : undefined;
          const newValue = newPlayer ? newPlayer[prop] : undefined;

          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            // Special formatting for different property types
            if (prop === 'energy' || prop === 'deploymentBudget' || prop === 'initialDeploymentBudget') {
              debugLog('STATE_SYNC', `  💰 ${prop}: ${oldValue} → ${newValue}`);
              if (newValue === undefined || newValue === null || isNaN(newValue)) {
                console.error(`  🚨 WARNING: ${prop} became ${newValue}!`);
              }
            } else if (prop === 'activeDronePool') {
              const oldCount = Array.isArray(oldValue) ? oldValue.length : 'undefined';
              const newCount = Array.isArray(newValue) ? newValue.length : 'undefined';

              // Enhanced debugging for drone name extraction
              let oldNames, newNames;

              if (Array.isArray(oldValue)) {
                try {
                  oldNames = oldValue.map(d => d?.name || 'UNNAMED').join(',');
                } catch (e) {
                  oldNames = `ERROR_MAPPING_OLD: ${e.message}`;
                }
              } else {
                oldNames = 'undefined';
              }

              if (Array.isArray(newValue)) {
                try {
                  newNames = newValue.map(d => d?.name || 'UNNAMED').join(',');
                } catch (e) {
                  newNames = `ERROR_MAPPING_NEW: ${e.message}`;
                }
              } else {
                newNames = 'undefined';
              }

              debugLog('STATE_SYNC', `  🤖 ${prop}: [${oldCount} drones] → [${newCount} drones]`);
              debugLog('STATE_SYNC', `    Old drones: ${oldNames}`);
              debugLog('STATE_SYNC', `    New drones: ${newNames}`);

              // Additional debug info if there's an issue
              if (newNames.includes('ERROR') || newNames === 'undefined') {
                debugLog('STATE_SYNC', `    🔍 Debug newValue:`, newValue);
                if (Array.isArray(newValue) && newValue.length > 0) {
                  debugLog('STATE_SYNC', `    🔍 First drone object:`, newValue[0]);
                }
              }

              // Track source of activeDronePool updates for debugging
              if (oldCount !== newCount || oldNames !== newNames) {
                const stack = new Error().stack?.split('\n').slice(1, 4).join('\n') || 'No stack trace';
                debugLog('STATE_SYNC', `    📍 Update source:\n${stack}`);
              }
            } else if (prop === 'hand' || prop === 'deck') {
              const oldCount = Array.isArray(oldValue) ? oldValue.length : 'undefined';
              const newCount = Array.isArray(newValue) ? newValue.length : 'undefined';
              debugLog('STATE_SYNC', `  🃏 ${prop}: [${oldCount} cards] → [${newCount} cards]`);
            } else if (prop === 'dronesOnBoard') {
              const oldLaneCounts = oldValue ? `L1:${oldValue.lane1?.length || 0} L2:${oldValue.lane2?.length || 0} L3:${oldValue.lane3?.length || 0}` : 'undefined';
              const newLaneCounts = newValue ? `L1:${newValue.lane1?.length || 0} L2:${newValue.lane2?.length || 0} L3:${newValue.lane3?.length || 0}` : 'undefined';
              debugLog('STATE_SYNC', `  🛸 ${prop}: ${oldLaneCounts} → ${newLaneCounts}`);
            } else {
              debugLog('STATE_SYNC', `  📝 ${prop}:`, { before: oldValue, after: newValue });
            }
          }
        });

        debugLog('STATE_SYNC', `🔍 Full ${playerId} state:`, newPlayer);
      }
    });
  }

  /**
   * Check if current phase is initialization/setup phase
   */
  isInitializationPhase(turnPhase) {
    const initPhases = [
      null,
      'preGame',
      'droneSelection',
      'deckSelection',
      'deckBuilding',
      'placement',
      'gameInitializing',
      'initialDraw'
    ];
    return initPhases.includes(turnPhase);
  }

  /**
   * Validate that appropriate functions are updating game state
   */
  validateFunctionAppropriateForStateUpdate(updates, prevState, isFromActionProcessor, stack) {
    // Skip validation during initialization phases
    if (this.isInitializationPhase(prevState.turnPhase)) {
      return;
    }

    // Skip if already validated as ActionProcessor update
    if (isFromActionProcessor) {
      return;
    }

    // Extract function names from stack trace
    const stackLines = stack?.split('\n') || [];
    const callerInfo = this.extractCallerInfo(stackLines);

    // Define functions that should NOT be updating game state
    const inappropriateFunctions = [
      // UI Event Handlers that should use ActionProcessor instead
      'handle',           // Generic event handlers (handleClick, handleSubmit, etc.)
      'onClick',          // Click handlers
      'onSubmit',         // Form handlers
      'onSelect',         // Selection handlers
      'onConfirm',        // Confirmation handlers
      'onComplete',       // Completion handlers

      // UI Component Functions
      'render',           // Rendering functions
      'component',        // Generic component functions
      'modal',            // Modal-related functions
      'display',          // Display functions
      'show',             // Show/hide functions
      'hide',             // Show/hide functions

      // UI State Management
      'setModal',         // UI modal state
      'setSelected',      // UI selection state
      'setActive',        // UI active state
      'setVisible',       // UI visibility state

      // Non-game Logic Functions
      'calculate',        // Calculation functions (should be pure)
      'format',           // Formatting functions
      'validate',         // Validation functions (should be pure)
      'transform',        // Data transformation functions
    ];

    // Define functions that ARE allowed to update game state
    const appropriateFunctions = [
      // Core game state management
      'GameStateManager',     // Direct GameStateManager methods
      'ActionProcessor',      // ActionProcessor methods
      'gameLogic',           // Game logic functions
      'gameEngine',          // Game engine functions

      // Setup and initialization
      'reset',               // Reset operations
      'initialize',          // Initialization functions
      'setup',               // Setup functions
      'init',                // Init functions

      // Internal state management
      'setState',            // Direct setState calls (allowed for internal operations)
      'updateState',         // Internal state updates
      'syncState',           // State synchronization

      // P2P and network operations
      'p2p',                 // P2P operations
      'network',             // Network operations
      'sync',                // Synchronization operations
    ];

    // Check if any inappropriate functions are in the call stack
    const inappropriateCallers = callerInfo.functions.filter(func =>
      inappropriateFunctions.some(inappropriate =>
        func.toLowerCase().includes(inappropriate.toLowerCase())
      )
    );

    // Check if any appropriate functions are in the call stack
    const appropriateCallers = callerInfo.functions.filter(func =>
      appropriateFunctions.some(appropriate =>
        func.toLowerCase().includes(appropriate.toLowerCase())
      )
    );

    // Only flag if we have inappropriate callers and no appropriate ones
    if (inappropriateCallers.length > 0 && appropriateCallers.length === 0) {
      console.warn('🚨 Inappropriate function updating game state:', {
        inappropriateFunctions: inappropriateCallers,
        updates: Object.keys(updates),
        turnPhase: prevState.turnPhase,
        callerInfo: callerInfo,
        recommendation: 'UI functions should use processAction() instead of direct state updates',
        architecture: 'UI → ActionProcessor → gameLogic.js → GameStateManager'
      });

      // Log detailed debug information
      console.debug('🔍 Function validation debug info:', {
        allFunctionsInStack: callerInfo.functions,
        inappropriateFound: inappropriateCallers,
        appropriateFound: appropriateCallers,
        updateDetails: updates,
        stackTrace: stackLines.slice(0, 10)
      });
    }
  }

  /**
   * Extract caller information from stack trace
   */
  extractCallerInfo(stackLines) {
    const functions = [];
    const files = [];

    for (const line of stackLines) {
      // Extract function names - look for patterns like "at functionName (" or "at Object.functionName ("
      const functionMatch = line.match(/at\s+([\w.$]+)\s*\(/);
      if (functionMatch) {
        const funcName = functionMatch[1];
        // Filter out generic names and keep meaningful function names
        if (funcName !== 'Object' && funcName !== 'anonymous' && !funcName.startsWith('eval')) {
          functions.push(funcName);
        }
      }

      // Extract file names
      const fileMatch = line.match(/\/([^\/]+\.(jsx?|ts|tsx)):\d+/);
      if (fileMatch) {
        files.push(fileMatch[1]);
      }
    }

    return {
      functions: [...new Set(functions)], // Remove duplicates
      files: [...new Set(files)],         // Remove duplicates
      primaryCaller: functions[0] || 'Unknown',
      primaryFile: files[0] || 'Unknown'
    };
  }

  /**
   * Validate ownership boundaries - each manager should only update fields it owns
   */
  validateOwnershipBoundaries(updates, stack) {
    if (!stack) return;

    const updateKeys = Object.keys(updates);
    if (updateKeys.length === 0) return;

    // Manager identification from stack
    const isGameFlowManager = stack.includes('GameFlowManager');
    const isSequentialPhaseManager = stack.includes('SequentialPhaseManager');
    const isActionProcessor = stack.includes('ActionProcessor');

    // Define ownership boundaries
    const ownershipRules = {
      // GameFlowManager owns orchestration
      'turnPhase': 'GameFlowManager',
      'gameStage': 'GameFlowManager',
      'roundNumber': 'GameFlowManager',
      'gameActive': 'GameFlowManager',

      // SequentialPhaseManager owns pass state during sequential phases
      // GameFlowManager can reset passInfo at round boundaries
      'passInfo': ['SequentialPhaseManager', 'GameFlowManager'],

      // ActionProcessor can update currentPlayer for turn transitions within phase
      // GameFlowManager can update currentPlayer for phase-to-phase transitions
      'currentPlayer': ['ActionProcessor', 'GameFlowManager'],

      // First player determination fields - ActionProcessor handles first player determination results
      'firstPlayerOfRound': ['ActionProcessor', 'GameFlowManager'],
      'firstPlayerOverride': ['ActionProcessor', 'GameFlowManager']
    };

    // Check each update against ownership rules
    for (const updateKey of updateKeys) {
      const allowedOwners = ownershipRules[updateKey];
      if (!allowedOwners) continue; // No ownership rule defined

      const allowedOwnersList = Array.isArray(allowedOwners) ? allowedOwners : [allowedOwners];

      let hasPermission = false;
      for (const allowedOwner of allowedOwnersList) {
        if (allowedOwner === 'GameFlowManager' && isGameFlowManager) hasPermission = true;
        else if (allowedOwner === 'SequentialPhaseManager' && isSequentialPhaseManager) hasPermission = true;
        else if (allowedOwner === 'ActionProcessor' && isActionProcessor) hasPermission = true;
      }

      if (!hasPermission) {
        const currentManager = isGameFlowManager ? 'GameFlowManager' :
                             isSequentialPhaseManager ? 'SequentialPhaseManager' :
                             isActionProcessor ? 'ActionProcessor' : 'Unknown';

        console.warn(`🚨 OWNERSHIP VIOLATION: ${currentManager} cannot update '${updateKey}'`, {
          updateKey,
          currentManager,
          allowedOwners: allowedOwnersList,
          updates: updateKeys,
          recommendation: `Only ${allowedOwnersList.join(' or ')} should update '${updateKey}'`
        });
      }
    }
  }

  // --- GAME STATE METHODS ---

  /**
   * Reset game to initial state
   */
  reset() {
    debugLog('STATE_SYNC', '🔄 GAME RESET: Resetting game state and clearing caches');

    const initialState = {
      turnPhase: 'preGame',
      turn: 1,
      currentPlayer: null,
      firstPlayerOfRound: null,
      firstPasserOfPreviousRound: null,
      firstPlayerOverride: null,
      passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
      winner: null,
      player1: gameEngine.initialPlayerState('Player 1', startingDecklist),
      player2: gameEngine.initialPlayerState('Player 2', startingDecklist),
      placedSections: [],
      opponentPlacedSections: [],
      unplacedSections: [],
      shieldsToAllocate: 0,
      droneSelectionPool: [],
      droneSelectionTrio: [],
      gameLog: [],

      // --- COMMITMENTS (for simultaneous phases) ---
      commitments: {},
    };

    this.setState(initialState, 'GAME_RESET');

    // Clear GameDataService singleton and cache to prevent stale data
    GameDataService.reset();

    // Clear ActionProcessor queue to prevent stale actions
    this.actionProcessor.clearQueue();

    debugLog('STATE_SYNC', '✅ GAME RESET: State, cache, and queue cleared');
  }

  /**
   * Start a new game session - initialize players and game state
   * @param {string} gameMode - 'local', 'host', 'guest'
   * @param {Object} player1Config - Player 1 configuration
   * @param {Object} player2Config - Player 2 configuration
   */
  startGame(gameMode = 'local', player1Config = {}, player2Config = {}) {
    debugLog('STATE_SYNC', '🎮 GAME START: Initializing new game session');

    const gameState = {
      // Activate game
      appState: 'inGame',
      gameActive: true,
      gameMode: gameMode,

      // Initialize game flow
      turnPhase: 'deckSelection',
      turn: 1,
      currentPlayer: null,
      firstPlayerOfRound: null,
      firstPasserOfPreviousRound: null,
      firstPlayerOverride: null,
      passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
      winner: null,

      // Initialize players with custom configurations
      player1: {
        ...gameEngine.initialPlayerState(
          player1Config.name || 'Player 1',
          player1Config.decklist || startingDecklist
        ),
        ...player1Config
      },
      player2: {
        ...gameEngine.initialPlayerState(
          player2Config.name || 'Player 2',
          player2Config.decklist || startingDecklist
        ),
        ...player2Config
      },

      // Initialize game components
      placedSections: [],
      opponentPlacedSections: [],
      unplacedSections: [],
      shieldsToAllocate: 0,
      gameLog: [],

      // --- COMMITMENTS (for simultaneous phases) ---
      commitments: {},

      // Drone selection data (will be initialized by GameFlowManager when transitioning to droneSelection)
      droneSelectionPool: [],
      droneSelectionTrio: [],
    };

    this.setState(gameState, 'GAME_STARTED');

    debugLog('STATE_SYNC', '👤 Player 1 Created:', {
      name: gameState.player1.name,
      energy: gameState.player1.energy,
      deckCount: gameState.player1.deck?.length || 0
    });
    debugLog('STATE_SYNC', '👤 Player 2 Created:', {
      name: gameState.player2.name,
      energy: gameState.player2.energy,
      deckCount: gameState.player2.deck?.length || 0
    });
    debugLog('STATE_SYNC', '✅ GAME START: Game session initialized successfully');
  }

  /**
   * End current game session - return to menu state
   */
  endGame() {
    debugLog('STATE_SYNC', '🎮 GAME END: Ending current game session and clearing caches');

    this.setState({
      appState: 'menu',
      gameActive: false,
      testMode: false, // Clear test mode flag
      turnPhase: null,
      turn: null,
      currentPlayer: null,
      firstPlayerOfRound: null,
      firstPasserOfPreviousRound: null,
      firstPlayerOverride: null,
      passInfo: null,
      winner: null,
      player1: null,
      player2: null,
      placedSections: [],
      opponentPlacedSections: [],
      unplacedSections: [],
      shieldsToAllocate: 0,
      droneSelectionPool: [],
      droneSelectionTrio: [],
      gameLog: [],

      // --- COMMITMENTS (for simultaneous phases) ---
      commitments: {},
    }, 'GAME_ENDED');

    // Clear GameDataService singleton and cache to prevent stale data in new games
    GameDataService.reset();

    // Clear ActionProcessor queue to prevent stale actions
    this.actionProcessor.clearQueue();

    // Reset GameFlowManager to clear phase state
    if (this.gameFlowManager) {
      this.gameFlowManager.reset();
    }

    debugLog('STATE_SYNC', '✅ GAME END: Returned to menu state, all singletons cleared');
  }

  /**
   * Initialize test mode game - bypasses normal game flow
   * @param {Object} testConfig - Test configuration from testGameInitializer
   * @returns {boolean} Success status
   */
  initializeTestMode(testConfig) {
    debugLog('STATE_SYNC', '🧪 TEST MODE: Initializing test game from GameStateManager');

    // Import testGameInitializer dynamically to avoid circular dependencies
    import('../services/testGameInitializer.js').then(module => {
      const success = module.initializeTestGame(testConfig, this);

      if (success) {
        debugLog('STATE_SYNC', '✅ TEST MODE: Test game initialized successfully');
      } else {
        debugLog('STATE_SYNC', '❌ TEST MODE: Test game initialization failed');
      }
    }).catch(error => {
      console.error('❌ TEST MODE: Error importing testGameInitializer:', error);
    });

    return true; // Return immediately, actual initialization happens asynchronously
  }

  /**
   * Set multiplayer mode and role
   */
  setMultiplayerMode(mode, isHost = false) {
    this.setState({
      gameMode: mode,
    }, 'MULTIPLAYER_MODE_SET');
  }

  /**
   * Update player states
   */
  updatePlayers(player1Updates = {}, player2Updates = {}) {
    const updates = {};
    if (Object.keys(player1Updates).length > 0) {
      updates.player1 = { ...this.state.player1, ...player1Updates };
    }
    if (Object.keys(player2Updates).length > 0) {
      updates.player2 = { ...this.state.player2, ...player2Updates };
    }

    if (Object.keys(updates).length > 0) {
      this.setState(updates, 'PLAYERS_UPDATED');
    }
  }

  /**
   * Update specific player state directly
   */
  updatePlayerState(playerId, updates) {
    if (playerId === 'player1') {
      this.updatePlayers(updates, {});
    } else if (playerId === 'player2') {
      this.updatePlayers({}, updates);
    }
  }

  /**
   * Set player states directly (for gameLogic integration)
   */
  setPlayerStates(newPlayer1, newPlayer2) {
    this.setState({
      player1: newPlayer1,
      player2: newPlayer2
    }, 'PLAYER_STATES_SET');
  }

  /**
   * Set current player
   */
  setCurrentPlayer(playerId) {
    this.setState({ currentPlayer: playerId }, 'CURRENT_PLAYER_CHANGED');
  }

  /**
   * Set turn phase
   */
  setTurnPhase(phase) {
    this.setState({ turnPhase: phase }, 'TURN_PHASE_CHANGED');
  }

  /**
   * Set first player of round
   */
  setFirstPlayerOfRound(playerId) {
    this.setState({ firstPlayerOfRound: playerId }, 'FIRST_PLAYER_OF_ROUND_SET');
  }

  /**
   * Set first passer of previous round
   */
  setFirstPasserOfPreviousRound(playerId) {
    this.setState({ firstPasserOfPreviousRound: playerId }, 'FIRST_PASSER_OF_PREVIOUS_ROUND_SET');
  }

  /**
   * Set first player override
   */
  setFirstPlayerOverride(playerId) {
    this.setState({ firstPlayerOverride: playerId }, 'FIRST_PLAYER_OVERRIDE_SET');
  }

  /**
   * Update pass information
   */
  updatePassInfo(passUpdates) {
    const updatedPassInfo = { ...this.state.passInfo, ...passUpdates };
    this.setState({ passInfo: updatedPassInfo }, 'PASS_INFO_UPDATED');
  }

  /**
   * Set pass information directly
   */
  setPassInfo(passInfo) {
    this.setState({ passInfo: passInfo }, 'PASS_INFO_SET');
  }

  /**
   * Check if it's the local player's turn (for multiplayer)
   */
  isMyTurn() {
    // In local mode, player1 is the human player
    if (this.state.gameMode === 'local') return this.state.currentPlayer === 'player1';
    if (this.state.gameMode === 'host') return this.state.currentPlayer === 'player1';
    if (this.state.gameMode === 'guest') return this.state.currentPlayer === 'player2';
    return false;
  }

  /**
   * Get local player ID based on role
   */
  getLocalPlayerId() {
    if (this.state.gameMode === 'local') return 'player1'; // For local AI games
    if (this.state.gameMode === 'host') return 'player1';
    if (this.state.gameMode === 'guest') return 'player2';
    return 'player1';
  }

  /**
   * Get opponent player ID
   */
  getOpponentPlayerId() {
    const localId = this.getLocalPlayerId();
    return localId === 'player1' ? 'player2' : 'player1';
  }

  /**
   * Get local player state object
   */
  getLocalPlayerState() {
    const localId = this.getLocalPlayerId();
    return this.state[localId];
  }

  /**
   * Get opponent player state object
   */
  getOpponentPlayerState() {
    const opponentId = this.getOpponentPlayerId();
    return this.state[opponentId];
  }

  /**
   * Check if a given player ID is the local player (for UI perspective)
   */
  isLocalPlayer(playerId) {
    return playerId === this.getLocalPlayerId();
  }

  /**
   * Get placed sections for local player (UI perspective)
   */
  getLocalPlacedSections() {
    if (this.state.gameMode === 'local') return this.state.placedSections;
    if (this.state.gameMode === 'host') return this.state.placedSections;
    if (this.state.gameMode === 'guest') return this.state.opponentPlacedSections;
    return this.state.placedSections;
  }

  /**
   * Get placed sections for opponent (UI perspective)
   */
  getOpponentPlacedSections() {
    let result;
    if (this.state.gameMode === 'local') result = this.state.opponentPlacedSections;
    else if (this.state.gameMode === 'host') result = this.state.opponentPlacedSections;
    else if (this.state.gameMode === 'guest') result = this.state.placedSections;
    else result = this.state.opponentPlacedSections;

    // Only debug during placement phase when there's actual data
    if (this.state.turnPhase === 'placement' && result.some(s => s !== null)) {
      debugLog('STATE_SYNC', '🔍 [DEBUG] GameStateManager.getOpponentPlacedSections:', {
        gameMode: this.state.gameMode,
        result,
        rawOpponentPlacedSections: this.state.opponentPlacedSections,
        rawPlacedSections: this.state.placedSections
      });
    }

    return result;
  }

  /**
   * Track optimistic action for client-side prediction (guest mode)
   * Used to deduplicate animations when host sends authoritative state back
   */
  trackOptimisticAction(actionType, payload) {
    const action = {
      type: actionType,
      payload: payload,
      timestamp: Date.now(),
      id: `${actionType}-${Date.now()}-${Math.random()}`
    };

    this.optimisticActions.push(action);
    debugLog('STATE_SYNC', '🔮 [OPTIMISTIC] Tracked action:', actionType, 'Total tracked:', this.optimisticActions.length);

    // Auto-clear after timeout
    setTimeout(() => {
      this.optimisticActions = this.optimisticActions.filter(a => a.id !== action.id);
      debugLog('STATE_SYNC', '🧹 [OPTIMISTIC] Cleared old action:', actionType, 'Remaining:', this.optimisticActions.length);
    }, this.optimisticActionTimeout);
  }

  /**
   * Check if we have recent optimistic actions
   * Used by GuestMessageQueueService to skip duplicate animations
   */
  hasRecentOptimisticActions() {
    return this.optimisticActions.length > 0;
  }

  /**
   * Clear all optimistic actions
   */
  clearOptimisticActions() {
    debugLog('STATE_SYNC', '🧹 [OPTIMISTIC] Clearing all actions');
    this.optimisticActions = [];
  }

  /**
   * Add log entry
   */
  addLogEntry(entry, debugSource = null, aiDecisionContext = null) {
    // Merge debugSource and aiDecisionContext into the entry object
    const enhancedEntry = {
      ...entry,
      timestamp: entry.timestamp || Date.now(),
      round: entry.round || this.state.turn
    };

    // Add debugSource if provided
    if (debugSource) {
      enhancedEntry.debugSource = debugSource;
    }

    // Add aiDecisionContext if provided
    if (aiDecisionContext) {
      enhancedEntry.aiDecisionContext = aiDecisionContext;
    }

    const updatedLog = [...this.state.gameLog, enhancedEntry];
    this.setState({ gameLog: updatedLog }, 'LOG_ENTRY_ADDED');
  }

  /**
   * Update pass information
   */
  updatePassInfo(passUpdates) {
    const updatedPassInfo = { ...this.state.passInfo, ...passUpdates };
    this.setState({ passInfo: updatedPassInfo }, 'PASS_INFO_UPDATED');
  }

  /**
   * Set winner
   */
  setWinner(winnerId) {
    this.setState({ winner: winnerId }, 'GAME_ENDED');
  }

  // --- ACTION PROCESSING ---

  /**
   * Process a game action through the action queue
   * @param {string} actionType - Type of action (attack, ability, deployment, etc.)
   * @param {Object} payload - Action-specific data
   * @returns {Promise} Resolves when action is complete
   */
  async processAction(actionType, payload) {
    return await this.actionProcessor.queueAction({
      type: actionType,
      payload: payload
    });
  }

  /**
   * Check if any actions are currently being processed
   */
  isActionInProgress() {
    return this.actionProcessor.isActionInProgress();
  }

  /**
   * Get current action queue length
   */
  getActionQueueLength() {
    return this.actionProcessor.getQueueLength();
  }

  /**
   * Emergency action queue clear (use with caution)
   */
  clearActionQueue() {
    this.actionProcessor.clearQueue();
  }
}

// Create singleton instance
const gameStateManager = new GameStateManager();

export default gameStateManager;