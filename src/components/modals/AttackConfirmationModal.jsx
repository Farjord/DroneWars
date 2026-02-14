// ========================================
// ATTACK CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that warns about Suppressed status before attacking
// Confirms that the attack will be cancelled but the suppression consumed

import React from 'react';
import { Swords } from 'lucide-react';

/**
 * ATTACK CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog when a suppressed drone attempts to attack.
 * Warns that the attack will be cancelled but the Suppressed status consumed.
 * @param {Object} attackConfirmation - Attack details with attacker info
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onCancel - Callback when attack is cancelled
 * @param {Function} onConfirm - Callback when user confirms removing suppression
 */
const AttackConfirmationModal = ({ attackConfirmation, show, onCancel, onConfirm }) => {
  if (!show || !attackConfirmation) return null;

  const attackerName = attackConfirmation.attacker?.name || 'Drone';

  return (
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Swords size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Drone Suppressed</h2>
            <p className="dw-modal-header-subtitle">{attackerName}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <p className="dw-modal-text" style={{ marginTop: '12px', fontSize: '13px', color: '#a78bfa' }}>
            <strong>{attackerName}</strong> is Suppressed — this will remove the Suppressed effect and exhaust the drone, but it will <strong>NOT</strong> attack.
          </p>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="dw-btn dw-btn-confirm" onClick={onConfirm}>
            Remove Suppression
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttackConfirmationModal;
