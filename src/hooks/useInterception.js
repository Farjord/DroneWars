// --- useInterception Hook ---
// Manages interception state, UI highlighting, and interception decision flow.
// Covers interception mode (battlefield selection), modal display, and badge tracking.

import { useState, useEffect, useCallback } from 'react';
import { debugLog } from '../utils/debugLogger.js';
import { calculatePotentialInterceptors } from '../logic/combat/InterceptionProcessor.js';

/**
 * @param {Object} deps - External dependencies from App.jsx
 * @param {Object} deps.gameState - Current game state
 * @param {Object} deps.localPlayerState - Local player's state
 * @param {Object} deps.opponentPlayerState - Opponent player's state
 * @param {Object|null} deps.selectedDrone - Currently selected drone (click-selected)
 * @param {Object|null} deps.draggedDrone - Currently dragged drone
 * @param {Object|null} deps.singleMoveMode - Active single-move card flow
 * @param {Object|null} deps.abilityMode - Active ability targeting mode
 * @param {Function} deps.getLocalPlayerId - Returns local player ID
 * @param {Function} deps.getPlacedSectionsForEngine - Returns placed sections for engine
 * @param {Function} deps.resolveAttack - Resolves an attack with given details
 */
const useInterception = ({
  gameState,
  localPlayerState,
  opponentPlayerState,
  selectedDrone,
  draggedDrone,
  singleMoveMode,
  abilityMode,
  getLocalPlayerId,
  getPlacedSectionsForEngine,
  resolveAttack,
}) => {
  const { turnPhase } = gameState;

  // --- State ---
  const [playerInterceptionChoice, setPlayerInterceptionChoice] = useState(null);
  const [potentialInterceptors, setPotentialInterceptors] = useState([]);
  const [showOpponentDecidingModal, setShowOpponentDecidingModal] = useState(false);
  const [interceptedBadge, setInterceptedBadge] = useState(null);
  const [interceptionModeActive, setInterceptionModeActive] = useState(false);
  const [selectedInterceptor, setSelectedInterceptor] = useState(null);

  // --- Effects ---

  // Calculate potential interceptors for UI highlighting
  useEffect(() => {
    // In interception mode, highlight the valid interceptors from the choice
    if (interceptionModeActive && playerInterceptionChoice?.interceptors) {
      const interceptorIds = playerInterceptionChoice.interceptors.map(i => i.id);
      setPotentialInterceptors(interceptorIds);
      return;
    }

    // Skip interception calculations during SINGLE_MOVE card flow
    if (singleMoveMode) {
      setPotentialInterceptors([]);
      return;
    }

    // Skip interception calculations during ability targeting (abilities can't be intercepted)
    if (abilityMode) {
      setPotentialInterceptors([]);
      return;
    }

    if (turnPhase === 'action') {
      // Use draggedDrone if actively dragging, otherwise use selectedDrone
      const activeDrone = draggedDrone?.drone || selectedDrone;
      const potential = calculatePotentialInterceptors(
        activeDrone,
        localPlayerState,
        opponentPlayerState,
        getPlacedSectionsForEngine()
      );
      setPotentialInterceptors(potential);
    } else {
      setPotentialInterceptors([]);
    }
  }, [selectedDrone, draggedDrone, turnPhase, localPlayerState, opponentPlayerState, getPlacedSectionsForEngine, interceptionModeActive, playerInterceptionChoice, singleMoveMode, abilityMode]);

  // Monitor unified interceptionPending state for both AI and human defenders
  useEffect(() => {
    const localPlayerId = getLocalPlayerId();

    if (gameState.interceptionPending) {
      const { attackingPlayerId, defendingPlayerId, attackDetails, interceptors } = gameState.interceptionPending;

      // Show "opponent deciding" modal to attacker
      if (attackingPlayerId === localPlayerId) {
        setShowOpponentDecidingModal(true);
      }
      // Show interception choice modal to defender (human only, AI auto-decides)
      else if (defendingPlayerId === localPlayerId) {
        setPlayerInterceptionChoice({
          attackDetails,
          interceptors
        });
      }
    } else {
      // Clear both modals when interception complete
      setShowOpponentDecidingModal(false);
      setPlayerInterceptionChoice(null);
    }
  }, [gameState.interceptionPending, getLocalPlayerId]);

  // Monitor gameState.lastInterception for badge display only
  useEffect(() => {
    if (gameState.lastInterception) {
      const { interceptor, timestamp } = gameState.lastInterception;

      setInterceptedBadge({
        droneId: interceptor.id,
        timestamp: timestamp
      });
    }
  }, [gameState.lastInterception]);

  // --- Handlers ---

  // Enter interception mode for battlefield selection
  const handleViewBattlefield = useCallback(() => {
    debugLog('INTERCEPTION_MODE', '🌍 Entering interception mode from modal');
    setInterceptionModeActive(true);
  }, []);

  // Reopen interception modal from header
  const handleShowInterceptionDialog = useCallback(() => {
    debugLog('INTERCEPTION_MODE', '📖 Reopening interception modal');
    setInterceptionModeActive(false);
    setSelectedInterceptor(null);
  }, []);

  // Reset selected interceptor during interception mode
  const handleResetInterception = useCallback(() => {
    debugLog('INTERCEPTION_MODE', '🔄 Resetting interception selection');
    setSelectedInterceptor(null);
  }, []);

  // Decline interception from header button
  const handleDeclineInterceptionFromHeader = useCallback(async () => {
    if (!playerInterceptionChoice) return;

    debugLog('INTERCEPTION_MODE', '⛔ Declining interception from header');

    const attackDetails = {
      ...playerInterceptionChoice.attackDetails,
      interceptor: null
    };

    setInterceptionModeActive(false);
    setSelectedInterceptor(null);
    setPlayerInterceptionChoice(null);

    setTimeout(async () => {
      await resolveAttack(attackDetails);
    }, 400);
  }, [playerInterceptionChoice, resolveAttack]);

  // Confirm interception with or without selected interceptor
  const handleConfirmInterception = useCallback(async () => {
    if (!playerInterceptionChoice) {
      debugLog('INTERCEPTION_MODE', '⛔ Cannot confirm - no interception pending');
      return;
    }

    if (selectedInterceptor) {
      debugLog('INTERCEPTION_MODE', '✅ Confirming interception', {
        interceptor: selectedInterceptor.name
      });
    } else {
      debugLog('INTERCEPTION_MODE', '⛔ Confirming without interception (no interceptor selected)');
    }

    const attackDetails = {
      ...playerInterceptionChoice.attackDetails,
      interceptor: selectedInterceptor || null
    };

    setInterceptionModeActive(false);
    setSelectedInterceptor(null);
    setPlayerInterceptionChoice(null);

    setTimeout(async () => {
      await resolveAttack(attackDetails);
    }, 400);
  }, [selectedInterceptor, playerInterceptionChoice, resolveAttack]);

  return {
    // State (read by App.jsx for prop passing)
    playerInterceptionChoice,
    potentialInterceptors,
    showOpponentDecidingModal,
    interceptedBadge,
    interceptionModeActive,
    selectedInterceptor,

    // Setters needed by drag logic in App.jsx
    setSelectedInterceptor,
    setInterceptionModeActive,
    setPlayerInterceptionChoice,
    setShowOpponentDecidingModal,

    // Handlers
    handleViewBattlefield,
    handleShowInterceptionDialog,
    handleResetInterception,
    handleDeclineInterceptionFromHeader,
    handleConfirmInterception,
  };
};

export default useInterception;
