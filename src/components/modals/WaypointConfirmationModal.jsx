// ========================================
// WAYPOINT CONFIRMATION MODAL
// ========================================
// Modal to confirm player movement on tactical map
// Shows path cost and detection impact

import React from 'react';
import MovementController from '../../logic/map/MovementController.js';
import { mapTiers } from '../../data/mapData.js';
import './WaypointConfirmationModal.css';

/**
 * WaypointConfirmationModal - Confirm movement to target hex
 *
 * Displays:
 * - Target hex information
 * - Path distance
 * - Detection cost
 * - New detection value
 * - Warning if move would trigger MIA
 *
 * @param {Object} targetHex - Target hex object
 * @param {Object} currentPosition - Current player position
 * @param {Object} mapData - Map data
 * @param {number} currentDetection - Current detection percentage
 * @param {Function} onConfirm - Callback for confirmed movement
 * @param {Function} onCancel - Callback for cancelled movement
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

  /**
   * Get target hex type label
   * @returns {string} Human-readable label
   */
  const getTargetLabel = () => {
    if (targetHex.type === 'poi') {
      return `📦 Point of Interest`;
    } else if (targetHex.type === 'gate') {
      return `🚪 Extraction Gate`;
    } else {
      return `Empty Hex`;
    }
  };

  /**
   * Get PoI type detail if applicable
   * @returns {string|null} PoI type or null
   */
  const getPoiDetail = () => {
    if (targetHex.type === 'poi' && targetHex.poiData) {
      return targetHex.poiData.name || targetHex.poiType;
    }
    return null;
  };

  /**
   * Get detection color class
   * @returns {string} CSS class
   */
  const getDetectionColorClass = () => {
    if (newDetection < 50) return 'value-safe';
    if (newDetection < 80) return 'value-warning';
    return 'value-critical';
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-container modal-container-md waypoint-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="heading-font text-xl font-bold text-white">Confirm Movement</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        {/* Target info */}
        <div className="waypoint-info">
          <div className="waypoint-target">
            <span className="waypoint-target-icon">{targetHex.type === 'poi' ? '📦' : targetHex.type === 'gate' ? '🚪' : '⬡'}</span>
            <div className="waypoint-target-details">
              <div className="waypoint-target-label">{getTargetLabel()}</div>
              {getPoiDetail() && (
                <div className="waypoint-target-sublabel">{getPoiDetail()}</div>
              )}
            </div>
          </div>

          {/* Movement stats */}
          <div className="waypoint-stats">
            <div className="waypoint-stat">
              <span className="stat-label">Distance</span>
              <span className="stat-value">{distance} hexes</span>
            </div>

            <div className="waypoint-stat">
              <span className="stat-label">Threat Cost</span>
              <span className="stat-value stat-value-cost">+{cost.toFixed(1)}%</span>
            </div>

            <div className="waypoint-stat">
              <span className="stat-label">Current Threat</span>
              <span className="stat-value">{currentDetection.toFixed(1)}%</span>
            </div>

            <div className="waypoint-stat">
              <span className="stat-label">New Threat</span>
              <span className={`stat-value ${getDetectionColorClass()}`}>
                {newDetection.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Warning message if invalid */}
        {!valid && (
          <div className="waypoint-warning">
            <span className="warning-icon">⚠</span>
            <span className="warning-text">{reason}</span>
          </div>
        )}

        {/* Warning for high detection */}
        {valid && newDetection >= 80 && (
          <div className="waypoint-caution">
            <span className="caution-icon">⚠</span>
            <span className="caution-text">
              Critical threat level! Risk of MIA if mission continues.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions">
          <button
            onClick={onCancel}
            className="btn-utility"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(targetHex, path)}
            className="btn-confirm"
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
