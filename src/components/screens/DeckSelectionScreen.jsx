// ========================================
// DECK SELECTION SCREEN
// ========================================
// Complete deck selection phase implementation extracted from App.jsx
// Handles choice between standard deck and custom deck building

import React, { useState, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import { WaitingForOpponentScreen, SubmittingOverlay } from './DroneSelectionScreen.jsx';
import { gameEngine } from '../../logic/gameLogic.js';
import gameStateManager from '../../managers/GameStateManager.js';
import p2pManager from '../../network/P2PManager.js';
import DeckBuilder from './DeckBuilder/DeckBuilder.jsx';
import fullCardCollection from '../../data/cardData.js';
import fullDroneCollection from '../../data/droneData.js';
import vsDecks from '../../data/vsModeDeckData.js';
import { parseJSObjectLiteral, convertFromAIFormat } from '../../utils/deckExportUtils.js';
import { debugLog } from '../../utils/debugLogger.js';
import SeededRandom from '../../utils/seededRandom.js';
import ConfirmationModal from '../modals/ConfirmationModal.jsx';
import ViewDeckModal from '../modals/ViewDeckModal.jsx';
import SoundManager from '../../managers/SoundManager.js';
import { updateDeckState, updateDroneState } from '../../utils/deckStateUtils.js';

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
  const [selectedShipComponents, setSelectedShipComponents] = useState({});

  // UI state for guest submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exit confirmation state
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // VS deck selection state
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [deckModalDeck, setDeckModalDeck] = useState(null);

  /**
   * PREPARE VS DECK DATA
   * Converts a VS deck's data into props for ViewDeckModal.
   * Same pattern as prepareAIDeckData in LobbyScreen.
   */
  const prepareVSDeckData = (deck) => {
    if (!deck) return { drones: [], cards: [], shipComponents: {} };

    const drones = fullDroneCollection.filter(d => deck.dronePool.includes(d.name));

    const cards = deck.decklist
      .filter(entry => entry.quantity > 0)
      .map(entry => ({
        card: fullCardCollection.find(c => c.id === entry.id),
        quantity: entry.quantity
      }))
      .filter(item => item.card);

    return { drones, cards, shipComponents: deck.shipComponents };
  };

  /**
   * HANDLE SELECT DECK
   * Highlights a VS deck card (does NOT submit).
   */
  const handleSelectDeck = (deck) => {
    SoundManager.getInstance().play('ui_click');
    setSelectedDeck(deck);
  };

  /**
   * HANDLE VIEW DECK
   * Opens ViewDeckModal for the given VS deck.
   */
  const handleViewDeck = (deck) => {
    setDeckModalDeck(deck);
    setDeckModalOpen(true);
  };

  /**
   * HANDLE CONFIRM SELECTED DECK
   * Builds the selected VS deck and submits it as a commitment.
   */
  const handleConfirmSelectedDeck = async () => {
    if (!selectedDeck || turnPhase !== 'deckSelection') return;

    debugLog('DECK_SELECTION', '🔧 Confirming VS deck:', selectedDeck.name);

    const localPlayerId = getLocalPlayerId();
    const builtDeck = gameEngine.buildDeckFromList(selectedDeck.decklist, localPlayerId, gameState.gameSeed);
    const droneNames = [...selectedDeck.dronePool];

    const payload = {
      phase: 'deckSelection',
      playerId: localPlayerId,
      actionData: {
        deck: builtDeck,
        drones: droneNames,
        shipComponents: selectedDeck.shipComponents
      }
    };

    // Guest mode: Send action to host with immediate UI feedback
    if (gameState.gameMode === 'guest') {
      debugLog('COMMITMENTS', '[GUEST] Sending deck selection commitment to host:', {
        phase: payload.phase,
        playerId: payload.playerId,
        actionDataKeys: Object.keys(payload.actionData),
        deckSize: payload.actionData.deck?.length,
        dronesCount: payload.actionData.drones?.length,
        shipComponentsCount: Object.keys(payload.actionData.shipComponents || {}).length
      });

      setIsSubmitting(true);
      p2pManager.sendActionToHost('commitment', payload);
      return;
    }

    // Host/Local mode: Process action locally
    const submissionResult = await gameStateManager.actionProcessor.processCommitment(payload);

    if (!submissionResult.success) {
      debugLog('DECK_SELECTION', '❌ Deck selection submission failed:', submissionResult.error);
      return;
    }

    debugLog('DECK_SELECTION', '✅ VS deck selection submitted to PhaseManager');

    addLogEntry({
      player: 'SYSTEM',
      actionType: 'DECK_SELECTION',
      source: 'Player Setup',
      target: 'N/A',
      outcome: `Player selected the ${selectedDeck.name} deck.`
    }, 'handleConfirmSelectedDeck');
  };

  /**
   * HANDLE DECK CHOICE
   * Opens the custom deck builder.
   * @param {string} choice - 'custom'
   */
  const handleDeckChoice = (choice) => {
    if (turnPhase !== 'deckSelection') return;

    if (choice === 'custom') {
      debugLog('DECK_SELECTION', '🔧 Opening custom deck builder');
      setShowDeckBuilder(true);
    }
  };

  /**
   * HANDLE DECK CHANGE
   * Updates the custom deck being built
   * Removes entry when quantity is 0 (fixes export bug)
   */
  const handleDeckChange = (cardId, quantity) => {
    setCustomDeck(prev => updateDeckState(prev, cardId, quantity));
  };

  /**
   * HANDLE DRONES CHANGE
   * Updates the selected drones
   * Removes entry when quantity is 0 (fixes export bug)
   */
  const handleDronesChange = (droneName, quantity) => {
    setSelectedDrones(prev => updateDroneState(prev, droneName, quantity));
  };

  /**
   * HANDLE SHIP COMPONENTS CHANGE
   * Updates the selected ship components with lane assignments
   */
  const handleShipComponentsChange = (componentId, lane) => {
    if (componentId === null && lane === null) {
      // Reset all ship components
      setSelectedShipComponents({});
      return;
    }

    setSelectedShipComponents(prev => ({
      ...prev,
      [componentId]: lane
    }));
  };

  /**
   * HANDLE CONFIRM DECK
   * Submits the custom deck as a commitment
   */
  const handleConfirmDeck = async () => {
    debugLog('DECK_SELECTION', '🔧 Confirming custom deck:', customDeck);

    // Build deck array from deck object with unique instanceId for each card
    const deckArray = [];
    let instanceCounter = 0;
    Object.entries(customDeck).forEach(([cardId, quantity]) => {
      for (let i = 0; i < quantity; i++) {
        const cardTemplate = fullCardCollection.find(c => c.id === cardId);
        if (cardTemplate) {
          // Use createCard helper to assign unique instanceId (same as buildDeckFromList)
          deckArray.push(gameEngine.createCard(cardTemplate, `card-${Date.now()}-${instanceCounter++}`));
        }
      }
    });

    // Shuffle the deck for random card draw order using seeded RNG for multiplayer synchronization
    // Use simple seed based on local player ID and timestamp
    const localPlayerId = getLocalPlayerId();
    const seed = localPlayerId === 'player1' ? 12345 : 67890;
    const rng = new SeededRandom(seed);
    const shuffledDeck = rng.shuffle(deckArray);
    debugLog('DECK_SELECTION', `🔀 Custom deck shuffled: ${shuffledDeck.length} cards (deterministic)`, {
      sampleCard: shuffledDeck[0],
      sampleInstanceId: shuffledDeck[0]?.instanceId,
      hasInstanceId: shuffledDeck[0]?.instanceId !== undefined
    });

    // Extract selected drone names from selectedDrones state
    const droneNames = [];
    Object.entries(selectedDrones).forEach(([droneName, quantity]) => {
      if (quantity > 0) {
        droneNames.push(droneName);
      }
    });

    debugLog('DECK_SELECTION', `🎲 Custom deck includes ${droneNames.length} drones:`, droneNames.join(', '));

    const payload = {
      phase: 'deckSelection',
      playerId: localPlayerId,
      actionData: {
        deck: shuffledDeck,
        drones: droneNames,
        shipComponents: selectedShipComponents
      }
    };

    // Guest mode: Send action to host with immediate UI feedback
    if (gameState.gameMode === 'guest') {
      debugLog('COMMITMENTS', '[GUEST] Sending custom deck commitment to host:', {
        phase: payload.phase,
        playerId: payload.playerId,
        actionDataKeys: Object.keys(payload.actionData),
        deckSize: payload.actionData.deck?.length,
        dronesCount: payload.actionData.drones?.length,
        shipComponentsCount: payload.actionData.shipComponents?.length
      });

      // Set UI state immediately for visual feedback
      setIsSubmitting(true);

      p2pManager.sendActionToHost('commitment', payload);
      setShowDeckBuilder(false);
      return;
    }

    // Host/Local mode: Process action locally
    const submissionResult = await gameStateManager.actionProcessor.processCommitment(payload);

    if (!submissionResult.success) {
      debugLog('DECK_SELECTION', '❌ Custom deck submission failed:', submissionResult.error);
      return;
    }

    debugLog('DECK_SELECTION', '✅ Custom deck submitted to PhaseManager');

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
   * Imports a deck from a JS object literal (matching export format)
   */
  const handleImportDeck = (deckCode) => {
    const parsed = parseJSObjectLiteral(deckCode);
    if (!parsed.success) {
      return { success: false, message: parsed.error };
    }

    const result = convertFromAIFormat(parsed.data);
    setCustomDeck(result.deck);
    setSelectedDrones(result.selectedDrones);
    setSelectedShipComponents(result.selectedShipComponents);
    return { success: true };
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
    const localPlayerCompleted = gameState.commitments?.deckSelection?.[localPlayerId]?.completed || false;

    if (localPlayerCompleted && isSubmitting) {
      debugLog('DECK_SELECTION', '✅ Host confirmed guest commitment, resetting isSubmitting');
      setIsSubmitting(false);
    }
  }, [gameState.commitments, getLocalPlayerId, isSubmitting]);

  // Check completion status directly from gameState.commitments
  const localPlayerId = getLocalPlayerId();
  const opponentPlayerId = getOpponentPlayerId();
  const localPlayerCompleted = gameState.commitments?.deckSelection?.[localPlayerId]?.completed || false;
  const opponentCompleted = gameState.commitments?.deckSelection?.[opponentPlayerId]?.completed || false;

  // DEBUG LOGGING - Remove after fixing multiplayer issue
  debugLog('DECK_SELECTION', '🔍 [DECK SELECTION] Render check:', {
    gameMode: gameState.gameMode,
    isMultiplayer: isMultiplayer(),
    localPlayerId,
    opponentPlayerId,
    localPlayerCompleted,
    opponentCompleted,
    isSubmitting,
    fullCommitmentsObject: gameState.commitments?.deckSelection,
    turnPhase,
    localPlayerDeckLength: localPlayerState.deck?.length,
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
    return (
      <WaitingForOpponentScreen
        phase="deckSelection"
        localPlayerStatus="You have selected your deck and are ready to begin."
      />
    );
  }

  // State 3: SELECTING - Active selection interface (default)

  // Show deck builder if custom deck option selected
  if (showDeckBuilder) {
    return (
      <DeckBuilder
        selectedDrones={selectedDrones}
        fullCardCollection={fullCardCollection}
        deck={customDeck}
        onDeckChange={handleDeckChange}
        onDronesChange={handleDronesChange}
        selectedShipComponents={selectedShipComponents}
        onShipComponentsChange={handleShipComponentsChange}
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
      <div className="flex flex-col items-center w-full pt-8 px-4 relative z-10">
        {/* Header with hex decorations */}
        <div className="relative mb-2">
          {/* Background hex decorations - positioned behind text */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Upper-left hex */}
            <svg
              className="absolute opacity-15"
              style={{ transform: 'translate(-100px, -15px)' }}
              width="60" height="69" viewBox="0 0 80 92"
            >
              <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="rgba(6, 182, 212, 0.08)" stroke="#06b6d4" strokeWidth="1" />
            </svg>
            {/* Lower-right hex */}
            <svg
              className="absolute opacity-12"
              style={{ transform: 'translate(90px, 10px)' }}
              width="50" height="58" viewBox="0 0 80 92"
            >
              <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="rgba(6, 182, 212, 0.06)" stroke="#22d3ee" strokeWidth="0.8" />
            </svg>
            {/* Small right hex */}
            <svg
              className="absolute opacity-10"
              style={{ transform: 'translate(140px, -8px)' }}
              width="35" height="40" viewBox="0 0 80 92"
            >
              <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="none" stroke="#67e8f9" strokeWidth="0.5" />
            </svg>
          </div>
          <h1
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
            Select Your Deck
          </h1>
        </div>
        <p className="text-gray-400 mb-8">Choose a pre-defined deck or build your own.</p>

        {/* VS Deck Grid - 2 columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
          maxWidth: '640px',
          width: '100%'
        }}>
          {/* VS Mode Decks */}
          {vsDecks.map((deck) => (
            <div
              key={deck.id}
              className={`vs-deck-card ${selectedDeck?.id === deck.id ? 'selected' : ''}`}
              onClick={() => handleSelectDeck(deck)}
              onMouseEnter={() => SoundManager.getInstance().play('hover_over')}
            >
              {/* Background Image */}
              <div
                className="vs-deck-card-bg"
                style={{ backgroundImage: `url(${deck.imagePath})` }}
              />

              {/* Gradient Overlay */}
              <div className="vs-deck-card-overlay" />

              {/* Content */}
              <div className="vs-deck-card-content">
                <div>
                  <h3 className="font-exo" style={{
                    margin: '0 0 6px 0',
                    fontSize: '1.3rem',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                  }}>
                    {deck.name}
                  </h3>
                  <p className="font-exo" style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: '#dddddd',
                    lineHeight: '1.3',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                  }}>
                    {deck.description}
                  </p>
                </div>

                {/* Bottom: View Deck button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDeck(deck);
                    }}
                    className="dw-btn dw-btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    View Deck
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Build Custom Deck Card */}
          <div
            className="vs-deck-card vs-deck-card--custom"
            onClick={() => { SoundManager.getInstance().play('ui_click'); handleDeckChoice('custom'); }}
            onMouseEnter={() => SoundManager.getInstance().play('hover_over')}
          >
            {/* No background image — purple-themed overlay */}
            <div className="vs-deck-card-overlay" style={{
              background: 'linear-gradient(to bottom, rgba(88, 28, 135, 0.3) 0%, rgba(30, 10, 60, 0.6) 100%)'
            }} />

            <div className="vs-deck-card-content" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <h3 className="font-exo" style={{
                margin: '0 0 6px 0',
                fontSize: '1.3rem',
                fontWeight: 'bold',
                color: '#c084fc',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
              }}>
                Build Custom Deck
              </h3>
              <p className="font-exo" style={{
                margin: 0,
                fontSize: '0.85rem',
                color: '#d8b4fe',
                lineHeight: '1.3',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}>
                Create your own deck from your card collection.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="dw-btn dw-btn-cancel"
          >
            EXIT
          </button>
          <button
            onClick={handleConfirmSelectedDeck}
            disabled={!selectedDeck}
            className="dw-btn dw-btn-confirm"
          >
            CONFIRM DECK
          </button>
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

      {/* View Deck Modal */}
      {deckModalOpen && deckModalDeck && (
        <ViewDeckModal
          isOpen={deckModalOpen}
          onClose={() => {
            setDeckModalOpen(false);
            setDeckModalDeck(null);
          }}
          title={`${deckModalDeck.name} - Complete Loadout`}
          {...prepareVSDeckData(deckModalDeck)}
        />
      )}
    </div>
  );
}

export default DeckSelectionScreen;