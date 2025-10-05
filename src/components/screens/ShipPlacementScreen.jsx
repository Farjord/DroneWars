// ========================================
// SHIP PLACEMENT SCREEN
// ========================================
// Complete ship placement phase implementation extracted from App.jsx
// Handles ship section placement with state management and phase completion tracking

import React, { useState, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import { WaitingForOpponentScreen } from './DroneSelectionScreen.jsx';
import ShipSection from '../ui/ShipSection.jsx';
import { gameEngine } from '../../logic/gameLogic.js';
import gameStateManager from '../../state/GameStateManager.js';
import p2pManager from '../../network/P2PManager.js';

/**
 * SHIP PLACEMENT SCREEN COMPONENT
 * Complete ship placement phase management with state and phase completion tracking.
 * Extracted from App.jsx with all original logic preserved.
 */
function ShipPlacementScreen() {
  const {
    gameState,
    getLocalPlayerId,
    getOpponentPlayerId,
    isMultiplayer,
    getLocalPlayerState,
    getLocalPlacedSections,
    updateGameState
  } = useGameState();

  const { turnPhase, unplacedSections } = gameState;
  const localPlayerState = getLocalPlayerState();
  const initialPlacedSections = getLocalPlacedSections();

  // Local state for ship placement process
  const [selectedSectionForPlacement, setSelectedSectionForPlacement] = useState(null);

  // Local placement state (initialized from global state)
  const [localPlacedSections, setLocalPlacedSections] = useState(initialPlacedSections || [null, null, null]);
  const [localUnplacedSections, setLocalUnplacedSections] = useState(unplacedSections || ['bridge', 'powerCell', 'droneControlHub']);

  /**
   * HANDLE SELECT SECTION FOR PLACEMENT
   * Manages ship section selection during placement phase.
   * Handles selection toggling and section removal from lanes.
   * Uses local state for placement changes during UI interactions.
   * @param {string} sectionName - Name of the section being selected
   */
  const handleSelectSectionForPlacement = (sectionName) => {
    // Only handle during placement phase
    if (turnPhase !== 'placement') return;

    console.log('🔧 handleSelectSectionForPlacement called with:', sectionName, 'gameMode:', gameState.gameMode);

    // If clicking a section in the top "unplaced" row
    if (localUnplacedSections.includes(sectionName)) {
        // Toggle selection: if it's already selected, unselect it. Otherwise, select it.
        setSelectedSectionForPlacement(prev => prev === sectionName ? null : sectionName);
    } else {
        // If clicking a section that's already in a lane (a "placed" section)
        const laneIndex = localPlacedSections.indexOf(sectionName);
        const newPlaced = [...localPlacedSections];
        newPlaced[laneIndex] = null; // Remove from lane

        // Update local state instead of GameStateManager
        setLocalPlacedSections(newPlaced);
        setLocalUnplacedSections(prev => [...prev, sectionName]);

        setSelectedSectionForPlacement(null); // Clear the selection
    }
  };

  /**
   * HANDLE LANE SELECT FOR PLACEMENT
   * Places selected ship section in chosen lane.
   * Handles lane swapping and section management.
   * Uses local state for placement changes during UI interactions.
   * @param {number} laneIndex - Index of the lane (0, 1, 2)
   */
  const handleLaneSelectForPlacement = (laneIndex) => {
    // Only handle during placement phase
    if (turnPhase !== 'placement') return;

    console.log('🔧 handleLaneSelectForPlacement called with lane:', laneIndex, 'gameMode:', gameState.gameMode);

    if (selectedSectionForPlacement) {
      // If the lane is occupied, swap with the selected section
      if (localPlacedSections[laneIndex]) {
        const sectionToSwap = localPlacedSections[laneIndex];
        const newPlaced = [...localPlacedSections];
        newPlaced[laneIndex] = selectedSectionForPlacement;

        // Find where the selected section was and put the swapped one there
        const oldIndexOfSelected = localUnplacedSections.indexOf(selectedSectionForPlacement);
        const newUnplaced = [...localUnplacedSections];
        newUnplaced.splice(oldIndexOfSelected, 1, sectionToSwap);

        // Update local state instead of GameStateManager
        setLocalPlacedSections(newPlaced);
        setLocalUnplacedSections(newUnplaced);

      } else {
        // If the lane is empty, place the section
        const newPlaced = [...localPlacedSections];
        newPlaced[laneIndex] = selectedSectionForPlacement;

        // Update local state instead of GameStateManager
        setLocalPlacedSections(newPlaced);
        setLocalUnplacedSections(prev => prev.filter(s => s !== selectedSectionForPlacement));
      }
      setSelectedSectionForPlacement(null);
    } else if (localPlacedSections[laneIndex]) {
      // If no section is selected, clicking a placed one picks it up
      handleSelectSectionForPlacement(localPlacedSections[laneIndex]);
    }
  };

  /**
   * HANDLE CONFIRM PLACEMENT
   * Finalizes ship section placement using PhaseManager.
   * Validates placement and delegates to PhaseManager for processing.
   */
  const handleConfirmPlacement = async () => {
    // Only handle during placement phase
    if (turnPhase !== 'placement') return;

    console.log(`🔧 handleConfirmPlacement called`);

    // Validate that all sections are placed
    const hasEmptySections = localPlacedSections.some(section => section === null || section === undefined);
    if (hasEmptySections) {
      console.warn('⚠️ Cannot confirm placement: All ship sections must be placed');
      // TODO: Add error UI handling if needed
      return;
    }

    console.log(`🔧 Submitting placement to PhaseManager:`, localPlacedSections);

    const payload = {
      phase: 'placement',
      playerId: getLocalPlayerId(),
      actionData: { placedSections: localPlacedSections }
    };

    // Guest mode: Send action to host
    if (gameState.gameMode === 'guest') {
      console.log('[GUEST] Sending ship placement commitment to host');
      p2pManager.sendActionToHost('commitment', payload);
      return;
    }

    // Host/Local mode: Submit placement to ActionProcessor
    try {
      const submissionResult = await gameStateManager.actionProcessor.processCommitment(payload);

      if (!submissionResult.success) {
        console.error('❌ Placement submission failed:', submissionResult.error);
        // TODO: Add error UI handling if needed
        return;
      }

      console.log('✅ Placement submitted to PhaseManager');

      // Waiting screen will be shown automatically if in multiplayer and opponent not complete
      // No modal needed - WaitingForOpponentScreen component handles this

    } catch (error) {
      console.error('❌ Error submitting placement:', error);
      // TODO: Add error UI handling if needed
    }
  };

  // Notify GuestMessageQueueService when React has finished rendering (guest mode only)
  useEffect(() => {
    if (gameState.gameMode === 'guest') {
      gameStateManager.emit('render_complete');
    }
  }, [gameState, gameStateManager]);

  // Check completion status directly from gameState.commitments
  const localPlayerId = getLocalPlayerId();
  const opponentPlayerId = getOpponentPlayerId();
  const localPlayerCompleted = gameState.commitments?.placement?.[localPlayerId]?.completed || false;
  const opponentCompleted = gameState.commitments?.placement?.[opponentPlayerId]?.completed || false;

  // DEBUG LOGGING - Remove after fixing multiplayer issue
  console.log('🔍 [SHIP PLACEMENT] Render check:', {
    gameMode: gameState.gameMode,
    isMultiplayer: isMultiplayer(),
    localPlayerId,
    opponentPlayerId,
    localPlayerCompleted,
    opponentCompleted,
    fullCommitmentsObject: gameState.commitments?.placement,
    turnPhase,
    willShowWaiting: isMultiplayer() && localPlayerCompleted && !opponentCompleted
  });

  // Show waiting screen in multiplayer when local player done but opponent still selecting
  if (isMultiplayer() && localPlayerCompleted && !opponentCompleted) {
    const localSectionNames = localPlacedSections.map((section, index) => section ? section.name : 'Empty').join(', ');
    return (
      <WaitingForOpponentScreen
        phase="placement"
        localPlayerStatus={`Your ship layout: ${localSectionNames}`}
      />
    );
  }

  // Render the placement interface
  const allPlaced = localPlacedSections.every(section => section !== null);

  console.log(`🔥 ShipPlacementScreen rendered:`, {
    allPlaced,
    placed: localPlacedSections,
    unplaced: unplacedSections,
    selected: selectedSectionForPlacement
  });

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
      <div className="flex flex-col items-center w-full h-full justify-start pt-8 px-4">
      <h2 className="text-3xl font-bold mb-2 text-white text-center font-orbitron">
        Configure Your Ship Layout
      </h2>
      <p className="text-center text-gray-400 mb-8">
        Select a section, then click an empty lane to place it. You can also click a placed section to pick it up again.
        The ship section placed in the centre lane will gain a bonus to its stats.
      </p>

      {/* This container holds both rows of ship sections */}
      <div className="flex flex-col items-center w-full space-y-4">
        {/* Unplaced Sections Row */}
        <div className="flex w-full justify-between gap-8">
          {['bridge', 'powerCell', 'droneControlHub'].map(sectionName => (
            <div key={sectionName} className="flex-1 min-w-0 h-[190px]">
              {localUnplacedSections.includes(sectionName) && (
                <div
                  onClick={() => handleSelectSectionForPlacement(sectionName)}
                  className={`h-full transition-all duration-300 rounded-xl ${selectedSectionForPlacement === sectionName ? 'scale-105 ring-4 ring-cyan-400' : 'opacity-70 hover:opacity-100 cursor-pointer'}`}
                >
                  <ShipSection
                    section={sectionName}
                    stats={localPlayerState.shipSections[sectionName]}
                    effectiveStatsForDisplay={localPlayerState.shipSections[sectionName].stats.healthy}
                    isPlayer={true}
                    isInteractive={true}
                    gameEngine={gameEngine}
                    turnPhase={turnPhase}
                    isMyTurn={() => true}
                    passInfo={{}}
                    getLocalPlayerId={getLocalPlayerId}
                    localPlayerState={localPlayerState}
                    shipAbilityMode={null}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Placed Sections Row */}
        <div className="flex w-full justify-between gap-8">
          {[0, 1, 2].map(laneIndex => {
            const placedSectionName = localPlacedSections[laneIndex];
            const isSelectedForPlacement = selectedSectionForPlacement && !localPlacedSections[laneIndex];

            return (
              <div
                key={laneIndex}
                className="flex-1 min-w-0 h-[190px]"
                onClick={() => handleLaneSelectForPlacement(laneIndex)}
              >
                {placedSectionName ? (
                  <ShipSection
                    section={placedSectionName}
                    stats={localPlayerState.shipSections[placedSectionName]}
                    effectiveStatsForDisplay={localPlayerState.shipSections[placedSectionName].stats.healthy}
                    isPlayer={true}
                    isInteractive={true}
                    isInMiddleLane={laneIndex === 1}
                    gameEngine={gameEngine}
                    turnPhase={turnPhase}
                    isMyTurn={() => true}
                    passInfo={{}}
                    getLocalPlayerId={getLocalPlayerId}
                    localPlayerState={localPlayerState}
                    shipAbilityMode={null}
                  />
                ) : (
                  <div className={`bg-black/30 rounded-xl border-2 border-dashed border-purple-500/50 flex items-center justify-center text-purple-300/70 p-4 h-full transition-colors duration-300 ${isSelectedForPlacement ? 'cursor-pointer hover:border-purple-500 hover:bg-purple-900/20' : ''}`}>
                    <span className="text-center font-bold">
                      {laneIndex === 1 ? 'Lane 2 (Center Bonus)' : `Lane ${laneIndex + 1}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => {
          console.log(`🔥 Confirm Layout button clicked! allPlaced: ${allPlaced}`);
          handleConfirmPlacement();
        }}
        disabled={!allPlaced}
        className="btn-confirm mt-12 text-lg"
      >
        Confirm Layout
      </button>
    </div>
    </div>
  );
}

export default ShipPlacementScreen;