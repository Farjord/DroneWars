// --- Effect Chain Processor ---
// Commit-time engine for processing an effects[] chain.
// Takes a card, its resolved selections, and executes each effect in order
// through the existing EffectRouter/processor infrastructure.
// Selection-time helpers (PositionTracker, ref resolution) also live here.

import EffectRouter from '../EffectRouter.js';
import ConditionalEffectProcessor from '../effects/conditional/ConditionalEffectProcessor.js';
import MovementEffectProcessor from '../effects/MovementEffectProcessor.js';
import { debugLog } from '../../utils/debugLogger.js';
import { stripChainFields } from './chainConstants.js';
import TriggerProcessor from '../triggers/TriggerProcessor.js';
import { TRIGGER_TYPES } from '../triggers/triggerConstants.js';
import { buildAnimationSequence } from '../animations/AnimationSequenceBuilder.js';

// --- Selection-Time: Position Tracker ---

class PositionTracker {
  constructor(playerStates) {
    this.dronePositions = new Map();
    this.discardedCardIds = new Set();

    for (const playerId of ['player1', 'player2']) {
      const board = playerStates[playerId]?.dronesOnBoard || {};
      for (const lane of ['lane1', 'lane2', 'lane3']) {
        for (const drone of (board[lane] || [])) {
          this.dronePositions.set(drone.id, { lane, playerId });
        }
      }
    }
  }

  recordMove(droneId, toLane) {
    const pos = this.dronePositions.get(droneId);
    if (pos) this.dronePositions.set(droneId, { ...pos, lane: toLane });
  }

  recordDiscard(cardId) {
    this.discardedCardIds.add(cardId);
  }

  getDronePosition(droneId) {
    return this.dronePositions.get(droneId);
  }

  getDronesInLane(lane, playerId) {
    const result = [];
    for (const [id, pos] of this.dronePositions) {
      if (pos.lane === lane && pos.playerId === playerId) result.push(id);
    }
    return result;
  }

  isCardDiscarded(cardId) {
    return this.discardedCardIds.has(cardId);
  }
}

// --- Selection-Time: Reference Resolution ---

function resolveRefFromSelections(refObj, selections) {
  if (!refObj || typeof refObj !== 'object' || !('ref' in refObj)) return refObj;
  const { ref, field } = refObj;
  const selection = selections[ref];
  if (!selection) return null;

  switch (field) {
    case 'target': return selection.target;
    case 'sourceLane': return selection.lane;
    case 'destinationLane': return selection.destination;
    case 'cardCost': return selection.target?.cost ?? 0;
    default: return null;
  }
}

// --- Commit-Time: Reference Resolution ---

function resolveRef(refObj, effectResults) {
  if (!refObj || typeof refObj !== 'object' || !('ref' in refObj)) return refObj;
  const { ref, field } = refObj;
  const result = effectResults[ref];
  if (!result) return null;

  switch (field) {
    case 'target': return result.target;
    case 'sourceLane': return result.sourceLane;
    case 'destinationLane': return result.destinationLane;
    case 'cardCost': return result.cardCost ?? 0;
    default: return null;
  }
}

// --- Effect Data Helpers ---

function resolveEffectValues(effectData, effectResults) {
  const resolved = { ...effectData };
  if (resolved.mod) {
    const resolvedValue = resolveRef(resolved.mod.value, effectResults);
    if (resolvedValue !== resolved.mod.value) {
      resolved.mod = { ...resolved.mod, value: resolvedValue };
    }
  }
  return resolved;
}

// Checks board entities (drones, tech) and ship sections. Non-board targets (cards in hand, lanes) always pass.
function isTargetAlive(target, playerStates) {
  if (!target || !target.id) return true;
  // Only drones/ship sections/tech have hull — skip alive check for non-hull targets (cards, lanes)
  if (!('hull' in target)) return true;
  for (const playerId of ['player1', 'player2']) {
    // Check drones on board
    const board = playerStates[playerId]?.dronesOnBoard || {};
    for (const lane of ['lane1', 'lane2', 'lane3']) {
      if ((board[lane] || []).some(d => d.id === target.id)) return true;
    }
    // Check ship sections (target.id may be instance ID like 'BRIDGE_001', target.name is section key like 'bridge')
    const sections = playerStates[playerId]?.shipSections;
    if (sections?.[target.id] || sections?.[target.name]) return true;
    // Check tech slots
    const techSlots = playerStates[playerId]?.techSlots || {};
    for (const lane of ['lane1', 'lane2', 'lane3']) {
      if ((techSlots[lane] || []).some(t => t.id === target.id)) return true;
    }
  }
  return false;
}

// --- Main Processor ---

class EffectChainProcessor {
  constructor() {
    this.effectRouter = new EffectRouter();
    this.conditionalProcessor = new ConditionalEffectProcessor();
    this.movementProcessor = new MovementEffectProcessor();
    this.triggerProcessor = new TriggerProcessor();
  }

  /**
   * Remove a card from a player's hand and push it to their discard pile (in-place mutation).
   * Used to patch intermediate snapshots so the played card appears discarded during animations.
   */
  _removeCardFromSnapshot(playerStates, playerId, card) {
    const acting = playerStates[playerId];
    if (acting?.hand?.some(c => c.instanceId === card.instanceId)) {
      acting.hand = acting.hand.filter(c => c.instanceId !== card.instanceId);
      if (!acting.discardPile.some(c => c.instanceId === card.instanceId)) {
        acting.discardPile = [...acting.discardPile, card];
      }
    }
  }

  /**
   * Pay card costs (energy + momentum). Pure — returns new states.
   */
  payCardCosts(card, actingPlayerId, playerStates) {
    const newStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2)),
    };
    const acting = newStates[actingPlayerId];
    if (card.cost) acting.energy -= card.cost;
    if (card.momentumCost) acting.momentum = (acting.momentum || 0) - card.momentumCost;
    return newStates;
  }

  /**
   * Discard card from hand, determine shouldEndTurn. Pure — returns new states.
   */
  finishCardPlay(card, actingPlayerId, playerStates, dynamicGoAgain) {
    const newStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2)),
    };
    const acting = newStates[actingPlayerId];
    acting.hand = acting.hand.filter(c => c.instanceId !== card.instanceId);
    acting.discardPile.push(card);

    const hasGoAgain = card.effects?.some(e => e.goAgain) || dynamicGoAgain;
    return { newPlayerStates: newStates, shouldEndTurn: !hasGoAgain };
  }

  /**
   * Commit-time: process an entire effects[] chain.
   *
   * @param {Object} card - Card being played (must have effects[])
   * @param {Array} selections - Per-effect selections: [{ target, lane, destination? }, ...]
   * @param {string} playerId - Acting player ID
   * @param {Object} ctx - { playerStates, placedSections, callbacks, localPlayerId, isPlayerAI }
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents }
   */
  processEffectChain(card, selections, playerId, ctx) {
    const { playerStates, placedSections, callbacks } = ctx;
    const effects = card.effects;

    // 1. Pay card costs
    let currentStates = this.payCardCosts(card, playerId, playerStates);

    debugLog('CARD_PLAY_TRACE', '[6] Chain started, costs paid', {
      card: card.name, cardId: card.id, playerId,
      energyCost: card.cost ?? 0, momentumCost: card.momentumCost ?? 0,
      effectCount: effects.length, selectionCount: selections.length,
    });
    const cardPreambleEvents = [];        // CARD_REVEAL, CARD_VISUAL (prepended to first step)
    const effectAnimSteps = [];            // per-effect animation steps for buildAnimationSequence
    const isMultiEffectChain = effects.length > 1;
    let dynamicGoAgain = false;
    const effectResults = [];

    // CARD_REVEAL animation
    cardPreambleEvents.push({
      type: 'CARD_REVEAL',
      cardId: card.id,
      cardName: card.name,
      cardData: card,
      targetPlayer: playerId,
      timestamp: Date.now(),
    });

    // CARD_VISUAL animation (if card has visualEffect and a board target)
    if (card.visualEffect && selections[0]?.target) {
      const sel0 = selections[0];
      const t = sel0.target;
      let targetPlayer = null;
      let targetLane = null;
      let targetType = null;

      if (t.id === 'lane1' || t.id === 'lane2' || t.id === 'lane3') {
        const affinity = effects[0]?.targeting?.affinity || 'ANY';
        if (affinity === 'ENEMY') {
          targetPlayer = playerId === 'player1' ? 'player2' : 'player1';
        } else if (affinity === 'ANY') {
          targetPlayer = 'center';
        }
        targetLane = t.id;
        targetType = 'lane';
      } else {
        for (const pid of ['player1', 'player2']) {
          const board = currentStates[pid]?.dronesOnBoard || {};
          for (const lane of ['lane1', 'lane2', 'lane3']) {
            if ((board[lane] || []).some(d => d.id === t.id)) {
              targetPlayer = pid;
              targetLane = lane;
              targetType = 'drone';
              break;
            }
          }
          if (targetPlayer) break;
        }
        if (!targetPlayer) {
          for (const pid of ['player1', 'player2']) {
            const sections = currentStates[pid]?.shipSections || {};
            if (sections[t.name] || sections[t.id]) {
              targetPlayer = pid;
              targetType = 'section';
              break;
            }
          }
        }
      }

      if (targetPlayer && targetType) {
        cardPreambleEvents.push({
          type: 'CARD_VISUAL',
          cardId: card.id,
          cardName: card.name,
          visualType: card.visualEffect.type,
          sourceId: playerId === 'player1' ? 'player1-hand' : 'player2-hand',
          sourcePlayer: playerId,
          targetId: t.id,
          targetPlayer,
          targetLane,
          targetType,
          timestamp: Date.now(),
        });
      }
    }

    // Post-cost STATE_SNAPSHOT: when a card has a cost, emit an intermediate state
    // so usePrevious-based KPI popups can detect the energy/momentum decrease before
    // effects (which may restore resources) apply.
    const hasCost = (card.cost > 0) || (card.momentumCost > 0);
    if (hasCost) {
      effectAnimSteps.push({
        actionEvents: [...cardPreambleEvents],
        triggerEvents: [],
        intermediateState: JSON.parse(JSON.stringify(currentStates)),
        postSnapshotEvents: [],
      });
    }

    // 2. Process each effect in order
    for (let i = 0; i < effects.length; i++) {
      const chainEffect = effects[i];
      const selection = selections[i];
      const preEffectEvents = []; // PRE conditional side-effect animations

      // Skip if no selection (earlier referenced effect was skipped)
      if (!selection || selection.skipped) {
        effectResults.push(null);
        debugLog('CARD_PLAY_TRACE', `[7] Effect [${i}] skipped — no selection`, { card: card.name });
        continue;
      }

      // Check if target is still alive (trigger invalidation from earlier effects)
      // Skip for NONE-targeting effects — target is metadata (e.g., upgrade drone type), not a board dependency
      const needsAliveCheck = chainEffect.targeting?.type !== 'NONE';
      if (needsAliveCheck && selection.target && selection.target.id && !isTargetAlive(selection.target, currentStates)) {
        effectResults.push(null);
        debugLog('CARD_PLAY_TRACE', `[7] Effect [${i}] skipped — target invalidated`, { card: card.name, targetId: selection.target.id });
        continue;
      }

      // Strip chain-only fields to get pure effect for EffectRouter
      let effectData = stripChainFields(chainEffect);
      effectData = resolveEffectValues(effectData, effectResults);

      // Resolve PRE conditionals
      const conditionals = chainEffect.conditionals;
      if (conditionals && conditionals.length > 0) {
        const preResult = this.conditionalProcessor.processPreConditionals(
          conditionals, effectData,
          { target: selection.target, actingPlayerId: playerId, playerStates: currentStates, placedSections, callbacks, card, actionsTakenThisTurn: callbacks?.actionsTakenThisTurn || 0 }
        );
        effectData = preResult.modifiedEffect;
        currentStates = preResult.newPlayerStates;

        // Process additional effects from PRE conditionals (e.g., queued DESTROY)
        for (const addEffect of (preResult.additionalEffects || [])) {
          const addResult = this.effectRouter.routeEffect(addEffect, {
            target: selection.target, actingPlayerId: playerId, playerStates: currentStates, placedSections, callbacks, card,
            gameSeed: ctx.gameSeed, roundNumber: ctx.roundNumber,
          });
          if (addResult) {
            currentStates = addResult.newPlayerStates;
            preEffectEvents.push(...(addResult.animationEvents || []));
          }
          debugLog('CARD_PLAY_TRACE', `[7] Effect [${i}] conditional side-effect: ${addEffect.type}`, { card: card.name, processed: !!addResult });
        }
      }

      // Route effect through the appropriate processor
      let result;
      if (effectData.type === 'SINGLE_MOVE') {
        result = this.executeChainMovement(effectData, selection, playerId, currentStates, ctx);
      } else if (effectData.type === 'DISCARD_CARD') {
        result = this.executeChainDiscard(selection, playerId, currentStates);
      } else {
        const routerContext = {
          target: selection.target,
          actingPlayerId: playerId,
          playerStates: currentStates,
          placedSections,
          callbacks,
          card,
          localPlayerId: ctx.localPlayerId || 'player1',
          isPlayerAI: ctx.isPlayerAI,
          gameSeed: ctx.gameSeed,
          roundNumber: ctx.roundNumber,
        };
        result = this.effectRouter.routeEffect(effectData, routerContext);
        if (!result) {
          debugLog('CARD_PLAY_TRACE', `[7] Effect [${i}] skipped — no processor`, { card: card.name, effectType: effectData.type });
          effectResults.push(null);
          continue;
        }

        // If effect needs client-side selection (e.g. SEARCH_AND_DRAW for human), pause the chain
        if (result.needsCardSelection) {
          return {
            newPlayerStates: playerStates, // Return ORIGINAL states (pre-cost) — completion handler pays costs
            shouldEndTurn: false,
            animationEvents: [],
            needsCardSelection: result.needsCardSelection,
          };
        }
      }

      currentStates = result.newPlayerStates;
      const effectActionEvents = [...(result.animationEvents || [])];
      const effectTriggerEvents = [...(result.triggerAnimationEvents || [])];

      // Resolve POST conditionals
      if (conditionals && conditionals.length > 0) {
        const postContext = {
          target: selection.target,
          actingPlayerId: playerId,
          playerStates: currentStates,
          placedSections,
          callbacks,
          card,
          actionsTakenThisTurn: callbacks?.actionsTakenThisTurn || 0,
        };
        const postResult = this.conditionalProcessor.processPostConditionals(
          conditionals, postContext, result.effectResult || null
        );
        currentStates = postResult.newPlayerStates;
        effectActionEvents.push(...(postResult.animationEvents || []));
        if (postResult.grantsGoAgain) {
          dynamicGoAgain = true;
          debugLog('CARD_PLAY_TRACE', `[7] Effect [${i}] conditional granted goAgain`, { card: card.name });
        }

        for (const addEffect of (postResult.additionalEffects || [])) {
          const addResult = this.effectRouter.routeEffect(addEffect, {
            target: selection.target, actingPlayerId: playerId, playerStates: currentStates, placedSections, callbacks, card,
            gameSeed: ctx.gameSeed, roundNumber: ctx.roundNumber,
          });
          if (addResult) {
            currentStates = addResult.newPlayerStates;
            effectActionEvents.push(...(addResult.animationEvents || []));
          }
          debugLog('CARD_PLAY_TRACE', `[7] Effect [${i}] conditional side-effect: ${addEffect.type}`, { card: card.name, processed: !!addResult });
        }
      }

      // Propagate goAgain from movement effects (Rally Beacon)
      if (result.goAgain) dynamicGoAgain = true;

      // Collect per-effect animation step
      const allEffectActionEvents = [...preEffectEvents, ...effectActionEvents];
      const teleportEvents = allEffectActionEvents.filter(e => e.type === 'TELEPORT_IN');
      const nonTeleportEvents = allEffectActionEvents.filter(e => e.type !== 'TELEPORT_IN');

      // Capture intermediate state for this effect's STATE_SNAPSHOT
      const intermediateState = (isMultiEffectChain || effectTriggerEvents.length > 0)
        ? (result.preTriggerState || JSON.parse(JSON.stringify(currentStates)))
        : null;

      effectAnimSteps.push({
        actionEvents: effectAnimSteps.length === 0
          ? [...cardPreambleEvents, ...nonTeleportEvents]
          : nonTeleportEvents,
        triggerEvents: effectTriggerEvents,
        intermediateState,
        postSnapshotEvents: teleportEvents,
        effectIndex: i,
      });

      // Store execution result for back-references
      effectResults.push({
        target: selection.target,
        sourceLane: selection.lane,
        destinationLane: selection.destination,
        cardCost: selection.target?.cost ?? null,
        effectResult: result.effectResult || null,
      });

      debugLog('CARD_PLAY_TRACE', `[7] Effect [${i}] ${effectData.type} complete`, {
        card: card.name, targetId: selection.target?.id, lane: selection.lane,
        value: effectData.value ?? effectData.mod?.value ?? null,
        processor: this.effectRouter.processors?.[effectData.type]?.constructor.name,
      });

    }

    // Fire ON_CARD_PLAY triggers after effects resolve, before finalizing.
    // Lane comes from first selection — multi-lane cards use first target's lane for SAME_LANE matching.
    const cardPlayLane = selections[0]?.lane ?? null;
    const preCardPlayState = JSON.parse(JSON.stringify(currentStates));
    const cardPlayResult = this.triggerProcessor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
      lane: cardPlayLane,
      triggeringPlayerId: playerId,
      actingPlayerId: playerId,
      card,
      playerStates: currentStates,
      placedSections,
      logCallback: callbacks.logCallback
    });
    if (cardPlayResult.triggered) {
      currentStates = cardPlayResult.newPlayerStates;
      // Add ON_CARD_PLAY triggers as final step with pre-trigger state snapshot
      effectAnimSteps.push({
        actionEvents: [],
        triggerEvents: [...cardPlayResult.animationEvents],
        intermediateState: preCardPlayState,
        postSnapshotEvents: [],
      });
    }
    // Build animation sequence via centralized builder
    const allAnimationEvents = buildAnimationSequence(effectAnimSteps);

    debugLog('TRIGGERS', 'Animation pipeline:', {
      steps: effectAnimSteps.length,
      totalEvents: allAnimationEvents.length,
    });

    // Post-process STATE_SNAPSHOT events: remove played card from hand so it appears
    // discarded during trigger animations (card is still in hand in intermediate states
    // because finishCardPlay hasn't run yet)
    for (const event of allAnimationEvents) {
      if (event.type === 'STATE_SNAPSHOT' && event.snapshotPlayerStates) {
        this._removeCardFromSnapshot(event.snapshotPlayerStates, playerId, card);
      }
    }

    // 3. Finalize: discard card, determine shouldEndTurn
    const finish = this.finishCardPlay(card, playerId, currentStates, dynamicGoAgain);

    debugLog('CARD_PLAY_TRACE', '[8] Chain finalized', {
      card: card.name, shouldEndTurn: finish.shouldEndTurn,
      effectsProcessed: effectResults.filter(r => r !== null).length,
      effectsSkipped: effectResults.filter(r => r === null).length,
      animationCount: allAnimationEvents.length,
      effectStepCount: effectAnimSteps.length,
    });

    return {
      newPlayerStates: finish.newPlayerStates,
      shouldEndTurn: finish.shouldEndTurn,
      animationEvents: allAnimationEvents,
    };
  }

  /**
   * Execute a SINGLE_MOVE during commit.
   * Bypasses MovementEffectProcessor.process() (which returns needsCardSelection)
   * and calls executeSingleMove directly.
   */
  executeChainMovement(effectData, selection, playerId, playerStates, ctx) {
    const { placedSections, callbacks } = ctx;
    const opponentId = playerId === 'player1' ? 'player2' : 'player1';
    const newStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2)),
    };

    // Build a card-like object for MovementEffectProcessor (it reads card.effects[0])
    const pseudoCard = { name: 'Effect Chain', effects: [effectData] };
    const moveContext = { callbacks, placedSections };

    const result = this.movementProcessor.executeSingleMove(
      pseudoCard, selection.target, selection.lane, selection.destination,
      playerId, newStates, opponentId, moveContext
    );

    if (result.error) {
      debugLog('CARD_PLAY_TRACE', '[7] Effect movement error', { error: result.error });
      return { newPlayerStates: playerStates, animationEvents: result.animationEvents || [], effectResult: null };
    }
    return {
      newPlayerStates: result.newPlayerStates,
      animationEvents: result.animationEvents || [],
      triggerAnimationEvents: [...(result.triggerAnimationEvents || []), ...(result.mineAnimationEvents || [])],
      preTriggerState: result.postMovementState,
      effectResult: result.effectResult,
      goAgain: !result.shouldEndTurn,
    };
  }

  /**
   * Execute a DISCARD_CARD effect during commit (used as effect[0] in cost chains).
   */
  executeChainDiscard(selection, playerId, playerStates) {
    const newStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2)),
    };
    const acting = newStates[playerId];
    const cardToDiscard = selection.target;

    const idx = acting.hand.findIndex(c => c.id === cardToDiscard.id);
    if (idx !== -1) {
      acting.hand.splice(idx, 1);
      acting.discardPile.push(cardToDiscard);
    }

    return {
      newPlayerStates: newStates,
      animationEvents: [{
        type: 'CARD_DISCARD',
        playerId,
        cardId: cardToDiscard.id,
        cardName: cardToDiscard.name,
      }],
      effectResult: { discardedCard: cardToDiscard, cardCost: cardToDiscard.cost },
    };
  }
}

export default EffectChainProcessor;
export { PositionTracker, resolveRef, resolveRefFromSelections };
