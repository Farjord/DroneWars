// All game actions must go through this processor to ensure serialization.

import WinConditionChecker from '../logic/game/WinConditionChecker.js';
import aiPhaseProcessor from './AIPhaseProcessor.js';
import GameDataService from '../services/GameDataService.js';
import PhaseManager from './PhaseManager.js';
import { debugLog, timingLog } from '../utils/debugLogger.js';
import { flowCheckpoint } from '../utils/flowVerification.js';
import { countDrones as _countDrones } from '../utils/stateHelpers.js';
import { STATE_SNAPSHOT, TRIGGER_CHAIN_PAUSE, GO_AGAIN_NOTIFICATION, TRIGGER_FIRED } from '../config/animationTypes.js';

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
  processRoundEndTriggers as _processRoundEndTriggers,
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
  roundEndTriggers: 'processRoundEndTriggers',
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
   * @returns {ActionProcessor} Single shared instance
   */
  static getInstance(gameStateManager) {
    if (!ActionProcessor.instance) {
      ActionProcessor.instance = new ActionProcessor(gameStateManager);
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

  constructor(gameStateManager) {
    // Enforce singleton pattern
    if (ActionProcessor.instance) {
      debugLog('STATE_SYNC', 'ActionProcessor already exists. Use getInstance() instead of new ActionProcessor()');
      return ActionProcessor.instance;
    }

    this.gameStateManager = gameStateManager;
    this.gameDataService = GameDataService.getInstance(gameStateManager);
    this.animationManager = null;

    this.actionQueue = [];
    this.isProcessing = false;
    this.phaseManager = null; // Reference to PhaseManager for authoritative phase transitions
    this.aiPhaseProcessor = null; // Reference to AIPhaseProcessor for AI interception decisions
    this.actionLocks = {
      attack: false,
      ability: false,
      deployment: false,
      cardPlay: false,
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

    // Accumulates all animations executed during a single processAction call.
    // Used by GameEngine to return animations alongside state in the response.
    this._actionAnimationLog = { actionAnimations: [], systemAnimations: [] };

    // Response-level accumulator that spans all actions within a single GameEngine response.
    // Unlike _actionAnimationLog (reset per processAction), this captures cascading animations
    // from phase transitions triggered by handleActionCompletion/waitForPendingActionCompletion.
    this._responseAnimationLog = null;

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
      getPlacedSections: () => {
        const state = ap.gameStateManager.getState();
        return { player1: state.placedSections, player2: state.opponentPlacedSections };
      },
      getEffectiveStats: (drone, lane) => ap.gameDataService.getEffectiveStats(drone, lane),
      createCallbacks: (...args) => ap.gameStateManager.createCallbacks(...args),

      // Animation (late-bound via getters since set after construction)
      getAnimationManager: () => ap.animationManager,
      executeGoAgainAnimation: (pid) => ap.executeGoAgainAnimation(pid),
      executeAndCaptureAnimations: (...args) => ap.executeAndCaptureAnimations(...args),
      mapAnimationEvents: (events) => {
        const mapped = (events || []).map((event, idx) => {
          if (event.type === STATE_SNAPSHOT) {
            return {
              animationName: STATE_SNAPSHOT,
              timing: 'pre-state',
              payload: event
            };
          }
          if (event.type === TRIGGER_CHAIN_PAUSE) {
            return {
              animationName: TRIGGER_CHAIN_PAUSE,
              timing: 'pre-state',
              payload: event
            };
          }
          const animDef = ap.animationManager?.animations[event.type];
          const timing = animDef?.timing || 'pre-state';
          return {
            animationName: event.type,
            timing,
            payload: {
              ...event,
              droneId: event.sourceId || event.targetId
            }
          };
        });
        if (mapped.length > 0) {
          debugLog('ANIM_TRACE', '[1/6] mapAnimationEvents: raw events transformed', {
            inputCount: events?.length || 0,
            outputCount: mapped.length,
            types: [...new Set(mapped.map(a => a.animationName))],
            timings: mapped.reduce((acc, a) => { acc[a.timing] = (acc[a.timing] || 0) + 1; return acc; }, {}),
          });
        }
        return mapped;
      },
      captureAnimations: (animations) => {
        // Pass all animations through — STATE_SNAPSHOT redaction is handled
        // by GameEngine._emitToClients before delivery to each client
        if (animations?.length) {
          ap._actionAnimationLog.actionAnimations.push(...animations);
          // Also push to response-level accumulator when active
          if (ap._responseAnimationLog) {
            ap._responseAnimationLog.actionAnimations.push(...animations);
          }
        }
        debugLog('ANIM_TRACE', '[2/6] captureAnimations', {
          count: animations?.length || 0,
          names: (animations || []).map(a => a.animationName),
        });
        // triggerSyncId stamping is handled exclusively by executeAndCaptureAnimations
        // to avoid duplicate/conflicting IDs within the same action
      },

      // Action delegation (for callbacks that re-enter ActionProcessor)
      processAttack: (payload) => ap.processAttack(payload),
      processMove: (payload) => ap.processMove(payload),
      processAbility: (payload) => ap.processAbility(payload),
      processCardPlay: (payload) => ap.processCardPlay(payload),
      processDeployment: (payload) => ap.processDeployment(payload),
      processCommitment: (payload) => ap.processCommitment(payload),
      processDestroyDrone: (payload) => ap.processDestroyDrone(payload),

      // Win condition
      checkWinCondition: () => ap.checkWinCondition(),

      // Commitment delegation
      clearPhaseCommitments: (phase) => ap.clearPhaseCommitments(phase),

      // Mode-agnostic queries
      isPlayerAI: (playerId) => ap.gameServer?.isPlayerAI(playerId) ?? false,

      // Late-bound references
      getAiPhaseProcessor: () => ap.aiPhaseProcessor,
      getPhaseManager: () => ap.phaseManager,
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
   * Set PhaseManager reference for authoritative phase transitions
   * @param {Object} phaseManager - PhaseManager instance
   */
  setPhaseManager(phaseManager) {
    this.phaseManager = phaseManager;
    debugLog('PHASE_MANAGER', '🔗 ActionProcessor: PhaseManager reference set');
  }

  /**
   * Set GameServer reference for mode-agnostic queries (isPlayerAI, etc.)
   * @param {Object} gameServer - GameServer instance
   */
  setGameServer(gameServer) {
    this.gameServer = gameServer;
    debugLog('STATE_SYNC', '🔗 ActionProcessor: GameServer reference set');
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
      queueLength: this.actionQueue.length
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
    const { type, payload } = action;

    // Reset animation log for this action
    this._actionAnimationLog = { actionAnimations: [], systemAnimations: [] };

    // Get current state for validation
    const currentState = this.gameStateManager.getState();

    // PASS STATE VALIDATION - Prevent actions after players have passed
    if (currentState.passInfo) {
      // Actions that should be blocked if current player has passed
      const playerActionTypes = ['attack', 'ability', 'deployment', 'cardPlay', 'recallAbility', 'targetLockAbility', 'recalculateAbility', 'reallocateShieldsAbility'];
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
      const playerActionTypes = ['attack', 'ability', 'deployment', 'cardPlay', 'searchAndDrawCompletion'];
      if (playerActionTypes.includes(type)) {
        // Determine which player is attempting this action
        const actionPlayerId = payload.playerId || currentState.currentPlayer;

        // Verify it's their turn
        if (actionPlayerId !== currentState.currentPlayer) {
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

      if (type === 'deployment') {
        debugLog('DEPLOY_TRACE', '[6/10] ActionProcessor strategy dispatch', {
          type,
          methodName: methodName || statusType || 'unknown',
        });
      }

      if (methodName) {
        result = await this[methodName](payload);
      } else if (statusType) {
        debugLog('CONSUMPTION_DEBUG', `🟢 [2] ActionProcessor: ${type} case hit`, { payload });
        result = await _processStatusConsumption(statusType, payload, this._getActionContext());
        result.shouldEndTurn = true;
      } else {
        throw new Error(`Unknown action type: ${type}`);
      }

      // Stamp triggerSyncId on any TRIGGER_FIRED that weren't stamped by executeAndCaptureAnimations
      const allAnims = [...this._actionAnimationLog.actionAnimations, ...this._actionAnimationLog.systemAnimations];
      const unstampedTriggers = allAnims.filter(a => a.animationName === TRIGGER_FIRED && !a.payload?.triggerSyncId);
      if (unstampedTriggers.length > 0) {
        const triggerSyncId = Date.now();
        unstampedTriggers.forEach(a => { a.payload = { ...a.payload, triggerSyncId }; });
      }

      // Store result for event emission in finally block
      this.lastActionResult = result;
      this.lastActionType = type;

      // Increment action counter for qualifying action types (for NOT_FIRST_ACTION ability condition)
      const actionCountingTypes = ['attack', 'cardPlay', 'move', 'ability', 'deployment'];
      if (actionCountingTypes.includes(type) && result && result.success !== false) {
        const currentCount = this.gameStateManager.getState().actionsTakenThisTurn || 0;
        this.gameStateManager.setState({ actionsTakenThisTurn: currentCount + 1 }, 'ACTION_COUNT_INCREMENT');
      }

      return result;
    } finally {
      // Emit action_completed for GameFlowManager (player actions only)
      const playerActionTypes = [
        'attack', 'ability', 'move', 'deployment', 'cardPlay',
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
      }
    };

    // Call WinConditionChecker to check win condition
    const result = WinConditionChecker.checkGameStateForWinner(playerStates, callbacks);

    if (result) {
      const gs = this.gameStateManager.getState();
      debugLog('STATE_CHECKPOINT', '[GAME_OVER]', {
        round: gs.roundNumber, phase: gs.turnPhase, currentPlayer: gs.currentPlayer,
        winner: result.winner,
        p1: { drones: _countDrones(gs.player1), hand: gs.player1?.hand?.length, energy: gs.player1?.energy, momentum: gs.player1?.momentum },
        p2: { drones: _countDrones(gs.player2), hand: gs.player2?.hand?.length, energy: gs.player2?.energy, momentum: gs.player2?.momentum },
      });
    }

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
   * Execute animations and capture them for broadcasting to clients
   * @param {Array} animations - Animation events to execute
   * @param {boolean} isSystemAnimation - True for system animations (phase announcements), false for action animations
   * @param {boolean} waitForCompletion - If true, awaits animation completion (blocking). Default: true for proper animation sequencing.
   */
  async executeGoAgainAnimation(actingPlayerId) {
    const animDef = this.animationManager?.animations[GO_AGAIN_NOTIFICATION];
    const goAgainAnim = [{
      animationName: GO_AGAIN_NOTIFICATION,
      timing: animDef?.timing || 'independent',
      payload: { actingPlayerId }
    }];
    await this.executeAndCaptureAnimations(goAgainAnim);
  }

  /**
   * Begin capturing animations for a GameEngine response cycle.
   * Called by GameEngine before processing — spans all cascading actions.
   */
  startResponseCapture() {
    this._responseAnimationLog = { actionAnimations: [], systemAnimations: [] };
    flowCheckpoint('CAPTURE_OPENED');
  }

  /**
   * Return all animations captured during the response cycle and deactivate capture.
   * Called by GameEngine after waitForPendingActionCompletion completes.
   */
  getAndClearResponseCapture() {
    const captured = this._responseAnimationLog;
    this._responseAnimationLog = null;
    return captured || { actionAnimations: [], systemAnimations: [] };
  }

  async executeAndCaptureAnimations(animations, isSystemAnimation = false) {
    if (!animations || animations.length === 0) return;

    debugLog('ANIM_TRACE', '[1b/6] executeAndCaptureAnimations', {
      count: animations.length,
      isSystem: isSystemAnimation,
      names: animations.map(a => a.animationName),
    });

    // Stamp triggerSyncId for TRIGGER_SYNC_TRACE correlation
    const triggerAnims = animations.filter(a => a.animationName === TRIGGER_FIRED);
    if (triggerAnims.length > 0) {
      const triggerSyncId = Date.now();
      triggerAnims.forEach(a => { a.payload = { ...a.payload, triggerSyncId }; });
      debugLog('TRIGGER_SYNC_TRACE', '[1/7] SERVER: Trigger captured for delivery', {
        utc: new Date().toISOString(),
        triggerSyncId,
        triggerCount: triggerAnims.length,
        triggerNames: triggerAnims.map(a => a.payload?.abilityName || a.payload?.type),
      });
    }

    // Log to per-action log (reset each processAction call)
    const actionTarget = isSystemAnimation ? this._actionAnimationLog.systemAnimations : this._actionAnimationLog.actionAnimations;
    actionTarget.push(...animations);

    // Also push to response-level accumulator when active (spans all cascading actions)
    if (this._responseAnimationLog) {
      const responseTarget = isSystemAnimation ? this._responseAnimationLog.systemAnimations : this._responseAnimationLog.actionAnimations;
      responseTarget.push(...animations);
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
  async processRoundEndTriggers(payload) { return _processRoundEndTriggers(payload, this._getActionContext()); }
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

}

export default ActionProcessor;