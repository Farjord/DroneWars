// ========================================
// SHIP ABILITY CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms ship ability usage with energy cost and target

import React from 'react';
import { Ship, Zap } from 'lucide-react';

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
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Ship size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{ability.name}</h2>
            <p className="dw-modal-header-subtitle">{sectionDisplayName}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <p className="dw-modal-text">
            Use this ability{target ? ` on ${targetDisplayName}` : ''}?
          </p>

          <div className="dw-modal-info-box">
            <div className="dw-modal-info-item">
              <span className="dw-modal-info-icon"><Zap size={16} /></span>
              <span>Energy Cost: <strong>{ability.cost.energy}</strong></span>
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

export default ShipAbilityConfirmationModal;