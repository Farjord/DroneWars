// Combat action strategies: processAttack, processMove, processAbility
// Extracted from ActionProcessor.js — handles all direct drone interactions.

import { resolveAttack } from '../combat/AttackProcessor.js';
import { calculateEffectiveStats } from '../statsCalculator.js';
import { calculateAiInterception } from '../combat/InterceptionProcessor.js';
import AbilityResolver from '../abilities/AbilityResolver.js';
import { gameEngine } from '../gameLogic.js';
import TriggerProcessor from '../triggers/TriggerProcessor.js';
import { TRIGGER_TYPES } from '../triggers/triggerConstants.js';
import { debugLog } from '../../utils/debugLogger.js';
import { hasMovementInhibitorInLane } from '../../utils/gameUtils.js';
import { buildDefaultMovementAnimation } from '../effects/movement/animations/DefaultMovementAnimation.js';
import { buildAnimationSequence } from '../animations/AnimationSequenceBuilder.js';
import { insertDroneInLane } from '../utils/laneInsertionUtils.js';

/**
 * Process attack action
 * @param {Object} payload - { attackDetails }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processAttack(payload, ctx) {
  const { attackDetails } = payload;

  const currentState = ctx.getState();
  const allPlacedSections = ctx.getPlacedSections();

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
      ctx.setState({
        interceptionPending: {
          attackDetails,
          defendingPlayerId,
          attackingPlayerId: attackDetails.attackingPlayer,
          interceptors: interceptionResult.interceptors,
          timestamp: Date.now()
        }
      });

      // AI Defender - wait then decide automatically
      if (ctx.isPlayerAI(defendingPlayerId)) {
        debugLog('COMBAT', '🛡️ [INTERCEPTION] AI defender has interceptors');

        // Wait 1 second (modal visible to human attacker)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // AI makes decision
        const aiPhaseProcessor = ctx.getAiPhaseProcessor();
        debugLog('COMBAT', '🔍 [INTERCEPTION] Checking aiPhaseProcessor:', {
          hasAIPhaseProcessor: !!aiPhaseProcessor,
          aiPhaseProcessorType: aiPhaseProcessor?.constructor?.name || 'undefined'
        });

        if (aiPhaseProcessor) {
          const decision = await aiPhaseProcessor.makeInterceptionDecision(
            interceptionResult.interceptors,
            attackDetails
          );

          debugLog('COMBAT', '🛡️ [INTERCEPTION] AI decision:', decision.interceptor ? 'INTERCEPT' : 'DECLINE');

          // Apply decision
          if (decision.interceptor) {
            finalAttackDetails.interceptor = decision.interceptor;

            // Emit interception result for badge display
            ctx.setState({
              lastInterception: {
                interceptor: decision.interceptor,
                originalTarget: attackDetails.target,
                timestamp: Date.now()
              }
            });
          }
        }

        // Complete interception (clears state, closes modal)
        ctx.setState({ interceptionPending: null });

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
    ctx.addLogEntry(entry, 'resolveAttack',
      finalAttackDetails.attackingPlayer === 'player2' ? finalAttackDetails.aiContext : null);
  };

  const result = resolveAttack(
    finalAttackDetails,
    { player1: currentState.player1, player2: currentState.player2 },
    allPlacedSections,
    logCallback
  );

  // Map animation events with timing from AnimationManager definitions
  const animations = ctx.mapAnimationEvents(result.animationEvents);

  debugLog('COMBAT', '[ANIMATION EVENTS] ActionProcessor received:', result.animationEvents);
  debugLog('COMBAT', '[ANIMATION EVENTS] Mapped to animations:', animations);

  debugLog('COMBAT', '🎬 [AI ANIMATION DEBUG] Built animations array:', {
    count: animations.length,
    animations: animations.map(a => ({
      name: a.animationName,
      sourceId: a.payload.sourceId,
      targetId: a.payload.targetId
    })),
    hasAnimationManager: !!ctx.getAnimationManager()
  });

  // Capture animations for broadcasting (host only)
  ctx.captureAnimations(animations);

  // Clear interceptionPending state after attack completes (closes "opponent deciding" modal)
  if (currentState.interceptionPending) {
    debugLog('COMBAT', '🛡️ [INTERCEPTION] Clearing interceptionPending after attack completed');
    ctx.setState({ interceptionPending: null });
  }

  // Commit damage state — resolveAttack returns deep copies, so GSM is stale without this
  ctx.setPlayerStates(result.newPlayerStates.player1, result.newPlayerStates.player2);

  // Check for win conditions after attack
  ctx.checkWinCondition();

  // Show Go Again notification when the turn continues (goAgain attacks)
  if (!result.shouldEndTurn) {
    await ctx.executeGoAgainAnimation(attackDetails.attackingPlayer);
  }

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
 * @param {Object} payload - { droneId, fromLane, toLane, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processMove(payload, ctx) {
  const { droneId, fromLane, toLane, playerId, insertionIndex } = payload;

  const currentState = ctx.getState();
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

  // Get placed sections for INERT check and later updateAuras
  const placedSections = ctx.getPlacedSections();

  // Check if drone has INERT keyword (cannot move)
  const effectiveStats = calculateEffectiveStats(drone, fromLane, playerState, opponentPlayerState, placedSections);
  if (effectiveStats.keywords.has('INERT')) {
    return {
      success: false,
      error: `${drone.name} cannot move (Inert).`,
      shouldShowErrorModal: true
    };
  }

  // Check for INHIBIT_MOVEMENT keyword in source lane (prevents moving OUT)
  if (hasMovementInhibitorInLane(currentState, playerId, fromLane)) {
    return {
      success: false,
      error: `${drone.name} cannot move out of ${fromLane} - Thruster Inhibitor is active.`,
      shouldShowErrorModal: true
    };
  }

  // Check if drone is Snared (one-shot movement cancellation for AI path)
  if (drone.isSnared) {
    let newPlayerState = JSON.parse(JSON.stringify(playerState));
    const snaredDrone = newPlayerState.dronesOnBoard[fromLane].find(d => d.id === droneId);
    if (snaredDrone) {
      snaredDrone.isSnared = false;
      snaredDrone.isExhausted = true;
    }
    ctx.updatePlayerState(playerId, newPlayerState);
    ctx.addLogEntry({
      player: playerState.name,
      actionType: 'STATUS_CONSUMED',
      source: drone.name,
      target: fromLane.replace('lane', 'Lane '),
      outcome: `${drone.name}'s move was cancelled — Snare effect consumed. Drone is now exhausted.`
    });
    return { success: true, snaredConsumed: true, shouldEndTurn: true };
  }

  // Create a copy of the entire player state for processing
  let newPlayerState = JSON.parse(JSON.stringify(playerState));

  // Move the drone — exhausted by default, trigger system may un-exhaust
  const movedDrone = {
    ...drone,
    isExhausted: true
  };
  newPlayerState.dronesOnBoard[fromLane] = newPlayerState.dronesOnBoard[fromLane].filter(d => d.id !== droneId);
  insertDroneInLane(newPlayerState.dronesOnBoard[toLane], movedDrone, insertionIndex);

  // Capture pre-trigger state for bridge STATE_SNAPSHOT
  // (drone has moved but no trigger effects applied yet)
  const preTriggerIntermediateState = {
    [playerId]: JSON.parse(JSON.stringify(newPlayerState)),
    [opponentPlayerId]: JSON.parse(JSON.stringify(opponentPlayerState)),
  };

  // Apply ON_MOVE effects via TriggerProcessor (fires for all drones per PRD 3.3)
  const triggerProcessor = new TriggerProcessor();
  let opponentState = JSON.parse(JSON.stringify(opponentPlayerState));
  const moveResult = triggerProcessor.fireTrigger(TRIGGER_TYPES.ON_MOVE, {
    lane: toLane,
    triggeringDrone: movedDrone,
    triggeringPlayerId: playerId,
    actingPlayerId: playerId,
    playerStates: {
      [playerId]: newPlayerState,
      [opponentPlayerId]: opponentState
    },
    placedSections,
    logCallback: (entry) => ctx.addLogEntry(entry)
  });
  let stateAfterMoveEffects = moveResult.triggered
    ? moveResult.newPlayerStates[playerId]
    : newPlayerState;
  const onMoveAnimationEvents = moveResult.animationEvents || [];
  if (moveResult.triggered) {
    opponentState = moveResult.newPlayerStates[opponentPlayerId];
  }

  // DOES_NOT_EXHAUST: If ON_MOVE trigger returned doesNotExhaust, un-exhaust the moved drone
  if (moveResult.doesNotExhaust) {
    const droneInState = stateAfterMoveEffects.dronesOnBoard[toLane]?.find(d => d.id === droneId);
    if (droneInState) {
      droneInState.isExhausted = false;
    }
    // Also patch bridge snapshot so animation never shows drone exhausted
    const droneInIntermediate = preTriggerIntermediateState[playerId]?.dronesOnBoard?.[toLane]?.find(d => d.id === droneId);
    if (droneInIntermediate) {
      droneInIntermediate.isExhausted = false;
    }
  }

  // Update auras after movement
  stateAfterMoveEffects.dronesOnBoard = gameEngine.updateAuras(
    stateAfterMoveEffects,
    opponentState,
    placedSections
  );

  // Fire ON_LANE_MOVEMENT_IN triggers on in-memory state (not from GSM)
  const movedDroneInLane = stateAfterMoveEffects.dronesOnBoard[toLane]?.find(d => d.id === droneId);
  const mineTriggerProcessor = new TriggerProcessor();
  const minePlayerStates = {
    [playerId]: JSON.parse(JSON.stringify(stateAfterMoveEffects)),
    [opponentPlayerId]: JSON.parse(JSON.stringify(opponentState)),
  };
  const mineResult = mineTriggerProcessor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
    lane: toLane,
    triggeringDrone: movedDroneInLane,
    triggeringPlayerId: playerId,
    actingPlayerId: playerId,
    playerStates: minePlayerStates,
    placedSections,
    logCallback: (entry) => ctx.addLogEntry(entry),
    currentTurnPlayerId: playerId
  });

  // Capture goAgain from mine result BEFORE building sequence
  const goAgain = mineResult.goAgain;

  // Determine final player states (after mine destruction)
  let finalPlayerState = stateAfterMoveEffects;
  let finalOpponentState = opponentState;
  if (mineResult.triggered) {
    finalPlayerState = mineResult.newPlayerStates[playerId];
    finalOpponentState = mineResult.newPlayerStates[opponentPlayerId];
  }

  // Check if the moved drone was destroyed by the mine
  const droneDestroyedByMine = mineResult.triggered &&
    !finalPlayerState.dronesOnBoard[toLane].some(d => d.id === droneId);

  // Build properly-ordered animation sequence: movement → STATE_SNAPSHOT → triggers
  const allTriggerEvents = [...onMoveAnimationEvents, ...(mineResult.animationEvents || [])];
  const movementEvents = buildDefaultMovementAnimation({
    drone, fromLane, toLane, actingPlayerId: playerId,
  });
  const sequence = buildAnimationSequence([{
    actionEvents: movementEvents,
    triggerEvents: allTriggerEvents,
    intermediateState: allTriggerEvents.length > 0 ? preTriggerIntermediateState : null,
  }]);

  // Map raw events to animation format and execute
  const mapped = ctx.mapAnimationEvents(sequence);
  await ctx.executeAndCaptureAnimations(mapped);

  // Single state commit — setPlayerStates expects (player1State, player2State)
  if (playerId === 'player1') {
    ctx.setPlayerStates(finalPlayerState, finalOpponentState);
  } else {
    ctx.setPlayerStates(finalOpponentState, finalPlayerState);
  }

  // Log the move
  ctx.addLogEntry({
    player: playerState.name,
    actionType: 'MOVE',
    source: drone.name,
    target: toLane.replace('lane', 'Lane '),
    outcome: `Moved from ${fromLane.replace('lane', 'Lane ')} to ${toLane.replace('lane', 'Lane ')}.`
  });

  debugLog('COMBAT', `✅ Moved ${drone.name} from ${fromLane} to ${toLane}`);

  // If drone was destroyed by mine, end turn immediately
  if (droneDestroyedByMine) {
    return {
      success: true,
      shouldEndTurn: true,
      message: `${drone.name} moved from ${fromLane} to ${toLane} but was destroyed by a mine`,
      drone: drone,
      fromLane: fromLane,
      toLane: toLane
    };
  }

  if (goAgain) {
    await ctx.executeGoAgainAnimation(playerId);
  }

  return {
    success: true,
    shouldEndTurn: !goAgain,
    message: `${drone.name} moved from ${fromLane} to ${toLane}`,
    drone: drone,
    fromLane: fromLane,
    toLane: toLane
  };
}

/**
 * Process ability action
 * @param {Object} payload - { droneId, abilityIndex, targetId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processAbility(payload, ctx) {
  const { droneId, abilityIndex, targetId } = payload;

  const currentState = ctx.getState();
  const playerStates = { player1: currentState.player1, player2: currentState.player2 };
  const allPlacedSections = ctx.getPlacedSections();

  // Find the drone and ability
  let userDrone = null;
  let targetDrone = null;

  // Search for the drone in all lanes, tracking owner
  for (const [playerId, player] of Object.entries(playerStates)) {
    for (const lane of Object.values(player.dronesOnBoard)) {
      for (const drone of lane) {
        if (drone.id === droneId) {
          userDrone = { ...drone, owner: playerId };
        }
        if (drone.id === targetId) {
          targetDrone = { ...drone, owner: playerId };
        }
      }
    }
  }

  // Check if targetId is a lane (for lane-targeted abilities)
  if (targetId && typeof targetId === 'string' && targetId.startsWith('lane') && !targetDrone) {
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
    ctx.addLogEntry(entry, 'resolveAbility');
  };

  // Recursive callback: ability resolution can trigger attacks
  const resolveAttackCallback = async (attackDetails) => {
    return await processAttack({ attackDetails }, ctx);
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

  // Map animation events with timing from AnimationManager definitions
  const animations = ctx.mapAnimationEvents(result.animationEvents);

  // Capture animations for broadcasting (host only)
  ctx.captureAnimations(animations);

  // Commit ability state — AbilityResolver returns deep copies, so GSM is stale without this
  ctx.setPlayerStates(result.newPlayerStates.player1, result.newPlayerStates.player2);

  // Check for win conditions after ability
  ctx.checkWinCondition();

  // Return result with animations for optimistic action tracking
  return {
    ...result,
    animations: {
      actionAnimations: animations,
      systemAnimations: []
    }
  };
}
