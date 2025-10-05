// ========================================
// LOBBY SCREEN
// ========================================
// AI selection and multiplayer setup
// Clean separation from game logic - no game state access

import { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState.js';
import aiPersonalities from '../data/aiData.js';
import fullDroneCollection from '../data/droneData.js';
import aiPhaseProcessor from '../state/AIPhaseProcessor.js';
import gameStateManager from '../state/GameStateManager.js';
import MultiplayerLobby from '../MultiplayerLobby.jsx';
import p2pManager from '../network/P2PManager.js';

/**
 * LobbyScreen - AI selection and multiplayer setup
 * No access to game player data - pure lobby functionality
 */
function LobbyScreen() {
  const { gameState, gameStateManager } = useGameState();
  const [selectedAI, setSelectedAI] = useState(null);

  const isSinglePlayer = gameState.gameMode === 'local';
  const isMultiplayer = gameState.gameMode !== 'local'; // Matches 'multiplayer', 'host', and 'guest' modes

  // Setup P2P integration when entering multiplayer mode
  useEffect(() => {
    if (isMultiplayer) {
      console.log('🔌 Setting up P2P integration for multiplayer');
      gameStateManager.setupP2PIntegration(p2pManager);
    }
  }, [isMultiplayer]);

  const handleBackToMenu = () => {
    console.log('🔙 Returning to main menu');
    gameStateManager.setState({ appState: 'menu', gameMode: 'local' });
  };

  const handleSelectAI = (ai) => {
    console.log('🤖 Selected AI:', ai.name);
    setSelectedAI(ai);
  };

  const handleStartGame = () => {
    if (isSinglePlayer && selectedAI) {
      console.log('🎮 Starting single player game with AI:', selectedAI.name);

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
      console.log('🤖 AIPhaseProcessor initialized for single-player with:', selectedAI.name);

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
    console.log('🎮 Starting multiplayer game after connection');

    // Determine game mode based on P2P role
    const isHost = p2pManager.isHost;
    const gameMode = isHost ? 'host' : 'guest';

    console.log(`🎮 Multiplayer mode: ${gameMode}`);

    // Start the game with appropriate mode
    gameStateManager.startGame(gameMode,
      { name: isHost ? 'Host Player' : 'Guest Player' },
      { name: isHost ? 'Guest Player' : 'Host Player' }
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
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
        {/* Header */}
        <h2 style={{
          fontSize: '2.5rem',
          marginBottom: '2rem',
          textAlign: 'center',
          color: '#ffffff'
        }}>
          {isSinglePlayer ? 'SELECT AI OPPONENT' : 'MULTIPLAYER SETUP'}
        </h2>

        {/* Single Player - AI Selection */}
        {isSinglePlayer && (
          <div style={{
            maxWidth: '800px',
            width: '100%',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {aiPersonalities.map((ai) => (
                <div
                  key={ai.name}
                  onClick={() => handleSelectAI(ai)}
                  style={{
                    padding: '20px',
                    backgroundColor: selectedAI?.name === ai.name ? '#0088ff' : '#2a2a2a',
                    border: `2px solid ${selectedAI?.name === ai.name ? '#00ff88' : '#444444'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center'
                  }}
                  onMouseOver={(e) => {
                    if (selectedAI?.name !== ai.name) {
                      e.target.style.backgroundColor = '#333333';
                      e.target.style.borderColor = '#666666';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedAI?.name !== ai.name) {
                      e.target.style.backgroundColor = '#2a2a2a';
                      e.target.style.borderColor = '#444444';
                    }
                  }}
                >
                  <h3 style={{
                    margin: '0 0 10px 0',
                    fontSize: '1.3rem',
                    color: selectedAI?.name === ai.name ? '#ffffff' : '#00ff88'
                  }}>
                    {ai.name}
                  </h3>
                  <p style={{
                    margin: '0 0 10px 0',
                    fontSize: '0.9rem',
                    color: '#cccccc',
                    lineHeight: '1.4'
                  }}>
                    {ai.description}
                  </p>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#888888'
                  }}>
                    Difficulty: {ai.difficulty}
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
    </div>
  );
}

export default LobbyScreen;