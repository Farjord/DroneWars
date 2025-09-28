// ========================================
// SHIP ABILITY CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms ship ability usage with energy cost and target

import React from 'react';
import { X } from 'lucide-react';

/**
 * SHIP ABILITY CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog for ship ability usage with target and energy cost.
 * @param {Object} shipAbilityConfirmation - Ability confirmation data with ability, sectionName, and target info
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onCancel - Callback when ability usage is cancelled
 * @param {Function} onConfirm - Callback when ability usage is confirmed
 */
const ShipAbilityConfirmationModal = ({ shipAbilityConfirmation, show, onCancel, onConfirm }) => {
  if (!show || !shipAbilityConfirmation) return null;

  const { ability, sectionName, target } = shipAbilityConfirmation;
  const sectionDisplayName = sectionName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  let targetDisplayName = '';
  if (target) {
    targetDisplayName = target.name;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-container-md">
        {onCancel && (
          <button onClick={onCancel} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">Confirm Ability: {ability.name}</h2>
        <p className="modal-text">
          Use {sectionDisplayName}'s ability{target ? ` on ${targetDisplayName}` : ''}? This will cost {ability.cost.energy} energy.
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

export default ShipAbilityConfirmationModal;