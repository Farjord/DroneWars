// ========================================
// EXTRACTION LOADING SCREEN
// ========================================
// Full-screen transition displayed during extraction
// Shows extraction progress and auto-transitions after ~2 seconds

import React, { useEffect, useState } from 'react';
import './ExtractionLoadingScreen.css';

/**
 * ExtractionLoadingScreen - Brief transition screen during extraction
 *
 * @param {Object} extractionData - Data about the extraction
 * @param {number} extractionData.creditsEarned - Credits earned during the run
 * @param {number} extractionData.cardsCollected - Number of cards collected
 * @param {number} extractionData.aiCoresEarned - AI cores earned during the run
 * @param {Function} onComplete - Callback when loading completes
 */
function ExtractionLoadingScreen({ extractionData, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5; // 20 steps over 2 seconds = 100ms per step
      });
    }, 100);

    // Trigger fade out and completion
    const completeTimer = setTimeout(() => {
      setFadeOut(true);
      // Small delay for fade animation before calling onComplete
      setTimeout(() => {
        onComplete();
      }, 300);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  /**
   * Get status message based on progress
   */
  const getStatusMessage = () => {
    if (progress < 20) return 'Initiating extraction sequence...';
    if (progress < 40) return 'Securing cargo hold...';
    if (progress < 60) return 'Calculating return trajectory...';
    if (progress < 80) return 'Clearing extraction zone...';
    if (progress < 100) return 'Approaching hangar...';
    return 'EXTRACTION COMPLETE';
  };

  const creditsEarned = extractionData?.creditsEarned || 0;
  const cardsCollected = extractionData?.cardsCollected || 0;
  const aiCoresEarned = extractionData?.aiCoresEarned || 0;

  return (
    <div className={`extraction-loading-overlay ${fadeOut ? 'fade-out' : ''}`}>
      {/* Animated background effects */}
      <div className="extraction-background" />
      <div className="extraction-stars" />

      <div className="extraction-loading-content">
        {/* Success Icon - Ship/Exit arrow */}
        <div className="extraction-success-icon">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
            {/* Outer ring */}
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            {/* Inner ring */}
            <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            {/* Exit arrow pointing up-right */}
            <path
              d="M9 15L15 9M15 9H10M15 9V14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Main Title */}
        <h1 className="extraction-title">
          EXTRACTION
        </h1>

        {/* Status Badge */}
        <div className="extraction-status-badge">
          RETURNING TO BASE
        </div>

        {/* Progress Container */}
        <div className="extraction-progress-container">
          {/* Loading Bar */}
          <div className="extraction-loading-bar">
            <div
              className="extraction-loading-progress"
              style={{ width: `${progress}%` }}
            />
            <div className="extraction-loading-glow" />
          </div>

          {/* Progress Percentage */}
          <div className="extraction-progress-text">
            {progress}%
          </div>
        </div>

        {/* Status Text */}
        <p className="extraction-status">
          {getStatusMessage()}
        </p>

        {/* Loot Summary */}
        {(creditsEarned > 0 || cardsCollected > 0 || aiCoresEarned > 0) && (
          <div className="extraction-loot-summary">
            {creditsEarned > 0 && (
              <span className="loot-item credits">
                <span className="loot-icon">💰</span>
                <span className="loot-value">{creditsEarned}</span>
              </span>
            )}
            {cardsCollected > 0 && (
              <span className="loot-item cards">
                <span className="loot-icon">🃏</span>
                <span className="loot-value">{cardsCollected}</span>
              </span>
            )}
            {aiCoresEarned > 0 && (
              <span className="loot-item cores">
                <span className="loot-icon">🔮</span>
                <span className="loot-value">{aiCoresEarned}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExtractionLoadingScreen;
