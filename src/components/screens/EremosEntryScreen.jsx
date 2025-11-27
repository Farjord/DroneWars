/**
 * EremosEntryScreen.jsx
 * Entry screen for the Eremos extraction mode
 * Offers New Game / Load Game options
 */

import { useState, useRef } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import SaveGameService from '../../services/SaveGameService.js';
import { debugLog } from '../../utils/debugLogger.js';
import ScalingText from '../ui/ScalingText.jsx';

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
      console.error('Failed to load save:', err);
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
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      color: '#ffffff',
      padding: '40px 20px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {/* Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '500px',
        textAlign: 'center'
      }}>
        {/* Title */}
        <h1
          className="heading-font"
          style={{
            fontSize: '3rem',
            margin: '0 0 1rem 0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 20px rgba(102, 126, 234, 0.4))',
            letterSpacing: '2px'
          }}
        >
          INTO THE EREMOS
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '1.1rem',
          color: '#a0aec0',
          marginBottom: '3rem',
          lineHeight: 1.6
        }}>
          Venture into the wilderness. Deploy your ship, navigate the tactical map,
          fight or flee, and extract with your loot.
        </p>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%',
          maxWidth: '280px'
        }}>
          {/* New Game */}
          <button
            onClick={handleNewGame}
            className="btn-continue"
            style={{
              width: '100%',
              fontSize: '1.1rem',
              padding: '16px 30px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            <ScalingText text="NEW GAME" className="uppercase tracking-wider font-semibold" />
            <div style={{ fontSize: '0.75rem', marginTop: '5px', opacity: 0.8 }}>
              Start a fresh campaign
            </div>
          </button>

          {/* Load Game - opens file picker */}
          <button
            onClick={handleLoadClick}
            className="btn-continue"
            style={{
              width: '100%',
              fontSize: '1.1rem',
              padding: '16px 30px',
              background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'
            }}
          >
            <ScalingText text="LOAD GAME" className="uppercase tracking-wider font-semibold" />
            <div style={{ fontSize: '0.75rem', marginTop: '5px', opacity: 0.8 }}>
              Load a saved campaign
            </div>
          </button>

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
          <button
            onClick={handleBack}
            className="btn-reset"
            style={{
              width: '100%',
              fontSize: '1rem',
              padding: '12px 24px',
              marginTop: '1rem'
            }}
          >
            Back to Menu
          </button>
        </div>

      </div>
    </div>
  );
}

export default EremosEntryScreen;
