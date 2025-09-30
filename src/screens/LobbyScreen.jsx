// ========================================
// LOBBY SCREEN
// ========================================
// AI selection and multiplayer setup
// Clean separation from game logic - no game state access

import { useState } from 'react';
import { useGameState } from '../hooks/useGameState.js';
import aiPersonalities from '../data/aiData.js';
import fullDroneCollection from '../data/droneData.js';
import aiPhaseProcessor from '../state/AIPhaseProcessor.js';
import gameStateManager from '../state/GameStateManager.js';

/**
 * LobbyScreen - AI selection and multiplayer setup
 * No access to game player data - pure lobby functionality
 */
function LobbyScreen() {
  const { gameState, gameStateManager } = useGameState();
  const [selectedAI, setSelectedAI] = useState(null);

  const isSinglePlayer = gameState.gameMode === 'local';
  const isMultiplayer = gameState.gameMode === 'multiplayer';

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
    } else if (isMultiplayer) {
      console.log('🎮 Starting multiplayer game');

      // Start multiplayer game
      gameStateManager.startGame('multiplayer',
        { name: 'Player 1' },
        { name: 'Player 2' }
      );
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      boxSizing: 'border-box'
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
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <div style={{
            fontSize: '1.2rem',
            color: '#cccccc',
            marginBottom: '1rem'
          }}>
            Multiplayer game ready to start
          </div>
          <div style={{
            fontSize: '1rem',
            color: '#888888'
          }}>
            Both players will customize their decks and drones in-game
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginTop: '1rem'
      }}>
        <button
          onClick={handleBackToMenu}
          style={{
            fontSize: '1rem',
            padding: '12px 24px',
            backgroundColor: 'transparent',
            color: '#cccccc',
            border: '2px solid #cccccc',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#cccccc';
            e.target.style.color = '#1a1a1a';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#cccccc';
          }}
        >
          BACK TO MENU
        </button>

        <button
          onClick={handleStartGame}
          disabled={isSinglePlayer && !selectedAI}
          style={{
            fontSize: '1.2rem',
            padding: '12px 30px',
            backgroundColor: (isSinglePlayer && !selectedAI) ? '#444444' : '#00ff88',
            color: (isSinglePlayer && !selectedAI) ? '#888888' : '#000000',
            border: 'none',
            borderRadius: '8px',
            cursor: (isSinglePlayer && !selectedAI) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            opacity: (isSinglePlayer && !selectedAI) ? 0.5 : 1
          }}
          onMouseOver={(e) => {
            if (!(isSinglePlayer && !selectedAI)) {
              e.target.style.backgroundColor = '#00cc6a';
              e.target.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (!(isSinglePlayer && !selectedAI)) {
              e.target.style.backgroundColor = '#00ff88';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          {isSinglePlayer ? 'START GAME' : 'START MULTIPLAYER'}
        </button>
      </div>
    </div>
  );
}

export default LobbyScreen;