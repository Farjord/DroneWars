// ========================================
// AI HAND DEBUG MODAL COMPONENT
// ========================================
// Modal that displays the opponent's hand for debug purposes

import React from 'react';
import { Bug } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';

/**
 * AI HAND DEBUG MODAL COMPONENT
 * Shows the opponent's hand cards for debug purposes only.
 * @param {Object} opponentPlayerState - Opponent player state with hand data
 * @param {boolean} show - Whether to show the modal
 * @param {boolean} debugMode - Whether debug mode is enabled
 * @param {Function} onClose - Callback when modal is closed
 */
const AIHandDebugModal = ({ opponentPlayerState, show, debugMode, onClose }) => {
  if (!show || !debugMode || !opponentPlayerState) return null;

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--xxl dw-modal--action"
        style={{ maxWidth: '1200px', width: '95vw' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Bug size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Opponent's Hand (Debug)</h2>
            <p className="dw-modal-header-subtitle">{opponentPlayerState.hand.length} card{opponentPlayerState.hand.length !== 1 ? 's' : ''} in hand</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <div className="dw-modal-info-box" style={{ marginBottom: '16px' }}>
            <p className="dw-modal-text" style={{ margin: 0, textAlign: 'center' }}>
              This view is for <strong>debug purposes only</strong>.
            </p>
          </div>

          {opponentPlayerState.hand.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '16px', justifyContent: 'center', overflowX: 'auto', padding: '8px' }}>
              {opponentPlayerState.hand.map(card => (
                <ActionCard
                  key={card.instanceId}
                  card={card}
                  isPlayable={false}
                />
              ))}
            </div>
          ) : (
            <div className="dw-modal-info-box" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--modal-text-secondary)', fontStyle: 'italic', margin: 0 }}>The opponent's hand is empty.</p>
            </div>
          )}
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

export default AIHandDebugModal;