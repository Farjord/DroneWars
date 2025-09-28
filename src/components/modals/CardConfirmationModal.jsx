// ========================================
// CARD CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms action card usage with energy cost and target

import React from 'react';
import { X } from 'lucide-react';

/**
 * CARD CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog for action card usage with target and energy cost.
 * @param {Object} cardConfirmation - Card confirmation data with card and target info
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onCancel - Callback when card usage is cancelled
 * @param {Function} onConfirm - Callback when card usage is confirmed
 */
const CardConfirmationModal = ({ cardConfirmation, show, onCancel, onConfirm }) => {
  if (!show || !cardConfirmation) return null;

  const { card, target } = cardConfirmation;

  // Format target display name
  let targetDisplayName = '';
  if (target) {
    // Drones have a .name property
    if (target.name) {
      targetDisplayName = target.name;
    // Lanes have an id like 'lane1', 'lane2', etc.
    } else if (target.id && target.id.startsWith('lane')) {
      targetDisplayName = `Lane ${target.id.slice(-1)}`;
    // Ship sections have an id like 'droneControlHub'
    } else if (target.id) {
      targetDisplayName = target.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-container-md">
        {onCancel && (
          <button onClick={onCancel} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">Confirm Action: {card.name}</h2>
        <p className="modal-text">
          Use {card.name}{targetDisplayName ? ` on ${targetDisplayName}` : ''}? This will cost {card.cost} energy.
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

export default CardConfirmationModal;