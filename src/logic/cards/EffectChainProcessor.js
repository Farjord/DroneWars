// --- Effect Chain Processor ---
// Commit-time engine for processing an effects[] chain.
// Takes a card, its resolved selections, and executes each effect in order
// through the existing EffectRouter/processor infrastructure.
// Selection-time helpers (PositionTracker, ref resolution) also live here.

import EffectRouter from '../EffectRouter.js';
import ConditionalEffectProcessor from '../effects/conditional/ConditionalEffectProcessor.js';
import MovementEffectProcessor from '../effects/MovementEffectProcessor.js';
import { debugLog } from '../../utils/debugLogger.js';

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

// Chain effects include targeting, conditionals, prompt, and destination
// that are NOT part of the EffectRouter effect interface.
const CHAIN_ONLY_FIELDS = new Set(['targeting', 'conditionals', 'prompt', 'destination']);

function stripChainFields(chainEffect) {
  const result = {};
  for (const key of Object.keys(chainEffect)) {
    if (!CHAIN_ONLY_FIELDS.has(key)) result[key] = chainEffect[key];
  }
  return result;
}

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

// Only checks board entities (drones). Non-board targets (cards in hand, lanes) always pass.
function isTargetAlive(target, playerStates) {
  if (!target || !target.id) return true;
  // Only drones have hull — skip alive check for non-drone targets (cards, lanes)
  if (!('hull' in target)) return true;
  for (const playerId of ['player1', 'player2']) {
    const board = playerStates[playerId]?.dronesOnBoard || {};
    for (const lane of ['lane1', 'lane2', 'lane3']) {
      if ((board[lane] || []).some(d => d.id === target.id)) return true;
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
   * @param {Object} ctx - { playerStates, placedSections, callbacks, localPlayerId, gameMode }
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents }
   */
  processEffectChain(card, selections, playerId, ctx) {
    const { playerStates, placedSections, callbacks } = ctx;
    const effects = card.effects;

    debugLog('EFFECT_CHAIN', `▶️ processEffectChain: ${card.name} (${effects.length} effects)`, {
      cardId: card.id,
      playerId,
      selectionCount: selections.length,
    });

    // 1. Pay card costs
    let currentStates = this.payCardCosts(card, playerId, playerStates);
    const allAnimationEvents = [];
    let dynamicGoAgain = false;
    const effectResults = [];

    // CARD_REVEAL animation
    allAnimationEvents.push({
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
        allAnimationEvents.push({
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

    // 2. Process each effect in order
    for (let i = 0; i < effects.length; i++) {
      const chainEffect = effects[i];
      const selection = selections[i];

      // Skip if no selection (earlier referenced effect was skipped)
      if (!selection || selection.skipped) {
        effectResults.push(null);
        debugLog('EFFECT_CHAIN', `  [${i}] skipped — no selection`);
        continue;
      }

      // Check if target is still alive (trigger invalidation from earlier effects)
      if (selection.target && selection.target.id && !isTargetAlive(selection.target, currentStates)) {
        effectResults.push(null);
        debugLog('EFFECT_CHAIN', `  [${i}] skipped — target invalidated`, { targetId: selection.target.id });
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
          { target: selection.target, actingPlayerId: playerId, playerStates: currentStates, placedSections, callbacks, card }
        );
        effectData = preResult.modifiedEffect;
        currentStates = preResult.newPlayerStates;

        // Process additional effects from PRE conditionals (e.g., queued DESTROY)
        for (const addEffect of (preResult.additionalEffects || [])) {
          const addResult = this.effectRouter.routeEffect(addEffect, {
            target: selection.target, actingPlayerId: playerId, playerStates: currentStates, placedSections, callbacks, card,
          });
          if (addResult) {
            currentStates = addResult.newPlayerStates;
            allAnimationEvents.push(...(addResult.animationEvents || []));
          }
        }
      }

      // Route effect through the appropriate processor
      let result;
      if (effectData.type === 'SINGLE_MOVE' || effectData.type === 'MULTI_MOVE') {
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
          gameMode: ctx.gameMode || 'local',
        };
        result = this.effectRouter.routeEffect(effectData, routerContext);
        if (!result) {
          debugLog('EFFECT_CHAIN', `  [${i}] no processor for ${effectData.type} — skipping`);
          effectResults.push(null);
          continue;
        }
      }

      currentStates = result.newPlayerStates;
      allAnimationEvents.push(...(result.animationEvents || []));

      // Resolve POST conditionals
      if (conditionals && conditionals.length > 0) {
        const postContext = {
          target: selection.target,
          actingPlayerId: playerId,
          playerStates: currentStates,
          placedSections,
          callbacks,
          card,
        };
        const postResult = this.conditionalProcessor.processPostConditionals(
          conditionals, postContext, result.effectResult || null
        );
        currentStates = postResult.newPlayerStates;
        allAnimationEvents.push(...(postResult.animationEvents || []));
        if (postResult.grantsGoAgain) dynamicGoAgain = true;

        for (const addEffect of (postResult.additionalEffects || [])) {
          const addResult = this.effectRouter.routeEffect(addEffect, {
            target: selection.target, actingPlayerId: playerId, playerStates: currentStates, placedSections, callbacks, card,
          });
          if (addResult) {
            currentStates = addResult.newPlayerStates;
            allAnimationEvents.push(...(addResult.animationEvents || []));
          }
        }
      }

      // Propagate goAgain from movement effects (Rally Beacon)
      if (result.goAgain) dynamicGoAgain = true;

      // Store execution result for back-references
      effectResults.push({
        target: selection.target,
        sourceLane: selection.lane,
        destinationLane: selection.destination,
        cardCost: selection.target?.cost ?? null,
        effectResult: result.effectResult || null,
      });

      debugLog('EFFECT_CHAIN', `  [${i}] ${effectData.type} completed`, {
        targetId: selection.target?.id,
        lane: selection.lane,
      });
    }

    // 3. Finalize: discard card, determine shouldEndTurn
    const finish = this.finishCardPlay(card, playerId, currentStates, dynamicGoAgain);

    debugLog('EFFECT_CHAIN', `✅ processEffectChain complete: ${card.name}`, {
      shouldEndTurn: finish.shouldEndTurn,
      animationCount: allAnimationEvents.length,
      effectsProcessed: effectResults.filter(r => r !== null).length,
      effectsSkipped: effectResults.filter(r => r === null).length,
    });

    return {
      newPlayerStates: finish.newPlayerStates,
      shouldEndTurn: finish.shouldEndTurn,
      animationEvents: allAnimationEvents,
    };
  }

  /**
   * Execute a SINGLE_MOVE or MULTI_MOVE during commit.
   * Bypasses MovementEffectProcessor.process() (which returns needsCardSelection)
   * and calls executeSingleMove/executeMultiMove directly.
   */
  executeChainMovement(effectData, selection, playerId, playerStates, ctx) {
    const { placedSections, callbacks } = ctx;
    const opponentId = playerId === 'player1' ? 'player2' : 'player1';
    const newStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2)),
    };

    // Build a card-like object for MovementEffectProcessor (it reads card.effect)
    const pseudoCard = { name: 'Effect Chain', effect: effectData };
    const moveContext = { callbacks, placedSections };

    if (effectData.type === 'SINGLE_MOVE') {
      const result = this.movementProcessor.executeSingleMove(
        pseudoCard, selection.target, selection.lane, selection.destination,
        playerId, newStates, opponentId, moveContext
      );
      if (result.error) {
        debugLog('EFFECT_CHAIN', `  movement error: ${result.error}`);
        return { newPlayerStates: playerStates, animationEvents: [], effectResult: null };
      }
      return {
        newPlayerStates: result.newPlayerStates,
        animationEvents: [...(result.healAnimationEvents || []), ...(result.mineAnimationEvents || [])],
        effectResult: result.effectResult,
        goAgain: !result.shouldEndTurn,
      };
    }

    // MULTI_MOVE
    const drones = Array.isArray(selection.target) ? selection.target : [selection.target];
    const result = this.movementProcessor.executeMultiMove(
      pseudoCard, drones, selection.lane, selection.destination,
      playerId, newStates, opponentId, moveContext
    );
    if (result.error) {
      return { newPlayerStates: playerStates, animationEvents: [], effectResult: null };
    }
    return {
      newPlayerStates: result.newPlayerStates,
      animationEvents: [...(result.healAnimationEvents || []), ...(result.mineAnimationEvents || [])],
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
export { PositionTracker, resolveRef, resolveRefFromSelections, stripChainFields };
