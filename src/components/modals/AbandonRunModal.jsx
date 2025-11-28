/**
 * AbandonRunModal.jsx
 * Confirmation dialog when player wants to abandon their run
 * Shows consequences (MIA, loot loss) before confirming
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * AbandonRunModal - Confirmation dialog for abandoning a run
 *
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onCancel - Cancel callback (close modal)
 * @param {Function} onConfirm - Confirm callback (trigger MIA)
 * @param {number} lootCount - Number of loot items that will be lost
 * @param {number} creditsEarned - Credits that will be lost
 */
function AbandonRunModal({ show, onCancel, onConfirm, lootCount = 0, creditsEarned = 0 }) {
  if (!show) return null;

  return (
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--sm dw-modal--danger" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon dw-modal-header-icon--pulse">
            <AlertTriangle size={32} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Abandon Run?</h2>
            <p className="dw-modal-header-subtitle">This action cannot be undone</p>
          </div>
        </div>

        {/* Warning Content */}
        <div className="dw-modal-body">
          <p className="dw-modal-text">
            Your ship will be marked as MIA and all progress from this run will be lost.
          </p>

          <div className="dw-modal-info-box">
            <p className="dw-modal-info-title">You will lose:</p>

            <div className="dw-modal-consequence">
              <span className="dw-modal-consequence-icon"><X size={14} /></span>
              <span>All collected loot ({lootCount} items)</span>
            </div>

            <div className="dw-modal-consequence">
              <span className="dw-modal-consequence-icon"><X size={14} /></span>
              <span>All credits earned ({creditsEarned})</span>
            </div>

            <div className="dw-modal-consequence">
              <span className="dw-modal-consequence-icon"><X size={14} /></span>
              <span>Your deck will be marked as MIA</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="dw-btn dw-btn-danger" onClick={onConfirm}>
            Abandon
          </button>
        </div>
      </div>
    </div>
  );
}

export default AbandonRunModal;
