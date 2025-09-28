// ========================================
// MANDATORY ACTION MODAL COMPONENT
// ========================================
// Modal that displays when players must perform mandatory actions (discard/destroy)

import React from 'react';
import { X } from 'lucide-react';

/**
 * MANDATORY ACTION MODAL COMPONENT
 * Shows when players must discard cards or destroy drones due to limits.
 * @param {Object} mandatoryAction - Action object with type, count, etc.
 * @param {Object} effectiveStats - Player's effective stats for limits
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onClose - Callback when modal is closed
 */
const MandatoryActionModal = ({ mandatoryAction, effectiveStats, show, onClose }) => {
  if (!show || !mandatoryAction) return null;

  const isDiscard = mandatoryAction.type === 'discard';
  const title = isDiscard ? "Hand Limit Exceeded" : "CPU Limit Exceeded";
  const text = isDiscard
    ? `Your hand limit is now ${effectiveStats.handLimit}. Please select ${mandatoryAction.count} card(s) to discard.`
    : `Your drone limit is now ${effectiveStats.cpuLimit}. Please select ${mandatoryAction.count} drone(s) to destroy.`;

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-container-md">
        {onClose && (
          <button onClick={onClose} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">{title}</h2>
        <p className="modal-text">{text}</p>
      </div>
    </div>
  );
};

export default MandatoryActionModal;