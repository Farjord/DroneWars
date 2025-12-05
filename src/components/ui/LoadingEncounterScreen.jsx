// ========================================
// LOADING ENCOUNTER SCREEN
// ========================================
// Full-screen transition displayed before entering combat
// Shows AI opponent info and auto-transitions after ~2 seconds

import React, { useEffect, useState } from 'react';
import './LoadingEncounterScreen.css';

/**
 * LoadingEncounterScreen - Brief transition screen before combat
 *
 * @param {Object} encounterData - Data about the encounter
 * @param {string} encounterData.aiName - Name of the AI opponent
 * @param {string} encounterData.difficulty - AI difficulty level
 * @param {string} encounterData.threatLevel - Current threat level (low/medium/high)
 * @param {boolean} encounterData.isAmbush - Whether this is an ambush (random encounter)
 * @param {Function} onComplete - Callback when loading completes
 */
function LoadingEncounterScreen({ encounterData, onComplete }) {
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
   * Get threat level styling
   */
  const getThreatStyle = () => {
    switch (encounterData?.threatLevel) {
      case 'low': return { color: '#10b981', label: 'LOW THREAT' };
      case 'medium': return { color: '#f59e0b', label: 'MEDIUM THREAT' };
      case 'high': return { color: '#ef4444', label: 'HIGH THREAT' };
      default: return { color: '#ef4444', label: 'HOSTILE CONTACT' };
    }
  };

  const threat = getThreatStyle();

  /**
   * Get difficulty badge color
   */
  const getDifficultyColor = () => {
    switch (encounterData?.difficulty?.toLowerCase()) {
      case 'easy': return '#10b981';
      case 'normal':
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  /**
   * Get status message based on progress
   */
  const getStatusMessage = () => {
    if (progress < 25) return 'Detecting hostile signatures...';
    if (progress < 50) return 'Analyzing threat patterns...';
    if (progress < 75) return 'Preparing combat systems...';
    if (progress < 100) return 'Weapons online...';
    return 'ENGAGING!';
  };

  return (
    <div className={`loading-encounter-overlay ${fadeOut ? 'fade-out' : ''}`}>
      {/* Animated background effects */}
      <div className="encounter-background" />
      <div className="encounter-stars" />

      <div className="loading-encounter-content">
        {/* Warning Icon */}
        <div className="encounter-warning-icon">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
            <line x1="2" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" />
            <line x1="19" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* Main Title */}
        <h1 className="encounter-title">
          {encounterData?.isAmbush ? 'AMBUSH!' : 'ENCOUNTER'}
        </h1>

        {/* AI Name */}
        <div className="encounter-ai-info">
          <span className="encounter-ai-name">
            {encounterData?.aiName || 'Unknown Hostile'}
          </span>
          {encounterData?.difficulty && (
            <span
              className="encounter-difficulty-badge"
              style={{ backgroundColor: getDifficultyColor() }}
            >
              {encounterData.difficulty}
            </span>
          )}
        </div>

        {/* Threat Level */}
        <div className="encounter-threat" style={{ color: threat.color }}>
          {threat.label}
        </div>

        {/* Progress Container */}
        <div className="encounter-progress-container">
          {/* Loading Bar */}
          <div className="encounter-loading-bar">
            <div
              className="encounter-loading-progress"
              style={{ width: `${progress}%` }}
            />
            <div className="encounter-loading-glow" />
          </div>

          {/* Progress Percentage */}
          <div className="encounter-progress-text">
            {progress}%
          </div>
        </div>

        {/* Status Text */}
        <p className="encounter-status">
          {getStatusMessage()}
        </p>
      </div>
    </div>
  );
}

export default LoadingEncounterScreen;
