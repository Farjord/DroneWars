// ========================================
// MENU SCREEN
// ========================================
// Main menu for game mode selection
// Clean separation from game logic - no player state access

import { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState.js';
import GameDataService from '../services/GameDataService.js';

/**
 * MenuScreen - Main menu for selecting game mode
 * No access to game state or player data - pure menu functionality
 */
function MenuScreen() {
  const { gameStateManager } = useGameState();
  const [showModeSelection, setShowModeSelection] = useState(false);

  // Cleanup effect: Ensure clean slate when MenuScreen mounts
  // This handles hot reload scenarios and ensures no stale data from previous games
  useEffect(() => {
    console.log('🏠 MenuScreen mounted - ensuring clean state');

    // Clear GameDataService singleton and cache
    GameDataService.reset();

    // Clear ActionProcessor queue
    if (gameStateManager?.actionProcessor) {
      gameStateManager.actionProcessor.clearQueue();
    }

    console.log('✅ MenuScreen: State cleaned up');
  }, [gameStateManager]);

  const handleSinglePlayer = () => {
    console.log('🎮 Selected: Single Player');
    // Transition to lobby for AI selection
    gameStateManager.setState({ appState: 'lobby', gameMode: 'local' });
  };

  const handleMultiplayer = () => {
    console.log('🎮 Selected: Multiplayer');
    // Transition to lobby for multiplayer setup
    gameStateManager.setState({ appState: 'lobby', gameMode: 'multiplayer' });
  };

  const handleShowModes = () => {
    setShowModeSelection(true);
  };

  const handleBack = () => {
    setShowModeSelection(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {!showModeSelection ? (
        // Main title screen
        <>
          <h1 style={{
            fontSize: '4rem',
            marginBottom: '2rem',
            textAlign: 'center',
            background: 'linear-gradient(45deg, #00ff88, #0088ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
          }}>
            EREMOS
          </h1>

          <div style={{
            fontSize: '1.2rem',
            marginBottom: '3rem',
            textAlign: 'center',
            color: '#cccccc'
          }}>
            the wilderness left when civilization departs
          </div>

          <button
            onClick={handleShowModes}
            style={{
              fontSize: '1.5rem',
              padding: '15px 40px',
              backgroundColor: '#0088ff',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0, 136, 255, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#0066cc';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#0088ff';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            START GAME
          </button>
        </>
      ) : (
        // Game mode selection
        <>
          <h2 style={{
            fontSize: '2.5rem',
            marginBottom: '3rem',
            textAlign: 'center',
            color: '#ffffff'
          }}>
            SELECT GAME MODE
          </h2>

          <div style={{
            display: 'flex',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            <button
              onClick={handleSinglePlayer}
              style={{
                fontSize: '1.3rem',
                padding: '20px 30px',
                backgroundColor: '#00ff88',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '200px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0, 255, 136, 0.3)'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#00cc6a';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#00ff88';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              SINGLE PLAYER
              <div style={{ fontSize: '0.9rem', marginTop: '5px', opacity: 0.8 }}>
                vs AI Opponent
              </div>
            </button>

            <button
              onClick={handleMultiplayer}
              style={{
                fontSize: '1.3rem',
                padding: '20px 30px',
                backgroundColor: '#ff6b35',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '200px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e55a2b';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#ff6b35';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              MULTIPLAYER
              <div style={{ fontSize: '0.9rem', marginTop: '5px', opacity: 0.8 }}>
                vs Human Player
              </div>
            </button>
          </div>

          <button
            onClick={handleBack}
            style={{
              fontSize: '1rem',
              padding: '10px 20px',
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
            BACK
          </button>
        </>
      )}
    </div>
  );
}

export default MenuScreen;