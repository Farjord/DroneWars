// --- useActionRouting Hook ---
// Manages action routing for guest/host modes and deployment execution.
// Guest mode uses optimistic client-side prediction with host validation at milestones.

import { useCallback } from 'react';
import { debugLog } from '../utils/debugLogger.js';

/**
 * @param {Object} deps
 * @param {Object} deps.gameState - Current game state (needs gameMode)
 * @param {Function} deps.processAction - Action processor from useGameState
 * @param {Object} deps.p2pManager - P2P manager for guest→host routing
 * @param {Object} deps.gameStateManager - Game state manager for optimistic tracking
 * @param {Function} deps.getLocalPlayerId - Returns local player ID
 * @param {Object|null} deps.selectedDrone - Currently selected drone (default for deployment)
 * @param {number} deps.roundNumber - Current round number
 * @param {number} deps.turn - Current turn number (for debug logging)
 * @param {Function} deps.setSelectedDrone - Clears selected drone after deployment
 * @param {Function} deps.setModalContent - Shows error modals on deployment failure
 */
const useActionRouting = ({
  gameState,
  processAction,
  p2pManager,
  gameStateManager,
  getLocalPlayerId,
  selectedDrone,
  roundNumber,
  turn,
  setSelectedDrone,
  setModalContent,
}) => {

  // --- Guest Action Routing ---
  // All actions are optimistic — guest processes locally with animation tracking,
  // host remains authoritative via validation at milestone phases.
  const processActionWithGuestRouting = useCallback(async (type, payload) => {
    if (gameState.gameMode === 'guest') {
      debugLog('MULTIPLAYER', '🔮 [GUEST OPTIMISTIC] Processing action locally and sending to host:', type);

      // Send to host IMMEDIATELY for authoritative processing (zero delay)
      debugLog('MULTIPLAYER', '📤 [GUEST OPTIMISTIC] Sending action to host immediately (before local processing):', type);
      p2pManager.sendActionToHost(type, payload);

      // Process action locally for instant visual feedback (client-side prediction)
      debugLog('ANIMATIONS', '🎬 [GUEST OPTIMISTIC] About to process action locally (will generate animations)');
      const localResult = await processAction(type, payload);
      debugLog('ANIMATIONS', '✅ [GUEST OPTIMISTIC] Local processing complete (animations should have played)');

      // Track animations from this optimistic action for fine-grained deduplication
      if (localResult.animations) {
        gameStateManager.trackOptimisticAnimations(localResult.animations);
        const status = gameStateManager.optimisticActionService.getStatus();
        debugLog('OPTIMISTIC', '🔮 [SERVICE] Tracked optimistic animations:', {
          type,
          actionCount: localResult.animations.actionAnimations?.length || 0,
          systemCount: localResult.animations.systemAnimations?.length || 0,
          totalActionTracked: status.actionAnimationsTracked,
          totalSystemTracked: status.systemAnimationsTracked
        });
      }

      return localResult;
    }

    // Host/Local mode: Process action normally
    return await processAction(type, payload);
  }, [gameState.gameMode, processAction, p2pManager, gameStateManager]);

  // --- Deployment Execution ---
  const executeDeployment = async (lane, droneToDeployed = selectedDrone) => {
    debugLog('DRAG_DROP_DEPLOY', '🚀 executeDeployment entered', { lane, droneName: droneToDeployed?.name, hasSelectedDrone: !!selectedDrone, usedParam: droneToDeployed !== selectedDrone });
    const drone = droneToDeployed;
    try {
      debugLog('DEPLOYMENT', '🎯 App.jsx: Deploying drone:', {
        droneName: drone?.name,
        droneObject: drone,
        lane,
        playerId: getLocalPlayerId(),
        turn
      });

      const result = await processActionWithGuestRouting('deployment', {
        droneData: drone,
        laneId: lane,
        playerId: getLocalPlayerId(),
        turn: roundNumber
      });

      if (result.success) {
        setSelectedDrone(null);
      } else {
        setModalContent({ title: result.error, text: result.message, isBlocking: true });
      }
    } catch (error) {
      debugLog('DEPLOYMENT', '❌ Error executing deployment:', error);
      setModalContent({ title: 'Deployment Error', text: 'Failed to execute deployment', isBlocking: true });
    }
  };

  return {
    processActionWithGuestRouting,
    executeDeployment,
  };
};

export default useActionRouting;
