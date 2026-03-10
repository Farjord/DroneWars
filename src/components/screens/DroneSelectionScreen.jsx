// ========================================
// DRONE SELECTION SCREEN
// ========================================
// Complete drone selection phase implementation extracted from App.jsx
// Handles both single-player and multiplayer drone selection logic

import React, { useState, useEffect, useRef } from 'react';
import { SubmittingOverlay } from './WaitingForOpponentScreen.jsx';
import { useGameState } from '../../hooks/useGameState.js';
import DroneCard from '../ui/DroneCard.jsx';
import { advanceDroneSelectionTrio } from '../../utils/droneSelectionUtils.js';
import gameStateManager from '../../managers/GameStateManager.js';
import p2pManager from '../../network/P2PManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import ConfirmationModal from '../modals/ConfirmationModal.jsx';
import SoundManager from '../../managers/SoundManager.js';
import '../../styles/phase-screens.css';

/**
 * DRONE SELECTION SCREEN COMPONENT
 * Complete drone selection phase management with state and phase completion tracking.
 * Extracted from App.jsx with all original logic preserved.
 */
function DroneSelectionScreen({ onStepComplete }) {
  const {
    gameState,
    getLocalPlayerId,
    isMultiplayer,
    getLocalPlayerState
  } = useGameState();
  const localPlayerState = getLocalPlayerState();
  const localPlayerId = getLocalPlayerId();

  // Get player-specific drone selection data
  const propertyNameTrio = `${localPlayerId}DroneSelectionTrio`;
  const propertyNamePool = `${localPlayerId}DroneSelectionPool`;
  const droneSelectionTrio = gameState[propertyNameTrio];
  const droneSelectionPool = gameState[propertyNamePool];

  // Log once on mount (not every render)
  const hasLoggedMountRef = useRef(false);
  useEffect(() => {
    if (!hasLoggedMountRef.current) {
      hasLoggedMountRef.current = true;
      debugLog('DRONE_SELECTION', 'DroneSelectionScreen mounted:', {
        localPlayerId,
        propertyNameTrio,
        propertyNamePool,
        hasTrio: !!droneSelectionTrio,
        hasPool: !!droneSelectionPool,
        trioLength: droneSelectionTrio?.length,
        poolLength: droneSelectionPool?.length,
        trioData: droneSelectionTrio?.map(d => d.name),
        player1Trio: gameState.player1DroneSelectionTrio?.map(d => d.name),
        player2Trio: gameState.player2DroneSelectionTrio?.map(d => d.name),
      });
    }
  }, []);

  // Local state for drone selection process
  const [tempSelectedDrones, setTempSelectedDrones] = useState([]);

  // Local state for trio management (initialized from player-specific state)
  const [currentTrio, setCurrentTrio] = useState(droneSelectionTrio || []);
  const [remainingPool, setRemainingPool] = useState(droneSelectionPool || []);

  // UI state for remote client submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exit confirmation state
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  /**
   * HANDLE CHOOSE DRONE FOR SELECTION
   * Advances to next trio or completes selection when 5 drones chosen.
   * Uses local state management only - no direct GameStateManager updates.
   * @param {Object} chosenDrone - The drone being selected
   */
  const handleChooseDroneForSelection = (chosenDrone) => {
    SoundManager.getInstance().play('ui_click');

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
  const handleContinueDroneSelection = async () => {
    debugLog('DRONE_SELECTION', '🔧 handleContinueDroneSelection called with:', tempSelectedDrones.length, 'drones');

    const localPlayerId = getLocalPlayerId();
    const payload = {
      playerId: localPlayerId,
      phase: 'preGameSetup',
      actionData: { subPhase: 'droneSelection', drones: tempSelectedDrones }
    };

    // DEBUG LOGGING
    debugLog('DRONE_SELECTION', 'Submitting commitment:', {
      localPlayerId,
      playerId: localPlayerId,
      droneCount: tempSelectedDrones.length,
      commitmentsBefore: gameState.commitments?.droneSelection
    });

    // Remote player: Send action to host with immediate UI feedback
    if (gameStateManager.isRemoteClient()) {
      debugLog('COMMIT_TRACE', 'Remote client sending droneSelection commitment to host', {
        phase: payload.phase,
        playerId: payload.playerId,
        actionDataKeys: Object.keys(payload.actionData),
        dronesCount: payload.actionData.drones?.length
      });

      // Set UI state immediately for visual feedback
      setIsSubmitting(true);

      p2pManager.sendActionToHost('commitment', payload);
      onStepComplete?.();
      return;
    }

    // Host/Local mode: Process action locally
    const submissionResult = await gameStateManager.submitCommitment(payload);
    if (!submissionResult.success) {
      debugLog('DRONE_SELECTION', '❌ Drone selection submission failed:', submissionResult.error);
      return;
    }
    debugLog('COMMIT_TRACE', 'Host/local submitting droneSelection commitment');
    onStepComplete?.();
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

  // Show submitting overlay while remote client is waiting for host confirmation
  if (isSubmitting) {
    return <SubmittingOverlay />;
  }

  // Show the main drone selection interface
  const isSelectionComplete = tempSelectedDrones.length === 5;

  return (
    <div className="h-screen text-white font-sans overflow-hidden flex flex-col bg-gradient-to-br from-gray-900/30 via-indigo-950/30 to-black/30 relative">
      {/* Content Wrapper */}
      <div className="flex flex-col items-center w-full p-4 relative z-10">
        {/* Header with hex decorations */}
        <div className="relative mb-4">
          {/* Background hex decorations - positioned behind text */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Upper-left hex */}
            <svg
              className="absolute opacity-15"
              style={{ transform: 'translate(-130px, -15px)' }}
              width="60" height="69" viewBox="0 0 80 92"
            >
              <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="rgba(6, 182, 212, 0.08)" stroke="#06b6d4" strokeWidth="1" />
            </svg>
            {/* Lower-right hex */}
            <svg
              className="absolute opacity-12"
              style={{ transform: 'translate(120px, 10px)' }}
              width="50" height="58" viewBox="0 0 80 92"
            >
              <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="rgba(6, 182, 212, 0.06)" stroke="#22d3ee" strokeWidth="0.8" />
            </svg>
            {/* Small right hex */}
            <svg
              className="absolute opacity-10"
              style={{ transform: 'translate(170px, -8px)' }}
              width="35" height="40" viewBox="0 0 80 92"
            >
              <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="none" stroke="#67e8f9" strokeWidth="0.5" />
            </svg>
          </div>
          <h2
            className="text-3xl font-orbitron font-bold text-center phase-announcement-shine relative z-10"
            style={{
              background: 'linear-gradient(90deg, #06b6d4, #22d3ee, #ffffff, #22d3ee, #06b6d4)',
              backgroundSize: '300% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.4))'
            }}
          >
            Select Your Active Drone Pool
          </h2>
        </div>

        {/* Pair selection */}
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
        ) : null}

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
                  isViewOnly={true}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No drones selected yet.</p>
          )}

          {/* Action Buttons - always visible */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={() => setShowExitConfirm(true)}
              className="dw-btn-hud dw-btn-hud-ghost"
            >
              EXIT
            </button>
            <button
              onClick={handleContinueDroneSelection}
              disabled={!isSelectionComplete}
              className="dw-btn-hud dw-btn-hud-cyan"
            >
              Continue to Ship Placement →
            </button>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <ConfirmationModal
          show={true}
          confirmationModal={{
            type: 'danger',
            text: 'Are you sure you want to exit? Your progress will be lost.',
            onConfirm: () => {
              // Disconnect from multiplayer if applicable
              if (isMultiplayer()) {
                p2pManager.disconnect();
              }
              gameStateManager.setState({ appState: 'menu' });
            },
            onCancel: () => setShowExitConfirm(false)
          }}
        />
      )}
    </div>
  );
}

export default DroneSelectionScreen;