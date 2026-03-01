// Card action strategies: processCardPlay, processSearchAndDrawCompletion
// Extracted from ActionProcessor.js — handles all card-play flows.

import { gameEngine } from '../gameLogic.js';
import EffectChainProcessor from '../cards/EffectChainProcessor.js';
import SeededRandom from '../../utils/seededRandom.js';
import { debugLog } from '../../utils/debugLogger.js';

// --- Diagnostic Helpers ---

function _snapshotDrones(playerStates) {
  if (!playerStates) return null;
  const positions = {};
  for (const pid of ['player1', 'player2']) {
    const board = playerStates[pid]?.dronesOnBoard || {};
    for (const lane of ['lane1', 'lane2', 'lane3']) {
      for (const d of (board[lane] || [])) {
        positions[d.id] = `${pid}/${lane}`;
      }
    }
  }
  return positions;
}

// --- Chain Engine Card Processing ---
// All cards route through EffectChainProcessor.processEffectChain.

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

function _generateOutcome(card, target) {
  const effect = card.effects?.[0];
  const targetName = target ? (target.name || target.id) : 'N/A';
  if (!effect) return 'Card effect applied.';
  if (effect.type === 'DRAW') return `Drew ${effect.value} card(s).`;
  if (effect.type === 'GAIN_ENERGY') return `Gained ${effect.value} energy.`;
  if (effect.type === 'HEAL_HULL') return `Healed ${effect.value} hull on ${targetName}.`;
  if (effect.type === 'HEAL_SHIELDS') return `Healed ${effect.value} shields on ${targetName}.`;
  if (effect.type === 'READY_DRONE') return `Readied ${targetName}.`;
  if (effect.type === 'DAMAGE') {
    if (effect.targeting?.affectedFilter) return `Dealt ${effect.value} damage to filtered targets in ${targetName}.`;
    return `Dealt ${effect.value} damage to ${targetName}.`;
  }
  if (effect.type === 'MODIFY_STAT') {
    const mod = effect.mod;
    const durationText = mod.type === 'temporary' ? ' until the end of the turn' : ' permanently';
    return `Gave ${targetName} a ${mod.value > 0 ? '+' : ''}${mod.value} ${mod.stat} bonus${durationText}.`;
  }
  return 'Card effect applied.';
}

async function _processChainCardPlay(card, target, playerId, playerStates, placedSections, currentState, ctx, chainSelections = null) {
  debugLog('CARD_PLAY_TRACE', '[5] Entering chain engine', {
    card: card.name, playerId, targetId: target?.id,
    targetType: target?.name ? 'entity' : target?.id?.startsWith('lane') ? 'lane' : 'none',
    hasChainSelections: !!chainSelections, chainSelectionCount: chainSelections?.length,
  });

  const callbacks = {
    logCallback: (entry) => ctx.addLogEntry(entry),
    resolveAttackCallback: async (attackPayload) => ctx.processAttack(attackPayload),
    updateAurasCallback: gameEngine.updateAuras,
    actionsTakenThisTurn: currentState.actionsTakenThisTurn || 0
  };

  // Log the card play
  const logTarget = chainSelections?.[0]?.target || target;
  const outcome = _generateOutcome(card, logTarget);
  callbacks.logCallback({
    player: playerStates[playerId].name,
    actionType: 'PLAY_CARD',
    source: card.name,
    target: logTarget ? (logTarget.name || logTarget.id) : 'N/A',
    outcome,
  });

  // Use pre-built selections from chain UI, or build single-selection for simple cards
  let selections;
  if (chainSelections) {
    selections = chainSelections;
  } else {
    const lane = _findTargetLane(target, playerStates);
    selections = [{ target, lane }];
  }

  const result = getChainProcessor().processEffectChain(card, selections, playerId, {
    playerStates,
    placedSections,
    callbacks,
    localPlayerId: ctx.getLocalPlayerId(),
    gameMode: currentState.gameMode || 'local',
    gameSeed: currentState.gameSeed,
    roundNumber: currentState.roundNumber,
  });

  let animations;
  if (result.actionSteps) {
    debugLog('MOVEMENT_EFFECT', '[DIAG] CardActionStrategy: actionSteps path', {
      stateBeforeTriggersDrones: _snapshotDrones(result.stateBeforeTriggers),
      cardOnlyAnimationTypes: result.cardOnlyAnimationEvents?.map(e => e.type ?? e.animationName),
      actionStepCount: result.actionSteps.length,
    });

    // New path: card animations + structured trigger steps
    animations = ctx.mapAnimationEvents(result.cardOnlyAnimationEvents);
    ctx.captureAnimationsForBroadcast(animations);
    await ctx.executeAnimationPhase(animations, result.stateBeforeTriggers);

    // Play trigger steps through the structured action steps path
    await ctx.executeActionSteps(result.actionSteps);

    // Apply final state (after finishCardPlay - card in discard, turn state updated)
    ctx.setPlayerStates(result.newPlayerStates.player1, result.newPlayerStates.player2);
  } else {
    debugLog('MOVEMENT_EFFECT', '[DIAG] CardActionStrategy: flat animation path', {
      animationTypes: result.animationEvents?.map(e => e.type),
    });

    // Old path: flat animation array with STATE_SNAPSHOT/TRIGGER_CHAIN_PAUSE
    animations = ctx.mapAnimationEvents(result.animationEvents);
    ctx.captureAnimationsForBroadcast(animations);
    await ctx.executeAnimationPhase(animations, result.newPlayerStates);
  }

  ctx.checkWinCondition();

  debugLog('CARD_PLAY_TRACE', '[9] Post-chain complete', { card: card.name, shouldEndTurn: result.shouldEndTurn, animationCount: animations.length });

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
 * @param {Object} payload - { card, targetId, playerId, chainSelections? }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processCardPlay(payload, ctx) {
  const { card, targetId, playerId } = payload;

  debugLog('CARD_PLAY_TRACE', '[4] Resolving target from targetId', { card: card.name, targetId, playerId });

  const currentState = ctx.getState();
  const playerStates = { player1: currentState.player1, player2: currentState.player2 };
  const placedSections = {
    player1: currentState.placedSections,
    player2: currentState.opponentPlacedSections
  };

  // Look up full target object from targetId
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

  return _processChainCardPlay(card, target, playerId, playerStates, placedSections, currentState, ctx, payload.chainSelections || null);
}

/**
 * Process SEARCH_AND_DRAW card completion after player modal selection
 * Card costs are paid here (not during initial card play)
 * @param {Object} payload - { card, selectedCards, selectionData, playerId }
 * @param {Object} ctx - ActionContext from ActionProcessor
 */
export async function processSearchAndDrawCompletion(payload, ctx) {
  const { card, selectedCards, selectionData, playerId } = payload;

  debugLog('CARD_PLAY_TRACE', '[6] SearchAndDraw completion — costs paid', {
    card: card.name, playerId, selectedCount: selectedCards.length,
  });

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

  debugLog('CARD_PLAY_TRACE', '[8] SearchAndDraw finalized', {
    card: card.name, shouldEndTurn: completion.shouldEndTurn,
    selectedCards: selectedCards.map(c => c.name),
  });

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
