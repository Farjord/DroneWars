// ========================================
// AI PHASE PROCESSOR
// ========================================
// Handles AI processing for simultaneous phases in single-player mode
// Provides instant AI decisions for SimultaneousActionManager commitment system

import {
  processDeckSelection as _processDeckSelection,
  processDroneSelection as _processDroneSelection,
  processPlacement as _processPlacement,
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
import GameDataService from '../services/GameDataService.js';
import { debugLog } from '../utils/debugLogger.js';

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

    // Initialization guards and cleanup tracking
    this.isInitialized = false;
    this.stateSubscriptionCleanup = null;
  }

  /**
   * Initialize with game data and AI personality
   * @param {Object} aiPersonalities - Available AI personalities
   * @param {Array} dronePool - Available drones for selection
   * @param {Object} currentPersonality - Current AI personality being used
   * @param {Object} actionProcessor - ActionProcessor instance for executing actions
   * @param {Object} gameStateManager - GameStateManager instance for state updates
   */
  initialize(aiPersonalities, dronePool, currentPersonality, actionProcessor = null, gameStateManager = null) {
    // Check if already initialized
    if (this.isInitialized) {
      debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor already initialized, skipping...');
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

    // Initialize GameDataService for centralized data computation
    if (gameStateManager && !this.gameDataService) {
      this.gameDataService = GameDataService.getInstance(gameStateManager);

      // Create wrapper function for ship stats compatibility with aiLogic.js
      this.effectiveShipStatsWrapper = (playerState, placedSections) => {
        return this.gameDataService.getEffectiveShipStats(playerState, placedSections);
      };
    }

    // Subscribe to game state changes for AI turn detection
    if (gameStateManager) {
      this.stateSubscriptionCleanup = gameStateManager.subscribe((event) => {
        this.checkForAITurn(event.state);
      });
    }

    this.isInitialized = true;

    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor initialized with personality:', currentPersonality?.name || 'Default');
    if (actionProcessor) {
      debugLog('AI_DECISIONS', '🔗 AIPhaseProcessor connected to ActionProcessor for execution');
    }
    if (gameStateManager) {
      debugLog('AI_DECISIONS', '🔗 AIPhaseProcessor subscribed to GameStateManager for self-triggering');
    }
  }

  /**
   * Cleanup AI processor resources
   * Clears timers and unsubscribes from state changes
   */
  cleanup() {
    debugLog('AI_DECISIONS', '🧹 AIPhaseProcessor: Cleaning up resources');

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

    debugLog('AI_DECISIONS', '✅ AIPhaseProcessor: Cleanup complete');
  }

  // --- Simultaneous Phase Delegation ---

  async processDroneSelection(aiPersonality = null) {
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

  async processPlacement(aiPersonality = null) {
    return _processPlacement(aiPersonality || this.currentAIPersonality);
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
      gameStateManager: this.gameStateManager
    });
  }

  async executeActionTurn(gameState) {
    return _executeActionTurn(gameState, this.actionProcessor, {
      gameStateManager: this.gameStateManager
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
  checkForAITurn(state) {
    // Don't process if AI is already taking a turn or in wrong mode
    if (this.isProcessing || state.gameMode !== 'local') {
      return;
    }

    // Don't process if game has ended
    if (state.winner || state.gameStage === 'gameOver') {
      return;
    }

    // Only trigger for sequential phases where AI needs to act
    const sequentialPhases = ['deployment', 'action'];
    if (!sequentialPhases.includes(state.turnPhase)) {
      return;
    }

    // Only trigger if it's AI's turn (AI is always player2)
    if (state.currentPlayer !== 'player2') {
      return;
    }

    // Check if AI has already passed this phase
    if (state.passInfo && state.passInfo.player2Passed) {
      return;
    }

    debugLog('AI_DECISIONS', `⏰ AIPhaseProcessor: Scheduling AI turn for ${state.turnPhase} phase`);

    // Clear any existing timer and schedule new turn
    clearTimeout(this.turnTimer);
    this.turnTimer = setTimeout(() => {
      this.executeTurn();  // No state parameter - will fetch fresh state
    }, 1500); // 1.5 second delay
  }

  /**
   * Execute AI turn for the current phase
   * Always fetches fresh state to avoid stale state issues
   */
  async executeTurn() {
    if (this.isProcessing) {
      debugLog('AI_DECISIONS', '⚠️ AIPhaseProcessor: Already processing a turn, skipping');
      return;
    }

    // Fetch fresh state - never trust captured state from delayed callbacks
    const state = this.gameStateManager.getState();

    // Validate it's still AI's turn (state may have changed during delay)
    if (state.currentPlayer !== 'player2') {
      debugLog('AI_DECISIONS', '⚠️ AIPhaseProcessor: Turn changed before execution, cancelling AI turn');
      return;
    }

    // Validate AI hasn't passed
    if (state.passInfo && state.passInfo.player2Passed) {
      debugLog('AI_DECISIONS', '⚠️ AIPhaseProcessor: AI has already passed, cancelling turn');
      return;
    }

    // Validate phase is still sequential
    const sequentialPhases = ['deployment', 'action'];
    if (!sequentialPhases.includes(state.turnPhase)) {
      debugLog('AI_DECISIONS', '⚠️ AIPhaseProcessor: Phase changed to non-sequential, cancelling turn');
      return;
    }

    // Check if animations are blocking AI actions
    const phaseAnimationQueue = this.gameStateManager?.gameFlowManager?.phaseAnimationQueue;
    const animationManager = this.actionProcessor?.animationManager;

    // Block AI if phase announcements are playing
    if (phaseAnimationQueue && phaseAnimationQueue.isPlaying()) {
      debugLog('AI_DECISIONS', '⏸️ AIPhaseProcessor: Phase animation playing, rescheduling AI turn');
      // Reschedule after animations complete
      this.turnTimer = setTimeout(() => {
        this.executeTurn();
      }, 500); // Check again in 0.5s
      return;
    }

    // Block AI if action animations are blocking
    if (animationManager && animationManager.isBlocking) {
      debugLog('AI_DECISIONS', '⏸️ AIPhaseProcessor: Action animation blocking, rescheduling AI turn');
      // Reschedule after animations complete
      this.turnTimer = setTimeout(() => {
        this.executeTurn();
      }, 500); // Check again in 0.5s
      return;
    }

    this.isProcessing = true;

    try {
      debugLog('AI_DECISIONS', `🤖 AIPhaseProcessor: Executing AI turn for ${state.turnPhase} phase`);

      let result;
      if (state.turnPhase === 'deployment') {
        result = await this.executeDeploymentTurn(state);
      } else if (state.turnPhase === 'action') {
        result = await this.executeActionTurn(state);
      } else {
        debugLog('AI_DECISIONS', `⚠️ AIPhaseProcessor: Unknown sequential phase: ${state.turnPhase}`);
        return;
      }

      // Check if result indicates human interception decision needed
      if (result?.needsInterceptionDecision) {
        debugLog('AI_DECISIONS', '🛡️ AIPhaseProcessor: AI attack needs human interception decision, pausing turn loop');

        // ActionProcessor already set interceptionPending state, just pause AI turn loop
        // Turn will resume after interception is resolved (state cleared)
        this.isProcessing = false;
        return; // Don't schedule another AI turn yet
      }

      // Check if AI should continue taking turns
      const currentState = this.gameStateManager.getState();
      if (currentState.currentPlayer === 'player2' &&
          currentState.passInfo &&
          !currentState.passInfo.player2Passed) {
        // AI should continue if:
        // 1. Human has passed but AI hasn't, OR
        // 2. AI played a goAgain card and still has the turn
        debugLog('AI_DECISIONS', '🔄 AIPhaseProcessor: AI continues taking turns (either human passed or goAgain card played)');
        // Schedule another turn
        setTimeout(() => {
          this.checkForAITurn(currentState);
        }, 100); // Small delay to let state settle
      }

    } catch (error) {
      debugLog('AI_DECISIONS', '❌ AIPhaseProcessor: Error executing turn:', error);
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

    debugLog('AI_DECISIONS', '🤖 AIPhaseProcessor.makeInterceptionDecision called:', {
      interceptorCount: interceptors?.length || 0,
      target: attackDetails.target?.name,
      attacker: attackDetails.attacker?.name,
      targetType: attackDetails.targetType
    });

    const { aiBrain } = await import('../logic/aiLogic.js');

    const result = aiBrain.makeInterceptionDecision(
      interceptors,
      attackDetails.attacker,  // The attacker drone (was incorrectly labeled as target before)
      attackDetails,           // Full attack context
      this.gameDataService,    // GameDataService for stat calculations
      this.gameStateManager    // GameStateManager for opportunity cost analysis
    );

    debugLog('AI_DECISIONS', '🤖 AI interception decision:', {
      willIntercept: !!result.interceptor,
      interceptorName: result.interceptor?.name
    });

    // Log interception decision to Action Log with Decision Matrix
    debugLog('AI_DECISIONS', '📝 [INTERCEPTION LOG] Preparing log entry:', {
      hasGameStateManager: !!this.gameStateManager,
      willIntercept: !!result.interceptor,
      decisionContextLength: result.decisionContext?.length || 0,
      attackerName: attackDetails.attacker?.name,
      targetType: attackDetails.targetType,
      targetName: attackDetails.target?.name || attackDetails.target?.id
    });

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

      debugLog('AI_DECISIONS', '📋 [INTERCEPTION LOG] Log entry data:', logEntry);

      this.gameStateManager.addLogEntry(logEntry, 'aiInterception', result.decisionContext);

      debugLog('AI_DECISIONS', '✅ [INTERCEPTION LOG] Log entry added successfully');
    } else {
      debugLog('AI_DECISIONS', '❌ [INTERCEPTION LOG] gameStateManager is null/undefined - cannot add log entry!');
    }

    return result;
  }

  /**
   * Execute a single AI deployment in response to player's quick deploy
   * Returns result if deployment succeeded, null if AI passed or no drones available
   * @returns {Object|null} Deployment result or null
   */
  async executeSingleDeployment() {
    debugLog('QUICK_DEPLOY', '🤖 AI evaluating single deployment...');

    if (!this.gameStateManager) {
      debugLog('QUICK_DEPLOY', '[AI Single Deploy] GameStateManager not available');
      return null;
    }

    const gameState = this.gameStateManager.getState();

    // Check if AI should pass
    if (this.shouldPass(gameState, 'deployment')) {
      debugLog('QUICK_DEPLOY', '🤖 AI passes (shouldPass returned true)');
      return null;
    }

    const { aiBrain } = await import('../logic/aiLogic.js');
    const { gameEngine } = await import('../logic/gameLogic.js');
    const { default: DeploymentProcessor } = await import('../logic/deployment/DeploymentProcessor.js');

    const addLogEntry = (entry, source, context) => {
      this.gameStateManager.addLogEntry(entry, source, context);
    };

    const aiDecision = aiBrain.handleOpponentTurn({
      player1: gameState.player1,
      player2: gameState.player2,
      turn: gameState.turn,
      placedSections: gameState.placedSections,
      opponentPlacedSections: gameState.opponentPlacedSections,
      getShipStatus: gameEngine.getShipStatus,
      calculateEffectiveShipStats: this.effectiveShipStatsWrapper,
      gameStateManager: this.gameStateManager,
      addLogEntry  // ← Logs AI deployment decisions
    });

    debugLog('QUICK_DEPLOY', '🤖 AI decision:', aiDecision?.type);

    if (aiDecision.type !== 'deploy') {
      debugLog('QUICK_DEPLOY', '🤖 AI decides not to deploy');
      return null;
    }

    // Execute deployment (DeploymentProcessor handles ON_DEPLOY)
    const { droneToDeploy, targetLane } = aiDecision.payload;
    debugLog('QUICK_DEPLOY', `🤖 AI deploying ${droneToDeploy?.name} to ${targetLane}`);

    const deploymentProcessor = new DeploymentProcessor();
    let player2State = JSON.parse(JSON.stringify(gameState.player2));
    const placedSections = {
      player1: gameState.placedSections,
      player2: gameState.opponentPlacedSections
    };

    // Log callback for DeploymentProcessor (logs drone placement details)
    const logCallback = (entry) => this.gameStateManager.addLogEntry(entry);

    const result = deploymentProcessor.executeDeployment(
      droneToDeploy,
      targetLane,
      gameState.roundNumber || 1,
      player2State,
      gameState.player1,
      placedSections,
      logCallback,  // ← Logs AI drone placements
      'player2'
    );

    if (result.success) {
      // Update game state with new AI state and any opponent changes from ON_DEPLOY
      this.gameStateManager.setState({
        player2: result.newPlayerState,
        player1: result.opponentState || gameState.player1
      });
      debugLog('QUICK_DEPLOY', `🤖 AI deployed ${droneToDeploy?.name} successfully`);
      return { success: true, drone: result.deployedDrone };
    }

    debugLog('QUICK_DEPLOY', `🤖 AI deployment failed: ${result.error}`);
    return null;
  }

  /**
   * Finish deployment phase by deploying all remaining AI drones
   * Called after player's quick deploy is complete
   */
  async finishDeploymentPhase() {
    debugLog('QUICK_DEPLOY', '🤖 AI finishing deployment phase...');

    let maxIterations = 10;  // Safety limit
    let deploymentsCount = 0;

    while (maxIterations-- > 0) {
      const result = await this.executeSingleDeployment();
      if (!result) break;
      deploymentsCount++;
    }

    debugLog('QUICK_DEPLOY', `🤖 AI finished deployment phase (${deploymentsCount} additional drones deployed)`);
  }
}

// Create singleton instance
const aiPhaseProcessor = new AIPhaseProcessor();

export default aiPhaseProcessor;