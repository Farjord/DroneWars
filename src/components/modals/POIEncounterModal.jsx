// ========================================
// POI ENCOUNTER MODAL
// ========================================
// Modal displayed when player arrives at a Point of Interest
// Shows encounter outcome (combat vs loot) and reward preview

import React from 'react';
import './POIEncounterModal.css';

// ========================================
// SVG ICON COMPONENTS
// ========================================

// Diamond/Cube icon for POIs
const IconPOI = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M12 6L18 12L12 18L6 12L12 6Z" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
  </svg>
);

// Combat/Crosshairs icon
const IconCombat = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" />
    <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="1.5" />
    <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// Checkmark icon for safe loot
const IconSafe = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M7 12L10 15L17 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// Warning triangle icon
const IconWarning = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M12 3L22 21H2L12 3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1" fill="currentColor" />
  </svg>
);

/**
 * POIEncounterModal - Display POI encounter outcome
 *
 * @param {Object} encounter - Encounter result from EncounterController
 * @param {Function} onProceed - Callback when player proceeds (engages or salvages)
 * @param {Function} onClose - Callback to close modal
 */
function POIEncounterModal({ encounter, onProceed, onClose }) {
  if (!encounter) return null;

  const { poi, outcome, aiId, reward, detection, threatLevel } = encounter;
  const poiData = poi.poiData || {};

  const isCombat = outcome === 'combat';

  /**
   * Get threat level display
   */
  const getThreatDisplay = () => {
    switch (threatLevel) {
      case 'low': return { label: 'Low Threat', color: '#10b981' };
      case 'medium': return { label: 'Medium Threat', color: '#f59e0b' };
      case 'high': return { label: 'High Threat', color: '#ef4444' };
      default: return { label: 'Unknown', color: '#6b7280' };
    }
  };

  const threat = getThreatDisplay();

  return (
    <div className="poi-modal-overlay" onClick={onClose}>
      <div className="poi-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="poi-modal-header">
          <div className="poi-header-icon" style={{ color: poiData.color || '#06b6d4' }}>
            <IconPOI size={40} />
          </div>
          <div className="poi-header-info">
            <h2 className="poi-header-title">{poiData.name || 'Unknown Location'}</h2>
            <p className="poi-header-subtitle">{poiData.description || 'Point of Interest'}</p>
          </div>
          <button className="poi-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Flavour Text */}
        <div className="poi-flavour">
          <p className="poi-flavour-text">{poiData.flavourText || 'Sensors detecting unknown signatures...'}</p>
        </div>

        {/* Security Scan Result */}
        <div className={`poi-scan-result ${isCombat ? 'poi-scan-combat' : 'poi-scan-safe'}`}>
          <div className="poi-scan-icon">
            {isCombat ? (
              <IconCombat size={28} className="icon-combat" />
            ) : (
              <IconSafe size={28} className="icon-safe" />
            )}
          </div>
          <div className="poi-scan-info">
            <span className="poi-scan-label">Security Scan</span>
            <span className="poi-scan-outcome">
              {isCombat ? 'HOSTILE SIGNATURES DETECTED' : 'AREA SECURED'}
            </span>
          </div>
        </div>

        {/* Combat Warning */}
        {isCombat && (
          <div className="poi-combat-warning">
            <IconWarning size={18} className="icon-warning" />
            <div className="poi-warning-info">
              <span className="poi-warning-label">Threat Assessment</span>
              <span className="poi-warning-text" style={{ color: threat.color }}>
                {threat.label} - {aiId || 'Unknown Enemy'}
              </span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="poi-stats">
          <div className="poi-stat">
            <span className="poi-stat-label">Detection</span>
            <span className="poi-stat-value">{detection.toFixed(1)}%</span>
          </div>
          <div className="poi-stat">
            <span className="poi-stat-label">Loot Bonus</span>
            <span className="poi-stat-value poi-stat-positive">+10%</span>
          </div>
          {isCombat && (
            <div className="poi-stat">
              <span className="poi-stat-label">Combat Bonus</span>
              <span className="poi-stat-value poi-stat-warning">+20%</span>
            </div>
          )}
          <div className="poi-stat">
            <span className="poi-stat-label">Credits</span>
            <span className="poi-stat-value poi-stat-credits">{reward.credits}</span>
          </div>
        </div>

        {/* Reward Type */}
        <div className="poi-reward-type">
          <span className="poi-reward-label">Reward Type:</span>
          <span className="poi-reward-value">{reward.rewardType.replace(/_/g, ' ')}</span>
        </div>

        {/* Actions */}
        <div className="poi-modal-actions">
          <button
            onClick={onProceed}
            className={isCombat ? 'btn-cancel' : 'btn-confirm'}
          >
            {isCombat ? 'Engage Hostiles' : 'Salvage Location'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default POIEncounterModal;
