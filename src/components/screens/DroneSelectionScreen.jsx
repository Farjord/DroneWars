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

  const { droneSelectionPool, droneSelectionTrio, turnPhase } = gameState;
  const localPlayerState = getLocalPlayerState();

  // Local state for drone selection process
  const [tempSelectedDrones, setTempSelectedDrones] = useState([]);

  // Local state for trio management (initialized from global state)
  const [currentTrio, setCurrentTrio] = useState(droneSelectionTrio);
  const [remainingPool, setRemainingPool] = useState(droneSelectionPool);

  /**
   * HANDLE CHOOSE DRONE FOR SELECTION
   * Advances to next trio or completes selection when 5 drones chosen.
   * Uses local state management only - no direct GameStateManager updates.
   * @param {Object} chosenDrone - The drone being selected
   */
  const handleChooseDroneForSelection = (chosenDrone) => {
    // Only handle during drone selection phase
    if (turnPhase !== 'droneSelection') return;

    console.log('🔧 handleChooseDroneForSelection called with:', chosenDrone.name);

    const newSelection = [...tempSelectedDrones, chosenDrone];
    setTempSelectedDrones(newSelection);

    if (newSelection.length < 5) {
      // Continue selection process - advance to next trio using local state
      const nextTrioData = advanceDroneSelectionTrio(remainingPool);

      // Update local state only - no GameStateManager updates
      setCurrentTrio(nextTrioData.droneSelectionTrio);
      setRemainingPool(nextTrioData.droneSelectionPool);

      console.log('🔧 Advanced to next trio locally, selected:', newSelection.length, 'of 5 drones');
    } else {
      console.log('🔧 All 5 drones selected, waiting for Continue button click');
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

    console.log('🔧 handleContinueDroneSelection called with:', tempSelectedDrones.length, 'drones');

    const localPlayerId = getLocalPlayerId();
    const payload = {
      playerId: localPlayerId,
      phase: 'droneSelection',
      actionData: { drones: tempSelectedDrones }
    };

    // DEBUG LOGGING
    console.log('🔍 [DRONE SELECTION] Submitting commitment:', {
      gameMode: gameState.gameMode,
      playerId: localPlayerId,
      droneCount: tempSelectedDrones.length,
      commitmentsBefore: gameState.commitments?.droneSelection
    });

    // Guest mode: Send action to host
    if (gameState.gameMode === 'guest') {
      console.log('[GUEST] Sending drone selection commitment to host');
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
      console.log('✅ Drone selection submitted successfully');
    }).catch(error => {
      console.error('❌ Drone selection submission error:', error);
    });

    console.log('✅ Drone selection submitted to PhaseManager');

    // PhaseManager will handle:
    // - GameStateManager updates when both players complete
    // - Event emission for UI state changes
    // - Phase transition logic
    // - AI completion in single-player mode
  };

  // Check completion status directly from gameState.commitments
  const localPlayerId = getLocalPlayerId();
  const opponentPlayerId = getOpponentPlayerId();
  const localPlayerCompleted = gameState.commitments?.droneSelection?.[localPlayerId]?.completed || false;
  const opponentCompleted = gameState.commitments?.droneSelection?.[opponentPlayerId]?.completed || false;

  // DEBUG LOGGING - Remove after fixing multiplayer issue
  console.log('🔍 [DRONE SELECTION] Render check:', {
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
    <div className="h-screen bg-gray-950 text-white font-sans overflow-hidden flex flex-col bg-gradient-to-br from-gray-900 via-indigo-950 to-black relative">
      <style>
        {`
          .hexagon { clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }
          .hexagon-flat { clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }
          .font-orbitron { font-family: 'Orbitron', sans-serif; }
          .font-exo { font-family: 'Exo', sans-serif; }
        `}
      </style>
      <div className="flex flex-col items-center w-full p-4">
      <h2 className="text-3xl font-bold mb-2 text-white text-center">
        Choose Your Drones
      </h2>

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

      {/* Trio selection or completion message */}
      {!isSelectionComplete ? (
        <>
          <p className="text-center text-gray-400 mb-6">
            Choice {tempSelectedDrones.length + 1} of 5: Select one drone from the three options below to add to your Active Drone Pool.
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
            <p className="text-gray-300">All 5 drones have been selected. Ready to proceed to deck selection.</p>
          </div>
        </div>
      )}

      {/* Continue button - always present but with different states */}
      <button
        onClick={handleContinueDroneSelection}
        disabled={!isSelectionComplete}
        className={`px-8 py-3 font-bold rounded-lg transition-all mb-8 ${
          isSelectionComplete
            ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/25 hover:shadow-green-500/30 transform hover:scale-105'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isSelectionComplete ? 'Continue to Deck Selection' : `Continue (${tempSelectedDrones.length}/5)`}
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