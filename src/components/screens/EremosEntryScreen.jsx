/**
 * EremosEntryScreen.jsx
 * Entry screen for the Eremos extraction mode
 * Offers New Game / Load Game options
 */

import { useState, useRef } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import SaveGameService from '../../services/SaveGameService.js';
import { debugLog } from '../../utils/debugLogger.js';
import SoundManager from '../../managers/SoundManager.js';

// Eremos entry button images
const eremosImages = {
  newGame: new URL('/Menu/NewGame.png', import.meta.url).href,
  loadGame: new URL('/Menu/LoadGame.png', import.meta.url).href
};

// ImageButton component for artwork-backed buttons with hover zoom effect
const ImageButton = ({ image, label, subtitle, onClick, style }) => (
  <button
    onClick={onClick}
    style={{
      minHeight: '120px',
      padding: 0,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'stretch',
      backgroundImage: `url('${image}')`,
      backgroundSize: '100%',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      transition: 'background-size 0.3s ease, box-shadow 0.3s ease',
      overflow: 'hidden',
      cursor: 'pointer',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '4px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.2)',
      ...style
    }}
    onMouseEnter={(e) => {
      SoundManager.getInstance().play('hover_over');
      e.currentTarget.style.backgroundSize = '115%';
      e.currentTarget.style.boxShadow = '0 6px 30px rgba(0, 0, 0, 0.7), 0 0 2px rgba(255, 255, 255, 0.3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundSize = '100%';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.2)';
    }}
  >
    <span style={{
      width: '100%',
      fontSize: '1.1rem',
      fontWeight: 'bold',
      textShadow: '0 2px 4px rgba(0,0,0,0.9)',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: '12px 16px',
      textAlign: 'center',
      letterSpacing: '0.05em',
      color: '#ffffff',
      textTransform: 'uppercase'
    }}>
      {label}
      {subtitle && (
        <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8, fontWeight: 'normal' }}>
          {subtitle}
        </div>
      )}
    </span>
  </button>
);

function EremosEntryScreen() {
  const { gameStateManager } = useGameState();
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);

  const handleNewGame = () => {
    debugLog('PHASE_TRANSITIONS', '🚀 Eremos: New Game');
    gameStateManager.createNewSinglePlayerProfile();
    gameStateManager.setState({
      appState: 'hangar',
      gameMode: 'singlePlayer'
    });
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    debugLog('PHASE_TRANSITIONS', '🚀 Eremos: Load Game');
    setError(null);

    try {
      const gameState = await SaveGameService.load(file);
      gameStateManager.loadSinglePlayerSave(gameState);
      gameStateManager.setState({
        appState: 'hangar',
        gameMode: 'singlePlayer'
      });
    } catch (err) {
      debugLog('MODE_TRANSITION', 'Failed to load save:', err);
      setError(`Failed to load save: ${err.message}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBack = () => {
    debugLog('PHASE_TRANSITIONS', '🔙 Eremos: Back to Menu');
    gameStateManager.setState({ appState: 'menu' });
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
      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}>
        {/* Title */}
        <h1
          className="heading-font"
          style={{
            fontSize: '4rem',
            margin: 0,
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 20px rgba(102, 126, 234, 0.4))',
            letterSpacing: '2px',
            textAlign: 'center'
          }}
        >
          INTO THE EREMOS
        </h1>

        {/* Subtitle */}
        <div style={{
          fontSize: '1.2rem',
          marginBottom: '3rem',
          textAlign: 'center',
          color: '#cccccc'
        }}>
          Venture into the wilderness. Deploy your ship, navigate the tactical map,
          fight or flee, and extract with your loot.
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          width: '100%',
          maxWidth: '900px'
        }}>
          {/* New Game & Load Game - side by side */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <ImageButton
              image={eremosImages.newGame}
              label="New Game"
              subtitle="Start a fresh campaign"
              onClick={handleNewGame}
              style={{ flex: '0 1 calc(33.333% - 0.5rem)', minHeight: '280px' }}
            />
            <ImageButton
              image={eremosImages.loadGame}
              label="Load Game"
              subtitle="Load a saved campaign"
              onClick={handleLoadClick}
              style={{ flex: '0 1 calc(33.333% - 0.5rem)', minHeight: '280px' }}
            />
          </div>

          {/* Hidden file input for load */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Error message */}
          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Back */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <button
              onClick={handleBack}
              className="dw-btn dw-btn-secondary"
              style={{
                fontSize: '1rem',
                padding: '12px 24px'
              }}
            >
              Back to Menu
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default EremosEntryScreen;
