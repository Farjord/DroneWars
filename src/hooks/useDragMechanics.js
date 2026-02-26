// --- useDragMechanics ---
// Manages drag-and-drop state, targeting arrows, and all drag handlers:
// deployment drags, action card drags, and drone drags (move/attack/interception).
// Extracted from App.jsx Phase C (Step 10).

import { useState, useRef, useCallback, useEffect } from 'react';
import { debugLog } from '../utils/debugLogger.js';
import { calculatePolygonPoints } from '../components/ui/TargetingArrow.jsx';
import { calculateAllValidTargets, calculateAffectedDroneIds } from '../logic/targeting/uiTargetingHelpers.js';
import { getElementCenter } from '../utils/gameUtils.js';
import { isCompoundEffect } from '../logic/cards/chainTargetResolver.js';

// Vertical pixel offset from card top to arrow start point
const ARROW_START_Y_OFFSET = 20;

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
  setAffectedDroneIds, setHoveredLane, setSelectedCard,
  cancelCardSelection, setCardConfirmation,
  setUpgradeSelectionModal, setDestroyUpgradeModal,
  setValidCardTargets, validCardTargets,
  selectedCard,
  // From useInterception
  interceptionModeActive, playerInterceptionChoice, setSelectedInterceptor,
  // From useCardSelection — effect chain
  startEffectChain,
  effectChainState,
  selectChainDestination,
  // Hoisted to App.jsx to break circular dependency with useCardSelection/useInterception
  draggedDrone, setDraggedDrone,
  // From App.jsx
  cancelAllActions, opponentPlayerState, gameState, gameDataService,
  getPlacedSectionsForEngine,
  droneRefs, setMoveConfirmation, resolveAttack, getEffectiveStats, selectedDrone,
  abilityMode,
}) => {
  // --- Drag State ---
  // NOTE: draggedDrone is hoisted to App.jsx to break circular deps
  // (useInterception needs draggedDrone, but is called before this hook).
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
  const actionCardDragHandledRef = useRef(false);
  const droneDragHandledRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  // --- Selection-driven effects ---

  // Clear hoveredTarget when selectedDrone changes
  useEffect(() => {
    setHoveredTarget(null);
  }, [selectedDrone]);

  // Show/hide click-based targeting arrow based on selectedDrone
  useEffect(() => {
    if (selectedDrone && !abilityMode && turnPhase === 'action') {
      const startPos = getElementCenter(droneRefs.current[selectedDrone.id], gameAreaRef.current);
      if (startPos) {
        setArrowState({ visible: true, start: startPos, end: { x: startPos.x, y: startPos.y } });
      }
    } else {
      setArrowState(prev => ({ ...prev, visible: false }));
    }
  }, [selectedDrone, turnPhase, abilityMode]);

  // --- Capture-phase click absorber ---
  // After any drag-end, the browser synthesizes a click on the game area.
  // This capture-phase listener absorbs exactly one click so it never reaches
  // React handlers (e.g. cancelCardSelection in App.jsx's root onClick).
  useEffect(() => {
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const handleCaptureClick = (e) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        e.stopPropagation();
      }
    };

    gameArea.addEventListener('click', handleCaptureClick, true);
    return () => gameArea.removeEventListener('click', handleCaptureClick, true);
  }, []);

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
      const startY = cardRect.top - gameAreaRect.top + ARROW_START_Y_OFFSET;

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
    suppressNextClickRef.current = true;

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

    cancelAllActions();
    setDraggedActionCard({ card });
    actionCardDragHandledRef.current = false;

    // Calculate effect targets for the dragged card
    if (card.effects[0]?.targeting) {
      const { validCardTargets: targets } = calculateAllValidTargets(
        null,  // abilityMode
        null,  // shipAbilityMode
        card,  // the dragged card
        gameState.player1,
        gameState.player2,
        getLocalPlayerId(),
        gameDataService.getEffectiveStats.bind(gameDataService)
      );
      setValidCardTargets(targets);

      // For LANE-targeting cards, affectedDroneIds is calculated dynamically
      // based on hoveredLane via useEffect (hover-based targeting feedback)
      // For non-LANE cards, calculate immediately
      if (card.effects[0]?.targeting?.type !== 'LANE') {
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
    actionCardDragHandledRef.current = true;
    suppressNextClickRef.current = true;

    const { card } = draggedActionCard;
    debugLog('DRAG_DROP_DEPLOY', '📥 Action card drag end', { cardName: card.name, target, targetType, targetOwner });

    // Cleanup drag state
    setDraggedActionCard(null);
    setActionCardDragArrowState(prev => ({ ...prev, visible: false }));
    setAffectedDroneIds([]);
    setHoveredLane(null);

    // Case Chain: Multi-effect or compound-effect cards — route through effect chain UI
    if (card.effects?.length > 0) {
      const effect0 = card.effects[0];
      const isMultiEffect = card.effects.length > 1;
      const isCompound = isCompoundEffect(effect0);

      if (isMultiEffect || isCompound) {
        const firstTargetType = effect0.targeting?.type;

        // Non-board first target (CARD_IN_HAND, NONE) → start chain with no initial target
        if (firstTargetType === 'CARD_IN_HAND' || firstTargetType === 'NONE') {
          setSelectedCard(card);
          startEffectChain(card, null, null);
          return;
        }

        // Board first target → validate drop target
        if (!target) {
          cancelCardSelection('chain-no-target');
          return;
        }

        // Compute valid targets inline (validCardTargets from state may be stale)
        const { validCardTargets: dragTargets } = calculateAllValidTargets(
          null, null, card,
          gameState.player1, gameState.player2,
          getLocalPlayerId(),
          gameDataService.getEffectiveStats.bind(gameDataService)
        );

        if (targetType === 'drone') {
          const isValid = dragTargets.some(t => t.id === target.id && t.owner === targetOwner);
          if (!isValid) {
            cancelCardSelection('chain-invalid-target');
            return;
          }
          const tgtState = targetOwner === getLocalPlayerId() ? localPlayerState : opponentPlayerState;
          const laneEntry = Object.entries(tgtState.dronesOnBoard).find(
            ([_, drones]) => drones.some(d => d.id === target.id)
          );
          const targetLane = laneEntry?.[0];
          if (!targetLane) {
            cancelCardSelection('chain-lane-not-found');
            return;
          }
          setSelectedCard(card);
          startEffectChain(card, target, targetLane);
          return;
        }

        if (targetType === 'lane') {
          const isValid = dragTargets.some(t =>
            (t.id === target.id || t.id === target.name) && t.owner === targetOwner
          );
          if (!isValid) {
            cancelCardSelection('chain-invalid-lane');
            return;
          }
          setSelectedCard(card);
          startEffectChain(card, target, target.id);
          return;
        }

        cancelCardSelection('chain-no-valid-target');
        return;
      }
    }

    // Case 0: Movement cards - check if dropped on target or needs multi-select
    // Must be checked before no-targeting case, since movement cards have no targeting property
    if (card.effects[0]?.type === 'SINGLE_MOVE' || card.effects[0]?.type === 'MULTI_MOVE') {
      debugLog('DRAG_DROP_DEPLOY', '🎯 Movement card detected', { target, targetType });

      // Sub-case 0a: Movement card dropped on a valid target drone
      if (target && targetType === 'drone') {
        // Calculate valid targets for this specific card to avoid state timing issues
        // validCardTargets from state may be stale/empty since selectedCard is not yet set
        const { validCardTargets: dragCardTargets } = calculateAllValidTargets(
          null,  // abilityMode
          null,  // shipAbilityMode
          card,  // Use the dragged card directly (from draggedActionCard.card)
          gameState.player1,
          gameState.player2,
          getLocalPlayerId(),
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

          const laneEntry = Object.entries(targetPlayerState.dronesOnBoard).find(
            ([_, drones]) => drones.some(d => d.id === target.id)
          );
          const targetLane = laneEntry?.[0];

          // DEBUG: Log targetLane lookup result
          debugLog('DRAG_DROP_DEPLOY', '🔍 DEBUG: targetLane lookup result', {
            targetLane,
            foundLane: targetLane !== undefined,
            targetDroneId: target.id
          });

          if (!targetLane) {
            debugLog('DRAG_DROP_DEPLOY', '⛔ Error: Could not find lane for target drone', { droneId: target.id });
            cancelCardSelection('movement-lane-not-found');
            return;
          }

          // Movement card dropped on valid drone target — start effect chain for lane selection
          setSelectedCard(card);
          startEffectChain(card, target, targetLane);
          return;
        } else {
          debugLog('DRAG_DROP_DEPLOY', '⛔ Invalid drone target for movement card', { target, validCardTargets });
          cancelCardSelection('movement-invalid-target');
          return;
        }
      }

      // Sub-case 0b: Movement card clicked (no drop target) — start effect chain for drone selection
      debugLog('DRAG_DROP_DEPLOY', '🎯 Movement card - no drop target, starting effect chain');
      setSelectedCard(card);
      startEffectChain(card, null, null);
      return;
    }

    // Case 1: No-target cards - show confirmation
    if (!card.effects[0]?.targeting) {
      setCardConfirmation({ card, target: null });
      return;
    }

    // Case 2: NONE-type cards — dispatch based on card subtype
    if (card.effects[0]?.targeting?.type === 'NONE') {
      if (card.type === 'Upgrade') {
        setUpgradeSelectionModal({ card, targets: validCardTargets });
        return;
      }
      if (card.effects[0]?.type === 'DESTROY_UPGRADE') {
        setDestroyUpgradeModal({ card, targets: validCardTargets, opponentState: opponentPlayerState });
        return;
      }
      if (card.effects[0]?.scope === 'ALL') {
        setCardConfirmation({ card, target: null });
        return;
      }
      setCardConfirmation({ card, target: null });
      return;
    }

    // Case 3: Targeted cards (drone, lane, section) - validate and show confirmation
    if (target && targetType) {
      const isValidTarget = validCardTargets.some(t =>
        (t.id === target.id || t.id === target.name) && t.owner === targetOwner
      );
      if (isValidTarget) {
        setCardConfirmation({ card, target: { ...target, owner: targetOwner } });
      } else {
        debugLog('DRAG_DROP_DEPLOY', '⛔ Invalid target', { target, validCardTargets });
        cancelCardSelection('drag-invalid-target');
      }
    } else {
      // Released without target - cancel
      cancelCardSelection('drag-no-target');
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
      droneDragHandledRef.current = false;
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
    droneDragHandledRef.current = false;
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
    debugLog('DRAG_DROP_DEPLOY', '📥 handleDroneDragEnd ENTRY', {
      hasTarget: !!target,
      targetId: target?.id,
      targetLane,
      isOpponentTarget,
      targetType,
      hasDraggedDrone: !!draggedDrone,
      draggedDroneId: draggedDrone?.drone?.id,
      isInterceptionDrag: draggedDrone?.isInterceptionDrag,
    });

    if (!draggedDrone) return;
    droneDragHandledRef.current = true;
    suppressNextClickRef.current = true;

    // Route drone drag through effect chain destination selection.
    // When the chain is waiting for a destination lane and the user drags
    // the drone to a lane, route through selectChainDestination instead
    // of the regular move path.
    if (effectChainState?.subPhase === 'destination' && !draggedDrone.isInterceptionDrag) {
      setDraggedDrone(null);
      setDroneDragArrowState(prev => ({ ...prev, visible: false }));
      if (targetLane) {
        const isValidDestination = effectChainState.validTargets?.some(t => t.id === targetLane);
        if (isValidDestination) {
          selectChainDestination(targetLane);
        }
      }
      return;
    }

    const { drone: interceptorDrone, sourceLane, isInterceptionDrag } = draggedDrone;

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

    const attackerDrone = interceptorDrone; // Rename for clarity in normal flow

    // Cleanup drag state first
    setDraggedDrone(null);
    setDroneDragArrowState(prev => ({ ...prev, visible: false }));

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

        const moveConfData = {
          droneId: attackerDrone.id,
          owner: getLocalPlayerId(),
          from: sourceLane,
          to: targetLane,
          card: null,  // Regular drone drag (not card-based)
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
  // Cancel drone drag if mouseup happens outside of valid drop targets.
  // The droneDragHandledRef guard prevents this fallback from cancelling a drag
  // that was already handled by a drop zone — matching the action card pattern.
  useEffect(() => {
    const handleMouseUp = () => {
      if (draggedDrone) {
        setTimeout(() => {
          if (!droneDragHandledRef.current) {
            handleDroneDragEnd(null, null, false);
          }
        }, 0);
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
      // setTimeout ensures drop zone handlers fire first.
      // The ref guard prevents this fallback from cancelling a drag that was
      // already handled by a drop zone — the closure-captured draggedActionCard
      // is stale (React hasn't re-rendered yet), but the ref is always current.
      setTimeout(() => {
        if (!actionCardDragHandledRef.current) {
          handleActionCardDragEnd(null, null, null);
        }
      }, 0);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedActionCard]);

  return {
    // State values (draggedDrone hoisted to App.jsx)
    hoveredTarget,
    arrowState,
    cardDragArrowState,
    draggedCard,
    droneDragArrowState,
    draggedActionCard,
    actionCardDragArrowState,
    deploymentConfirmation,

    // State setters (setDraggedDrone hoisted to App.jsx)
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
