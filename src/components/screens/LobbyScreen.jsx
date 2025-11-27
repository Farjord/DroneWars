// ========================================
// LOBBY SCREEN
// ========================================
// AI selection and multiplayer setup
// Clean separation from game logic - no game state access

import { useState, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import aiPersonalities from '../../data/aiData.js';
import fullDroneCollection from '../../data/droneData.js';
import fullCardCollection from '../../data/cardData.js';
import { shipComponentCollection } from '../../data/shipData.js';
import aiPhaseProcessor from '../../managers/AIPhaseProcessor.js';
import gameStateManager from '../../managers/GameStateManager.js';
import MultiplayerLobby from './MultiplayerLobby.jsx';
import p2pManager from '../../network/P2PManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import ViewDeckModal from '../modals/ViewDeckModal.jsx';

/**
 * LobbyScreen - AI selection and multiplayer setup
 * No access to game player data - pure lobby functionality
 */
function LobbyScreen() {
  const { gameState, gameStateManager } = useGameState();
  const [selectedAI, setSelectedAI] = useState(null);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [deckModalAI, setDeckModalAI] = useState(null);

  const isSinglePlayer = gameState.gameMode === 'local';
  const isMultiplayer = gameState.gameMode !== 'local'; // Matches 'multiplayer', 'host', and 'guest' modes

  // Setup P2P integration when entering multiplayer mode
  useEffect(() => {
    if (isMultiplayer) {
      debugLog('PHASE_TRANSITIONS', '🔌 Setting up P2P integration for multiplayer');
      gameStateManager.setupP2PIntegration(p2pManager);
    }
  }, [isMultiplayer]);

  const handleBackToMenu = () => {
    debugLog('PHASE_TRANSITIONS', '🔙 Returning to main menu');
    gameStateManager.setState({ appState: 'menu', gameMode: 'local' });
  };

  const handleSelectAI = (ai) => {
    debugLog('PHASE_TRANSITIONS', '🤖 Selected AI:', ai.name);
    setSelectedAI(ai);
  };

  const handleStartGame = () => {
    if (isSinglePlayer && selectedAI) {
      debugLog('PHASE_TRANSITIONS', '🎮 Starting single player game with AI:', selectedAI.name);

      // Validate AI drone pool has minimum required drones
      if (!selectedAI.dronePool || !Array.isArray(selectedAI.dronePool)) {
        const errorMsg = `Cannot start game: AI '${selectedAI.name}' has invalid dronePool configuration.`;
        console.error('❌', errorMsg);
        alert(errorMsg);
        return;
      }

      if (selectedAI.dronePool.length < 5) {
        const errorMsg = `Cannot start game: AI '${selectedAI.name}' has only ${selectedAI.dronePool.length} drones. Minimum 5 drones required.`;
        console.error('❌', errorMsg);
        alert(errorMsg);
        return;
      }

      if (selectedAI.dronePool.length > 10) {
        const errorMsg = `Cannot start game: AI '${selectedAI.name}' has ${selectedAI.dronePool.length} drones. Maximum 10 drones allowed.`;
        console.error('❌', errorMsg);
        alert(errorMsg);
        return;
      }

      debugLog('PHASE_TRANSITIONS', `✅ AI drone pool validated: ${selectedAI.dronePool.length} drones`);

      // Set up AI drone configuration
      const aiDrones = fullDroneCollection.filter(d => selectedAI.dronePool.includes(d.name));
      const aiInitialCounts = {};
      aiDrones.forEach(drone => {
        aiInitialCounts[drone.name] = 0;
      });

      // Initialize AIPhaseProcessor for single-player game
      aiPhaseProcessor.initialize(
        aiPersonalities,
        fullDroneCollection,
        selectedAI,
        gameStateManager.actionProcessor,
        gameStateManager
      );
      debugLog('PHASE_TRANSITIONS', '🤖 AIPhaseProcessor initialized for single-player with:', selectedAI.name);

      // Give ActionProcessor reference to AIPhaseProcessor for interception
      gameStateManager.actionProcessor.setAIPhaseProcessor(aiPhaseProcessor);

      // Start the game with selected AI
      gameStateManager.startGame('local',
        { name: 'Player 1' },
        {
          name: selectedAI.name,
          decklist: selectedAI.decklist,
          activeDronePool: aiDrones,
          deployedDroneCounts: aiInitialCounts,
          aiPersonality: selectedAI
        }
      );
    }
  };

  const handleMultiplayerGameStart = () => {
    debugLog('PHASE_TRANSITIONS', '🎮 Starting multiplayer game after connection');

    // Determine game mode based on P2P role
    const isHost = p2pManager.isHost;
    const gameMode = isHost ? 'host' : 'guest';

    debugLog('PHASE_TRANSITIONS', `🎮 Multiplayer mode: ${gameMode}`);

    // Start the game with appropriate mode
    gameStateManager.startGame(gameMode,
      { name: isHost ? 'Host Player' : 'Guest Player' },
      { name: isHost ? 'Guest Player' : 'Host Player' }
    );

    // Host broadcasts initial game state to guest
    if (isHost && p2pManager.isConnected) {
      debugLog('PHASE_TRANSITIONS', '📡 Host broadcasting initial game state to guest');
      const initialState = gameStateManager.getState();
      p2pManager.broadcastState(initialState);
    }
  };

  const handleViewDeck = (ai) => {
    debugLog('LOBBY', '📋 Opening deck view for AI:', ai.name);
    setDeckModalAI(ai);
    setDeckModalOpen(true);
  };

  const prepareAIDeckData = (ai) => {
    if (!ai) return { drones: [], cards: [], shipComponents: {} };

    // Convert drone pool names to full drone objects
    const drones = fullDroneCollection.filter(d => ai.dronePool.includes(d.name));

    // Convert decklist to card objects with quantities
    const cards = ai.decklist
      .filter(entry => entry.quantity > 0)
      .map(entry => ({
        card: fullCardCollection.find(c => c.id === entry.id),
        quantity: entry.quantity
      }))
      .filter(item => item.card); // Filter out any cards that weren't found

    // Convert ship placement to shipComponents format
    // placement is [lane0, lane1, lane2] with legacy keys
    const shipComponents = {};
    const laneMap = ['l', 'm', 'r']; // lane0=left, lane1=middle, lane2=right

    ai.shipDeployment.placement.forEach((key, index) => {
      // placement array contains legacy keys directly (e.g., 'bridge', 'powerCell')
      shipComponents[key] = laneMap[index];
    });

    return { drones, cards, shipComponents };
  };

  return (
    <div className="body-font" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      minHeight: '100vh',
      color: '#ffffff',
      padding: '60px 20px 20px 20px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {/* Content Wrapper - sits on top of background */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}>
        {/* Header - Defeat-styled title for single player */}
        {isSinglePlayer ? (
          <div style={{
            position: 'relative',
            display: 'inline-block',
            marginBottom: '2rem'
          }}>
            {/* RGB Split - Red Channel (cancel button red) */}
            <h2
              aria-hidden="true"
              className="heading-font"
              style={{
                position: 'absolute',
                fontSize: '3.5rem',
                margin: 0,
                textAlign: 'center',
                color: '#ef4444',
                mixBlendMode: 'screen',
                pointerEvents: 'none',
                left: 0,
                top: 0,
                zIndex: 0,
                fontWeight: 'bold'
              }}
            >
              SELECT OPPONENT
            </h2>

            {/* RGB Split - Orange Channel */}
            <h2
              aria-hidden="true"
              className="heading-font"
              style={{
                position: 'absolute',
                fontSize: '3.5rem',
                margin: 0,
                textAlign: 'center',
                color: '#ff9944',
                mixBlendMode: 'screen',
                pointerEvents: 'none',
                left: 0,
                top: 0,
                zIndex: 0,
                fontWeight: 'bold'
              }}
            >
              SELECT OPPONENT
            </h2>

            {/* Main Title */}
            <h2
              className="defeat-glow heading-font"
              style={{
                fontSize: '3.5rem',
                margin: 0,
                textAlign: 'center',
                background: 'linear-gradient(90deg, #dc2626, #ef4444, #fca5a5, #ffffff, #fca5a5, #ef4444, #dc2626)',
                backgroundSize: '300% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.3))',
                position: 'relative',
                zIndex: 1,
                fontWeight: 'bold'
              }}
            >
              SELECT OPPONENT
            </h2>
          </div>
        ) : (
          <h2 className="body-font" style={{
            fontSize: '2.5rem',
            marginBottom: '2rem',
            textAlign: 'center',
            color: '#ffffff'
          }}>
            MULTIPLAYER SETUP
          </h2>
        )}

        {/* Single Player - AI Selection */}
        {isSinglePlayer && (
          <div style={{
            maxWidth: '600px',
            width: '100%',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {aiPersonalities.filter(ai => ai.modes && ai.modes.includes('vs')).map((ai) => (
                <div
                  key={ai.name}
                  className={`ai-opponent-card ${selectedAI?.name === ai.name ? 'selected' : ''}`}
                  onClick={() => handleSelectAI(ai)}
                >
                  {/* Background Image */}
                  <div
                    className="ai-opponent-card-bg"
                    style={{ backgroundImage: `url(${ai.imagePath})` }}
                  />

                  {/* Gradient Overlay for text readability */}
                  <div className="ai-opponent-card-overlay" />

                  {/* Content */}
                  <div className="ai-opponent-card-content">
                    {/* Top: AI Name */}
                    <div>
                      <h3 className="body-font" style={{
                        margin: '0 0 8px 0',
                        fontSize: '1.8rem',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        letterSpacing: '0.5px'
                      }}>
                        {ai.name}
                      </h3>
                      <p className="body-font" style={{
                        margin: '0',
                        fontSize: '1rem',
                        color: '#dddddd',
                        lineHeight: '1.4',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                      }}>
                        {ai.description}
                      </p>
                    </div>

                    {/* Bottom: Difficulty and View Deck button */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div className="body-font" style={{
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#ffcc00',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        Difficulty: {ai.difficulty}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDeck(ai);
                        }}
                        className="btn-info"
                      >
                        View Deck
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multiplayer Setup */}
        {isMultiplayer && (
          <MultiplayerLobby
            onGameStart={handleMultiplayerGameStart}
            onBack={handleBackToMenu}
          />
        )}

        {/* Action Buttons - Only show for single player */}
        {isSinglePlayer && (
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <button onClick={handleBackToMenu} className="btn-cancel">
              BACK TO MENU
            </button>

            <button onClick={handleStartGame} disabled={!selectedAI} className="btn-continue">
              START GAME
            </button>
          </div>
        )}
      </div>
      {/* FIXED: Properly closed the wrapper div here */}

      {/* View Deck Modal */}
      {deckModalOpen && deckModalAI && (
        <ViewDeckModal
          isOpen={deckModalOpen}
          onClose={() => {
            setDeckModalOpen(false);
            setDeckModalAI(null);
          }}
          title={`${deckModalAI.name} - Complete Loadout`}
          {...prepareAIDeckData(deckModalAI)}
        />
      )}
    </div>
  );
}

export default LobbyScreen;