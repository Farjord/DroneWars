// ========================================
// DRONE SELECTION SCREEN
// ========================================
// Complete drone selection phase implementation extracted from App.jsx
// Handles both single-player and multiplayer drone selection logic

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState.js';
import DroneCard from '../ui/DroneCard.jsx';
import { advanceDroneSelectionTrio } from '../../utils/droneSelectionUtils.js';
import gameStateManager from '../../state/GameStateManager.js';
import p2pManager from '../../network/P2PManager.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * WAITING FOR OPPONENT SCREEN COMPONENT
 * Displays waiting screen when opponent is still making selections.
 * Shows loading indicator and current status.
 * @param {string} phase - Current game phase
 * @param {string} localPlayerStatus - Local player completion status
 */
export const WaitingForOpponentScreen = ({ phase, localPlayerStatus }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center p-8">
        <Loader2 className="w-16 h-16 mx-auto text-cyan-400 animate-spin mb-6" />
        <h2 className="text-3xl font-bold text-white mb-4">
          Waiting for Your Opponent
        </h2>
        <p className="text-gray-400 text-lg mb-6">
          {phase === 'droneSelection' && 'Your opponent is still selecting their drones...'}
          {phase === 'deckSelection' && 'Your opponent is still choosing their deck...'}
        </p>
        {localPlayerStatus && (
          <div className="bg-slate-800 rounded-lg p-4 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-green-400 mb-2">✅ Your Selection Complete</h3>
            <p className="text-gray-300 text-sm">{localPlayerStatus}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * DRONE SELECTION SCREEN COMPONENT
 * Complete drone selection phase management with state and phase completion tracking.
 * Extracted from App.jsx with all original logic preserved.
 */
function DroneSelectionScreen() {
  const {
    gameState,
    getLocalPlayerId,
    getOpponentPlayerId,
    isMultiplayer,
    getLocalPlayerState
  } = useGameState();

  const { turnPhase } = gameState;
  const localPlayerState = getLocalPlayerState();
  const localPlayerId = getLocalPlayerId();

  // Get player-specific drone selection data
  const propertyNameTrio = `${localPlayerId}DroneSelectionTrio`;
  const propertyNamePool = `${localPlayerId}DroneSelectionPool`;
  const droneSelectionTrio = gameState[propertyNameTrio];
  const droneSelectionPool = gameState[propertyNamePool];

  debugLog('DRONE_SELECTION', 'DroneSelectionScreen render:', {
    localPlayerId,
    propertyNameTrio,
    propertyNamePool,
    hasTrio: !!droneSelectionTrio,
    hasPool: !!droneSelectionPool,
    trioLength: droneSelectionTrio?.length,
    poolLength: droneSelectionPool?.length,
    trioData: droneSelectionTrio?.map(d => d.name),
    // Also check what's in the other player's data
    player1Trio: gameState.player1DroneSelectionTrio?.map(d => d.name),
    player2Trio: gameState.player2DroneSelectionTrio?.map(d => d.name),
    gameMode: gameState.gameMode
  });

  // Local state for drone selection process
  const [tempSelectedDrones, setTempSelectedDrones] = useState([]);

  // Local state for trio management (initialized from player-specific state)
  const [currentTrio, setCurrentTrio] = useState(droneSelectionTrio || []);
  const [remainingPool, setRemainingPool] = useState(droneSelectionPool || []);

  /**
   * HANDLE CHOOSE DRONE FOR SELECTION
   * Advances to next trio or completes selection when 5 drones chosen.
   * Uses local state management only - no direct GameStateManager updates.
   * @param {Object} chosenDrone - The drone being selected
   */
  const handleChooseDroneForSelection = (chosenDrone) => {
    // Only handle during drone selection phase
    if (turnPhase !== 'droneSelection') return;

    debugLog('DRONE_SELECTION', '🔧 handleChooseDroneForSelection called with:', chosenDrone.name);

    const newSelection = [...tempSelectedDrones, chosenDrone];
    setTempSelectedDrones(newSelection);

    if (newSelection.length < 5) {
      // Continue selection process - advance to next pair (2 at a time) using local state
      const nextTrioData = advanceDroneSelectionTrio(remainingPool, 2);

      // Update local state only - no GameStateManager updates
      setCurrentTrio(nextTrioData.droneSelectionTrio);
      setRemainingPool(nextTrioData.droneSelectionPool);

      debugLog('DRONE_SELECTION', '🔧 Advanced to next pair locally, selected:', newSelection.length, 'of 5 drones');
    } else {
      debugLog('DRONE_SELECTION', '🔧 All 5 drones selected, waiting for Continue button click');
    }
  };

  /**
   * HANDLE CONTINUE DRONE SELECTION
   * Processes the Continue button click after 5 drones are selected.
   * Uses PhaseManager submission pattern for drone selection.
   */
  const handleContinueDroneSelection = () => {
    // Only handle during drone selection phase
    if (turnPhase !== 'droneSelection') return;

    debugLog('DRONE_SELECTION', '🔧 handleContinueDroneSelection called with:', tempSelectedDrones.length, 'drones');

    const localPlayerId = getLocalPlayerId();
    const payload = {
      playerId: localPlayerId,
      phase: 'droneSelection',
      actionData: { drones: tempSelectedDrones }
    };

    // DEBUG LOGGING
    debugLog('DRONE_SELECTION', 'Submitting commitment:', {
      gameMode: gameState.gameMode,
      playerId: localPlayerId,
      droneCount: tempSelectedDrones.length,
      commitmentsBefore: gameState.commitments?.droneSelection
    });

    // Guest mode: Send action to host
    if (gameState.gameMode === 'guest') {
      debugLog('DRONE_SELECTION', '[GUEST] Sending drone selection commitment to host');
      p2pManager.sendActionToHost('commitment', payload);
      return;
    }

    // Host/Local mode: Process action locally
    gameStateManager.actionProcessor.queueAction({
      type: 'commitment',
      payload: payload
    }).then(submissionResult => {
      if (!submissionResult.success) {
        console.error('❌ Drone selection submission failed:', submissionResult.error);
        return;
      }
      debugLog('DRONE_SELECTION', '✅ Drone selection submitted successfully');
    }).catch(error => {
      console.error('❌ Drone selection submission error:', error);
    });

    debugLog('DRONE_SELECTION', '✅ Drone selection submitted to PhaseManager');

    // PhaseManager will handle:
    // - GameStateManager updates when both players complete
    // - Event emission for UI state changes
    // - Phase transition logic
    // - AI completion in single-player mode
  };

  // Reinitialize local state if drone selection data changes (handles late arrival from network)
  useEffect(() => {
    if (droneSelectionTrio && droneSelectionTrio.length > 0 && currentTrio.length === 0) {
      setCurrentTrio(droneSelectionTrio);
      debugLog('DRONE_SELECTION', '🔄 Updated currentTrio from gameState after data arrival');
    }
    if (droneSelectionPool && droneSelectionPool.length > 0 && remainingPool.length === 0) {
      setRemainingPool(droneSelectionPool);
      debugLog('DRONE_SELECTION', '🔄 Updated remainingPool from gameState after data arrival');
    }
  }, [droneSelectionTrio, droneSelectionPool]);

  // Notify GuestMessageQueueService when React has finished rendering (guest mode only)
  useEffect(() => {
    if (gameState.gameMode === 'guest') {
      gameStateManager.emit('render_complete');
    }
  }, [gameState, gameStateManager]);

  // Check completion status directly from gameState.commitments
  const opponentPlayerId = getOpponentPlayerId();
  const localPlayerCompleted = gameState.commitments?.droneSelection?.[localPlayerId]?.completed || false;
  const opponentCompleted = gameState.commitments?.droneSelection?.[opponentPlayerId]?.completed || false;

  // DEBUG LOGGING
  debugLog('DRONE_SELECTION', 'Render check:', {
    gameMode: gameState.gameMode,
    isMultiplayer: isMultiplayer(),
    localPlayerId,
    opponentPlayerId,
    localPlayerCompleted,
    opponentCompleted,
    fullCommitmentsObject: gameState.commitments?.droneSelection,
    turnPhase,
    willShowWaiting: isMultiplayer() && localPlayerCompleted && !opponentCompleted
  });

  // Show waiting screen in multiplayer when local player done but opponent still selecting
  if (isMultiplayer() && localPlayerCompleted && !opponentCompleted) {
    // Get drone names from commitments
    const localDrones = gameState.commitments?.droneSelection?.[localPlayerId]?.drones || tempSelectedDrones;
    const localDroneNames = localDrones.length > 0 ?
      localDrones.map(d => d.name).join(', ') :
      'Selection complete';

    return (
      <WaitingForOpponentScreen
        phase="droneSelection"
        localPlayerStatus={`You selected: ${localDroneNames}`}
      />
    );
  }

  // Show the main drone selection interface
  const isSelectionComplete = tempSelectedDrones.length === 5;

  return (
    <div className="h-screen text-white font-sans overflow-hidden flex flex-col bg-gradient-to-br from-gray-900/30 via-indigo-950/30 to-black/30 relative">
      <style>
        {`
          .hexagon { clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }
          .hexagon-flat { clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }
          .font-orbitron { font-family: 'Orbitron', sans-serif; }
          .font-exo { font-family: 'Exo', sans-serif; }
        `}
      </style>
      
      {/* Content Wrapper */}
      <div className="flex flex-col items-center w-full p-4 relative z-10">
        <h2 className="text-3xl font-bold mb-2 text-white text-center">
          Select Your Active Drone Pool
        </h2>
        <p className="text-gray-400 text-sm mb-4">Choosing 5 drones from your deck of 10</p>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index < tempSelectedDrones.length
                  ? 'bg-green-500'
                  : 'bg-gray-600'
              }`}
            />
          ))}
          <span className="ml-2 text-gray-400">
            {tempSelectedDrones.length}/5 drones selected
          </span>
        </div>

        {/* Pair selection or completion message */}
        {!isSelectionComplete ? (
          <>
            <p className="text-center text-gray-400 mb-6">
              Choice {tempSelectedDrones.length + 1} of 5: Select one drone from the two options below for your Active Drone Pool.
            </p>

            {currentTrio && currentTrio.length > 0 && (
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {currentTrio.map((drone, index) => (
                  <DroneCard
                    key={drone.name || index}
                    drone={drone}
                    onClick={() => handleChooseDroneForSelection(drone)}
                    isSelectable={true}
                    deployedCount={0}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center mb-8">
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-4 mb-4">
              <p className="text-green-400 font-bold mb-2">✅ Selection Complete!</p>
              <p className="text-gray-300">All 5 drones have been selected for your Active Pool. Ready to proceed to ship placement.</p>
            </div>
          </div>
        )}

        {/* Continue button - always present but with different states */}
        <button
          onClick={handleContinueDroneSelection}
          disabled={!isSelectionComplete}
          className="btn-continue mb-8"
        >
          {isSelectionComplete ? 'Continue to Ship Placement' : `Continue (${tempSelectedDrones.length}/5)`}
        </button>

        {/* Selected drones display */}
        <div className="w-full mt-4 pt-8 border-t border-gray-700">
          <h3 className="text-2xl font-bold text-white text-center mb-4">
            Your Selection ({tempSelectedDrones.length}/5)
            {isSelectionComplete && <span className="text-green-400 ml-2">✓</span>}
          </h3>

          {tempSelectedDrones.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-6">
              {tempSelectedDrones.map((drone, index) => (
                <DroneCard
                  key={index}
                  drone={drone}
                  isSelectable={false}
                  deployedCount={0}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No drones selected yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DroneSelectionScreen;