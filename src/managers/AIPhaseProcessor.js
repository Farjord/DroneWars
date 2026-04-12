// ========================================
// AI PHASE PROCESSOR
// ========================================
// Handles AI processing for simultaneous phases in single-player mode
// Provides instant AI decisions for SimultaneousActionManager commitment system

import {
  processDeckSelection as _processDeckSelection,
  processDroneSelection as _processDroneSelection,
  extractDronesFromDeck as _extractDronesFromDeck,
  randomlySelectDrones as _randomlySelectDrones
} from '../logic/ai/AISimultaneousPhaseStrategy.js';
import {
  executeDeploymentTurn as _executeDeploymentTurn,
  executeActionTurn as _executeActionTurn,
  executeOptionalDiscardTurn as _executeOptionalDiscardTurn,
  executeMandatoryDiscardTurn as _executeMandatoryDiscardTurn,
  executeMandatoryDroneRemovalTurn as _executeMandatoryDroneRemovalTurn,
  executeShieldAllocationTurn as _executeShieldAllocationTurn,
  shouldPass as _shouldPass,
  buildPassAction
} from '../logic/ai/AISequentialTurnStrategy.js';
import {
  executeSingleDeployment as _executeSingleDeployment,
  finishDeploymentPhase as _finishDeploymentPhase
} from '../logic/ai/AIQuickDeployHandler.js';
import GameDataService from '../services/GameDataService.js';
import { debugLog } from '../utils/debugLogger.js';
import { isSequentialPhase } from '../logic/phase/phaseDisplayUtils.js';

/** Cosmetic delay before AI acts — animations are already done by RESPONSE_CYCLE_COMPLETE */
const AI_TURN_COSMETIC_DELAY_MS = 800;

/** Interval between retries when animations are still blocking at turn start */
const BLOCKING_RETRY_INTERVAL_MS = 500;

/** Max retries before aborting (BLOCKING_MAX_RETRIES × BLOCKING_RETRY_INTERVAL_MS = 10s safety cap) */
const BLOCKING_MAX_RETRIES = 20;

/**
 * AIPhaseProcessor - Handles AI completion of simultaneous phases
 */
class AIPhaseProcessor {
  constructor() {
    this.aiPersonalities = null;
    this.dronePool = null;
    this.currentAIPersonality = null;
    this.gameDataService = null;

    // AI turn management
    this.isProcessing = false;
    this.turnTimer = null;
    this._blockingRetryCount = 0;

    // Initialization guards and cleanup tracking
    this.isInitialized = false;
    this.stateSubscriptionCleanup = null;
  }

  /**
   * Check if AI is enabled (player2 is AI-controlled)
   */
  _isAIEnabled() {
    const gameServer = this.gameStateManager?.gameServer;
    return gameServer?.isPlayerAI('player2') ?? true;
  }

  /**
   * Initialize with game data and AI personality
   * @param {Object} aiPersonalities - Available AI personalities
   * @param {Array} dronePool - Available drones for selection
   * @param {Object} currentPersonality - Current AI personality being used
   * @param {Object} actionProcessor - ActionProcessor instance for executing actions
   * @param {Object} gameStateManager - GameStateManager instance for state updates
   */
  initialize(aiPersonalities, dronePool, currentPersonality, actionProcessor = null, gameStateManager = null, { isAnimationBlocking } = {}) {
    // Check if already initialized
    if (this.isInitialized) {
      return;
    }

    // Clean up any previous subscription
    if (this.stateSubscriptionCleanup) {
      this.stateSubscriptionCleanup();
      this.stateSubscriptionCleanup = null;
    }

    this.aiPersonalities = aiPersonalities;
    this.dronePool = dronePool;
    this.currentAIPersonality = currentPersonality;
    this.actionProcessor = actionProcessor;
    this.gameStateManager = gameStateManager;
    this.isAnimationBlocking = isAnimationBlocking || (() => false);

    // Initialize GameDataService for centralized data computation
    if (gameStateManager && !this.gameDataService) {
      this.gameDataService = GameDataService.getInstance(gameStateManager);

      // Create wrapper function for ship stats compatibility with aiLogic.js
      this.effectiveShipStatsWrapper = (playerState, placedSections) => {
        return this.gameDataService.getEffectiveShipStats(playerState, placedSections);
      };
    }

    // Subscribe to game state changes for AI turn detection
    // Only react to RESPONSE_CYCLE_COMPLETE — guarantees all animations are done
    if (gameStateManager) {
      this.stateSubscriptionCleanup = gameStateManager.subscribe((event) => {
        if (event.type === 'RESPONSE_CYCLE_COMPLETE') {
          debugLog('AI_TURN_TRACE', '[AI-00a] RESPONSE_CYCLE_COMPLETE received');
          this.checkForAITurn(event.state, 'RESPONSE_CYCLE_COMPLETE');
        }
      });
    }

    this.isInitialized = true;
  }

  /**
   * Cleanup AI processor resources
   * Clears timers and unsubscribes from state changes
   */
  cleanup() {
    // Clear any pending AI turn timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    // Unsubscribe from game state changes
    if (this.stateSubscriptionCleanup) {
      this.stateSubscriptionCleanup();
      this.stateSubscriptionCleanup = null;
    }

    // Reset processing state
    this.isProcessing = false;
    this.isInitialized = false;
    this._lastAI01Key = null;
    this._blockingRetryCount = 0;
  }

  // --- Simultaneous Phase Delegation ---

  async processDroneSelection() {
    return _processDroneSelection(this.gameStateManager, this.dronePool);
  }

  extractDronesFromDeck(droneNames) {
    return _extractDronesFromDeck(droneNames, this.dronePool);
  }

  randomlySelectDrones(availableDrones, count) {
    return _randomlySelectDrones(availableDrones, count, this.gameStateManager);
  }

  async processDeckSelection(aiPersonality = null) {
    return _processDeckSelection(this.gameStateManager, aiPersonality || this.currentAIPersonality);
  }

  // --- Sequential Turn Delegation ---

  _buildPassAction(phase, passInfo) {
    return buildPassAction(phase, passInfo);
  }

  shouldPass(gameState, phase) {
    return _shouldPass(gameState, phase);
  }

  async executeDeploymentTurn(gameState) {
    return _executeDeploymentTurn(gameState, this.actionProcessor, {
      effectiveShipStatsWrapper: this.effectiveShipStatsWrapper,
      gameStateManager: this.gameStateManager,
      gameEngine: this.gameStateManager?.gameEngine
    });
  }

  async executeActionTurn(gameState) {
    return _executeActionTurn(gameState, this.actionProcessor, {
      gameStateManager: this.gameStateManager,
      gameEngine: this.gameStateManager?.gameEngine
    });
  }

  async executeOptionalDiscardTurn(gameState) {
    return _executeOptionalDiscardTurn(gameState, this.gameDataService);
  }

  async executeMandatoryDiscardTurn(gameState) {
    return _executeMandatoryDiscardTurn(gameState, this.gameDataService);
  }

  async executeMandatoryDroneRemovalTurn(gameState) {
    return _executeMandatoryDroneRemovalTurn(gameState, this.gameDataService);
  }

  async executeShieldAllocationTurn(gameState) {
    return _executeShieldAllocationTurn(gameState, this.actionProcessor);
  }

  /**
   * Check if AI should take a turn based on current game state
   * @param {Object} state - Current game state
   */
  checkForAITurn(state, source = 'signal') {
    // Determine skip reason (if any)
    let skipReason = null;
    if (this.isProcessing) skipReason = 'already processing';
    else if (!this._isAIEnabled()) skipReason = 'AI not enabled';
    else if (state.winner || state.gameStage === 'gameOver') skipReason = 'game over';
    else if (!isSequentialPhase(state.turnPhase)) skipReason = `non-sequential phase (${state.turnPhase})`;
    else if (state.currentPlayer !== 'player2') skipReason = `not AI turn (${state.currentPlayer})`;
    else if (state.passInfo?.player2Passed) skipReason = 'AI already passed';
    else if (state.interceptionPending) skipReason = 'interception pending';

    if (skipReason) {
      debugLog('AI_TURN_TRACE', `[AI-01-SKIP] ${skipReason}`);
      return;
    }

    // Clear any existing timer and schedule new turn
    clearTimeout(this.turnTimer);

    // Deduplicate [AI-01] log — only log when phase/round actually changes
    const turnKey = `${state.turnPhase}-${state.roundNumber}-${state.currentPlayer}`;
    if (turnKey !== this._lastAI01Key) {
      this._lastAI01Key = turnKey;
      debugLog('AI_TURN_TRACE', `[AI-01] Turn detected | source=${source}, phase=${state.turnPhase}, currentPlayer=${state.currentPlayer}, round=${state.roundNumber}`);
    }

    this.turnTimer = setTimeout(() => {
      this.executeTurn();  // No state parameter - will fetch fresh state
    }, AI_TURN_COSMETIC_DELAY_MS);
  }

  /**
   * Execute AI turn for the current phase
   * Always fetches fresh state to avoid stale state issues
   */
  async executeTurn() {
    if (this.isProcessing) {
      return;
    }

    // Fetch fresh state - never trust captured state from delayed callbacks
    const state = this.gameStateManager.getState();

    // Validate it's still AI's turn (state may have changed during delay)
    if (state.currentPlayer !== 'player2') {
      return;
    }

    // Validate AI hasn't passed
    if (state.passInfo && state.passInfo.player2Passed) {
      return;
    }

    // Validate phase is still sequential
    if (!isSequentialPhase(state.turnPhase)) {
      return;
    }

    // Wait-and-retry guard — animations may still be playing due to race condition
    // between RESPONSE_CYCLE_COMPLETE and the phase announcement queue
    if (this.isAnimationBlocking()) {
      this._blockingRetryCount += 1;
      if (this._blockingRetryCount > BLOCKING_MAX_RETRIES) {
        debugLog('AI_TURN_TRACE', '[AI-ABORT] Animation blocking exceeded max retries — aborting');
        this._blockingRetryCount = 0;
        return;
      }
      debugLog('AI_TURN_TRACE', `[AI-WAIT] Animations blocking — retry ${this._blockingRetryCount}/${BLOCKING_MAX_RETRIES}`);
      this.turnTimer = setTimeout(() => this.executeTurn(), BLOCKING_RETRY_INTERVAL_MS);
      return;
    }
    this._blockingRetryCount = 0;

    this.isProcessing = true;
    const p2 = state.player2;

    try {
      debugLog('AI_TURN_TRACE', `[AI-02] Turn executing | phase=${state.turnPhase}, energy=${p2.energy}, handSize=${p2.hand?.length ?? 0}, readyDrones=${Object.values(p2.dronesOnBoard).flat().filter(d => !d.isExhausted).length}`);

      let result;
      if (state.turnPhase === 'deployment') {
        result = await this.executeDeploymentTurn(state);
      } else if (state.turnPhase === 'action') {
        result = await this.executeActionTurn(state);
      } else {
        return;
      }

      // Check if result indicates human interception decision needed
      if (result?.needsInterceptionDecision) {
        debugLog('AI_TURN_TRACE', `[AI-09] Result | success=true, needsInterception=true`);
        // ActionProcessor already set interceptionPending state, just pause AI turn loop
        // Turn will resume after interception is resolved (state cleared)
        this.isProcessing = false;
        return; // Don't schedule another AI turn yet
      }

      debugLog('AI_TURN_TRACE', `[AI-09] Result | success=${result?.success !== false}, needsInterception=false`);

      // Check if AI should continue taking turns
      const currentState = this.gameStateManager.getState();
      const continues = currentState.currentPlayer === 'player2' &&
          currentState.passInfo &&
          !currentState.passInfo.player2Passed;

      debugLog('AI_TURN_TRACE', `[AI-10] Turn complete | continues=${continues}, reason=${continues ? 'humanPassedOrGoAgain' : 'turnOver'}`);

      if (continues) {
        // Direct continuation — routeAction already awaited all animations
        this.turnTimer = setTimeout(() => {
          this.executeTurn();
        }, AI_TURN_COSMETIC_DELAY_MS);
      }

    } catch (error) {
      debugLog('AI_TURN_TRACE', `[AI-09] Result | success=false, error=${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Make AI interception decision
   * Called by ActionProcessor when AI is the defender
   *
   * @param {Array} interceptors - Valid interceptors (pre-filtered for speed/keywords)
   * @param {Object} attackDetails - Attack details including attacker and target
   * @returns {Promise<Object>} - { interceptor: drone | null }
   */
  async makeInterceptionDecision(interceptors, attackDetails) {
    if (!this.isInitialized) {
      throw new Error('AIPhaseProcessor not initialized');
    }

    debugLog('AI_TURN_TRACE', `[AI-INT-1] Interception requested | interceptorCount=${interceptors?.length || 0}, attacker=${attackDetails.attacker?.name}, target=${attackDetails.target?.name}, targetType=${attackDetails.targetType}`);

    const { aiBrain } = await import('../logic/ai/aiLogic.js');

    const result = aiBrain.makeInterceptionDecision(
      interceptors,
      attackDetails.attacker,  // The attacker drone (was incorrectly labeled as target before)
      attackDetails,           // Full attack context
      this.gameDataService,    // GameDataService for stat calculations
      this.gameStateManager    // GameStateManager for opportunity cost analysis
    );

    debugLog('AI_TURN_TRACE', `[AI-INT-2] Decision | willIntercept=${!!result.interceptor}, interceptor=${result.interceptor?.name || 'declined'}`);

    if (this.gameStateManager) {
      const targetName = attackDetails.targetType === 'section'
        ? attackDetails.target.name || attackDetails.target.id
        : attackDetails.target.name;

      const logEntry = {
        player: 'AI Player',
        actionType: result.interceptor ? 'INTERCEPT' : 'DECLINE_INTERCEPT',
        source: attackDetails.attacker.name,
        target: result.interceptor ? result.interceptor.name : targetName,
        outcome: result.interceptor
          ? `Intercepted ${attackDetails.attacker.name} attacking ${targetName} with ${result.interceptor.name}`
          : `Declined to intercept ${attackDetails.attacker.name} attacking ${targetName}`
      };

      this.gameStateManager.addLogEntry(logEntry, 'aiInterception', result.decisionContext);
    }

    return result;
  }

  // --- Quick Deploy Delegation ---

  async executeSingleDeployment() {
    return _executeSingleDeployment(this.gameStateManager, this.effectiveShipStatsWrapper);
  }

  async finishDeploymentPhase() {
    return _finishDeploymentPhase(this.gameStateManager, this.effectiveShipStatsWrapper);
  }
}

// Create singleton instance
const aiPhaseProcessor = new AIPhaseProcessor();

export default aiPhaseProcessor;