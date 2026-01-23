// ========================================
// MOVE CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms drone movement actions

import React from 'react';
import { Move, ArrowRight } from 'lucide-react';

/**
 * Helper function to extract drone name from drone ID
 * @param {string} droneId - The drone ID (e.g., "player2_Talon_0006")
 * @returns {string} - The drone name (e.g., "Talon")
 */
const extractDroneNameFromId = (droneId) => {
  if (!droneId) return '';
  // ID format: "player2_Talon_0006" → extract "Talon"
  const parts = droneId.split('_');
  // Remove player prefix and sequence number, join remaining parts for multi-word names
  return parts.slice(1, -1).join('_');
};

/**
 * MOVE CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog for drone movement with source and destination.
 * @param {Object} moveConfirmation - Move data with droneId, from, and to lane info
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onCancel - Callback when move is cancelled
 * @param {Function} onConfirm - Callback when move is confirmed
 */
const MoveConfirmationModal = ({ moveConfirmation, show, onCancel, onConfirm }) => {
  if (!show || !moveConfirmation) return null;

  const { droneId, from, to } = moveConfirmation;
  const droneName = extractDroneNameFromId(droneId);

  return (
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Move size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Move Drone</h2>
            <p className="dw-modal-header-subtitle">{droneName}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <div className="dw-modal-info-box">
            <div className="dw-modal-info-item" style={{ justifyContent: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 'bold' }}>{from}</span>
              <ArrowRight size={20} />
              <span style={{ fontWeight: 'bold' }}>{to}</span>
            </div>
          </div>

          <p className="dw-modal-text" style={{ marginTop: '12px', fontSize: '13px', opacity: 0.8 }}>
            The drone will be exhausted after moving.
          </p>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="dw-btn dw-btn-confirm" onClick={onConfirm}>
            Move
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveConfirmationModal;