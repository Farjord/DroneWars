// ========================================
// DEPLOYMENT CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms deployment actions with energy and budget costs

import React from 'react';
import { Rocket, Power, Plus } from 'lucide-react';

/**
 * DEPLOYMENT CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog for drone deployment with cost breakdown.
 * @param {Object} deploymentConfirmation - Deployment data with costs and lane info
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onCancel - Callback when deployment is cancelled
 * @param {Function} onConfirm - Callback when deployment is confirmed
 */
const DeploymentConfirmationModal = ({ deploymentConfirmation, show, onCancel, onConfirm }) => {
  if (!show || !deploymentConfirmation) return null;

  const { budgetCost, energyCost } = deploymentConfirmation;

  return (
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Rocket size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Deploy Drone</h2>
            <p className="dw-modal-header-subtitle">Confirm deployment costs</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <div className="dw-modal-grid dw-modal-grid--2col">
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-icon"><Plus size={28} style={{ color: 'white' }} /></div>
              <div className="dw-modal-stat-value">{budgetCost}</div>
              <div className="dw-modal-stat-label">Deployment Cost</div>
            </div>
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-icon"><Power size={28} style={{ color: 'white' }} /></div>
              <div className="dw-modal-stat-value">{energyCost}</div>
              <div className="dw-modal-stat-label">Energy Cost</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="dw-btn dw-btn-confirm" onClick={onConfirm}>
            Deploy
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeploymentConfirmationModal;