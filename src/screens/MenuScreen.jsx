// ========================================
// MENU SCREEN
// ========================================
// Main menu for game mode selection
// Clean separation from game logic - no player state access

import { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState.js';
import GameDataService from '../services/GameDataService.js';
import { debugLog } from '../utils/debugLogger.js';

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
    debugLog('PHASE_TRANSITIONS', '🏠 MenuScreen mounted - ensuring clean state');

    // Clear GameDataService singleton and cache
    GameDataService.reset();

    // Clear ActionProcessor queue
    if (gameStateManager?.actionProcessor) {
      gameStateManager.actionProcessor.clearQueue();
    }

    debugLog('PHASE_TRANSITIONS', '✅ MenuScreen: State cleaned up');
  }, [gameStateManager]);

  const handleSinglePlayer = () => {
    debugLog('PHASE_TRANSITIONS', '🎮 Selected: Single Player');
    // Transition to lobby for AI selection
    gameStateManager.setState({ appState: 'lobby', gameMode: 'local' });
  };

  const handleMultiplayer = () => {
    debugLog('PHASE_TRANSITIONS', '🎮 Selected: Multiplayer');
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
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {/* Content Wrapper */}
      <div style={{ 
        position: 'relative', 
        zIndex: 10, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
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

            <button onClick={handleShowModes} className="btn-continue">
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
              <button onClick={handleSinglePlayer} className="btn-continue" style={{ minWidth: '200px', fontSize: '1.1rem', padding: '16px 30px' }}>
                SINGLE PLAYER
                <div style={{ fontSize: '0.75rem', marginTop: '5px', opacity: 0.8 }}>
                  vs AI Opponent
                </div>
              </button>

              <button onClick={handleMultiplayer} className="btn-continue" style={{ minWidth: '200px', fontSize: '1.1rem', padding: '16px 30px' }}>
                MULTIPLAYER
                <div style={{ fontSize: '0.75rem', marginTop: '5px', opacity: 0.8 }}>
                  vs Human Player
                </div>
              </button>
            </div>

            <button onClick={handleBack} className="btn-cancel">
              BACK
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default MenuScreen;