// All game actions must go through this processor to ensure serialization.

import WinConditionChecker from '../logic/game/WinConditionChecker.js';
import aiPhaseProcessor from './AIPhaseProcessor.js';
import GameDataService from '../services/GameDataService.js';
import PhaseManager from './PhaseManager.js';
import { debugLog, timingLog } from '../utils/debugLogger.js';
import { addTeleportingFlags } from '../utils/teleportUtils.js';
import {
  processAttack as _processAttack,
  processMove as _processMove,
  processAbility as _processAbility
} from '../logic/actions/CombatActionStrategy.js';
import {
  processCardPlay as _processCardPlay,
  processSearchAndDrawCompletion as _processSearchAndDrawCompletion
} from '../logic/actions/CardActionStrategy.js';
import {
  processShipAbility as _processShipAbility,
  processShipAbilityCompletion as _processShipAbilityCompletion,
  processRecallAbility as _processRecallAbility,
  processTargetLockAbility as _processTargetLockAbility,
  processRecalculateAbility as _processRecalculateAbility,
  processRecalculateComplete as _processRecalculateComplete,
  processReallocateShieldsAbility as _processReallocateShieldsAbility,
  processReallocateShieldsComplete as _processReallocateShieldsComplete,
  validateShipAbilityActivationLimit as _validateShipAbilityActivationLimit
} from '../logic/actions/ShipAbilityStrategy.js';
import {
  processTurnTransition as _processTurnTransition,
  processPhaseTransition as _processPhaseTransition,
  processRoundStart as _processRoundStart,
  processFirstPlayerDetermination as _processFirstPlayerDetermination
} from '../logic/actions/PhaseTransitionStrategy.js';
import {
  getPhaseCommitmentStatus as _getPhaseCommitmentStatus,
  clearPhaseCommitments as _clearPhaseCommitments,
  processCommitment as _processCommitment,
  handleAICommitment as _handleAICommitment,
  applyPhaseCommitments as _applyPhaseCommitments
} from '../logic/actions/CommitmentStrategy.js';
import {
  processDraw as _processDraw,
  processEnergyReset as _processEnergyReset,
  processRoundStartTriggers as _processRoundStartTriggers,
  processRebuildProgress as _processRebuildProgress,
  processMomentumAward as _processMomentumAward
} from '../logic/actions/StateUpdateStrategy.js';
import {
  processDeployment as _processDeployment,
  processDestroyDrone as _processDestroyDrone,
  processOptionalDiscard as _processOptionalDiscard,
  processPlayerPass as _processPlayerPass,
  processAiShipPlacement as _processAiShipPlacement,
  processAiAction as _processAiAction
} from '../logic/actions/DroneActionStrategy.js';
import {
  processAddShield as _processAddShield,
  processResetShields as _processResetShields,
  processReallocateShields as _processReallocateShields
} from '../logic/actions/ShieldActionStrategy.js';
import {
  processStatusConsumption as _processStatusConsumption,
  processDebugAddCardsToHand as _processDebugAddCardsToHand,
  processForceWin as _processForceWin
} from '../logic/actions/MiscActionStrategy.js';

// --- Strategy Registry ---
// Maps action type strings to instance method names.
// processAction uses this map instead of a switch statement.
const ACTION_STRATEGIES = {
  attack: 'processAttack',
  ability: 'processAbility',
  move: 'processMove',
  deployment: 'processDeployment',
  cardPlay: 'processCardPlay',
  searchAndDrawCompletion: 'processSearchAndDrawCompletion',
  shipAbility: 'processShipAbility',
  shipAbilityCompletion: 'processShipAbilityCompletion',
  recallAbility: 'processRecallAbility',
  targetLockAbility: 'processTargetLockAbility',
  recalculateAbility: 'processRecalculateAbility',
  recalculateComplete: 'processRecalculateComplete',
  reallocateShieldsAbility: 'processReallocateShieldsAbility',
  reallocateShieldsComplete: 'processReallocateShieldsComplete',
  turnTransition: 'processTurnTransition',
  phaseTransition: 'processPhaseTransition',
  roundStart: 'processRoundStart',
  processFirstPlayerDetermination: 'processFirstPlayerDetermination',
  reallocateShields: 'processReallocateShields',
  aiAction: 'processAiAction',
  playerPass: 'processPlayerPass',
  aiShipPlacement: 'processAiShipPlacement',
  optionalDiscard: 'processOptionalDiscard',
  commitment: 'processCommitment',
  draw: 'processDraw',
  energyReset: 'processEnergyReset',
  roundStartTriggers: 'processRoundStartTriggers',
  rebuildProgress: 'processRebuildProgress',
  momentumAward: 'processMomentumAward',
  destroyDrone: 'processDestroyDrone',
  addShield: 'processAddShield',
  resetShields: 'processResetShields',
  debugAddCardsToHand: 'processDebugAddCardsToHand',
  forceWin: 'processForceWin',
};

// Status consumption actions need special routing (status type + shouldEndTurn)
const STATUS_CONSUMPTION_TYPES = {
  snaredConsumption: 'snared',
  suppressedConsumption: 'suppressed',
};

class ActionProcessor {
  // Singleton instance
  static instance = null;

  /**
   * Get singleton instance of ActionProcessor
   * @param {Object} gameStateManager - GameStateManager instance
   * @param {Object} phaseAnimationQueue - PhaseAnimationQueue instance (optional)
   * @returns {ActionProcessor} Single shared instance
   */
  static getInstance(gameStateManager, phaseAnimationQueue = null) {
    if (!ActionProcessor.instance) {
      ActionProcessor.instance = new ActionProcessor(gameStateManager, phaseAnimationQueue);
    }
    return ActionProcessor.instance;
  }

  /**
   * Reset singleton instance (for testing and new games)
   */
  static reset() {
    ActionProcessor.instance = null;
    debugLog('STATE_SYNC', '⚙️ ActionProcessor singleton reset');
  }

  constructor(gameStateManager, phaseAnimationQueue = null) {
    // Enforce singleton pattern
    if (ActionProcessor.instance) {
      debugLog('STATE_SYNC', 'ActionProcessor already exists. Use getInstance() instead of new ActionProcessor()');
      return ActionProcessor.instance;
    }

    this.gameStateManager = gameStateManager;
    this.gameDataService = GameDataService.getInstance(gameStateManager);
    this.animationManager = null;
    this.phaseAnimationQueue = phaseAnimationQueue; // For non-blocking phase announcements
    this.pendingActionAnimations = []; // Track action animations for guest broadcasting
    this.pendingSystemAnimations = []; // Track system animations for guest broadcasting
    this.pendingStateUpdate = null; // Track state update for AnimationManager callback
    this.pendingFinalState = null; // Track final state for TELEPORT_IN reveal

    // Wrapper function for game logic compatibility
    this.effectiveStatsWrapper = (drone, lane) => {
      return this.gameDataService.getEffectiveStats(drone, lane);
    };

    this.actionQueue = [];
    this.isProcessing = false;
    this.p2pManager = null;
    this.phaseManager = null; // Reference to PhaseManager for authoritative phase transitions
    this.aiPhaseProcessor = null; // Reference to AIPhaseProcessor for AI interception decisions
    this.actionLocks = {
      attack: false,
      ability: false,
      deployment: false,
      cardPlay: false,
      shipAbility: false,
      shipAbilityCompletion: false,
      turnTransition: false,
      phaseTransition: false,
      roundStart: false,
      reallocateShields: false,
      aiAction: false,
      aiTurn: false,
      playerPass: false,
      aiShipPlacement: false,
      commitment: false,
      processFirstPlayerDetermination: false
    };

    // Event listeners for action completion notifications
    this.listeners = [];

    // Track last action result for turn transition handling
    this.lastActionResult = null;
    this.lastActionType = null;

    debugLog('STATE_SYNC', '⚙️ ActionProcessor initialized');
  }

  // --- Action Context (shared interface for extracted strategies) ---

  /**
   * Lazily-created context object passed to all strategy functions.
   * Uses getters for late-bound references (animationManager, aiPhaseProcessor, etc.).
   */
  _getActionContext() {
    if (this._actionContext) return this._actionContext;
    const ap = this;
    this._actionContext = {
      // State access
      getState: () => ap.gameStateManager.getState(),
      get: (key) => ap.gameStateManager.get(key),
      setState: (...args) => ap._withUpdateContext(() => ap.gameStateManager.setState(...args)),
      setPlayerStates: (...args) => ap.gameStateManager.setPlayerStates(...args),
      updatePlayerState: (...args) => ap.gameStateManager.updatePlayerState(...args),
      addLogEntry: (...args) => ap.gameStateManager.addLogEntry(...args),
      setTurnPhase: (...args) => ap.gameStateManager.setTurnPhase(...args),
      setCurrentPlayer: (...args) => ap.gameStateManager.setCurrentPlayer(...args),
      setPassInfo: (...args) => ap.gameStateManager.setPassInfo(...args),
      setWinner: (...args) => ap.gameStateManager.setWinner(...args),
      getLocalPlayerId: () => ap.gameStateManager.getLocalPlayerId(),
      getLocalPlacedSections: () => ap.gameStateManager.getLocalPlacedSections(),
      createCallbacks: (...args) => ap.gameStateManager.createCallbacks(...args),

      // Animation (late-bound via getters since set after construction)
      getAnimationManager: () => ap.animationManager,
      executeAnimationPhase: (anims, states) => ap._executeAnimationPhase(anims, states),
      executeGoAgainAnimation: (pid) => ap.executeGoAgainAnimation(pid),
      executeAndCaptureAnimations: (...args) => ap.executeAndCaptureAnimations(...args),
      mapAnimationEvents: (events) => (events || [])
        .filter(event => event.type !== 'STATE_SNAPSHOT')  // Guest doesn't need intermediate state
        .map(event => {
          const animDef = ap.animationManager?.animations[event.type];
          return {
            animationName: event.type,
            timing: animDef?.timing || 'pre-state',
            payload: {
              ...event,
              droneId: event.sourceId || event.targetId
            }
          };
        }),
      captureAnimationsForBroadcast: (animations) => {
        const gameMode = ap.gameStateManager.get('gameMode');
        if (gameMode === 'host' && animations.length > 0) {
          ap.pendingActionAnimations.push(...animations);
        }
      },

      // Action delegation (for callbacks that re-enter ActionProcessor)
      processAttack: (payload) => ap.processAttack(payload),
      processMove: (payload) => ap.processMove(payload),
      processAbility: (payload) => ap.processAbility(payload),
      processCardPlay: (payload) => ap.processCardPlay(payload),
      processDeployment: (payload) => ap.processDeployment(payload),
      processCommitment: (payload) => ap.processCommitment(payload),
      processDestroyDrone: (payload) => ap.processDestroyDrone(payload),
      broadcastStateToGuest: (...args) => ap.broadcastStateToGuest(...args),

      // Win condition
      checkWinCondition: () => ap.checkWinCondition(),

      // Commitment delegation
      clearPhaseCommitments: (phase) => ap.clearPhaseCommitments(phase),

      // Late-bound references
      getAiPhaseProcessor: () => ap.aiPhaseProcessor,
      getPhaseManager: () => ap.phaseManager,
      getPhaseAnimationQueue: () => ap.phaseAnimationQueue,
      getGameDataService: () => ap.gameDataService,
    };
    return this._actionContext;
  }

  /**
   * Subscribe to ActionProcessor events
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
    debugLog('PHASE_TRANSITIONS', `🔔 ActionProcessor emitting: ${eventType}`, data);
    this.listeners.forEach(listener => {
      try {
        listener({ type: eventType, ...data });
      } catch (error) {
        debugLog('STATE_SYNC', 'ActionProcessor listener error:', error);
      }
    });
  }

  /**
   * Set P2P manager for multiplayer support
   * @param {Object} p2pManager - P2P manager instance
   */
  setP2PManager(p2pManager) {
    this.p2pManager = p2pManager;
  }

  /**
   * Set PhaseManager reference for authoritative phase transitions
   * @param {Object} phaseManager - PhaseManager instance
   */
  setPhaseManager(phaseManager) {
    this.phaseManager = phaseManager;
    debugLog('PHASE_MANAGER', '🔗 ActionProcessor: PhaseManager reference set');
  }

  /**
   * Set AIPhaseProcessor reference for AI interception decisions
   * @param {Object} aiPhaseProcessor - AIPhaseProcessor instance
   */
  setAIPhaseProcessor(aiPhaseProcessor) {
    this.aiPhaseProcessor = aiPhaseProcessor;
    debugLog('AI_DECISIONS', '🔗 ActionProcessor: AIPhaseProcessor reference set');
  }

  /**
   * Set animation manager to control animations
   */
setAnimationManager(animationManager) {
  this.animationManager = animationManager;
}


  /**
   * Queue an action for processing
   * @param {Object} action - Action object with type and payload
   * @returns {Promise} Resolves when action is complete
   */
  async queueAction(action) {
    debugLog('PASS_LOGIC', `🟣 [QUEUE ACTION] Action queued`, {
      type: action.type,
      gameMode: this.gameStateManager?.getState()?.gameMode,
      queueLength: this.actionQueue.length
    });

    return new Promise((resolve, reject) => {
      this.actionQueue.push({
        ...action,
        resolve,
        reject,
        timestamp: Date.now()
      });
      this.processQueue();
    });
  }

  /**
   * Process the action queue serially
   */
  async processQueue() {
    debugLog('PASS_LOGIC', `🟠 [PROCESS QUEUE] Processing queue`, {
      isProcessing: this.isProcessing,
      queueLength: this.actionQueue.length,
      gameMode: this.gameStateManager?.getState()?.gameMode
    });

    if (this.isProcessing || this.actionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.actionQueue.length > 0) {
        const action = this.actionQueue.shift();

        try {
          const result = await this.processAction(action);
          action.resolve(result);
        } catch (error) {
          debugLog('STATE_SYNC', 'Action processing error:', error);
          debugLog('EFFECT_CHAIN_DEBUG', '[QUEUE] Action processing error', {
            type: action.type, error: error.message, stack: error.stack,
          });
          action.reject(error);
        }
      }
    } finally {
      this.isProcessing = false;

      // If items were added to queue during processing, process them now
      if (this.actionQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Process a single action
   * @param {Object} action - Action to process
   */
  async processAction(action) {
    const { type, payload, isNetworkAction = false } = action;

    // Get current state for validation
    const currentState = this.gameStateManager.getState();

    // PASS STATE VALIDATION - Prevent actions after players have passed
    if (currentState.passInfo) {
      // Actions that should be blocked if current player has passed
      const playerActionTypes = ['attack', 'ability', 'deployment', 'cardPlay', 'shipAbility', 'recallAbility', 'targetLockAbility', 'recalculateAbility', 'reallocateShieldsAbility'];
      if (playerActionTypes.includes(type)) {
        // Determine the current player for this action
        let actionPlayerId = payload.playerId || currentState.currentPlayer;

        // For AI turns, the player is specified in payload
        if (type === 'aiTurn' && payload.playerId) {
          actionPlayerId = payload.playerId;
        }

        // Check if the player has already passed
        const playerPassKey = `${actionPlayerId}Passed`;
        if (currentState.passInfo[playerPassKey]) {
          debugLog('PASS_LOGIC', `[PASS VALIDATION] Blocking ${type} action - ${actionPlayerId} has already passed`);
          throw new Error(`Cannot perform ${type} action: ${actionPlayerId} has already passed`);
        }
      }
    }

    // SEQUENTIAL PHASE TURN VALIDATION - Security: Verify acting player matches current player
    // Sequential phases (deployment, action) are turn-based - only currentPlayer can act
    const sequentialPhases = ['deployment', 'action'];
    if (sequentialPhases.includes(currentState.turnPhase)) {
      const playerActionTypes = ['attack', 'ability', 'deployment', 'cardPlay', 'shipAbility', 'searchAndDrawCompletion'];
      if (playerActionTypes.includes(type)) {
        // Determine which player is attempting this action
        const actionPlayerId = payload.playerId || currentState.currentPlayer;

        // Verify it's their turn (skip for network actions from host which are already validated)
        if (actionPlayerId !== currentState.currentPlayer && !isNetworkAction) {
          debugLog('PASS_LOGIC', `🚨 [SECURITY] Blocking ${type} action - ${actionPlayerId} attempted action but it's ${currentState.currentPlayer}'s turn`);
          throw new Error(`Invalid action: ${actionPlayerId} attempted ${type} but it's ${currentState.currentPlayer}'s turn`);
        }
      }
    }

    // Handle shield allocation actions via commitment system
    if (currentState.turnPhase === 'allocateShields') {
      if (type === 'allocateShield') {
        debugLog('STATE_SYNC', `🛡️ Processing allocateShield action`);
        // See FUTURE_IMPROVEMENTS #34 — shield allocation via gameEngine
        return { success: true, message: 'Shield allocation not yet implemented in new system' };
      }
      if (type === 'resetShieldAllocation') {
        debugLog('STATE_SYNC', `🔄 Processing resetShieldAllocation action`);
        // See FUTURE_IMPROVEMENTS #34 — shield reset via gameEngine
        return { success: true, message: 'Shield reset not yet implemented in new system' };
      }
      if (type === 'endShieldAllocation') {
        debugLog('COMMITMENTS', `🏁 Processing endShieldAllocation action`);
        // Use commitment system for phase completion
        return await this.processCommitment({
          playerId: payload.playerId,
          phase: 'allocateShields',
          actionData: { shieldAllocation: [] }
        });
      }
    }

    // Check for action-specific locks
    if (this.actionLocks[type]) {
      throw new Error(`Action ${type} is currently locked`);
    }

    // Set lock for this action type
    this.actionLocks[type] = true;

    let result;
    try {
      // Strategy registry lookup
      const methodName = ACTION_STRATEGIES[type];
      const statusType = STATUS_CONSUMPTION_TYPES[type];

      if (methodName) {
        result = await this[methodName](payload);
      } else if (statusType) {
        debugLog('CONSUMPTION_DEBUG', `🟢 [2] ActionProcessor: ${type} case hit`, { payload });
        result = await _processStatusConsumption(statusType, payload, this._getActionContext());
        result.shouldEndTurn = true;
      } else {
        throw new Error(`Unknown action type: ${type}`);
      }

      // Store result for event emission in finally block
      this.lastActionResult = result;
      this.lastActionType = type;

      // Increment action counter for qualifying action types (for NOT_FIRST_ACTION ability condition)
      const actionCountingTypes = ['attack', 'cardPlay', 'move', 'ability', 'deployment', 'shipAbility'];
      if (actionCountingTypes.includes(type) && result && result.success !== false) {
        const currentCount = this.gameStateManager.getState().actionsTakenThisTurn || 0;
        this.gameStateManager.setState({ actionsTakenThisTurn: currentCount + 1 }, 'ACTION_COUNT_INCREMENT');
      }

      return result;
    } finally {
      // Emit action_completed for GameFlowManager (player actions only)
      const playerActionTypes = [
        'attack', 'ability', 'move', 'deployment', 'cardPlay',
        'shipAbility', 'shipAbilityCompletion',
        'movementCompletion', 'searchAndDrawCompletion',
        'aiAction', 'aiTurn', 'playerPass', 'turnTransition',
        'recallAbility', 'targetLockAbility',
        'recalculateComplete', 'reallocateShieldsComplete',
        'snaredConsumption', 'suppressedConsumption'
      ];

      if (playerActionTypes.includes(type) && this.lastActionResult) {
        debugLog('TURN_TRANSITION_DEBUG', `Emitting action_completed: ${type}`, {
          shouldEndTurn: this.lastActionResult?.shouldEndTurn,
          listenerCount: this.listeners?.length || 0
        });

        this.emit('action_completed', {
          actionType: type,
          payload: payload,
          result: this.lastActionResult
        });
      }

      // Broadcast moved to GameFlowManager.handleActionCompletion() to prevent desync
      this.actionLocks[type] = false;
      this.lastActionResult = null;
      this.lastActionType = null;
    }
  }

  async processAttack(payload) {
    return _processAttack(payload, this._getActionContext());
  }

  async processMove(payload) { return _processMove(payload, this._getActionContext()); }
  async processAbility(payload) { return _processAbility(payload, this._getActionContext()); }
  async processDeployment(payload) { return _processDeployment(payload, this._getActionContext()); }
  async processCardPlay(payload) {
    debugLog('CARD_PLAY_TRACE', '[3] ActionProcessor.processCardPlay', { card: payload.card?.name, playerId: payload.playerId, targetId: payload.targetId });
    return _processCardPlay(payload, this._getActionContext());
  }
  async processSearchAndDrawCompletion(payload) { return _processSearchAndDrawCompletion(payload, this._getActionContext()); }
  async processShipAbility(payload) { return _processShipAbility(payload, this._getActionContext()); }
  async processShipAbilityCompletion(payload) { return _processShipAbilityCompletion(payload, this._getActionContext()); }
  async processRecallAbility(payload) { return _processRecallAbility(payload, this._getActionContext()); }
  async processTargetLockAbility(payload) { return _processTargetLockAbility(payload, this._getActionContext()); }
  validateShipAbilityActivationLimit(sectionName, playerId, playerStates) { return _validateShipAbilityActivationLimit(sectionName, playerId, playerStates); }
  async processRecalculateAbility(payload) { return _processRecalculateAbility(payload, this._getActionContext()); }
  async processRecalculateComplete(payload) { return _processRecalculateComplete(payload, this._getActionContext()); }
  async processReallocateShieldsAbility(payload) { return _processReallocateShieldsAbility(payload, this._getActionContext()); }
  async processReallocateShieldsComplete(payload) { return _processReallocateShieldsComplete(payload, this._getActionContext()); }

  /**
   * Check for win conditions after state-changing actions
   * This method should be called after attacks, abilities, and card plays
   * that could destroy ship sections and end the game
   */
  checkWinCondition() {
    const currentState = this.gameStateManager.getState();

    // Don't check if game already has a winner
    if (currentState.winner) {
      return null;
    }

    const playerStates = {
      player1: currentState.player1,
      player2: currentState.player2
    };

    // Create callbacks that use GameStateManager methods
    const callbacks = {
      logCallback: (entry) => {
        this.gameStateManager.addLogEntry(entry, 'checkWinCondition');
      },
      setWinnerCallback: (winnerId) => {
        this.gameStateManager.setWinner(winnerId);
      },
      showWinnerModalCallback: () => {
        // Winner modal display is handled by App.jsx reactively through gameState.winner
        // No need to set separate UI state here
      }
    };

    // Call WinConditionChecker to check win condition
    const result = WinConditionChecker.checkGameStateForWinner(playerStates, callbacks);
    return result;
  }

  processForceWin() { return _processForceWin(null, this._getActionContext()); }
  async processTurnTransition(payload) { return _processTurnTransition(payload, this._getActionContext()); }
  async processPhaseTransition(payload) { return _processPhaseTransition(payload, this._getActionContext()); }
  async processRoundStart(payload) { return _processRoundStart(payload, this._getActionContext()); }
  async processReallocateShields(payload) { return _processReallocateShields(payload, this._getActionContext()); }
  async processAiAction(payload) { return _processAiAction(payload, this._getActionContext()); }

  isActionInProgress() {
    return this.isProcessing || Object.values(this.actionLocks).some(locked => locked);
  }

  getQueueLength() {
    return this.actionQueue.length;
  }

  /**
   * Process action received from network peer
   * @param {Object} actionData - Action data from peer
   */
  async processNetworkAction(actionData) {
    const { action } = actionData;
    debugLog('STATE_SYNC', `[P2P ACTION] Processing network action:`, action);

    // Mark as network action to prevent re-sending
    const networkAction = {
      ...action,
      isNetworkAction: true
    };

    // Queue the network action for processing
    return await this.queueAction(networkAction);
  }

  /**
   * Process action from guest client (host only)
   * Host receives guest actions and processes them authoritatively
   * @param {Object} action - Action from guest {type, payload}
   */
  async processGuestAction(action) {
    const gameMode = this.gameStateManager.get('gameMode');

    if (gameMode !== 'host') {
      debugLog('STATE_SYNC', 'processGuestAction called on non-host');
      return;
    }

    debugLog('STATE_SYNC', '[HOST] Processing guest action:', action);

    // Process the action in background (non-blocking)
    // Guest already played animations optimistically, so host doesn't need to block UI
    // Broadcasting happens immediately after state calculation (before animations)
    this.queueAction({
      type: action.type,
      payload: action.payload,
      isNetworkAction: true // Prevent re-broadcasting to guest
    }).then((result) => {
      debugLog('STATE_SYNC', '[HOST] Guest action processing complete:', action.type);
      // Note: Broadcasting already happened inside action method via broadcastStateToGuest()
      return result;
    }).catch((error) => {
      debugLog('STATE_SYNC', '[HOST] Error processing guest action:', error);
    });

    // Return immediately - host UI remains responsive
    debugLog('STATE_SYNC', '[HOST] Guest action queued for background processing:', action.type);
    return { success: true, processing: true };
  }

  /**
   * Execute animations and capture them for broadcasting to guest
   * @param {Array} animations - Animation events to execute
   * @param {boolean} isSystemAnimation - True for system animations (phase announcements), false for action animations
   * @param {boolean} waitForCompletion - If true, awaits animation completion (blocking). Default: true for proper animation sequencing.
   */
  async executeGoAgainAnimation(actingPlayerId) {
    const animDef = this.animationManager?.animations['GO_AGAIN_NOTIFICATION'];
    const goAgainAnim = [{
      animationName: 'GO_AGAIN_NOTIFICATION',
      timing: animDef?.timing || 'independent',
      payload: { actingPlayerId }
    }];
    await this.executeAndCaptureAnimations(goAgainAnim);
  }

  async executeAndCaptureAnimations(animations, isSystemAnimation = false, waitForCompletion = true) {
    if (!animations || animations.length === 0) return;

    const gameMode = this.gameStateManager.get('gameMode');

    // Capture for guest broadcasting (host only)
    if (gameMode === 'host') {
      (isSystemAnimation ? this.pendingSystemAnimations : this.pendingActionAnimations).push(...animations);
    }

    if (this.animationManager) {
      const source = gameMode === 'guest' ? 'GUEST_OPTIMISTIC' : gameMode === 'host' ? 'HOST_LOCAL' : 'LOCAL';
      if (waitForCompletion) {
        await this.animationManager.executeAnimations(animations, source);
      } else {
        return this.animationManager.executeAnimations(animations, source);
      }
    }
  }

  getAndClearPendingActionAnimations() {
    const animations = [...this.pendingActionAnimations];
    this.pendingActionAnimations = [];
    return animations;
  }

  getAndClearPendingSystemAnimations() {
    const animations = [...this.pendingSystemAnimations];
    this.pendingSystemAnimations = [];
    return animations;
  }

  /**
   * Prepare states for TELEPORT_IN animation timing
   * Creates invisible state (with isTeleporting flags) and final visible state
   * @param {Array} animations - Animations to check for TELEPORT_IN
   * @param {Object} newPlayerStates - New player states from game logic (player1/player2 only)
   * @returns {Object} { pendingStateUpdate, pendingFinalState }
   */
  prepareTeleportStates(animations, newPlayerStates) {
    // Guard against incomplete result structure from async operations
    if (!newPlayerStates || !newPlayerStates.player1 || !newPlayerStates.player2) {
      debugLog('ANIMATIONS', 'prepareTeleportStates: Incomplete newPlayerStates, skipping teleport preparation');
      return { pendingStateUpdate: null, pendingFinalState: null };
    }

    // Get current game state to preserve all properties
    const currentState = this.gameStateManager.getState();

    // Create complete state by merging player states with current game state
    // This ensures ALL properties are included (turnPhase, currentPlayer, roundNumber, appState, etc.)
    const completeNewState = {
      ...currentState,           // All game-level properties
      player1: newPlayerStates.player1,
      player2: newPlayerStates.player2
    };

    const hasTeleportIn = animations.some(a => a.animationName === 'TELEPORT_IN');

    if (!hasTeleportIn) {
      // No TELEPORT_IN animations - return complete state
      return {
        pendingStateUpdate: completeNewState,
        pendingFinalState: null
      };
    }

    debugLog('ANIMATIONS', '🌀 [TELEPORT PREP] Detected TELEPORT_IN animations, preparing invisible drone state');

    // Create modified state with isTeleporting flags for affected drones
    const stateWithInvisibleDrones = addTeleportingFlags(completeNewState, animations);

    return {
      pendingStateUpdate: stateWithInvisibleDrones,  // Invisible drones (with isTeleporting)
      pendingFinalState: completeNewState            // Visible drones (without isTeleporting)
    };
  }

  /**
   * Execute a single animation phase: prepare teleport states, broadcast to guest, execute, clean up.
   * Extracts the repeated boilerplate from processAttack, processAbility, processDeployment,
   * processCardPlay, and processShipAbility.
   * @param {Array} animations - Animation events to execute
   * @param {Object} newPlayerStates - { player1, player2 } from game logic result
   */
  async _executeAnimationPhase(animations, newPlayerStates) {
    const { pendingStateUpdate, pendingFinalState } = this.prepareTeleportStates(
      animations,
      newPlayerStates
    );

    this.pendingStateUpdate = pendingStateUpdate;
    this.pendingFinalState = pendingFinalState;

    const gameMode = this.gameStateManager.get('gameMode');
    if (gameMode === 'host') {
      this.broadcastStateToGuest();
    }

    try {
      await this.animationManager.executeWithStateUpdate(animations, this);
    } finally {
      this.pendingStateUpdate = null;
      this.pendingFinalState = null;
    }
  }

  /**
   * Execute a function with _updateContext set to 'ActionProcessor'.
   * Replaces 18 try/finally blocks that set and clear _updateContext.
   */
  _withUpdateContext(fn) {
    try {
      this.gameStateManager._updateContext = 'ActionProcessor';
      return fn();
    } finally {
      this.gameStateManager._updateContext = null;
    }
  }

  /**
   * Add isTeleporting flags to drones in TELEPORT_IN animations
   * Creates modified state where teleporting drones are invisible (isTeleporting: true)
   * @param {Object} newPlayerStates - Player states to modify
   * @param {Array} animations - All animations being played
   * @returns {Object} Modified player states with isTeleporting flags
   */
  /**
   * Apply intermediate trigger state (called by AnimationManager when encountering STATE_SNAPSHOT)
   * Allows per-trigger state visibility during animation playback
   * @param {Object} playerStates - Intermediate player states { player1, player2 }
   */
  applyIntermediateState(playerStates) {
    if (playerStates) {
      debugLog('ANIMATIONS', '[STATE_SNAPSHOT] Applying intermediate trigger state');
      this.gameStateManager.setPlayerStates(playerStates.player1, playerStates.player2);
    }
  }

  /**
   * Apply pending state update (called by AnimationManager during orchestration)
   * Used by AnimationManager.executeWithStateUpdate() to apply state at correct timing
   */
  applyPendingStateUpdate() {
    if (this.pendingStateUpdate) {
      debugLog('ANIMATIONS', '📝 [STATE UPDATE] ActionProcessor applying pending state update');
      this.gameStateManager.setPlayerStates(
        this.pendingStateUpdate.player1,
        this.pendingStateUpdate.player2
      );
    } else {
      debugLog('ANIMATIONS', '⚠️ [STATE UPDATE] No pending state update to apply');
    }
  }

  /**
   * Get animation source for current game mode
   * Used by AnimationManager.executeWithStateUpdate() for logging
   * @returns {string} Animation source identifier
   */
  getAnimationSource() {
    const gameMode = this.gameStateManager.get('gameMode');
    return gameMode === 'guest' ? 'GUEST_OPTIMISTIC' :
           gameMode === 'host' ? 'HOST_LOCAL' : 'LOCAL';
  }

  /**
   * Reveal teleported drones mid-animation (called by AnimationManager)
   * Removes isTeleporting flags to make drones visible at 70% of TELEPORT_IN animation
   * @param {Array} teleportAnimations - TELEPORT_IN animations being played
   */
  revealTeleportedDrones(teleportAnimations) {
    debugLog('ANIMATIONS', '✨ [TELEPORT REVEAL] ActionProcessor revealing teleported drones:', {
      count: teleportAnimations.length,
      hasPendingFinalState: !!this.pendingFinalState
    });

    if (this.pendingFinalState) {
      // Apply final state without isTeleporting flags
      this.gameStateManager.setPlayerStates(
        this.pendingFinalState.player1,
        this.pendingFinalState.player2
      );
      debugLog('ANIMATIONS', '✅ [TELEPORT REVEAL] Drones revealed');
    } else {
      debugLog('ANIMATIONS', '⚠️ [TELEPORT REVEAL] No pending final state to apply');
    }
  }

  /**
   * Broadcast current game state to guest (host only)
   * Called after every action that changes game state
   * @param {string} trigger - Reason for broadcast (e.g., 'after_action', 'phase_transition')
   */
  broadcastStateToGuest(trigger = 'unknown') {
    const gameMode = this.gameStateManager.get('gameMode');

    if (gameMode !== 'host') {
      return; // Only host broadcasts state
    }

    if (this.p2pManager && this.p2pManager.isConnected) {
      // Priority: finalState (post-teleport) > pendingState (pre-teleport/normal) > currentState
      const stateToBroadcast = this.pendingFinalState || this.pendingStateUpdate || this.gameStateManager.getState();
      const actionAnimations = this.getAndClearPendingActionAnimations();
      const systemAnimations = this.getAndClearPendingSystemAnimations();

      const stateSource = this.pendingFinalState ? 'FINAL' : this.pendingStateUpdate ? 'PENDING' : 'CURRENT';
      debugLog('BROADCAST_TIMING', `📡 [HOST BROADCAST] Source: ${stateSource} | Trigger: ${trigger} | Anims: ${actionAnimations.length + systemAnimations.length}`);

      this.p2pManager.broadcastState(stateToBroadcast, actionAnimations, systemAnimations);
    }
  }

  // --- Delegation methods (public API for external callers and ActionContext) ---
  async processPlayerPass(payload) { return _processPlayerPass(payload, this._getActionContext()); }
  async processAiShipPlacement(payload) { return _processAiShipPlacement(payload, this._getActionContext()); }
  async processOptionalDiscard(payload) { return _processOptionalDiscard(payload, this._getActionContext()); }
  async processFirstPlayerDetermination() { return _processFirstPlayerDetermination(null, this._getActionContext()); }
  getPhaseCommitmentStatus(phase) { return _getPhaseCommitmentStatus(phase, this._getActionContext()); }
  clearPhaseCommitments(phase = null) { return _clearPhaseCommitments(phase, this._getActionContext()); }
  async processCommitment(payload) { return _processCommitment(payload, this._getActionContext()); }
  async handleAICommitment(phase, currentState) { return _handleAICommitment(phase, currentState, this._getActionContext()); }
  applyPhaseCommitments(phase) { return _applyPhaseCommitments(phase, this._getActionContext()); }
  async processDraw(payload) { return _processDraw(payload, this._getActionContext()); }
  async processEnergyReset(payload) { return _processEnergyReset(payload, this._getActionContext()); }
  async processRoundStartTriggers(payload) { return _processRoundStartTriggers(payload, this._getActionContext()); }
  async processRebuildProgress(payload) { return _processRebuildProgress(payload, this._getActionContext()); }
  async processMomentumAward(payload) { return _processMomentumAward(payload, this._getActionContext()); }
  async processDestroyDrone(payload) { return _processDestroyDrone(payload, this._getActionContext()); }
  async processDebugAddCardsToHand(payload) { return _processDebugAddCardsToHand(payload, this._getActionContext()); }
  async processAddShield(payload) { return _processAddShield(payload, this._getActionContext()); }
  async processResetShields(payload) { return _processResetShields(payload, this._getActionContext()); }

  /**
   * Clear all pending actions (emergency use only)
   */
  clearQueue() {
    this.actionQueue.forEach(action => {
      action.reject(new Error('Action queue cleared'));
    });
    this.actionQueue = [];

    // Reset all locks
    Object.keys(this.actionLocks).forEach(key => {
      this.actionLocks[key] = false;
    });

    this.isProcessing = false;

    // Clear event listeners to prevent stale subscriptions
    this.listeners = [];

    // Clear pending animation queues
    this.pendingActionAnimations = [];
    this.pendingSystemAnimations = [];

    // Clear pending state updates
    this.pendingStateUpdate = null;
    this.pendingFinalState = null;
  }

  /**
   * Consume a status effect from a drone (snared or suppressed)
   * Clears the status flag, exhausts the drone, logs the cancellation, plays animation
   * @param {string} statusType - 'snared' or 'suppressed'
   * @param {Object} params - { droneId, playerId }
   */
  async processStatusConsumption(statusType, params) {
    return _processStatusConsumption(statusType, params, this._getActionContext());
  }

  // Delegate methods for backwards compatibility with switch cases
  async processSnaredConsumption(params) {
    return this.processStatusConsumption('snared', params);
  }

  async processSuppressedConsumption(params) {
    return this.processStatusConsumption('suppressed', params);
  }
}

export default ActionProcessor;