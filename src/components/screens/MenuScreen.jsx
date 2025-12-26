// ========================================
// MENU SCREEN
// ========================================
// Main menu for game mode selection
// Clean separation from game logic - no player state access

import { useEffect, useState } from 'react';
import { useGameState } from '../../hooks/useGameState.js';
import GameDataService from '../../services/GameDataService.js';
import DEV_CONFIG from '../../config/devConfig.js';
import { debugLog } from '../../utils/debugLogger.js';
import GlossaryModal from '../modals/GlossaryModal.jsx';
import AIStrategyModal from '../modals/AIStrategyModal.jsx';
import ScalingText from '../ui/ScalingText.jsx';

// Menu button images
const menuImages = {
  eremos: new URL('/Menu/Eremos.png', import.meta.url).href,
  vsAI: new URL('/Menu/VSAI.png', import.meta.url).href,
  vsMultiplayer: new URL('/Menu/VSMultiplayer.png', import.meta.url).href,
  deckBuilder: new URL('/Menu/Deck.png', import.meta.url).href,
  testingMode: new URL('/Menu/Train.png', import.meta.url).href
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

/**
 * MenuScreen - Main menu for selecting game mode
 * No access to game state or player data - pure menu functionality
 */
function MenuScreen() {
  const { gameStateManager } = useGameState();

  // Single animation trigger state - all effects trigger together
  const [animationKey, setAnimationKey] = useState(0);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showAIStrategy, setShowAIStrategy] = useState(false);

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

    // Clear ActionProcessor queue using wrapper (handles resubscribe automatically)
    // See: GameFlowManager.subscription.test.js for architectural documentation
    if (gameStateManager?.clearActionQueue) {
      gameStateManager.clearActionQueue();
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

  const handleIntoTheEremos = () => {
    debugLog('PHASE_TRANSITIONS', '🚀 Selected: Into The Eremos');
    gameStateManager.setState({ appState: 'eremosEntry' });
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
          {/* Background hex decorations - positioned behind text */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Upper-left hex - larger */}
            <svg
              key={`hex1-${animationKey}`}
              className="menu-hex-pulse"
              style={{ position: 'absolute', transform: 'translate(-70px, -25px)', opacity: 0.2, animationDelay: '0s' }}
              width="80" height="92" viewBox="0 0 80 92"
            >
              <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="rgba(6, 182, 212, 0.08)" stroke="#06b6d4" strokeWidth="1" />
            </svg>
            {/* Lower-right hex - medium */}
            <svg
              key={`hex2-${animationKey}`}
              className="menu-hex-pulse"
              style={{ position: 'absolute', transform: 'translate(60px, 20px)', opacity: 0.15, animationDelay: '0.15s' }}
              width="60" height="69" viewBox="0 0 80 92"
            >
              <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="rgba(6, 182, 212, 0.06)" stroke="#22d3ee" strokeWidth="0.8" />
            </svg>
            {/* Center-right small hex */}
            <svg
              key={`hex3-${animationKey}`}
              className="menu-hex-pulse"
              style={{ position: 'absolute', transform: 'translate(100px, -5px)', opacity: 0.1, animationDelay: '0.3s' }}
              width="40" height="46" viewBox="0 0 80 92"
            >
              <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="rgba(6, 182, 212, 0.05)" stroke="#67e8f9" strokeWidth="0.5" />
            </svg>
            {/* Upper-right tiny hex */}
            <svg
              key={`hex4-${animationKey}`}
              className="menu-hex-pulse"
              style={{ position: 'absolute', transform: 'translate(40px, -35px)', opacity: 0.12, animationDelay: '0.1s' }}
              width="35" height="40" viewBox="0 0 80 92"
            >
              <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="none" stroke="#22d3ee" strokeWidth="0.6" />
            </svg>
          </div>
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
            INTO THE EREMOS
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
            INTO THE EREMOS
          </h1>

          {/* Main Title */}
          <h1
            key={`title-${animationKey}`}
            className="menu-gradient-cycle menu-title-glitch-distort menu-title-opacity-glitch animate-pulse heading-font"
            style={{
              fontSize: '4rem',
              margin: 0,
              textAlign: 'center',
              background: 'linear-gradient(90deg, #06b6d4, #22d3ee, #ffffff, #22d3ee, #06b6d4)',
              backgroundSize: '300% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.5))',
              textShadow: '0 0 20px rgba(6, 182, 212, 0.5), 0 0 40px rgba(34, 211, 238, 0.3)',
              position: 'relative',
              zIndex: 1
            }}
          >
            INTO THE EREMOS
          </h1>
        </div>

        {/* Game mode buttons - multi-row layout */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          width: '100%',
          maxWidth: '900px'
        }}>
          {/* Row 1: Main game modes - 3 large artwork buttons */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <ImageButton
              image={menuImages.eremos}
              label="Into the Eremos"
              subtitle="Roguelike Campaign"
              onClick={handleIntoTheEremos}
              style={{ flex: 1, minHeight: '280px' }}
            />
            <ImageButton
              image={menuImages.vsAI}
              label="VS Mode: Single Player"
              subtitle="vs AI Opponent"
              onClick={handleSinglePlayer}
              style={{ flex: 1, minHeight: '280px' }}
            />
            <ImageButton
              image={menuImages.vsMultiplayer}
              label="VS Mode: Multiplayer"
              subtitle="vs Human Player"
              onClick={handleMultiplayer}
              style={{ flex: 1, minHeight: '280px' }}
            />
          </div>

          {/* Row 2: Secondary modes - artwork buttons, centered */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <ImageButton
              image={menuImages.deckBuilder}
              label="Deck Builder"
              subtitle="Build Your Deck"
              onClick={() => gameStateManager.setState({ appState: 'deckBuilder' })}
              style={{ flex: '0 1 calc(33.333% - 0.5rem)', minHeight: '280px' }}
            />
            {DEV_CONFIG.features.testingMode && (
              <ImageButton
                image={menuImages.testingMode}
                label="Testing Mode"
                subtitle="Dev Scenario Setup"
                onClick={() => gameStateManager.setState({ appState: 'testingSetup' })}
                style={{ flex: '0 1 calc(33.333% - 0.5rem)', minHeight: '280px' }}
              />
            )}
          </div>

          {/* Row 3: Info/utility buttons - standard gradient buttons */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={() => setShowGlossary(true)}
              className="dw-btn dw-btn-secondary"
              style={{ flex: 1, maxWidth: '250px', fontSize: '1rem', padding: '12px 20px' }}
            >
              <ScalingText text="MECHANICS GLOSSARY" className="uppercase tracking-wider font-semibold" />
            </button>

            <button
              onClick={() => setShowAIStrategy(true)}
              className="dw-btn dw-btn-secondary"
              style={{ flex: 1, maxWidth: '250px', fontSize: '1rem', padding: '12px 20px' }}
            >
              <ScalingText text="AI STRATEGY GUIDE" className="uppercase tracking-wider font-semibold" />
            </button>

            {DEV_CONFIG.features.modalShowcase && (
              <button
                onClick={() => gameStateManager.setState({ appState: 'modalShowcase' })}
                className="dw-btn dw-btn-secondary"
                style={{ flex: 1, maxWidth: '250px', fontSize: '1rem', padding: '12px 20px' }}
              >
                <ScalingText text="MODAL SHOWCASE" className="uppercase tracking-wider font-semibold" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Glossary Modal */}
      {showGlossary && (
        <GlossaryModal onClose={() => setShowGlossary(false)} />
      )}

      {/* AI Strategy Modal */}
      {showAIStrategy && (
        <AIStrategyModal onClose={() => setShowAIStrategy(false)} />
      )}
    </div>
  );
}

export default MenuScreen;