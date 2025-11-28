// ========================================
// AI CARD PLAY REPORT MODAL
// ========================================
// Modal that displays information about cards played by the AI opponent
// Shows the card that was played and any target information

import React from 'react';
import { Bot } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';

/**
 * AI CARD PLAY REPORT MODAL
 * Shows details of cards played by AI opponent with target information.
 * @param {Object} report - Card play report with card, target, and lane info
 * @param {Function} onClose - Callback when modal is closed
 */
const AICardPlayReportModal = ({ report, onClose }) => {
  if (!report) return null;

  const { card, targetName, targetLane } = report;

  // Build target description
  const targetDescription = targetName
    ? `${targetName}${targetLane ? ` in ${targetLane}` : ''}`
    : null;

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--lg dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Bot size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">AI Action: Card Played</h2>
            <p className="dw-modal-header-subtitle">{card.name}{targetDescription && ` → ${targetDescription}`}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Card Display */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <ActionCard card={card} isPlayable={false} scale={0.85} />
          </div>

          {targetDescription && (
            <div className="dw-modal-info-box">
              <p className="dw-modal-text" style={{ textAlign: 'center', margin: 0 }}>
                Target: <strong style={{ color: 'var(--modal-theme)' }}>{targetDescription}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-confirm" onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default AICardPlayReportModal;