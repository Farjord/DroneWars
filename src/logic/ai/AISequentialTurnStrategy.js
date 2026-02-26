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
  if (shouldPass(gameState, 'deployment')) {
    await actionProcessor.queueAction(buildPassAction('deployment', gameState.passInfo));
    return;
  }

  const { aiBrain } = await import('./aiLogic.js');
  const { gameEngine } = await import('../gameLogic.js');

  debugLog('AI_TURN_TRACE', `[AI-03] Deployment: eval | energy=${gameState.player2.energy}, budget=${gameState.turn === 1 ? gameState.player2.initialDeploymentBudget : gameState.player2.deploymentBudget}, poolSize=${gameState.player2.activeDronePool?.length ?? 0}`);

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

  if (aiDecision.type === 'pass') {
    debugLog('AI_TURN_TRACE', `[AI-06] Decision | type=pass, reason=noHighImpactPlays`);
    await actionProcessor.queueAction(buildPassAction('deployment', gameState.passInfo));
  } else if (aiDecision.type === 'deploy') {
    debugLog('AI_TURN_TRACE', `[AI-06] Decision | type=deploy, drone=${aiDecision.payload.droneToDeploy?.name}, lane=${aiDecision.payload.targetLane}`);
    debugLog('AI_TURN_TRACE', `[AI-05] Dispatching | deployment action`);

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
      debugLog('AI_TURN_TRACE', `[AI-06] Result | success=true`);
      await actionProcessor.queueAction({
        type: 'turnTransition',
        payload: { newPlayer: 'player1', reason: 'deploymentCompleted' }
      });
    } else {
      debugLog('AI_TURN_TRACE', `[AI-06] Result | success=false, error=${result.error || result.reason}`);
      // When deployment fails, pass to prevent infinite loop
      await actionProcessor.queueAction(buildPassAction('deployment', gameState.passInfo));
    }
  }

  debugLog('AI_TURN_TRACE', `[AI-07] Turn complete | switching to player1`);
}

/**
 * Execute AI turn for action phase.
 * @param {Object} gameState - Current game state
 * @param {Object} actionProcessor - ActionProcessor for executing actions
 * @param {Object} deps - { gameStateManager }
 * @returns {Promise<Object|null>} Result (may contain needsInterceptionDecision)
 */
export async function executeActionTurn(gameState, actionProcessor, deps) {
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

  const p2 = gameState.player2;
  const readyDrones = Object.values(p2.dronesOnBoard).flat().filter(d => !d.isExhausted);
  debugLog('AI_TURN_TRACE', `[AI-03] Action: generating | playableCards=${p2.hand?.filter(c => p2.energy >= c.cost).length ?? 0}, readyAttackers=${readyDrones.length}, movableDrones=${readyDrones.length}`);

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
  const { gameEngine } = await import('../gameLogic.js');
  const aiState = gameState.player2;
  const opponentPlacedSections = gameState.opponentPlacedSections;

  debugLog('AI_TURN_TRACE', `[AI-02] Evaluating | phase=optionalDiscard, handSize=${aiState.hand?.length ?? 0}`);

  if (!aiState.hand || aiState.hand.length === 0) {
    debugLog('AI_TURN_TRACE', `[AI-03] Decision | noCards, auto-completing`);
    debugLog('AI_TURN_TRACE', `[AI-04] Complete | discarded=0, drawn=0`);
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
  }

  updatedAiState = gameEngine.drawToHandLimit(updatedAiState, handLimit);
  const cardsDrawn = updatedAiState.hand.length - (aiState.hand.length - cardsToDiscard.length);

  debugLog('AI_TURN_TRACE', `[AI-03] Decision | discarded=${cardsToDiscard.length}, drawn=${cardsDrawn}, handLimit=${handLimit}`);
  debugLog('AI_TURN_TRACE', `[AI-04] Complete | finalHandSize=${updatedAiState.hand.length}`);

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
  const aiState = gameState.player2;
  const opponentPlacedSections = gameState.opponentPlacedSections;
  const effectiveStats = gameDataService.getEffectiveShipStats(aiState, opponentPlacedSections);
  const handLimit = effectiveStats.totals.handLimit;

  debugLog('AI_TURN_TRACE', `[AI-02] Evaluating | phase=mandatoryDiscard, handSize=${aiState.hand?.length ?? 0}, handLimit=${handLimit}`);

  if (!aiState.hand || aiState.hand.length <= handLimit) {
    debugLog('AI_TURN_TRACE', `[AI-03] Decision | atOrBelowLimit, auto-completing`);
    debugLog('AI_TURN_TRACE', `[AI-04] Complete | discarded=0`);
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

  debugLog('AI_TURN_TRACE', `[AI-03] Decision | discarding=${cardsToDiscard.length}, lowestCostFirst`);
  debugLog('AI_TURN_TRACE', `[AI-04] Complete | discarded=${cardsToDiscard.length}`);
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
  const aiState = gameState.player2;
  const opponentPlacedSections = gameState.opponentPlacedSections;
  const effectiveStats = gameDataService.getEffectiveShipStats(aiState, opponentPlacedSections);
  const droneLimit = effectiveStats.totals.cpuLimit;

  const totalDrones = Object.values(aiState.dronesOnBoard || {}).flat().filter(d => !d.isToken).length;

  debugLog('AI_TURN_TRACE', `[AI-02] Evaluating | phase=mandatoryDroneRemoval, totalDrones=${totalDrones}, droneLimit=${droneLimit}`);

  if (totalDrones <= droneLimit) {
    debugLog('AI_TURN_TRACE', `[AI-03] Decision | atOrBelowLimit, auto-completing`);
    debugLog('AI_TURN_TRACE', `[AI-04] Complete | removed=0`);
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
  debugLog('AI_TURN_TRACE', `[AI-03] Decision | removing=${dronesToRemove.length}, cheapestFromWinningLanes`);
  debugLog('AI_TURN_TRACE', `[AI-04] Complete | removed=${dronesToRemove.length}`);
  return { type: 'mandatoryDroneRemoval', dronesToRemove, playerId: 'player2', updatedPlayerState: aiState };
}

/**
 * Execute AI shield allocation — distributes shields evenly across placed sections.
 * @param {Object} gameState - Current game state
 * @param {Object} actionProcessor - ActionProcessor for shield allocation
 * @returns {Promise<void>}
 */
export async function executeShieldAllocationTurn(gameState, actionProcessor) {
  const aiPlacedSections = gameState.opponentPlacedSections;
  const shieldsToAllocate = gameState.opponentShieldsToAllocate || 0;

  debugLog('AI_TURN_TRACE', `[AI-02] Evaluating | phase=shieldAllocation, shieldsToAllocate=${shieldsToAllocate}, sections=${aiPlacedSections.length}`);

  if (shieldsToAllocate === 0 || aiPlacedSections.length === 0) {
    debugLog('AI_TURN_TRACE', `[AI-03] Decision | noShieldsOrSections, skipping`);
    debugLog('AI_TURN_TRACE', `[AI-04] Complete | allocated=0`);
    return;
  }

  debugLog('AI_TURN_TRACE', `[AI-03] Decision | distributing=${shieldsToAllocate}, evenlyAcross=${aiPlacedSections.length}sections`);

  let remainingShields = shieldsToAllocate;
  let currentSectionIndex = 0;

  while (remainingShields > 0) {
    const sectionName = aiPlacedSections[currentSectionIndex];
    // Use direct call instead of queueAction to avoid deadlock (we're already inside a queued action)
    await actionProcessor.processAddShield({ sectionName, playerId: 'player2' });
    remainingShields--;
    currentSectionIndex = (currentSectionIndex + 1) % aiPlacedSections.length;
  }

  debugLog('AI_TURN_TRACE', `[AI-04] Complete | allocated=${shieldsToAllocate}`);
}
