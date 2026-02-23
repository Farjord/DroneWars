// --- useDragMechanics ---
// Manages drag-and-drop state, targeting arrows, and deployment drag handlers.
// Extracted from App.jsx Phase C (Step 10).
// Large drag handlers (handleDroneDragEnd, handleActionCardDragEnd) remain in App.jsx
// until remaining hooks (useTargeting, useGameLifecycle) are extracted in Session 4.

import { useState, useRef, useCallback, useEffect } from 'react';
import { debugLog } from '../utils/debugLogger.js';
import { calculatePolygonPoints } from '../components/ui/TargetingArrow.jsx';

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
}) => {
  // --- Drag State ---
  const [hoveredTarget, setHoveredTarget] = useState(null);
  const [arrowState, setArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [cardDragArrowState, setCardDragArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [draggedCard, setDraggedCard] = useState(null);
  const [draggedDrone, setDraggedDrone] = useState(null);
  const [droneDragArrowState, setDroneDragArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [draggedActionCard, setDraggedActionCard] = useState(null);
  const [actionCardDragArrowState, setActionCardDragArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [costReminderArrowState, setCostReminderArrowState] = useState({ visible: false, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } });
  const [deploymentConfirmation, setDeploymentConfirmation] = useState(null);

  // --- Drag Refs ---
  const arrowLineRef = useRef(null);
  const cardDragArrowRef = useRef(null);
  const droneDragArrowRef = useRef(null);
  const actionCardDragArrowRef = useRef(null);
  const costReminderArrowRef = useRef(null);

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

  return {
    // State values
    hoveredTarget,
    arrowState,
    cardDragArrowState,
    draggedCard,
    draggedDrone,
    droneDragArrowState,
    draggedActionCard,
    actionCardDragArrowState,
    costReminderArrowState,
    deploymentConfirmation,

    // State setters
    setHoveredTarget,
    setArrowState,
    setCardDragArrowState,
    setDraggedCard,
    setDraggedDrone,
    setDroneDragArrowState,
    setDraggedActionCard,
    setActionCardDragArrowState,
    setCostReminderArrowState,
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
  };
};

export default useDragMechanics;
