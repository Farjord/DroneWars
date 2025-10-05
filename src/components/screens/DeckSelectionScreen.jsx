// ========================================
// DECK SELECTION SCREEN
// ========================================
// Complete deck selection phase implementation extracted from App.jsx
// Handles choice between standard deck and custom deck building

import React, { useState, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import { WaitingForOpponentScreen } from './DroneSelectionScreen.jsx';
import { gameEngine, startingDecklist } from '../../logic/gameLogic.js';
import gameFlowManager from '../../state/GameFlowManager.js';
import gameStateManager from '../../state/GameStateManager.js';
import p2pManager from '../../network/P2PManager.js';
import DeckBuilder from '../../DeckBuilder.jsx';
import fullCardCollection from '../../data/cardData.js';

/**
 * DECK SELECTION SCREEN COMPONENT
 * Complete deck selection phase management with state and phase completion tracking.
 * Extracted from App.jsx with all original logic preserved.
 */
function DeckSelectionScreen() {
  const {
    gameState,
    getLocalPlayerId,
    getOpponentPlayerId,
    isMultiplayer,
    getLocalPlayerState,
    getOpponentPlayerState,
    addLogEntry
  } = useGameState();

  const { turnPhase } = gameState;
  const localPlayerState = getLocalPlayerState();
  const opponentPlayerState = getOpponentPlayerState();

  // Local state for deck building UI
  const [showDeckBuilder, setShowDeckBuilder] = useState(false);
  const [customDeck, setCustomDeck] = useState({});
  const [selectedDrones, setSelectedDrones] = useState({});

  /**
   * HANDLE DECK CHOICE
   * Processes player's choice between standard deck and custom deck building.
   * @param {string} choice - Either 'standard' or 'custom'
   */
  const handleDeckChoice = async (choice) => {
    // Only handle during deck selection phase
    if (turnPhase !== 'deckSelection') return;

    console.log('🔧 handleDeckChoice called with:', choice);

    if (choice === 'standard') {
      // Build the standard deck for the local player
      const localPlayerId = getLocalPlayerId();
      const standardDeck = gameEngine.buildDeckFromList(startingDecklist);

      const payload = {
        phase: 'deckSelection',
        playerId: localPlayerId,
        actionData: { deck: standardDeck }
      };

      // Guest mode: Send action to host
      if (gameState.gameMode === 'guest') {
        console.log('[GUEST] Sending deck selection commitment to host');
        p2pManager.sendActionToHost('commitment', payload);
        return;
      }

      // Host/Local mode: Process action locally
      const submissionResult = await gameStateManager.actionProcessor.processCommitment(payload);

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
      console.log('🔧 Opening custom deck builder');

      // Show deck builder UI (stay in deckSelection phase)
      setShowDeckBuilder(true);
    }
  };

  /**
   * HANDLE DECK CHANGE
   * Updates the custom deck being built
   */
  const handleDeckChange = (cardId, quantity) => {
    setCustomDeck(prev => ({
      ...prev,
      [cardId]: quantity
    }));
  };

  /**
   * HANDLE DRONES CHANGE
   * Updates the selected drones
   */
  const handleDronesChange = (droneName, quantity) => {
    setSelectedDrones(prev => ({
      ...prev,
      [droneName]: quantity
    }));
  };

  /**
   * HANDLE CONFIRM DECK
   * Submits the custom deck as a commitment
   */
  const handleConfirmDeck = async () => {
    console.log('🔧 Confirming custom deck:', customDeck);

    // Build deck array from deck object
    const deckArray = [];
    Object.entries(customDeck).forEach(([cardId, quantity]) => {
      for (let i = 0; i < quantity; i++) {
        const card = fullCardCollection.find(c => c.id === cardId);
        if (card) {
          deckArray.push(card);
        }
      }
    });

    // Shuffle the deck for random card draw order (same as standard deck)
    const shuffledDeck = deckArray.sort(() => 0.5 - Math.random());
    console.log(`🔀 Custom deck shuffled: ${shuffledDeck.length} cards`);

    const localPlayerId = getLocalPlayerId();
    const payload = {
      phase: 'deckSelection',
      playerId: localPlayerId,
      actionData: { deck: shuffledDeck }
    };

    // Guest mode: Send action to host
    if (gameState.gameMode === 'guest') {
      console.log('[GUEST] Sending custom deck commitment to host');
      p2pManager.sendActionToHost('commitment', payload);
      setShowDeckBuilder(false);
      return;
    }

    // Host/Local mode: Process action locally
    const submissionResult = await gameStateManager.actionProcessor.processCommitment(payload);

    if (!submissionResult.success) {
      console.error('❌ Custom deck submission failed:', submissionResult.error);
      return;
    }

    console.log('✅ Custom deck submitted to PhaseManager');

    addLogEntry({
      player: 'SYSTEM',
      actionType: 'DECK_SELECTION',
      source: 'Player Setup',
      target: 'N/A',
      outcome: 'Player selected a Custom Deck.'
    }, 'handleConfirmDeck');

    setShowDeckBuilder(false);
  };

  /**
   * HANDLE IMPORT DECK
   * Imports a deck from a deck code (format: cards:CARD001:4,CARD002:2|drones:Scout Drone:1,Heavy Fighter:1)
   */
  const handleImportDeck = (deckCode) => {
    try {
      const importedDeck = {};
      const importedDrones = {};

      // Split into cards and drones sections
      const sections = deckCode.split('|');

      for (const section of sections) {
        const [type, ...data] = section.split(':');
        const dataStr = data.join(':'); // Rejoin in case drone names have colons

        if (type === 'cards') {
          const pairs = dataStr.split(',');
          for (const pair of pairs) {
            const [cardId, quantity] = pair.split(':');
            const qty = parseInt(quantity, 10);

            if (!cardId || isNaN(qty)) {
              return { success: false, message: 'Invalid card format in deck code.' };
            }

            // Verify card exists
            const card = fullCardCollection.find(c => c.id === cardId);
            if (!card) {
              return { success: false, message: `Card ${cardId} not found.` };
            }

            importedDeck[cardId] = qty;
          }
        } else if (type === 'drones') {
          const pairs = dataStr.split(',');
          for (const pair of pairs) {
            const parts = pair.split(':');
            const quantity = parts.pop(); // Last element is quantity
            const droneName = parts.join(':'); // Everything else is the drone name
            const qty = parseInt(quantity, 10);

            if (!droneName || isNaN(qty)) {
              return { success: false, message: 'Invalid drone format in deck code.' };
            }

            importedDrones[droneName] = qty;
          }
        }
      }

      setCustomDeck(importedDeck);
      setSelectedDrones(importedDrones);
      return { success: true };
    } catch (error) {
      console.error('Error importing deck:', error);
      return { success: false, message: 'Failed to parse deck code.' };
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
  const localPlayerCompleted = gameState.commitments?.deckSelection?.[localPlayerId]?.completed || false;
  const opponentCompleted = gameState.commitments?.deckSelection?.[opponentPlayerId]?.completed || false;

  // DEBUG LOGGING - Remove after fixing multiplayer issue
  console.log('🔍 [DECK SELECTION] Render check:', {
    gameMode: gameState.gameMode,
    isMultiplayer: isMultiplayer(),
    localPlayerId,
    opponentPlayerId,
    localPlayerCompleted,
    opponentCompleted,
    fullCommitmentsObject: gameState.commitments?.deckSelection,
    turnPhase,
    localPlayerDeckLength: localPlayerState.deck?.length,
    willShowWaiting: isMultiplayer() && localPlayerCompleted && !opponentCompleted
  });

  // Show waiting screen in multiplayer when local player done but opponent still selecting
  if (isMultiplayer() && localPlayerCompleted && !opponentCompleted) {
    return (
      <WaitingForOpponentScreen
        phase="deckSelection"
        localPlayerStatus="You have selected your deck and are ready to begin."
      />
    );
  }

  // Show deck builder if custom deck option selected
  if (showDeckBuilder) {
    return (
      <DeckBuilder
        selectedDrones={selectedDrones}
        fullCardCollection={fullCardCollection}
        deck={customDeck}
        onDeckChange={handleDeckChange}
        onDronesChange={handleDronesChange}
        onConfirmDeck={handleConfirmDeck}
        onImportDeck={handleImportDeck}
      />
    );
  }

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
      <div className="flex flex-col items-center justify-center h-full relative z-10">
        <h1 className="text-3xl font-orbitron font-bold text-white mb-2">Select Your Deck</h1>
        <p className="text-gray-400 mb-8">Choose a pre-defined deck or build your own.</p>
        <div className="flex flex-wrap justify-center gap-8">
          <div
            onClick={() => handleDeckChoice('standard')}
            className="w-72 bg-gray-900 border-2 border-cyan-500/50 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:border-cyan-500 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20"
          >
            <h2 className="text-2xl font-orbitron font-bold text-cyan-400 mb-3">Use Standard Deck</h2>
            <p className="font-exo text-gray-300 flex-grow">Play with the balanced, pre-built starter deck.</p>
            <button className="btn-confirm mt-6">
              Select
            </button>
          </div>
          <div
            onClick={() => handleDeckChoice('custom')}
            className="w-72 bg-gray-900 border-2 border-purple-500/50 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:border-purple-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
          >
            <h2 className="text-2xl font-orbitron font-bold text-purple-400 mb-3">Build Custom Deck</h2>
            <p className="font-exo text-gray-300 flex-grow">Create your own deck from your card collection.</p>
            <button className="mt-6 btn-continue">
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeckSelectionScreen;