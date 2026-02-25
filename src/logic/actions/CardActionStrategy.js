// Card action strategies: processCardPlay, processAdditionalCostCardPlay,
// processAdditionalCostEffectSelectionComplete, processMovementCompletion,
// processSearchAndDrawCompletion
// Extracted from ActionProcessor.js — handles all card-play flows.

import { gameEngine } from '../gameLogic.js';
import CardPlayManager from '../cards/CardPlayManager.js';
import EffectChainProcessor from '../cards/EffectChainProcessor.js';
import MovementEffectProcessor from '../effects/MovementEffectProcessor.js';
import ConditionalEffectProcessor from '../effects/conditional/ConditionalEffectProcessor.js';
import EffectRouter from '../EffectRouter.js';
import SeededRandom from '../../utils/seededRandom.js';
import { debugLog } from '../../utils/debugLogger.js';

// --- Chain Engine Card Processing ---
// Used for cards with native effects[] (migrated from legacy schema).
// Replaces gameEngine.resolveCardPlay with EffectChainProcessor.processEffectChain.

let _chainProcessor = null;
function getChainProcessor() {
  if (!_chainProcessor) _chainProcessor = new EffectChainProcessor();
  return _chainProcessor;
}

function _findTargetLane(target, playerStates) {
  if (!target || !target.id) return null;
  if (target.id.startsWith('lane')) return target.id;
  for (const pid of ['player1', 'player2']) {
    const board = playerStates[pid]?.dronesOnBoard || {};
    for (const lane of ['lane1', 'lane2', 'lane3']) {
      if ((board[lane] || []).some(d => d.id === target.id)) return lane;
    }
  }
  return null;
}

// Reads card.effect (derived from effects[0] by effectsAdapter's backward-compat layer)
function _generateOutcome(card, target) {
  const effect = card.effect;
  const targetName = target ? (target.name || target.id) : 'N/A';
  if (!effect) return 'Card effect applied.';
  if (effect.type === 'DRAW') return `Drew ${effect.value} card(s).`;
  if (effect.type === 'GAIN_ENERGY') return `Gained ${effect.value} energy.`;
  if (effect.type === 'HEAL_HULL') return `Healed ${effect.value} hull on ${targetName}.`;
  if (effect.type === 'HEAL_SHIELDS') return `Healed ${effect.value} shields on ${targetName}.`;
  if (effect.type === 'READY_DRONE') return `Readied ${targetName}.`;
  if (effect.type === 'DAMAGE') {
    if (card.targeting?.affectedFilter) return `Dealt ${effect.value} damage to filtered targets in ${targetName}.`;
    return `Dealt ${effect.value} damage to ${targetName}.`;
  }
  if (effect.type === 'MODIFY_STAT') {
    const mod = effect.mod;
    const durationText = mod.type === 'temporary' ? ' until the end of the turn' : ' permanently';
    return `Gave ${targetName} a ${mod.value > 0 ? '+' : ''}${mod.value} ${mod.stat} bonus${durationText}.`;
  }
  return 'Card effect applied.';
}

async function _processChainCardPlay(card, target, playerId, playerStates, placedSections, currentState, ctx) {
  debugLog('EFFECT_CHAIN', `⚡ Chain engine processing: ${card.name}`, { playerId, targetId: target?.id });

  const callbacks = {
    logCallback: (entry) => ctx.addLogEntry(entry),
    resolveAttackCallback: async (attackPayload) => ctx.processAttack(attackPayload),
    applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects,
    updateAurasCallback: gameEngine.updateAuras,
    actionsTakenThisTurn: currentState.actionsTakenThisTurn || 0
  };

  // Log the card play
  const outcome = _generateOutcome(card, target);
  callbacks.logCallback({
    player: playerStates[playerId].name,
    actionType: 'PLAY_CARD',
    source: card.name,
    target: target ? (target.name || target.id) : 'N/A',
    outcome,
  });

  // Build selection for single-effect cards
  const lane = _findTargetLane(target, playerStates);
  const selections = [{ target, lane }];

  const result = getChainProcessor().processEffectChain(card, selections, playerId, {
    playerStates,
    placedSections,
    callbacks,
    localPlayerId: ctx.getLocalPlayerId(),
    gameMode: currentState.gameMode || 'local',
  });

  debugLog('CARDS', '[ANIMATION EVENTS] Chain card play events:', result.animationEvents);

  const animations = ctx.mapAnimationEvents(result.animationEvents);
  ctx.captureAnimationsForBroadcast(animations);
  await ctx.executeAnimationPhase(animations, result.newPlayerStates);

  ctx.checkWinCondition();

  if (!result.shouldEndTurn) {
    await ctx.executeGoAgainAnimation(playerId);
  }

  return {
    ...result,
    animations: { actionAnimations: animations, systemAnimations: [] }
  };
}

/**
 * Process card play action
 * @param {Object} payload - { card, targetId, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processCardPlay(payload, ctx) {
  const { card, targetId, playerId } = payload;

  const currentState = ctx.getState();
  const playerStates = { player1: currentState.player1, player2: currentState.player2 };
  const placedSections = {
    player1: currentState.placedSections,
    player2: currentState.opponentPlacedSections
  };

  // Look up full target object from targetId
  // gameEngine.resolveCardPlay expects a target object with .owner, .id, .name properties
  let target = null;
  if (targetId) {
    // Search in both players' drones
    for (const pid of ['player1', 'player2']) {
      for (const lane of ['lane1', 'lane2', 'lane3']) {
        const drones = playerStates[pid].dronesOnBoard[lane] || [];
        const drone = drones.find(d => d.id === targetId);
        if (drone) {
          target = { ...drone, owner: pid };
          break;
        }
      }
      if (target) break;
    }

    // If not found in drones, check ship sections
    if (!target) {
      for (const pid of ['player1', 'player2']) {
        const sections = playerStates[pid].shipSections;
        if (sections[targetId]) {
          target = {
            ...sections[targetId],
            name: targetId,
            owner: pid
          };
          break;
        }
      }
    }

    // If still not found, check activeDronePool for upgrade card targets
    if (!target) {
      const actingPlayerState = playerStates[playerId];
      const poolDrone = actingPlayerState.activeDronePool?.find(d => d.name === targetId);
      if (poolDrone) {
        target = { ...poolDrone, id: poolDrone.name, owner: playerId };
      }
    }

    // If still not found, check if it's a lane target
    if (!target && targetId && targetId.startsWith('lane')) {
      target = { id: targetId };
    }
  }

  // --- Chain engine path for cards with native effects[] ---
  if (card._chainEnabled) {
    return _processChainCardPlay(card, target, playerId, playerStates, placedSections, currentState, ctx);
  }

  // --- Legacy path ---
  const callbacks = {
    logCallback: (entry) => ctx.addLogEntry(entry),
    resolveAttackCallback: async (attackPayload) => {
      return await ctx.processAttack(attackPayload);
    },
    applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects,
    updateAurasCallback: gameEngine.updateAuras,
    actionsTakenThisTurn: currentState.actionsTakenThisTurn || 0
  };

  const result = gameEngine.resolveCardPlay(
    card,
    target,
    playerId,
    playerStates,
    placedSections,
    callbacks,
    ctx.getLocalPlayerId(),
    currentState.gameMode
  );

  // Process additional effects (from PRE/POST conditionals like DESTROY on Executioner, GAIN_ENERGY on Energy Leech)
  if (result.additionalEffects && result.additionalEffects.length > 0) {
    const effectRouter = new EffectRouter();
    let currentStatesForEffects = result.newPlayerStates;
    const additionalAnimationEvents = [];

    for (const effect of result.additionalEffects) {
      const effectContext = {
        actingPlayerId: playerId,
        playerStates: currentStatesForEffects,
        placedSections,
        target,
        card
      };
      const effectResult = effectRouter.routeEffect(effect, effectContext);
      if (effectResult?.newPlayerStates) {
        currentStatesForEffects = effectResult.newPlayerStates;
      }
      if (effectResult?.animationEvents) {
        additionalAnimationEvents.push(...effectResult.animationEvents);
      }
    }

    result.newPlayerStates = currentStatesForEffects;
    result.animationEvents = [...(result.animationEvents || []), ...additionalAnimationEvents];

    debugLog('EFFECT_PROCESSING', '[ActionProcessor] Card play additionalEffects processed', {
      effectCount: result.additionalEffects.length,
      effectTypes: result.additionalEffects.map(e => e.type)
    });
  }

  debugLog('CARDS', '[ANIMATION EVENTS] Card play events:', result.animationEvents);

  const animations = ctx.mapAnimationEvents(result.animationEvents);
  ctx.captureAnimationsForBroadcast(animations);
  await ctx.executeAnimationPhase(animations, result.newPlayerStates);

  ctx.checkWinCondition();

  // Show Go Again notification when the turn continues
  // Skip when card needs UI selection (e.g., movement cards entering lane/drone picker)
  if (!result.shouldEndTurn && !result.needsCardSelection) {
    await ctx.executeGoAgainAnimation(playerId);
  }

  return {
    ...result,
    animations: {
      actionAnimations: animations,
      systemAnimations: []
    }
  };
}

/**
 * Process additional cost card play completion
 * @param {Object} payload - { card, costSelection, effectTarget, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processAdditionalCostCardPlay(payload, ctx) {
  const { card, costSelection, effectTarget, playerId } = payload;

  debugLog('ADDITIONAL_COST', '⚙️ ActionProcessor: processAdditionalCostCardPlay started', {
    cardName: card.name,
    cardId: card.id,
    costSelection,
    effectTargetId: effectTarget.id,
    effectTargetName: effectTarget.name,
    playerId
  });

  const currentState = ctx.getState();
  const playerStates = { player1: currentState.player1, player2: currentState.player2 };

  debugLog('ADDITIONAL_COST', '📊 Current game state', {
    player1Energy: playerStates.player1.energy,
    player2Energy: playerStates.player2.energy,
    player1Hand: playerStates.player1.hand.length,
    player2Hand: playerStates.player2.hand.length
  });
  const placedSections = {
    player1: currentState.placedSections,
    player2: currentState.opponentPlacedSections
  };

  const callbacks = {
    logCallback: (entry) => ctx.addLogEntry(entry),
    resolveAttackCallback: async (attackPayload) => {
      return await ctx.processAttack(attackPayload);
    },
    applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects,
    updateAurasCallback: gameEngine.updateAuras,
    actionsTakenThisTurn: currentState.actionsTakenThisTurn || 0
  };

  const result = CardPlayManager.processAdditionalCostCardCompletion(
    card,
    costSelection,
    effectTarget,
    playerId,
    playerStates,
    placedSections,
    callbacks
  );

  // Check if effect needs card selection (e.g., movement effect)
  if (result.needsEffectSelection) {
    debugLog('ADDITIONAL_COST', '🔄 Effect needs selection - returning to UI', {
      cardName: card.name,
      selectionType: result.needsEffectSelection.selectionData.type
    });

    return {
      success: true,
      needsEffectSelection: result.needsEffectSelection,
      playerStates: result.needsEffectSelection.currentStates
    };
  }

  debugLog('ADDITIONAL_COST', '✅ ActionProcessor: Card execution completed', {
    cardName: card.name,
    stateChanged: result.newPlayerStates !== playerStates,
    animationEventCount: result.animationEvents?.length || 0,
    shouldEndTurn: result.shouldEndTurn
  });

  const updatedState = {
    ...currentState,
    player1: result.newPlayerStates.player1,
    player2: result.newPlayerStates.player2,
    actionsTakenThisTurn: (currentState.actionsTakenThisTurn || 0) + 1
  };

  if (result.animationEvents && result.animationEvents.length > 0) {
    debugLog('ADDITIONAL_COST', '🎬 Animation events queued', {
      eventCount: result.animationEvents.length,
      eventTypes: result.animationEvents.map(e => e.type)
    });
    ctx.captureAnimationsForBroadcast(result.animationEvents);
  }

  ctx.setState(updatedState);

  // Execute CARD_REVEAL animation now that additional cost card play is complete
  const animMgr = ctx.getAnimationManager();
  const animDef = animMgr?.animations['CARD_REVEAL'];
  const cardRevealAnimation = [{
    animationName: 'CARD_REVEAL',
    timing: animDef?.timing || 'independent',
    payload: {
      cardId: card.id,
      cardName: card.name,
      cardData: card,
      targetPlayer: playerId,
      timestamp: Date.now()
    }
  }];
  await ctx.executeAndCaptureAnimations(cardRevealAnimation);

  if (!result.shouldEndTurn) {
    await ctx.executeGoAgainAnimation(playerId);
  }

  return {
    success: true,
    shouldEndTurn: result.shouldEndTurn,
    animationEvents: result.animationEvents
  };
}

/**
 * Process additional cost effect selection completion
 * @param {Object} payload - { selectionContext, effectSelection, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processAdditionalCostEffectSelectionComplete(payload, ctx) {
  debugLog('ADDITIONAL_COST_EFFECT_FLOW', '🎯 ActionProcessor: processAdditionalCostEffectSelectionComplete ENTRY', {
    cardName: payload.selectionContext.card.name,
    playerId: payload.playerId,
    effectSelectionType: payload.effectSelection.type,
    droneId: payload.effectSelection.drone?.id,
    fromLane: payload.effectSelection.fromLane,
    toLane: payload.effectSelection.toLane
  });

  debugLog('ADDITIONAL_COST', '🎯 Processing effect selection completion', {
    cardName: payload.selectionContext.card.name,
    playerId: payload.playerId
  });

  const callbacks = ctx.createCallbacks();

  debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   🔵 Calling CardPlayManager.completeAdditionalCostEffectSelection');

  const result = CardPlayManager.completeAdditionalCostEffectSelection(
    payload.selectionContext,
    payload.effectSelection,
    callbacks
  );

  debugLog('ADDITIONAL_COST_EFFECT_FLOW', '   ✅ CardPlayManager completed', {
    success: true,
    hasNewStates: !!result.newPlayerStates,
    shouldEndTurn: result.shouldEndTurn,
    animationCount: result.animationEvents?.length || 0
  });

  const currentState = ctx.getState();
  const updatedState = {
    ...currentState,
    player1: result.newPlayerStates.player1,
    player2: result.newPlayerStates.player2,
    actionsTakenThisTurn: (currentState.actionsTakenThisTurn || 0) + 1
  };

  if (result.animationEvents && result.animationEvents.length > 0) {
    debugLog('ADDITIONAL_COST', '🎬 Animation events queued', {
      eventCount: result.animationEvents.length,
      eventTypes: result.animationEvents.map(e => e.type)
    });
    ctx.captureAnimationsForBroadcast(result.animationEvents);
  }

  ctx.setState(updatedState);

  debugLog('ADDITIONAL_COST_EFFECT_FLOW', '✅ ActionProcessor complete - returning result');

  if (!result.shouldEndTurn) {
    await ctx.executeGoAgainAnimation(payload.playerId);
  }

  return {
    success: true,
    newPlayerStates: result.newPlayerStates,
    shouldEndTurn: result.shouldEndTurn,
    animationEvents: result.animationEvents
  };
}

/**
 * Process movement card completion (SINGLE_MOVE or MULTI_MOVE)
 * Called after user has selected drones and destination in UI
 * Card costs are paid here (not during initial card play)
 * @param {Object} payload - { card, movementType, drones, fromLane, toLane, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processMovementCompletion(payload, ctx) {
  const { card, movementType, drones, fromLane, toLane, playerId } = payload;

  debugLog('MOVEMENT_EFFECT', 'processMovementCompletion - payload received', {
    cardName: card.name,
    cardInstanceId: card.instanceId,
    cardEffectType: card.effect?.type,
    cardEffectProperties: card.effect?.properties,
    movementType,
    playerId
  });

  const currentState = ctx.getState();

  // Pay card costs now (they weren't paid when the movement selection started)
  const playerStates = gameEngine.payCardCosts(card, playerId, {
    player1: currentState.player1,
    player2: currentState.player2
  });

  const placedSections = {
    player1: currentState.placedSections,
    player2: currentState.opponentPlacedSections
  };

  const callbacks = {
    logCallback: (entry) => ctx.addLogEntry(entry)
  };

  const context = {
    actingPlayerId: playerId,
    playerStates: {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    },
    card,
    placedSections,
    callbacks,
    localPlayerId: playerId,
    gameMode: currentState.gameMode || 'local'
  };

  const opponentPlayerId = playerId === 'player1' ? 'player2' : 'player1';
  const movementProcessor = new MovementEffectProcessor();

  let result;

  if (movementType === 'single_move') {
    result = movementProcessor.executeSingleMove(
      card,
      drones[0],
      fromLane,
      toLane,
      playerId,
      context.playerStates,
      opponentPlayerId,
      context
    );
  } else {
    result = movementProcessor.executeMultiMove(
      card,
      drones,
      fromLane,
      toLane,
      playerId,
      context.playerStates,
      opponentPlayerId,
      context
    );
  }

  // Check for validation errors
  if (result.error) {
    return {
      success: false,
      error: result.error,
      shouldCancelCardSelection: result.shouldCancelCardSelection,
      shouldClearMultiSelectState: result.shouldClearMultiSelectState
    };
  }

  // Process POST conditionals for movement cards
  let dynamicGoAgain = !result.shouldEndTurn;
  let postStates = result.newPlayerStates;

  if (card.conditionalEffects && card.conditionalEffects.length > 0) {
    const conditionalProcessor = new ConditionalEffectProcessor();
    const effectRouter = new EffectRouter();

    const movedDrone = result.effectResult?.movedDrones?.[0] || drones[0];

    const postContext = {
      target: movedDrone,
      actingPlayerId: playerId,
      playerStates: result.newPlayerStates,
      placedSections,
      callbacks,
      card
    };

    const postResult = conditionalProcessor.processPostConditionals(
      card.conditionalEffects,
      postContext,
      result.effectResult
    );

    if (postResult.grantsGoAgain) {
      dynamicGoAgain = true;
    }

    let currentStatesForEffects = postResult.newPlayerStates;
    for (const effect of postResult.additionalEffects || []) {
      const effectContext = {
        ...postContext,
        playerStates: currentStatesForEffects,
        target: movedDrone
      };
      const effectResult = effectRouter.routeEffect(effect, effectContext);
      if (effectResult?.newPlayerStates) {
        currentStatesForEffects = effectResult.newPlayerStates;
      }
    }

    postStates = currentStatesForEffects;

    debugLog('EFFECT_PROCESSING', '[ActionProcessor] Movement POST conditionals processed', {
      conditionalCount: card.conditionalEffects.length,
      grantsGoAgain: dynamicGoAgain,
      additionalEffectsQueued: postResult.additionalEffects?.length || 0
    });
  }

  const currentStates = {
    player1: postStates.player1,
    player2: postStates.player2
  };

  debugLog('CARD_DISCARD', '📤 processMovementCompletion: calling finishCardPlay', {
    cardName: card.name,
    cardInstanceId: card.instanceId,
    playerId,
    handSizeBefore: currentStates[playerId]?.hand?.length
  });

  const completion = gameEngine.finishCardPlay(card, playerId, currentStates, dynamicGoAgain);

  debugLog('CARD_DISCARD', '📥 processMovementCompletion: finishCardPlay returned', {
    cardName: card.name,
    handSizeAfter: completion.newPlayerStates[playerId]?.hand?.length,
    shouldEndTurn: completion.shouldEndTurn
  });

  const hasMineAnimations = result.mineAnimationEvents && result.mineAnimationEvents.length > 0;
  const hasHealAnimations = result.healAnimationEvents && result.healAnimationEvents.length > 0;

  // --- Phase 1: Commit movement state (drone visually in destination lane, card discarded) ---
  if (hasMineAnimations) {
    const preMineTriggerStates = result.preMineTriggerStates || result.newPlayerStates;
    const preCurrentStates = { player1: preMineTriggerStates.player1, player2: preMineTriggerStates.player2 };
    const preCompletion = gameEngine.finishCardPlay(card, playerId, preCurrentStates, dynamicGoAgain);
    ctx.setPlayerStates(
      preCompletion.newPlayerStates.player1,
      preCompletion.newPlayerStates.player2
    );
  } else {
    ctx.setPlayerStates(
      completion.newPlayerStates.player1,
      completion.newPlayerStates.player2
    );
  }

  debugLog('CARD_DISCARD', '✅ processMovementCompletion: Phase 1 setPlayerStates called', {
    cardName: card.name,
    player1HandSize: completion.newPlayerStates.player1?.hand?.length,
    player2HandSize: completion.newPlayerStates.player2?.hand?.length
  });

  // Execute CARD_REVEAL animation now that movement is complete (non-blocking)
  const animMgr = ctx.getAnimationManager();
  const animDef = animMgr?.animations['CARD_REVEAL'];
  const cardRevealAnimation = [{
    animationName: 'CARD_REVEAL',
    timing: animDef?.timing || 'independent',
    payload: {
      cardId: card.id,
      cardName: card.name,
      cardData: card,
      targetPlayer: playerId,
      timestamp: Date.now()
    }
  }];
  await ctx.executeAndCaptureAnimations(cardRevealAnimation);

  // Play ON_MOVE heal animations (drone is now visually in destination lane)
  if (hasHealAnimations) {
    if (animMgr) {
      await animMgr.waitForReactRender();
    }
    const healAnimations = result.healAnimationEvents.map(event => ({
      animationName: event.type,
      timing: animMgr?.animations[event.type]?.timing || 'independent',
      payload: { ...event }
    }));
    await ctx.executeAndCaptureAnimations(healAnimations);
  }

  // --- Phase 2: Play mine animations then commit mine destruction ---
  if (hasMineAnimations) {
    if (animMgr) {
      await animMgr.waitForReactRender();
    }

    const mineAnimations = result.mineAnimationEvents.map(event => {
      const animDef2 = animMgr?.animations[event.type];
      return {
        animationName: event.type,
        timing: animDef2?.timing || 'pre-state',
        payload: { ...event }
      };
    });
    await ctx.executeAndCaptureAnimations(mineAnimations);

    // Commit post-mine state (drone/mine destruction applied)
    ctx.setPlayerStates(
      completion.newPlayerStates.player1,
      completion.newPlayerStates.player2
    );

    debugLog('CARD_DISCARD', '✅ processMovementCompletion: Phase 2 mine destruction committed', {
      cardName: card.name
    });
  }

  if (!completion.shouldEndTurn) {
    await ctx.executeGoAgainAnimation(playerId);
  }

  return {
    success: true,
    shouldEndTurn: completion.shouldEndTurn,
    newPlayerStates: completion.newPlayerStates,
    animations: {
      actionAnimations: cardRevealAnimation,
      systemAnimations: []
    }
  };
}

/**
 * Process a card play that uses secondaryTargeting (two-step DnD flow).
 *
 * Two patterns:
 * 1. Movement cards (effect only, no secondaryEffect): secondary target is the
 *    destination lane — delegates to processMovementCompletion.
 * 2. Dual-effect cards (effect + secondaryEffect): primary effect fires on
 *    primary target, secondary effect fires on secondary target.
 *
 * @param {Object} payload - { card, primaryTarget, primaryLane, secondaryTarget, secondaryLane, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processSecondaryTargetingCardPlay(payload, ctx) {
  const { card, primaryTarget, primaryLane, secondaryTarget, secondaryLane, playerId } = payload;

  debugLog('SECONDARY_TARGETING', '⚙️ processSecondaryTargetingCardPlay', {
    cardName: card.name,
    primaryTargetId: primaryTarget?.id,
    primaryLane,
    secondaryTargetId: secondaryTarget?.id,
    secondaryLane,
    hasSecondaryEffect: !!card.secondaryEffect,
    effectType: card.effect?.type
  });

  // --- Pattern 1: Movement card (secondary = destination lane) ---
  if (card.effect?.type === 'SINGLE_MOVE' && !card.secondaryEffect) {
    const destinationLane = secondaryLane || secondaryTarget?.id;

    return processMovementCompletion({
      card,
      movementType: 'single_move',
      drones: [primaryTarget],
      fromLane: primaryLane,
      toLane: destinationLane,
      playerId,
    }, ctx);
  }

  // --- Pattern 2: Dual-effect card (primary effect + secondary effect) ---
  const currentState = ctx.getState();

  // Pay card costs
  const playerStates = gameEngine.payCardCosts(card, playerId, {
    player1: currentState.player1,
    player2: currentState.player2
  });

  const placedSections = {
    player1: currentState.placedSections,
    player2: currentState.opponentPlacedSections
  };

  const callbacks = {
    logCallback: (entry) => ctx.addLogEntry(entry),
    resolveAttackCallback: async (attackPayload) => {
      return await ctx.processAttack(attackPayload);
    },
    applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects,
    updateAurasCallback: gameEngine.updateAuras,
    actionsTakenThisTurn: currentState.actionsTakenThisTurn || 0
  };

  const effectRouter = new EffectRouter();

  // Execute primary effect on primary target
  const primaryContext = {
    target: primaryTarget,
    actingPlayerId: playerId,
    playerStates: { player1: JSON.parse(JSON.stringify(playerStates.player1)), player2: JSON.parse(JSON.stringify(playerStates.player2)) },
    placedSections,
    callbacks,
    card
  };

  let currentStates = primaryContext.playerStates;
  let allAnimationEvents = [];

  // Route primary effect
  const primaryResult = effectRouter.routeEffect(card.effect, primaryContext);

  if (primaryResult?.newPlayerStates) {
    currentStates = primaryResult.newPlayerStates;
  }
  if (primaryResult?.animationEvents) {
    allAnimationEvents.push(...primaryResult.animationEvents);
  }

  debugLog('SECONDARY_TARGETING', '✅ Primary effect executed', {
    cardName: card.name,
    primaryEffectType: card.effect.type,
    primaryTargetId: primaryTarget?.id
  });

  // Execute secondary effect on secondary target
  if (card.secondaryEffect && secondaryTarget) {
    const secondaryContext = {
      target: secondaryTarget,
      actingPlayerId: playerId,
      playerStates: currentStates,
      placedSections,
      callbacks,
      card
    };

    // For SINGLE_MOVE secondary effects, use MovementEffectProcessor
    if (card.secondaryEffect.type === 'SINGLE_MOVE') {
      const opponentPlayerId = playerId === 'player1' ? 'player2' : 'player1';
      const movementProcessor = new MovementEffectProcessor();
      const moveResult = movementProcessor.executeSingleMove(
        { ...card, effect: card.secondaryEffect },
        secondaryTarget,
        secondaryLane || secondaryTarget.lane,
        null, // destination set by UI or auto-resolved
        playerId,
        currentStates,
        opponentPlayerId,
        secondaryContext
      );

      if (moveResult.newPlayerStates) {
        currentStates = moveResult.newPlayerStates;
      }
      if (moveResult.animationEvents) {
        allAnimationEvents.push(...moveResult.animationEvents);
      }
    } else {
      const secondaryResult = effectRouter.routeEffect(card.secondaryEffect, secondaryContext);

      if (secondaryResult?.newPlayerStates) {
        currentStates = secondaryResult.newPlayerStates;
      }
      if (secondaryResult?.animationEvents) {
        allAnimationEvents.push(...secondaryResult.animationEvents);
      }
    }

    debugLog('SECONDARY_TARGETING', '✅ Secondary effect executed', {
      cardName: card.name,
      secondaryEffectType: card.secondaryEffect.type,
      secondaryTargetId: secondaryTarget?.id
    });
  }

  // Process POST conditionals (covers movement cards with conditionalEffects)
  let dynamicGoAgain = false;
  if (card.conditionalEffects && card.conditionalEffects.length > 0) {
    const conditionalProcessor = new ConditionalEffectProcessor();
    const postContext = {
      target: primaryTarget,
      actingPlayerId: playerId,
      playerStates: currentStates,
      placedSections,
      callbacks,
      card
    };

    const postResult = conditionalProcessor.processPostConditionals(
      card.conditionalEffects,
      postContext,
      {}
    );

    if (postResult.grantsGoAgain) {
      dynamicGoAgain = true;
    }

    let statesForEffects = postResult.newPlayerStates;
    for (const effect of postResult.additionalEffects || []) {
      const effectContext = { ...postContext, playerStates: statesForEffects, target: primaryTarget };
      const effResult = effectRouter.routeEffect(effect, effectContext);
      if (effResult?.newPlayerStates) {
        statesForEffects = effResult.newPlayerStates;
      }
    }
    currentStates = statesForEffects;
  }

  // Finish card play (discard card, check go-again)
  const completion = gameEngine.finishCardPlay(card, playerId, currentStates, dynamicGoAgain);

  ctx.setPlayerStates(
    completion.newPlayerStates.player1,
    completion.newPlayerStates.player2
  );

  if (allAnimationEvents.length > 0) {
    ctx.captureAnimationsForBroadcast(allAnimationEvents);
  }

  // Execute CARD_REVEAL animation
  const animMgr = ctx.getAnimationManager();
  const animDef = animMgr?.animations['CARD_REVEAL'];
  const cardRevealAnimation = [{
    animationName: 'CARD_REVEAL',
    timing: animDef?.timing || 'independent',
    payload: {
      cardId: card.id,
      cardName: card.name,
      cardData: card,
      targetPlayer: playerId,
      timestamp: Date.now()
    }
  }];
  await ctx.executeAndCaptureAnimations(cardRevealAnimation);

  if (!completion.shouldEndTurn) {
    await ctx.executeGoAgainAnimation(playerId);
  }

  return {
    success: true,
    shouldEndTurn: completion.shouldEndTurn,
    animationEvents: allAnimationEvents
  };
}

/**
 * Process SEARCH_AND_DRAW card completion after player modal selection
 * Card costs are paid here (not during initial card play)
 * @param {Object} payload - { card, selectedCards, selectionData, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processSearchAndDrawCompletion(payload, ctx) {
  const { card, selectedCards, selectionData, playerId } = payload;

  const currentState = ctx.getState();
  const { searchedCards, remainingDeck, discardPile, shuffleAfter } = selectionData;

  // Pay card costs now (they weren't paid when the modal opened)
  const statesAfterCosts = gameEngine.payCardCosts(card, playerId, {
    player1: currentState.player1,
    player2: currentState.player2
  });

  // Calculate unselected cards
  const unselectedCards = searchedCards.filter(searchCard => {
    const cardId = searchCard.instanceId || `${searchCard.id}-${searchCard.name}`;
    return !selectedCards.some(selected => {
      const selectedId = selected.instanceId || `${selected.id}-${selected.name}`;
      return selectedId === cardId;
    });
  });

  const actingPlayerState = statesAfterCosts[playerId];

  const newHand = [...actingPlayerState.hand, ...selectedCards];
  let newDeck = [...remainingDeck, ...unselectedCards];

  if (shuffleAfter) {
    const gameState = ctx.getState();
    const rng = SeededRandom.fromGameState(gameState);
    newDeck = rng.shuffle(newDeck);
  }

  const updatedPlayerState = {
    ...actingPlayerState,
    deck: newDeck,
    hand: newHand,
    discardPile: discardPile
  };

  const currentStates = {
    player1: playerId === 'player1' ? updatedPlayerState : statesAfterCosts.player1,
    player2: playerId === 'player2' ? updatedPlayerState : statesAfterCosts.player2
  };

  const completion = gameEngine.finishCardPlay(card, playerId, currentStates);

  ctx.addLogEntry({
    player: actingPlayerState.name,
    actionType: 'CARD_SELECTION',
    source: card.name,
    target: `Selected ${selectedCards.length} cards`,
    outcome: `Drew: ${selectedCards.map(c => c.name).join(', ')}`
  }, 'processSearchAndDrawCompletion');

  ctx.setPlayerStates(
    completion.newPlayerStates.player1,
    completion.newPlayerStates.player2
  );

  const animMgr = ctx.getAnimationManager();
  const animDef = animMgr?.animations['CARD_REVEAL'];
  const cardRevealAnimation = [{
    animationName: 'CARD_REVEAL',
    timing: animDef?.timing || 'independent',
    payload: {
      cardId: card.id,
      cardName: card.name,
      cardData: card,
      targetPlayer: playerId,
      timestamp: Date.now()
    }
  }];
  await ctx.executeAndCaptureAnimations(cardRevealAnimation);

  if (!completion.shouldEndTurn) {
    await ctx.executeGoAgainAnimation(playerId);
  }

  return {
    success: true,
    shouldEndTurn: completion.shouldEndTurn,
    newPlayerStates: completion.newPlayerStates,
    animations: {
      actionAnimations: cardRevealAnimation,
      systemAnimations: []
    }
  };
}
