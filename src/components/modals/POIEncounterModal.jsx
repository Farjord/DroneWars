// ========================================
// POI ENCOUNTER MODAL
// ========================================
// Modal displayed when player arrives at a Point of Interest
// Shows encounter outcome (combat vs loot) and reward preview

import React from 'react';
import { Target, CheckCircle, AlertTriangle, Zap, Shield, LogOut, Radio } from 'lucide-react';

// Diamond/Cube icon for POIs (custom SVG)
const IconPOI = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M12 6L18 12L12 18L6 12L12 6Z" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
  </svg>
);

/**
 * POIEncounterModal - Display POI encounter outcome
 *
 * @param {Object} encounter - Encounter result from EncounterController
 * @param {Function} onProceed - Callback when player proceeds (engages or salvages) - standard deployment
 * @param {Function} onQuickDeploy - Callback when player chooses quick deployment
 * @param {Array} validQuickDeployments - Array of valid quick deployments for current slot
 * @param {Function} onEscape - Callback when player chooses to escape combat (takes damage, no rewards)
 * @param {Function} onEvade - Callback when player uses an evade tactical item
 * @param {number} evadeItemCount - Number of evade items available (0 or undefined hides button)
 * @param {Function} onClose - Callback to close modal
 */
function POIEncounterModal({ encounter, onProceed, onQuickDeploy, validQuickDeployments = [], onEscape, onEvade, evadeItemCount = 0, onClose }) {
  if (!encounter) return null;

  const { poi, outcome, aiId, aiData, detection, threatLevel } = encounter;
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

  /**
   * Get difficulty display color
   */
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'Hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  /**
   * Format escape damage range for display
   */
  const formatEscapeDamage = (escapeDamage) => {
    if (!escapeDamage) return '2';
    const { min, max } = escapeDamage;
    return min === max ? `${min}` : `${min}-${max}`;
  };

  const threat = getThreatDisplay();

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className={`dw-modal-content dw-modal--md ${isCombat ? 'dw-modal--danger' : 'dw-modal--action'}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: poiData.color || 'var(--modal-action)' }}>
            <IconPOI size={32} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{poiData.name || 'Unknown Location'}</h2>
            <p className="dw-modal-header-subtitle">{poiData.description || 'Point of Interest'}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Flavour Text */}
          <p className="dw-modal-text" style={{ fontStyle: 'italic', marginBottom: '16px' }}>
            {poiData.flavourText || 'Sensors detecting unknown signatures...'}
          </p>

          {/* Security Scan Result */}
          <div className="dw-modal-info-box" style={{
            '--modal-theme': isCombat ? 'var(--modal-danger)' : 'var(--modal-success)',
            '--modal-theme-bg': isCombat ? 'var(--modal-danger-bg)' : 'rgba(34, 197, 94, 0.08)',
            '--modal-theme-border': isCombat ? 'var(--modal-danger-border)' : 'rgba(34, 197, 94, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isCombat ? (
                <Target size={28} style={{ color: 'var(--modal-danger)' }} />
              ) : (
                <CheckCircle size={28} style={{ color: 'var(--modal-success)' }} />
              )}
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-secondary)', textTransform: 'uppercase' }}>Security Scan</p>
                <p style={{ margin: 0, fontWeight: 700, color: isCombat ? 'var(--modal-danger)' : 'var(--modal-success)' }}>
                  {isCombat ? 'HOSTILE SIGNATURES DETECTED' : 'AREA SECURED'}
                </p>
              </div>
            </div>
          </div>

          {/* Combat Warning */}
          {isCombat && (
            <div className="dw-modal-info-box" style={{ marginTop: '12px', '--modal-theme': '#eab308', '--modal-theme-bg': 'rgba(234, 179, 8, 0.08)', '--modal-theme-border': 'rgba(234, 179, 8, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#eab308' }} />
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--modal-text-secondary)' }}>Threat Assessment</p>
                  <p style={{ margin: 0, fontWeight: 600, color: threat.color }}>
                    {threat.label} - {aiId || 'Unknown Enemy'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Combat Stats Grid - only show for combat encounters */}
          {isCombat && aiData && (
            <div className="dw-modal-grid dw-modal-grid--2" style={{ marginTop: '16px' }}>
              <div className="dw-modal-stat">
                <div className="dw-modal-stat-label">Ship Class</div>
                <div className="dw-modal-stat-value">{aiData.shipClass}</div>
              </div>
              <div className="dw-modal-stat">
                <div className="dw-modal-stat-label">Detection</div>
                <div className="dw-modal-stat-value">{detection.toFixed(1)}%</div>
              </div>
              <div className="dw-modal-stat">
                <div className="dw-modal-stat-label">Difficulty</div>
                <div className="dw-modal-stat-value" style={{ color: getDifficultyColor(aiData.difficulty) }}>
                  {aiData.difficulty}
                </div>
              </div>
              <div className="dw-modal-stat">
                <div className="dw-modal-stat-label">Escape Damage</div>
                <div className="dw-modal-stat-value" style={{ color: 'var(--modal-danger)' }}>
                  {formatEscapeDamage(aiData.escapeDamage)} hull
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          {isCombat ? (
            /* Combat encounter - show evade + escape + engage options */
            <div style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
              {/* Evade Item button - only when player has evade items */}
              {evadeItemCount > 0 && onEvade && (
                <button
                  onClick={onEvade}
                  className="dw-btn dw-btn-secondary"
                  style={{ flex: '1 1 auto', minWidth: '120px', backgroundColor: 'rgba(6, 182, 212, 0.2)', borderColor: '#06b6d4' }}
                >
                  <Radio size={16} style={{ marginRight: '6px', color: '#06b6d4' }} />
                  <span style={{ color: '#06b6d4' }}>Use Jammer ({evadeItemCount})</span>
                </button>
              )}
              {/* Escape button - always available for combat */}
              <button
                onClick={onEscape}
                className="dw-btn dw-btn-secondary"
                style={{ flex: '1 1 auto', minWidth: '120px' }}
              >
                <LogOut size={16} style={{ marginRight: '6px' }} />
                Escape
              </button>
              {validQuickDeployments.length > 0 ? (
                /* Has quick deployments - show standard + quick deploy */
                <>
                  <button
                    onClick={onProceed}
                    className="dw-btn dw-btn-secondary"
                    style={{ flex: '1 1 auto', minWidth: '120px' }}
                  >
                    <Shield size={16} style={{ marginRight: '6px' }} />
                    Standard Deploy
                  </button>
                  <button
                    onClick={onQuickDeploy}
                    className="dw-btn dw-btn-danger"
                    style={{ flex: '1 1 auto', minWidth: '120px' }}
                  >
                    <Zap size={16} style={{ marginRight: '6px' }} />
                    Quick Deploy
                  </button>
                </>
              ) : (
                /* No quick deployments - single engage button */
                <button
                  onClick={onProceed}
                  className="dw-btn dw-btn-danger"
                  style={{ flex: '1 1 auto', minWidth: '120px' }}
                >
                  Engage Hostiles
                </button>
              )}
            </div>
          ) : (
            /* Loot encounter - single salvage button */
            <button
              onClick={onProceed}
              className="dw-btn dw-btn-confirm dw-btn--full"
            >
              Salvage Location
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default POIEncounterModal;
