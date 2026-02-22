// Drone & player action strategies: processDestroyDrone, processOptionalDiscard,
// processPlayerPass, processAiShipPlacement, processAiAction
// Extracted from ActionProcessor.js — handles drone destruction, discards, passes, AI routing.

import { gameEngine } from '../gameLogic.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * Process drone destruction
 * @param {Object} payload - { droneId, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processDestroyDrone(payload, ctx) {
  const { droneId, playerId } = payload;

  debugLog('COMBAT', `💥 ActionProcessor: Processing drone destruction for ${playerId}, drone ${droneId}`);

  const currentState = ctx.getState();
  const playerState = currentState[playerId];

  if (!playerState) {
    return { success: false, error: `Player ${playerId} not found` };
  }

  const lane = gameEngine.getLaneOfDrone(droneId, playerState);
  if (!lane) {
    return { success: false, error: `Drone ${droneId} not found on board` };
  }

  const drone = playerState.dronesOnBoard[lane].find(d => d.id === droneId);
  if (!drone) {
    return { success: false, error: `Drone ${droneId} not found in lane ${lane}` };
  }

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

  newPlayerState.dronesOnBoard = gameEngine.updateAuras(newPlayerState, opponentPlayerState, placedSections);

  ctx.updatePlayerState(playerId, newPlayerState);

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
 * Process optional discard action
 * @param {Object} payload - { playerId, cardsToDiscard, isMandatory, abilityMetadata }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processOptionalDiscard(payload, ctx) {
  const { playerId, cardsToDiscard, isMandatory = false, abilityMetadata = null } = payload;
  const currentState = ctx.getState();

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
    const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;
    const gameDataService = ctx.getGameDataService();
    const effectiveStats = gameDataService.getEffectiveShipStats(playerState, placedSections);
    const handLimit = effectiveStats.totals.handLimit;
    const currentHandSize = playerState.hand.length;
    const excessCards = currentHandSize - handLimit;

    if (excessCards <= 0) {
      debugLog('CARDS', `🚫 [VALIDATION] Player ${playerId} cannot discard - already at or below hand limit`, {
        currentHandSize,
        handLimit,
        excessCards
      });
      throw new Error(`Cannot discard - already at hand limit (${handLimit})`);
    }

    if (cardsToDiscard.length > 1) {
      debugLog('CARDS', `🚫 [VALIDATION] Player ${playerId} cannot discard multiple cards at once during mandatory discard phase`);
      throw new Error('Can only discard one card at a time during mandatory discard phase');
    }
  }

  // Add log entry for each discarded card
  cardsToDiscard.forEach(card => {
    ctx.addLogEntry({
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

  ctx.updatePlayerState(playerId, {
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
    await ctx.executeAndCaptureAnimations(abilityRevealAnimation);
  }

  return {
    success: true,
    message: `Discarded ${cardsToDiscard.length} cards`,
    cardsDiscarded: cardsToDiscard
  };
}

/**
 * Process player pass action
 * @param {Object} payload - { playerId, playerName, turnPhase, passInfo, opponentPlayerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processPlayerPass(payload, ctx) {
  const { playerId, playerName, turnPhase, passInfo, opponentPlayerId } = payload;

  debugLog('PASS_LOGIC', '[PLAYER PASS DEBUG] Processing player pass through ActionProcessor:', {
    playerId,
    playerName,
    turnPhase,
    currentPassInfo: passInfo
  });

  const currentState = ctx.getState();

  ctx.addLogEntry({
    player: playerName,
    actionType: 'PASS',
    source: 'N/A',
    target: 'N/A',
    outcome: `Passed during ${turnPhase} phase.`
  }, 'playerPass');

  // Queue pass notification in PhaseAnimationQueue
  const phaseAnimationQueue = ctx.getPhaseAnimationQueue();
  if (phaseAnimationQueue) {
    const localPlayerId = ctx.getLocalPlayerId();
    const isLocalPlayer = playerId === localPlayerId;
    const passText = isLocalPlayer ? 'YOU PASSED' : 'OPPONENT PASSED';

    phaseAnimationQueue.queueAnimation('playerPass', passText, null, 'AP:playerPass:2716');

    debugLog('PASS_LOGIC', '[PLAYER PASS DEBUG] Queued pass notification in PhaseAnimationQueue:', {
      playerId,
      isLocalPlayer,
      passText
    });

    if (!phaseAnimationQueue.isPlaying()) {
      phaseAnimationQueue.startPlayback('AP:after_pass:2728');
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

  ctx.setPassInfo(newPassInfo);

  // Notify PhaseManager
  const gameMode = currentState.gameMode;
  const phaseManager = ctx.getPhaseManager();
  if (phaseManager) {
    if (gameMode === 'host' && playerId === 'player1') {
      phaseManager.notifyHostAction('pass', { phase: turnPhase });
      debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: Host passed in ${turnPhase}`);
    } else if (gameMode === 'host' && playerId === 'player2') {
      phaseManager.notifyGuestAction('pass', { phase: turnPhase });
      debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: Guest passed in ${turnPhase} (via network)`);
    } else if (gameMode === 'local') {
      if (playerId === 'player1') {
        phaseManager.notifyHostAction('pass', { phase: turnPhase });
      } else {
        phaseManager.notifyGuestAction('pass', { phase: turnPhase });
      }
      debugLog('PHASE_MANAGER', `📥 Notified PhaseManager: ${playerId} passed in ${turnPhase} (local mode)`);
    }
  }

  // Increment turn counter ONLY for action phase passes
  if (turnPhase === 'action') {
    const currentTurn = currentState.turn || 0;
    ctx.setState({
      turn: currentTurn + 1
    }, 'TURN_INCREMENT', 'playerPass');
    debugLog('PASS_LOGIC', `[TURN INCREMENT] Turn incremented: ${currentTurn} → ${currentTurn + 1}`);
  }

  // Handle turn switching when one player passes but the other hasn't
  const bothPassed = newPassInfo.player1Passed && newPassInfo.player2Passed;

  if (!bothPassed) {
    let nextPlayer = null;
    if (playerId === 'player1' && !newPassInfo.player2Passed) {
      nextPlayer = 'player2';
    } else if (playerId === 'player2' && !newPassInfo.player1Passed) {
      nextPlayer = 'player1';
    }

    if (nextPlayer) {
      debugLog('PASS_LOGIC', `[PLAYER PASS DEBUG] Switching turn to ${nextPlayer} (opponent hasn't passed)`);
      ctx.setCurrentPlayer(nextPlayer);
    }
  } else {
    debugLog('PASS_LOGIC', '[PLAYER PASS DEBUG] Both players passed - GameFlowManager will handle phase transition');
  }

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
 * @param {Object} payload - { placement, aiPersonality }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processAiShipPlacement(payload, ctx) {
  const { placement, aiPersonality } = payload;

  debugLog('STATE_SYNC', '[AI SHIP PLACEMENT] Processing AI ship placement:', {
    placement,
    aiPersonality
  });

  ctx.setState({
    opponentPlacedSections: placement
  }, 'aiShipPlacement');

  ctx.addLogEntry({
    player: 'AI Opponent',
    actionType: 'SHIP_PLACEMENT',
    source: 'AI System',
    target: 'Ship Sections',
    outcome: `${aiPersonality} deployed ship sections: ${placement.join(', ')}`
  }, 'aiShipPlacement');

  return {
    success: true,
    placement
  };
}

/**
 * Process AI action (routes to appropriate action processor)
 * @param {Object} payload - { aiDecision }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processAiAction(payload, ctx) {
  const { aiDecision } = payload;

  switch (aiDecision.type) {
    case 'deploy':
      const { droneToDeploy, targetLane } = aiDecision.payload;
      return await ctx.processDeployment({
        droneData: droneToDeploy,
        laneId: targetLane,
        playerId: 'player2',
        turn: ctx.get('turn')
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
          return await ctx.processAttack({
            attackDetails: {
              attacker: chosenAction.attacker,
              target: chosenAction.target,
              targetType: chosenAction.targetType || 'drone',
              lane: chosenAction.attacker.lane,
              attackingPlayer: 'player2',
              aiContext: aiDecision.logContext
            }
          });

        case 'play_card':
          return await ctx.processCardPlay({
            card: chosenAction.card,
            targetId: chosenAction.target?.id,
            playerId: 'player2'
          });

        case 'move':
          return await ctx.processMove({
            droneId: chosenAction.drone.id,
            fromLane: chosenAction.fromLane,
            toLane: chosenAction.toLane,
            playerId: 'player2'
          });

        case 'ability':
          return await ctx.processAbility({
            droneId: chosenAction.drone.id,
            abilityIndex: chosenAction.abilityIndex,
            targetId: chosenAction.target?.id
          });

        default:
          throw new Error(`Unknown AI action subtype: ${chosenAction.type}`);
      }

    case 'pass':
      return { success: true, action: 'pass' };

    default:
      throw new Error(`Unknown AI action type: ${aiDecision.type}`);
  }
}
