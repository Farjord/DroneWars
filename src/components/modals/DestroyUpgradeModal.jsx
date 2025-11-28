// ========================================
// DESTROY UPGRADE MODAL COMPONENT
// ========================================
// Allows player to select and destroy an opponent's upgrade
// Groups upgrades by drone type for easy navigation

import React, { useState } from 'react';
import { Zap } from 'lucide-react';

/**
 * DESTROY UPGRADE MODAL COMPONENT
 * Allows player to select and destroy an opponent's upgrade.
 * Groups upgrades by drone type for easy navigation.
 * @param {Object} selectionData - Contains card, targets, and opponent state
 * @param {Function} onConfirm - Callback when upgrade destruction is confirmed
 * @param {Function} onCancel - Callback when action is cancelled
 */
const DestroyUpgradeModal = ({ selectionData, onConfirm, onCancel }) => {
  const { card, targets: upgradedDrones, opponentState } = selectionData;
  const [selectedUpgrade, setSelectedUpgrade] = useState(null);

  return (
    <div className="dw-modal-overlay">
      <div className="dw-modal-content dw-modal--lg dw-modal--danger">
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon dw-modal-header-icon--pulse">
            <Zap size={32} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">System Sabotage</h2>
            <p className="dw-modal-header-subtitle">Target enemy systems</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <p className="dw-modal-text dw-modal-text--left" style={{ marginBottom: '16px' }}>
            Select an enemy upgrade to destroy. The upgrade will be permanently removed.
          </p>

          <div className="dw-modal-scroll" style={{ maxHeight: '300px' }}>
            {upgradedDrones.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upgradedDrones.map(drone => {
                  const upgradesOnThisDrone = opponentState.appliedUpgrades[drone.name] || [];
                  return (
                    <div key={drone.id} className="dw-modal-info-box">
                      <p className="dw-modal-info-title">Enemy: {drone.name}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {upgradesOnThisDrone.map(upgrade => (
                          <div
                            key={upgrade.instanceId}
                            onClick={() => setSelectedUpgrade({ droneName: drone.name, instanceId: upgrade.instanceId })}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '4px',
                              border: selectedUpgrade?.instanceId === upgrade.instanceId
                                ? '2px solid var(--modal-danger)'
                                : '1px solid rgba(75, 85, 99, 0.5)',
                              background: selectedUpgrade?.instanceId === upgrade.instanceId
                                ? 'rgba(239, 68, 68, 0.2)'
                                : 'rgba(17, 24, 39, 0.5)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <p style={{ fontWeight: 600, color: '#fff', margin: 0 }}>{upgrade.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dw-modal-empty">
                <p className="dw-modal-empty-text">The opponent has no active upgrades to destroy.</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button onClick={onCancel} className="dw-btn dw-btn-cancel">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(card, selectedUpgrade)}
            disabled={!selectedUpgrade}
            className="dw-btn dw-btn-danger"
          >
            Destroy Upgrade
          </button>
        </div>
      </div>
    </div>
  );
};

export default DestroyUpgradeModal;