// --- useCardSelection ---
// Manages card selection UI state: selected card, targeting, multi-select flows,
// additional cost card flows, and card-specific cancel/confirm operations.
// Extracted from App.jsx Phase C (Step 9).

import { useState, useCallback, useEffect } from 'react';
import { debugLog } from '../utils/debugLogger.js';
import { calculateAllValidTargets, resolveSecondaryTargets } from '../logic/targeting/uiTargetingHelpers.js';

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
  setCostReminderArrowState,
  multiSelectFlowInProgress,
  additionalCostFlowInProgress,
}) => {
  // --- State ---
  const [selectedCard, setSelectedCard] = useState(null);
  const [validCardTargets, setValidCardTargets] = useState([]);
  const [validAbilityTargets, setValidAbilityTargets] = useState([]);
  const [affectedDroneIds, setAffectedDroneIds] = useState([]);
  const [hoveredLane, setHoveredLane] = useState(null);
  const [cardConfirmation, setCardConfirmation] = useState(null);
  const [singleMoveMode, setSingleMoveMode] = useState(null);
  const [additionalCostState, setAdditionalCostState] = useState(null);
  const [additionalCostConfirmation, setAdditionalCostConfirmation] = useState(null);
  const [additionalCostSelectionContext, setAdditionalCostSelectionContext] = useState(null);
  const [destroyUpgradeModal, setDestroyUpgradeModal] = useState(null);
  const [upgradeSelectionModal, setUpgradeSelectionModal] = useState(null);
  const [viewUpgradesModal, setViewUpgradesModal] = useState(null);

  // Secondary targeting state for cards with secondaryTargeting field
  // { card, primaryTarget, primaryLane, primaryOwner, phase: 'secondary' }
  const [secondaryTargetingState, setSecondaryTargetingState] = useState(null);

  // Multi-select state with logged setter for debugging
  const [multiSelectStateRaw, setMultiSelectStateRaw] = useState(null);
  const multiSelectState = multiSelectStateRaw;
  const setMultiSelectState = useCallback((value) => {
    if (import.meta.env.DEV) {
      const timestamp = performance.now();
      const isFunction = typeof value === 'function';

      debugLog('BUTTON_CLICKS', '🔴 setMultiSelectState CALLED', {
        timestamp,
        valueType: typeof value,
        isUpdaterFunction: isFunction,
        directValue: isFunction ? 'UPDATER_FUNCTION' : value,
        callStack: new Error().stack.split('\n').slice(2, 4).join('\n')
      });
    }

    setMultiSelectStateRaw(value);
  }, []);

  // --- Cancel/Confirm Functions ---

  const enterSecondaryTargeting = useCallback((card, primaryTarget, primaryLane, primaryOwner) => {
    debugLog('SECONDARY_TARGETING', '🎯 Entering secondary targeting phase', {
      cardName: card.name,
      primaryTargetId: primaryTarget.id,
      primaryLane,
      primaryOwner
    });
    setSecondaryTargetingState({
      card,
      primaryTarget,
      primaryLane,
      primaryOwner,
      phase: 'secondary'
    });
  }, []);

  const cancelSecondaryTargeting = useCallback(() => {
    debugLog('SECONDARY_TARGETING', '🚨 cancelSecondaryTargeting CALLED');
    setSecondaryTargetingState(null);
    setSelectedCard(null);
    setValidCardTargets([]);
  }, []);

  const cancelSingleMoveMode = useCallback(() => {
    debugLog('SINGLE_MOVE_MODE', '🚨 cancelSingleMoveMode CALLED', {
      timestamp: performance.now(),
      hadSingleMoveMode: singleMoveMode !== null
    });
    setSingleMoveMode(null);
    setSelectedCard(null);
    setSelectedDrone(null);
    setValidCardTargets([]);
  }, [singleMoveMode, setSelectedDrone]);

  const cancelAdditionalCostMode = useCallback(() => {
    debugLog('ADDITIONAL_COST_UI', '🚨 Canceling additional cost mode');

    additionalCostFlowInProgress.current = false;
    setAdditionalCostState(null);
    setCostReminderArrowState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
    setSelectedCard(null);
    setValidCardTargets([]);
    setAffectedDroneIds([]);
  }, [additionalCostFlowInProgress, setCostReminderArrowState]);

  const cancelCardSelection = useCallback((callerInfo = 'unknown') => {
    if (import.meta.env.DEV) {
      debugLog('BUTTON_CLICKS', '🚨 cancelCardSelection CALLED', {
        timestamp: performance.now(),
        caller: callerInfo,
        additionalCostFlowRef: additionalCostFlowInProgress.current,
        multiSelectFlowRef: multiSelectFlowInProgress.current,
        multiSelectStateExists: multiSelectState !== null,
        selectedCardExists: selectedCard !== null,
        singleMoveModeExists: singleMoveMode !== null,
        additionalCostStateExists: additionalCostState !== null,
        additionalCostPhase: additionalCostState?.phase || 'none',
        callStack: new Error().stack.split('\n').slice(0, 10).join('\n')
      });
    }

    // Don't clear state if we're in additional cost flow (unless explicitly intended)
    if (additionalCostFlowInProgress.current && callerInfo !== 'user-cancel' && callerInfo !== 'confirm') {
      debugLog('BUTTON_CLICKS', '⏭️ Skipping cancelCardSelection - additional cost flow in progress', {
        caller: callerInfo,
        additionalCostPhase: additionalCostState?.phase || 'none'
      });
      return;
    }

    additionalCostFlowInProgress.current = false;
    multiSelectFlowInProgress.current = false;
    setSelectedCard(null);
    setMultiSelectState(null);
    setSingleMoveMode(null);
    setSecondaryTargetingState(null);
    setValidCardTargets([]);
    setAffectedDroneIds([]);
  }, [additionalCostFlowInProgress, multiSelectFlowInProgress, multiSelectState, selectedCard, singleMoveMode, additionalCostState, setMultiSelectState]);

  const confirmAdditionalCostCard = useCallback(async (card, costSelection, effectTarget) => {
    debugLog('ADDITIONAL_COST_UI', '✅ Confirming additional cost card', {
      cardName: card.name,
      costSelection,
      effectTarget
    });

    const result = await processActionWithGuestRouting('additionalCostCardPlay', {
      card,
      costSelection,
      effectTarget,
      playerId: getLocalPlayerId()
    });

    if (result && result.needsEffectSelection) {
      debugLog('ADDITIONAL_COST', '🔄 Entering effect selection mode', {
        cardName: card.name,
        selectionType: result.needsEffectSelection.selectionData.type
      });

      setAdditionalCostSelectionContext(result.needsEffectSelection);
      setAdditionalCostConfirmation(null);
      setAdditionalCostState(null);
      setCostReminderArrowState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
      setValidCardTargets([]);
      setAffectedDroneIds([]);

      if (result.needsEffectSelection.selectionData.type === 'single_move') {
        setMultiSelectState({
          active: true,
          card: card,
          phase: 'select_drone',
          maxDrones: 1,
          selectedDrones: [],
          doNotExhaust: result.needsEffectSelection.selectionData.doNotExhaust
        });
      }
      return;
    }

    additionalCostFlowInProgress.current = false;
    setAdditionalCostConfirmation(null);
    setAdditionalCostState(null);
    setCostReminderArrowState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
    setSelectedCard(null);
    setValidCardTargets([]);
    setAffectedDroneIds([]);
  }, [processActionWithGuestRouting, getLocalPlayerId, additionalCostFlowInProgress, setCostReminderArrowState, setMultiSelectState]);

  const handleCancelMultiMove = useCallback(() => {
    setMultiSelectState(null);
    setValidCardTargets([]);
    setSelectedCard(null);
  }, [setMultiSelectState]);

  const handleConfirmMultiMoveDrones = useCallback(() => {
    debugLog('CARD_PLAY', '🔵 MULTI_MOVE: handleConfirmMultiMoveDrones called', { timestamp: performance.now() });
    debugLog('CARD_PLAY', '   Current multiSelectState:', multiSelectState);

    if (!multiSelectState) {
      debugLog('CARD_PLAY', '   ❌ Early return: multiSelectState is null/undefined');
      return;
    }

    if (multiSelectState.selectedDrones.length === 0) {
      debugLog('CARD_PLAY', '   ❌ Early return: No drones selected');
      return;
    }

    debugLog('CARD_PLAY', '   ✅ Validation passed. Selected drones:', multiSelectState.selectedDrones.length);

    const validDestinations = ['lane1', 'lane2', 'lane3']
      .filter(laneId => laneId !== multiSelectState.sourceLane)
      .map(laneId => ({ id: laneId, owner: getLocalPlayerId() }));

    debugLog('CARD_PLAY', '   📍 Calculated validDestinations:', validDestinations);
    debugLog('BUTTON_CLICKS', '   🔄 About to call setValidCardTargets (manual)', { timestamp: performance.now(), validDestinations });
    setValidCardTargets(validDestinations);
    debugLog('BUTTON_CLICKS', '   ✅ setValidCardTargets (manual) returned', { timestamp: performance.now() });

    debugLog('BUTTON_CLICKS', '   🔄 About to call setMultiSelectState', { timestamp: performance.now() });
    setMultiSelectState(prev => {
      const newState = { ...prev, phase: 'select_destination_lane' };
      debugLog('CARD_PLAY', '   ✅ New multiSelectState:', newState);
      return newState;
    });
    debugLog('BUTTON_CLICKS', '   ✅ setMultiSelectState returned', { timestamp: performance.now() });

    debugLog('CARD_PLAY', '   ✅ handleConfirmMultiMoveDrones completed', { timestamp: performance.now() });
  }, [multiSelectState, getLocalPlayerId, setMultiSelectState]);

  // Convenience function for cancelAllActions in App.jsx
  const cancelCardState = useCallback(() => {
    setSelectedCard(null);
    setMultiSelectState(null);
    setAffectedDroneIds([]);
  }, [setMultiSelectState]);

  // --- Effects ---

  // Targeting calculations — computes valid targets for all active selection modes
  useEffect(() => {
    debugLog('TARGETING_PROCESSING', '🎯 TARGETING USEEFFECT TRIGGERED', {
      selectedCard: selectedCard?.name || null,
      selectedCardId: selectedCard?.id || null,
      abilityMode: abilityMode?.drone?.name || null,
      shipAbilityMode: shipAbilityMode?.sectionName || null,
      multiSelectState_phase: multiSelectState?.phase || null,
      multiSelectState_sourceLane: multiSelectState?.sourceLane || null,
      multiSelectState_full: multiSelectState ? JSON.stringify(multiSelectState) : null,
      singleMoveMode_drone: singleMoveMode?.drone?.name || null,
      singleMoveMode_sourceLane: singleMoveMode?.sourceLane || null,
      additionalCostState_phase: additionalCostState?.phase || null,
      willSkipCalculation: !selectedCard && !abilityMode && !shipAbilityMode && !multiSelectState && !singleMoveMode
    });

    if (!selectedCard && !abilityMode && !shipAbilityMode && !multiSelectState && !singleMoveMode && !secondaryTargetingState) {
      setValidAbilityTargets([]);
      setValidCardTargets([]);
      return;
    }

    // Secondary targeting phase — compute targets from secondaryTargeting definition
    if (secondaryTargetingState) {
      const { card, primaryTarget, primaryLane, primaryOwner } = secondaryTargetingState;
      if (card.secondaryTargeting) {
        const secondaryTargets = resolveSecondaryTargets(
          { target: primaryTarget, lane: primaryLane, owner: primaryOwner },
          card.secondaryTargeting,
          {
            actingPlayerId: getLocalPlayerId(),
            player1: gameState.player1,
            player2: gameState.player2,
            getEffectiveStats: gameDataService.getEffectiveStats.bind(gameDataService)
          }
        );
        setValidAbilityTargets([]);
        setValidCardTargets(secondaryTargets);
        return;
      }
    }

    // Skip recalculation if in additional cost phase (targets already manually set)
    if (additionalCostState?.phase === 'select_effect' ||
        additionalCostState?.phase === 'select_cost_movement_destination' ||
        additionalCostState?.phase === 'select_cost') {
      if (!multiSelectState) {
        debugLog('TARGETING_PROCESSING', '⏭️ Skipping recalculation - additional cost phase in progress', {
          cardName: selectedCard?.name,
          costPhase: additionalCostState.phase
        });
        return;
      }
    }

    const { validAbilityTargets, validCardTargets } = calculateAllValidTargets(
      abilityMode,
      shipAbilityMode,
      multiSelectState,
      selectedCard,
      gameState.player1,
      gameState.player2,
      getLocalPlayerId(),
      singleMoveMode,
      gameDataService.getEffectiveStats.bind(gameDataService)
    );

    setValidAbilityTargets(validAbilityTargets);
    setValidCardTargets(validCardTargets);

    if (abilityMode) {
      setSelectedCard(null);
      setShipAbilityMode(null);
    }
  }, [abilityMode, shipAbilityMode, selectedCard, multiSelectState, singleMoveMode, additionalCostState, secondaryTargetingState]);

  // Additional cost highlighting debug logging
  useEffect(() => {
    if (additionalCostState || validCardTargets.length > 0) {
      debugLog('ADDITIONAL_COST_HIGHLIGHT', '🎨 Highlighting state changed', {
        additionalCostStatePhase: additionalCostState?.phase,
        validCardTargetsCount: validCardTargets?.length,
        validCardTargetIds: validCardTargets?.map(t => t.id),
        affectedDroneIdsCount: affectedDroneIds?.length,
        affectedDroneIds
      });
    }
  }, [additionalCostState, validCardTargets, affectedDroneIds]);

  return {
    // State values
    selectedCard,
    validCardTargets,
    validAbilityTargets,
    affectedDroneIds,
    hoveredLane,
    cardConfirmation,
    multiSelectState,
    singleMoveMode,
    additionalCostState,
    additionalCostConfirmation,
    additionalCostSelectionContext,
    destroyUpgradeModal,
    upgradeSelectionModal,
    viewUpgradesModal,
    secondaryTargetingState,

    // State setters (needed by App.jsx handlers that stay in parent)
    setSelectedCard,
    setValidCardTargets,
    setValidAbilityTargets,
    setAffectedDroneIds,
    setHoveredLane,
    setCardConfirmation,
    setMultiSelectState,
    setSingleMoveMode,
    setAdditionalCostState,
    setAdditionalCostConfirmation,
    setAdditionalCostSelectionContext,
    setDestroyUpgradeModal,
    setUpgradeSelectionModal,
    setViewUpgradesModal,
    setSecondaryTargetingState,

    // Functions
    cancelCardSelection,
    cancelSingleMoveMode,
    cancelAdditionalCostMode,
    enterSecondaryTargeting,
    cancelSecondaryTargeting,
    confirmAdditionalCostCard,
    handleCancelMultiMove,
    handleConfirmMultiMoveDrones,
    cancelCardState,
  };
};

export default useCardSelection;
