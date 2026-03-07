// --- useActionRouting Hook ---
// Manages action routing and deployment execution.
// All modes route through gameServer.submitAction() when available.

import { useCallback } from 'react';
import { debugLog } from '../utils/debugLogger.js';

/**
 * @param {Object} deps
 * @param {Function} deps.processAction - Action processor from useGameState
 * @param {Object|null} deps.gameServer - GameServer instance (local/host/guest)
 * @param {Function} deps.getLocalPlayerId - Returns local player ID
 * @param {Object|null} deps.selectedDrone - Currently selected drone (default for deployment)
 * @param {number} deps.roundNumber - Current round number
 * @param {number} deps.turn - Current turn number (for debug logging)
 * @param {Function} deps.setSelectedDrone - Clears selected drone after deployment
 * @param {Function} deps.setModalContent - Shows error modals on deployment failure
 */
const useActionRouting = ({
  processAction,
  gameServer,
  getLocalPlayerId,
  selectedDrone,
  roundNumber,
  turn,
  setSelectedDrone,
  setModalContent,
}) => {

  // --- Action Routing ---
  // All modes route through gameServer when available, falling back to direct processAction.
  const processActionWithGuestRouting = useCallback(async (type, payload) => {
    if (gameServer) {
      return await gameServer.submitAction(type, payload);
    }
    return await processAction(type, payload);
  }, [processAction, gameServer]);

  // --- Deployment Execution ---
  const executeDeployment = async (lane, droneToDeployed = selectedDrone) => {
    debugLog('DEPLOY_TRACE', '[1/10] executeDeployment called', {
      droneName: droneToDeployed?.name,
      lane,
      playerId: getLocalPlayerId(),
    });
    debugLog('DRAG_DROP_DEPLOY', '🚀 executeDeployment entered', { lane, droneName: droneToDeployed?.name, hasSelectedDrone: !!selectedDrone, usedParam: droneToDeployed !== selectedDrone });
    try {
      debugLog('DEPLOYMENT', '🎯 Deploying drone:', {
        droneName: droneToDeployed?.name,
        droneObject: droneToDeployed,
        lane,
        playerId: getLocalPlayerId(),
        turn
      });

      const result = await processActionWithGuestRouting('deployment', {
        droneData: droneToDeployed,
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
