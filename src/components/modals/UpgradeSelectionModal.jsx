// ========================================
// UPGRADE SELECTION MODAL COMPONENT
// ========================================
// Displays modal for selecting which drone type to apply an upgrade to
// Shows available targets with visual selection feedback

import React, { useState } from 'react';
import { Wrench } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';

/**
 * UPGRADE SELECTION MODAL COMPONENT
 * Displays modal for selecting which drone type to apply an upgrade to.
 * Shows available targets with visual selection feedback.
 * @param {Object} selectionData - Contains card and target data
 * @param {Function} onConfirm - Callback when upgrade target is confirmed
 * @param {Function} onCancel - Callback when selection is cancelled
 */
const UpgradeSelectionModal = ({ selectionData, onConfirm, onCancel }) => {
  const { card, targets } = selectionData;
  const [selectedTarget, setSelectedTarget] = useState(null);

  return (
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--lg dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Wrench size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Apply Upgrade</h2>
            <p className="dw-modal-header-subtitle">{card.name}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Card Preview */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <ActionCard card={card} isPlayable={false} scale={0.85} />
          </div>

          <p className="dw-modal-text" style={{ textAlign: 'center', marginBottom: '16px' }}>
            Select a drone type to apply this upgrade:
          </p>

          {/* Target Selection */}
          <div className="dw-modal-scroll" style={{ maxHeight: '200px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {targets.map(drone => (
                <div
                  key={drone.id}
                  onClick={() => setSelectedTarget(drone)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `2px solid ${selectedTarget?.id === drone.id ? 'var(--modal-theme)' : 'var(--modal-border)'}`,
                    background: selectedTarget?.id === drone.id ? 'var(--modal-theme-bg)' : 'var(--modal-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <img src={drone.image} alt={drone.name} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                  <span style={{ fontWeight: '600', color: 'var(--modal-text-primary)' }}>{drone.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="dw-btn dw-btn-confirm"
            onClick={() => onConfirm(card, selectedTarget)}
            disabled={!selectedTarget}
            style={{ opacity: selectedTarget ? 1 : 0.5, cursor: selectedTarget ? 'pointer' : 'not-allowed' }}
          >
            Confirm Upgrade
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeSelectionModal;