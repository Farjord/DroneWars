// All game actions must go through this processor to ensure serialization.

import { gameEngine } from '../logic/gameLogic.js';
import CardPlayManager from '../logic/cards/CardPlayManager.js';
import { resolveAttack } from '../logic/combat/AttackProcessor.js';
import fullDroneCollection from '../data/droneData.js';
import { calculateEffectiveStats } from '../logic/statsCalculator.js';
import { LaneControlCalculator } from '../logic/combat/LaneControlCalculator.js';
import { calculatePotentialInterceptors, calculateAiInterception } from '../logic/combat/InterceptionProcessor.js';
import MovementEffectProcessor from '../logic/effects/movement/MovementEffectProcessor.js';
import ConditionalEffectProcessor from '../logic/effects/conditional/ConditionalEffectProcessor.js';
import EffectRouter from '../logic/EffectRouter.js';
import DeploymentProcessor from '../logic/deployment/DeploymentProcessor.js';
import RoundManager from '../logic/round/RoundManager.js';
import ShieldManager from '../logic/shields/ShieldManager.js';
import WinConditionChecker from '../logic/game/WinConditionChecker.js';
import AbilityResolver from '../logic/abilities/AbilityResolver.js';
import RecallAbilityProcessor from '../logic/abilities/ship/RecallAbilityProcessor.js';
import TargetLockAbilityProcessor from '../logic/abilities/ship/TargetLockAbilityProcessor.js';
import RecalculateAbilityProcessor from '../logic/abilities/ship/RecalculateAbilityProcessor.js';
import ReallocateShieldsAbilityProcessor from '../logic/abilities/ship/ReallocateShieldsAbilityProcessor.js';
import aiPhaseProcessor from './AIPhaseProcessor.js';
import GameDataService from '../services/GameDataService.js';
import PhaseManager from './PhaseManager.js';
import { debugLog, timingLog, getTimestamp } from '../utils/debugLogger.js';
import { shipComponentCollection } from '../data/shipSectionData.js';
import SeededRandom from '../utils/seededRandom.js';
import { initializeForCombat as initializeDroneAvailability } from '../logic/availability/DroneAvailabilityManager.js';
import { checkRallyBeaconGoAgain } from '../logic/utils/rallyBeaconHelper.js';
import { processTrigger as processMineTrigger } from '../logic/effects/mines/MineTriggeredEffectProcessor.js';
import {
  processAttack as _processAttack,
  processMove as _processMove,
  processAbility as _processAbility
} from '../logic/actions/CombatActionStrategy.js';
import {
  processCardPlay as _processCardPlay,
  processAdditionalCostCardPlay as _processAdditionalCostCardPlay,
  processAdditionalCostEffectSelectionComplete as _processAdditionalCostEffectSelectionComplete,
  processMovementCompletion as _processMovementCompletion,
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
      additionalCostCardPlay: false,
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
      mapAnimationEvents: (events) => (events || []).map(event => {
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
      processCommitment: (payload) => ap.processCommitment(payload),
      processDestroyDrone: (payload) => ap.processDestroyDrone(payload),
      broadcastStateToGuest: () => ap.broadcastStateToGuest(),

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

    debugLog('PASS_LOGIC', `🔵 [ACTION PROCESSOR] processAction called`, {
      type,
      isNetworkAction,
      gameMode: this.gameStateManager?.getState()?.gameMode
    });

    // Get current state for validation
    const currentState = this.gameStateManager.getState();

    // PASS STATE VALIDATION - Prevent actions after players have passed
    if (currentState.passInfo) {
      // Actions that should be blocked if current player has passed
      const playerActionTypes = ['attack', 'ability', 'deployment', 'cardPlay', 'additionalCostCardPlay', 'shipAbility', 'recallAbility', 'targetLockAbility', 'recalculateAbility', 'reallocateShieldsAbility'];
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
      const playerActionTypes = ['attack', 'ability', 'deployment', 'cardPlay', 'additionalCostCardPlay', 'shipAbility', 'movementCompletion', 'searchAndDrawCompletion'];
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
        // TODO: Implement shield allocation via gameEngine
        return { success: true, message: 'Shield allocation not yet implemented in new system' };
      }
      if (type === 'resetShieldAllocation') {
        debugLog('STATE_SYNC', `🔄 Processing resetShieldAllocation action`);
        // TODO: Implement shield reset via gameEngine
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

    let result; // Capture result for event emission
    try {
      switch (type) {
        case 'attack':
          result = await this.processAttack(payload);
          break;

        case 'ability':
          result = await this.processAbility(payload);
          break;

        case 'move':
          result = await this.processMove(payload);
          break;

        case 'deployment':
          result = await this.processDeployment(payload);
          break;

        case 'cardPlay':
          result = await this.processCardPlay(payload);
          break;

        case 'additionalCostCardPlay':
          result = await this.processAdditionalCostCardPlay(payload);
          break;

        case 'additionalCostEffectSelectionComplete':
          result = await this.processAdditionalCostEffectSelectionComplete(payload);
          break;

        case 'movementCompletion':
          result = await this.processMovementCompletion(payload);
          break;

        case 'searchAndDrawCompletion':
          result = await this.processSearchAndDrawCompletion(payload);
          break;

        case 'shipAbility':
          result = await this.processShipAbility(payload);
          break;

        case 'shipAbilityCompletion':
          result = await this.processShipAbilityCompletion(payload);
          break;

        case 'recallAbility':
          result = await this.processRecallAbility(payload);
          break;

        case 'targetLockAbility':
          result = await this.processTargetLockAbility(payload);
          break;

        case 'recalculateAbility':
          result = await this.processRecalculateAbility(payload);
          break;

        case 'recalculateComplete':
          result = await this.processRecalculateComplete(payload);
          break;

        case 'reallocateShieldsAbility':
          result = await this.processReallocateShieldsAbility(payload);
          break;

        case 'reallocateShieldsComplete':
          result = await this.processReallocateShieldsComplete(payload);
          break;

        case 'turnTransition':
          result = await this.processTurnTransition(payload);
          break;

        case 'phaseTransition':
          result = await this.processPhaseTransition(payload);
          break;

        case 'roundStart':
          result = await this.processRoundStart(payload); break;

        case 'reallocateShields':
          result = await this.processReallocateShields(payload); break;

        case 'aiAction':
          result = await this.processAiAction(payload); break;

        case 'playerPass':
          result = await this.processPlayerPass(payload); break;

        case 'aiShipPlacement':
          result = await this.processAiShipPlacement(payload); break;

        case 'optionalDiscard':
          result = await this.processOptionalDiscard(payload); break;

        case 'processFirstPlayerDetermination':
          result = await this.processFirstPlayerDetermination(); break;

        case 'commitment':
          result = await this.processCommitment(payload); break;

        case 'draw':
          result = await this.processDraw(payload); break;

        case 'energyReset':
          result = await this.processEnergyReset(payload); break;

        case 'roundStartTriggers':
          result = await this.processRoundStartTriggers(payload); break;

        case 'rebuildProgress':
          result = await this.processRebuildProgress(payload); break;

        case 'momentumAward':
          result = await this.processMomentumAward(payload); break;

        case 'destroyDrone':
          result = await this.processDestroyDrone(payload); break;

        case 'addShield':
          result = await this.processAddShield(payload); break;

        case 'resetShields':
          result = await this.processResetShields(payload); break;

        case 'debugAddCardsToHand':
          result = await this.processDebugAddCardsToHand(payload); break;

        case 'snaredConsumption':
          debugLog('CONSUMPTION_DEBUG', '🟢 [2] ActionProcessor: snaredConsumption case hit', { payload });
          result = await this.processSnaredConsumption(payload);
          result.shouldEndTurn = true;
          break;

        case 'suppressedConsumption':
          debugLog('CONSUMPTION_DEBUG', '🟢 [2] ActionProcessor: suppressedConsumption case hit', { payload });
          result = await this.processSuppressedConsumption(payload);
          result.shouldEndTurn = true;
          break;

        default:
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
      // Emit action completed event for GameFlowManager
      // Only emit for player actions that might need turn transitions or broadcasting
      const playerActionTypes = [
        'attack', 'ability', 'move', 'deployment', 'cardPlay',
        'additionalCostCardPlay',
        'shipAbility', 'shipAbilityCompletion',
        'movementCompletion', 'searchAndDrawCompletion',
        'aiAction', 'aiTurn', 'playerPass', 'turnTransition',
        // Ship abilities (single-step abilities and multi-step completions only)
        'recallAbility',
        'targetLockAbility',
        'recalculateComplete',
        'reallocateShieldsComplete',
        'snaredConsumption',
        'suppressedConsumption'
      ];

      debugLog('PASS_LOGIC', `🔧 [ACTION PROCESSOR] Finally block executing`, {
        type,
        isPlayerAction: playerActionTypes.includes(type),
        hasResult: !!this.lastActionResult,
        willEmit: playerActionTypes.includes(type) && !!this.lastActionResult,
        gameMode: this.gameStateManager?.getState()?.gameMode
      });

      debugLog('TURN_TRANSITION_DEBUG', 'Finally block executing', {
        type,
        isPlayerAction: playerActionTypes.includes(type),
        hasResult: !!this.lastActionResult,
        willEmit: playerActionTypes.includes(type) && !!this.lastActionResult,
        listenerCount: this.listeners?.length || 0
      });

      if (playerActionTypes.includes(type) && this.lastActionResult) {
        debugLog('PASS_LOGIC', `📢 [ACTION PROCESSOR] Emitting action_completed event`, {
          actionType: type,
          hasResult: !!this.lastActionResult,
          gameMode: this.gameStateManager?.getState()?.gameMode,
          willEmit: true
        });

        debugLog('TURN_TRANSITION_DEBUG', 'Emitting action_completed event', {
          actionType: type,
          listenerCount: this.listeners?.length || 0,
          shouldEndTurn: this.lastActionResult?.shouldEndTurn
        });

        // Consumption debug logging
        if (type === 'snaredConsumption' || type === 'suppressedConsumption') {
          debugLog('CONSUMPTION_DEBUG', '🟢 [3] ActionProcessor: About to emit action_completed', { type, result: this.lastActionResult, listenerCount: this.listeners?.length });
        }

        this.emit('action_completed', {
          actionType: type,  // Use 'actionType' to avoid collision with event.type
          payload: payload,
          result: this.lastActionResult
        });
      }

      // NOTE: Broadcast moved to GameFlowManager.handleActionCompletion()
      // This ensures broadcast happens AFTER turn transitions complete
      // Prevents desync where guest receives stale currentPlayer value

      // Always release the lock
      this.actionLocks[type] = false;

      // Clear last action tracking
      this.lastActionResult = null;
      this.lastActionType = null;
    }
  }

  async processAttack(payload) {
    return _processAttack(payload, this._getActionContext());
  }

  async processMove(payload) {
    return _processMove(payload, this._getActionContext());
  }

  async processAbility(payload) {
    return _processAbility(payload, this._getActionContext());
  }

  /**
   * Process deployment action
   */
  async processDeployment(payload) {
    const { droneData, laneId, playerId, turn } = payload;

    debugLog('DEPLOYMENT', '📥 ActionProcessor.processDeployment: Received payload:', {
      droneDataName: droneData?.name,
      droneDataType: typeof droneData,
      droneDataKeys: droneData ? Object.keys(droneData) : 'null',
      laneId,
      playerId,
      turn
    });

    const currentState = this.gameStateManager.getState();
    const playerState = currentState[playerId];
    const opponentId = playerId === 'player1' ? 'player2' : 'player1';
    const opponentState = currentState[opponentId];

    const placedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    const logCallback = (entry) => {
      this.gameStateManager.addLogEntry(entry);
    };

    // Use DeploymentProcessor instead of gameEngine
    const deploymentProcessor = new DeploymentProcessor();
    const result = deploymentProcessor.executeDeployment(
      droneData,
      laneId,
      turn || currentState.turn,
      playerState,
      opponentState,
      placedSections,
      logCallback,
      playerId
    );

    if (result.success) {
      const deployedDroneId = result.deployedDrone?.id || droneData.id;

      // Extract animation events from gameLogic result
      // Include timing property from AnimationManager for proper sequencing on guest side
      const animations = (result.animationEvents || []).map(event => {
        const animDef = this.animationManager?.animations[event.type];
        return {
          animationName: event.type,
          timing: animDef?.timing || 'pre-state',  // Include timing from definition
          payload: {
            ...event,
            droneId: event.targetId
          }
        };
      });

      // Capture animations for broadcasting (host only)
      const gameMode = this.gameStateManager.get('gameMode');
      if (gameMode === 'host' && animations.length > 0) {
        this.pendingActionAnimations.push(...animations);
      }

      // Prepare states for TELEPORT_IN animation timing
      // Handle ON_DEPLOY effects that may have modified opponent state
      const opponentId = playerId === 'player1' ? 'player2' : 'player1';
      const newPlayerStates = {
        player1: playerId === 'player1' ? result.newPlayerState : (result.opponentState || currentState.player1),
        player2: playerId === 'player2' ? result.newPlayerState : (result.opponentState || currentState.player2)
      };

      await this._executeAnimationPhase(animations, newPlayerStates);

      debugLog('TURN_TRANSITION_DEBUG', 'processDeployment returning', {
        success: result.success,
        shouldEndTurn: true,
        currentPlayer: currentState.currentPlayer
      });

      // Return result with animations for optimistic action tracking
      return {
        ...result,
        shouldEndTurn: true, // Deployment always ends turn
        animations: {
          actionAnimations: animations,
          systemAnimations: []
        }
      };
    }

    return result;
  }

  async processCardPlay(payload) {
    return _processCardPlay(payload, this._getActionContext());
  }

  /**
   * Process movement card completion (SINGLE_MOVE or MULTI_MOVE)
   * Called after user has selected drones and destination in UI
   * Card costs are paid here (not during initial card play)
   */
  async processAdditionalCostCardPlay(payload) {
    return _processAdditionalCostCardPlay(payload, this._getActionContext());
  }

  /**
   * Process additional cost effect selection completion
   *
   * Called when user completes selecting the effect target for an additional cost card
   * (e.g., after selecting which enemy drone to move in Forced Repositioning)
   *
   * @param {Object} payload - { selectionContext, effectSelection, playerId }
   * @returns {Object} { success, newPlayerStates, shouldEndTurn, animationEvents }
   */
  async processAdditionalCostEffectSelectionComplete(payload) {
    return _processAdditionalCostEffectSelectionComplete(payload, this._getActionContext());
  }

  async processMovementCompletion(payload) {
    return _processMovementCompletion(payload, this._getActionContext());
  }

  async processSearchAndDrawCompletion(payload) {
    return _processSearchAndDrawCompletion(payload, this._getActionContext());
  }

  /**
   * Process ship ability action
   */
  async processShipAbility(payload) {
    return _processShipAbility(payload, this._getActionContext());
  }

  async processShipAbilityCompletion(payload) {
    return _processShipAbilityCompletion(payload, this._getActionContext());
  }

  async processRecallAbility(payload) {
    return _processRecallAbility(payload, this._getActionContext());
  }

  async processTargetLockAbility(payload) {
    return _processTargetLockAbility(payload, this._getActionContext());
  }

  validateShipAbilityActivationLimit(sectionName, playerId, playerStates) {
    return _validateShipAbilityActivationLimit(sectionName, playerId, playerStates);
  }

  async processRecalculateAbility(payload) {
    return _processRecalculateAbility(payload, this._getActionContext());
  }

  async processRecalculateComplete(payload) {
    return _processRecalculateComplete(payload, this._getActionContext());
  }

  async processReallocateShieldsAbility(payload) {
    return _processReallocateShieldsAbility(payload, this._getActionContext());
  }

  async processReallocateShieldsComplete(payload) {
    return _processReallocateShieldsComplete(payload, this._getActionContext());
  }

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

  /**
   * Process Force Win (DEV ONLY)
   * Damages all opponent sections and triggers win condition check.
   * Routes through ActionProcessor to avoid architecture violations.
   */
  processForceWin() {
    const currentState = this.gameStateManager.getState();

    // Log the dev action
    this.gameStateManager.addLogEntry({
      player: 'SYSTEM',
      actionType: 'DEV_ACTION',
      source: 'Force Win',
      target: 'Opponent Ship',
      outcome: 'All opponent ship sections destroyed (DEV)'
    }, 'forceWin');

    // Damage all opponent sections to hull 0
    const damagedSections = {
      bridge: { ...currentState.player2.shipSections.bridge, hull: 0 },
      powerCell: { ...currentState.player2.shipSections.powerCell, hull: 0 },
      droneControlHub: { ...currentState.player2.shipSections.droneControlHub, hull: 0 }
    };

    this.gameStateManager.updatePlayerState('player2', {
      shipSections: damagedSections
    });

    // Use ActionProcessor's own checkWinCondition (proper callbacks)
    this.checkWinCondition();
  }

  /**
   * Process turn transition
   */
  async processTurnTransition(payload) {
    return _processTurnTransition(payload, this._getActionContext());
  }

  async processPhaseTransition(payload) {
    return _processPhaseTransition(payload, this._getActionContext());
  }

  async processRoundStart(payload) {
    return _processRoundStart(payload, this._getActionContext());
  }


  /**
   * Process shield reallocation action (ACTION PHASE ONLY)
   * Handles shield reallocation abilities during action phase gameplay.
   * Round start shield allocation should use direct GameStateManager updates.
   */
  async processReallocateShields(payload) {
    const {
      action, // 'remove', 'add', or 'restore'
      sectionName,
      originalShipSections, // for 'restore' action
      playerId = this.gameStateManager.getLocalPlayerId()
    } = payload;

    const currentState = this.gameStateManager.getState();

    // Validate this is only used during action phase
    if (currentState.turnPhase !== 'action') {
      throw new Error(`Shield reallocation through ActionProcessor is only valid during action phase, not ${currentState.turnPhase}`);
    }

    debugLog('ENERGY', `[SHIELD REALLOCATION DEBUG] Processing action phase shield reallocation:`, { action, sectionName, playerId });

    const playerState = currentState[playerId];

    if (action === 'remove') {
      // Validate shield removal
      const section = playerState.shipSections[sectionName];
      if (!section || section.allocatedShields <= 0) {
        return {
          success: false,
          error: 'Cannot remove shield from this section'
        };
      }

      // Create new player state with shield removed
      const newShipSections = {
        ...playerState.shipSections,
        [sectionName]: {
          ...playerState.shipSections[sectionName],
          allocatedShields: playerState.shipSections[sectionName].allocatedShields - 1
        }
      };

      const newPlayerState = {
        ...playerState,
        shipSections: newShipSections
      };

      this.gameStateManager.updatePlayerState(playerId, newPlayerState);

      debugLog('ENERGY', `[SHIELD REALLOCATION DEBUG] Shield removed from ${sectionName}`);
      return {
        success: true,
        action: 'remove',
        sectionName,
        newPlayerState
      };

    } else if (action === 'add') {
      // Validate shield addition - need access to placed sections for effective max calculation
      const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;
      const effectiveMaxShields = gameEngine.getEffectiveSectionMaxShields(sectionName, playerState, placedSections);
      const section = playerState.shipSections[sectionName];

      if (!section || section.allocatedShields >= effectiveMaxShields) {
        return {
          success: false,
          error: 'Cannot add shield to this section'
        };
      }

      // Create new player state with shield added
      const newShipSections = {
        ...playerState.shipSections,
        [sectionName]: {
          ...playerState.shipSections[sectionName],
          allocatedShields: playerState.shipSections[sectionName].allocatedShields + 1
        }
      };

      const newPlayerState = {
        ...playerState,
        shipSections: newShipSections
      };

      this.gameStateManager.updatePlayerState(playerId, newPlayerState);

      debugLog('ENERGY', `[SHIELD REALLOCATION DEBUG] Shield added to ${sectionName}`);
      return {
        success: true,
        action: 'add',
        sectionName,
        newPlayerState
      };

    } else if (action === 'restore') {
      // Restore original shield configuration
      if (!originalShipSections) {
        return {
          success: false,
          error: 'No original ship sections provided for restore'
        };
      }

      const newPlayerState = {
        ...playerState,
        shipSections: originalShipSections
      };

      this.gameStateManager.updatePlayerState(playerId, newPlayerState);

      debugLog('ENERGY', `[SHIELD REALLOCATION DEBUG] Shield allocation restored to original state`);
      return {
        success: true,
        action: 'restore',
        newPlayerState
      };
    }

    return {
      success: false,
      error: `Unknown reallocation action: ${action}`
    };
  }

  /**
   * Process AI action
   */
  async processAiAction(payload) {
    const { aiDecision } = payload;

    // Route AI decision to appropriate action processor
    switch (aiDecision.type) {
      case 'deploy':
        const { droneToDeploy, targetLane } = aiDecision.payload;
        return await this.processDeployment({
          droneData: droneToDeploy,
          laneId: targetLane,
          playerId: 'player2', // AI is always player2
          turn: this.gameStateManager.get('turn')
        });

      case 'action':
        const chosenAction = aiDecision.payload;
        switch (chosenAction.type) {
          case 'attack':
            debugLog('COMBAT', '🎬 [AI ANIMATION DEBUG] processAiAction attack case:', {
              attackerId: chosenAction.attacker?.id,
              targetId: chosenAction.target?.id,
              lane: chosenAction.attacker?.lane,
              targetType: chosenAction.targetType,
              hasAttackerObject: !!chosenAction.attacker,
              hasTargetObject: !!chosenAction.target
            });
            return await this.processAttack({
              attackDetails: {
                attacker: chosenAction.attacker,        // Full object
                target: chosenAction.target,            // Full object
                targetType: chosenAction.targetType || 'drone',  // Default to drone
                lane: chosenAction.attacker.lane,       // Extract lane from attacker object
                attackingPlayer: 'player2',
                aiContext: aiDecision.logContext
              }
            });

          case 'play_card':
            return await this.processCardPlay({
              card: chosenAction.card,
              targetId: chosenAction.target?.id,
              playerId: 'player2'
            });

          case 'move':
            // Handle move through processMove method
            return await this.processMove({
              droneId: chosenAction.drone.id,
              fromLane: chosenAction.fromLane,
              toLane: chosenAction.toLane,
              playerId: 'player2'
            });

          case 'ability':
            return await this.processAbility({
              droneId: chosenAction.drone.id,
              abilityIndex: chosenAction.abilityIndex,
              targetId: chosenAction.target?.id
            });

          default:
            throw new Error(`Unknown AI action subtype: ${chosenAction.type}`);
        }

      case 'pass':
        // Handle AI pass - already handled by GameStateManager
        return { success: true, action: 'pass' };

      default:
        throw new Error(`Unknown AI action type: ${aiDecision.type}`);
    }
  }

  /**
   * Check if any actions are currently being processed
   */
  isActionInProgress() {
    return this.isProcessing || Object.values(this.actionLocks).some(locked => locked);
  }

  /**
   * Get current queue length
   */
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
    if (!animations || animations.length === 0) {
      return;
    }

    const gameMode = this.gameStateManager.get('gameMode');

    timingLog('[ANIM QUEUE] Animation requested', {
      count: animations.length,
      names: animations.map(a => a.animationName).join(', '),
      waitForCompletion,
      isSystemAnimation,
      gameMode,
      blockingReason: 'entering_queue'
    });

    // Capture animations for guest broadcasting (host only)
    if (gameMode === 'host') {
      if (isSystemAnimation) {
        this.pendingSystemAnimations.push(...animations);
      } else {
        this.pendingActionAnimations.push(...animations);
      }
    }

    // Execute animations with source tracking
    if (this.animationManager) {
      const source = gameMode === 'guest' ? 'GUEST_OPTIMISTIC' : gameMode === 'host' ? 'HOST_LOCAL' : 'LOCAL';

      timingLog('[ANIM QUEUE] Starting execution', {
        names: animations.map(a => a.animationName).join(', '),
        source,
        blockingReason: 'none_executing_now'
      });

      if (waitForCompletion) {
        // Blocking: Wait for animations to complete before continuing
        await this.animationManager.executeAnimations(animations, source);

        timingLog('[ANIM QUEUE] Execution complete', {
          names: animations.map(a => a.animationName).join(', '),
          blockingReason: 'animations_finished'
        });
      } else {
        // Non-blocking: Execute animations in parallel without waiting
        // This allows state updates and multiplayer broadcasting to happen immediately
        // Return the promise for special cases that need to coordinate timing (e.g., teleport)
        return this.animationManager.executeAnimations(animations, source);
      }
    }
  }

  /**
   * Get and clear pending action animations for broadcasting
   * @returns {Array} Pending action animations
   */
  getAndClearPendingActionAnimations() {
    const animations = [...this.pendingActionAnimations];
    this.pendingActionAnimations = [];
    return animations;
  }

  /**
   * Get and clear pending system animations for broadcasting
   * @returns {Array} Pending system animations
   */
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
    const stateWithInvisibleDrones = this.addTeleportingFlags(completeNewState, animations);

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
  addTeleportingFlags(newPlayerStates, animations) {
    // Extract TELEPORT_IN animations and their target drones
    const teleportAnimations = animations.filter(anim => anim.animationName === 'TELEPORT_IN');

    if (teleportAnimations.length === 0) {
      return newPlayerStates; // No changes needed
    }

    debugLog('ANIMATIONS', '🌀 [TELEPORT PREP] Adding isTeleporting flags to drones:', {
      animationCount: teleportAnimations.length
    });

    // Create deep copy of states to modify
    const modifiedStates = {
      player1: JSON.parse(JSON.stringify(newPlayerStates.player1)),
      player2: JSON.parse(JSON.stringify(newPlayerStates.player2))
    };

    // Add isTeleporting flag to each drone being teleported
    teleportAnimations.forEach((anim, index) => {
      const { targetPlayer, targetLane, targetId } = anim.payload || {};

      if (!targetPlayer || !targetLane || !targetId) {
        debugLog('ANIMATIONS', '⚠️ [TELEPORT PREP] Missing payload data in TELEPORT_IN animation:', anim);
        return;
      }

      // Find and mark the drone as teleporting
      const playerState = modifiedStates[targetPlayer];
      const lane = playerState?.dronesOnBoard?.[targetLane];

      if (lane && Array.isArray(lane)) {
        const droneIndex = lane.findIndex(d => d.id === targetId);
        if (droneIndex !== -1) {
          lane[droneIndex].isTeleporting = true;
          debugLog('ANIMATIONS', `🌀 [TELEPORT PREP ${index + 1}/${teleportAnimations.length}] Marked drone as invisible:`, {
            targetPlayer,
            targetLane,
            targetId,
            droneName: lane[droneIndex].name
          });
        } else {
          debugLog('ANIMATIONS', '⚠️ [TELEPORT PREP] Drone not found in lane:', {
            targetPlayer,
            targetLane,
            targetId
          });
        }
      }
    });

    return modifiedStates;
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
      const broadcastStartTime = timingLog('[HOST] Broadcast preparing', {
        phase: this.gameStateManager.get('turnPhase'),
        currentPlayer: this.gameStateManager.get('currentPlayer'),
        trigger: trigger
      });

      // Use pendingFinalState (for TELEPORT_IN) or pendingStateUpdate (for other actions)
      // Falls back to current state if neither is available
      // Priority: finalState > pendingState > currentState
      // - pendingFinalState: Final state after TELEPORT_IN reveal (no isTeleporting flags)
      // - pendingStateUpdate: New state for normal actions or invisible state for TELEPORT_IN
      // - currentState: Fallback for non-action broadcasts
      const stateToBroadcast = this.pendingFinalState || this.pendingStateUpdate || this.gameStateManager.getState();
      const actionAnimations = this.getAndClearPendingActionAnimations();
      const systemAnimations = this.getAndClearPendingSystemAnimations();

      // VALIDATION LOG: Verify state completeness before broadcast
      const stateSource = this.pendingFinalState ? 'FINAL' : this.pendingStateUpdate ? 'PENDING' : 'CURRENT';
      debugLog('BROADCAST_TIMING', `📡 [HOST BROADCAST] Source: ${stateSource} | Phase: ${stateToBroadcast.turnPhase} | Player: ${stateToBroadcast.currentPlayer} | Fields: ${Object.keys(stateToBroadcast).length} | Anims: ${actionAnimations.length + systemAnimations.length}`);

      debugLog('STATE_SYNC', '📡 [ANIMATION BROADCAST] Sending state with animations:', {
        actionAnimationCount: actionAnimations.length,
        systemAnimationCount: systemAnimations.length,
        actionAnimations: actionAnimations.map(a => a.animationName),
        systemAnimations: systemAnimations.map(a => a.animationName),
        usingFinalState: !!this.pendingFinalState,
        usingPendingState: !this.pendingFinalState && !!this.pendingStateUpdate,
        usingCurrentState: !this.pendingFinalState && !this.pendingStateUpdate
      });

      // Get animation names for logging
      const allAnimNames = [
        ...actionAnimations.map(a => a.animationName),
        ...systemAnimations.map(a => a.animationName)
      ];

      timingLog('[HOST] Broadcast sending', {
        phase: stateToBroadcast.turnPhase,
        actionAnims: actionAnimations.length,
        systemAnims: systemAnimations.length,
        totalAnims: actionAnimations.length + systemAnimations.length,
        trigger: trigger,
        animNames: allAnimNames.length > 0 ? allAnimNames.join(', ') : 'none'
      }, broadcastStartTime);

      this.p2pManager.broadcastState(stateToBroadcast, actionAnimations, systemAnimations);
    }
  }

  /**
   * Process player pass action
   */
  async processPlayerPass(payload) {
    const { playerId, playerName, turnPhase, passInfo, opponentPlayerId } = payload;

    debugLog('PASS_LOGIC', '[PLAYER PASS DEBUG] Processing player pass through ActionProcessor:', {
      playerId,
      playerName,
      turnPhase,
      currentPassInfo: passInfo
    });

    const currentState = this.gameStateManager.getState();

    // Add log entry
    this.gameStateManager.addLogEntry({
      player: playerName,
      actionType: 'PASS',
      source: 'N/A',
      target: 'N/A',
      outcome: `Passed during ${turnPhase} phase.`
    }, 'playerPass');

    // Queue pass notification in PhaseAnimationQueue for sequential playback
    // This ensures pass notifications play sequentially with phase announcements
    // (PhaseAnimationQueue handles all game flow animations, AnimationManager handles action animations)
    if (this.phaseAnimationQueue) {
      const localPlayerId = this.gameStateManager.getLocalPlayerId();
      const isLocalPlayer = playerId === localPlayerId;
      const passText = isLocalPlayer ? 'YOU PASSED' : 'OPPONENT PASSED';

      this.phaseAnimationQueue.queueAnimation('playerPass', passText, null, 'AP:playerPass:2716');

      debugLog('PASS_LOGIC', '[PLAYER PASS DEBUG] Queued pass notification in PhaseAnimationQueue:', {
        playerId,
        isLocalPlayer,
        passText
      });

      // Start playback if not already playing
      // If queue is already playing, this does nothing (PhaseAnimationQueue.startPlayback() guards against duplicate playback)
      // If queue is idle, this starts playback of the pass notification
      if (!this.phaseAnimationQueue.isPlaying()) {
        this.phaseAnimationQueue.startPlayback('AP:after_pass:2728');
        debugLog('PASS_LOGIC', '[PLAYER PASS DEBUG] Started playback for pass notification');
      }
    }

    // Calculate pass info updates
    const opponentPassKey = `${opponentPlayerId}Passed`;
    const localPassKey = `${playerId}Passed`;
    const wasFirstToPass = !passInfo[opponentPassKey];
    const newPassInfo = {
      ...passInfo,
      [localPassKey]: true,
      firstPasser: passInfo.firstPasser || (wasFirstToPass ? playerId : null)
    };

    debugLog('PASS_LOGIC', '[PLAYER PASS DEBUG] Updating pass info:', newPassInfo);

    // Update pass info through GameStateManager with proper context
    this._withUpdateContext(() => this.gameStateManager.setState({ passInfo: newPassInfo }, 'PASS_INFO_SET'));

    // PHASE MANAGER INTEGRATION: Notify PhaseManager of pass action
    const gameMode = this.gameStateManager.get('gameMode');
    if (this.phaseManager) {
      if (gameMode === 'host' && playerId === 'player1') {
        // Host passed
        this.phaseManager.notifyHostAction('pass', { phase: turnPhase });
        debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: Host passed in ${turnPhase}`);
      } else if (gameMode === 'host' && playerId === 'player2') {
        // Guest passed (received via network on Host)
        this.phaseManager.notifyGuestAction('pass', { phase: turnPhase });
        debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: Guest passed in ${turnPhase} (via network)`);
      } else if (gameMode === 'local') {
        // Local mode: Notify for both players (AI or human)
        if (playerId === 'player1') {
          this.phaseManager.notifyHostAction('pass', { phase: turnPhase });
        } else {
          this.phaseManager.notifyGuestAction('pass', { phase: turnPhase });
        }
        debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: ${playerId} passed in ${turnPhase} (local mode)`);
      }
      // Note: Guest mode doesn't call processPlayerPass for local player (blocked by guards)
    }

    // Increment turn counter ONLY for action phase passes
    // Turn tracks individual player actions within a round (resets to 1 at round start)
    if (turnPhase === 'action') {
      const currentTurn = currentState.turn || 0;
      this._withUpdateContext(() => this.gameStateManager.setState({
        turn: currentTurn + 1
      }, 'TURN_INCREMENT', 'playerPass'));
      debugLog('PASS_LOGIC', `[TURN INCREMENT] Turn incremented: ${currentTurn} → ${currentTurn + 1}`);
    }

    // Handle turn switching when one player passes but the other hasn't
    // ActionProcessor owns currentPlayer per ARCHITECTURE_REFACTOR.md
    // GameFlowManager will handle phase transitions when both players pass
    const bothPassed = newPassInfo.player1Passed && newPassInfo.player2Passed;

    if (!bothPassed) {
      // Switch to the player who hasn't passed yet
      let nextPlayer = null;
      if (playerId === 'player1' && !newPassInfo.player2Passed) {
        nextPlayer = 'player2';
      } else if (playerId === 'player2' && !newPassInfo.player1Passed) {
        nextPlayer = 'player1';
      }

      if (nextPlayer) {
        debugLog('PASS_LOGIC', `[PLAYER PASS DEBUG] Switching turn to ${nextPlayer} (opponent hasn't passed)`);
        this._withUpdateContext(() => this.gameStateManager.setState({
          currentPlayer: nextPlayer
        }, 'TURN_SWITCH', 'playerPass'));
      }
    } else {
      debugLog('PASS_LOGIC', '[PLAYER PASS DEBUG] Both players passed - GameFlowManager will handle phase transition');
    }

    // Note: State broadcasting handled by queueAction's finally block via broadcastStateToGuest()
    // Pass notification is queued in PhaseAnimationQueue (not AnimationManager), so no animations to return

    return {
      success: true,
      newPassInfo,
      animations: {
        actionAnimations: [],
        systemAnimations: []
      }
    };
  }

  /**
   * Process AI ship placement action
   */
  async processAiShipPlacement(payload) {
    const { placement, aiPersonality } = payload;

    debugLog('STATE_SYNC', '[AI SHIP PLACEMENT] Processing AI ship placement:', {
      placement,
      aiPersonality
    });

    // Update opponent placed sections through GameStateManager
    this._withUpdateContext(() => this.gameStateManager.setState({
      opponentPlacedSections: placement
    }, 'aiShipPlacement'));

    // Add log entry
    this.gameStateManager.addLogEntry({
      player: 'AI Opponent',
      actionType: 'SHIP_PLACEMENT',
      source: 'AI System',
      target: 'Ship Sections',
      outcome: `${aiPersonality} deployed ship sections: ${placement.join(', ')}`
    }, 'aiShipPlacement');

    // Note: State broadcasting handled by queueAction's finally block via broadcastStateToGuest()

    return {
      success: true,
      placement
    };
  }


  /**
   * Process optional discard action
   */
  async processOptionalDiscard(payload) {
    const { playerId, cardsToDiscard, isMandatory = false, abilityMetadata = null } = payload;
    const currentState = this.gameStateManager.getState();

    debugLog('CARDS', `[OPTIONAL DISCARD DEBUG] Processing ${isMandatory ? 'mandatory' : 'optional'} discard for ${playerId}:`, cardsToDiscard);

    if (!Array.isArray(cardsToDiscard)) {
      throw new Error('Cards to discard must be an array');
    }

    const playerState = currentState[playerId];
    if (!playerState) {
      throw new Error(`Player ${playerId} not found`);
    }

    // Validate mandatory phase-based discards to prevent over-discarding
    if (isMandatory && currentState.turnPhase === 'mandatoryDiscard' && !abilityMetadata) {
      // Calculate effective hand limit (accounts for critical damage, etc.)
      const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;
      const effectiveStats = this.gameDataService.getEffectiveShipStats(playerState, placedSections);
      const handLimit = effectiveStats.totals.handLimit;
      const currentHandSize = playerState.hand.length;
      const excessCards = currentHandSize - handLimit;

      // Check if player is trying to discard more than they should
      if (excessCards <= 0) {
        debugLog('CARDS', `🚫 [VALIDATION] Player ${playerId} cannot discard - already at or below hand limit`, {
          currentHandSize,
          handLimit,
          excessCards
        });
        throw new Error(`Cannot discard - already at hand limit (${handLimit})`);
      }

      // Only allow discarding one card at a time during mandatory discard
      if (cardsToDiscard.length > 1) {
        debugLog('CARDS', `🚫 [VALIDATION] Player ${playerId} cannot discard multiple cards at once during mandatory discard phase`);
        throw new Error('Can only discard one card at a time during mandatory discard phase');
      }
    }

    // Add log entry for each discarded card
    cardsToDiscard.forEach(card => {
      this.gameStateManager.addLogEntry({
        player: playerState.name,
        actionType: isMandatory ? 'DISCARD_MANDATORY' : 'DISCARD_OPTIONAL',
        source: card.name,
        target: 'N/A',
        outcome: `Discarded ${card.name}.`
      });
    });

    // Remove cards from hand and add to discard pile
    const newHand = playerState.hand.filter(card =>
      !cardsToDiscard.some(discardCard => card.instanceId === discardCard.instanceId)
    );
    const newDiscardPile = [...playerState.discardPile, ...cardsToDiscard];

    // Update player state
    this.gameStateManager.updatePlayerState(playerId, {
      hand: newHand,
      discardPile: newDiscardPile
    });

    debugLog('CARDS', `[OPTIONAL DISCARD DEBUG] Discarded ${cardsToDiscard.length} cards for ${playerId}`);

    // If this was the final discard for an ability, execute the SHIP_ABILITY_REVEAL animation
    if (abilityMetadata) {
      debugLog('CARDS', `[OPTIONAL DISCARD DEBUG] Final ability discard - executing SHIP_ABILITY_REVEAL animation`, abilityMetadata);
      const abilityRevealAnimation = [{
        animationName: 'SHIP_ABILITY_REVEAL',
        payload: {
          abilityName: abilityMetadata.abilityName,
          sectionName: abilityMetadata.sectionName,
          actingPlayerId: abilityMetadata.actingPlayerId
        }
      }];
      // Execute animation and wait for completion to ensure proper sequencing
      await this.executeAndCaptureAnimations(abilityRevealAnimation);
    }

    return {
      success: true,
      message: `Discarded ${cardsToDiscard.length} cards`,
      cardsDiscarded: cardsToDiscard
    };
  }

  /**
   * Process first player determination for the round
   * @returns {Object} First player determination result
   */
  async processFirstPlayerDetermination() {
    return _processFirstPlayerDetermination(null, this._getActionContext());
  }

  /**
   * Get phase commitment status
   * @param {string} phase - Phase name
   * @returns {Object|null} Commitment status
   */
  getPhaseCommitmentStatus(phase) {
    return _getPhaseCommitmentStatus(phase, this._getActionContext());
  }

  /**
   * Clear commitments for a specific phase or all phases
   * @param {string} phase - Optional phase name, if not provided clears all
   */
  clearPhaseCommitments(phase = null) {
    return _clearPhaseCommitments(phase, this._getActionContext());
  }

  /**
   * Process commitment action for simultaneous phases
   * @param {Object} payload - Commitment payload
   * @returns {Object} Commitment result
   */
  async processCommitment(payload) {
    return _processCommitment(payload, this._getActionContext());
  }

  /**
   * Handle AI commitment for simultaneous phases
   * @param {string} phase - Phase name
   * @param {Object} currentState - Current game state
   */
  async handleAICommitment(phase, currentState) {
    return _handleAICommitment(phase, currentState, this._getActionContext());
  }

  /**
   * Apply phase commitments to permanent game state
   * Transfers commitment data from temporary commitments object to actual game state fields
   * @param {string} phase - Phase name
   * @returns {Object} State updates to apply
   */
  applyPhaseCommitments(phase) {
    return _applyPhaseCommitments(phase, this._getActionContext());
  }

  /**
   * Process automatic draw action
   * @param {Object} payload - Draw payload containing player states
   * @returns {Object} Draw result
   */
  async processDraw(payload) {
    const { player1, player2 } = payload;

    debugLog('CARDS', '🃏 ActionProcessor: Processing automatic draw');

    // Update player states with draw results
    this._withUpdateContext(() => this.gameStateManager.setState({ player1, player2 }));

    return {
      success: true,
      message: 'Draw completed',
      player1,
      player2
    };
  }

  /**
   * Process energy reset action
   * @param {Object} payload - Energy reset payload containing updated player states
   * @returns {Object} Energy reset result
   */
  async processEnergyReset(payload) {
    const { player1, player2, shieldsToAllocate, opponentShieldsToAllocate, roundNumber } = payload;

    debugLog('ENERGY', '⚡ ActionProcessor: Processing energy reset');

    debugLog('RESOURCE_RESET', `📥 [ACTIONPROCESSOR] Received energyReset payload`, {
      roundNumber,
      player1: {
        name: player1?.name,
        energy: player1?.energy,
        initialDeploymentBudget: player1?.initialDeploymentBudget,
        deploymentBudget: player1?.deploymentBudget,
        hasAllFields: {
          energy: 'energy' in player1,
          initialDeploymentBudget: 'initialDeploymentBudget' in player1,
          deploymentBudget: 'deploymentBudget' in player1
        }
      },
      player2: {
        name: player2?.name,
        energy: player2?.energy,
        initialDeploymentBudget: player2?.initialDeploymentBudget,
        deploymentBudget: player2?.deploymentBudget,
        hasAllFields: {
          energy: 'energy' in player2,
          initialDeploymentBudget: 'initialDeploymentBudget' in player2,
          deploymentBudget: 'deploymentBudget' in player2
        }
      }
    });

    // Update player states AND roundNumber atomically to prevent race condition
    // This ensures React components receive both updates together
    this.gameStateManager.setState({
      player1,
      player2,
      ...(roundNumber !== undefined && { roundNumber })
    }, 'PLAYER_STATES_SET');

    const currentState = this.gameStateManager.getState();
    debugLog('RESOURCE_RESET', `✅ [ACTIONPROCESSOR] Game state after setState (atomic update)`, {
      roundNumber: currentState.roundNumber,
      player1: {
        name: currentState.player1?.name,
        energy: currentState.player1?.energy,
        initialDeploymentBudget: currentState.player1?.initialDeploymentBudget,
        deploymentBudget: currentState.player1?.deploymentBudget,
        hasAllFields: {
          energy: 'energy' in currentState.player1,
          initialDeploymentBudget: 'initialDeploymentBudget' in currentState.player1,
          deploymentBudget: 'deploymentBudget' in currentState.player1
        }
      },
      player2: {
        name: currentState.player2?.name,
        energy: currentState.player2?.energy,
        initialDeploymentBudget: currentState.player2?.initialDeploymentBudget,
        deploymentBudget: currentState.player2?.deploymentBudget,
        hasAllFields: {
          energy: 'energy' in currentState.player2,
          initialDeploymentBudget: 'initialDeploymentBudget' in currentState.player2,
          deploymentBudget: 'deploymentBudget' in currentState.player2
        }
      }
    });

    // Update shields to allocate if provided (round 2+ only)
    if (shieldsToAllocate !== undefined) {
      this._withUpdateContext(() => this.gameStateManager.setState({ shieldsToAllocate }));
    }
    if (opponentShieldsToAllocate !== undefined) {
      this._withUpdateContext(() => this.gameStateManager.setState({ opponentShieldsToAllocate }));
    }

    debugLog('ENERGY', `✅ Energy reset complete - Shields to allocate: ${shieldsToAllocate || 0}, ${opponentShieldsToAllocate || 0}`);

    return {
      success: true,
      message: 'Energy reset completed',
      player1,
      player2,
      shieldsToAllocate,
      opponentShieldsToAllocate
    };
  }

  /**
   * Process ON_ROUND_START triggered abilities
   * Updates player states after round start triggers have been processed
   * @param {Object} payload - { player1, player2 } with updated states
   * @returns {Object} Round start triggers result
   */
  async processRoundStartTriggers(payload) {
    const { player1, player2 } = payload;

    debugLog('ROUND_START', '🎯 ActionProcessor: Processing round start triggers');

    // Update player states with any modifications from ON_ROUND_START abilities
    this.gameStateManager.setState({
      player1,
      player2
    }, 'ROUND_START_TRIGGERS');

    debugLog('ROUND_START', '✅ Round start triggers complete');

    return {
      success: true,
      message: 'Round start triggers processed',
      player1,
      player2
    };
  }

  /**
   * Process drone rebuild progress
   * Updates droneAvailability state after rebuild progress has been calculated
   * Called at the start of each round after ON_ROUND_START triggers
   * @param {Object} payload - { player1?, player2? } with updated droneAvailability
   * @returns {Object} Rebuild progress result
   */
  async processRebuildProgress(payload) {
    const { player1, player2 } = payload;

    debugLog('PHASE_MANAGER', '🔧 ActionProcessor: Processing drone rebuild progress');

    // Build state update object
    const stateUpdate = {};
    if (player1) stateUpdate.player1 = player1;
    if (player2) stateUpdate.player2 = player2;

    // Update player states with rebuild progress
    this.gameStateManager.setState(stateUpdate, 'REBUILD_PROGRESS');

    debugLog('PHASE_MANAGER', '✅ Drone rebuild progress complete');

    return {
      success: true,
      message: 'Drone rebuild progress processed',
      player1,
      player2
    };
  }

  /**
   * Process momentum award
   * Awards momentum to the player controlling more lanes
   * @param {Object} payload - { player1?, player2? }
   * @returns {Object} Momentum award result
   */
  async processMomentumAward(payload) {
    const { player1, player2 } = payload;

    debugLog('PHASE_MANAGER', '🚀 ActionProcessor: Processing momentum award');

    // Build state update object
    const stateUpdate = {};
    if (player1) stateUpdate.player1 = player1;
    if (player2) stateUpdate.player2 = player2;

    // Update player states with momentum changes
    this.gameStateManager.setState(stateUpdate, 'MOMENTUM_AWARD');

    const awardedTo = player1 ? 'Player 1' : player2 ? 'Player 2' : 'None';
    debugLog('PHASE_MANAGER', `✅ Momentum award complete - Awarded to: ${awardedTo}`);

    return {
      success: true,
      message: 'Momentum award processed',
      player1,
      player2
    };
  }

  /**
   * Process drone destruction
   * Handles mandatoryDroneRemoval phase and other drone destruction scenarios
   * @param {Object} payload - { droneId, playerId }
   * @returns {Object} Destruction result
   */
  async processDestroyDrone(payload) {
    const { droneId, playerId } = payload;

    debugLog('COMBAT', `💥 ActionProcessor: Processing drone destruction for ${playerId}, drone ${droneId}`);

    // OPTIMISTIC PROCESSING: Guest now processes drone destruction locally
    // Host remains authoritative via validation at milestone phases

    // Get current player state
    const currentState = this.gameStateManager.getState();
    const gameMode = currentState.gameMode;
    const playerState = currentState[playerId];

    if (!playerState) {
      return { success: false, error: `Player ${playerId} not found` };
    }

    // Find drone lane
    const lane = gameEngine.getLaneOfDrone(droneId, playerState);
    if (!lane) {
      return { success: false, error: `Drone ${droneId} not found on board` };
    }

    // Find the actual drone object
    const drone = playerState.dronesOnBoard[lane].find(d => d.id === droneId);
    if (!drone) {
      return { success: false, error: `Drone ${droneId} not found in lane ${lane}` };
    }

    // Create immutable copy of player state
    let newPlayerState = {
      ...playerState,
      dronesOnBoard: { ...playerState.dronesOnBoard }
    };

    // Remove drone from lane
    newPlayerState.dronesOnBoard[lane] = newPlayerState.dronesOnBoard[lane].filter(d => d.id !== droneId);

    // Apply destruction updates (like deployedDroneCounts)
    const onDestroyUpdates = gameEngine.onDroneDestroyed(newPlayerState, drone);
    Object.assign(newPlayerState, onDestroyUpdates);

    // Get opponent state and placed sections for aura updates
    const opponentPlayerId = playerId === 'player1' ? 'player2' : 'player1';
    const opponentPlayerState = currentState[opponentPlayerId];
    const placedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    // Update auras
    newPlayerState.dronesOnBoard = gameEngine.updateAuras(newPlayerState, opponentPlayerState, placedSections);

    // Update GameStateManager with new player state
    this.gameStateManager.updatePlayerState(playerId, newPlayerState);

    debugLog('COMBAT', `✅ Drone ${droneId} destroyed successfully from ${lane}`);

    return {
      success: true,
      message: `Drone destroyed from ${lane}`,
      droneId,
      lane,
      droneName: drone.name
    };
  }

  /**
   * Process adding cards to a player's hand (DEBUG FEATURE)
   * @param {Object} payload - { playerId, cardInstances }
   * @returns {Object} Result of adding cards
   */
  async processDebugAddCardsToHand(payload) {
    const { playerId, cardInstances } = payload;

    debugLog('DEBUG_TOOLS', `🎴 ActionProcessor: Adding ${cardInstances.length} cards to ${playerId}'s hand`);

    // OPTIMISTIC PROCESSING: Guest now processes debug actions locally
    // Host remains authoritative via validation at milestone phases

    // Get current player state
    const currentState = this.gameStateManager.getState();
    const gameMode = currentState.gameMode;
    const playerState = currentState[playerId];

    if (!playerState) {
      return { success: false, error: `Player ${playerId} not found` };
    }

    // Create updated hand
    const updatedHand = [...playerState.hand, ...cardInstances];

    // Update GameStateManager with new hand
    this.gameStateManager.updatePlayerState(playerId, { hand: updatedHand });

    debugLog('DEBUG_TOOLS', `✅ Cards added successfully. New hand size: ${updatedHand.length}`);

    return {
      success: true,
      message: `Added ${cardInstances.length} cards to hand`,
      newHandSize: updatedHand.length
    };
  }

  /**
   * Process adding a shield during allocation phase
   * @param {Object} payload - { sectionName, playerId }
   * @returns {Object} Shield addition result
   */
  async processAddShield(payload) {
    const { sectionName, playerId } = payload;

    debugLog('ENERGY', `🛡️ ActionProcessor: Processing shield addition for ${playerId}, section ${sectionName}`);

    // OPTIMISTIC PROCESSING: Guest now processes shield allocation locally
    // Host remains authoritative via validation at milestone phases

    // Get current game state
    const currentState = this.gameStateManager.getState();
    const gameMode = currentState.gameMode;

    // Determine which shieldsToAllocate to use
    const shieldsToAllocateKey = playerId === 'player1' ? 'shieldsToAllocate' : 'opponentShieldsToAllocate';

    // Process shield allocation via ShieldManager
    const result = ShieldManager.processShieldAllocation(
      { ...currentState, shieldsToAllocate: currentState[shieldsToAllocateKey] },
      playerId,
      sectionName
    );

    if (!result.success) {
      debugLog('ENERGY', `Shield allocation failed: ${result.error}`);
      return result;
    }

    // Update player state
    this.gameStateManager.updatePlayerState(playerId, result.newPlayerState);

    // Update shields to allocate count
    this._withUpdateContext(() => this.gameStateManager.setState({
      [shieldsToAllocateKey]: result.newShieldsToAllocate
    }));

    debugLog('ENERGY', `✅ Shield added to ${sectionName}, ${result.newShieldsToAllocate} shields remaining`);

    return {
      success: true,
      message: `Shield added to ${sectionName}`,
      sectionName,
      shieldsRemaining: result.newShieldsToAllocate
    };
  }

  /**
   * Process shield allocation reset
   * @param {Object} payload - { playerId }
   * @returns {Object} Shield reset result
   */
  async processResetShields(payload) {
    const { playerId } = payload;

    debugLog('ENERGY', `🔄 ActionProcessor: Processing shield allocation reset for ${playerId}`);

    // OPTIMISTIC PROCESSING: Guest now processes shield reset locally
    // Host remains authoritative via validation at milestone phases

    // Get current game state
    const currentState = this.gameStateManager.getState();
    const gameMode = currentState.gameMode;

    // Process shield reset via ShieldManager
    const result = ShieldManager.processResetShieldAllocation(currentState, playerId);

    if (!result.success) {
      debugLog('ENERGY', `Shield reset failed: ${result.error}`);
      return result;
    }

    // Update player state
    this.gameStateManager.updatePlayerState(playerId, result.newPlayerState);

    // Update shields to allocate count
    const shieldsToAllocateKey = playerId === 'player1' ? 'shieldsToAllocate' : 'opponentShieldsToAllocate';
    this._withUpdateContext(() => this.gameStateManager.setState({
      [shieldsToAllocateKey]: result.newShieldsToAllocate
    }));

    debugLog('ENERGY', `✅ Shield allocation reset, ${result.newShieldsToAllocate} shields available`);

    return {
      success: true,
      message: 'Shield allocation reset',
      shieldsToAllocate: result.newShieldsToAllocate
    };
  }

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
  async processStatusConsumption(statusType, { droneId, playerId }) {
    const statusFlag = statusType === 'snared' ? 'isSnared' : 'isSuppressed';
    const actionVerb = statusType === 'snared' ? 'move' : 'attack';
    const statusLabel = statusType === 'snared' ? 'Snare' : 'Suppressed';

    const currentState = this.gameStateManager.getState();
    const playerState = currentState[playerId];
    const newPlayerState = JSON.parse(JSON.stringify(playerState));

    for (const lane in newPlayerState.dronesOnBoard) {
      const drone = newPlayerState.dronesOnBoard[lane].find(d => d.id === droneId);
      if (drone) {
        drone[statusFlag] = false;
        drone.isExhausted = true;
        this.gameStateManager.updatePlayerState(playerId, newPlayerState);
        this.gameStateManager.addLogEntry({
          player: playerState.name,
          actionType: 'STATUS_CONSUMED',
          source: drone.name,
          target: lane.replace('lane', 'Lane '),
          outcome: `${drone.name}'s ${actionVerb} was cancelled — ${statusLabel} effect consumed. Drone is now exhausted.`
        });

        const laneNumber = lane.replace('lane', '');
        const animation = [{
          animationName: 'STATUS_CONSUMPTION',
          timing: 'independent',
          payload: {
            droneName: drone.name,
            laneNumber,
            statusType,
            targetPlayer: playerId,
            timestamp: Date.now()
          }
        }];

        const gameMode = this.gameStateManager.get('gameMode');
        if (gameMode === 'host' && animation.length > 0) {
          this.pendingActionAnimations.push(...animation);
          this.broadcastStateToGuest(`${statusType}Consumption`);
        }
        if (this.animationManager) {
          const source = gameMode === 'guest' ? 'GUEST_OPTIMISTIC' : gameMode === 'host' ? 'HOST_LOCAL' : 'LOCAL';
          await this.animationManager.executeAnimations(animation, source);
        }

        return {
          success: true,
          animations: {
            actionAnimations: animation,
            systemAnimations: []
          }
        };
      }
    }
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