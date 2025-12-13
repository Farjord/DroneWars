// ========================================
// DEPLOYING SCREEN
// ========================================
// Full-screen transition displayed when deploying from Hangar to Tactical Map
// Shows deployment progress and requires user acknowledgment to continue

import React, { useEffect, useState, useCallback } from 'react';
import './DeployingScreen.css';

/**
 * DeployingScreen - Transition screen for deploying to tactical operations
 *
 * @param {Object} deployData - Data about the deployment (optional)
 * @param {string} deployData.shipName - Name of the ship being deployed
 * @param {string} deployData.destination - Destination name
 * @param {Function} onComplete - Callback when user acknowledges deployment
 */
function DeployingScreen({ deployData, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [readyToContinue, setReadyToContinue] = useState(false);

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 4; // 25 steps over 2.5 seconds = 100ms per step
      });
    }, 100);

    // Mark ready for user acknowledgment when complete
    const readyTimer = setTimeout(() => {
      setReadyToContinue(true);
    }, 2500);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(readyTimer);
    };
  }, []);

  /**
   * Handle continue button click
   */
  const handleContinue = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  }, [onComplete]);

  /**
   * Get status message based on progress
   */
  const getStatusMessage = () => {
    if (progress < 15) return 'Initializing deployment sequence...';
    if (progress < 30) return 'Sealing cargo bay doors...';
    if (progress < 45) return 'Spooling jump drive...';
    if (progress < 60) return 'Calibrating navigation systems...';
    if (progress < 75) return 'Establishing tactical uplink...';
    if (progress < 90) return 'Entering transit corridor...';
    if (progress < 100) return 'Approaching operational zone...';
    return 'DEPLOYMENT COMPLETE';
  };

  return (
    <div className={`deploying-overlay ${fadeOut ? 'fade-out' : ''}`}>
      {/* Animated background effects */}
      <div className="deploying-background" />
      <div className="deploying-stars" />

      <div className="deploying-content">
        {/* Deploy Icon */}
        <div className="deploying-icon">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
            {/* Rocket/ship launching icon */}
            <path
              d="M12 2L8 8H4L2 12L4 16H8L12 22L16 16H20L22 12L20 8H16L12 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M12 5V9M12 15V19M5 12H9M15 12H19"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.5"
            />
          </svg>
        </div>

        {/* Main Title */}
        <h1 className="deploying-title">DEPLOYING</h1>

        {/* Ship/Destination Info */}
        {(deployData?.shipName || deployData?.destination) && (
          <div className="deploying-info">
            {deployData?.shipName && (
              <span className="deploying-ship-name">{deployData.shipName}</span>
            )}
            {deployData?.destination && (
              <span className="deploying-destination">→ {deployData.destination}</span>
            )}
          </div>
        )}

        {/* Progress Container */}
        <div className="deploying-progress-container">
          {/* Loading Bar */}
          <div className="deploying-loading-bar">
            <div
              className="deploying-loading-progress"
              style={{ width: `${progress}%` }}
            />
            <div className="deploying-loading-glow" />
          </div>

          {/* Progress Percentage */}
          <div className="deploying-progress-text">
            {progress}%
          </div>
        </div>

        {/* Status Text */}
        <p className={`deploying-status ${progress >= 100 ? 'deploying-complete' : ''}`}>
          {getStatusMessage()}
        </p>

        {/* Continue button - shown when ready */}
        {readyToContinue && (
          <button
            className="deploying-continue-button"
            onClick={handleContinue}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

export default DeployingScreen;
