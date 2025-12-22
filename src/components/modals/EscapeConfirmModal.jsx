// ========================================
// ESCAPE CONFIRM MODAL
// ========================================
// Confirmation modal for escaping combat encounters
// Shows damage preview and MIA warning if ship would be destroyed

import React from 'react';
import { AlertTriangle, Skull, Check, X, Zap } from 'lucide-react';
import './EscapeConfirmModal.css';

/**
 * EscapeConfirmModal - Confirmation dialog for escape action
 *
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onConfirm - Confirm callback (execute escape)
 * @param {Function} onCancel - Cancel callback (close modal)
 * @param {Array} shipSections - Array of ship sections with hull/maxHull/thresholds
 * @param {boolean} couldDestroyShip - Whether max escape damage COULD cause all sections to be damaged (worst-case)
 * @param {boolean} isPOIEncounter - Whether this is a POI encounter (affects messaging)
 * @param {Object} escapeDamageRange - Damage range { min, max } based on AI type
 */
function EscapeConfirmModal({
  show,
  onConfirm,
  onCancel,
  shipSections = [],
  couldDestroyShip = false,
  isPOIEncounter = false,
  escapeDamageRange = { min: 2, max: 2 }
}) {
  if (!show) return null;

  const { min: minDamage, max: maxDamage } = escapeDamageRange;

  /**
   * Get section status color based on current hull vs threshold
   */
  const getSectionStatusColor = (hull, threshold) => {
    if (hull <= 0) return '#ef4444'; // Critical/destroyed - red
    if (hull <= threshold) return '#f59e0b'; // Damaged - amber
    return '#10b981'; // Healthy - green
  };

  /**
   * Render current section status (no predictable damage preview with random distribution)
   */
  const renderSectionPreview = (section, index) => {
    const threshold = section.thresholds?.damaged ?? 4;
    const statusColor = getSectionStatusColor(section.hull, threshold);
    const isDamaged = section.hull <= threshold;

    return (
      <div key={index} className="escape-section-preview">
        <span className="escape-section-name">{section.name || section.type || `Section ${index + 1}`}</span>
        <div className="escape-section-hull">
          <span className="escape-hull-current" style={{ color: statusColor }}>
            {section.hull}/{section.maxHull}
          </span>
        </div>
        {isDamaged && (
          <span className="escape-section-status" style={{ color: statusColor }}>
            DAMAGED
          </span>
        )}
      </div>
    );
  };

  // Format damage display
  const damageDisplay = minDamage === maxDamage
    ? `${minDamage} damage`
    : `${minDamage}-${maxDamage} damage`;

  // Render destroy warning variant (worst-case scenario warning)
  if (couldDestroyShip) {
    return (
      <div className="dw-modal-overlay" onClick={onCancel}>
        <div className="dw-modal-content dw-modal--sm dw-modal--danger" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="dw-modal-header">
            <div className="dw-modal-header-icon dw-modal-header-icon--pulse">
              <Skull size={32} />
            </div>
            <div className="dw-modal-header-info">
              <h2 className="dw-modal-header-title">WARNING: SHIP DESTRUCTION RISK</h2>
              <p className="dw-modal-header-subtitle">Escape could destroy your ship</p>
            </div>
          </div>

          {/* Body */}
          <div className="dw-modal-body">
            <p className="dw-modal-text" style={{ marginBottom: '16px' }}>
              Escape will deal <strong>{damageDisplay}</strong> randomly across your ship sections.
              In the worst case, this could destroy your ship.
            </p>

            {/* Current section status */}
            <div className="escape-sections-grid">
              {shipSections.map((section, index) => renderSectionPreview(section, index))}
            </div>

            {/* Consequences if destroyed */}
            <div className="dw-modal-info-box" style={{ marginTop: '16px' }}>
              <p className="dw-modal-info-title">If ship is destroyed:</p>
              <div className="dw-modal-consequence">
                <span className="dw-modal-consequence-icon"><X size={14} /></span>
                <span>All sections will be critically damaged</span>
              </div>
              <div className="dw-modal-consequence">
                <span className="dw-modal-consequence-icon"><X size={14} /></span>
                <span>Your deck will be marked as MIA</span>
              </div>
              <div className="dw-modal-consequence">
                <span className="dw-modal-consequence-icon"><X size={14} /></span>
                <span>All collected loot will be lost</span>
              </div>
              {isPOIEncounter && (
                <>
                  <div className="dw-modal-consequence">
                    <span className="dw-modal-consequence-icon"><X size={14} /></span>
                    <span>This PoI will be locked down by the AI</span>
                  </div>
                  <div className="dw-modal-consequence">
                    <span className="dw-modal-consequence-icon"><X size={14} /></span>
                    <span>You cannot return to loot this location</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="dw-modal-actions">
            <button className="dw-btn dw-btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button className="dw-btn dw-btn-danger" onClick={onConfirm}>
              <Skull size={16} style={{ marginRight: '6px' }} />
              Risk Escape
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render normal escape confirmation
  return (
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: '#f59e0b' }}>
            <Zap size={32} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">EMERGENCY ESCAPE</h2>
            <p className="dw-modal-header-subtitle">Execute emergency escape maneuvers</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <p className="dw-modal-text" style={{ marginBottom: '16px' }}>
            Escape will deal <strong>{damageDisplay}</strong> randomly across your ship sections.
          </p>

          {/* Current section status */}
          <div className="escape-sections-grid">
            {shipSections.map((section, index) => renderSectionPreview(section, index))}
          </div>

          {/* What you keep */}
          <div className="dw-modal-info-box" style={{
            marginTop: '16px',
            '--modal-theme': 'var(--modal-success)',
            '--modal-theme-bg': 'rgba(34, 197, 94, 0.08)',
            '--modal-theme-border': 'rgba(34, 197, 94, 0.4)'
          }}>
            <div className="escape-info-item">
              <Check size={14} style={{ color: 'var(--modal-success)' }} />
              <span>Your existing inventory will be preserved</span>
            </div>
            <div className="escape-info-item">
              <Check size={14} style={{ color: 'var(--modal-success)' }} />
              <span>Your run will continue</span>
            </div>
          </div>

          {/* What you lose */}
          <div className="dw-modal-info-box" style={{ marginTop: '12px' }}>
            <div className="escape-info-item">
              <X size={14} style={{ color: 'var(--modal-danger)' }} />
              <span>You will receive no loot from this encounter</span>
            </div>
            {isPOIEncounter && (
              <>
                <div className="escape-info-item">
                  <X size={14} style={{ color: 'var(--modal-danger)' }} />
                  <span>This PoI will be locked down by the AI</span>
                </div>
                <div className="escape-info-item">
                  <X size={14} style={{ color: 'var(--modal-danger)' }} />
                  <span>You cannot return to loot this location</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="dw-btn dw-btn-confirm" onClick={onConfirm}>
            <Zap size={16} style={{ marginRight: '6px' }} />
            Confirm Escape
          </button>
        </div>
      </div>
    </div>
  );
}

export default EscapeConfirmModal;
