// ========================================
// SHIP PLACEMENT SCREEN
// ========================================
// Complete ship placement phase implementation extracted from App.jsx
// Handles ship section placement with state management and phase completion tracking

import React, { useState, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import { WaitingForOpponentScreen, SubmittingOverlay } from './DroneSelectionScreen.jsx';
import ShipSection from '../ui/ShipSection.jsx';
import { gameEngine } from '../../logic/gameLogic.js';
import gameStateManager from '../../managers/GameStateManager.js';
import p2pManager from '../../network/P2PManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { calculateEffectiveShipStats } from '../../logic/statsCalculator.js';

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

  // UI state for guest submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to pre-populate placement from deck selection
  const getInitialPlacement = () => {
    const selectedShipComponents = localPlayerState.selectedShipComponents;

    if (!selectedShipComponents || Object.keys(selectedShipComponents).length === 0) {
      // No ship components selected, use default empty placement
      return {
        placed: initialPlacedSections || [null, null, null],
        unplaced: unplacedSections || ['bridge', 'powerCell', 'droneControlHub']
      };
    }

    // Convert ship component IDs and lanes to placed sections
    const placed = [null, null, null]; // [left, middle, right]
    const unplaced = [];

    // Map lane codes to indices
    const laneMap = { 'l': 0, 'm': 1, 'r': 2 };

    // Process selected ship components
    Object.entries(selectedShipComponents).forEach(([componentId, lane]) => {
      if (lane) {
        const component = shipComponentCollection.find(c => c.id === componentId);
        if (component && component.key) {
          const laneIndex = laneMap[lane];
          placed[laneIndex] = component.key; // Use the legacy key (bridge, powerCell, droneControlHub)
        }
      }
    });

    // Add only SELECTED ship components that aren't placed yet to unplaced list
    Object.entries(selectedShipComponents).forEach(([componentId, lane]) => {
      const component = shipComponentCollection.find(c => c.id === componentId);
      if (component && component.key && !placed.includes(component.key)) {
        unplaced.push(component.key);
      }
    });

    return { placed, unplaced };
  };

  const initialState = getInitialPlacement();

  // Local placement state (initialized from deck selection or default)
  const [localPlacedSections, setLocalPlacedSections] = useState(initialState.placed);
  const [localUnplacedSections, setLocalUnplacedSections] = useState(initialState.unplaced);

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

    debugLog('PLACEMENT', '🔧 handleSelectSectionForPlacement called with:', sectionName, 'gameMode:', gameState.gameMode);

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

    debugLog('PLACEMENT', '🔧 handleLaneSelectForPlacement called with lane:', laneIndex, 'gameMode:', gameState.gameMode);

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

    debugLog('PLACEMENT', `🔧 handleConfirmPlacement called`);

    // Validate that all sections are placed
    const hasEmptySections = localPlacedSections.some(section => section === null || section === undefined);
    if (hasEmptySections) {
      console.warn('⚠️ Cannot confirm placement: All ship sections must be placed');
      // TODO: Add error UI handling if needed
      return;
    }

    debugLog('PLACEMENT', `🔧 Submitting placement to PhaseManager:`, localPlacedSections);

    const payload = {
      phase: 'placement',
      playerId: getLocalPlayerId(),
      actionData: { placedSections: localPlacedSections }
    };

    // Guest mode: Send action to host with immediate UI feedback
    if (gameState.gameMode === 'guest') {
      debugLog('COMMITMENTS', '[GUEST] Sending ship placement commitment to host:', {
        phase: payload.phase,
        playerId: payload.playerId,
        actionDataKeys: Object.keys(payload.actionData),
        placedSectionsCount: payload.actionData.placedSections?.length
      });

      // Set UI state immediately for visual feedback
      setIsSubmitting(true);

      p2pManager.sendActionToHost('commitment', payload);

      // OPTIMISTIC UPDATE: Mark guest's own commitment locally before cascade check
      // Guest is certain it just committed (user clicked button)
      // Host will confirm this in broadcast milliseconds later
      // Uses spread pattern to match ActionProcessor structure
      gameStateManager.setState({
        commitments: {
          ...gameState.commitments,
          placement: {
            ...gameState.commitments.placement,
            player2: {
              completed: true,
              ...payload.actionData  // Spread to match ActionProcessor pattern
            }
          }
        }
      });

      debugLog('PLACEMENT_CASCADE', '✅ [GUEST CONFIRM] Optimistically updated local commitment state');
      debugLog('PLACEMENT_CASCADE', '⏸️ [GUEST CONFIRM] Cascade will be triggered by useEffect watcher when host commits');

      // NOTE: Cascade trigger moved to useEffect (lines 292-317)
      // The useEffect watches for both players' commitments and triggers cascade automatically
      // This handles both cases: guest commits first OR host commits first

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

      debugLog('PLACEMENT', '✅ Placement submitted to PhaseManager');

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

  // Reset submitting state when host confirms commitment
  useEffect(() => {
    const localPlayerId = getLocalPlayerId();
    const localPlayerCompleted = gameState.commitments?.placement?.[localPlayerId]?.completed || false;

    if (localPlayerCompleted && isSubmitting) {
      debugLog('PLACEMENT', '✅ Host confirmed guest commitment, resetting isSubmitting');
      setIsSubmitting(false);
    }
  }, [gameState.commitments, getLocalPlayerId, isSubmitting]);

  // Check completion status directly from gameState.commitments
  const localPlayerId = getLocalPlayerId();
  const opponentPlayerId = getOpponentPlayerId();
  const localPlayerCompleted = gameState.commitments?.placement?.[localPlayerId]?.completed || false;
  const opponentCompleted = gameState.commitments?.placement?.[opponentPlayerId]?.completed || false;

  // DEBUG LOGGING - Remove after fixing multiplayer issue
  debugLog('PLACEMENT', '🔍 [SHIP PLACEMENT] Render check:', {
    gameMode: gameState.gameMode,
    isMultiplayer: isMultiplayer(),
    localPlayerId,
    opponentPlayerId,
    localPlayerCompleted,
    opponentCompleted,
    isSubmitting,
    fullCommitmentsObject: gameState.commitments?.placement,
    turnPhase,
    willShowSubmitting: isSubmitting && !localPlayerCompleted,
    willShowWaiting: isMultiplayer() && localPlayerCompleted && !opponentCompleted
  });

  // UI STATE MACHINE: Show appropriate screen based on guest submission state

  // State 1: SUBMITTING - Guest sent action, waiting for host confirmation
  if (isSubmitting && !localPlayerCompleted) {
    return <SubmittingOverlay />;
  }

  // State 2: WAITING - Guest confirmed, waiting for opponent to complete
  if (isMultiplayer() && localPlayerCompleted && !opponentCompleted) {
    const localSectionNames = localPlacedSections.map((section, index) => section ? section.name : 'Empty').join(', ');
    return (
      <WaitingForOpponentScreen
        phase="placement"
        localPlayerStatus={`Your ship layout: ${localSectionNames}`}
      />
    );
  }

  // State 3: TRANSITIONING - Both players complete, automatic phase cascade starting
  // This prevents the "black screen" during automatic phases (determineFirstPlayer → energyReset → draw)
  if (isMultiplayer() && localPlayerCompleted && opponentCompleted && turnPhase === 'placement') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-6 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Game Starting...
          </h2>
          <p className="text-gray-400 text-lg">
            Preparing the battlefield
          </p>
        </div>
      </div>
    );
  }

  // State 4: SELECTING - Active placement interface (default)

  // Helper to calculate effective stats for a section in a specific lane
  const getEffectiveStatsForSection = (sectionName, laneIndex) => {
    if (!sectionName) return null;

    // Calculate ship stats with current placement
    const shipStats = calculateEffectiveShipStats(
      localPlayerState,
      localPlacedSections
    );

    // Return the stats for this specific section
    return shipStats.bySection[sectionName];
  };

  // Render the placement interface
  const allPlaced = localPlacedSections.every(section => section !== null);

  debugLog('PLACEMENT', `🔥 ShipPlacementScreen rendered:`, {
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
        {localUnplacedSections.length > 0
          ? 'Select a section, then click an empty lane to place it. You can also click a placed section to pick it up again.'
          : 'Your ship components are pre-configured. You can rearrange them by clicking a section to pick it up.'
        }
        {' '}The ship section placed in the centre lane will gain a bonus to its stats.
      </p>

      {/* Confirm button - only show when all sections are placed */}
      {allPlaced && (
        <button
          onClick={() => {
            debugLog('PLACEMENT', `🔥 Confirm Layout button clicked! allPlaced: ${allPlaced}`);
            handleConfirmPlacement();
          }}
          className="btn-confirm text-lg mb-6"
        >
          Confirm Layout
        </button>
      )}

      {/* This container holds both rows of ship sections */}
      <div className="flex flex-col items-center w-full space-y-4">
        {/* Placed Sections Row (Top) - The three lanes */}
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
                    effectiveStatsForDisplay={getEffectiveStatsForSection(placedSectionName, laneIndex)}
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

        {/* Section Header - Unplaced Sections (only show if sections exist) */}
        {localUnplacedSections.length > 0 && (
          <div className="w-full text-center mt-6 mb-2">
            <h3 className="text-lg font-orbitron text-gray-400">
              Available Sections
            </h3>
          </div>
        )}

        {/* Unplaced Sections Row (Bottom) - Picked up sections */}
        <div className="flex w-full justify-center gap-8">
          {localUnplacedSections.map(sectionName => (
            <div key={sectionName} className="flex-shrink-0 w-[calc(33.333%-1.5rem)] h-[190px]">
              <div
                onClick={() => handleSelectSectionForPlacement(sectionName)}
                className={`h-full transition-all duration-300 rounded-xl ${selectedSectionForPlacement === sectionName ? 'scale-105 ring-4 ring-cyan-400' : 'opacity-70 hover:opacity-100 cursor-pointer'}`}
              >
                <ShipSection
                  section={sectionName}
                  stats={localPlayerState.shipSections[sectionName]}
                  effectiveStatsForDisplay={getEffectiveStatsForSection(sectionName, -1)}
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
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}

export default ShipPlacementScreen;