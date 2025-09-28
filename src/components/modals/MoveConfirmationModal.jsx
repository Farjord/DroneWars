// ========================================
// MOVE CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms drone movement actions

import React from 'react';
import { X } from 'lucide-react';

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
    <div className="modal-overlay">
      <div className="modal-container modal-container-md">
        {onCancel && (
          <button onClick={onCancel} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">Confirm Move</h2>
        <p className="modal-text">
          Move {drone.name} from {from} to {to}? The drone will be exhausted.
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <button onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-confirm">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveConfirmationModal;