// Phase & turn transition strategies: processTurnTransition, processPhaseTransition,
// processRoundStart, processFirstPlayerDetermination
// Extracted from ActionProcessor.js — handles phase/turn/round lifecycle.

import { gameEngine } from '../gameLogic.js';
import RoundManager from '../round/RoundManager.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * Process turn transition
 * @param {Object} payload - { newPhase, newPlayer }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processTurnTransition(payload, ctx) {
  const { newPhase, newPlayer } = payload;

  debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] Processing turn transition:`, { newPhase, newPlayer });

  const currentState = ctx.getState();
  debugLog('CONSUMPTION_DEBUG', '🟢 [8] processTurnTransition entered', { newPlayer, currentPlayer: currentState.currentPlayer, passInfo: currentState.passInfo });
  debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] Current state before transition:`, {
    turnPhase: currentState.turnPhase,
    currentPlayer: currentState.currentPlayer,
    turn: currentState.turn
  });

  const transitionResult = gameEngine.calculateTurnTransition(
    currentState.currentPlayer,
    currentState.passInfo,
    currentState.turnPhase,
    currentState.winner
  );

  if (newPhase) {
    debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] Setting new phase: ${newPhase}`);
    ctx.setTurnPhase(newPhase);
  }

  if (newPlayer) {
    const freshState = ctx.getState();
    let actualNewPlayer = newPlayer;

    if (freshState.passInfo && freshState.passInfo[`${newPlayer}Passed`]) {
      actualNewPlayer = freshState.currentPlayer;
      debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] ${newPlayer} has passed, keeping turn with ${actualNewPlayer}`);
    } else {
      debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] Setting new player: ${actualNewPlayer}`);
    }

    const previousPlayer = freshState.currentPlayer;
    if (actualNewPlayer !== previousPlayer) {
      ctx.setState({ actionsTakenThisTurn: 0 }, 'TURN_TRANSITION_RESET');
      debugLog('PHASE_TRANSITIONS', `[TURN TRANSITION DEBUG] Reset actionsTakenThisTurn for new player: ${actualNewPlayer}`);
    }

    ctx.setCurrentPlayer(actualNewPlayer);
    debugLog('CONSUMPTION_DEBUG', '🟢 [9] processTurnTransition: setCurrentPlayer called', { actualNewPlayer });
  }

  const newState = ctx.getState();
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
 * @param {Object} payload - { newPhase, resetPassInfo, guestAnnouncementOnly }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processPhaseTransition(payload, ctx) {
  const { newPhase, resetPassInfo = true, guestAnnouncementOnly = false } = payload;

  const currentState = ctx.getState();

  if (currentState.turnPhase === newPhase) {
    debugLog('PHASE_TRANSITIONS', `[PHASE TRANSITION DEBUG] Skipping redundant transition to same phase: ${newPhase}`);
    return { success: true, message: 'Already in phase' };
  }

  debugLog('PHASE_TRANSITIONS', `[PHASE TRANSITION DEBUG] Processing phase transition to: ${newPhase}`);

  // Guest announcement-only pseudo-phase
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

    const phaseAnimationQueue = ctx.getPhaseAnimationQueue();
    if (phaseTextMap[newPhase] && phaseAnimationQueue) {
      const phaseText = phaseTextMap[newPhase];
      const subtitle = newPhase === 'roundInitialization'
        ? 'Drawing Cards, Gaining Energy, Resetting Drones...'
        : newPhase === 'actionComplete'
        ? 'Transitioning to Next Round'
        : null;

      phaseAnimationQueue.queueAnimation(newPhase, phaseText, subtitle, 'AP:guest_pseudo:1789');
      debugLog('PHASE_MANAGER', `✅ [GUEST] Announcement queued for pseudo-phase: ${newPhase}`);
    }

    return { success: true, message: 'Guest announcement queued' };
  }

  debugLog('PHASE_TRANSITIONS', `[PLACEMENT DATA DEBUG] BEFORE transition to ${newPhase}:`, {
    currentPhase: currentState.turnPhase,
    placedSections: currentState.placedSections,
    opponentPlacedSections: currentState.opponentPlacedSections
  });

  const stateUpdates = {};

  // Initialize currentPlayer for sequential phases
  const sequentialPhases = ['deployment', 'action'];
  if (sequentialPhases.includes(newPhase)) {
    stateUpdates.currentPlayer = currentState.firstPlayerOfRound;
    debugLog('PHASE_TRANSITIONS', `[PHASE TRANSITION DEBUG] Sequential phase: Setting currentPlayer to firstPlayerOfRound: ${currentState.firstPlayerOfRound}`);
  }

  // Handle phase-specific initialization
  if (newPhase === 'allocateShields') {
    const localPlayerId = ctx.getLocalPlayerId();
    const localPlayerState = currentState[localPlayerId];
    const gameDataService = ctx.getGameDataService();
    const effectiveStats = gameDataService.getEffectiveShipStats(localPlayerState, ctx.getLocalPlacedSections());
    const shieldsPerTurn = effectiveStats.totals.shieldsPerTurn;
    stateUpdates.shieldsToAllocate = shieldsPerTurn;
    debugLog('PHASE_TRANSITIONS', `[SHIELD ALLOCATION DEBUG] Initialized shields to allocate: ${shieldsPerTurn}`);
  } else if (newPhase === 'placement') {
    stateUpdates.unplacedSections = ['bridge', 'powerCell', 'droneControlHub'];
    stateUpdates.placedSections = Array(3).fill(null);
    stateUpdates.opponentPlacedSections = Array(3).fill(null);
    debugLog('PHASE_TRANSITIONS', `[PLACEMENT DEBUG] Initialized placement phase`);
  }

  stateUpdates.turnPhase = newPhase;
  ctx.setState(stateUpdates);

  // Reset commitments for the new phase
  ctx.clearPhaseCommitments(newPhase);

  if (resetPassInfo) {
    ctx.setPassInfo({
      firstPasser: null,
      player1Passed: false,
      player2Passed: false
    });
  }

  // Show phase announcement for round phases
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

  if (phaseTextMap[newPhase]) {
    debugLog('PHASE_TRANSITIONS', `🎬 [PHASE ANNOUNCEMENT] Queueing announcement for: ${newPhase}`);

    const phaseText = phaseTextMap[newPhase];
    const subtitle = newPhase === 'roundInitialization'
      ? 'Drawing Cards, Gaining Energy, Resetting Drones...'
      : newPhase === 'actionComplete'
      ? 'Transitioning to Next Round'
      : null;

    const phaseAnimationQueue = ctx.getPhaseAnimationQueue();
    debugLog('PHASE_TRANSITIONS', `🎬 [PHASE ANNOUNCEMENT] Attempting to queue`, {
      phase: newPhase,
      hasQueue: !!phaseAnimationQueue,
      gameMode: currentState.gameMode
    });

    if (phaseAnimationQueue) {
      phaseAnimationQueue.queueAnimation(newPhase, phaseText, subtitle, 'AP:host_transition:1892');
      debugLog('PHASE_TRANSITIONS', `✅ [PHASE ANNOUNCEMENT] Successfully queued: ${newPhase}`);
      debugLog('PHASE_TRANSITIONS', `🎬 [PHASE ANNOUNCEMENT] Animation queued for: ${newPhase}`);
    } else {
      debugLog('PHASE_TRANSITIONS', `❌ [PHASE ANNOUNCEMENT] Queue not available for: ${newPhase}`);
    }

    debugLog('PHASE_TRANSITIONS', `🎬 [PHASE ANNOUNCEMENT] Animation queued for: ${newPhase}`);
  }

  debugLog('PHASE_TRANSITIONS', `[PHASE TRANSITION DEBUG] Phase transition complete: ${currentState.turnPhase} → ${newPhase}`);

  const finalState = ctx.getState();
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
 * @param {Object} payload - { newTurn, newPhase, firstPlayer }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processRoundStart(payload, ctx) {
  const { newTurn, newPhase = 'deployment', firstPlayer } = payload;

  debugLog('PHASE_TRANSITIONS', `[ROUND START DEBUG] Processing round start for turn: ${newTurn}`);

  const currentState = ctx.getState();

  const { determineFirstPlayer } = await import('../../utils/firstPlayerUtils.js');
  const determinedFirstPlayer = firstPlayer || determineFirstPlayer({
    ...currentState,
    turn: newTurn,
    roundNumber: currentState.roundNumber || Math.floor((newTurn - 1) / 2) + 1
  });

  const gameDataService = ctx.getGameDataService();
  const player1EffectiveStats = gameDataService.getEffectiveShipStats(
    currentState.player1,
    currentState.placedSections
  );
  const player2EffectiveStats = gameDataService.getEffectiveShipStats(
    currentState.player2,
    currentState.opponentPlacedSections
  );

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

  ctx.setState({
    turn: newTurn,
    turnPhase: newPhase,
    currentPlayer: determinedFirstPlayer,
    firstPlayerOfRound: determinedFirstPlayer,
    firstPasserOfPreviousRound: currentState.passInfo.firstPasser,
    actionsTakenThisTurn: 0,
    passInfo: {
      firstPasser: null,
      player1Passed: false,
      player2Passed: false
    }
  });

  ctx.setPlayerStates(newPlayer1State, newPlayer2State);

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
 * Process first player determination
 * @param {Object} _payload - unused
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processFirstPlayerDetermination(_payload, ctx) {
  debugLog('PHASE_TRANSITIONS', '🎯 ActionProcessor: Processing first player determination');

  const currentState = ctx.getState();

  const { determineFirstPlayer, getFirstPlayerReasonText } = await import('../../utils/firstPlayerUtils.js');

  const firstPlayer = determineFirstPlayer(currentState);
  const reasonText = getFirstPlayerReasonText(currentState);

  ctx.setState({
    currentPlayer: firstPlayer,
    firstPlayerOfRound: firstPlayer
  });

  debugLog('PHASE_TRANSITIONS', `✅ First player determination complete: ${firstPlayer}`);

  return {
    success: true,
    firstPlayer,
    reasonText,
    turn: currentState.turn
  };
}
