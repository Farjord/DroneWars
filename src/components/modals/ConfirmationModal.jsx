// ========================================
// CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that displays confirmation dialogs for destructive actions

import React from 'react';
import { X } from 'lucide-react';

/**
 * CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog with Cancel/Confirm buttons for destructive actions.
 * @param {Object} confirmationModal - Modal data with type, text, onConfirm, onCancel
 * @param {boolean} show - Whether to show the modal
 */
const ConfirmationModal = ({ confirmationModal, show }) => {
  if (!show || !confirmationModal) return null;

  const title = `Confirm ${confirmationModal.type === 'discard' ? 'Discard' : 'Destruction'}`;

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-container-md">
        {confirmationModal.onCancel && (
          <button onClick={confirmationModal.onCancel} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">{title}</h2>
        <p className="modal-text">{confirmationModal.text}</p>
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={confirmationModal.onCancel}
            className="bg-gray-600 text-white font-bold py-2 px-6 rounded-full hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmationModal.onConfirm}
            className="bg-red-600 text-white font-bold py-2 px-6 rounded-full hover:bg-red-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;