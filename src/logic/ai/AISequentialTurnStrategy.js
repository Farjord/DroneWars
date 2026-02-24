// --- AI Sequential Turn Strategy ---
// Handles AI decisions for sequential turn phases: deployment, action, discard, removal, shields

import { debugLog } from '../../utils/debugLogger.js';
import SeededRandom from '../../utils/seededRandom.js';

/**
 * Build a standard pass action for the AI player.
 * @param {string} phase - Current turn phase
 * @param {Object} passInfo - Current pass state
 * @returns {Object} Action object for playerPass
 */
export function buildPassAction(phase, passInfo) {
  return {
    type: 'playerPass',
    payload: {
      playerId: 'player2',
      playerName: 'AI Player',
      turnPhase: phase,
      passInfo,
      opponentPlayerId: 'player1'
    }
  };
}

/**
 * Determine if AI should pass in the current phase.
 * @param {Object} gameState - Current game state
 * @param {string} phase - Current phase (deployment, action)
 * @returns {boolean} True if AI should pass
 */
export function shouldPass(gameState, phase) {
  if (gameState.passInfo && gameState.passInfo.player2Passed) {
    debugLog('AI_DECISIONS', '🤖 AI has already passed');
    return true;
  }
  return false;
}

/**
 * Execute AI turn for deployment phase.
 * @param {Object} gameState - Current game state
 * @param {Object} actionProcessor - ActionProcessor for executing actions
 * @param {Object} deps - { effectiveShipStatsWrapper, gameStateManager }
 * @returns {Promise<void>}
 */
export async function executeDeploymentTurn(gameState, actionProcessor, deps) {
  debugLog('AI_DECISIONS', '🤖 executeDeploymentTurn starting...');

  if (shouldPass(gameState, 'deployment')) {
    await actionProcessor.queueAction(buildPassAction('deployment', gameState.passInfo));
    return;
  }

  const { aiBrain } = await import('./aiLogic.js');
  const { gameEngine } = await import('../gameLogic.js');

  const aiDecision = aiBrain.handleOpponentTurn({
    player1: gameState.player1,
    player2: gameState.player2,
    turn: gameState.turn,
    placedSections: gameState.placedSections,
    opponentPlacedSections: gameState.opponentPlacedSections,
    getShipStatus: gameEngine.getShipStatus,
    calculateEffectiveShipStats: deps.effectiveShipStatsWrapper,
    gameStateManager: deps.gameStateManager,
    addLogEntry: (entry, debugSource, aiDecisionContext) => {
      deps.gameStateManager?.addLogEntry(entry, debugSource, aiDecisionContext);
    }
  });

  debugLog('AI_DECISIONS', '🤖 Executing deployment decision:', aiDecision);
  debugLog('AI_DEPLOYMENT', '🤖 AI decision made', {
    decisionType: aiDecision.type,
    droneName: aiDecision.payload?.droneToDeploy?.name,
    targetLane: aiDecision.payload?.targetLane,
    score: aiDecision.score,
    turnUsed: gameState.roundNumber,
    player2Energy: gameState.player2?.energy,
    player2Budget: gameState.player2?.deploymentBudget
  });

  if (aiDecision.type === 'pass') {
    await actionProcessor.queueAction(buildPassAction('deployment', gameState.passInfo));
  } else if (aiDecision.type === 'deploy') {
    const result = await actionProcessor.queueAction({
      type: 'deployment',
      payload: {
        droneData: aiDecision.payload.droneToDeploy,
        laneId: aiDecision.payload.targetLane,
        playerId: 'player2',
        turn: gameState.roundNumber
      }
    });

    if (result.success) {
      debugLog('AI_DEPLOYMENT', '✅ Deployment executed', {
        droneName: aiDecision.payload?.droneToDeploy?.name,
        targetLane: aiDecision.payload?.targetLane
      });
      await actionProcessor.queueAction({
        type: 'turnTransition',
        payload: { newPlayer: 'player1', reason: 'deploymentCompleted' }
      });
    } else {
      debugLog('AI_DEPLOYMENT', '❌ Deployment FAILED', {
        droneName: aiDecision.payload?.droneToDeploy?.name,
        error: result.error,
        reason: result.reason
      });
      // When deployment fails, pass to prevent infinite loop
      debugLog('AI_DEPLOYMENT', '🔄 Deployment failed - forcing AI to pass');
      await actionProcessor.queueAction(buildPassAction('deployment', gameState.passInfo));
    }
  }
}

/**
 * Execute AI turn for action phase.
 * @param {Object} gameState - Current game state
 * @param {Object} actionProcessor - ActionProcessor for executing actions
 * @param {Object} deps - { gameStateManager }
 * @returns {Promise<Object|null>} Result (may contain needsInterceptionDecision)
 */
export async function executeActionTurn(gameState, actionProcessor, deps) {
  debugLog('AI_DECISIONS', '🤖 executeActionTurn starting...');

  if (shouldPass(gameState, 'action')) {
    await actionProcessor.queueAction(buildPassAction('action', gameState.passInfo));
    return;
  }

  const { aiBrain } = await import('./aiLogic.js');
  const { gameEngine } = await import('../gameLogic.js');
  const TargetingRouter = (await import('../TargetingRouter.js')).default;

  const targetingRouter = new TargetingRouter();
  const getValidTargets = (actingPlayerId, source, definition, player1, player2) => {
    return targetingRouter.routeTargeting({ actingPlayerId, source, definition, player1, player2 });
  };

  const aiDecision = aiBrain.handleOpponentAction({
    player1: gameState.player1,
    player2: gameState.player2,
    placedSections: gameState.placedSections,
    opponentPlacedSections: gameState.opponentPlacedSections,
    getShipStatus: gameEngine.getShipStatus,
    getLaneOfDrone: gameEngine.getLaneOfDrone,
    getValidTargets,
    gameStateManager: deps.gameStateManager,
    addLogEntry: (entry, debugSource, aiDecisionContext) => {
      deps.gameStateManager?.addLogEntry(entry, debugSource, aiDecisionContext);
    }
  });

  debugLog('AI_DECISIONS', '🤖 Executing action decision:', aiDecision);

  if (aiDecision.type === 'pass') {
    await actionProcessor.queueAction(buildPassAction('action', gameState.passInfo));
    return null;
  } else {
    const result = await actionProcessor.queueAction({
      type: 'aiAction',
      payload: { aiDecision }
    });
    return result;
  }
}

/**
 * Execute AI turn for optional discard phase.
 * Handles both discard of excess cards and drawing to hand limit.
 * @param {Object} gameState - Current game state
 * @param {Object} gameDataService - GameDataService instance
 * @returns {Promise<Object>} Result with updated player state
 */
export async function executeOptionalDiscardTurn(gameState, gameDataService) {
  debugLog('AI_DECISIONS', '🤖 executeOptionalDiscardTurn starting...');

  const { gameEngine } = await import('../gameLogic.js');
  const aiState = gameState.player2;
  const opponentPlacedSections = gameState.opponentPlacedSections;

  if (!aiState.hand || aiState.hand.length === 0) {
    debugLog('AI_DECISIONS', '🤖 AI has no cards, auto-completing optional discard');
    return { type: 'optionalDiscard', cardsToDiscard: [], playerId: 'player2', updatedPlayerState: aiState };
  }

  const effectiveStats = gameDataService.getEffectiveShipStats(aiState, opponentPlacedSections);
  const handLimit = effectiveStats.totals.handLimit;

  let updatedAiState = { ...aiState };
  let cardsToDiscard = [];

  if (updatedAiState.hand.length > handLimit) {
    const excessCards = updatedAiState.hand.length - handLimit;
    cardsToDiscard = updatedAiState.hand.slice(0, excessCards);
    updatedAiState = {
      ...updatedAiState,
      hand: updatedAiState.hand.slice(excessCards),
      discardPile: [...updatedAiState.discardPile, ...cardsToDiscard]
    };
    debugLog('AI_DECISIONS', `🤖 AI discarding ${excessCards} excess cards to meet hand limit of ${handLimit}`);
  }

  updatedAiState = gameEngine.drawToHandLimit(updatedAiState, handLimit);
  const cardsDrawn = updatedAiState.hand.length - (aiState.hand.length - cardsToDiscard.length);
  if (cardsDrawn > 0) {
    debugLog('AI_DECISIONS', `🤖 AI drew ${cardsDrawn} cards to reach hand limit`);
  }

  return { type: 'optionalDiscard', cardsToDiscard, playerId: 'player2', updatedPlayerState: updatedAiState };
}

/**
 * Execute AI turn for mandatory discard phase.
 * Discards lowest-cost cards first, randomized within same cost.
 * @param {Object} gameState - Current game state
 * @param {Object} gameDataService - GameDataService instance
 * @returns {Promise<Object>} Result with cards to discard
 */
export async function executeMandatoryDiscardTurn(gameState, gameDataService) {
  debugLog('AI_DECISIONS', '🤖 executeMandatoryDiscardTurn starting...');

  const aiState = gameState.player2;
  const opponentPlacedSections = gameState.opponentPlacedSections;
  const effectiveStats = gameDataService.getEffectiveShipStats(aiState, opponentPlacedSections);
  const handLimit = effectiveStats.totals.handLimit;

  if (!aiState.hand || aiState.hand.length <= handLimit) {
    debugLog('AI_DECISIONS', '🤖 AI already at/below hand limit, auto-completing mandatory discard');
    return { type: 'mandatoryDiscard', cardsToDiscard: [], playerId: 'player2', updatedPlayerState: aiState };
  }

  const excessCards = aiState.hand.length - handLimit;
  let cardsToDiscard = [];

  // Discard lowest cost cards first, randomize within same cost
  const cardsByCost = aiState.hand.reduce((acc, card) => {
    if (!acc[card.cost]) acc[card.cost] = [];
    acc[card.cost].push(card);
    return acc;
  }, {});

  const sortedCosts = Object.keys(cardsByCost).map(Number).sort((a, b) => a - b);
  const rng = SeededRandom.fromGameState(gameState);
  for (const cost of sortedCosts) {
    cardsToDiscard.push(...rng.shuffle(cardsByCost[cost]));
    if (cardsToDiscard.length >= excessCards) break;
  }
  cardsToDiscard = cardsToDiscard.slice(0, excessCards);

  debugLog('AI_DECISIONS', `🤖 AI discarding ${cardsToDiscard.length} excess cards to meet hand limit`);
  return { type: 'mandatoryDiscard', cardsToDiscard, playerId: 'player2', updatedPlayerState: aiState };
}

/**
 * Execute AI turn for mandatory drone removal phase.
 * Removes cheapest drones from strongest lanes.
 * @param {Object} gameState - Current game state
 * @param {Object} gameDataService - GameDataService instance
 * @returns {Promise<Object>} Result with drones to remove
 */
export async function executeMandatoryDroneRemovalTurn(gameState, gameDataService) {
  debugLog('AI_DECISIONS', '🤖 executeMandatoryDroneRemovalTurn starting...');

  const aiState = gameState.player2;
  const opponentPlacedSections = gameState.opponentPlacedSections;
  const effectiveStats = gameDataService.getEffectiveShipStats(aiState, opponentPlacedSections);
  const droneLimit = effectiveStats.totals.cpuLimit;

  const totalDrones = Object.values(aiState.dronesOnBoard || {}).flat().filter(d => !d.isToken).length;

  if (totalDrones <= droneLimit) {
    debugLog('AI_DECISIONS', '🤖 AI already at/below drone limit, auto-completing mandatory drone removal');
    return { type: 'mandatoryDroneRemoval', dronesToRemove: [], playerId: 'player2', updatedPlayerState: aiState };
  }

  const excessDrones = totalDrones - droneLimit;
  const opponentState = gameState.player1;

  const calculateLanePower = (drones, lane) => {
    return drones.reduce((sum, drone) => {
      const stats = gameDataService.getEffectiveStats(drone, lane);
      return sum + (stats.attack || 0) + (stats.hull || 0);
    }, 0);
  };

  const laneScores = {
    lane1: calculateLanePower(aiState.dronesOnBoard.lane1 || [], 'lane1') -
           calculateLanePower(opponentState.dronesOnBoard.lane1 || [], 'lane1'),
    lane2: calculateLanePower(aiState.dronesOnBoard.lane2 || [], 'lane2') -
           calculateLanePower(opponentState.dronesOnBoard.lane2 || [], 'lane2'),
    lane3: calculateLanePower(aiState.dronesOnBoard.lane3 || [], 'lane3') -
           calculateLanePower(opponentState.dronesOnBoard.lane3 || [], 'lane3')
  };

  const allDrones = [];
  Object.entries(aiState.dronesOnBoard || {}).forEach(([lane, drones]) => {
    drones.filter(drone => !drone.isToken).forEach(drone => {
      allDrones.push({ ...drone, lane, laneScore: laneScores[lane] });
    });
  });

  // Remove cheapest drones from winning lanes first
  allDrones.sort((a, b) => {
    if (b.laneScore !== a.laneScore) return b.laneScore - a.laneScore;
    return a.class - b.class;
  });

  const dronesToRemove = allDrones.slice(0, excessDrones);
  debugLog('AI_DECISIONS', `🤖 AI removing ${dronesToRemove.length} excess drones to meet drone limit`);
  return { type: 'mandatoryDroneRemoval', dronesToRemove, playerId: 'player2', updatedPlayerState: aiState };
}

/**
 * Execute AI shield allocation — distributes shields evenly across placed sections.
 * @param {Object} gameState - Current game state
 * @param {Object} actionProcessor - ActionProcessor for shield allocation
 * @returns {Promise<void>}
 */
export async function executeShieldAllocationTurn(gameState, actionProcessor) {
  debugLog('AI_DECISIONS', '🤖 executeShieldAllocationTurn starting...');

  const aiPlacedSections = gameState.opponentPlacedSections;
  const shieldsToAllocate = gameState.opponentShieldsToAllocate || 0;

  if (shieldsToAllocate === 0 || aiPlacedSections.length === 0) {
    debugLog('AI_DECISIONS', '🤖 AI has no shields to allocate or no sections');
    return;
  }

  debugLog('AI_DECISIONS', `🤖 AI distributing ${shieldsToAllocate} shields across ${aiPlacedSections.length} sections`);

  let remainingShields = shieldsToAllocate;
  let currentSectionIndex = 0;

  while (remainingShields > 0) {
    const sectionName = aiPlacedSections[currentSectionIndex];
    // Use direct call instead of queueAction to avoid deadlock (we're already inside a queued action)
    await actionProcessor.processAddShield({ sectionName, playerId: 'player2' });
    remainingShields--;
    currentSectionIndex = (currentSectionIndex + 1) % aiPlacedSections.length;
  }

  debugLog('AI_DECISIONS', '✅ AI shield allocation complete');
}
