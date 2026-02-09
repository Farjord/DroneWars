// ========================================
// SPLASH LOADING SCREEN
// ========================================
// Animated splash screen displayed during asset preloading
// Shows progress with themed visuals matching the game aesthetic
// Displays a Continue button when loading completes (user gesture unlocks AudioContext)

import React, { useState, useEffect, useCallback } from 'react';
import './SplashLoadingScreen.css';

/**
 * Get dynamic status message based on loading progress
 * @param {number} percentage - Current load percentage
 * @returns {string} Status message
 */
const getStatusMessage = (percentage) => {
  if (percentage === 0) return 'Initializing systems...';
  if (percentage < 15) return 'Establishing connection...';
  if (percentage < 30) return 'Loading assets...';
  if (percentage < 50) return 'Calibrating drone networks...';
  if (percentage < 70) return 'Syncing tactical data...';
  if (percentage < 85) return 'Preparing combat systems...';
  if (percentage < 100) return 'Finalizing preparations...';
  return 'Ready for deployment!';
};

/**
 * SplashLoadingScreen - Animated splash screen during asset preload
 *
 * @param {Object} props
 * @param {Object} props.progress - Loading progress data
 * @param {Function} props.onContinue - Callback when user clicks Continue (unlocks audio)
 */
function SplashLoadingScreen({ progress, onContinue }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [showContinue, setShowContinue] = useState(false);

  const percentage = progress?.percentage || 0;
  const loaded = progress?.loaded || 0;
  const total = progress?.total || 0;
  const failed = progress?.failed || 0;

  // Show Continue button after a brief delay when loading hits 100%
  useEffect(() => {
    if (percentage >= 100) {
      const timer = setTimeout(() => setShowContinue(true), 300);
      return () => clearTimeout(timer);
    }
  }, [percentage]);

  const handleContinueClick = useCallback(() => {
    if (fadeOut) return; // Prevent double-click
    setFadeOut(true);
    // Wait for fade animation before calling onContinue
    setTimeout(() => onContinue(), 400);
  }, [fadeOut, onContinue]);

  const isReady = percentage >= 100;

  return (
    <div className={`splash-loading-overlay ${fadeOut ? 'fade-out' : ''}`}>
      {/* Animated background effect */}
      <div className="splash-background" />
      <div className="splash-stars" />

      <div className="splash-content">
        {/* Logo/Title */}
        <div className="splash-logo-container">
          <h1 className="splash-title">EREMOS</h1>
          <div className="splash-subtitle">
            {isReady ? 'SYSTEMS ONLINE' : 'LOADING GAME ASSETS'}
          </div>
        </div>

        {/* Main Progress Bar */}
        <div className="splash-progress-container">
          <div className="splash-progress-bar">
            <div
              className="splash-progress-fill"
              style={{ width: `${percentage}%` }}
            />
            <div className="splash-progress-glow" />
          </div>
          <div className="splash-progress-text">
            {percentage}%
          </div>
        </div>

        {/* Status Message */}
        <div className="splash-status">
          {getStatusMessage(percentage)}
        </div>

        {/* Asset Count */}
        <div className="splash-asset-count">
          {loaded} / {total} assets
        </div>

        {/* Failed assets warning */}
        {failed > 0 && (
          <div className="splash-warning">
            {failed} asset{failed > 1 ? 's' : ''} failed to load
          </div>
        )}

        {/* Continue button — user gesture unlocks AudioContext */}
        {showContinue && (
          <button
            className="splash-continue-button"
            onClick={handleContinueClick}
            data-no-click-sound
          >
            CONTINUE
          </button>
        )}
      </div>
    </div>
  );
}

export default SplashLoadingScreen;
