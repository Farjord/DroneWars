// --- Quick Deploy Executor ---
// Executes the quick deploy sequence: deploy player drones interleaved with AI responses.
// Flow: Player deploys drone → ON_DEPLOY triggers → AI deploys one drone → repeat
// This ensures ON_DEPLOY effects (like Scanner's MARK_RANDOM_ENEMY) see correct board state.

import fullDroneCollection from '../../data/droneData.js';
import { debugLog } from '../../utils/debugLogger.js';

class QuickDeployExecutor {
  /**
   * @param {Object} gameStateManager - For reading/writing game state
   * @param {Object} actionProcessor - For AI deployment callbacks
   * @param {Object} tacticalMapStateManager - For clearing run-state pending flag
   */
  constructor(gameStateManager, actionProcessor, tacticalMapStateManager) {
    this.gameStateManager = gameStateManager;
    this.actionProcessor = actionProcessor;
    this.tacticalMapStateManager = tacticalMapStateManager;
  }

  /**
   * Execute quick deploy — deploy player's drones with ON_DEPLOY effects and interleaved AI response
   * @param {Object} quickDeploy - Quick deploy template with placements array and deploymentOrder
   */
  async execute(quickDeploy) {
    debugLog('QUICK_DEPLOY', '⚡ Executing quick deploy:', quickDeploy.name);

    try {
      const { default: DeploymentProcessor } = await import('../../logic/deployment/DeploymentProcessor.js');
      const deploymentProcessor = new DeploymentProcessor();

      const laneIdMap = { 0: 'lane1', 1: 'lane2', 2: 'lane3' };
      const order = quickDeploy.deploymentOrder || quickDeploy.placements.map((_, i) => i);

      debugLog('QUICK_DEPLOY', `📋 Deployment order: [${order.join(', ')}]`);

      const logCallback = (entry) => this.gameStateManager.addLogEntry(entry);
      const turn = 1; // Quick deploy is always turn 1

      for (const placementIndex of order) {
        const placement = quickDeploy.placements[placementIndex];
        if (!placement) {
          debugLog('QUICK_DEPLOY', `Invalid placement index: ${placementIndex}`);
          continue;
        }

        const droneData = fullDroneCollection.find(d => d.name === placement.droneName);
        if (!droneData) {
          debugLog('QUICK_DEPLOY', `Drone not found: ${placement.droneName}`);
          continue;
        }

        const laneId = laneIdMap[placement.lane];

        // Get FRESH state for each deployment (so AI sees previous deployments)
        const currentState = this.gameStateManager.getState();
        let playerState = JSON.parse(JSON.stringify(currentState.player1));
        let opponentState = JSON.parse(JSON.stringify(currentState.player2));

        const placedSections = {
          player1: currentState.placedSections,
          player2: currentState.opponentPlacedSections
        };

        debugLog('QUICK_DEPLOY', `  Deploying ${droneData.name} to ${laneId} (placement index ${placementIndex})`);

        const result = deploymentProcessor.executeDeployment(
          droneData,
          laneId,
          turn,
          playerState,
          opponentState,
          placedSections,
          logCallback,
          'player1'
        );

        if (result.success) {
          this.gameStateManager.setState({
            player1: result.newPlayerState,
            player2: result.opponentState || opponentState
          });

          debugLog('QUICK_DEPLOY', `  ✅ Deployed ${droneData.name} successfully`);

          // AI deploys ONE drone in response
          if (this.actionProcessor?.aiPhaseProcessor?.executeSingleDeployment) {
            await this.actionProcessor.aiPhaseProcessor.executeSingleDeployment();
          }
        } else {
          debugLog('QUICK_DEPLOY', `Failed to deploy ${droneData.name}: ${result.error}`);
        }
      }

      debugLog('QUICK_DEPLOY', '✅ Player quick deploy complete, AI finishing deployment');

      // AI deploys any remaining drones
      if (this.actionProcessor?.aiPhaseProcessor) {
        await this.actionProcessor.aiPhaseProcessor.finishDeploymentPhase();
      }

      // Clear pending quick deploy from game state
      this.gameStateManager.setState({ pendingQuickDeploy: null });

      // Clear pending quick deploy from run state
      const runState = this.tacticalMapStateManager.getState();
      if (runState?.pendingQuickDeploy) {
        this.tacticalMapStateManager.setState({ pendingQuickDeploy: null });
      }

      debugLog('QUICK_DEPLOY', '✅ Quick deploy execution complete');
    } catch (error) {
      debugLog('QUICK_DEPLOY', 'Error during execution:', error);
      this.gameStateManager.setState({ pendingQuickDeploy: null });
    }
  }
}

export default QuickDeployExecutor;
