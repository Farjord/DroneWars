// ========================================
// ACTION PROCESSOR
// ========================================
// Centralized action processing system to prevent race conditions.
// All game actions must go through this processor to ensure serialization.

import { gameEngine } from '../logic/gameLogic.js';
import CardPlayManager from '../logic/cards/CardPlayManager.js';
import { resolveAttack } from '../logic/combat/AttackProcessor.js';
import fullDroneCollection from '../data/droneData.js';
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
      console.warn('⚠️ ActionProcessor already exists. Use getInstance() instead of new ActionProcessor()');
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
        console.error('ActionProcessor listener error:', error);
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
    // DEBUG: Prove queueAction is called
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
    // DEBUG: Prove processQueue is called
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
          console.error('Action processing error:', error);
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

    // DEBUG: Prove processAction is called
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
        'reallocateShieldsComplete'
      ];

      // DEBUG: Log finally block execution to diagnose why emission might not happen
      debugLog('PASS_LOGIC', `🔧 [ACTION PROCESSOR] Finally block executing`, {
        type,
        isPlayerAction: playerActionTypes.includes(type),
        hasResult: !!this.lastActionResult,
        willEmit: playerActionTypes.includes(type) && !!this.lastActionResult,
        gameMode: this.gameStateManager?.getState()?.gameMode
      });

      // TURN TRANSITION DEBUG: Diagnose event chain breakdown
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

  /**
   * Process attack action
   */
  async processAttack(payload) {
    const { attackDetails } = payload;

    const currentState = this.gameStateManager.getState();
    const allPlacedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    // Check for interception opportunity BEFORE resolving attack
    let finalAttackDetails = { ...attackDetails };

    // Only drone attacks can be intercepted - skip interception for card-based attacks
    if (attackDetails.interceptor === undefined && !attackDetails.sourceCardInstanceId) {
      const interceptionResult = calculateAiInterception(
        attackDetails,
        { player1: currentState.player1, player2: currentState.player2 },
        allPlacedSections
      );

      if (interceptionResult.hasInterceptors) {
        const defendingPlayerId = attackDetails.attackingPlayer === 'player1' ? 'player2' : 'player1';

        // Set unified interception pending state (shows "opponent deciding" modal to attacker)
        try {
          this.gameStateManager._updateContext = 'ActionProcessor';
          this.gameStateManager.setState({
            interceptionPending: {
              attackDetails,
              defendingPlayerId,
              attackingPlayerId: attackDetails.attackingPlayer,
              interceptors: interceptionResult.interceptors,
              timestamp: Date.now()
            }
          });
        } finally {
          this.gameStateManager._updateContext = null;
        }

        // AI Defender - wait then decide automatically
        if (defendingPlayerId === 'player2' && currentState.gameMode === 'local') {
          debugLog('COMBAT', '🛡️ [INTERCEPTION] AI defender has interceptors');

          // Wait 1 second (modal visible to human attacker)
          await new Promise(resolve => setTimeout(resolve, 1000));

          // AI makes decision
          debugLog('COMBAT', '🔍 [INTERCEPTION] Checking aiPhaseProcessor:', {
            hasAIPhaseProcessor: !!this.aiPhaseProcessor,
            aiPhaseProcessorType: this.aiPhaseProcessor?.constructor?.name || 'undefined'
          });

          if (this.aiPhaseProcessor) {
            const decision = await this.aiPhaseProcessor.makeInterceptionDecision(
              interceptionResult.interceptors,
              attackDetails
            );

            debugLog('COMBAT', '🛡️ [INTERCEPTION] AI decision:', decision.interceptor ? 'INTERCEPT' : 'DECLINE');

            // Apply decision
            if (decision.interceptor) {
              finalAttackDetails.interceptor = decision.interceptor;

              // Emit interception result for badge display
              try {
                this.gameStateManager._updateContext = 'ActionProcessor';
                this.gameStateManager.setState({
                  lastInterception: {
                    interceptor: decision.interceptor,
                    originalTarget: attackDetails.target,
                    timestamp: Date.now()
                  }
                });
              } finally {
                this.gameStateManager._updateContext = null;
              }
            }
          }

          // Complete interception (clears state, closes modal)
          try {
            this.gameStateManager._updateContext = 'ActionProcessor';
            this.gameStateManager.setState({ interceptionPending: null });
          } finally {
            this.gameStateManager._updateContext = null;
          }

          // Continue with attack
        }
        // Human Defender - return to show choice modal
        else {
          debugLog('COMBAT', '🛡️ [INTERCEPTION] Human defender has interceptors');
          return {
            needsInterceptionDecision: true,
            interceptionData: {
              interceptors: interceptionResult.interceptors,
              attackDetails: interceptionResult.attackDetails
            }
          };
        }
      }
    }

    const logCallback = (entry) => {
      this.gameStateManager.addLogEntry(entry, 'resolveAttack',
        finalAttackDetails.attackingPlayer === 'player2' ? finalAttackDetails.aiContext : null);
    };

    // UI callbacks are handled by App.jsx
    const triggerExplosion = () => {};
    const triggerHitAnimation = () => {};

    const result = resolveAttack(
      finalAttackDetails,
      { player1: currentState.player1, player2: currentState.player2 },
      allPlacedSections,
      logCallback
    );

    // Use animation events from gameEngine result
    // Spread all event properties to ensure logical position data flows through
    // Include timing property from AnimationManager for proper sequencing on guest side
    const animations = (result.animationEvents || []).map(event => {
      const animDef = this.animationManager?.animations[event.type];
      return {
        animationName: event.type,
        timing: animDef?.timing || 'pre-state',  // Include timing from definition
        payload: {
          ...event,  // Pass ALL properties from event (sourcePlayer, sourceLane, targetPlayer, etc.)
          droneId: event.sourceId  // Add alias for backwards compatibility
        }
      };
    });

    debugLog('COMBAT', '[ANIMATION EVENTS] ActionProcessor received:', result.animationEvents);
    debugLog('COMBAT', '[ANIMATION EVENTS] Mapped to animations:', animations);

    debugLog('COMBAT', '🎬 [AI ANIMATION DEBUG] Built animations array:', {
      count: animations.length,
      animations: animations.map(a => ({
        name: a.animationName,
        sourceId: a.payload.sourceId,
        targetId: a.payload.targetId
      })),
      hasAnimationManager: !!this.animationManager
    });

    // Capture animations for broadcasting (host only)
    const gameMode = this.gameStateManager.get('gameMode');
    if (gameMode === 'host' && animations.length > 0) {
      this.pendingActionAnimations.push(...animations);
    }

    // Prepare states for TELEPORT_IN animation timing
    const { pendingStateUpdate, pendingFinalState } = this.prepareTeleportStates(
      animations,
      result.newPlayerStates
    );

    // Set pending states for Animation Manager
    this.pendingStateUpdate = pendingStateUpdate;
    this.pendingFinalState = pendingFinalState;

    // HOST: Broadcast IMMEDIATELY (before execution starts)
    // Guest receives execution plan with zero delay
    if (gameMode === 'host') {
      this.broadcastStateToGuest();
    }

    // Execute with proper timing (BOTH HOST and GUEST use same path)
    // Animation Manager orchestrates: pre-state anims → state update → post-state anims
    // This ensures entities exist in DOM before destruction animations play
    try {
      await this.animationManager.executeWithStateUpdate(animations, this);
    } finally {
      this.pendingStateUpdate = null;
      this.pendingFinalState = null;
    }

    // Clear interceptionPending state after attack completes (closes "opponent deciding" modal)
    if (currentState.interceptionPending) {
      debugLog('COMBAT', '🛡️ [INTERCEPTION] Clearing interceptionPending after attack completed');
      try {
        this.gameStateManager._updateContext = 'ActionProcessor';
        this.gameStateManager.setState({ interceptionPending: null });
      } finally {
        this.gameStateManager._updateContext = null;
      }
    }

    // Check for win conditions after attack
    this.checkWinCondition();

    // NOTE: Turn transitions now handled by GameFlowManager based on shouldEndTurn flag
    // GameFlowManager monitors action completion and processes turn transitions after animations complete

    // Return result with animations for optimistic action tracking
    return {
      ...result,
      animations: {
        actionAnimations: animations,
        systemAnimations: []
      }
    };
  }

  /**
   * Process move action
   */
  async processMove(payload) {
    const { droneId, fromLane, toLane, playerId } = payload;

    const currentState = this.gameStateManager.getState();
    const playerState = currentState[playerId];
    const opponentPlayerId = playerId === 'player1' ? 'player2' : 'player1';
    const opponentPlayerState = currentState[opponentPlayerId];

    if (!playerState) {
      throw new Error(`Player ${playerId} not found`);
    }

    // Find the drone in the fromLane
    const droneIndex = playerState.dronesOnBoard[fromLane].findIndex(d => d.id === droneId);
    if (droneIndex === -1) {
      throw new Error(`Drone ${droneId} not found in ${fromLane}`);
    }

    const drone = playerState.dronesOnBoard[fromLane][droneIndex];

    // Create a copy of the entire player state for processing
    let newPlayerState = JSON.parse(JSON.stringify(playerState));

    // Check if drone has RAPID keyword (first move doesn't exhaust)
    const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
    const hasRapid = baseDrone?.abilities?.some(
      a => a.effect?.type === 'GRANT_KEYWORD' && a.effect?.keyword === 'RAPID'
    );
    const canUseRapid = hasRapid && !drone.rapidUsed;

    // Move the drone - RAPID allows first move without exhaustion
    const movedDrone = {
      ...drone,
      isExhausted: canUseRapid ? false : true,
      rapidUsed: canUseRapid ? true : drone.rapidUsed
    };
    newPlayerState.dronesOnBoard[fromLane] = newPlayerState.dronesOnBoard[fromLane].filter(d => d.id !== droneId);
    newPlayerState.dronesOnBoard[toLane].push(movedDrone);

    // Get placed sections for updateAuras
    const placedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    // Apply ON_MOVE effects (e.g., Phase Jumper's Phase Shift)
    const { newState: stateAfterMoveEffects } = gameEngine.applyOnMoveEffects(
      newPlayerState,
      movedDrone,
      fromLane,
      toLane,
      (entry) => this.gameStateManager.addLogEntry(entry)
    );

    // Update auras after movement
    stateAfterMoveEffects.dronesOnBoard = gameEngine.updateAuras(
      stateAfterMoveEffects,
      opponentPlayerState,
      placedSections
    );

    // Update player state with the processed state
    this.gameStateManager.updatePlayerState(playerId, stateAfterMoveEffects);

    // Log the move
    this.gameStateManager.addLogEntry({
      player: playerState.name,
      actionType: 'MOVE',
      source: drone.name,
      target: toLane.replace('lane', 'Lane '),
      outcome: `Moved from ${fromLane.replace('lane', 'Lane ')} to ${toLane.replace('lane', 'Lane ')}.`
    });

    debugLog('COMBAT', `✅ Moved ${drone.name} from ${fromLane} to ${toLane}`);

    // NOTE: Turn transitions now handled by GameFlowManager
    // Moves always end turn (no goAgain flag on movement)

    return {
      success: true,
      shouldEndTurn: true, // Moves always end turn
      message: `${drone.name} moved from ${fromLane} to ${toLane}`,
      drone: drone,
      fromLane: fromLane,
      toLane: toLane
    };
  }

  /**
   * Process ability action
   */
  async processAbility(payload) {
    const { droneId, abilityIndex, targetId } = payload;

    const currentState = this.gameStateManager.getState();
    const playerStates = { player1: currentState.player1, player2: currentState.player2 };
    const allPlacedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    // Find the drone and ability
    let userDrone = null;
    let targetDrone = null;

    // Search for the drone in all lanes
    Object.values(playerStates).forEach(player => {
      Object.values(player.dronesOnBoard).forEach(lane => {
        lane.forEach(drone => {
          if (drone.id === droneId) {
            userDrone = drone;
          }
          if (drone.id === targetId) {
            targetDrone = drone;
          }
        });
      });
    });

    // Check if targetId is a lane (for lane-targeted abilities)
    if (targetId && typeof targetId === 'string' && targetId.startsWith('lane') && !targetDrone) {
      // Create a lane target object for lane-targeted abilities
      targetDrone = { id: targetId };
    }

    if (!userDrone || !userDrone.abilities[abilityIndex]) {
      throw new Error(`Invalid drone or ability: ${droneId}, ${abilityIndex}`);
    }

    const ability = userDrone.abilities[abilityIndex];

    // Validate activation limit (per-round usage)
    if (ability.activationLimit != null) {
      const activations = userDrone.abilityActivations?.[abilityIndex] || 0;
      if (activations >= ability.activationLimit) {
        throw new Error(`Ability ${ability.name} has reached its activation limit for this round`);
      }
    }

    const logCallback = (entry) => {
      this.gameStateManager.addLogEntry(entry, 'resolveAbility');
    };

    const resolveAttackCallback = async (attackDetails) => {
      return await this.processAttack({ attackDetails });
    };

    const result = AbilityResolver.resolveAbility(
      ability,
      userDrone,
      targetDrone,
      playerStates,
      allPlacedSections,
      logCallback,
      resolveAttackCallback
    );

    // Collect animation events
    // Spread all event properties to ensure logical position data flows through
    // Include timing property from AnimationManager for proper sequencing on guest side
    const animations = (result.animationEvents || []).map(event => {
      const animDef = this.animationManager?.animations[event.type];
      return {
        animationName: event.type,
        timing: animDef?.timing || 'pre-state',  // Include timing from definition
        payload: {
          ...event,  // Pass ALL properties from event (sourcePlayer, sourceLane, targetPlayer, etc.)
          droneId: event.sourceId  // Add alias for backwards compatibility
        }
      };
    });

    // Capture animations for broadcasting (host only)
    const gameMode = this.gameStateManager.get('gameMode');
    if (gameMode === 'host' && animations.length > 0) {
      this.pendingActionAnimations.push(...animations);
    }

    // Prepare states for TELEPORT_IN animation timing
    const { pendingStateUpdate, pendingFinalState } = this.prepareTeleportStates(
      animations,
      result.newPlayerStates
    );

    // Set pending states for Animation Manager
    this.pendingStateUpdate = pendingStateUpdate;
    this.pendingFinalState = pendingFinalState;

    // HOST: Broadcast IMMEDIATELY (before execution starts)
    // Guest receives execution plan with zero delay
    if (gameMode === 'host') {
      this.broadcastStateToGuest();
    }

    // Execute with proper timing (BOTH HOST and GUEST use same path)
    // Animation Manager orchestrates: pre-state anims → state update → post-state anims
    // This ensures entities exist in DOM before destruction animations play
    try {
      await this.animationManager.executeWithStateUpdate(animations, this);
    } finally {
      this.pendingStateUpdate = null;
      this.pendingFinalState = null;
    }

    // Check for win conditions after ability
    this.checkWinCondition();

    // NOTE: Turn transitions now handled by GameFlowManager based on shouldEndTurn flag
    // GameFlowManager processes turn transitions after ability animations complete

    // Return result with animations for optimistic action tracking
    return {
      ...result,
      animations: {
        actionAnimations: animations,
        systemAnimations: []
      }
    };
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

      const { pendingStateUpdate, pendingFinalState } = this.prepareTeleportStates(
        animations,
        newPlayerStates
      );

      // Set pending states for Animation Manager
      this.pendingStateUpdate = pendingStateUpdate;
      this.pendingFinalState = pendingFinalState;

      // HOST: Broadcast IMMEDIATELY (before execution starts)
      // Guest receives execution plan with zero delay
      if (gameMode === 'host') {
        this.broadcastStateToGuest();
      }

      // Execute with proper timing (BOTH HOST and GUEST use same path)
      // TELEPORT_IN is post-state with mid-animation reveal:
      // 1. pendingStateUpdate applies state with isTeleporting: true (invisible drone)
      // 2. AnimationManager waits for React, starts animation
      // 3. At 70%, AnimationManager calls revealTeleportedDrones()
      // 4. revealTeleportedDrones applies pendingFinalState (visible drone)
      try {
        await this.animationManager.executeWithStateUpdate(animations, this);
      } finally {
        this.pendingStateUpdate = null;
        this.pendingFinalState = null;
      }

      // NOTE: Turn transitions now handled by GameFlowManager
      // Deployment always ends turn

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

  /**
   * Process card play action
   */
  async processCardPlay(payload) {
    const { card, targetId, playerId } = payload;

    const currentState = this.gameStateManager.getState();
    const playerStates = { player1: currentState.player1, player2: currentState.player2 };
    const placedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    // Look up full target object from targetId
    // gameEngine.resolveCardPlay expects a target object with .owner, .id, .name properties
    let target = null;
    if (targetId) {
      // Search in both players' drones
      for (const pid of ['player1', 'player2']) {
        for (const lane of ['lane1', 'lane2', 'lane3']) {
          const drones = playerStates[pid].dronesOnBoard[lane] || [];
          const drone = drones.find(d => d.id === targetId);
          if (drone) {
            target = { ...drone, owner: pid };
            break;
          }
        }
        if (target) break;
      }

      // If not found in drones, check ship sections
      // Ship sections are indexed by name ('bridge', 'powerCell', 'droneControlHub')
      if (!target) {
        for (const pid of ['player1', 'player2']) {
          const sections = playerStates[pid].shipSections;
          // Direct lookup by section name (targetId is the section name like 'bridge')
          if (sections[targetId]) {
            target = {
              ...sections[targetId],
              name: targetId,
              owner: pid
            };
            break; // Found it, exit loop
          }
        }
      }

      // If still not found, check activeDronePool for upgrade card targets
      if (!target) {
        const actingPlayerState = playerStates[playerId];
        const poolDrone = actingPlayerState.activeDronePool?.find(d => d.name === targetId);
        if (poolDrone) {
          target = { ...poolDrone, id: poolDrone.name, owner: playerId };
        }
      }

      // If still not found, check if it's a lane target
      if (!target && targetId && targetId.startsWith('lane')) {
        target = { id: targetId };
      }
    }

    const callbacks = {
      logCallback: (entry) => this.gameStateManager.addLogEntry(entry),
      resolveAttackCallback: async (attackPayload) => {
        // Recursively handle attack through action processor
        return await this.processAttack(attackPayload);
      },
      applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects,
      updateAurasCallback: gameEngine.updateAuras,
      actionsTakenThisTurn: currentState.actionsTakenThisTurn || 0
    };

    const result = gameEngine.resolveCardPlay(
      card,
      target,
      playerId,
      playerStates,
      placedSections,
      callbacks,
      this.gameStateManager.getLocalPlayerId(),
      currentState.gameMode
    );

    // Process additional effects (from POST conditionals like GAIN_ENERGY on Energy Leech)
    if (result.additionalEffects && result.additionalEffects.length > 0) {
      const effectRouter = new EffectRouter();
      let currentStatesForEffects = result.newPlayerStates;

      for (const effect of result.additionalEffects) {
        const effectContext = {
          actingPlayerId: playerId,
          playerStates: currentStatesForEffects,
          placedSections,
          target,
          card
        };
        const effectResult = effectRouter.routeEffect(effect, effectContext);
        if (effectResult?.newPlayerStates) {
          currentStatesForEffects = effectResult.newPlayerStates;
        }
      }

      // Update result with processed states
      result.newPlayerStates = currentStatesForEffects;

      debugLog('EFFECT_PROCESSING', '[ActionProcessor] Card play additionalEffects processed', {
        effectCount: result.additionalEffects.length,
        effectTypes: result.additionalEffects.map(e => e.type)
      });
    }

    debugLog('CARDS', '[ANIMATION EVENTS] Card play events:', result.animationEvents);

    // Collect animation events
    // Include timing property from AnimationManager for proper sequencing on guest side
    const animations = (result.animationEvents || []).map(event => {
      const animDef = this.animationManager?.animations[event.type];
      return {
        animationName: event.type,
        timing: animDef?.timing || 'pre-state',  // Include timing from definition
        payload: {
          ...event,  // Pass ALL properties from event (sourcePlayer, sourceLane, targetPlayer, etc.)
          droneId: event.sourceId || event.targetId  // Support both source and target based animations
        }
      };
    });

    // Capture animations for broadcasting (host only)
    const gameMode = this.gameStateManager.get('gameMode');
    if (gameMode === 'host' && animations.length > 0) {
      this.pendingActionAnimations.push(...animations);
    }

    // Prepare states for TELEPORT_IN animation timing (e.g., token creation)
    const { pendingStateUpdate, pendingFinalState } = this.prepareTeleportStates(
      animations,
      result.newPlayerStates
    );

    // Set pending states for Animation Manager
    this.pendingStateUpdate = pendingStateUpdate;
    this.pendingFinalState = pendingFinalState;

    // HOST: Broadcast IMMEDIATELY (before execution starts)
    // Guest receives execution plan with zero delay
    if (gameMode === 'host') {
      this.broadcastStateToGuest();
    }

    // Execute with proper timing (BOTH HOST and GUEST use same path)
    // Animation Manager orchestrates: pre-state anims → state update → post-state anims
    // For TELEPORT_IN animations (e.g., token creation), proper invisible→visible transition
    try {
      await this.animationManager.executeWithStateUpdate(animations, this);
    } finally {
      this.pendingStateUpdate = null;
      this.pendingFinalState = null;
    }

    // Check for win conditions after card play
    this.checkWinCondition();

    // NOTE: Turn transitions now handled by GameFlowManager based on shouldEndTurn flag
    // GameFlowManager processes turn transitions after card animations complete

    // Return result with animations for optimistic action tracking
    return {
      ...result,
      animations: {
        actionAnimations: animations,
        systemAnimations: []
      }
    };
  }

  /**
   * Process movement card completion (SINGLE_MOVE or MULTI_MOVE)
   * Called after user has selected drones and destination in UI
   * Card costs are paid here (not during initial card play)
   */
  async processAdditionalCostCardPlay(payload) {
    const { card, costSelection, effectTarget, playerId } = payload;

    debugLog('ADDITIONAL_COST', '⚙️ ActionProcessor: processAdditionalCostCardPlay started', {
      cardName: card.name,
      cardId: card.id,
      costSelection,
      effectTargetId: effectTarget.id,
      effectTargetName: effectTarget.name,
      playerId
    });

    const currentState = this.gameStateManager.getState();
    const playerStates = { player1: currentState.player1, player2: currentState.player2 };

    debugLog('ADDITIONAL_COST', '📊 Current game state', {
      player1Energy: playerStates.player1.energy,
      player2Energy: playerStates.player2.energy,
      player1Hand: playerStates.player1.hand.length,
      player2Hand: playerStates.player2.hand.length
    });
    const placedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    const callbacks = {
      logCallback: (entry) => this.gameStateManager.addLogEntry(entry),
      resolveAttackCallback: async (attackPayload) => {
        return await this.processAttack(attackPayload);
      },
      applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects,
      updateAurasCallback: gameEngine.updateAuras,
      actionsTakenThisTurn: currentState.actionsTakenThisTurn || 0
    };

    // Use CardPlayManager to process the additional cost card completion
    const result = CardPlayManager.processAdditionalCostCardCompletion(
      card,
      costSelection,
      effectTarget,
      playerId,
      playerStates,
      placedSections,
      callbacks
    );

    // Check if effect needs card selection (e.g., movement effect)
    if (result.needsEffectSelection) {
      debugLog('ADDITIONAL_COST', '🔄 Effect needs selection - returning to UI', {
        cardName: card.name,
        selectionType: result.needsEffectSelection.selectionData.type
      });

      return {
        success: true,  // Action processed successfully (though not complete)
        needsEffectSelection: result.needsEffectSelection,  // Pass to UI
        playerStates: result.needsEffectSelection.currentStates
      };
    }

    debugLog('ADDITIONAL_COST', '✅ ActionProcessor: Card execution completed', {
      cardName: card.name,
      stateChanged: result.newPlayerStates !== playerStates,
      animationEventCount: result.animationEvents?.length || 0,
      shouldEndTurn: result.shouldEndTurn
    });

    // Update game state with result
    const updatedState = {
      ...currentState,
      player1: result.newPlayerStates.player1,
      player2: result.newPlayerStates.player2,
      actionsTakenThisTurn: (currentState.actionsTakenThisTurn || 0) + 1
    };

    // Queue animations
    if (result.animationEvents && result.animationEvents.length > 0) {
      debugLog('ADDITIONAL_COST', '🎬 Animation events queued', {
        eventCount: result.animationEvents.length,
        eventTypes: result.animationEvents.map(e => e.type)
      });
      this.pendingActionAnimations.push(...result.animationEvents);
    }

    // Update state via GameStateManager
    this.gameStateManager.setState(updatedState);

    // Execute CARD_REVEAL animation now that additional cost card play is complete
    const animDef = this.animationManager?.animations['CARD_REVEAL'];
    const cardRevealAnimation = [{
      animationName: 'CARD_REVEAL',
      timing: animDef?.timing || 'independent',
      payload: {
        cardId: card.id,
        cardName: card.name,
        cardData: card,
        targetPlayer: playerId,
        timestamp: Date.now()
      }
    }];
    await this.executeAndCaptureAnimations(cardRevealAnimation);

    // NOTE: Turn transitions now handled by GameFlowManager based on shouldEndTurn flag
    // GameFlowManager monitors action completion and processes turn transitions after animations complete

    return {
      success: true,
      shouldEndTurn: result.shouldEndTurn,
      animationEvents: result.animationEvents
    };
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
    debugLog('ADDITIONAL_COST_EFFECT_FLOW', '🎯 ActionProcessor: processAdditionalCostEffectSelectionComplete ENTRY', {
      cardName: payload.selectionContext.card.name,
      playerId: payload.playerId,
      effectSelectionType: payload.effectSelection.type,
      droneId: payload.effectSelection.drone?.id,
      fromLane: payload.effectSelection.fromLane,
      toLane: payload.effectSelection.toLane
    });

    debugLog('ADDITIONAL_COST', '🎯 Processing effect selection completion', {
      cardName: payload.selectionContext.card.name,
      playerId: payload.playerId
    });

    const callbacks = this.gameStateManager.createCallbacks();

    debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   🔵 Calling CardPlayManager.completeAdditionalCostEffectSelection');

    const result = CardPlayManager.completeAdditionalCostEffectSelection(
      payload.selectionContext,
      payload.effectSelection,
      callbacks
    );

    debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   ✅ CardPlayManager completed', {
      success: true,
      hasNewStates: !!result.newPlayerStates,
      shouldEndTurn: result.shouldEndTurn,
      animationCount: result.animationEvents?.length || 0
    });

    // Update game state with result
    const currentState = this.gameStateManager.getState();
    const updatedState = {
      ...currentState,
      player1: result.newPlayerStates.player1,
      player2: result.newPlayerStates.player2,
      actionsTakenThisTurn: (currentState.actionsTakenThisTurn || 0) + 1
    };

    // Queue animations
    if (result.animationEvents && result.animationEvents.length > 0) {
      debugLog('ADDITIONAL_COST', '🎬 Animation events queued', {
        eventCount: result.animationEvents.length,
        eventTypes: result.animationEvents.map(e => e.type)
      });
      this.pendingActionAnimations.push(...result.animationEvents);
    }

    // Update state via GameStateManager
    this.gameStateManager.setState(updatedState);

    debugLog('ADDITIONAL_COST_EFFECT_FLOW', '✅ ActionProcessor complete - returning result');

    return {
      success: true,
      newPlayerStates: result.newPlayerStates,
      shouldEndTurn: result.shouldEndTurn,
      animationEvents: result.animationEvents
    };
  }

  async processMovementCompletion(payload) {
    const { card, movementType, drones, fromLane, toLane, playerId } = payload;

    debugLog('MOVEMENT_EFFECT', 'processMovementCompletion - payload received', {
      cardName: card.name,
      cardInstanceId: card.instanceId,
      cardEffectType: card.effect?.type,
      cardEffectProperties: card.effect?.properties,
      movementType,
      playerId
    });

    const currentState = this.gameStateManager.getState();

    // Pay card costs now (they weren't paid when the movement selection started)
    const playerStates = gameEngine.payCardCosts(card, playerId, {
      player1: currentState.player1,
      player2: currentState.player2
    });

    const placedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    const callbacks = {
      logCallback: (entry) => this.gameStateManager.addLogEntry(entry)
    };

    // Create context for MovementEffectProcessor
    const context = {
      actingPlayerId: playerId,
      playerStates: {
        player1: JSON.parse(JSON.stringify(playerStates.player1)),
        player2: JSON.parse(JSON.stringify(playerStates.player2))
      },
      card,
      placedSections,
      callbacks,
      localPlayerId: playerId,
      gameMode: currentState.gameMode || 'local'
    };

    const opponentPlayerId = playerId === 'player1' ? 'player2' : 'player1';
    const movementProcessor = new MovementEffectProcessor();

    let result;

    if (movementType === 'single_move') {
      // Single drone movement
      result = movementProcessor.executeSingleMove(
        card,
        drones[0], // Single drone
        fromLane,
        toLane,
        playerId,
        context.playerStates,
        opponentPlayerId,
        context
      );
    } else {
      // Multi-drone movement
      result = movementProcessor.executeMultiMove(
        card,
        drones, // Array of drones
        fromLane,
        toLane,
        playerId,
        context.playerStates,
        opponentPlayerId,
        context
      );
    }

    // Check for validation errors
    if (result.error) {
      return {
        success: false,
        error: result.error,
        shouldCancelCardSelection: result.shouldCancelCardSelection,
        shouldClearMultiSelectState: result.shouldClearMultiSelectState
      };
    }

    // Process POST conditionals for movement cards
    // The moved drone(s) become the target for condition evaluation
    let dynamicGoAgain = false;
    let postStates = result.newPlayerStates;

    if (card.conditionalEffects && card.conditionalEffects.length > 0) {
      const conditionalProcessor = new ConditionalEffectProcessor();
      const effectRouter = new EffectRouter();

      // Use the first moved drone as the target for condition evaluation
      // For multi-move, conditions are evaluated against the first drone
      const movedDrone = result.effectResult?.movedDrones?.[0] || drones[0];

      // Build context with moved drone as target
      const postContext = {
        target: movedDrone,
        actingPlayerId: playerId,
        playerStates: result.newPlayerStates,
        placedSections,
        callbacks,
        card
      };

      const postResult = conditionalProcessor.processPostConditionals(
        card.conditionalEffects,
        postContext,
        result.effectResult
      );

      // Handle GO_AGAIN
      if (postResult.grantsGoAgain) {
        dynamicGoAgain = true;
      }

      // Route additional effects through EffectRouter
      let currentStatesForEffects = postResult.newPlayerStates;
      for (const effect of postResult.additionalEffects || []) {
        const effectContext = {
          ...postContext,
          playerStates: currentStatesForEffects,
          target: movedDrone
        };
        const effectResult = effectRouter.routeEffect(effect, effectContext);
        if (effectResult?.newPlayerStates) {
          currentStatesForEffects = effectResult.newPlayerStates;
        }
      }

      postStates = currentStatesForEffects;

      debugLog('EFFECT_PROCESSING', '[ActionProcessor] Movement POST conditionals processed', {
        conditionalCount: card.conditionalEffects.length,
        grantsGoAgain: dynamicGoAgain,
        additionalEffectsQueued: postResult.additionalEffects?.length || 0
      });
    }

    // Get current states after movement and conditionals for finishCardPlay
    const currentStates = {
      player1: postStates.player1,
      player2: postStates.player2
    };

    // Call finishCardPlay to discard card and determine turn ending
    // Pass dynamicGoAgain from POST conditionals
    debugLog('CARD_DISCARD', '📤 processMovementCompletion: calling finishCardPlay', {
      cardName: card.name,
      cardInstanceId: card.instanceId,
      playerId,
      handSizeBefore: currentStates[playerId]?.hand?.length
    });

    const completion = gameEngine.finishCardPlay(card, playerId, currentStates, dynamicGoAgain);

    // Update state with card removed from hand and added to discard
    debugLog('CARD_DISCARD', '📥 processMovementCompletion: finishCardPlay returned', {
      cardName: card.name,
      handSizeAfter: completion.newPlayerStates[playerId]?.hand?.length,
      shouldEndTurn: completion.shouldEndTurn
    });

    this.gameStateManager.setPlayerStates(
      completion.newPlayerStates.player1,
      completion.newPlayerStates.player2
    );

    debugLog('CARD_DISCARD', '✅ processMovementCompletion: setPlayerStates called', {
      cardName: card.name,
      player1HandSize: completion.newPlayerStates.player1?.hand?.length,
      player2HandSize: completion.newPlayerStates.player2?.hand?.length
    });

    // Execute CARD_REVEAL animation now that movement is complete (non-blocking)
    const animDef = this.animationManager?.animations['CARD_REVEAL'];
    const cardRevealAnimation = [{
      animationName: 'CARD_REVEAL',
      timing: animDef?.timing || 'independent',  // Include timing from definition
      payload: {
        cardId: card.id,
        cardName: card.name,
        cardData: card,
        targetPlayer: playerId,  // Standardized field name
        timestamp: Date.now()
      }
    }];
    await this.executeAndCaptureAnimations(cardRevealAnimation);

    // NOTE: Turn transitions now handled by GameFlowManager based on shouldEndTurn flag
    // GameFlowManager processes turn transitions after movement animations complete

    // Return result with animations for optimistic action tracking
    return {
      success: true,
      shouldEndTurn: completion.shouldEndTurn,
      newPlayerStates: completion.newPlayerStates,
      animations: {
        actionAnimations: cardRevealAnimation,
        systemAnimations: []
      }
    };
  }

  /**
   * Process SEARCH_AND_DRAW card completion after player modal selection
   * Handles Equipment Cache, Strategic Planning, and other search cards
   * Card costs are paid here (not during initial card play)
   * @param {Object} payload - { card, selectedCards, selectionData, playerId }
   */
  async processSearchAndDrawCompletion(payload) {
    const { card, selectedCards, selectionData, playerId } = payload;

    const currentState = this.gameStateManager.getState();
    const { searchedCards, remainingDeck, discardPile, shuffleAfter } = selectionData;

    // Pay card costs now (they weren't paid when the modal opened)
    const statesAfterCosts = gameEngine.payCardCosts(card, playerId, {
      player1: currentState.player1,
      player2: currentState.player2
    });

    // Calculate unselected cards
    const unselectedCards = searchedCards.filter(searchCard => {
      const cardId = searchCard.instanceId || `${searchCard.id}-${searchCard.name}`;
      return !selectedCards.some(selected => {
        const selectedId = selected.instanceId || `${selected.id}-${selected.name}`;
        return selectedId === cardId;
      });
    });

    const actingPlayerState = statesAfterCosts[playerId];

    // Build new hand and deck
    const newHand = [...actingPlayerState.hand, ...selectedCards];
    let newDeck = [...remainingDeck, ...unselectedCards];

    if (shuffleAfter) {
      const gameState = this.gameStateManager.getState();
      const rng = SeededRandom.fromGameState(gameState);
      newDeck = rng.shuffle(newDeck);
    }

    const updatedPlayerState = {
      ...actingPlayerState,
      deck: newDeck,
      hand: newHand,
      discardPile: discardPile
    };

    // Merge with other player's state
    const currentStates = {
      player1: playerId === 'player1' ? updatedPlayerState : statesAfterCosts.player1,
      player2: playerId === 'player2' ? updatedPlayerState : statesAfterCosts.player2
    };

    // Call finishCardPlay to discard card and determine turn ending
    const completion = gameEngine.finishCardPlay(card, playerId, currentStates);

    // Log through ActionProcessor (proper pattern)
    this.gameStateManager.addLogEntry({
      player: actingPlayerState.name,
      actionType: 'CARD_SELECTION',
      source: card.name,
      target: `Selected ${selectedCards.length} cards`,
      outcome: `Drew: ${selectedCards.map(c => c.name).join(', ')}`
    }, 'processSearchAndDrawCompletion');

    // Update state through ActionProcessor (proper pattern)
    this.gameStateManager.setPlayerStates(
      completion.newPlayerStates.player1,
      completion.newPlayerStates.player2
    );

    // Execute CARD_REVEAL animation now that card selection is complete
    const animDef = this.animationManager?.animations['CARD_REVEAL'];
    const cardRevealAnimation = [{
      animationName: 'CARD_REVEAL',
      timing: animDef?.timing || 'independent',  // Include timing from definition
      payload: {
        cardId: card.id,
        cardName: card.name,
        cardData: card,
        targetPlayer: playerId,  // Standardized field name
        timestamp: Date.now()
      }
    }];
    // Execute animation and wait for completion to ensure proper sequencing
    await this.executeAndCaptureAnimations(cardRevealAnimation);

    // NOTE: Turn transitions now handled by GameFlowManager based on shouldEndTurn flag
    // GameFlowManager processes turn transitions after search card animations complete

    // Return result with animations for optimistic action tracking
    return {
      success: true,
      shouldEndTurn: completion.shouldEndTurn,
      newPlayerStates: completion.newPlayerStates,
      animations: {
        actionAnimations: cardRevealAnimation,
        systemAnimations: []
      }
    };
  }

  /**
   * Process ship ability action
   */
  async processShipAbility(payload) {
    const { ability, sectionName, targetId, playerId } = payload;

    const currentState = this.gameStateManager.getState();
    const playerStates = { player1: currentState.player1, player2: currentState.player2 };
    const placedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    const callbacks = {
      logCallback: (entry) => this.gameStateManager.addLogEntry(entry),
      resolveAttackCallback: async (attackPayload) => {
        // Recursively handle attack through action processor
        return await this.processAttack(attackPayload);
      }
    };

    const result = AbilityResolver.resolveShipAbility(
      ability,
      sectionName,
      targetId,
      playerStates,
      placedSections,
      callbacks,
      playerId
    );

    // Collect animation events
    // Spread all event properties to ensure logical position data flows through
    // Include timing property from AnimationManager for proper sequencing on guest side
    const animations = (result.animationEvents || []).map(event => {
      const animDef = this.animationManager?.animations[event.type];
      return {
        animationName: event.type,
        timing: animDef?.timing || 'pre-state',  // Include timing from definition
        payload: {
          ...event,  // Pass ALL properties from event (sourcePlayer, sourceLane, targetPlayer, etc.)
          droneId: event.sourceId  // Add alias for backwards compatibility
        }
      };
    });

    // Capture animations for broadcasting (host only)
    const gameMode = this.gameStateManager.get('gameMode');
    if (gameMode === 'host' && animations.length > 0) {
      this.pendingActionAnimations.push(...animations);
    }

    // Prepare states for TELEPORT_IN animation timing (if ship abilities can spawn drones)
    const { pendingStateUpdate, pendingFinalState } = this.prepareTeleportStates(
      animations,
      result.newPlayerStates
    );

    // Set pending states for Animation Manager
    this.pendingStateUpdate = pendingStateUpdate;
    this.pendingFinalState = pendingFinalState;

    // HOST: Broadcast IMMEDIATELY (before execution starts)
    // Guest receives execution plan with zero delay
    if (gameMode === 'host') {
      this.broadcastStateToGuest();
    }

    // Execute with proper timing (BOTH HOST and GUEST use same path)
    // Animation Manager orchestrates: pre-state anims → state update → post-state anims
    // For TELEPORT_IN animations (if ship abilities can spawn drones), proper invisible→visible transition
    try {
      await this.animationManager.executeWithStateUpdate(animations, this);
    } finally {
      this.pendingStateUpdate = null;
      this.pendingFinalState = null;
    }

    // NOTE: Turn transitions now handled by GameFlowManager based on shouldEndTurn flag
    // GameFlowManager processes turn transitions after ship ability animations complete

    // Return result with animations for optimistic action tracking
    return {
      ...result,
      animations: {
        actionAnimations: animations,
        systemAnimations: []
      }
    };
  }

  /**
   * Process ship ability completion (after UI confirmation)
   * Used for abilities that require multi-step UI interactions (e.g., shield reallocation)
   * Deducts energy cost and ends turn without re-executing ability logic
   */
  async processShipAbilityCompletion(payload) {
    const { ability, sectionName, playerId } = payload;

    const currentState = this.gameStateManager.getState();
    const playerState = currentState[playerId];

    // Deduct energy cost
    const newPlayerState = {
      ...playerState,
      energy: playerState.energy - ability.cost.energy
    };

    this.gameStateManager.updatePlayerState(playerId, newPlayerState);

    // Log the ability completion
    this.gameStateManager.addLogEntry({
      player: playerState.name,
      actionType: 'SHIP_ABILITY',
      source: `${sectionName}'s ${ability.name}`,
      target: 'N/A',
      outcome: `Completed ${ability.name}.`
    });

    debugLog('ENERGY', `💰 Ship ability completion: ${ability.name} cost ${ability.cost.energy} energy`, {
      playerId,
      previousEnergy: playerState.energy,
      newEnergy: newPlayerState.energy
    });

    // Return result indicating turn should end
    return {
      success: true,
      shouldEndTurn: true,
      newPlayerStates: {
        player1: currentState.player1,
        player2: currentState.player2,
        [playerId]: newPlayerState
      }
    };
  }

  /**
   * Process Recall ship ability
   * Single-action: Recall drone + deduct energy + end turn
   */
  async processRecallAbility(payload) {
    const currentState = this.gameStateManager.getState();
    const { sectionName, playerId } = payload;

    // Validate activation limit
    const limitError = this.validateShipAbilityActivationLimit(sectionName, playerId, { player1: currentState.player1, player2: currentState.player2 });
    if (limitError) return limitError;

    const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;

    const result = RecallAbilityProcessor.process(
      payload,
      { player1: currentState.player1, player2: currentState.player2 },
      placedSections
    );

    if (result.newPlayerStates) {
      this.gameStateManager.updatePlayerState('player1', result.newPlayerStates.player1);
      this.gameStateManager.updatePlayerState('player2', result.newPlayerStates.player2);
    }

    return result;
  }

  /**
   * Process Target Lock ship ability
   * Single-action: Mark drone + deduct energy + end turn
   */
  async processTargetLockAbility(payload) {
    const currentState = this.gameStateManager.getState();
    const { sectionName, playerId } = payload;

    // Validate activation limit
    const limitError = this.validateShipAbilityActivationLimit(sectionName, playerId, { player1: currentState.player1, player2: currentState.player2 });
    if (limitError) return limitError;

    const result = TargetLockAbilityProcessor.process(
      payload,
      { player1: currentState.player1, player2: currentState.player2 }
    );

    if (result.newPlayerStates) {
      this.gameStateManager.updatePlayerState('player1', result.newPlayerStates.player1);
      this.gameStateManager.updatePlayerState('player2', result.newPlayerStates.player2);
    }

    return result;
  }

  /**
   * Validate ship ability activation limit
   * @param {string} sectionName - Ship section name
   * @param {string} playerId - Player ID
   * @param {Object} playerStates - Current player states
   * @returns {Object|null} Error object if limit reached, null if valid
   */
  validateShipAbilityActivationLimit(sectionName, playerId, playerStates) {
    // Find the ability definition from ship section data
    const sectionDefinition = shipComponentCollection.find(s =>
      s.type.toLowerCase() === sectionName.toLowerCase() || s.name?.toLowerCase() === sectionName.toLowerCase()
    );
    const ability = sectionDefinition?.ability;

    if (ability?.activationLimit != null) {
      const sectionData = playerStates[playerId]?.shipSections?.[sectionName];
      const activations = sectionData?.abilityActivationCount || 0;
      if (activations >= ability.activationLimit) {
        return {
          error: `Ability ${ability.name} has reached its activation limit for this round`,
          shouldEndTurn: false,
          animationEvents: []
        };
      }
    }
    return null;
  }

  /**
   * Process Recalculate ship ability
   * Multi-step: Deduct energy + draw card, return mandatoryAction
   */
  async processRecalculateAbility(payload) {
    const currentState = this.gameStateManager.getState();
    const localPlayerId = this.gameStateManager.getLocalPlayerId();
    const { sectionName, playerId } = payload;

    // Validate activation limit
    const limitError = this.validateShipAbilityActivationLimit(sectionName, playerId, { player1: currentState.player1, player2: currentState.player2 });
    if (limitError) return limitError;

    const result = RecalculateAbilityProcessor.process(
      payload,
      { player1: currentState.player1, player2: currentState.player2 },
      localPlayerId,
      currentState.gameMode
    );

    if (result.newPlayerStates) {
      this.gameStateManager.updatePlayerState('player1', result.newPlayerStates.player1);
      this.gameStateManager.updatePlayerState('player2', result.newPlayerStates.player2);
    }

    return result;
  }

  /**
   * Complete Recalculate ability after mandatory discard
   */
  async processRecalculateComplete(payload) {
    const currentState = this.gameStateManager.getState();

    const result = RecalculateAbilityProcessor.complete(
      payload,
      { player1: currentState.player1, player2: currentState.player2 }
    );

    // No state changes needed - discard already processed
    return result;
  }

  /**
   * Process Reallocate Shields ship ability actions
   * Handles remove/add/restore actions during UI flow
   */
  async processReallocateShieldsAbility(payload) {
    const currentState = this.gameStateManager.getState();

    const result = ReallocateShieldsAbilityProcessor.process(
      payload,
      { player1: currentState.player1, player2: currentState.player2 },
      currentState
    );

    if (result.newPlayerStates) {
      this.gameStateManager.updatePlayerState('player1', result.newPlayerStates.player1);
      this.gameStateManager.updatePlayerState('player2', result.newPlayerStates.player2);
    }

    return result;
  }

  /**
   * Complete Reallocate Shields ability
   * Deduct energy and end turn when confirmed
   */
  async processReallocateShieldsComplete(payload) {
    const currentState = this.gameStateManager.getState();

    const result = ReallocateShieldsAbilityProcessor.complete(
      payload,
      { player1: currentState.player1, player2: currentState.player2 }
    );

    if (result.newPlayerStates) {
      this.gameStateManager.updatePlayerState('player1', result.newPlayerStates.player1);
      this.gameStateManager.updatePlayerState('player2', result.newPlayerStates.player2);
    }

    return result;
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
    const { newPhase, newPlayer } = payload;

    debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] Processing turn transition:`, { newPhase, newPlayer });

    const currentState = this.gameStateManager.getState();
    debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] Current state before transition:`, {
      turnPhase: currentState.turnPhase,
      currentPlayer: currentState.currentPlayer,
      turn: currentState.turn
    });

    // Use gameLogic function to calculate transition effects
    const transitionResult = gameEngine.calculateTurnTransition(
      currentState.currentPlayer,
      currentState.passInfo,
      currentState.turnPhase,
      currentState.winner
    );

    // Apply explicit changes (overrides calculated logic if provided)
    if (newPhase) {
      debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] Setting new phase: ${newPhase}`);
      this.gameStateManager.setTurnPhase(newPhase);
    }

    if (newPlayer) {
      const currentState = this.gameStateManager.getState();
      let actualNewPlayer = newPlayer;

      // Check if trying to switch to a player who has passed
      if (currentState.passInfo && currentState.passInfo[`${newPlayer}Passed`]) {
        // Keep turn with current player instead
        actualNewPlayer = currentState.currentPlayer;
        debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] ${newPlayer} has passed, keeping turn with ${actualNewPlayer}`);
      } else {
        debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] Setting new player: ${actualNewPlayer}`);
      }

      // Reset action counter when turn passes to a different player (for NOT_FIRST_ACTION ability condition)
      const previousPlayer = currentState.currentPlayer;
      if (actualNewPlayer !== previousPlayer) {
        this.gameStateManager.setState({ actionsTakenThisTurn: 0 }, 'TURN_TRANSITION_RESET');
        debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] Reset actionsTakenThisTurn for new player: ${actualNewPlayer}`);
      }

      // Always set the player (even if same) to trigger state change event
      this.gameStateManager.setCurrentPlayer(actualNewPlayer);
    }

    const newState = this.gameStateManager.getState();
    debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] State after transition:`, {
      turnPhase: newState.turnPhase,
      currentPlayer: newState.currentPlayer,
      turn: newState.turn,
      transitionType: transitionResult.type
    });

    return { success: true, transitionType: transitionResult.type };
  }

  /**
   * Process phase transition action
   */
  async processPhaseTransition(payload) {
    const { newPhase, resetPassInfo = true, guestAnnouncementOnly = false } = payload;

    const currentState = this.gameStateManager.getState();

    // Guard against re-entering same phase
    if (currentState.turnPhase === newPhase) {
      debugLog('PHASE_TRANSITIONS', `[PHASE TRANSITION DEBUG] Skipping redundant transition to same phase: ${newPhase}`);
      return { success: true, message: 'Already in phase' };
    }

    debugLog('PHASE_TRANSITIONS', `[PHASE TRANSITION DEBUG] Processing phase transition to: ${newPhase}`);

    // If this is guest announcement only (pseudo-phase), queue announcement and return early
    // This prevents state modification and validation warnings for announcement-only phases
    if (guestAnnouncementOnly) {
      const phaseTextMap = {
        roundAnnouncement: 'ROUND',
        roundInitialization: 'UPKEEP',
        mandatoryDiscard: 'MANDATORY DISCARD PHASE',
        optionalDiscard: 'OPTIONAL DISCARD PHASE',
        allocateShields: 'ALLOCATE SHIELDS',
        mandatoryDroneRemoval: 'REMOVE EXCESS DRONES',
        deployment: 'DEPLOYMENT PHASE',
        deploymentComplete: 'DEPLOYMENT COMPLETE',
        action: 'ACTION PHASE',
        actionComplete: 'ACTION PHASE COMPLETE'
      };

      if (phaseTextMap[newPhase] && this.phaseAnimationQueue) {
        const phaseText = phaseTextMap[newPhase];
        const subtitle = newPhase === 'roundInitialization'
          ? 'Drawing Cards, Gaining Energy, Resetting Drones...'
          : newPhase === 'actionComplete'
          ? 'Transitioning to Next Round'
          : null;

        this.phaseAnimationQueue.queueAnimation(newPhase, phaseText, subtitle, 'AP:guest_pseudo:1789');
        debugLog('PHASE_MANAGER', `✅ [GUEST] Announcement queued for pseudo-phase: ${newPhase}`);
      }

      return { success: true, message: 'Guest announcement queued' };
    }

    // LOG PLACEMENT DATA BEFORE TRANSITION
    debugLog('PHASE_TRANSITIONS', `[PLACEMENT DATA DEBUG] BEFORE transition to ${newPhase}:`, {
      currentPhase: currentState.turnPhase,
      placedSections: currentState.placedSections,
      opponentPlacedSections: currentState.opponentPlacedSections
    });

    const stateUpdates = {};

    // Initialize currentPlayer for sequential phases (turn-based phases)
    const sequentialPhases = ['deployment', 'action'];
    if (sequentialPhases.includes(newPhase)) {
      // Set currentPlayer to firstPlayerOfRound for sequential phases
      stateUpdates.currentPlayer = currentState.firstPlayerOfRound;
      debugLog('PHASE_TRANSITIONS', `[PHASE TRANSITION DEBUG] Sequential phase: Setting currentPlayer to firstPlayerOfRound: ${currentState.firstPlayerOfRound}`);
    }

    // Handle phase-specific initialization
    if (newPhase === 'allocateShields') {
      // Initialize shield allocation for local player
      const localPlayerId = this.gameStateManager.getLocalPlayerId();
      const localPlayerState = currentState[localPlayerId];

      // Calculate shields available this turn
      const effectiveStats = this.gameDataService.getEffectiveShipStats(localPlayerState, this.gameStateManager.getLocalPlacedSections());
      const shieldsPerTurn = effectiveStats.totals.shieldsPerTurn;

      stateUpdates.shieldsToAllocate = shieldsPerTurn;
      debugLog('PHASE_TRANSITIONS', `[SHIELD ALLOCATION DEBUG] Initialized shields to allocate: ${shieldsPerTurn}`);
    } else if (newPhase === 'placement') {
      // Initialize placement phase
      stateUpdates.unplacedSections = ['bridge', 'powerCell', 'droneControlHub'];
      stateUpdates.placedSections = Array(3).fill(null);
      stateUpdates.opponentPlacedSections = Array(3).fill(null);
      debugLog('PHASE_TRANSITIONS', `[PLACEMENT DEBUG] Initialized placement phase`);
    }

    // Apply the phase change and any phase-specific updates
    stateUpdates.turnPhase = newPhase;
    try {
      this.gameStateManager._updateContext = 'ActionProcessor';
      this.gameStateManager.setState(stateUpdates);
    } finally {
      this.gameStateManager._updateContext = null;
    }

    // Reset commitments for the new phase (clean slate)
    // Only clear the new phase's commitments, preserve old phase commitments for reference
    this.clearPhaseCommitments(newPhase);

    // Reset pass info if requested (typical for new phase)
    if (resetPassInfo) {
      this.gameStateManager.setPassInfo({
        firstPasser: null,
        player1Passed: false,
        player2Passed: false
      });
    }

    // Show phase announcement for round phases
    // Note: Automatic phases (energyReset, draw) are excluded - only determineFirstPlayer shows as "INITIALISING ROUND"
    const phaseTextMap = {
      roundAnnouncement: 'ROUND',  // Round number added dynamically at playback time
      roundInitialization: 'UPKEEP',
      mandatoryDiscard: 'MANDATORY DISCARD PHASE',
      optionalDiscard: 'OPTIONAL DISCARD PHASE',
      allocateShields: 'ALLOCATE SHIELDS',
      mandatoryDroneRemoval: 'REMOVE EXCESS DRONES',
      deployment: 'DEPLOYMENT PHASE',
      deploymentComplete: 'DEPLOYMENT COMPLETE',
      action: 'ACTION PHASE',
      actionComplete: 'ACTION PHASE COMPLETE'
    };

    if (phaseTextMap[newPhase]) {
      debugLog('PHASE_TRANSITIONS', `🎬 [PHASE ANNOUNCEMENT] Queueing announcement for: ${newPhase}`);

      const phaseText = phaseTextMap[newPhase];

      // Calculate subtitle for specific phases
      const subtitle = newPhase === 'roundInitialization'
        ? 'Drawing Cards, Gaining Energy, Resetting Drones...'
        : newPhase === 'actionComplete'
        ? 'Transitioning to Next Round'
        : null;

      // Queue animation for sequential playback (non-blocking)
      // Note: Subtitle for deployment/action is calculated dynamically by PhaseAnimationQueue
      // at playback time to ensure correct player context with fresh state
      debugLog('PHASE_TRANSITIONS', `🎬 [PHASE ANNOUNCEMENT] Attempting to queue`, {
        phase: newPhase,
        hasQueue: !!this.phaseAnimationQueue,
        gameMode: currentState.gameMode
      });

      if (this.phaseAnimationQueue) {
        this.phaseAnimationQueue.queueAnimation(newPhase, phaseText, subtitle, 'AP:host_transition:1892');
        debugLog('PHASE_TRANSITIONS', `✅ [PHASE ANNOUNCEMENT] Successfully queued: ${newPhase}`);

        // Note: Playback is started explicitly by GameFlowManager after phase transitions complete
        // This ensures App.jsx is mounted and subscribed before animations play
        // Automatic startPlayback() was removed to fix race condition where first animation
        // started before App.jsx listener was set up, causing lost events
        debugLog('PHASE_TRANSITIONS', `🎬 [PHASE ANNOUNCEMENT] Animation queued for: ${newPhase}`);
      } else {
        debugLog('PHASE_TRANSITIONS', `❌ [PHASE ANNOUNCEMENT] Queue not available for: ${newPhase}`);
      }

      // Note: PHASE_ANNOUNCEMENT animations are NOT broadcast to guest
      // Each client (host and guest) queues phase announcements locally based on their own phase processing
      // This prevents duplicate announcements and maintains clean separation: host = state authority, guest = own presentation

      debugLog('PHASE_TRANSITIONS', `🎬 [PHASE ANNOUNCEMENT] Animation queued for: ${newPhase}`);
    }

    debugLog('PHASE_TRANSITIONS', `[PHASE TRANSITION DEBUG] Phase transition complete: ${currentState.turnPhase} → ${newPhase}`);

    // LOG PLACEMENT DATA AFTER TRANSITION
    const finalState = this.gameStateManager.getState();
    debugLog('PHASE_TRANSITIONS', `[PLACEMENT DATA DEBUG] AFTER transition to ${newPhase}:`, {
      newPhase: finalState.turnPhase,
      placedSections: finalState.placedSections,
      opponentPlacedSections: finalState.opponentPlacedSections,
      stateUpdatesApplied: stateUpdates
    });

    return { success: true, newPhase };
  }

  /**
   * Process round start action
   */
  async processRoundStart(payload) {
    const { newTurn, newPhase = 'deployment', firstPlayer } = payload;

    debugLog('PHASE_TRANSITIONS', `[ROUND START DEBUG] Processing round start for turn: ${newTurn}`);

    const currentState = this.gameStateManager.getState();

    // Determine first player using firstPlayerUtils (handles seeded random for multiplayer)
    const { determineFirstPlayer } = await import('../utils/firstPlayerUtils.js');
    const determinedFirstPlayer = firstPlayer || determineFirstPlayer({
      ...currentState,
      turn: newTurn,
      roundNumber: currentState.roundNumber || Math.floor((newTurn - 1) / 2) + 1
    });

    // Calculate effective ship stats for both players
    const player1EffectiveStats = this.gameDataService.getEffectiveShipStats(
      currentState.player1,
      currentState.placedSections
    );
    const player2EffectiveStats = this.gameDataService.getEffectiveShipStats(
      currentState.player2,
      currentState.opponentPlacedSections
    );

    // Calculate new player states for the round using computed stats
    const newPlayer1State = RoundManager.calculateNewRoundPlayerState(
      currentState.player1,
      newTurn,
      player1EffectiveStats,
      currentState.player2,
      currentState.placedSections
    );

    const newPlayer2State = RoundManager.calculateNewRoundPlayerState(
      currentState.player2,
      newTurn,
      player2EffectiveStats,
      currentState.player1,
      currentState.opponentPlacedSections
    );

    // Apply all round start changes
    try {
      this.gameStateManager._updateContext = 'ActionProcessor';
      this.gameStateManager.setState({
        turn: newTurn,
        turnPhase: newPhase,
        currentPlayer: determinedFirstPlayer,
        firstPlayerOfRound: determinedFirstPlayer,
        firstPasserOfPreviousRound: currentState.passInfo.firstPasser,
        actionsTakenThisTurn: 0,  // Reset for new round (NOT_FIRST_ACTION ability condition)
        passInfo: {
          firstPasser: null,
          player1Passed: false,
          player2Passed: false
        }
      });
    } finally {
      this.gameStateManager._updateContext = null;
    }

    // Update player states
    this.gameStateManager.setPlayerStates(newPlayer1State, newPlayer2State);

    debugLog('PHASE_TRANSITIONS', `[ROUND START DEBUG] Round start complete - Turn ${newTurn}, First player: ${determinedFirstPlayer}`);

    return {
      success: true,
      newTurn,
      newPhase,
      firstPlayer: determinedFirstPlayer,
      playerStates: { player1: newPlayer1State, player2: newPlayer2State }
    };
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
   * Process AI decision through appropriate handlers
   * NOTE: This method is legacy/dead code - never called in current architecture.
   * Current AI flow uses processAiAction() instead, called via type: 'aiAction'.
   * Kept temporarily for reference, should be removed in future cleanup.
   */
  async processAiDecision(aiDecision, playerId) {
    debugLog('DEPLOYMENT', `[AI DECISION DEBUG] Processing AI decision type: ${aiDecision.type}`);

    switch (aiDecision.type) {
      case 'deploy':
        const { droneToDeploy, targetLane } = aiDecision.payload;
        debugLog('DEPLOYMENT', `[AI DECISION DEBUG] AI deploying:`, { droneToDeploy: droneToDeploy?.name, targetLane });

        const deployResult = await this.processDeployment({
          droneData: droneToDeploy,
          laneId: targetLane,
          playerId: playerId,
          turn: this.gameStateManager.get('turn')
        });

        debugLog('DEPLOYMENT', `[AI DECISION DEBUG] Deployment result:`, deployResult);

        // NOTE: Turn transitions now handled by GameFlowManager
        // deployResult already includes shouldEndTurn flag
        debugLog('DEPLOYMENT', `[AI DECISION DEBUG] Deployment complete, shouldEndTurn: ${deployResult.shouldEndTurn}`);

        return deployResult;

      case 'action':
        const chosenAction = aiDecision.payload;
        let actionResult;

        switch (chosenAction.type) {
          case 'attack':
            actionResult = await this.processAttack({
              attackDetails: {
                attacker: chosenAction.attacker,
                target: chosenAction.target,
                targetType: chosenAction.targetType || 'drone',
                lane: chosenAction.lane,
                attackingPlayer: playerId,
                aiContext: aiDecision.logContext
              }
            });
            break;

          case 'play_card':
            actionResult = await this.processCardPlay({
              card: chosenAction.card,
              targetId: chosenAction.target?.id,
              playerId: playerId
            });
            break;

          case 'move':
            actionResult = await this.processMove({
              droneId: chosenAction.drone.id,
              fromLane: chosenAction.fromLane,
              toLane: chosenAction.toLane,
              playerId: playerId
            });
            break;

          case 'ability':
            actionResult = await this.processAbility({
              droneId: chosenAction.drone.id,
              abilityIndex: chosenAction.abilityIndex,
              targetId: chosenAction.target?.id
            });
            break;

          default:
            throw new Error(`Unknown AI action subtype: ${chosenAction.type}`);
        }

        // Turn transitions are handled by individual action processors (processAttack, processAbility, etc.)
        // No need to call processTurnTransition here to avoid double transitions

        return actionResult;

      case 'pass':
        debugLog('PASS_LOGIC', `[AI DECISION DEBUG] AI passing`);
        // Handle AI pass
        const currentState = this.gameStateManager.getState();
        const wasFirstToPass = !currentState.passInfo[playerId === 'player1' ? 'player2Passed' : 'player1Passed'];

        debugLog('PASS_LOGIC', `[AI DECISION DEBUG] Pass info before update:`, currentState.passInfo);

        this.gameStateManager.updatePassInfo({
          [playerId + 'Passed']: true,
          firstPasser: currentState.passInfo.firstPasser || (wasFirstToPass ? playerId : null)
        });

        const newPassInfo = this.gameStateManager.get('passInfo');
        debugLog('PASS_LOGIC', `[AI DECISION DEBUG] Pass info after update:`, newPassInfo);

        // NOTE: Turn and phase transitions now handled by GameFlowManager
        // GameFlowManager monitors passInfo and handles:
        // - Turn transitions when one player passes
        // - Phase transitions when both players pass
        const bothPlayersPassed = newPassInfo.player1Passed && newPassInfo.player2Passed;
        debugLog('PASS_LOGIC', `[AI DECISION DEBUG] Both players passed: ${bothPlayersPassed}`);

        return {
          success: true,
          action: 'pass',
          shouldEndTurn: !bothPlayersPassed // Pass ends turn unless both players passed (then phase ends)
        };

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
      console.warn('⚠️ processGuestAction should only be called by host');
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
      console.error('[HOST] Error processing guest action:', error);
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
      console.warn('[prepareTeleportStates] Incomplete newPlayerStates, skipping teleport preparation');
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
    try {
      this.gameStateManager._updateContext = 'ActionProcessor';
      this.gameStateManager.setState({ passInfo: newPassInfo }, 'PASS_INFO_SET');
    } finally {
      this.gameStateManager._updateContext = null;
    }

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
      try {
        this.gameStateManager._updateContext = 'ActionProcessor';
        this.gameStateManager.setState({
          turn: currentTurn + 1
        }, 'TURN_INCREMENT', 'playerPass');
        debugLog('PASS_LOGIC', `[TURN INCREMENT] Turn incremented: ${currentTurn} → ${currentTurn + 1}`);
      } finally {
        this.gameStateManager._updateContext = null;
      }
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
        try {
          this.gameStateManager._updateContext = 'ActionProcessor';
          this.gameStateManager.setState({
            currentPlayer: nextPlayer
          }, 'TURN_SWITCH', 'playerPass');
        } finally {
          this.gameStateManager._updateContext = null;
        }
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
    console.error('🔥 CRITICAL - Setting opponentPlacedSections to:', placement);
    try {
      this.gameStateManager._updateContext = 'ActionProcessor';
      this.gameStateManager.setState({
        opponentPlacedSections: placement
      }, 'aiShipPlacement');
    } finally {
      this.gameStateManager._updateContext = null;
    }

    // Verify it was set correctly
    const newState = this.gameStateManager.getState();
    console.error('🔥 CRITICAL - After setState, opponentPlacedSections is now:', newState.opponentPlacedSections);

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
    debugLog('PHASE_TRANSITIONS', '🎯 ActionProcessor: Processing first player determination');

    const currentState = this.gameStateManager.getState();

    // Import first player utilities
    const { determineFirstPlayer, getFirstPlayerReasonText } = await import('../utils/firstPlayerUtils.js');

    // Determine the first player using seeded randomization
    const firstPlayer = determineFirstPlayer(currentState);
    const reasonText = getFirstPlayerReasonText(currentState);

    // Update state with first player information
    try {
      this.gameStateManager._updateContext = 'ActionProcessor';
      this.gameStateManager.setState({
        currentPlayer: firstPlayer,
        firstPlayerOfRound: firstPlayer
      });
    } finally {
      this.gameStateManager._updateContext = null;
    }

    debugLog('PHASE_TRANSITIONS', `✅ First player determination complete: ${firstPlayer}`);

    return {
      success: true,
      firstPlayer,
      reasonText,
      turn: currentState.turn
    };
  }

  /**
   * Get phase commitment status
   * @param {string} phase - Phase name
   * @returns {Object|null} Commitment status
   */
  getPhaseCommitmentStatus(phase) {
    const currentState = this.gameStateManager.getState();

    if (!currentState.commitments[phase]) {
      return {
        phase,
        commitments: { player1: { completed: false }, player2: { completed: false } },
        bothComplete: false
      };
    }

    const commitments = currentState.commitments[phase];
    const bothComplete = commitments.player1.completed && commitments.player2.completed;

    return {
      phase,
      commitments,
      bothComplete
    };
  }

  /**
   * Clear commitments for a specific phase or all phases
   * @param {string} phase - Optional phase name, if not provided clears all
   */
  clearPhaseCommitments(phase = null) {
    const currentState = this.gameStateManager.getState();

    if (phase) {
      if (currentState.commitments[phase]) {
        currentState.commitments[phase] = {
          player1: { completed: false },
          player2: { completed: false }
        };
      }
      debugLog('COMMITMENTS', `🔄 Cleared commitments for phase: ${phase}`);
    } else {
      currentState.commitments = {};
      debugLog('COMMITMENTS', '🔄 Cleared all phase commitments');
    }

    try {
      this.gameStateManager._updateContext = 'ActionProcessor';
      this.gameStateManager.setState({
        commitments: currentState.commitments
      });
    } finally {
      this.gameStateManager._updateContext = null;
    }
  }

  /**
   * Process commitment action for simultaneous phases
   * @param {Object} payload - Commitment payload
   * @returns {Object} Commitment result
   */
  async processCommitment(payload) {
    const { playerId, phase, actionData } = payload;

    debugLog('COMMITMENTS', `🤝 ActionProcessor: Processing ${phase} commitment for ${playerId}`);
    debugLog('COMMITMENTS', `📦 Full commitment payload:`, {
      playerId,
      phase,
      actionDataKeys: actionData ? Object.keys(actionData) : [],
      actionDataSummary: actionData ? {
        selectedDrones: actionData.selectedDrones?.length,
        deck: actionData.deck?.length,
        drones: actionData.drones?.length,
        shipComponents: actionData.shipComponents?.length,
        placedSections: actionData.placedSections?.length
      } : null
    });

    // OPTIMISTIC PROCESSING: Guest now processes commitments locally
    // Host remains authoritative via validation at milestone phases

    // Get current state
    const currentState = this.gameStateManager.getState();
    const gameMode = currentState.gameMode;

    // Initialize commitments for this phase if not exists
    if (!currentState.commitments[phase]) {
      currentState.commitments[phase] = {
        player1: { completed: false },
        player2: { completed: false }
      };
    }

    // Store the commitment
    currentState.commitments[phase][playerId] = {
      completed: true,
      ...actionData
    };

    // SPECIAL HANDLING: Apply shield allocations from commitment data
    if (phase === 'allocateShields' && actionData.shieldAllocations) {
      debugLog('SHIELD_CLICKS', `🛡️ Applying shield allocations for ${playerId}`, {
        shieldAllocations: actionData.shieldAllocations
      });

      // Get player state
      const playerState = currentState[playerId];

      // Clear all current shield allocations for this player
      Object.keys(playerState.shipSections).forEach(sectionName => {
        playerState.shipSections[sectionName].allocatedShields = 0;
      });

      // Apply all shield allocations from the commitment
      Object.entries(actionData.shieldAllocations).forEach(([sectionName, count]) => {
        if (playerState.shipSections[sectionName]) {
          playerState.shipSections[sectionName].allocatedShields = count;
          debugLog('SHIELD_CLICKS', `✅ Allocated ${count} shields to ${sectionName}`);
        }
      });

      // Reset shields to allocate counter to 0 (all allocated)
      const shieldsKey = playerId === 'player1' ? 'shieldsToAllocate' : 'opponentShieldsToAllocate';
      currentState[shieldsKey] = 0;
    }

    // Update the state with specific event type for commitment changes
    try {
      this.gameStateManager._updateContext = 'ActionProcessor';
      this.gameStateManager.setState({
        commitments: currentState.commitments,
        player1: currentState.player1,
        player2: currentState.player2,
        shieldsToAllocate: currentState.shieldsToAllocate,
        opponentShieldsToAllocate: currentState.opponentShieldsToAllocate
      }, 'COMMITMENT_UPDATE');
    } finally {
      this.gameStateManager._updateContext = null;
    }

    // PHASE MANAGER INTEGRATION: Notify PhaseManager of commitment
    if (this.phaseManager) {
      if (gameMode === 'host' && playerId === 'player1') {
        // Host committed
        this.phaseManager.notifyHostAction('commit', { phase });
        debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: Host committed to ${phase}`);
      } else if (gameMode === 'host' && playerId === 'player2') {
        // Guest committed (received via network on Host)
        this.phaseManager.notifyGuestAction('commit', { phase });
        debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: Guest committed to ${phase} (via network)`);
      } else if (gameMode === 'local') {
        // Local mode: Notify for both players (AI or human)
        if (playerId === 'player1') {
          this.phaseManager.notifyHostAction('commit', { phase });
        } else {
          this.phaseManager.notifyGuestAction('commit', { phase });
        }
        debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: ${playerId} committed to ${phase} (local mode)`);
      }
      // Note: Guest mode doesn't call processCommitment for local player (blocked by guards)
    }

    // Check if both players have committed
    let bothComplete = currentState.commitments[phase].player1.completed &&
                        currentState.commitments[phase].player2.completed;

    debugLog('COMMITMENTS', `✅ ${playerId} ${phase} committed, both complete: ${bothComplete}`);
    debugLog('COMMITMENTS', `📊 Commitment state after update:`, {
      phase,
      player1Completed: currentState.commitments[phase].player1.completed,
      player2Completed: currentState.commitments[phase].player2.completed,
      bothComplete
    });

    // HOST: Broadcast commitment state to guest immediately
    // This ensures guest sees their commitment status and can show waiting modal
    // Must happen even when isNetworkAction=true (guest-initiated commitments)
    if (gameMode === 'host') {
      debugLog('COMMITMENTS', `📡 Broadcasting commitment state to guest for ${phase}`);
      this.broadcastStateToGuest();
      debugLog('COMMITMENTS', `✅ Commitment state broadcast complete`);
    }

    // For single-player mode, auto-complete AI commitment immediately (not async)
    if (playerId === 'player1' && currentState.gameMode === 'local' && !bothComplete) {
      debugLog('COMMITMENTS', '🤖 Single-player mode: Auto-completing AI commitment immediately');
      debugLog('SHIELD_CLICKS', '🤖 About to call handleAICommitment for AI auto-commit');
      // Trigger AI auto-completion through AIPhaseProcessor
      if (aiPhaseProcessor) {
        try {
          debugLog('SHIELD_CLICKS', '⏳ Calling handleAICommitment...');
          await this.handleAICommitment(phase, currentState);
          // After AI commits, both should be complete
          debugLog('COMMITMENTS', '✅ AI commitment completed successfully');
          debugLog('SHIELD_CLICKS', '✅ handleAICommitment returned successfully');

          // Recalculate bothComplete from fresh state after AI auto-commit
          const freshState = this.gameStateManager.getState();
          bothComplete = freshState.commitments[phase].player1.completed &&
                        freshState.commitments[phase].player2.completed;
          debugLog('COMMITMENTS', `🔄 Recalculated bothComplete after AI commit: ${bothComplete}`);
          debugLog('SHIELD_CLICKS', `🔄 Both players complete: ${bothComplete}`);
        } catch (error) {
          console.error('❌ AI commitment error:', error);
          debugLog('SHIELD_CLICKS', '❌ Error during AI commitment:', error);
          throw error; // Propagate error so player knows something went wrong
        }
      } else {
        debugLog('SHIELD_CLICKS', '⚠️ aiPhaseProcessor not available!');
      }
    }

    debugLog('SHIELD_CLICKS', '🏁 processCommitment about to return', { success: true, bothComplete });

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
   * Handle AI commitment for simultaneous phases
   * @param {string} phase - Phase name
   * @param {Object} currentState - Current game state
   */
  async handleAICommitment(phase, currentState) {
    try {
      debugLog('COMMITMENTS', `🤖 Processing AI commitment for phase: ${phase}`);

      let aiResult;
      switch(phase) {
        case 'droneSelection':
          aiResult = await aiPhaseProcessor.processDroneSelection();
          await this.processCommitment({
            playerId: 'player2',
            phase: 'droneSelection',
            actionData: { drones: aiResult }
          });
          break;

        case 'deckSelection':
          aiResult = await aiPhaseProcessor.processDeckSelection();
          // aiResult now contains { deck, drones, shipComponents }
          await this.processCommitment({
            playerId: 'player2',
            phase: 'deckSelection',
            actionData: {
              deck: aiResult.deck,
              drones: aiResult.drones,
              shipComponents: aiResult.shipComponents
            }
          });
          break;

        case 'placement':
          aiResult = await aiPhaseProcessor.processPlacement();
          await this.processCommitment({
            playerId: 'player2',
            phase: 'placement',
            actionData: { placedSections: aiResult }
          });
          break;

        case 'mandatoryDiscard':
          aiResult = await aiPhaseProcessor.executeMandatoryDiscardTurn(currentState);

          // Actually discard the cards from AI hand
          if (aiResult.cardsToDiscard.length > 0) {
            const aiState = currentState.player2;
            const newHand = aiState.hand.filter(card =>
              !aiResult.cardsToDiscard.some(discardCard => card.instanceId === discardCard.instanceId)
            );
            const newDiscardPile = [...aiState.discardPile, ...aiResult.cardsToDiscard];

            this.gameStateManager.updatePlayerState('player2', {
              hand: newHand,
              discardPile: newDiscardPile
            });

            debugLog('COMMITMENTS', `🤖 AI discarded ${aiResult.cardsToDiscard.length} cards for mandatory discard`);
          }

          await this.processCommitment({
            playerId: 'player2',
            phase: 'mandatoryDiscard',
            actionData: { discardedCards: aiResult.cardsToDiscard }
          });
          break;

        case 'optionalDiscard':
          aiResult = await aiPhaseProcessor.executeOptionalDiscardTurn(currentState);
          await this.processCommitment({
            playerId: 'player2',
            phase: 'optionalDiscard',
            actionData: { discardedCards: aiResult.cardsToDiscard }
          });
          break;

        case 'allocateShields':
          debugLog('SHIELD_CLICKS', '🤖 [HANDLE AI] About to call executeShieldAllocationTurn');
          // AI executes shield allocation
          await aiPhaseProcessor.executeShieldAllocationTurn(currentState);
          debugLog('SHIELD_CLICKS', '🤖 [HANDLE AI] executeShieldAllocationTurn completed, now committing');
          // After AI finishes allocating, commit the phase
          await this.processCommitment({
            playerId: 'player2',
            phase: 'allocateShields',
            actionData: { committed: true }
          });
          debugLog('SHIELD_CLICKS', '🤖 [HANDLE AI] AI commitment complete');
          break;

        case 'mandatoryDroneRemoval':
          aiResult = await aiPhaseProcessor.executeMandatoryDroneRemovalTurn(currentState);

          // Actually remove the drones from AI board
          if (aiResult.dronesToRemove.length > 0) {
            for (const droneToRemove of aiResult.dronesToRemove) {
              await this.processDestroyDrone({
                droneId: droneToRemove.id,
                playerId: 'player2'
              });
            }
            debugLog('COMMITMENTS', `🤖 AI removed ${aiResult.dronesToRemove.length} drones for mandatory drone removal`);
          }

          await this.processCommitment({
            playerId: 'player2',
            phase: 'mandatoryDroneRemoval',
            actionData: { removedDrones: aiResult.dronesToRemove }
          });
          break;

        case 'determineFirstPlayer':
          // AI automatically acknowledges first player determination with 1-second delay
          await new Promise(resolve => {
            setTimeout(async () => {
              await this.processCommitment({
                playerId: 'player2',
                phase: 'determineFirstPlayer',
                actionData: { acknowledged: true }
              });
              resolve();
            }, 1000);
          });
          break;

        default:
          console.warn(`⚠️ No AI handler for phase: ${phase}`);
      }

    } catch (error) {
      console.error('AI commitment error:', error);
    }
  }

  /**
   * Apply phase commitments to permanent game state
   * Transfers commitment data from temporary commitments object to actual game state fields
   * @param {string} phase - Phase name
   * @returns {Object} State updates to apply
   */
  applyPhaseCommitments(phase) {
    const currentState = this.gameStateManager.getState();
    const phaseCommitments = currentState.commitments[phase];

    if (!phaseCommitments) {
      console.warn(`⚠️ No commitments found for phase: ${phase}`);
      return {};
    }

    debugLog('COMMITMENTS', `📋 ActionProcessor: Applying ${phase} commitments to game state`, phaseCommitments);

    const stateUpdates = {};

    switch(phase) {
      case 'droneSelection':
        // Apply drone selections to player states
        if (phaseCommitments.player1?.drones) {
          const p1Drones = phaseCommitments.player1.drones;
          const p1Upgrades = currentState.player1?.appliedUpgrades || {};
          stateUpdates.player1 = {
            ...currentState.player1,
            activeDronePool: p1Drones,
            deployedDroneCounts: p1Drones.reduce((acc, drone) => {
              acc[drone.name] = 0;
              return acc;
            }, {}),
            droneAvailability: initializeDroneAvailability(p1Drones, p1Upgrades)
          };
        }
        if (phaseCommitments.player2?.drones) {
          const p2Drones = phaseCommitments.player2.drones;
          const p2Upgrades = currentState.player2?.appliedUpgrades || {};
          stateUpdates.player2 = {
            ...currentState.player2,
            activeDronePool: p2Drones,
            deployedDroneCounts: p2Drones.reduce((acc, drone) => {
              acc[drone.name] = 0;
              return acc;
            }, {}),
            droneAvailability: initializeDroneAvailability(p2Drones, p2Upgrades)
          };
        }
        debugLog('COMMITMENTS', '✅ Applied drone selections to player states');
        break;

      case 'deckSelection':
        // Apply deck selections to player states (cards, drones, and ship components)
        if (phaseCommitments.player1?.deck) {
          stateUpdates.player1 = {
            ...currentState.player1,
            deck: phaseCommitments.player1.deck,
            deckDronePool: phaseCommitments.player1.drones || [],  // Store 10 deck drones
            selectedShipComponents: phaseCommitments.player1.shipComponents || {},  // Store ship component selections
            discard: []
          };
        }
        if (phaseCommitments.player2?.deck) {
          stateUpdates.player2 = {
            ...currentState.player2,
            deck: phaseCommitments.player2.deck,
            deckDronePool: phaseCommitments.player2.drones || [],  // Store 10 deck drones
            selectedShipComponents: phaseCommitments.player2.shipComponents || {},  // Store ship component selections
            discard: []
          };
        }
        debugLog('COMMITMENTS', '✅ Applied deck selections (cards + drones + ship components) to player states');
        break;

      case 'placement':
        // Apply ship placements to top-level game state
        if (phaseCommitments.player1?.placedSections) {
          stateUpdates.placedSections = phaseCommitments.player1.placedSections;
        }
        if (phaseCommitments.player2?.placedSections) {
          stateUpdates.opponentPlacedSections = phaseCommitments.player2.placedSections;
        }
        debugLog('COMMITMENTS', '✅ Applied ship placements:', {
          player1: stateUpdates.placedSections,
          player2: stateUpdates.opponentPlacedSections
        });
        break;

      case 'determineFirstPlayer':
        // First player determination handled separately via processFirstPlayerDetermination
        debugLog('COMMITMENTS', '✅ First player determination (handled separately)');
        break;

      case 'mandatoryDiscard':
      case 'optionalDiscard':
        // Discard handled via card actions during commitment
        debugLog('COMMITMENTS', '✅ Discard commitments (handled via card actions)');
        break;

      case 'mandatoryDroneRemoval':
        // Drone removal handled via processDestroyDrone during commitment
        debugLog('COMMITMENTS', '✅ Mandatory drone removal (handled via processDestroyDrone)');
        break;

      case 'allocateShields':
        // Shield allocation handled separately
        debugLog('COMMITMENTS', '✅ Shield allocation (handled separately)');
        break;

      default:
        console.warn(`⚠️ No commitment application logic for phase: ${phase}`);
    }

    return stateUpdates;
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
    try {
      this.gameStateManager._updateContext = 'ActionProcessor';
      this.gameStateManager.setState({
        player1,
        player2
      });
    } finally {
      this.gameStateManager._updateContext = null;
    }

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

    // DEBUG: Log what was received from GameFlowManager
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

    // DEBUG: Log what's actually in the game state after setState
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
      try {
        this.gameStateManager._updateContext = 'ActionProcessor';
        this.gameStateManager.setState({ shieldsToAllocate });
      } finally {
        this.gameStateManager._updateContext = null;
      }
    }
    if (opponentShieldsToAllocate !== undefined) {
      try {
        this.gameStateManager._updateContext = 'ActionProcessor';
        this.gameStateManager.setState({ opponentShieldsToAllocate });
      } finally {
        this.gameStateManager._updateContext = null;
      }
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
      console.warn(`⚠️ Shield allocation failed: ${result.error}`);
      return result;
    }

    // Update player state
    this.gameStateManager.updatePlayerState(playerId, result.newPlayerState);

    // Update shields to allocate count
    try {
      this.gameStateManager._updateContext = 'ActionProcessor';
      this.gameStateManager.setState({
        [shieldsToAllocateKey]: result.newShieldsToAllocate
      });
    } finally {
      this.gameStateManager._updateContext = null;
    }

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
      console.warn(`⚠️ Shield reset failed: ${result.error}`);
      return result;
    }

    // Update player state
    this.gameStateManager.updatePlayerState(playerId, result.newPlayerState);

    // Update shields to allocate count
    const shieldsToAllocateKey = playerId === 'player1' ? 'shieldsToAllocate' : 'opponentShieldsToAllocate';
    try {
      this.gameStateManager._updateContext = 'ActionProcessor';
      this.gameStateManager.setState({
        [shieldsToAllocateKey]: result.newShieldsToAllocate
      });
    } finally {
      this.gameStateManager._updateContext = null;
    }

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
}

export default ActionProcessor;