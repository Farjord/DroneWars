import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * StarterDeckWarningModal
 * Warns player when deploying with starter deck while custom decks are available
 *
 * @param {Function} onCancel - Close modal without action
 * @param {Function} onDeployAnyway - Proceed with starter deck deployment
 * @param {Function} onSwitchDeck - Allow player to change ship selection (optional)
 * @param {number} customDeckCount - Number of available custom decks
 */
function StarterDeckWarningModal({ onCancel, onDeployAnyway, onSwitchDeck, customDeckCount }) {
  return (
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div
        className="dw-modal-content dw-modal--md dw-modal--action"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon dw-modal-header-icon--pulse" style={{ color: '#f59e0b' }}>
            <AlertTriangle size={32} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Deploying with Starter Deck</h2>
            <p className="dw-modal-header-subtitle">
              {customDeckCount === 0
                ? 'Build a custom deck to unlock full potential!'
                : customDeckCount === 1
                  ? 'You have 1 custom deck available'
                  : `You have ${customDeckCount} custom decks available`}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Limitations Warning */}
          <div className="dw-modal-info-box" style={{
            '--modal-theme': '#f59e0b',
            '--modal-theme-bg': 'rgba(245, 158, 11, 0.08)',
            '--modal-theme-border': 'rgba(245, 158, 11, 0.4)'
          }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--modal-text-primary)' }}>
              <strong>Starter Deck Limitations:</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--modal-text-primary)' }}>
              <li>Zero reputation earned per run</li>
              <li>3-item extraction limit (vs 6+ for custom decks)</li>
              <li>Limited card pool and no customization</li>
            </ul>
          </div>

          {/* Custom Deck Benefits */}
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--modal-text-secondary)' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              Custom decks offer several advantages:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Earn reputation for progression</li>
              <li>Access to advanced cards and abilities</li>
              <li>Customized strategies and loadouts</li>
              <li>Higher potential rewards</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button
            onClick={onCancel}
            className="dw-btn dw-btn-cancel"
          >
            Cancel
          </button>
          {customDeckCount > 0 && onSwitchDeck && (
            <button
              onClick={onSwitchDeck}
              className="dw-btn dw-btn-secondary"
            >
              Switch Deck
            </button>
          )}
          <button
            onClick={onDeployAnyway}
            className="dw-btn dw-btn-confirm"
          >
            Deploy Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export default StarterDeckWarningModal;
