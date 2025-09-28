// ========================================
// DRONE ABILITY CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms drone ability usage with energy cost and target

import React from 'react';
import { X } from 'lucide-react';

/**
 * DRONE ABILITY CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog for drone ability usage with target and energy cost.
 * @param {Object} abilityConfirmation - Ability confirmation data with ability, drone, and target info
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onCancel - Callback when ability usage is cancelled
 * @param {Function} onConfirm - Callback when ability usage is confirmed
 */
const DroneAbilityConfirmationModal = ({ abilityConfirmation, show, onCancel, onConfirm }) => {
  if (!show || !abilityConfirmation) return null;

  const { ability, drone, target } = abilityConfirmation;
  const targetDisplayName = `Lane ${target.id.slice(-1)}`;

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
          Use {drone.name}'s ability on {targetDisplayName}? This will cost {ability.cost.energy || 0} energy and exhaust the drone.
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

export default DroneAbilityConfirmationModal;