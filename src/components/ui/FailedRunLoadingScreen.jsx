// ========================================
// FAILED RUN LOADING SCREEN
// ========================================
// Full-screen transition displayed when a run fails (MIA)
// Shows failure type-specific messages and auto-transitions after ~2 seconds

import React, { useEffect, useState } from 'react';
import './FailedRunLoadingScreen.css';

/**
 * FailedRunLoadingScreen - Brief transition screen for failed runs
 *
 * @param {string} failureType - Type of failure: 'combat' | 'detection' | 'abandon'
 * @param {boolean} isStarterDeck - If true, show "RUN FAILED" instead of "SHIP MARKED MIA"
 * @param {Function} onComplete - Callback when loading completes
 */
function FailedRunLoadingScreen({ failureType, isStarterDeck, onComplete }) {
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
   * Get title based on failure type
   */
  const getTitle = () => {
    switch (failureType) {
      case 'combat': return 'SIGNAL LOST';
      case 'detection': return 'DETECTED';
      case 'abandon': return 'ABORT CONFIRMED';
      default: return 'MISSION FAILED';
    }
  };

  /**
   * Get status messages based on progress and failure type
   */
  const getStatusMessage = () => {
    if (progress < 20) {
      switch (failureType) {
        case 'combat': return 'Connection terminated...';
        case 'detection': return 'Enemy forces converging...';
        case 'abandon': return 'Scuttling cargo systems...';
        default: return 'Processing failure...';
      }
    }
    if (progress < 40) return 'Transmitting retrieval coordinates...';
    if (progress < 60) return 'Logging final position...';
    if (progress < 80) return 'Securing emergency beacon...';
    if (progress < 100) return 'Finalizing mission report...';
    return isStarterDeck ? 'RUN FAILED' : 'SHIP MARKED MIA';
  };

  /**
   * Get final status text
   */
  const getFinalStatus = () => {
    return isStarterDeck ? 'RUN FAILED' : 'SHIP MARKED MIA';
  };

  return (
    <div className={`failed-run-overlay ${fadeOut ? 'fade-out' : ''}`}>
      {/* Animated background effects */}
      <div className="failed-run-background" />
      <div className="failed-run-static" />

      <div className="failed-run-content">
        {/* Warning Icon */}
        <div className="failed-run-icon">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
            {/* Warning triangle with X */}
            <path
              d="M12 2L2 20h20L12 2z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M9 11l6 6M15 11l-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Main Title */}
        <h1 className="failed-run-title">
          {getTitle()}
        </h1>

        {/* Subtitle */}
        <div className="failed-run-subtitle">
          EMERGENCY PROTOCOL ACTIVE
        </div>

        {/* Progress Container */}
        <div className="failed-run-progress-container">
          {/* Loading Bar */}
          <div className="failed-run-loading-bar">
            <div
              className="failed-run-loading-progress"
              style={{ width: `${progress}%` }}
            />
            <div className="failed-run-loading-glow" />
          </div>

          {/* Progress Percentage */}
          <div className="failed-run-progress-text">
            {progress}%
          </div>
        </div>

        {/* Status Text */}
        <p className="failed-run-status">
          {getStatusMessage()}
        </p>

        {/* Final MIA Status (shows when complete) */}
        {progress >= 100 && (
          <div className="failed-run-final-status">
            {getFinalStatus()}
          </div>
        )}
      </div>
    </div>
  );
}

export default FailedRunLoadingScreen;
