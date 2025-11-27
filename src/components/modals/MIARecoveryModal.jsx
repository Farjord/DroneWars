/**
 * MIARecoveryModal.jsx
 * Modal for recovering or scrapping MIA ship slots
 * Two options: Pay Salvage (costs credits) or Scrap (free but loses cards)
 */

import React, { useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import miaRecoveryService from '../../logic/singlePlayer/MIARecoveryService.js';
import fullCardCollection from '../../data/cardData.js';
import './MIARecoveryModal.css';

// Warning/Alert icon
const IconAlert = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Checkmark icon
const IconCheck = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// X icon
const IconX = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Credits icon
const IconCredits = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 6V18M8 10H16M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * MIARecoveryModal - Recovery options for MIA ships
 *
 * @param {Object} shipSlot - The MIA ship slot data
 * @param {Function} onClose - Close callback
 */
function MIARecoveryModal({ shipSlot, onClose }) {
  const { gameState } = useGameState();
  const [confirmMode, setConfirmMode] = useState(null); // 'recover' | 'scrap' | null

  if (!shipSlot || shipSlot.status !== 'mia') return null;

  const profile = gameState.singlePlayerProfile;
  const salvageCost = miaRecoveryService.getSalvageCost();
  const canAfford = profile.credits >= salvageCost;

  // Get card names for display
  const getCardSummary = () => {
    if (!shipSlot.decklist || shipSlot.decklist.length === 0) {
      return { totalCards: 0, cardTypes: [] };
    }

    const cardTypes = shipSlot.decklist.map(item => {
      const cardData = fullCardCollection.find(c => c.id === item.id);
      return {
        id: item.id,
        name: cardData?.name || item.id,
        quantity: item.quantity
      };
    });

    const totalCards = cardTypes.reduce((sum, c) => sum + c.quantity, 0);

    return { totalCards, cardTypes };
  };

  const { totalCards, cardTypes } = getCardSummary();

  const handleRecover = () => {
    const result = miaRecoveryService.recover(shipSlot.id);

    if (!result.success) {
      console.error('Recovery failed:', result.error);
      return;
    }

    onClose();
  };

  const handleScrap = () => {
    const result = miaRecoveryService.scrap(shipSlot.id);

    if (!result.success) {
      console.error('Scrap failed:', result.error);
      return;
    }

    onClose();
  };

  return (
    <div className="mia-modal-overlay" onClick={onClose}>
      <div className="mia-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="mia-modal-header">
          <div className="mia-header-icon">
            <IconAlert size={36} />
          </div>
          <div className="mia-header-info">
            <h2 className="mia-header-title">Ship MIA</h2>
            <p className="mia-header-subtitle">Slot {shipSlot.id}: {shipSlot.name}</p>
          </div>
        </div>

        {/* Status Info */}
        <div className="mia-status-info">
          <p>This ship failed to return from its last deployment.</p>
          <p>The deck is locked until recovered or scrapped.</p>
        </div>

        {/* Recovery Options */}
        <div className="mia-options-container">
          {/* Option 1: Pay Salvage */}
          <div className={`mia-option-card ${!canAfford ? 'disabled' : ''}`}>
            <div className="mia-option-header">
              <h3 className="mia-option-title">Pay Salvage Fee</h3>
              <div className="mia-option-cost">
                <IconCredits size={18} />
                <span>{salvageCost}</span>
              </div>
            </div>

            <div className="mia-option-details">
              <div className="mia-benefit-item">
                <span className="mia-benefit-icon"><IconCheck size={14} /></span>
                <span>Recover ship and all systems</span>
              </div>
              <div className="mia-benefit-item">
                <span className="mia-benefit-icon"><IconCheck size={14} /></span>
                <span>Fully repair all drones</span>
              </div>
              <div className="mia-benefit-item">
                <span className="mia-benefit-icon"><IconCheck size={14} /></span>
                <span>Keep all cards in deck</span>
              </div>
            </div>

            <div className="mia-option-balance">
              Your credits: <span className={canAfford ? 'sufficient' : 'insufficient'}>{profile.credits}</span>
            </div>

            {confirmMode !== 'recover' ? (
              <button
                className="mia-btn mia-btn-recover"
                onClick={() => setConfirmMode('recover')}
                disabled={!canAfford}
              >
                {canAfford ? 'Pay Salvage' : 'Insufficient Credits'}
              </button>
            ) : (
              <div className="mia-confirm-section">
                <p>Confirm recovery for {salvageCost} credits?</p>
                <div className="mia-confirm-buttons">
                  <button className="mia-btn mia-btn-confirm" onClick={handleRecover}>
                    Confirm
                  </button>
                  <button className="mia-btn mia-btn-cancel-small" onClick={() => setConfirmMode(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option 2: Scrap Ship */}
          <div className={`mia-option-card danger ${shipSlot.isImmutable ? 'disabled' : ''}`}>
            <div className="mia-option-header">
              <h3 className="mia-option-title">Scrap Ship</h3>
              <div className="mia-option-cost free">FREE</div>
            </div>

            <div className="mia-option-details warning">
              <div className="mia-consequence-item">
                <span className="mia-consequence-icon"><IconX size={14} /></span>
                <span>Permanently delete deck</span>
              </div>
              <div className="mia-consequence-item">
                <span className="mia-consequence-icon"><IconX size={14} /></span>
                <span>Lose {totalCards} cards from inventory</span>
              </div>
              <div className="mia-consequence-item">
                <span className="mia-consequence-icon"><IconX size={14} /></span>
                <span>Cannot be undone</span>
              </div>
            </div>

            {totalCards > 0 && (
              <div className="mia-cards-preview">
                <p className="mia-cards-preview-title">Cards to be removed:</p>
                <div className="mia-cards-list">
                  {cardTypes.slice(0, 5).map(card => (
                    <span key={card.id} className="mia-card-item">
                      {card.quantity}x {card.name}
                    </span>
                  ))}
                  {cardTypes.length > 5 && (
                    <span className="mia-card-item more">+{cardTypes.length - 5} more types</span>
                  )}
                </div>
              </div>
            )}

            {confirmMode !== 'scrap' ? (
              <button
                className="mia-btn mia-btn-scrap"
                onClick={() => setConfirmMode('scrap')}
                disabled={shipSlot.isImmutable}
              >
                {shipSlot.isImmutable ? 'Cannot Scrap Starter' : 'Scrap Ship'}
              </button>
            ) : (
              <div className="mia-confirm-section danger">
                <p className="mia-confirm-warning">This will permanently delete the deck!</p>
                <div className="mia-confirm-buttons">
                  <button className="mia-btn mia-btn-confirm-danger" onClick={handleScrap}>
                    Confirm Scrap
                  </button>
                  <button className="mia-btn mia-btn-cancel-small" onClick={() => setConfirmMode(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Immutable Warning */}
        {shipSlot.isImmutable && (
          <div className="mia-immutable-notice">
            <span>Starter deck cannot be scrapped (only recovered)</span>
          </div>
        )}

        {/* Close Button */}
        <div className="mia-modal-actions">
          <button className="mia-btn mia-btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default MIARecoveryModal;
