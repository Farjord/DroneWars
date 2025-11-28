// ========================================
// CARD CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms action card usage with energy cost and target

import React from 'react';
import { Zap } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';

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
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Zap size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Confirm Action</h2>
            <p className="dw-modal-header-subtitle">{targetDisplayName ? `Target: ${targetDisplayName}` : 'No target required'}</p>
          </div>
        </div>

        {/* Body - Card Display */}
        <div className="dw-modal-body">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ActionCard
              card={card}
              onClick={() => {}}
              isPlayable={true}
              isSelected={false}
              scale={0.9}
            />
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

export default CardConfirmationModal;