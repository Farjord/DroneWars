// --- useEffectChain ---
// Manages effect chain UI state for sequential effect selection.
// Handles state transitions, selection accumulation, auto-advancing,
// and position tracking for multi-effect card plays.

import { useState, useCallback } from 'react';
import { PositionTracker } from '../logic/cards/EffectChainProcessor.js';
import {
  computeChainTargets,
  computeDestinationTargets,
  isCompoundEffect,
  hasSkippedRef,
} from '../logic/cards/chainTargetResolver.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * Advance through effects that don't need user selection.
 * Auto-selects NONE targeting, skips effects with broken refs or zero valid targets.
 * Returns the next state requiring user input, or a complete state.
 */
function advanceToNextSelection(state, context) {
  let idx = state.currentIndex;
  let sels = [...state.selections];
  const { effects, positionTracker } = state;

  while (idx < effects.length) {
    const effect = effects[idx];

    if (hasSkippedRef(effect, sels)) {
      sels.push({ target: null, lane: null, skipped: true });
      debugLog('EFFECT_CHAIN', `  [${idx}] auto-skipped — broken ref`);
      idx++;
      continue;
    }

    if (effect.targeting?.type === 'NONE') {
      sels.push({ target: null, lane: null });
      debugLog('EFFECT_CHAIN', `  [${idx}] auto-selected — NONE targeting`);
      idx++;
      continue;
    }

    const validTargets = computeChainTargets(effect, idx, sels, positionTracker, context);
    if (validTargets.length === 0) {
      sels.push({ target: null, lane: null, skipped: true });
      debugLog('EFFECT_CHAIN', `  [${idx}] auto-skipped — zero valid targets`);
      idx++;
      continue;
    }

    return {
      ...state,
      currentIndex: idx,
      subPhase: 'target',
      selections: sels,
      pendingTarget: null,
      pendingLane: null,
      validTargets,
      prompt: effect.prompt || '',
      complete: false,
    };
  }

  return {
    ...state,
    currentIndex: idx,
    selections: sels,
    pendingTarget: null,
    pendingLane: null,
    validTargets: [],
    prompt: '',
    complete: true,
  };
}

/**
 * Hook for managing effect chain UI state.
 *
 * @param {Object} options
 * @param {Object} options.playerStates - { player1, player2 } game state
 * @param {string} options.actingPlayerId - 'player1' or 'player2'
 * @param {Function} options.getEffectiveStats - (drone) => stats with buffs applied
 * @returns {Object} Chain state and control functions
 */
const useEffectChain = ({ playerStates, actingPlayerId, getEffectiveStats }) => {
  const [chainState, setChainState] = useState(null);

  const makeContext = useCallback(() => ({
    actingPlayerId,
    playerStates,
    getEffectiveStats: getEffectiveStats || null,
  }), [actingPlayerId, playerStates, getEffectiveStats]);

  /**
   * Start an effect chain for a card.
   * @param {Object} card - Card with effects[] array
   * @param {Object|null} initialTarget - Pre-selected target for effect 0 (from drag)
   * @param {string|null} initialLane - Lane of the initial target
   */
  const startEffectChain = useCallback((card, initialTarget = null, initialLane = null) => {
    const effects = card.effects;
    if (!effects || effects.length === 0) return;

    debugLog('EFFECT_CHAIN', `▶️ startEffectChain: ${card.name}`, {
      effectCount: effects.length,
      hasInitialTarget: !!initialTarget,
    });

    const positionTracker = new PositionTracker(playerStates);
    const context = makeContext();
    const base = {
      card,
      effects,
      currentIndex: 0,
      subPhase: 'target',
      selections: [],
      pendingTarget: null,
      pendingLane: null,
      positionTracker,
      validTargets: [],
      prompt: '',
      complete: false,
    };

    if (initialTarget && effects.length > 0) {
      const effect = effects[0];

      if (isCompoundEffect(effect)) {
        const destTargets = computeDestinationTargets(
          effect.destination,
          { target: initialTarget, lane: initialLane },
          actingPlayerId
        );
        setChainState({
          ...base,
          subPhase: 'destination',
          pendingTarget: initialTarget,
          pendingLane: initialLane,
          validTargets: destTargets,
          prompt: effect.prompt || 'Select destination',
        });
        return;
      }

      // Non-compound: effect 0 complete
      setChainState(advanceToNextSelection({
        ...base,
        currentIndex: 1,
        selections: [{ target: initialTarget, lane: initialLane }],
      }, context));
      return;
    }

    setChainState(advanceToNextSelection(base, context));
  }, [playerStates, actingPlayerId, makeContext]);

  /**
   * Record a target selection for the current effect.
   */
  const selectChainTarget = useCallback((target, lane) => {
    if (!chainState) return;

    const effect = chainState.effects[chainState.currentIndex];
    debugLog('EFFECT_CHAIN', `🎯 selectChainTarget [${chainState.currentIndex}]`, {
      targetId: target?.id,
      lane,
      effectType: effect?.type,
    });

    if (isCompoundEffect(effect)) {
      const destTargets = computeDestinationTargets(
        effect.destination,
        { target, lane },
        actingPlayerId
      );
      setChainState(prev => ({
        ...prev,
        subPhase: 'destination',
        pendingTarget: target,
        pendingLane: lane,
        validTargets: destTargets,
        prompt: effect.prompt || 'Select destination',
      }));
      return;
    }

    // Non-compound: complete selection, advance
    if (effect.type === 'DISCARD_CARD' && target) {
      chainState.positionTracker.recordDiscard(target.id);
    }

    const context = makeContext();
    const newSelections = [...chainState.selections, { target, lane }];
    setChainState(advanceToNextSelection({
      ...chainState,
      currentIndex: chainState.currentIndex + 1,
      selections: newSelections,
    }, context));
  }, [chainState, actingPlayerId, makeContext]);

  /**
   * Record a destination selection for compound effects (SINGLE_MOVE/MULTI_MOVE).
   */
  const selectChainDestination = useCallback((destinationLane) => {
    if (!chainState || chainState.subPhase !== 'destination') return;

    debugLog('EFFECT_CHAIN', `📍 selectChainDestination [${chainState.currentIndex}]`, {
      destination: destinationLane,
      targetId: chainState.pendingTarget?.id,
    });

    if (chainState.pendingTarget?.id) {
      chainState.positionTracker.recordMove(chainState.pendingTarget.id, destinationLane);
    }

    const context = makeContext();
    const selection = {
      target: chainState.pendingTarget,
      lane: chainState.pendingLane,
      destination: destinationLane,
    };
    const newSelections = [...chainState.selections, selection];
    setChainState(advanceToNextSelection({
      ...chainState,
      currentIndex: chainState.currentIndex + 1,
      selections: newSelections,
    }, context));
  }, [chainState, makeContext]);

  /**
   * Cancel the effect chain — resets all state.
   */
  const cancelEffectChain = useCallback(() => {
    debugLog('EFFECT_CHAIN', '❌ cancelEffectChain');
    setChainState(null);
  }, []);

  return {
    effectChainState: chainState,
    startEffectChain,
    selectChainTarget,
    selectChainDestination,
    cancelEffectChain,
  };
};

export default useEffectChain;
