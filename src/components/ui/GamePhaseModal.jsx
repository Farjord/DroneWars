// ========================================
// GAME PHASE MODAL COMPONENT
// ========================================
// Generic modal wrapper for game phase transitions, notifications, and error messages
// Provides consistent styling and behavior across all game modals

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

/**
 * GAME PHASE MODAL COMPONENT
 * Standardized modal for game phases, confirmations, and notifications.
 * @param {string} title - Modal title text
 * @param {string} text - Modal body text
 * @param {Function} onClose - Callback when modal is closed (null to hide close button)
 * @param {React.ReactNode} children - Additional modal content
 * @param {string} maxWidthClass - (deprecated) Tailwind max-width class for modal sizing
 */
const GamePhaseModal = ({ title, text, onClose, children, maxWidthClass }) => (
  <div className="dw-modal-overlay" onClick={onClose || undefined}>
    <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div className="dw-modal-header">
        <div className="dw-modal-header-icon">
          <AlertCircle size={28} />
        </div>
        <div className="dw-modal-header-info">
          <h2 className="dw-modal-header-title">{title}</h2>
          {text && <p className="dw-modal-header-subtitle">{text}</p>}
        </div>
      </div>

      {/* Body - only render if there are children */}
      {children && (
        <div className="dw-modal-body">
          {children}
        </div>
      )}

      {/* Actions - only show close button if onClose is provided */}
      {onClose && (
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-confirm" onClick={onClose}>
            OK
          </button>
        </div>
      )}
    </div>
  </div>
);

export default GamePhaseModal;