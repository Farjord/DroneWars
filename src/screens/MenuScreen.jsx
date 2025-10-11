// ========================================
// MENU SCREEN
// ========================================
// Main menu for game mode selection
// Clean separation from game logic - no player state access

import { useEffect, useState } from 'react';
import { useGameState } from '../hooks/useGameState.js';
import GameDataService from '../services/GameDataService.js';
import DEV_CONFIG from '../config/devConfig.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * MenuScreen - Main menu for selecting game mode
 * No access to game state or player data - pure menu functionality
 */
function MenuScreen() {
  const { gameStateManager } = useGameState();

  // Single animation trigger state - all effects trigger together
  const [animationKey, setAnimationKey] = useState(0);

  // Random animation triggers (20-40 second intervals) - all effects trigger together
  useEffect(() => {
    const scheduleAllGlitches = () => {
      const delay = 20000 + Math.random() * 20000; // 20-40 seconds
      const timeout = setTimeout(() => {
        setAnimationKey(prev => prev + 1);
        scheduleAllGlitches();
      }, delay);
      return timeout;
    };

    const timeout = scheduleAllGlitches();

    return () => {
      clearTimeout(timeout);
    };
  }, []);

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

    // Reset GameFlowManager as failsafe
    if (gameStateManager?.gameFlowManager) {
      gameStateManager.gameFlowManager.reset();
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
      {/* Content Wrapper */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}>
        {/* EREMOS Title with layered glitch effects */}
        <div style={{
          position: 'relative',
          display: 'inline-block',
          marginBottom: '2rem'
        }}>
          {/* RGB Split - Red Channel */}
          <h1
            key={`rgb-red-${animationKey}`}
            className="menu-rgb-split-red heading-font"
            aria-hidden="true"
            style={{
              position: 'absolute',
              fontSize: '4rem',
              margin: 0,
              textAlign: 'center',
              color: '#ff0000',
              mixBlendMode: 'screen',
              pointerEvents: 'none',
              left: 0,
              top: 0,
              zIndex: 0
            }}
          >
            EREMOS
          </h1>

          {/* RGB Split - Blue Channel */}
          <h1
            key={`rgb-blue-${animationKey}`}
            className="menu-rgb-split-blue heading-font"
            aria-hidden="true"
            style={{
              position: 'absolute',
              fontSize: '4rem',
              margin: 0,
              textAlign: 'center',
              color: '#00ffff',
              mixBlendMode: 'screen',
              pointerEvents: 'none',
              left: 0,
              top: 0,
              zIndex: 0
            }}
          >
            EREMOS
          </h1>

          {/* Main Title */}
          <h1
            key={`title-${animationKey}`}
            className="menu-gradient-cycle menu-title-glitch-distort menu-title-opacity-glitch animate-pulse heading-font"
            style={{
              fontSize: '4rem',
              margin: 0,
              textAlign: 'center',
              background: 'linear-gradient(90deg, #00ff88, #00d4aa, #00a0cc, #0088ff, #00aaff, #00ffff, #00d4aa, #00ff88)',
              backgroundSize: '300% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.4))',
              textShadow: '0 0 20px rgba(0, 255, 136, 0.4), 0 0 40px rgba(0, 136, 255, 0.3)',
              position: 'relative',
              zIndex: 1
            }}
          >
            EREMOS
          </h1>
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: '1.2rem',
          marginBottom: '3rem',
          textAlign: 'center',
          color: '#cccccc'
        }}>
          the wilderness left when civilization departs
        </div>

        {/* Game mode buttons - vertically aligned */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          alignItems: 'center'
        }}>
          <button onClick={handleSinglePlayer} className="btn-continue" style={{ minWidth: '250px', fontSize: '1.1rem', padding: '16px 30px' }}>
            SINGLE PLAYER
            <div style={{ fontSize: '0.75rem', marginTop: '5px', opacity: 0.8 }}>
              vs AI Opponent
            </div>
          </button>

          <button onClick={handleMultiplayer} className="btn-continue" style={{ minWidth: '250px', fontSize: '1.1rem', padding: '16px 30px' }}>
            MULTIPLAYER
            <div style={{ fontSize: '0.75rem', marginTop: '5px', opacity: 0.8 }}>
              vs Human Player
            </div>
          </button>

          <button onClick={() => gameStateManager.setState({ appState: 'deckBuilder' })} className="btn-continue" style={{ minWidth: '250px', fontSize: '1.1rem', padding: '16px 30px' }}>
            DECK BUILDER
            <div style={{ fontSize: '0.75rem', marginTop: '5px', opacity: 0.8 }}>
              Build Your Deck
            </div>
          </button>

          {DEV_CONFIG.features.modalShowcase && (
            <button
              onClick={() => gameStateManager.setState({ appState: 'modalShowcase' })}
              className="btn-continue"
              style={{
                minWidth: '250px',
                fontSize: '1.1rem',
                padding: '16px 30px',
                backgroundColor: '#6a0dad',
                borderColor: '#9932cc'
              }}
            >
              MODAL SHOWCASE
              <div className="body-font" style={{ fontSize: '0.75rem', marginTop: '5px', opacity: 0.8 }}>
                Dev Preview Tool
              </div>
            </button>
          )}

          {DEV_CONFIG.features.testingMode && (
            <button
              onClick={() => gameStateManager.setState({ appState: 'testingSetup' })}
              className="btn-utility"
              style={{
                minWidth: '250px',
                fontSize: '1.1rem',
                padding: '16px 30px'
              }}
            >
              TESTING MODE
              <div className="body-font" style={{ fontSize: '0.75rem', marginTop: '5px', opacity: 0.8 }}>
                Dev Scenario Setup
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MenuScreen;