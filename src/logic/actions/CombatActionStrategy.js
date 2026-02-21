// Combat action strategies: processAttack, processMove, processAbility
// Extracted from ActionProcessor.js — handles all direct drone interactions.

import { resolveAttack } from '../combat/AttackProcessor.js';
import fullDroneCollection from '../../data/droneData.js';
import { calculateEffectiveStats } from '../statsCalculator.js';
import { LaneControlCalculator } from '../combat/LaneControlCalculator.js';
import { calculateAiInterception } from '../combat/InterceptionProcessor.js';
import AbilityResolver from '../abilities/AbilityResolver.js';
import { gameEngine } from '../gameLogic.js';
import { checkRallyBeaconGoAgain } from '../utils/rallyBeaconHelper.js';
import { processTrigger as processMineTrigger } from '../effects/mines/MineTriggeredEffectProcessor.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * Process attack action
 * @param {Object} payload - { attackDetails }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processAttack(payload, ctx) {
  const { attackDetails } = payload;

  const currentState = ctx.getState();
  const allPlacedSections = {
    player1: currentState.placedSections,
    player2: currentState.opponentPlacedSections
  };

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
      if (defendingPlayerId === 'player2' && currentState.gameMode === 'local') {
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
  ctx.captureAnimationsForBroadcast(animations);

  const mineCount = result.mineAnimationEventCount || 0;

  // Two-phase execution: mine animations play and update state first,
  // then attack animations play with the remaining state update.
  // This ensures the mine token disappears before the attack animation starts.
  if (mineCount > 0 && animations.length > mineCount) {
    const mineAnimations = animations.slice(0, mineCount);
    const attackAnimations = animations.slice(mineCount);

    // Phase 1: Mine destruction - build intermediate state with mines removed but no attack damage
    const freshState = ctx.getState();
    const intermediatePlayerStates = {
      player1: JSON.parse(JSON.stringify(freshState.player1)),
      player2: JSON.parse(JSON.stringify(freshState.player2))
    };

    // Remove destroyed mines from intermediate state using mine animation event data
    for (const mineAnim of mineAnimations) {
      const { targetId, targetPlayer, targetLane } = mineAnim.payload;
      if (targetId && targetPlayer && targetLane) {
        const laneDrones = intermediatePlayerStates[targetPlayer]?.dronesOnBoard?.[targetLane];
        if (laneDrones) {
          intermediatePlayerStates[targetPlayer].dronesOnBoard[targetLane] =
            laneDrones.filter(d => d.id !== targetId);
        }
      }
    }

    // Phase 1: Execute mine animations with intermediate state (mine removal only)
    await ctx.executeAnimationPhase(mineAnimations, intermediatePlayerStates);

    // Phase 2: Execute attack animations with full final state (includes attack damage)
    await ctx.executeAnimationPhase(attackAnimations, result.newPlayerStates);
  } else {
    // Single-phase execution: no mine animations or only mine animations (no attack after)
    await ctx.executeAnimationPhase(animations, result.newPlayerStates);
  }

  // Clear interceptionPending state after attack completes (closes "opponent deciding" modal)
  if (currentState.interceptionPending) {
    debugLog('COMBAT', '🛡️ [INTERCEPTION] Clearing interceptionPending after attack completed');
    ctx.setState({ interceptionPending: null });
  }

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
  const { droneId, fromLane, toLane, playerId } = payload;

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
  const placedSections = {
    player1: currentState.placedSections,
    player2: currentState.opponentPlacedSections
  };

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
  const dronesInFromLane = playerState.dronesOnBoard[fromLane] || [];
  const hasMovementInhibitor = dronesInFromLane.some(d =>
    d.abilities?.some(a => a.effect?.keyword === 'INHIBIT_MOVEMENT')
  );
  if (hasMovementInhibitor) {
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

  // Check if drone has RAPID keyword (first move doesn't exhaust)
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  const hasRapid = baseDrone?.abilities?.some(
    a => a.effect?.type === 'GRANT_KEYWORD' && a.effect?.keyword === 'RAPID'
  );
  const canUseRapid = hasRapid && !drone.rapidUsed;

  // Check if drone has INFILTRATE keyword (doesn't exhaust when moving into uncontrolled lane)
  const hasInfiltrate = baseDrone?.abilities?.some(
    a => a.effect?.type === 'GRANT_KEYWORD' && a.effect?.keyword === 'INFILTRATE'
  );
  let canUseInfiltrate = false;
  if (hasInfiltrate) {
    // Check lane control BEFORE movement - does not exhaust if destination lane is NOT controlled
    const freshState = ctx.getState();
    const laneControl = LaneControlCalculator.calculateLaneControl(
      freshState.player1,
      freshState.player2
    );
    canUseInfiltrate = laneControl[toLane] !== playerId;
  }

  // Move the drone - RAPID or INFILTRATE allows move without exhaustion
  const movedDrone = {
    ...drone,
    isExhausted: (canUseRapid || canUseInfiltrate) ? false : true,
    rapidUsed: canUseRapid ? true : drone.rapidUsed
  };
  newPlayerState.dronesOnBoard[fromLane] = newPlayerState.dronesOnBoard[fromLane].filter(d => d.id !== droneId);
  newPlayerState.dronesOnBoard[toLane].push(movedDrone);

  // Apply ON_MOVE effects (e.g., Phase Jumper's Phase Shift)
  let { newState: stateAfterMoveEffects, animationEvents: onMoveAnimationEvents } = gameEngine.applyOnMoveEffects(
    newPlayerState,
    movedDrone,
    fromLane,
    toLane,
    (entry) => ctx.addLogEntry(entry)
  );

  // Update auras after movement
  stateAfterMoveEffects.dronesOnBoard = gameEngine.updateAuras(
    stateAfterMoveEffects,
    opponentPlayerState,
    placedSections
  );

  // --- Phase 1: Commit movement (drone appears in destination lane) ---
  ctx.updatePlayerState(playerId, stateAfterMoveEffects);

  // Wait for React to render drone in new lane before querying DOM for animation positions
  const animationManager = ctx.getAnimationManager();
  if (animationManager) {
    await animationManager.waitForReactRender();
  }

  // Play ON_MOVE heal animations (drone is now visually in destination lane)
  if (onMoveAnimationEvents && onMoveAnimationEvents.length > 0) {
    const healAnimations = onMoveAnimationEvents.map(event => ({
      animationName: event.type,
      timing: animationManager?.animations[event.type]?.timing || 'independent',
      payload: { ...event, targetPlayer: playerId }
    }));
    await ctx.executeAndCaptureAnimations(healAnimations);
  }

  // --- Phase 2: Process mine triggers on committed state (drone is now visually in destination lane) ---
  const committedState = ctx.getState();
  const minePlayerStates = {
    [playerId]: JSON.parse(JSON.stringify(committedState[playerId])),
    [opponentPlayerId]: JSON.parse(JSON.stringify(committedState[opponentPlayerId]))
  };
  const movedDroneInLane = minePlayerStates[playerId].dronesOnBoard[toLane].find(d => d.id === droneId);
  const mineResult = processMineTrigger('ON_LANE_MOVEMENT_IN', {
    lane: toLane,
    triggeringDrone: movedDroneInLane,
    triggeringPlayerId: playerId
  }, {
    playerStates: minePlayerStates,
    placedSections,
    logCallback: (entry) => ctx.addLogEntry(entry)
  });

  // Play mine animations (drone is now visually in destination lane)
  if (mineResult.triggered && mineResult.animationEvents.length > 0) {
    const mineAnimations = mineResult.animationEvents.map(event => {
      const animDef = animationManager?.animations[event.type];
      return {
        animationName: event.type,
        timing: animDef?.timing || 'pre-state',
        payload: { ...event }
      };
    });
    await ctx.executeAndCaptureAnimations(mineAnimations);
  }

  // Commit mine destruction state (removes destroyed mine/drone from DOM)
  if (mineResult.triggered) {
    ctx.updatePlayerState(playerId, minePlayerStates[playerId]);
    ctx.updatePlayerState(opponentPlayerId, minePlayerStates[opponentPlayerId]);
  }

  // Check if the moved drone was destroyed by the mine
  const finalPlayerState = ctx.getState()[playerId];
  const droneDestroyedByMine = mineResult.triggered &&
    !finalPlayerState.dronesOnBoard[toLane].some(d => d.id === droneId);

  // Log the move
  ctx.addLogEntry({
    player: playerState.name,
    actionType: 'MOVE',
    source: drone.name,
    target: toLane.replace('lane', 'Lane '),
    outcome: `Moved from ${fromLane.replace('lane', 'Lane ')} to ${toLane.replace('lane', 'Lane ')}.`
  });

  debugLog('COMBAT', `✅ Moved ${drone.name} from ${fromLane} to ${toLane}`);

  // If drone was destroyed by mine, end turn immediately (no rally beacon check)
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

  // Check if a Rally Beacon in the destination lane grants go-again
  const rallyGoAgain = checkRallyBeaconGoAgain(
    finalPlayerState, toLane, false,
    (entry) => ctx.addLogEntry(entry)
  );

  // Show Go Again notification if Rally Beacon triggered
  if (rallyGoAgain) {
    await ctx.executeGoAgainAnimation(playerId);
  }

  return {
    success: true,
    shouldEndTurn: !rallyGoAgain,
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
  const allPlacedSections = {
    player1: currentState.placedSections,
    player2: currentState.opponentPlacedSections
  };

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
  ctx.captureAnimationsForBroadcast(animations);

  await ctx.executeAnimationPhase(animations, result.newPlayerStates);

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
