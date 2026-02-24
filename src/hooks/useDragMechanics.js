// --- useDragMechanics ---
// Manages drag-and-drop state, targeting arrows, and all drag handlers:
// deployment drags, action card drags, and drone drags (move/attack/interception).
// Extracted from App.jsx Phase C (Step 10).

import { useState, useRef, useCallback, useEffect } from 'react';
import { debugLog } from '../utils/debugLogger.js';
import { calculatePolygonPoints } from '../components/ui/TargetingArrow.jsx';
import { calculateAllValidTargets, calculateAffectedDroneIds, calculateCostTargets, calculateEffectTargetsWithCostContext } from '../logic/targeting/uiTargetingHelpers.js';
import { getElementCenter, calculateLaneDestinationPoint } from '../utils/gameUtils.js';

const useDragMechanics = ({
  gameAreaRef,
  turnPhase,
  currentPlayer,
  getLocalPlayerId,
  passInfo,
  roundNumber,
  totalLocalPlayerDrones,
  localPlayerState,
  localPlayerEffectiveStats,
  gameEngine,
  setSelectedDrone,
  setModalContent,
  executeDeployment,
  // From useCardSelection
  setAffectedDroneIds, setHoveredLane, setSelectedCard, setMultiSelectState,
  cancelCardSelection, setSingleMoveMode, setCardConfirmation,
  setUpgradeSelectionModal, setDestroyUpgradeModal, setAdditionalCostState,
  setAdditionalCostConfirmation, setValidCardTargets, validCardTargets,
  additionalCostState, selectedCard, multiSelectState, singleMoveMode,
  // From useInterception
  interceptionModeActive, playerInterceptionChoice, setSelectedInterceptor,
  // Hoisted to App.jsx to break circular dependency with useCardSelection/useInterception
  draggedDrone, setDraggedDrone,
  costReminderArrowState, setCostReminderArrowState,
  // From App.jsx
  cancelAllActions, opponentPlayerState, gameState, gameDataService,
  getPlacedSectionsForEngine, multiSelectFlowInProgress, additionalCostFlowInProgress,
  droneRefs, setMoveConfirmation, resolveAttack, getEffectiveStats, selectedDrone,
  abilityMode,
}) => {
  // --- Drag State ---
  // NOTE: draggedDrone and costReminderArrowState are hoisted to App.jsx
  // to break circular deps (useCardSelection needs setCostReminderArrowState,
  // useInterception needs draggedDrone, but both are called before this hook).
  const [hoveredTarget, setHoveredTarget] = useState(null);
  const [arrowState, setArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [cardDragArrowState, setCardDragArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [draggedCard, setDraggedCard] = useState(null);
  const [droneDragArrowState, setDroneDragArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [draggedActionCard, setDraggedActionCard] = useState(null);
  const [actionCardDragArrowState, setActionCardDragArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [deploymentConfirmation, setDeploymentConfirmation] = useState(null);

  // --- Drag Refs ---
  const arrowLineRef = useRef(null);
  const cardDragArrowRef = useRef(null);
  const droneDragArrowRef = useRef(null);
  const actionCardDragArrowRef = useRef(null);
  const costReminderArrowRef = useRef(null);

  // --- Selection-driven effects ---

  // Clear hoveredTarget when selectedDrone changes
  useEffect(() => {
    setHoveredTarget(null);
  }, [selectedDrone]);

  // Show/hide click-based targeting arrow based on selectedDrone
  useEffect(() => {
    if (selectedDrone && !abilityMode && !singleMoveMode && turnPhase === 'action') {
      const startPos = getElementCenter(droneRefs.current[selectedDrone.id], gameAreaRef.current);
      if (startPos) {
        setArrowState({ visible: true, start: startPos, end: { x: startPos.x, y: startPos.y } });
      }
    } else {
      setArrowState(prev => ({ ...prev, visible: false }));
    }
  }, [selectedDrone, turnPhase, abilityMode, singleMoveMode]);

  // --- Handlers ---

  // Performance-optimized hoveredTarget setter — skips update if same target
  const handleSetHoveredTarget = useCallback((target) => {
    const isSameTarget = hoveredTarget?.target?.id === target?.target?.id;
    if (draggedDrone) {
      debugLog('DRAG_PERF', '👁️ setHoveredTarget', {
        newTargetId: target?.target?.id,
        newTargetType: target?.type,
        previousTargetId: hoveredTarget?.target?.id,
        isSameTarget,
        skipping: isSameTarget
      });
    }
    if (!isSameTarget) {
      setHoveredTarget(target);
    }
  }, [hoveredTarget, draggedDrone]);

  // Deployment drag: start
  const handleCardDragStart = useCallback((drone, event) => {
    if (turnPhase !== 'deployment' || currentPlayer !== getLocalPlayerId()) return;

    setDraggedCard(drone);
    setSelectedDrone(drone);

    if (gameAreaRef.current) {
      const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
      const cardElement = event.currentTarget;
      const cardRect = cardElement.getBoundingClientRect();

      const startX = cardRect.left + cardRect.width / 2 - gameAreaRect.left;
      const startY = cardRect.top - gameAreaRect.top + 20;

      debugLog('DRAG_DROP_DEPLOY', '🎯 Arrow state set', {
        visible: true,
        start: { x: startX, y: startY },
        cardRect: { left: cardRect.left, top: cardRect.top, width: cardRect.width },
        gameAreaRect: { left: gameAreaRect.left, top: gameAreaRect.top }
      });

      setCardDragArrowState({
        visible: true,
        start: { x: startX, y: startY },
        end: { x: startX, y: startY }
      });
    }
  }, [turnPhase, currentPlayer, getLocalPlayerId, setSelectedDrone, gameAreaRef]);

  // Deployment drag: end or cancel
  const handleCardDragEnd = useCallback((lane = null) => {
    debugLog('DRAG_DROP_DEPLOY', '📥 handleCardDragEnd called', { lane, hasDraggedCard: !!draggedCard, draggedCardName: draggedCard?.name });
    if (!draggedCard) {
      debugLog('DRAG_DROP_DEPLOY', '⛔ handleCardDragEnd early return - no draggedCard');
      return;
    }

    const droneToDeployFromDrag = draggedCard;

    setDraggedCard(null);
    setCardDragArrowState(prev => ({ ...prev, visible: false }));

    if (lane) {
      if (currentPlayer !== getLocalPlayerId() || passInfo[getLocalPlayerId() + 'Passed']) {
        debugLog('DRAG_DROP_DEPLOY', '⛔ handleCardDragEnd early return - not current player or passed', { currentPlayer, localPlayerId: getLocalPlayerId(), passed: passInfo[getLocalPlayerId() + 'Passed'] });
        return;
      }

      if (roundNumber === 1) {
        debugLog('DRAG_DROP_DEPLOY', '🔍 Round 1 - validating deployment', { droneName: droneToDeployFromDrag.name });
        const validationResult = gameEngine.validateDeployment(localPlayerState, droneToDeployFromDrag, roundNumber, totalLocalPlayerDrones, localPlayerEffectiveStats);
        if (!validationResult.isValid) {
          debugLog('DRAG_DROP_DEPLOY', '⛔ Validation failed', { reason: validationResult.reason, message: validationResult.message });
          setModalContent({ title: validationResult.reason, text: validationResult.message, isBlocking: true });
          return;
        }
        const { budgetCost, energyCost } = validationResult;
        debugLog('DRAG_DROP_DEPLOY', '✅ Validation passed', { budgetCost, energyCost });
        if (energyCost > 0) {
          debugLog('DRAG_DROP_DEPLOY', '📋 Showing confirmation modal (energyCost > 0)');
          setDeploymentConfirmation({ lane, budgetCost, energyCost, drone: droneToDeployFromDrag });
          return;
        }
      }

      debugLog('DRAG_DROP_DEPLOY', '🚀 Calling executeDeployment', { lane, droneName: droneToDeployFromDrag.name });
      executeDeployment(lane, droneToDeployFromDrag);
    }
  }, [draggedCard, currentPlayer, getLocalPlayerId, passInfo, roundNumber, localPlayerState, totalLocalPlayerDrones, localPlayerEffectiveStats, gameEngine, setModalContent, executeDeployment]);

  // --- Action Card Drag Handlers ---

  const handleActionCardDragStart = (card, event, cardRect = null) => {
    // Guards: action phase, player's turn, not passed, can afford
    if (turnPhase !== 'action' || currentPlayer !== getLocalPlayerId()) return;
    if (passInfo[`${getLocalPlayerId()}Passed`]) return;
    if (localPlayerState.energy < card.cost) return;

    debugLog('DRAG_DROP_DEPLOY', '🎯 Action card drag start', { cardName: card.name, cardId: card.id });
    debugLog('ADDITIONAL_COST_UI', '🎴 Card drag started', {
      cardName: card.name,
      cardId: card.id,
      hasAdditionalCost: !!card.additionalCost,
      additionalCostType: card.additionalCost?.type,
      expectedCostTargetType: card.additionalCost?.targeting?.type
    });

    cancelAllActions();
    setDraggedActionCard({ card });

    // For additional cost cards, calculate COST targets first (not effect targets)
    // Effect targets will be calculated after cost selection is complete
    if (card.additionalCost && card.additionalCost.targeting) {
      debugLog('ADDITIONAL_COST_UI', '🎯 Calculating COST targets at drag start', {
        costType: card.additionalCost.type,
        costTargetingType: card.additionalCost.targeting.type
      });

      const costTargets = calculateCostTargets(
        card.additionalCost,
        gameState.player1,
        gameState.player2,
        getLocalPlayerId(),
        card.id,  // Exclude this card from hand selection
        gameDataService.getEffectiveStats.bind(gameDataService)  // Pass stat calculator
      );

      setValidCardTargets(costTargets);
      setAffectedDroneIds([]);  // No effect preview during cost selection

      debugLog('ADDITIONAL_COST_UI', '✅ Cost targets calculated', {
        costTargetCount: costTargets.length,
        costTargetIds: costTargets.map(t => t.id)
      });
    }
    // For regular cards (no additional cost), calculate effect targets
    else if (card.targeting) {
      const { validCardTargets: targets } = calculateAllValidTargets(
        null,  // abilityMode
        null,  // shipAbilityMode
        null,  // multiSelectState
        card,  // the dragged card
        gameState.player1,
        gameState.player2,
        getLocalPlayerId(),
        null,  // singleMoveMode
        gameDataService.getEffectiveStats.bind(gameDataService)  // Pass stat calculator
      );
      setValidCardTargets(targets);

      // For LANE-targeting cards, affectedDroneIds is calculated dynamically
      // based on hoveredLane via useEffect (hover-based targeting feedback)
      // For non-LANE cards, calculate immediately
      if (card.targeting?.type !== 'LANE') {
        const affected = calculateAffectedDroneIds(
          card,
          targets,
          gameState.player1,
          gameState.player2,
          getLocalPlayerId(),
          gameDataService.getEffectiveStats.bind(gameDataService),
          getPlacedSectionsForEngine()
        );
        setAffectedDroneIds(affected);
      } else {
        // LANE-targeting: wait for hover to calculate affected drones
        setAffectedDroneIds([]);
      }
    } else {
      setValidCardTargets([]);  // No targets needed for no-target cards
      setAffectedDroneIds([]);
    }

    // Setup arrow from card position
    if (gameAreaRef.current) {
      const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
      // Use pre-calculated cardRect if provided (for deferred drag start), otherwise get from event
      const rect = cardRect || event.currentTarget?.getBoundingClientRect();
      if (rect) {
        const startX = rect.left + rect.width / 2 - gameAreaRect.left;
        const startY = rect.top - gameAreaRect.top + 20;
        setActionCardDragArrowState({ visible: true, start: { x: startX, y: startY }, end: { x: startX, y: startY } });
      }
    }
  };

  /**
   * HANDLE ACTION CARD DRAG END
   * Completes or cancels action card targeting via drag-and-drop.
   * @param {Object|null} target - The target object, or null to cancel
   * @param {string|null} targetType - The type of target ('drone', 'lane', 'section')
   * @param {string|null} targetOwner - The owner of the target (player ID)
   */
  const handleActionCardDragEnd = (target = null, targetType = null, targetOwner = null) => {
    if (!draggedActionCard) return;

    const { card } = draggedActionCard;
    debugLog('DRAG_DROP_DEPLOY', '📥 Action card drag end', { cardName: card.name, target, targetType, targetOwner });

    // Cleanup drag state
    setDraggedActionCard(null);
    setActionCardDragArrowState(prev => ({ ...prev, visible: false }));
    setAffectedDroneIds([]);
    setHoveredLane(null);

    // Case 0: Movement cards - check if dropped on target or needs multi-select
    // Must be checked before no-targeting case, since movement cards have no targeting property
    if (card.effect?.type === 'SINGLE_MOVE' || card.effect?.type === 'MULTI_MOVE') {
      debugLog('DRAG_DROP_DEPLOY', '🎯 Movement card detected', { target, targetType });

      // Sub-case 0a: Movement card dropped on a valid target drone
      if (target && targetType === 'drone') {
        // Calculate valid targets for this specific card to avoid state timing issues
        // validCardTargets from state may be stale/empty since selectedCard is not yet set
        const { validCardTargets: dragCardTargets } = calculateAllValidTargets(
          null,  // abilityMode
          null,  // shipAbilityMode
          null,  // multiSelectState
          card,  // Use the dragged card directly (from draggedActionCard.card)
          gameState.player1,
          gameState.player2,
          getLocalPlayerId(),
          null,  // singleMoveMode
          gameDataService.getEffectiveStats.bind(gameDataService)  // Pass stat calculator
        );

        const isValidTarget = dragCardTargets.some(t => t.id === target.id && t.owner === targetOwner);
        if (isValidTarget) {
          debugLog('DRAG_DROP_DEPLOY', '✅ Valid drone target - proceeding to lane selection', { droneId: target.id });

          // Keep card selected for UI greyscale effect on other cards
          setSelectedCard(card);

          // Find which lane the target drone is in
          // Use the appropriate player state based on target owner
          const targetPlayerState = targetOwner === getLocalPlayerId()
            ? localPlayerState
            : opponentPlayerState;

          // DEBUG: Log targetPlayerState structure to diagnose lane lookup failure
          debugLog('DRAG_DROP_DEPLOY', '🔍 DEBUG: targetPlayerState', {
            targetOwner,
            localPlayerId: getLocalPlayerId(),
            dronesOnBoard: targetPlayerState.dronesOnBoard,
            dronesOnBoardKeys: Object.keys(targetPlayerState.dronesOnBoard || {}),
            targetDroneId: target.id
          });

          const [targetLane] = Object.entries(targetPlayerState.dronesOnBoard).find(
            ([_, drones]) => drones.some(d => d.id === target.id)
          ) || [];

          // DEBUG: Log targetLane lookup result
          debugLog('DRAG_DROP_DEPLOY', '🔍 DEBUG: targetLane lookup result', {
            targetLane,
            foundLane: targetLane !== undefined,
            targetDroneId: target.id
          });

          if (!targetLane) {
            debugLog('DRAG_DROP_DEPLOY', '⛔ Error: Could not find lane for target drone', { droneId: target.id });
            debugLog('BUTTON_CLICKS', '🔍 cancelCardSelection called from ERROR HANDLER - Could not find lane', {
              timestamp: performance.now(),
              refValue: multiSelectFlowInProgress.current,
              droneId: target.id
            });
            cancelCardSelection('movement-lane-not-found');
            return;
          }

          // For SINGLE_MOVE cards, enter singleMoveMode instead of multiSelectState
          if (card.effect.type === 'SINGLE_MOVE') {
            // CHECKPOINT 2: Card Dropped on Drone Target
            debugLog('SINGLE_MOVE_FLOW', '🎯 CHECKPOINT 2: Card dropped on drone target', {
              cardName: card.name,
              targetId: target.id,
              targetName: target.name,
              targetOwner: targetOwner,
              targetLane: targetLane,
              targetObject: target
            });

            debugLog('SINGLE_MOVE_MODE', '🎯 Entering single-move mode', {
              cardName: card.name,
              droneId: target.id,
              droneName: target.name,
              sourceLane: targetLane,
              targetOwner: targetOwner
            });

            // CHECKPOINT 3: Setting singleMoveMode State
            const newSingleMoveMode = {
              card: card,
              droneId: target.id,
              owner: targetOwner,
              sourceLane: targetLane
            };

            debugLog('SINGLE_MOVE_FLOW', '💾 CHECKPOINT 3: Setting singleMoveMode state', {
              singleMoveMode: newSingleMoveMode,
              droneId: newSingleMoveMode.droneId,
              owner: newSingleMoveMode.owner,
              sourceLane: newSingleMoveMode.sourceLane,
              cardName: newSingleMoveMode.card.name
            });

            setSingleMoveMode(newSingleMoveMode);

            // Set selectedDrone so the drone highlights correctly
            setSelectedDrone({ ...target, owner: targetOwner });

            // Clear selectedCard so targeting useEffect prioritizes singleMoveMode
            // The card will still be referenced via singleMoveMode.card
            setSelectedCard(null);

            return;
          }

          // MULTI_MOVE flow: Use the existing multiSelectState logic
          setMultiSelectState({
            card: card,
            phase: 'select_destination',
            selectedDrone: { ...target, owner: targetOwner },
            sourceLane: targetLane,
            maxDrones: 1,
            actingPlayerId: getLocalPlayerId()
          });

          multiSelectFlowInProgress.current = true; // Set ref synchronously to prevent premature cleanup

          debugLog('BUTTON_CLICKS', '🛡️ multiSelectFlowInProgress REF SET TO TRUE', {
            timestamp: performance.now(),
            location: 'handleActionCardDragEnd - after drone target validation',
            refValue: multiSelectFlowInProgress.current,
            shortStack: new Error().stack.split('\n').slice(0, 3).join('\n')
          });

          debugLog('BUTTON_CLICKS', '🔄 multiSelectState SET for lane selection', {
            phase: 'select_destination',
            selectedDroneId: target.id,
            selectedDroneOwner: targetOwner,
            sourceLane: targetLane,
            maxDrones: 1,
            actingPlayerId: getLocalPlayerId(),
            timestamp: performance.now()
          });

          return;
        } else {
          debugLog('DRAG_DROP_DEPLOY', '⛔ Invalid drone target for movement card', { target, validCardTargets });
          debugLog('BUTTON_CLICKS', '🔍 cancelCardSelection called from ERROR HANDLER - Invalid drone target', {
            timestamp: performance.now(),
            refValue: multiSelectFlowInProgress.current,
            target: target,
            cardName: card?.name
          });
          cancelCardSelection('movement-invalid-target');
          return;
        }
      }

      // Sub-case 0b: Movement card - either clicked (no target) or drag cancelled
      debugLog('DRAG_DROP_DEPLOY', '🎯 Movement card - checking flow type');

      if (card.effect.type === 'SINGLE_MOVE') {
        // If card has explicit targeting (like Assault Reposition), this is a drag cancel
        if (card.targeting) {
          debugLog('DRAG_DROP_DEPLOY', '🎯 SINGLE_MOVE with targeting - drag cancelled (no target)');
          cancelCardSelection('single-move-drag-no-target');
          return;
        }

        // For cards without targeting (basic Maneuver), use multiSelectState
        debugLog('DRAG_DROP_DEPLOY', '🎯 SINGLE_MOVE without targeting - using multiSelectState');
        // Keep card selected for UI greyscale effect on other cards
        setSelectedCard(card);
        const friendlyDrones = Object.values(localPlayerState.dronesOnBoard)
          .flat()
          .filter(drone => !drone.isExhausted)
          .map(drone => ({ id: drone.id, type: 'drone', owner: getLocalPlayerId() }));

        setValidCardTargets(friendlyDrones);
        setMultiSelectState({
          card: card,
          phase: 'select_drone',
          selectedDrones: [],
          sourceLane: null,
          maxDrones: 1,
          actingPlayerId: getLocalPlayerId()
        });
      } else {
        // MULTI_MOVE - select source lane first
        // Keep card selected for UI greyscale effect on other cards
        setSelectedCard(card);
        setMultiSelectState({
          card: card,
          phase: 'select_source_lane',
          selectedDrones: [],
          sourceLane: null,
          maxDrones: card.effect.count || 3,
          actingPlayerId: getLocalPlayerId()
        });
      }
      return;
    }

    // Case 1: No-target cards - show confirmation
    if (!card.targeting) {
      setCardConfirmation({ card, target: null });
      return;
    }

    // Case 2: Upgrade cards - open upgrade selection modal
    if (card.type === 'Upgrade' || card.targeting?.type === 'DRONE_CARD') {
      setUpgradeSelectionModal({ card, targets: validCardTargets });
      return;
    }

    // Case 3: System Sabotage (APPLIED_UPGRADE) - open destroy upgrade modal
    if (card.targeting?.type === 'APPLIED_UPGRADE') {
      setDestroyUpgradeModal({ card, targets: validCardTargets, opponentState: opponentPlayerState });
      return;
    }

    // Case 3.5: Additional cost cards - multi-step selection flow
    if (card.additionalCost) {
      debugLog('ADDITIONAL_COST_UI', '🎴 Additional cost card drag-ended', {
        cardName: card.name,
        costType: card.additionalCost.type,
        target: target?.id,
        targetType,
        targetOwner,
        expectedTargetType: card.additionalCost.targeting.type
      });

      // Debug: Trace entry into additionalCost flow
      debugLog('ADDITIONAL_COST', '🚀 handleActionCardDragEnd: Entering additionalCost flow', {
        cardName: card.name,
        costType: card.additionalCost.type,
        costTargetingType: card.additionalCost.targeting?.type,
        target,
        targetType
      });

      const costTargeting = card.additionalCost.targeting;

      // Cost targets a drone
      if (costTargeting.type === 'DRONE') {
        debugLog('ADDITIONAL_COST_VALIDATION', '🔍 Validating cost target (DRONE)', {
          hasTarget: !!target,
          targetType,
          expectedAffinity: costTargeting.affinity,
          targetOwner
        });

        if (!target || targetType !== 'drone') {
          debugLog('ADDITIONAL_COST_VALIDATION', '❌ Invalid cost target - not a drone', {
            target,
            targetType
          });
          cancelCardSelection('additional-cost-invalid-target');
          return;
        }

        // Find target lane
        const targetPlayerState = targetOwner === getLocalPlayerId() ? localPlayerState : opponentPlayerState;
        const [targetLane] = Object.entries(targetPlayerState.dronesOnBoard).find(
          ([_, drones]) => drones.some(d => d.id === target.id)
        ) || [];

        debugLog('ADDITIONAL_COST_UI', '📍 Cost target lane determined', {
          targetId: target.id,
          lane: targetLane,
          foundInBoard: !!targetLane
        });

        if (!targetLane) {
          debugLog('ADDITIONAL_COST_UI', '❌ Could not find lane for cost target', {
            targetId: target.id,
            targetOwner,
            dronesOnBoard: targetPlayerState.dronesOnBoard
          });
          cancelCardSelection('additional-cost-lane-not-found');
          return;
        }

        // Special handling for movement costs
        if (card.additionalCost.type === 'SINGLE_MOVE' || card.additionalCost.type === 'MULTI_MOVE') {
          // Use the dropped target - it's already validated at this point
          debugLog('ADDITIONAL_COST_UI', '🎯 Cost drone selected from drop', {
            cardName: card.name,
            costType: card.additionalCost.type,
            droneId: target.id,
            droneName: target.name,
            sourceLane: targetLane,
            owner: targetOwner
          });

          // Calculate adjacent lanes for movement destination
          const sourceLaneIndex = parseInt(targetLane.replace('lane', ''), 10);
          const adjacentLanes = ['lane1', 'lane2', 'lane3'].filter(laneId => {
            const targetLaneIndex = parseInt(laneId.replace('lane', ''), 10);
            return Math.abs(sourceLaneIndex - targetLaneIndex) === 1;
          });

          debugLog('ADDITIONAL_COST_UI', '🎯 Transitioning to lane selection phase', {
            sourceLane: targetLane,
            adjacentLanes,
            phase: 'select_cost_movement_destination'
          });

          // Go directly to lane selection - the drone is already selected
          setAdditionalCostState({
            phase: 'select_cost_movement_destination',
            card,
            costSelection: {
              type: card.additionalCost.type,
              drone: target,
              owner: targetOwner,
              sourceLane: targetLane,
              target: target,        // Normalized name for stat comparisons
              lane: targetLane       // Normalized name for location filtering
            },
            validTargets: adjacentLanes.map(laneId => ({ id: laneId, owner: getLocalPlayerId() }))
          });
          additionalCostFlowInProgress.current = true;
          setSelectedCard(card);
          setValidCardTargets(adjacentLanes.map(laneId => ({ id: laneId, owner: getLocalPlayerId() })));
          setSelectedDrone(null);  // Clear any leftover drone selection
          return;
        }

        // Non-movement cost: proceed to effect selection
        debugLog('ADDITIONAL_COST_UI', '🔄 Transitioning to effect selection phase', {
          phase: 'select_effect',
          costSelection: {
            type: card.additionalCost.type,
            targetId: target.id,
            owner: targetOwner,
            lane: targetLane
          }
        });

        const costSelection = {
          type: card.additionalCost.type,
          target,
          drone: target,  // Add for highlighting consistency
          owner: targetOwner,
          lane: targetLane
        };

        // Calculate valid effect targets with cost context
        const effectTargets = calculateEffectTargetsWithCostContext(
          card,
          costSelection,
          gameState.player1,
          gameState.player2,
          getLocalPlayerId(),
          gameDataService.getEffectiveStats.bind(gameDataService)  // Pass stat calculator
        );

        debugLog('ADDITIONAL_COST_TARGETING', '🎯 Effect targets calculated with cost context', {
          effectTargetCount: effectTargets.length,
          effectTargets: effectTargets.map(t => ({
            id: t.id,
            name: t.name,
            owner: t.owner,
            lane: t.lane
          }))
        });

        debugLog('CHECKPOINT_FLOW', '🔀 CHECKPOINT 7: Transitioning to select_effect phase', {
          previousPhase: additionalCostState?.phase,
          newPhase: 'select_effect',
          card: card.name,
          costSelection,
          effectTargetsCount: effectTargets.length,
          effectTargets: effectTargets.map(t => ({
            id: t.id,
            name: t.name,
            owner: t.owner,
            attack: t.attack,
            lane: t.lane
          })),
          timestamp: Date.now()
        });

        setAdditionalCostState({
          phase: 'select_effect',
          card,
          costSelection,
          validTargets: effectTargets
        });
        additionalCostFlowInProgress.current = true; // Set flag when entering effect selection phase (MAIN FIX)
        setSelectedCard(card);
        setValidCardTargets(effectTargets);

        debugLog('CHECKPOINT_FLOW', '🔀 CHECKPOINT 7A: State updates completed', {
          validCardTargetsSet: effectTargets.length,
          additionalCostFlowInProgress: true
        });

        debugLog('ADDITIONAL_COST_HIGHLIGHT', '💡 Valid targets set for highlighting', {
          validTargetIds: effectTargets.map(t => t.id),
          expectedHighlightCount: effectTargets.length
        });

        return;
      }

      // Cost targets a card in hand
      // Debug: Check if we reach CARD_IN_HAND condition
      debugLog('ADDITIONAL_COST', '🔍 Checking CARD_IN_HAND condition', {
        costTargetingType: costTargeting.type,
        isCardInHand: costTargeting.type === 'CARD_IN_HAND'
      });

      if (costTargeting.type === 'CARD_IN_HAND') {
        debugLog('ADDITIONAL_COST_UI', '🃏 CARD_IN_HAND cost - entering hand selection mode', {
          cardName: card.name,
          handSize: localPlayerState.hand.length,
          validTargetCount: localPlayerState.hand.filter(c => c.id !== card.id).length
        });
        // Card dropped in play area (not on a specific target) - enter hand selection mode
        setAdditionalCostState({
          phase: 'select_cost',
          card,
          costSelection: null,
          validTargets: localPlayerState.hand.filter(c => c.id !== card.id)
        });

        // Debug: Confirm setAdditionalCostState was called
        debugLog('ADDITIONAL_COST', '✅ setAdditionalCostState called with select_cost phase', {
          phase: 'select_cost',
          cardName: card.name,
          validTargetsCount: localPlayerState.hand.filter(c => c.id !== card.id).length,
          validTargetIds: localPlayerState.hand.filter(c => c.id !== card.id).map(c => c.instanceId)
        });

        additionalCostFlowInProgress.current = true; // Set flag when entering cost selection phase
        setSelectedCard(card);
        setValidCardTargets(localPlayerState.hand.filter(c => c.id !== card.id));
        return;
      }
    }

    // Case 5: Targeted cards (drone, lane, section) - validate and show confirmation
    if (target && targetType) {
      const isValidTarget = validCardTargets.some(t =>
        (t.id === target.id || t.id === target.name) && t.owner === targetOwner
      );
      if (isValidTarget) {
        setCardConfirmation({ card, target: { ...target, owner: targetOwner } });
      } else {
        debugLog('DRAG_DROP_DEPLOY', '⛔ Invalid target', { target, validCardTargets });
        debugLog('BUTTON_CLICKS', '🔍 cancelCardSelection called from ERROR HANDLER - Invalid target', {
          timestamp: performance.now(),
          refValue: multiSelectFlowInProgress.current,
          target: target,
          cardName: card?.name
        });
        cancelCardSelection('drag-invalid-target');
      }
    } else {
      // Released without target - cancel
      debugLog('BUTTON_CLICKS', '🔍 handleActionCardDragEnd CLEANUP PATH', {
        timestamp: performance.now(),
        location: 'handleActionCardDragEnd - else block (no valid target)',
        refValue: multiSelectFlowInProgress.current,
        willCallCancel: !multiSelectFlowInProgress.current,
        draggedCard: card?.name || 'none'
      });

      // BUT: Don't clean up if we're in a multi-select or additional cost flow
      if (!multiSelectFlowInProgress.current && !additionalCostFlowInProgress.current) {
        cancelCardSelection('drag-no-target');
      }
    }
  };

  // --- Drone Drag Handlers ---

  const handleDroneDragStart = (drone, sourceLane, event) => {
    // Check for interception mode first
    if (interceptionModeActive) {
      // In interception mode, only allow dragging valid interceptors
      const isValidInterceptor = playerInterceptionChoice?.interceptors?.some(i => i.id === drone.id);
      if (!isValidInterceptor) {
        debugLog('INTERCEPTION_MODE', '⛔ Drone drag blocked - not a valid interceptor', { droneId: drone.id });
        return;
      }

      debugLog('INTERCEPTION_MODE', '🎯 Interceptor drag start', { droneName: drone.name, droneId: drone.id, sourceLane });
      setDraggedDrone({ drone, sourceLane, isInterceptionDrag: true });

      // Get start position from top-middle of the drone token
      if (gameAreaRef.current) {
        const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
        const tokenElement = event.currentTarget;
        const tokenRect = tokenElement.getBoundingClientRect();

        const startX = tokenRect.left + tokenRect.width / 2 - gameAreaRect.left;
        const startY = tokenRect.top - gameAreaRect.top + 15;

        setDroneDragArrowState({
          visible: true,
          start: { x: startX, y: startY },
          end: { x: startX, y: startY }
        });
      }
      return;
    }

    // Handle additional cost flow
    if (additionalCostState) {
      // During cost movement destination selection, ONLY allow dragging the specific cost drone
      if (additionalCostState.phase === 'select_cost_movement_destination') {
        const costDrone = additionalCostState.costSelection?.drone;
        if (costDrone && drone.id === costDrone.id) {
          // Allow dragging the cost drone to select destination
          debugLog('ADDITIONAL_COST_MODE', '🎯 Cost drone drag start', {
            droneName: drone.name,
            droneId: drone.id,
            sourceLane,
            phase: additionalCostState.phase
          });
          setDraggedDrone({ drone, sourceLane, isAdditionalCostDrag: true });

          // Set up drag arrow
          if (gameAreaRef.current) {
            const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
            const tokenElement = event.currentTarget;
            const tokenRect = tokenElement.getBoundingClientRect();

            const startX = tokenRect.left + tokenRect.width / 2 - gameAreaRect.left;
            const startY = tokenRect.top - gameAreaRect.top + 15;

            setDroneDragArrowState({
              visible: true,
              start: { x: startX, y: startY },
              end: { x: startX, y: startY }
            });
          }
          return;
        }
      }

      // Block all other drags during additional cost flow
      debugLog('ADDITIONAL_COST_MODE', '⛔ Drone drag blocked - additional cost flow in progress', {
        phase: additionalCostState.phase,
        droneId: drone.id
      });
      return;
    }

    // Check for single-move mode - only allow dragging the selected drone
    if (singleMoveMode) {
      if (drone.id !== singleMoveMode.droneId) {
        debugLog('SINGLE_MOVE_MODE', '⛔ Drone drag blocked - not the selected drone', {
          attemptedDroneId: drone.id,
          selectedDroneId: singleMoveMode.droneId
        });
        return;
      }

      debugLog('SINGLE_MOVE_MODE', '🎯 Selected drone drag start', { droneName: drone.name, droneId: drone.id, sourceLane });
      setDraggedDrone({ drone, sourceLane, isSingleMoveDrag: true });

      // Get start position from top-middle of the drone token
      if (gameAreaRef.current) {
        const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
        const tokenElement = event.currentTarget;
        const tokenRect = tokenElement.getBoundingClientRect();

        const startX = tokenRect.left + tokenRect.width / 2 - gameAreaRect.left;
        const startY = tokenRect.top - gameAreaRect.top + 15;

        setDroneDragArrowState({
          visible: true,
          start: { x: startX, y: startY },
          end: { x: startX, y: startY }
        });
      }
      return;
    }

    // Normal action phase drag - only allow during action phase, when it's our turn, and drone is not exhausted
    if (turnPhase !== 'action' || currentPlayer !== getLocalPlayerId() || drone.isExhausted) {
      debugLog('DRAG_DROP_DEPLOY', '⛔ Drone drag blocked', { turnPhase, currentPlayer, localPlayerId: getLocalPlayerId(), isExhausted: drone.isExhausted });
      return;
    }

    // Check if drone has INERT keyword (cannot move)
    const effectiveStats = getEffectiveStats(drone, sourceLane);
    if (effectiveStats.keywords.has('INERT')) {
      debugLog('DRAG_DROP_DEPLOY', '⛔ Drone drag blocked - INERT keyword', { droneName: drone.name, droneId: drone.id });
      return;
    }

    debugLog('DRAG_DROP_DEPLOY', '🎯 Drone drag start', { droneName: drone.name, droneId: drone.id, sourceLane });
    setDraggedDrone({ drone, sourceLane });

    // Get start position from top-middle of the drone token
    if (gameAreaRef.current) {
      const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
      const tokenElement = event.currentTarget;
      const tokenRect = tokenElement.getBoundingClientRect();

      const startX = tokenRect.left + tokenRect.width / 2 - gameAreaRect.left;
      const startY = tokenRect.top - gameAreaRect.top + 15; // Top-center of token (emerges from behind due to z-index)

      setDroneDragArrowState({
        visible: true,
        start: { x: startX, y: startY },
        end: { x: startX, y: startY }
      });
    }
  };

  /**
   * HANDLE DRONE DRAG END
   * Completes drone drag-and-drop for attack or move.
   * @param {Object|null} targetDrone - The target drone (for attacks) or null
   * @param {string|null} targetLane - The target lane
   * @param {boolean} isOpponentTarget - Whether the target is on opponent's side
   */
  const handleDroneDragEnd = (target = null, targetLane = null, isOpponentTarget = false, targetType = 'drone') => {
    debugLog('CHECKPOINT_FLOW', '📥 CHECKPOINT 5: handleDroneDragEnd ENTRY', {
      // Parameters
      hasTarget: !!target,
      targetName: target?.name,
      targetId: target?.id,
      targetLane,
      isOpponentTarget,
      targetType,

      // Current state
      hasDraggedDrone: !!draggedDrone,
      draggedDroneName: draggedDrone?.drone?.name,
      draggedDroneId: draggedDrone?.drone?.id,
      isInterceptionDrag: draggedDrone?.isInterceptionDrag,
      isSingleMoveDrag: draggedDrone?.isSingleMoveDrag,
      isAdditionalCostDrag: draggedDrone?.isAdditionalCostDrag,

      // Additional cost state
      additionalCostPhase: additionalCostState?.phase,
      additionalCostCard: additionalCostState?.card?.name,
      validCardTargetsCount: validCardTargets?.length,
      validCardTargetIds: validCardTargets?.map(t => `${t.name}(${t.owner})`),

      timestamp: Date.now()
    });

    if (!draggedDrone) {
      debugLog('CHECKPOINT_FLOW', '⛔ CHECKPOINT 5-EXIT: No draggedDrone, exiting early');
      return;
    }

    const { drone: interceptorDrone, sourceLane, isInterceptionDrag, isSingleMoveDrag } = draggedDrone;

    debugLog('CHECKPOINT_FLOW', '📥 CHECKPOINT 5A: draggedDrone destructured', {
      interceptorDrone: interceptorDrone?.name,
      sourceLane,
      isInterceptionDrag,
      isSingleMoveDrag
    });

    // Handle interception mode drag end
    if (isInterceptionDrag && interceptionModeActive) {
      // Cleanup drag state
      setDraggedDrone(null);
      setDroneDragArrowState(prev => ({ ...prev, visible: false }));

      // Check if dropped on the attacker drone
      const attackerId = playerInterceptionChoice?.attackDetails?.attacker?.id;
      if (isOpponentTarget && target?.id === attackerId) {
        debugLog('INTERCEPTION_MODE', '✅ Valid interception selection', {
          interceptor: interceptorDrone.name,
          attacker: target.name
        });
        setSelectedInterceptor(interceptorDrone);
      } else if (target) {
        debugLog('INTERCEPTION_MODE', '⛔ Invalid drop target - must drop on attacker', {
          droppedOn: target.name,
          attackerId
        });
        setModalContent({
          title: "Invalid Target",
          text: "You must drag your interceptor to the attacking drone.",
          isBlocking: true
        });
      } else {
        debugLog('INTERCEPTION_MODE', '📥 Interception drag cancelled - no target');
      }
      return;
    }

    // --- CASE 3: Additional Cost Movement Destination Selection ---
    if (draggedDrone.isAdditionalCostDrag && additionalCostState?.phase === 'select_cost_movement_destination') {
      debugLog('ADDITIONAL_COST_MODE', '🎯 CASE 3: Additional cost movement destination selection', {
        costDroneName: draggedDrone.drone?.name,
        isAdditionalCostDrag: draggedDrone.isAdditionalCostDrag,
        phase: additionalCostState?.phase
      });

      const costDrone = draggedDrone.drone;

      // Cleanup drag state first
      setDraggedDrone(null);
      setDroneDragArrowState(prev => ({ ...prev, visible: false }));

      debugLog('ADDITIONAL_COST_MODE', '🔍 VALIDATION CHECK: targetType check', {
        targetType,
        targetName: target?.name,
        targetId: target?.id,
        willShowModal: targetType === 'drone'
      });

      // Validate: Must drop on a lane (not a drone)
      if (targetType === 'drone') {
        debugLog('ADDITIONAL_COST_MODE', '⛔ Invalid drop - must drop on lane, not drone', {
          targetType,
          targetName: target?.name
        });
        setModalContent({
          title: "Invalid Target",
          text: "Please drag the drone to a lane, not onto another drone.",
          isBlocking: true
        });
        return;
      }

      // Validate: Target lane must be valid (in validCardTargets)
      if (!validCardTargets.some(t => t.id === targetLane)) {
        debugLog('ADDITIONAL_COST_MODE', '⛔ Invalid destination lane', {
          targetLane,
          validLanes: validCardTargets.map(t => t.id)
        });
        setModalContent({
          title: "Invalid Lane",
          text: "Please move the drone to the highlighted lane.",
          isBlocking: true
        });
        return;
      }

      debugLog('ADDITIONAL_COST_MODE', '✅ Cost movement destination selected via drag', {
        drone: costDrone.name,
        fromLane: sourceLane,
        toLane: targetLane
      });

      // Update cost selection with destination (replicate handleLaneClick logic)
      const updatedCostSelection = {
        ...additionalCostState.costSelection,
        toLane: targetLane
      };

      // Calculate valid effect targets (e.g., enemy drones in SOURCE lane)
      const effectTargets = calculateEffectTargetsWithCostContext(
        additionalCostState.card,
        updatedCostSelection,
        gameState.player1,
        gameState.player2,
        getLocalPlayerId(),
        gameDataService.getEffectiveStats.bind(gameDataService)  // Pass stat calculator
      );

      // Proceed to effect selection
      setAdditionalCostState({
        phase: 'select_effect',
        card: additionalCostState.card,
        costSelection: updatedCostSelection,
        validTargets: effectTargets
      });
      additionalCostFlowInProgress.current = true;
      setValidCardTargets(effectTargets);

      // Show cost reminder arrow for Forced Repositioning
      if (additionalCostState.card.id === 'FORCED_REPOSITION') {
        const costDrone = additionalCostState.costSelection?.drone;
        const fromLane = additionalCostState.costSelection?.sourceLane;
        const toLane = targetLane;

        if (costDrone && droneRefs.current[costDrone.id]) {
          // Get drone center position
          const dronePos = getElementCenter(
            droneRefs.current[costDrone.id],
            gameAreaRef.current
          );

          if (dronePos) {
            // Calculate destination lane position
            const arrowEnd = calculateLaneDestinationPoint(
              fromLane,
              toLane,
              dronePos,
              gameAreaRef.current
            );

            setCostReminderArrowState({
              visible: true,
              start: dronePos,
              end: arrowEnd
            });

            debugLog('ADDITIONAL_COST_UI', '🏹 Cost reminder arrow shown (drag-drop path)', {
              fromLane,
              toLane,
              dronePos,
              arrowEnd
            });
          }
        }
      }

      return;
    }

    // Handle single-move mode drag end
    if (isSingleMoveDrag && singleMoveMode) {
      // Cleanup drag state
      setDraggedDrone(null);
      setDroneDragArrowState(prev => ({ ...prev, visible: false }));

      // Validate drone matches singleMoveMode
      if (interceptorDrone.id !== singleMoveMode.droneId) {
        debugLog('SINGLE_MOVE_MODE', '⛔ Drone mismatch - should not happen', {
          draggedDroneId: interceptorDrone.id,
          selectedDroneId: singleMoveMode.droneId
        });
        return;
      }

      // Must be dropped on a lane (not opponent target)
      if (!targetLane || isOpponentTarget) {
        debugLog('SINGLE_MOVE_MODE', '📥 Single-move drag cancelled - no valid lane target');
        return;
      }

      // Validate target lane is adjacent to source lane
      const sourceLaneIndex = parseInt(singleMoveMode.sourceLane.replace('lane', ''), 10);
      const targetLaneIndex = parseInt(targetLane.replace('lane', ''), 10);
      const distance = Math.abs(sourceLaneIndex - targetLaneIndex);

      if (distance !== 1) {
        debugLog('SINGLE_MOVE_MODE', '⛔ Move blocked - not adjacent', {
          sourceLane: singleMoveMode.sourceLane,
          targetLane,
          distance
        });
        debugLog('MODAL_TRIGGER', '🚨 INVALID MOVE MODAL TRIGGERED', {
          location: 'handleDroneDragEnd - single move mode',
          lineNumber: 4106,
          timestamp: Date.now(),
          singleMoveMode: singleMoveMode,
          sourceLane: singleMoveMode?.sourceLane,
          targetLane: targetLane,
          distance: distance,
          selectedDrone: selectedDrone,
          additionalCostState: additionalCostState,
          additionalCostPhase: additionalCostState?.phase,
          turnPhase: turnPhase
        });
        debugLog('MODAL_TRIGGER', '🚨 Invalid Move modal call stack');
        setModalContent({
          title: "Invalid Move",
          text: "You can only move this drone to an adjacent lane.",
          isBlocking: true
        });
        return;
      }

      // Valid move - show confirmation modal
      debugLog('SINGLE_MOVE_MODE', '✅ Valid move - showing confirmation', {
        drone: interceptorDrone.name,
        from: singleMoveMode.sourceLane,
        to: targetLane,
        card: singleMoveMode.card.name
      });

      // Look up drone for isSnared status
      const smDrone = Object.values(localPlayerState.dronesOnBoard).flat().find(d => d.id === singleMoveMode.droneId);
      const moveConfData = {
        droneId: singleMoveMode.droneId,
        owner: singleMoveMode.owner,
        from: singleMoveMode.sourceLane,
        to: targetLane,
        card: singleMoveMode.card,  // Include card for card-based movement
        isSnared: smDrone?.isSnared || false
      };

      debugLog('SINGLE_MOVE_FLOW', '⚠️ setMoveConfirmation called from [handleDroneDragEnd - single-move drag]', {
        location: 'handleDroneDragEnd - single-move drag',
        lineNumber: 3641,
        dataStructure: {
          hasDroneId: 'droneId' in moveConfData,
          hasDrone: 'drone' in moveConfData,
          hasOwner: 'owner' in moveConfData,
          keys: Object.keys(moveConfData)
        },
        data: moveConfData
      });

      setMoveConfirmation(moveConfData);

      return;
    }

    // --- CASE 4: Additional Cost Effect Target Selection via Drag ---
    if (additionalCostState?.phase === 'select_effect') {
      debugLog('CHECKPOINT_FLOW', '🎯 CHECKPOINT 6: Entered select_effect branch', {
        // Entry conditions
        phase: additionalCostState.phase,
        card: additionalCostState.card?.name,

        // Parameters received
        hasTarget: !!target,
        targetName: target?.name,
        targetId: target?.id,
        targetType,
        isOpponentTarget,
        targetLane,

        // State for validation
        validCardTargetsCount: validCardTargets.length,
        validCardTargets: validCardTargets.map(t => ({
          id: t.id,
          name: t.name,
          owner: t.owner,
          attack: t.attack
        })),

        // Cost selection context
        costSelection: additionalCostState.costSelection,

        timestamp: Date.now()
      });

      // Cleanup drag state first
      setDraggedDrone(null);
      setDroneDragArrowState(prev => ({ ...prev, visible: false }));

      debugLog('CHECKPOINT_FLOW', '🧹 CHECKPOINT 6A: Drag state cleaned up');

      // SILENTLY CANCEL: User missed the target (dropped on empty space, lane, etc.)
      if (!target) {
        debugLog('CHECKPOINT_FLOW', '🔄 CHECKPOINT 6B-EXIT: No target (silent cancel)', {
          targetType,
          reason: 'User missed the target, this is OK'
        });
        return;  // Exit silently, no error modal
      }

      debugLog('CHECKPOINT_FLOW', '✅ CHECKPOINT 6C: Target exists, validating type', {
        targetType,
        expectedType: 'drone'
      });

      // Validate: Target must be a drone (not a lane, section, etc.)
      if (targetType !== 'drone') {
        debugLog('CHECKPOINT_FLOW', '⛔ CHECKPOINT 6D-ERROR: Wrong target type', {
          actualType: targetType,
          expectedType: 'drone',
          showingError: true
        });
        setModalContent({
          title: "Invalid Target",
          text: "Please select an enemy drone as the target.",
          isBlocking: true
        });
        return;
      }

      debugLog('CHECKPOINT_FLOW', '✅ CHECKPOINT 6E: Target type valid, validating against validCardTargets', {
        targetId: target.id,
        targetName: target.name,
        isOpponentTarget,
        calculatedOwner: isOpponentTarget ? 'player2' : 'player1'
      });

      // Validate: Target must be in validCardTargets
      const targetOwner = isOpponentTarget ? 'player2' : 'player1';
      const isValidTarget = validCardTargets.some(t => t.id === target.id && t.owner === targetOwner);

      debugLog('CHECKPOINT_FLOW', '🔍 CHECKPOINT 6F: Validation result', {
        isValidTarget,
        targetId: target.id,
        targetOwner,
        validCardTargets: validCardTargets.map(t => ({
          id: t.id,
          name: t.name,
          owner: t.owner,
          matches: t.id === target.id && t.owner === targetOwner
        }))
      });

      if (!isValidTarget) {
        debugLog('CHECKPOINT_FLOW', '⛔ CHECKPOINT 6G-ERROR: Target not in validCardTargets', {
          targetId: target.id,
          targetOwner,
          showingError: true
        });
        setModalContent({
          title: "Invalid Target",
          text: "This drone is not a valid target for this effect.",
          isBlocking: true
        });
        return;
      }

      debugLog('CHECKPOINT_FLOW', '✅ CHECKPOINT 6H-SUCCESS: All validations passed, showing confirmation modal', {
        targetId: target.id,
        targetName: target.name,
        targetOwner,
        card: selectedCard?.name,
        costSelection: additionalCostState.costSelection
      });

      // Show confirmation modal (same as handleDroneClick does)
      setAdditionalCostConfirmation({
        card: selectedCard,
        costSelection: additionalCostState.costSelection,
        effectTarget: { ...target, owner: targetOwner }
      });

      return;
    }

    const attackerDrone = interceptorDrone; // Rename for clarity in normal flow

    // Cleanup drag state first
    setDraggedDrone(null);
    setDroneDragArrowState(prev => ({ ...prev, visible: false }));

    // Block attacks during additional cost flow
    if (additionalCostState) {
      debugLog('ADDITIONAL_COST_MODE', '⛔ Attack blocked - additional cost flow in progress', {
        phase: additionalCostState.phase,
        attackerId: attackerDrone.id,
        targetId: target?.id
      });
      setModalContent({
        title: "Cannot Attack",
        text: "Please complete the card selection first.",
        isBlocking: true
      });
      return;
    }

    // Case 1a: Attack - dropped on opponent drone in same lane
    if (isOpponentTarget && target && targetLane && targetType === 'drone') {
      if (sourceLane === targetLane) {
        debugLog('DRAG_DROP_DEPLOY', '⚔️ Attack initiated via drag', { attacker: attackerDrone.name, target: target.name, lane: sourceLane });
        const attackDetails = {
          attacker: attackerDrone,
          target: target,
          targetType: 'drone',
          lane: sourceLane,
          attackingPlayer: getLocalPlayerId()
        };
        resolveAttack(attackDetails);
      } else {
        debugLog('DRAG_DROP_DEPLOY', '⛔ Attack blocked - different lanes', { sourceLane, targetLane });
        setModalContent({ title: "Invalid Target", text: "You can only attack targets in the same lane.", isBlocking: true });
      }
      return;
    }

    // Case 1b: Attack - dropped on opponent ship section
    if (isOpponentTarget && target && targetLane && targetType === 'section') {
      if (sourceLane === targetLane) {
        // Check for Guardian protection
        const opponentDronesInLane = opponentPlayerState.dronesOnBoard[sourceLane];
        const hasGuardian = opponentDronesInLane?.some(drone => {
          const effectiveStats = getEffectiveStats(drone, sourceLane);
          return effectiveStats.keywords.has('GUARDIAN') && !drone.isExhausted;
        });

        if (hasGuardian) {
          debugLog('DRAG_DROP_DEPLOY', '⛔ Attack blocked - Guardian protection', { sourceLane });
          setModalContent({ title: "Invalid Target", text: "This lane is protected by a Guardian drone. You must destroy it before targeting the ship section.", isBlocking: true });
        } else {
          debugLog('DRAG_DROP_DEPLOY', '⚔️ Ship section attack initiated via drag', { attacker: attackerDrone.name, target: target.name, lane: sourceLane });
          const attackDetails = {
            attacker: attackerDrone,
            target: target,
            targetType: 'section',
            lane: sourceLane,
            attackingPlayer: getLocalPlayerId()
          };
          resolveAttack(attackDetails);
        }
      } else {
        debugLog('DRAG_DROP_DEPLOY', '⛔ Attack blocked - different lanes', { sourceLane, targetLane });
        setModalContent({ title: "Invalid Target", text: "Your drone can only attack the ship section in its lane.", isBlocking: true });
      }
      return;
    }

    // Case 2: Move - dropped on player lane (adjacent to source)
    if (!isOpponentTarget && targetLane && targetLane !== sourceLane) {
      const sourceLaneIndex = parseInt(sourceLane.replace('lane', ''), 10);
      const targetLaneIndex = parseInt(targetLane.replace('lane', ''), 10);

      if (Math.abs(sourceLaneIndex - targetLaneIndex) === 1) {
        debugLog('DRAG_DROP_DEPLOY', '🏃 Move initiated via drag', { drone: attackerDrone.name, from: sourceLane, to: targetLane });
        // Include card from multiSelectState if movement card is active
        const movementCard = multiSelectState?.card?.effect?.type === 'SINGLE_MOVE' ||
                             multiSelectState?.card?.effect?.type === 'MULTI_MOVE'
                             ? multiSelectState.card : null;

        const moveConfData = {
          droneId: attackerDrone.id,
          owner: getLocalPlayerId(),
          from: sourceLane,
          to: targetLane,
          card: movementCard,  // Include card for card-based movement
          isSnared: attackerDrone.isSnared || false
        };

        debugLog('SINGLE_MOVE_FLOW', '⚠️ setMoveConfirmation called from [handleDroneDragEnd - regular drag move]', {
          location: 'handleDroneDragEnd - regular drag move',
          lineNumber: 3718,
          dataStructure: {
            hasDroneId: 'droneId' in moveConfData,
            hasDrone: 'drone' in moveConfData,
            hasOwner: 'owner' in moveConfData,
            keys: Object.keys(moveConfData)
          },
          data: moveConfData
        });

        setMoveConfirmation(moveConfData);
      } else {
        debugLog('DRAG_DROP_DEPLOY', '⛔ Move blocked - not adjacent', { sourceLane, targetLane });
        debugLog('MODAL_TRIGGER', '🚨 INVALID MOVE MODAL TRIGGERED', {
          location: 'handleDroneDragEnd - regular drag move',
          lineNumber: 4373,
          timestamp: Date.now(),
          sourceLane: sourceLane,
          targetLane: targetLane,
          sourceLaneIndex: sourceLaneIndex,
          targetLaneIndex: targetLaneIndex,
          distance: Math.abs(sourceLaneIndex - targetLaneIndex),
          selectedDrone: selectedDrone,
          additionalCostState: additionalCostState,
          additionalCostPhase: additionalCostState?.phase,
          turnPhase: turnPhase
        });
        debugLog('MODAL_TRIGGER', '🚨 Invalid Move modal call stack');
        setModalContent({ title: "Invalid Move", text: "Drones can only move to adjacent lanes.", isBlocking: true });
      }
      return;
    }

    // Case 3: Cancelled or invalid drop
    debugLog('DRAG_DROP_DEPLOY', '❌ Drag cancelled or invalid drop');
  };

  // --- Arrow Tracking Effects ---

  // Main targeting arrow mouse tracking (attack/ability arrow — SVG line element)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (arrowState.visible && arrowLineRef.current && gameAreaRef.current) {
        const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
        const endX = e.clientX - gameAreaRect.left;
        const endY = e.clientY - gameAreaRect.top;

        arrowLineRef.current.setAttribute('x2', endX);
        arrowLineRef.current.setAttribute('y2', endY);
      }
    };

    const gameArea = gameAreaRef.current;
    gameArea?.addEventListener('mousemove', handleMouseMove);
    return () => gameArea?.removeEventListener('mousemove', handleMouseMove);
  }, [arrowState.visible, gameAreaRef]);

  // Card drag arrow mouse tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cardDragArrowState.visible && cardDragArrowRef.current && gameAreaRef.current) {
        const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
        const endX = e.clientX - gameAreaRect.left;
        const endY = e.clientY - gameAreaRect.top;

        debugLog('DRAG_DROP_DEPLOY', '🖱️ Mouse move - updating arrow end', {
          endX, endY,
          hasRef: !!cardDragArrowRef.current,
          refType: cardDragArrowRef.current?.tagName
        });

        const newPoints = calculatePolygonPoints(
          cardDragArrowState.start,
          { x: endX, y: endY }
        );
        cardDragArrowRef.current.setAttribute('points', newPoints);
      }
    };

    const gameArea = gameAreaRef.current;
    gameArea?.addEventListener('mousemove', handleMouseMove);
    return () => gameArea?.removeEventListener('mousemove', handleMouseMove);
  }, [cardDragArrowState.visible, gameAreaRef]);

  // Drone drag arrow mouse tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (droneDragArrowState.visible && droneDragArrowRef.current && gameAreaRef.current) {
        const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
        const endX = e.clientX - gameAreaRect.left;
        const endY = e.clientY - gameAreaRect.top;

        const newPoints = calculatePolygonPoints(
          droneDragArrowState.start,
          { x: endX, y: endY }
        );
        droneDragArrowRef.current.setAttribute('points', newPoints);
      }
    };

    const gameArea = gameAreaRef.current;
    gameArea?.addEventListener('mousemove', handleMouseMove);
    return () => gameArea?.removeEventListener('mousemove', handleMouseMove);
  }, [droneDragArrowState.visible, droneDragArrowState.start, gameAreaRef]);

  // Action card drag arrow mouse tracking
  useEffect(() => {
    if (!actionCardDragArrowState.visible) return;

    const handleMouseMove = (e) => {
      if (actionCardDragArrowRef.current && gameAreaRef.current) {
        const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
        const endX = e.clientX - gameAreaRect.left;
        const endY = e.clientY - gameAreaRect.top;

        const newPoints = calculatePolygonPoints(
          actionCardDragArrowState.start,
          { x: endX, y: endY }
        );
        actionCardDragArrowRef.current.setAttribute('points', newPoints);
      }
    };

    const gameArea = gameAreaRef.current;
    gameArea?.addEventListener('mousemove', handleMouseMove);
    return () => gameArea?.removeEventListener('mousemove', handleMouseMove);
  }, [actionCardDragArrowState.visible, actionCardDragArrowState.start, gameAreaRef]);

  // --- Mouseup Cleanup Effects ---

  // 8.4c CARD DRAG CANCEL ON MOUSE UP OUTSIDE LANES
  // Cancel drag if mouseup happens outside of valid drop targets
  useEffect(() => {
    const handleMouseUp = () => {
      if (draggedCard) {
        // Defer cancel to allow React's onMouseUp handlers to fire first
        // Native DOM listeners fire before React synthetic events
        setTimeout(() => handleCardDragEnd(null), 0);
      }
    };

    const gameArea = gameAreaRef.current;
    gameArea?.addEventListener('mouseup', handleMouseUp);

    return () => {
      gameArea?.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedCard]);

  // 8.4e DRONE DRAG CANCEL ON MOUSE UP OUTSIDE TARGETS
  // Cancel drone drag if mouseup happens outside of valid drop targets
  useEffect(() => {
    const handleMouseUp = () => {
      debugLog('CHECKPOINT_FLOW', '🌍 CHECKPOINT 1: Global mouseup handler fired', {
        hasDraggedDrone: !!draggedDrone,
        draggedDroneName: draggedDrone?.drone?.name,
        additionalCostPhase: additionalCostState?.phase,
        timestamp: Date.now()
      });

      if (draggedDrone) {
        // Skip deferred cleanup call during additional cost destination selection
        // The lane handler already processes the drag correctly
        if (draggedDrone.isAdditionalCostDrag && additionalCostState?.phase === 'select_cost_movement_destination') {
          debugLog('CHECKPOINT_FLOW', '🌍 CHECKPOINT 1A-SKIP: Skipping deferred call during additional cost destination selection', {
            phase: additionalCostState.phase,
            isAdditionalCostDrag: draggedDrone.isAdditionalCostDrag
          });
          return;
        }

        debugLog('CHECKPOINT_FLOW', '🌍 CHECKPOINT 1A: Calling handleDroneDragEnd with null target (deferred)', {
          willCallWith: { target: null, targetLane: null, isOpponentTarget: false, targetType: 'drone' }
        });
        // Defer cancel to allow React's onMouseUp handlers to fire first
        setTimeout(() => handleDroneDragEnd(null, null, false), 0);
      } else {
        debugLog('CHECKPOINT_FLOW', '🌍 CHECKPOINT 1B: No draggedDrone, global handler exiting');
      }
    };

    const gameArea = gameAreaRef.current;
    gameArea?.addEventListener('mouseup', handleMouseUp);

    return () => {
      gameArea?.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedDrone]);

  // 8.4g ACTION CARD DRAG GLOBAL MOUSE UP
  // Handle mouseup for action cards - always trigger cleanup/cancel
  useEffect(() => {
    if (!draggedActionCard) return;

    const handleGlobalMouseUp = () => {
      // Always trigger handleActionCardDragEnd on mouseUp
      // - Drop zones call it with valid target first (their onMouseUp fires before document's)
      // - If no drop zone handled it (draggedActionCard still set), this cancels the drag
      // - setTimeout ensures drop zone handlers fire first
      setTimeout(() => handleActionCardDragEnd(null, null, null), 0);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedActionCard]);

  return {
    // State values (draggedDrone + costReminderArrowState hoisted to App.jsx)
    hoveredTarget,
    arrowState,
    cardDragArrowState,
    draggedCard,
    droneDragArrowState,
    draggedActionCard,
    actionCardDragArrowState,
    deploymentConfirmation,

    // State setters (setDraggedDrone + setCostReminderArrowState hoisted to App.jsx)
    setHoveredTarget,
    setArrowState,
    setCardDragArrowState,
    setDraggedCard,
    setDroneDragArrowState,
    setDraggedActionCard,
    setActionCardDragArrowState,
    setDeploymentConfirmation,

    // Refs
    arrowLineRef,
    cardDragArrowRef,
    droneDragArrowRef,
    actionCardDragArrowRef,
    costReminderArrowRef,

    // Handlers
    handleSetHoveredTarget,
    handleCardDragStart,
    handleCardDragEnd,
    handleActionCardDragStart,
    handleActionCardDragEnd,
    handleDroneDragStart,
    handleDroneDragEnd,
  };
};

export default useDragMechanics;
