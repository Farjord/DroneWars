// --- AI Quick Deploy Handler ---
// Handles AI reactive deployment during quick deploy (interleaved with player deployments)

import { debugLog } from '../../utils/debugLogger.js';

/**
 * Execute a single AI deployment during quick deploy.
 * Uses DeploymentProcessor directly (not action queue) for silent interleaved deployment.
 *
 * @param {Object} gameStateManager - GameStateManager instance
 * @param {Function} effectiveShipStatsWrapper - Ship stats calculation wrapper
 * @returns {Promise<{success: boolean, drone: Object}|null>} Result or null if AI passes/fails
 */
export async function executeSingleDeployment(gameStateManager, effectiveShipStatsWrapper) {
  debugLog('QUICK_DEPLOY', '🤖 AI evaluating single deployment...');

  if (!gameStateManager) {
    debugLog('QUICK_DEPLOY', '[AI Single Deploy] GameStateManager not available');
    return null;
  }

  const gameState = gameStateManager.getState();

  // Check if AI has already passed
  if (gameState.passInfo && gameState.passInfo.player2Passed) {
    debugLog('QUICK_DEPLOY', '🤖 AI passes (already passed)');
    return null;
  }

  const { aiBrain } = await import('../aiLogic.js');
  const { gameEngine } = await import('../gameLogic.js');
  const { default: DeploymentProcessor } = await import('../deployment/DeploymentProcessor.js');

  const addLogEntry = (entry, source, context) => {
    gameStateManager.addLogEntry(entry, source, context);
  };

  const aiDecision = aiBrain.handleOpponentTurn({
    player1: gameState.player1,
    player2: gameState.player2,
    turn: gameState.turn,
    placedSections: gameState.placedSections,
    opponentPlacedSections: gameState.opponentPlacedSections,
    getShipStatus: gameEngine.getShipStatus,
    calculateEffectiveShipStats: effectiveShipStatsWrapper,
    gameStateManager,
    addLogEntry
  });

  debugLog('QUICK_DEPLOY', '🤖 AI decision:', aiDecision?.type);

  if (aiDecision.type !== 'deploy') {
    debugLog('QUICK_DEPLOY', '🤖 AI decides not to deploy');
    return null;
  }

  const { droneToDeploy, targetLane } = aiDecision.payload;
  debugLog('QUICK_DEPLOY', `🤖 AI deploying ${droneToDeploy?.name} to ${targetLane}`);

  const deploymentProcessor = new DeploymentProcessor();
  const player2State = JSON.parse(JSON.stringify(gameState.player2));
  const placedSections = {
    player1: gameState.placedSections,
    player2: gameState.opponentPlacedSections
  };

  const logCallback = (entry) => gameStateManager.addLogEntry(entry);

  const result = deploymentProcessor.executeDeployment(
    droneToDeploy,
    targetLane,
    gameState.roundNumber || 1,
    player2State,
    gameState.player1,
    placedSections,
    logCallback,
    'player2'
  );

  if (result.success) {
    gameStateManager.setState({
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
 * Finish deployment phase by deploying all remaining AI drones.
 * Loops executeSingleDeployment up to 10 times.
 *
 * @param {Object} gameStateManager - GameStateManager instance
 * @param {Function} effectiveShipStatsWrapper - Ship stats calculation wrapper
 * @returns {Promise<void>}
 */
export async function finishDeploymentPhase(gameStateManager, effectiveShipStatsWrapper) {
  debugLog('QUICK_DEPLOY', '🤖 AI finishing deployment phase...');

  let maxIterations = 10;
  let deploymentsCount = 0;

  while (maxIterations-- > 0) {
    const result = await executeSingleDeployment(gameStateManager, effectiveShipStatsWrapper);
    if (!result) break;
    deploymentsCount++;
  }

  debugLog('QUICK_DEPLOY', `🤖 AI finished deployment phase (${deploymentsCount} additional drones deployed)`);
}
