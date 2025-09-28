// ========================================
// DEPLOYMENT CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms deployment actions with energy and budget costs

import React from 'react';
import { X } from 'lucide-react';

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
    <div className="modal-overlay">
      <div className="modal-container modal-container-md">
        {onCancel && (
          <button onClick={onCancel} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">Confirm Deployment</h2>
        <p className="modal-text">
          This deployment will use {budgetCost} Initial Deployment points and cost {energyCost} Energy. Proceed?
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

export default DeploymentConfirmationModal;