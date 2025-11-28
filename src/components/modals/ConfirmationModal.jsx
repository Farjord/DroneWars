// ========================================
// CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that displays confirmation dialogs for destructive actions

import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog with Cancel/Confirm buttons for destructive actions.
 * @param {Object} confirmationModal - Modal data with type, text, onConfirm, onCancel
 * @param {boolean} show - Whether to show the modal
 */
const ConfirmationModal = ({ confirmationModal, show }) => {
  if (!show || !confirmationModal) return null;

  const title = confirmationModal.type === 'discard' ? 'Confirm Discard' : 'Confirm Destruction';
  const subtitle = confirmationModal.type === 'discard' ? 'This action cannot be undone' : 'Permanent action';

  return (
    <div className="dw-modal-overlay">
      <div className="dw-modal-content dw-modal--sm dw-modal--danger">
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon dw-modal-header-icon--pulse">
            <AlertTriangle size={32} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{title}</h2>
            <p className="dw-modal-header-subtitle">{subtitle}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <p className="dw-modal-text">{confirmationModal.text}</p>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button
            onClick={confirmationModal.onCancel}
            className="dw-btn dw-btn-cancel"
          >
            Cancel
          </button>
          <button
            onClick={confirmationModal.onConfirm}
            className="dw-btn dw-btn-danger"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;