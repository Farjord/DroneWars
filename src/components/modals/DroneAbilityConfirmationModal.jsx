// ========================================
// DRONE ABILITY CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms drone ability usage with energy cost and target

import React from 'react';
import { Crosshair, Zap } from 'lucide-react';

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
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Crosshair size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{ability.name}</h2>
            <p className="dw-modal-header-subtitle">{drone.name}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <p className="dw-modal-text">
            Use this ability on {targetDisplayName}?
          </p>

          <div className="dw-modal-info-box">
            <div className="dw-modal-info-item">
              <span className="dw-modal-info-icon"><Zap size={16} /></span>
              <span>Energy Cost: <strong>{ability.cost.energy || 0}</strong></span>
            </div>
            <div className="dw-modal-info-item">
              <span className="dw-modal-info-icon"><Crosshair size={16} /></span>
              <span>Drone will be <strong>exhausted</strong></span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="dw-btn dw-btn-confirm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default DroneAbilityConfirmationModal;