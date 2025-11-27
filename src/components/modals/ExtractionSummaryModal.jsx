/**
 * ExtractionSummaryModal.jsx
 * Displays extraction results after successful run completion
 * Shows cards acquired, credits earned, and any drone damage
 */

import React from 'react';
import './ExtractionSummaryModal.css';

// Checkmark/Success icon
const IconSuccess = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    <path
      d="M8 12L11 15L16 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Warning icon for drone damage
const IconDamage = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.46 18.63 1.46 19.41 1.82 20.04C2.18 20.67 2.85 21.05 3.57 21.05H20.43C21.15 21.05 21.82 20.67 22.18 20.04C22.54 19.41 22.54 18.63 22.18 18L13.71 3.86C13.35 3.23 12.68 2.85 11.96 2.85C11.24 2.85 10.57 3.23 10.21 3.86L10.29 3.86Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// Star icon for blueprints
const IconStar = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

/**
 * ExtractionSummaryModal - Shows extraction results
 *
 * @param {boolean} show - Whether to show the modal
 * @param {Object} summary - Extraction summary object
 * @param {Function} onContinue - Continue callback (return to hangar)
 */
function ExtractionSummaryModal({ show, summary, onContinue }) {
  if (!show || !summary) return null;

  const {
    cardsAcquired = 0,
    blueprintsAcquired = 0,
    creditsEarned = 0,
    dronesDamaged = [],
    finalHull = 0,
    maxHull = 0,
    hullPercent = 100
  } = summary;

  // Hull color class
  const getHullColorClass = () => {
    const pct = parseInt(hullPercent);
    if (pct >= 70) return 'extraction-stat-hull';
    if (pct >= 40) return 'extraction-stat-hull warning';
    return 'extraction-stat-hull critical';
  };

  return (
    <div className="extraction-modal-overlay">
      <div className="extraction-modal-content">
        {/* Header */}
        <div className="extraction-modal-header">
          <div className="extraction-header-icon">
            <IconSuccess size={36} />
          </div>
          <div className="extraction-header-info">
            <h2 className="extraction-header-title">Extraction Complete</h2>
            <p className="extraction-header-subtitle">Mission Successful</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="extraction-stats">
          <div className="extraction-stat">
            <span className="extraction-stat-label">Cards Acquired</span>
            <span className="extraction-stat-value extraction-stat-cards">
              {cardsAcquired}
            </span>
          </div>

          <div className="extraction-stat">
            <span className="extraction-stat-label">Credits Earned</span>
            <span className="extraction-stat-value extraction-stat-credits">
              +{creditsEarned}
            </span>
          </div>

          <div className="extraction-stat">
            <span className="extraction-stat-label">Final Hull</span>
            <span className={`extraction-stat-value ${getHullColorClass()}`}>
              {finalHull}/{maxHull}
            </span>
          </div>

          <div className="extraction-stat">
            <span className="extraction-stat-label">Hull Status</span>
            <span className={`extraction-stat-value ${getHullColorClass()}`}>
              {hullPercent}%
            </span>
          </div>
        </div>

        {/* Blueprint Acquired (rare) */}
        {blueprintsAcquired > 0 && (
          <div className="extraction-blueprint">
            <div className="extraction-blueprint-icon">
              <IconStar size={28} />
            </div>
            <div className="extraction-blueprint-info">
              <span className="extraction-blueprint-label">Rare Discovery</span>
              <span className="extraction-blueprint-text">
                {blueprintsAcquired} Blueprint{blueprintsAcquired > 1 ? 's' : ''} Acquired!
              </span>
            </div>
          </div>
        )}

        {/* Drone Damage Warning */}
        {dronesDamaged.length > 0 && (
          <div className="extraction-damage-warning">
            <div className="extraction-damage-icon">
              <IconDamage size={28} />
            </div>
            <div className="extraction-damage-info">
              <span className="extraction-damage-label">Hull Damage Detected</span>
              <span className="extraction-damage-text">
                Damaged: {dronesDamaged.join(', ')}
              </span>
              <span className="extraction-damage-note">
                Visit the Repair Bay to restore damaged drones
              </span>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="extraction-modal-actions">
          <button className="extraction-btn-continue" onClick={onContinue}>
            Return to Hangar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExtractionSummaryModal;
