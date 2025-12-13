// ========================================
// ESCAPE LOADING SCREEN
// ========================================
// Full-screen transition displayed after confirming escape
// Shows real-time damage hits as they occur, requires user acknowledgment

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Zap } from 'lucide-react';
import './EscapeLoadingScreen.css';

/**
 * EscapeLoadingScreen - Animated escape sequence with real-time damage
 *
 * @param {Object} escapeData - Data about the escape
 * @param {number} escapeData.totalDamage - Total damage dealt during escape
 * @param {Object} escapeData.shipSections - Ship sections with FINAL hull values
 * @param {Object} escapeData.initialSections - Ship sections BEFORE damage
 * @param {Array} escapeData.damageHits - Array of { section, newHull, maxHull } for each hit
 * @param {string} escapeData.aiName - Name of the AI escaped from
 * @param {Function} onComplete - Callback when user acknowledges
 */
function EscapeLoadingScreen({ escapeData, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [revealedHits, setRevealedHits] = useState(0);
  const [flashingSection, setFlashingSection] = useState(null);
  const [escapeComplete, setEscapeComplete] = useState(false);

  const { totalDamage, shipSections, initialSections, damageHits, aiName } = escapeData || {};

  // Calculate current hull values based on revealed hits
  const currentSections = useMemo(() => {
    if (!initialSections) return shipSections || {};

    // Start with initial values
    const sections = {};
    Object.entries(initialSections).forEach(([key, section]) => {
      sections[key] = { ...section };
    });

    // Apply revealed hits
    if (damageHits) {
      for (let i = 0; i < revealedHits && i < damageHits.length; i++) {
        const hit = damageHits[i];
        if (sections[hit.section]) {
          sections[hit.section].hull = hit.newHull;
        }
      }
    }

    return sections;
  }, [initialSections, shipSections, damageHits, revealedHits]);

  // Calculate damage revealed so far
  const damageRevealed = useMemo(() => {
    return Math.min(revealedHits, damageHits?.length || 0);
  }, [revealedHits, damageHits]);

  useEffect(() => {
    const hitCount = damageHits?.length || 0;

    // If no damage, just show escape sequence then complete immediately
    if (hitCount === 0) {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 5;
        });
      }, 100);

      const completeTimer = setTimeout(() => {
        setEscapeComplete(true);
      }, 2000);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(completeTimer);
      };
    }

    // Calculate timing: progress fills over ~1.5s, then hits revealed
    // Hits revealed every 400ms during "Taking evasive damage..." phase
    const progressDuration = 1500; // 1.5 seconds to fill progress
    const hitDelay = 400; // 400ms between each hit reveal

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5; // 100ms per tick, 20 ticks = 2000ms
      });
    }, 100);

    // Schedule damage hit reveals (start at ~60% progress = 1200ms)
    const hitTimers = [];
    for (let i = 0; i < hitCount; i++) {
      const timer = setTimeout(() => {
        setRevealedHits(i + 1);
        setFlashingSection(damageHits[i].section);

        // Clear flash after 300ms
        setTimeout(() => {
          setFlashingSection(null);
        }, 300);
      }, 1200 + (i * hitDelay)); // Start at 1200ms, then every 400ms

      hitTimers.push(timer);
    }

    // Mark escape complete after all hits revealed
    const totalTime = 1200 + (hitCount * hitDelay) + 500; // Extra 500ms buffer
    const completeTimer = setTimeout(() => {
      setEscapeComplete(true);
    }, totalTime);

    return () => {
      clearInterval(progressInterval);
      hitTimers.forEach(t => clearTimeout(t));
      clearTimeout(completeTimer);
    };
  }, [damageHits]);

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
   * Get status message based on progress and escape state
   */
  const getStatusMessage = () => {
    if (escapeComplete) return 'ESCAPE SUCCESSFUL';
    if (progress < 20) return 'Initiating evasive maneuvers...';
    if (progress < 40) return 'Jamming tracking signals...';
    if (progress < 60) return 'Calculating escape vector...';
    if (progress < 80) return 'Taking evasive damage...';
    if (progress < 100) return 'Breaking contact...';
    return 'ESCAPE SUCCESSFUL';
  };

  /**
   * Get hull color based on damage threshold
   */
  const getHullColor = (section) => {
    const { hull, thresholds } = section;
    const damagedThreshold = thresholds?.damaged ?? 4;

    if (hull <= 0) return '#ef4444'; // Critical - red
    if (hull <= damagedThreshold) return '#f59e0b'; // Damaged - amber
    return '#10b981'; // Healthy - green
  };

  return (
    <div className={`escape-loading-overlay ${fadeOut ? 'fade-out' : ''}`}>
      {/* Animated background effects */}
      <div className="escape-background" />
      <div className="escape-stars" />

      <div className="escape-loading-content">
        {/* Warning Icon */}
        <div className="escape-warning-icon">
          <Zap size={72} />
        </div>

        {/* Title */}
        <h1 className="escape-title">EMERGENCY ESCAPE</h1>
        {aiName && (
          <p className="escape-subtitle">Evading {aiName}</p>
        )}

        {/* Progress bar */}
        <div className="escape-progress-container">
          <div className="escape-progress-bar">
            <div
              className="escape-progress-fill"
              style={{ width: `${progress}%` }}
            />
            <div className="escape-progress-glow" />
          </div>
          <div className={`escape-status-message ${escapeComplete ? 'escape-complete' : ''}`}>
            {getStatusMessage()}
          </div>
        </div>

        {/* Damage Summary - real-time updates */}
        <div className="escape-damage-summary">
          <div className="escape-damage-total">
            Ship sustained <strong>{damageRevealed}</strong>{totalDamage > 0 && `/${totalDamage}`} damage
          </div>
          {currentSections && (
            <div className="escape-sections-status">
              {Object.entries(currentSections).map(([name, section]) => (
                <div
                  key={name}
                  className={`escape-section-row ${flashingSection === name ? 'escape-section-hit' : ''}`}
                >
                  <span className="escape-section-name">{name}</span>
                  <span
                    className="escape-section-hull"
                    style={{ color: getHullColor(section) }}
                  >
                    {section.hull}/{section.maxHull}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Continue button - shown when escape complete */}
        {escapeComplete && (
          <button
            className="escape-continue-button"
            onClick={handleContinue}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

export default EscapeLoadingScreen;
