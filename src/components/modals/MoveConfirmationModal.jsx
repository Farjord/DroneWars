// ========================================
// MOVE CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms drone movement actions

import React from 'react';
import { Move, ArrowRight } from 'lucide-react';

/**
 * MOVE CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog for drone movement with source and destination.
 * @param {Object} moveConfirmation - Move data with drone, from, and to lane info
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onCancel - Callback when move is cancelled
 * @param {Function} onConfirm - Callback when move is confirmed
 */
const MoveConfirmationModal = ({ moveConfirmation, show, onCancel, onConfirm }) => {
  if (!show || !moveConfirmation) return null;

  const { drone, from, to } = moveConfirmation;

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
            <p className="dw-modal-header-subtitle">{drone.name}</p>
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