// ========================================
// MANDATORY ACTION MODAL COMPONENT
// ========================================
// Modal that displays when players must perform mandatory actions (discard/destroy)

import React from 'react';
import { AlertTriangle, Hand, Cpu } from 'lucide-react';

/**
 * MANDATORY ACTION MODAL COMPONENT
 * Shows when players must discard cards or destroy drones due to limits.
 * @param {Object} mandatoryAction - Action object with type, count, etc.
 * @param {Object} effectiveStats - Player's effective stats for limits
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onClose - Callback when modal is closed
 */
const MandatoryActionModal = ({ mandatoryAction, effectiveStats, show, onClose }) => {
  if (!show || !mandatoryAction) return null;

  const isDiscard = mandatoryAction.type === 'discard';
  const title = isDiscard ? "Hand Limit Exceeded" : "CPU Limit Exceeded";
  const limit = isDiscard ? effectiveStats.handLimit : effectiveStats.cpuLimit;
  const Icon = isDiscard ? Hand : Cpu;

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--sm dw-modal--danger" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon dw-modal-header-icon--pulse">
            <AlertTriangle size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{title}</h2>
            <p className="dw-modal-header-subtitle">Action Required</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <div className="dw-modal-info-box">
            <div className="dw-modal-info-item">
              <span className="dw-modal-info-icon"><Icon size={16} /></span>
              <span>Current Limit: <strong>{limit}</strong></span>
            </div>
            <div className="dw-modal-info-item">
              <span className="dw-modal-info-icon"><AlertTriangle size={16} /></span>
              <span>Must {isDiscard ? 'discard' : 'destroy'}: <strong>{mandatoryAction.count}</strong></span>
            </div>
          </div>

          <p className="dw-modal-text" style={{ marginTop: '12px' }}>
            {isDiscard
              ? 'Select cards from your hand to discard.'
              : 'Select drones on the battlefield to destroy.'}
          </p>
        </div>

        {/* Actions - only show close if handler provided */}
        {onClose && (
          <div className="dw-modal-actions">
            <button className="dw-btn dw-btn-cancel" onClick={onClose}>
              Got It
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MandatoryActionModal;