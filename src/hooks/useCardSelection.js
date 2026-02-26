// --- useCardSelection ---
// Manages card selection UI state: selected card, targeting, and effect chain flows.
// Extracted from App.jsx Phase C (Step 9).

import { useState, useCallback, useEffect } from 'react';
import { debugLog } from '../utils/debugLogger.js';
import { calculateAllValidTargets } from '../logic/targeting/uiTargetingHelpers.js';
import useEffectChain from './useEffectChain.js';

const useCardSelection = ({
  processActionWithGuestRouting,
  getLocalPlayerId,
  gameState,
  gameDataService,
  abilityMode,
  setAbilityMode,
  shipAbilityMode,
  setShipAbilityMode,
  setSelectedDrone,
}) => {
  // --- State ---
  const [selectedCard, setSelectedCard] = useState(null);
  const [validCardTargets, setValidCardTargets] = useState([]);
  const [validAbilityTargets, setValidAbilityTargets] = useState([]);
  const [affectedDroneIds, setAffectedDroneIds] = useState([]);
  const [hoveredLane, setHoveredLane] = useState(null);
  const [cardConfirmation, setCardConfirmation] = useState(null);
  const [destroyUpgradeModal, setDestroyUpgradeModal] = useState(null);
  const [upgradeSelectionModal, setUpgradeSelectionModal] = useState(null);
  const [viewUpgradesModal, setViewUpgradesModal] = useState(null);

  // Effect chain state — unified sequential effect selection
  const {
    effectChainState,
    startEffectChain,
    selectChainTarget,
    selectChainDestination,
    selectChainMultiTarget,
    confirmChainMultiSelect,
    cancelEffectChain,
  } = useEffectChain({
    playerStates: gameState ? { player1: gameState.player1, player2: gameState.player2 } : {},
    actingPlayerId: getLocalPlayerId(),
    getEffectiveStats: gameDataService?.getEffectiveStats?.bind(gameDataService) || null,
  });

  // --- Cancel/Confirm Functions ---

  const cancelCardSelection = useCallback((callerInfo = 'unknown') => {
    if (import.meta.env.DEV) {
      debugLog('BUTTON_CLICKS', '🚨 cancelCardSelection CALLED', {
        timestamp: performance.now(),
        caller: callerInfo,
        selectedCardExists: selectedCard !== null,
      });
    }

    setSelectedCard(null);
    setValidCardTargets([]);
    setAffectedDroneIds([]);
    cancelEffectChain();
  }, [selectedCard, cancelEffectChain]);

  // Convenience function for cancelAllActions in App.jsx
  const cancelCardState = useCallback(() => {
    setSelectedCard(null);
    setAffectedDroneIds([]);
  }, []);

  // --- Effects ---

  // Targeting calculations — computes valid targets for all active selection modes
  useEffect(() => {
    debugLog('TARGETING_PROCESSING', '🎯 TARGETING USEEFFECT TRIGGERED', {
      selectedCard: selectedCard?.name || null,
      selectedCardId: selectedCard?.id || null,
      abilityMode: abilityMode?.drone?.name || null,
      shipAbilityMode: shipAbilityMode?.sectionName || null,
      willSkipCalculation: !selectedCard && !abilityMode && !shipAbilityMode && !effectChainState
    });

    if (!selectedCard && !abilityMode && !shipAbilityMode && !effectChainState) {
      setValidAbilityTargets([]);
      setValidCardTargets([]);
      return;
    }

    // Effect chain phase — valid targets computed by useEffectChain
    if (effectChainState && !effectChainState.complete) {
      setValidAbilityTargets([]);
      setValidCardTargets(effectChainState.validTargets);
      return;
    }

    const { validAbilityTargets, validCardTargets } = calculateAllValidTargets(
      abilityMode,
      shipAbilityMode,
      selectedCard,
      gameState.player1,
      gameState.player2,
      getLocalPlayerId(),
      gameDataService.getEffectiveStats.bind(gameDataService)
    );

    setValidAbilityTargets(validAbilityTargets);
    setValidCardTargets(validCardTargets);

    if (abilityMode) {
      setSelectedCard(null);
      setShipAbilityMode(null);
    }
  }, [abilityMode, shipAbilityMode, selectedCard, effectChainState]);

  // Effect chain auto-commit — when all selections are gathered, dispatch the card play
  useEffect(() => {
    debugLog('CARD_PLAY_TRACE', '[1.4] Auto-commit useEffect fired', {
      hasChainState: !!effectChainState,
      complete: effectChainState?.complete,
      card: effectChainState?.card?.name,
    });

    if (!effectChainState?.complete) return;

    const { card, selections } = effectChainState;
    // Build chainSelections for the engine (convert chain format to engine format)
    const chainSelections = selections.map(sel => ({
      target: sel.target,
      lane: sel.lane,
      destination: sel.destination || null,
      skipped: sel.skipped || false,
    }));

    debugLog('CARD_PLAY_TRACE', '[1.5] Auto-commit dispatching', {
      card: card.name, selectionCount: chainSelections.length,
      targetId: chainSelections[0]?.target?.id,
      selections: chainSelections.map((s, i) => ({
        i, targetId: s.target?.id, lane: s.lane, dest: s.destination, skipped: s.skipped
      })),
    });

    // Wrap in async IIFE to await dispatch before cleaning up
    (async () => {
      try {
        await processActionWithGuestRouting('cardPlay', {
          card,
          targetId: chainSelections[0]?.target?.id || null,
          playerId: getLocalPlayerId(),
          chainSelections,
        });
      } catch (err) {
        debugLog('EFFECT_CHAIN_DEBUG', '[AUTO-COMMIT] Dispatch failed', {
          error: err.message, stack: err.stack,
        });
      } finally {
        cancelEffectChain();
        setSelectedCard(null);
        setValidCardTargets([]);
      }
    })();
  }, [effectChainState, processActionWithGuestRouting, getLocalPlayerId, cancelEffectChain]);

  return {
    // State values
    selectedCard,
    validCardTargets,
    validAbilityTargets,
    affectedDroneIds,
    hoveredLane,
    cardConfirmation,
    destroyUpgradeModal,
    upgradeSelectionModal,
    viewUpgradesModal,

    // State setters (needed by App.jsx handlers that stay in parent)
    setSelectedCard,
    setValidCardTargets,
    setValidAbilityTargets,
    setAffectedDroneIds,
    setHoveredLane,
    setCardConfirmation,
    setDestroyUpgradeModal,
    setUpgradeSelectionModal,
    setViewUpgradesModal,

    // Functions
    cancelCardSelection,
    cancelCardState,

    // Effect chain (unified sequential effect selection)
    effectChainState,
    startEffectChain,
    selectChainTarget,
    selectChainDestination,
    selectChainMultiTarget,
    confirmChainMultiSelect,
    cancelEffectChain,
  };
};

export default useCardSelection;
