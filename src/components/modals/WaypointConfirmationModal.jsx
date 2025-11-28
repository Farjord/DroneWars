// ========================================
// WAYPOINT CONFIRMATION MODAL
// ========================================
// Modal to confirm player movement on tactical map
// Shows path cost and detection impact

import React from 'react';
import { Navigation } from 'lucide-react';
import MovementController from '../../logic/map/MovementController.js';
import { mapTiers } from '../../data/mapData.js';

/**
 * WaypointConfirmationModal - Confirm movement to target hex
 */
function WaypointConfirmationModal({
  targetHex,
  currentPosition,
  mapData,
  currentDetection,
  onConfirm,
  onCancel
}) {
  const tierConfig = mapTiers[mapData.tier - 1];

  // Get movement preview data
  const preview = MovementController.getMovementPreview(
    currentPosition,
    targetHex,
    mapData.hexes,
    tierConfig
  );

  const { valid, path, cost, newDetection, distance, reason } = preview;

  const getTargetLabel = () => {
    if (targetHex.type === 'poi') return 'Point of Interest';
    if (targetHex.type === 'gate') return 'Extraction Gate';
    return 'Empty Hex';
  };

  const getPoiDetail = () => {
    if (targetHex.type === 'poi' && targetHex.poiData) {
      return targetHex.poiData.name || targetHex.poiType;
    }
    return null;
  };

  const getDetectionColor = () => {
    if (newDetection < 50) return 'var(--modal-success)';
    if (newDetection < 80) return '#eab308';
    return 'var(--modal-danger)';
  };

  return (
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Navigation size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Confirm Movement</h2>
            <p className="dw-modal-header-subtitle">{getTargetLabel()}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Target detail */}
          {getPoiDetail() && (
            <p className="dw-modal-text" style={{ marginBottom: '12px' }}>
              {getPoiDetail()}
            </p>
          )}

          {/* Movement stats */}
          <div className="dw-modal-grid dw-modal-grid--2">
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-label">Distance</div>
              <div className="dw-modal-stat-value">{distance} hex</div>
            </div>
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-label">Threat Cost</div>
              <div className="dw-modal-stat-value" style={{ color: 'var(--modal-danger)' }}>+{cost.toFixed(1)}%</div>
            </div>
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-label">Current</div>
              <div className="dw-modal-stat-value">{currentDetection.toFixed(1)}%</div>
            </div>
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-label">New Threat</div>
              <div className="dw-modal-stat-value" style={{ color: getDetectionColor() }}>
                {newDetection.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Warning message if invalid */}
          {!valid && (
            <div className="dw-modal-info-box" style={{ marginTop: '16px', '--modal-theme': 'var(--modal-danger)', '--modal-theme-bg': 'var(--modal-danger-bg)', '--modal-theme-border': 'var(--modal-danger-border)' }}>
              <p className="dw-modal-info-title">Cannot Move</p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--modal-text-primary)' }}>{reason}</p>
            </div>
          )}

          {/* Warning for high detection */}
          {valid && newDetection >= 80 && (
            <div className="dw-modal-info-box" style={{ marginTop: '16px', '--modal-theme': '#eab308', '--modal-theme-bg': 'rgba(234, 179, 8, 0.08)', '--modal-theme-border': 'rgba(234, 179, 8, 0.4)' }}>
              <p className="dw-modal-info-title" style={{ color: '#eab308' }}>Critical Threat</p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--modal-text-primary)' }}>
                Risk of MIA if mission continues.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button onClick={onCancel} className="dw-btn dw-btn-cancel">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(targetHex, path)}
            className="dw-btn dw-btn-confirm"
            disabled={!valid}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

export default WaypointConfirmationModal;
