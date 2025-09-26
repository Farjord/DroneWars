// ========================================
// DECK SELECTION SCREEN
// ========================================
// Complete deck selection phase implementation extracted from App.jsx
// Handles choice between standard deck and custom deck building

import React, { useState, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import { WaitingForOpponentScreen } from './DroneSelectionScreen.jsx';
import { gameEngine, startingDecklist } from '../../logic/gameLogic.js';
import simultaneousActionManager from '../../state/SimultaneousActionManager.js';

/**
 * DECK SELECTION SCREEN COMPONENT
 * Complete deck selection phase management with state and phase completion tracking.
 * Extracted from App.jsx with all original logic preserved.
 */
function DeckSelectionScreen() {
  const {
    gameState,
    getLocalPlayerId,
    isMultiplayer,
    getLocalPlayerState,
    getOpponentPlayerState,
    setTurnPhase,
    addLogEntry
  } = useGameState();

  const { turnPhase } = gameState;
  const localPlayerState = getLocalPlayerState();
  const opponentPlayerState = getOpponentPlayerState();

  // Local state for phase completion tracking
  const [localPhaseCompletion, setLocalPhaseCompletion] = useState({
    deckSelection: false
  });
  const [opponentPhaseCompletion, setOpponentPhaseCompletion] = useState({
    deckSelection: false
  });

  // Event listener for phase completion from PhaseManager
  useEffect(() => {
    const handlePhaseManagerEvent = (event) => {
      const { type, phase, playerId } = event.detail || event;

      console.log(`🔔 DeckSelectionScreen received PhaseManager event: ${type}`, { phase, playerId });

      if (phase !== 'deckSelection') return;

      if (type === 'playerCompleted') {
        const isLocalPlayer = playerId === getLocalPlayerId();

        if (isLocalPlayer) {
          setLocalPhaseCompletion(prev => ({ ...prev, deckSelection: true }));
        } else if (isMultiplayer()) {
          setOpponentPhaseCompletion(prev => ({ ...prev, deckSelection: true }));
        }
      } else if (type === 'phaseCompleted') {
        // Clear phase completion tracking when phase completes
        setLocalPhaseCompletion(prev => ({ ...prev, deckSelection: false }));
        setOpponentPhaseCompletion(prev => ({ ...prev, deckSelection: false }));
      }
    };

    // Listen for PhaseManager events
    window.addEventListener('phaseManagerEvent', handlePhaseManagerEvent);

    return () => {
      window.removeEventListener('phaseManagerEvent', handlePhaseManagerEvent);
    };
  }, [getLocalPlayerId, isMultiplayer]);

  /**
   * HANDLE DECK CHOICE
   * Processes player's choice between standard deck and custom deck building.
   * @param {string} choice - Either 'standard' or 'custom'
   */
  const handleDeckChoice = (choice) => {
    // Only handle during deck selection phase
    if (turnPhase !== 'deckSelection') return;

    console.log('🔧 handleDeckChoice called with:', choice);

    if (choice === 'standard') {
      // Build the standard deck for the local player
      const localPlayerId = getLocalPlayerId();
      const standardDeck = gameEngine.buildDeckFromList(startingDecklist);

      // Use SimultaneousActionManager to submit deck selection
      const submissionResult = simultaneousActionManager.submitDeckSelection(localPlayerId, standardDeck);

      if (!submissionResult.success) {
        console.error('❌ Deck selection submission failed:', submissionResult.error);
        return;
      }

      console.log('✅ Standard deck selection submitted to PhaseManager');

      addLogEntry({
        player: 'SYSTEM',
        actionType: 'DECK_SELECTION',
        source: 'Player Setup',
        target: 'N/A',
        outcome: 'Player selected the Standard Deck.'
      }, 'handleDeckChoice');

    } else if (choice === 'custom') {
      console.log('🔧 Transitioning to deck building phase');

      // Transition to deck building phase
      // TODO: Will be refactored when we handle deckBuilding phase properly
      setTurnPhase('deckBuilding');
    }
  };

  // Check completion status
  const localPlayerHasDeck = localPlayerState.deck && localPlayerState.deck.length > 0;

  console.log('Deck selection render check:', {
    isMultiplayer: isMultiplayer(),
    localPlayerHasDeck,
    opponentPhaseCompletion_deckSelection: opponentPhaseCompletion.deckSelection,
    turnPhase,
    localPlayerDeckLength: localPlayerState.deck?.length
  });

  if (isMultiplayer() && localPlayerHasDeck && !opponentPhaseCompletion.deckSelection) {
    return (
      <WaitingForOpponentScreen
        phase="deckSelection"
        localPlayerStatus="You have selected your deck and are ready to begin."
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-3xl font-orbitron font-bold text-white mb-2">Select Your Deck</h1>
      <p className="text-gray-400 mb-8">Choose a pre-defined deck or build your own.</p>
      <div className="flex flex-wrap justify-center gap-8">
        <div
          onClick={() => handleDeckChoice('standard')}
          className="w-72 bg-gray-900 border-2 border-cyan-500/50 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:border-cyan-500 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20"
        >
          <h2 className="text-2xl font-orbitron font-bold text-cyan-400 mb-3">Use Standard Deck</h2>
          <p className="font-exo text-gray-300 flex-grow">Play with the balanced, pre-built starter deck.</p>
          <button className="mt-6 bg-cyan-600 text-white font-bold px-6 py-2 rounded-full hover:bg-cyan-700 transition-colors duration-200">
            Select
          </button>
        </div>
        <div
          onClick={() => handleDeckChoice('custom')}
          className="w-72 bg-gray-900 border-2 border-purple-500/50 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:border-purple-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
        >
          <h2 className="text-2xl font-orbitron font-bold text-purple-400 mb-3">Build Custom Deck</h2>
          <p className="font-exo text-gray-300 flex-grow">Create your own deck from your card collection.</p>
          <button className="mt-6 bg-purple-600 text-white font-bold px-6 py-2 rounded-full hover:bg-purple-700 transition-colors duration-200">
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeckSelectionScreen;