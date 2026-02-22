// --- Round Initialization Processor ---
// Executes the atomic round initialization sequence (Steps 1-5):
// Step 1: Game stage transition & round number init
// Step 2: First player determination
// Step 3: Energy & resource reset (stats, drones, budgets, shields)
// Step 3b: ON_ROUND_START triggered abilities
// Step 3b2: Momentum award (lane control bonus)
// Step 3c: Drone rebuild progress
// Step 4: Card draw
// Step 5: Quick deploy (round 1 only)
//
// Stateful — reads and mutates game state via gameStateManager and actionProcessor.
// Returns { quickDeployExecuted } so the caller can update flow-control flags.

import GameDataService from '../services/GameDataService.js';
import RoundManager from '../logic/round/RoundManager.js';
import EffectRouter from '../logic/EffectRouter.js';
import { processRebuildProgress } from '../logic/availability/DroneAvailabilityManager.js';
import { LaneControlCalculator } from '../logic/combat/LaneControlCalculator.js';
import { debugLog } from '../utils/debugLogger.js';

class RoundInitializationProcessor {
  constructor(gameStateManager, actionProcessor) {
    this.gameStateManager = gameStateManager;
    this.actionProcessor = actionProcessor;
  }

  /**
   * Execute the full round initialization sequence (Steps 1-5).
   *
   * @param {Object} options
   * @param {boolean} options.isRoundLoop - Whether game is already in roundLoop stage
   * @param {function} [options.executeQuickDeploy] - Async callback for quick deploy execution
   * @returns {Promise<{ gameStageTransitioned: boolean, quickDeployExecuted: boolean }>}
   */
  async process({ isRoundLoop, executeQuickDeploy } = {}) {
    const currentState = this.gameStateManager.getState();
    let gameStageTransitioned = false;

    // ========================================
    // STEP 1: Game Stage Transition & Round Number Initialization
    // ========================================
    if (!isRoundLoop) {
      gameStageTransitioned = true;
      debugLog('PHASE_TRANSITIONS', '✅ Game stage transitioned to roundLoop');
    }

    if (currentState.roundNumber === 0) {
      this.gameStateManager.setState({
        roundNumber: 1,
        turn: 1
      });
      debugLog('PHASE_TRANSITIONS', '✅ Round number initialized to 1 (first gameplay round)');
    }

    // ========================================
    // STEP 2: Determine First Player
    // ========================================
    debugLog('PHASE_TRANSITIONS', '🎯 Step 2: Determining first player');
    const firstPlayerResult = await this.actionProcessor.processFirstPlayerDetermination();
    debugLog('PHASE_TRANSITIONS', '✅ First player determination completed:', firstPlayerResult);

    // ========================================
    // STEP 3: Energy & Resource Reset
    // ========================================
    debugLog('PHASE_TRANSITIONS', '⚡ Step 3: Resetting energy and resources');

    const currentGameState = this.gameStateManager.getState();
    const gameDataService = GameDataService.getInstance(this.gameStateManager);

    const player1EffectiveStats = gameDataService.getEffectiveShipStats(
      currentGameState.player1,
      currentGameState.placedSections
    );
    const player2EffectiveStats = gameDataService.getEffectiveShipStats(
      currentGameState.player2,
      currentGameState.opponentPlacedSections
    );

    // Ready drones (unexhaust, restore shields, remove temporary mods)
    const allPlacedSections = {
      player1: currentGameState.placedSections,
      player2: currentGameState.opponentPlacedSections
    };

    const readiedPlayer1 = RoundManager.readyDronesAndRestoreShields(
      currentGameState.player1,
      currentGameState.player2,
      allPlacedSections
    );
    const readiedPlayer2 = RoundManager.readyDronesAndRestoreShields(
      currentGameState.player2,
      currentGameState.player1,
      allPlacedSections
    );

    // Apply energy and deployment budgets
    // Round 1: initialDeploymentBudget, Round 2+: deploymentBudget
    const currentRoundNumber = this.gameStateManager.get('roundNumber');

    const updatedPlayer1 = {
      ...readiedPlayer1,
      energy: player1EffectiveStats.totals.energyPerTurn,
      initialDeploymentBudget: currentRoundNumber === 1 ? player1EffectiveStats.totals.initialDeployment : 0,
      deploymentBudget: currentRoundNumber === 1 ? 0 : player1EffectiveStats.totals.deploymentBudget
    };

    const updatedPlayer2 = {
      ...readiedPlayer2,
      energy: player2EffectiveStats.totals.energyPerTurn,
      initialDeploymentBudget: currentRoundNumber === 1 ? player2EffectiveStats.totals.initialDeployment : 0,
      deploymentBudget: currentRoundNumber === 1 ? 0 : player2EffectiveStats.totals.deploymentBudget
    };

    debugLog('PHASE_TRANSITIONS', `✅ Energy reset complete - Round ${currentRoundNumber}`, {
      player1: {
        energy: updatedPlayer1.energy,
        initialDeploymentBudget: updatedPlayer1.initialDeploymentBudget,
        deploymentBudget: updatedPlayer1.deploymentBudget
      },
      player2: {
        energy: updatedPlayer2.energy,
        initialDeploymentBudget: updatedPlayer2.initialDeploymentBudget,
        deploymentBudget: updatedPlayer2.deploymentBudget
      }
    });

    // Calculate shields to allocate (Round 2+ only)
    const shieldsToAllocate = currentRoundNumber >= 2 ? player1EffectiveStats.totals.shieldsPerTurn : 0;
    const opponentShieldsToAllocate = currentRoundNumber >= 2 ? player2EffectiveStats.totals.shieldsPerTurn : 0;

    // Update player states via ActionProcessor
    await this.actionProcessor.queueAction({
      type: 'energyReset',
      payload: {
        player1: updatedPlayer1,
        player2: updatedPlayer2,
        shieldsToAllocate,
        opponentShieldsToAllocate,
        roundNumber: currentRoundNumber
      }
    });

    // ========================================
    // STEP 3b: ON_ROUND_START Triggered Abilities
    // ========================================
    debugLog('PHASE_TRANSITIONS', '🎯 Step 3b: Processing ON_ROUND_START triggers');

    const preTriggersState = this.gameStateManager.getState();
    const effectRouter = new EffectRouter();

    const roundStartResult = RoundManager.processRoundStartTriggers(
      preTriggersState.player1,
      preTriggersState.player2,
      allPlacedSections,
      effectRouter
    );

    if (roundStartResult) {
      await this.actionProcessor.queueAction({
        type: 'roundStartTriggers',
        payload: {
          player1: roundStartResult.player1,
          player2: roundStartResult.player2
        }
      });

      debugLog('PHASE_TRANSITIONS', '✅ ON_ROUND_START triggers processed', {
        animationEventsCount: roundStartResult.animationEvents?.length || 0
      });
    }

    // ========================================
    // STEP 3b2: Momentum Award (Lane Control Bonus)
    // ========================================
    // +1 momentum to player controlling most lanes. No ties, no round 1, cap at 4.
    const momentumRoundNumber = this.gameStateManager.get('roundNumber');
    if (momentumRoundNumber >= 2) {
      debugLog('PHASE_TRANSITIONS', '🚀 Step 3b2: Processing momentum award');

      const postTriggersState = this.gameStateManager.getState();
      const laneControl = LaneControlCalculator.calculateLaneControl(
        postTriggersState.player1,
        postTriggersState.player2
      );

      let player1Lanes = 0;
      let player2Lanes = 0;
      ['lane1', 'lane2', 'lane3'].forEach(lane => {
        if (laneControl[lane] === 'player1') player1Lanes++;
        if (laneControl[lane] === 'player2') player2Lanes++;
      });

      debugLog('PHASE_TRANSITIONS', '📊 Lane control status:', {
        player1Lanes,
        player2Lanes,
        laneControl
      });

      let momentumUpdates = {};
      const MOMENTUM_CAP = 4;

      if (player1Lanes > player2Lanes) {
        const newMomentum = Math.min((postTriggersState.player1.momentum || 0) + 1, MOMENTUM_CAP);
        momentumUpdates.player1 = { ...postTriggersState.player1, momentum: newMomentum };
        debugLog('PHASE_TRANSITIONS', '🎯 Player 1 awarded +1 momentum', {
          oldMomentum: postTriggersState.player1.momentum || 0,
          newMomentum,
          lanesControlled: player1Lanes
        });
      } else if (player2Lanes > player1Lanes) {
        const newMomentum = Math.min((postTriggersState.player2.momentum || 0) + 1, MOMENTUM_CAP);
        momentumUpdates.player2 = { ...postTriggersState.player2, momentum: newMomentum };
        debugLog('PHASE_TRANSITIONS', '🎯 Player 2 awarded +1 momentum', {
          oldMomentum: postTriggersState.player2.momentum || 0,
          newMomentum,
          lanesControlled: player2Lanes
        });
      } else {
        debugLog('PHASE_TRANSITIONS', '⚖️ Lane control tied - no momentum awarded');
      }

      if (momentumUpdates.player1 || momentumUpdates.player2) {
        await this.actionProcessor.queueAction({
          type: 'momentumAward',
          payload: momentumUpdates
        });
        debugLog('PHASE_TRANSITIONS', '✅ Momentum award complete');
      }
    } else {
      debugLog('PHASE_TRANSITIONS', '⏭️ Skipping momentum award (Round 1)');
    }

    // ========================================
    // STEP 3c: Drone Rebuild Progress
    // ========================================
    debugLog('PHASE_TRANSITIONS', '🔧 Step 3c: Processing drone rebuild progress');

    const preRebuildState = this.gameStateManager.getState();
    let rebuildUpdates = {};

    if (preRebuildState.player1?.droneAvailability) {
      const newAvailability = processRebuildProgress(preRebuildState.player1.droneAvailability);
      rebuildUpdates.player1 = {
        ...preRebuildState.player1,
        droneAvailability: newAvailability
      };
      debugLog('PHASE_TRANSITIONS', '   ↳ Player 1 rebuild progress processed');
    }

    if (preRebuildState.player2?.droneAvailability) {
      const newAvailability = processRebuildProgress(preRebuildState.player2.droneAvailability);
      rebuildUpdates.player2 = {
        ...preRebuildState.player2,
        droneAvailability: newAvailability
      };
      debugLog('PHASE_TRANSITIONS', '   ↳ Player 2 rebuild progress processed');
    }

    if (rebuildUpdates.player1 || rebuildUpdates.player2) {
      await this.actionProcessor.queueAction({
        type: 'rebuildProgress',
        payload: rebuildUpdates
      });
      debugLog('PHASE_TRANSITIONS', '✅ Drone rebuild progress complete');
    }

    // ========================================
    // STEP 4: Card Draw
    // ========================================
    debugLog('PHASE_TRANSITIONS', '🃏 Step 4: Drawing cards');

    const updatedGameState = this.gameStateManager.getState();

    const { performAutomaticDraw } = await import('../utils/cardDrawUtils.js');
    const drawResult = performAutomaticDraw(updatedGameState, this.gameStateManager);

    await this.actionProcessor.queueAction({
      type: 'draw',
      payload: {
        player1: drawResult.player1,
        player2: drawResult.player2
      }
    });

    debugLog('PHASE_TRANSITIONS', '✅ Card draw complete');

    // ========================================
    // STEP 5: Quick Deploy (Round 1 only)
    // ========================================
    let quickDeployExecuted = false;

    if (currentRoundNumber === 1 && executeQuickDeploy) {
      const quickDeployState = this.gameStateManager.getState();
      const pendingQuickDeployId = quickDeployState.pendingQuickDeploy;

      if (pendingQuickDeployId) {
        debugLog('PHASE_TRANSITIONS', '⚡ Step 5: Executing quick deploy');

        const quickDeploy = quickDeployState.quickDeployments?.find(
          qd => qd.id === pendingQuickDeployId
        );

        if (quickDeploy) {
          quickDeployExecuted = true;
          await executeQuickDeploy(quickDeploy);
          debugLog('PHASE_TRANSITIONS', '✅ Quick deploy execution complete');
        } else {
          debugLog('QUICK_DEPLOY', 'Template not found for ID:', pendingQuickDeployId);
          this.gameStateManager.setState({ pendingQuickDeploy: null });
        }
      }
    }

    return { gameStageTransitioned, quickDeployExecuted };
  }
}

export default RoundInitializationProcessor;
