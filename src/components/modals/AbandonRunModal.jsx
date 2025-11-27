/**
 * AbandonRunModal.jsx
 * Confirmation dialog when player wants to abandon their run
 * Shows consequences (MIA, loot loss) before confirming
 */

import React from 'react';
import './AbandonRunModal.css';

// Warning triangle icon
const IconWarning = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.3 1.52 18.63 1.47 18.98C1.43 19.33 1.46 19.68 1.56 20.02C1.67 20.35 1.84 20.66 2.08 20.91C2.32 21.16 2.61 21.35 2.93 21.47C3.26 21.59 3.61 21.64 3.96 21.61C4.31 21.58 4.65 21.47 4.95 21.3L12 17L19.05 21.3C19.35 21.47 19.69 21.58 20.04 21.61C20.39 21.64 20.74 21.59 21.07 21.47C21.39 21.35 21.68 21.16 21.92 20.91C22.16 20.66 22.33 20.35 22.44 20.02C22.54 19.68 22.57 19.33 22.53 18.98C22.48 18.63 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.28 3.31 12.99 3.12C12.69 2.94 12.36 2.84 12.01 2.84C11.66 2.84 11.32 2.94 11.03 3.12C10.74 3.31 10.49 3.56 10.31 3.86L10.29 3.86Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// X icon for consequence items
const IconX = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M18 6L6 18M6 6L18 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
    <div className="abandon-modal-overlay" onClick={onCancel}>
      <div className="abandon-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="abandon-modal-header">
          <div className="abandon-header-icon">
            <IconWarning size={36} />
          </div>
          <div className="abandon-header-info">
            <h2 className="abandon-header-title">Abandon Run?</h2>
            <p className="abandon-header-subtitle">This action cannot be undone</p>
          </div>
        </div>

        {/* Warning Content */}
        <div className="abandon-warning-content">
          <p className="abandon-warning-text">
            Your ship will be marked as MIA and all progress from this run will be lost.
          </p>

          <div className="abandon-consequences">
            <p className="abandon-consequences-title">You will lose:</p>

            <div className="abandon-consequence-item">
              <span className="abandon-consequence-icon"><IconX size={14} /></span>
              <span>All collected loot ({lootCount} items)</span>
            </div>

            <div className="abandon-consequence-item">
              <span className="abandon-consequence-icon"><IconX size={14} /></span>
              <span>All credits earned ({creditsEarned})</span>
            </div>

            <div className="abandon-consequence-item">
              <span className="abandon-consequence-icon"><IconX size={14} /></span>
              <span>Your deck will be marked as MIA</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="abandon-modal-actions">
          <button className="abandon-btn abandon-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="abandon-btn abandon-btn-confirm" onClick={onConfirm}>
            Abandon
          </button>
        </div>
      </div>
    </div>
  );
}

export default AbandonRunModal;
