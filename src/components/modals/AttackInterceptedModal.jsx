// ========================================
// ATTACK INTERCEPTED MODAL COMPONENT
// ========================================
// Modal that displays when an attack has been intercepted

import React from 'react';
import { X } from 'lucide-react';

/**
 * ATTACK INTERCEPTED MODAL COMPONENT
 * Shows when an opponent used an interceptor to protect their target.
 * @param {Object} interceptionModal - Contains interceptor and original target info
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onClose - Callback when modal is closed
 */
const AttackInterceptedModal = ({ interceptionModal, show, onClose }) => {
  if (!show || !interceptionModal) return null;

  const { interceptor, originalTarget } = interceptionModal;

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-container-md">
        {onClose && (
          <button onClick={onClose} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">Attack Intercepted!</h2>
        <p className="modal-text">
          Your opponent used their {interceptor.name} to protect {originalTarget.name}!
        </p>
        <div className="flex justify-center mt-6">
          <button onClick={onClose} className="btn-continue">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttackInterceptedModal;