// ========================================
// SPLASH LOADING SCREEN
// ========================================
// Animated splash screen displayed during asset preloading
// Shows progress with themed visuals matching the game aesthetic

import React, { useState, useEffect } from 'react';
import { CATEGORY_LABELS } from '../../services/assetManifest.js';
import './SplashLoadingScreen.css';

/**
 * Get dynamic status message based on loading progress
 * @param {number} percentage - Current load percentage
 * @param {string} currentCategory - Category being loaded
 * @returns {string} Status message
 */
const getStatusMessage = (percentage, currentCategory) => {
  if (percentage === 0) return 'Initializing systems...';
  if (percentage < 15) return 'Establishing connection...';
  if (percentage < 30) return `Loading ${CATEGORY_LABELS[currentCategory] || 'assets'}...`;
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
 * @param {Function} props.onComplete - Callback when loading completes
 */
function SplashLoadingScreen({ progress, onComplete }) {
  const [fadeOut, setFadeOut] = useState(false);

  // Handle completion with fade-out animation
  useEffect(() => {
    if (progress?.percentage >= 100) {
      // Brief delay to show 100%, then fade out
      const timer = setTimeout(() => {
        setFadeOut(true);
        // Wait for fade animation before calling onComplete
        setTimeout(onComplete, 400);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [progress?.percentage, onComplete]);

  const percentage = progress?.percentage || 0;
  const currentCategory = progress?.currentCategory || '';
  const loaded = progress?.loaded || 0;
  const total = progress?.total || 0;
  const failed = progress?.failed || 0;

  return (
    <div className={`splash-loading-overlay ${fadeOut ? 'fade-out' : ''}`}>
      {/* Animated background effect */}
      <div className="splash-background" />
      <div className="splash-stars" />

      <div className="splash-content">
        {/* Logo/Title */}
        <div className="splash-logo-container">
          <h1 className="splash-title">EREMOS</h1>
          <div className="splash-subtitle">LOADING GAME ASSETS</div>
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
          {getStatusMessage(percentage, currentCategory)}
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
      </div>
    </div>
  );
}

export default SplashLoadingScreen;
