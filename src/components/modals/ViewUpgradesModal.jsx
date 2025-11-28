// ========================================
// VIEW UPGRADES MODAL COMPONENT
// ========================================
// Displays all upgrades currently applied to a specific drone type
// Shows upgrade details in a scrollable list format

import React from 'react';
import { Wrench } from 'lucide-react';

/**
 * VIEW UPGRADES MODAL COMPONENT
 * Displays all upgrades currently applied to a specific drone type.
 * Shows upgrade details in a scrollable list format.
 * @param {Object} modalData - Contains drone name and upgrades array
 * @param {Function} onClose - Callback when modal is closed
 */
const ViewUpgradesModal = ({ modalData, onClose }) => {
  const { droneName, upgrades } = modalData;

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Wrench size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Applied Upgrades</h2>
            <p className="dw-modal-header-subtitle">{droneName}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <p className="dw-modal-text" style={{ marginBottom: '16px' }}>
            Permanent upgrades applied to this drone type:
          </p>

          <div className="dw-modal-scroll" style={{ maxHeight: '300px' }}>
            {upgrades.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upgrades.map(upgrade => (
                  <div key={upgrade.instanceId} className="dw-modal-info-box" style={{ margin: 0 }}>
                    <h4 style={{ fontWeight: 'bold', color: 'var(--modal-theme)', marginBottom: '4px' }}>{upgrade.name}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--modal-text-secondary)' }}>{upgrade.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dw-modal-info-box" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--modal-text-secondary)', fontStyle: 'italic' }}>No upgrades applied.</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewUpgradesModal;