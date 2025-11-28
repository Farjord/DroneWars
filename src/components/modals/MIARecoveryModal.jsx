/**
 * MIARecoveryModal.jsx
 * Modal for recovering or scrapping MIA ship slots
 * Two options: Pay Salvage (costs credits) or Scrap (free but loses cards)
 */

import React, { useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import miaRecoveryService from '../../logic/singlePlayer/MIARecoveryService.js';
import fullCardCollection from '../../data/cardData.js';
import { AlertCircle, Check, X, Coins } from 'lucide-react';

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

  const profile = gameState.singlePlayerProfile || { credits: 500 };
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
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--md dw-modal--danger" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon dw-modal-header-icon--pulse">
            <AlertCircle size={32} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Ship MIA</h2>
            <p className="dw-modal-header-subtitle">Slot {shipSlot.id}: {shipSlot.name}</p>
          </div>
        </div>

        {/* Status Info */}
        <div className="dw-modal-body dw-modal-body--compact">
          <div className="dw-modal-info-box">
            <p style={{ fontSize: '13px', color: 'var(--modal-text-primary)', margin: '0 0 6px 0', lineHeight: 1.5 }}>
              This ship failed to return from its last deployment.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--modal-text-primary)', margin: 0, lineHeight: 1.5 }}>
              The deck is locked until recovered or scrapped.
            </p>
          </div>

          {/* Recovery Options */}
          <div className="dw-modal-options">
            {/* Option 1: Pay Salvage */}
            <div className={`dw-modal-option dw-modal-option--success ${!canAfford ? 'dw-modal-option--disabled' : ''}`}>
              <div className="dw-modal-option-header">
                <h3 className="dw-modal-option-title">Pay Salvage Fee</h3>
                <div className="dw-modal-option-cost">
                  <Coins size={18} />
                  <span>{salvageCost}</span>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="dw-modal-benefit">
                  <span className="dw-modal-benefit-icon"><Check size={14} /></span>
                  <span>Recover ship and all systems</span>
                </div>
                <div className="dw-modal-benefit">
                  <span className="dw-modal-benefit-icon"><Check size={14} /></span>
                  <span>Fully repair all drones</span>
                </div>
                <div className="dw-modal-benefit">
                  <span className="dw-modal-benefit-icon"><Check size={14} /></span>
                  <span>Keep all cards in deck</span>
                </div>
              </div>

              <div className="dw-modal-balance">
                Your credits: <span className={canAfford ? 'dw-modal-balance--sufficient' : 'dw-modal-balance--insufficient'}>{profile.credits}</span>
              </div>

              {confirmMode !== 'recover' ? (
                <button
                  className="dw-btn dw-btn-success dw-btn--full"
                  onClick={() => setConfirmMode('recover')}
                  disabled={!canAfford}
                >
                  {canAfford ? 'Pay Salvage' : 'Insufficient Credits'}
                </button>
              ) : (
                <div className="dw-modal-confirm-inline">
                  <p>Confirm recovery for {salvageCost} credits?</p>
                  <div className="dw-modal-confirm-buttons">
                    <button className="dw-btn dw-btn-success" onClick={handleRecover}>
                      Confirm
                    </button>
                    <button className="dw-btn dw-btn-secondary" onClick={() => setConfirmMode(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Option 2: Scrap Ship */}
            <div className={`dw-modal-option dw-modal-option--danger ${shipSlot.isImmutable ? 'dw-modal-option--disabled' : ''}`}>
              <div className="dw-modal-option-header">
                <h3 className="dw-modal-option-title">Scrap Ship</h3>
                <div className="dw-modal-option-cost dw-modal-option-cost--free">FREE</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div className="dw-modal-consequence">
                  <span className="dw-modal-consequence-icon"><X size={14} /></span>
                  <span>Permanently delete deck</span>
                </div>
                <div className="dw-modal-consequence">
                  <span className="dw-modal-consequence-icon"><X size={14} /></span>
                  <span>Lose {totalCards} cards from inventory</span>
                </div>
                <div className="dw-modal-consequence">
                  <span className="dw-modal-consequence-icon"><X size={14} /></span>
                  <span>Cannot be undone</span>
                </div>
              </div>

              {totalCards > 0 && (
                <div className="dw-modal-preview" style={{ '--modal-theme': 'var(--modal-danger)', '--modal-theme-bg': 'var(--modal-danger-bg)', '--modal-theme-border': 'var(--modal-danger-border)' }}>
                  <p className="dw-modal-preview-title">Cards to be removed:</p>
                  <div className="dw-modal-preview-items">
                    {cardTypes.slice(0, 5).map(card => (
                      <span key={card.id} className="dw-modal-preview-item">
                        {card.quantity}x {card.name}
                      </span>
                    ))}
                    {cardTypes.length > 5 && (
                      <span className="dw-modal-preview-item dw-modal-preview-item--more">+{cardTypes.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}

              {confirmMode !== 'scrap' ? (
                <button
                  className="dw-btn dw-btn-danger dw-btn--full"
                  onClick={() => setConfirmMode('scrap')}
                  disabled={shipSlot.isImmutable}
                >
                  {shipSlot.isImmutable ? 'Cannot Scrap Starter' : 'Scrap Ship'}
                </button>
              ) : (
                <div className="dw-modal-confirm-inline dw-modal-confirm-inline--danger">
                  <p>This will permanently delete the deck!</p>
                  <div className="dw-modal-confirm-buttons">
                    <button className="dw-btn dw-btn-danger" onClick={handleScrap}>
                      Confirm Scrap
                    </button>
                    <button className="dw-btn dw-btn-secondary" onClick={() => setConfirmMode(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Immutable Warning */}
        {shipSlot.isImmutable && (
          <div className="dw-modal-notice">
            Starter deck cannot be scrapped (only recovered)
          </div>
        )}

        {/* Close Button */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default MIARecoveryModal;
