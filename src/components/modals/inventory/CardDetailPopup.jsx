// ========================================
// CARD DETAIL POPUP COMPONENT
// ========================================
// Overlay popup showing full card details when a card is clicked

import React from 'react';
import ActionCard from '../../ui/ActionCard';
import { getRarityColor } from './inventoryUtils';

/**
 * CardDetailPopup Component
 * Modal overlay showing detailed view of a selected card.
 */
const CardDetailPopup = ({ selectedCard, onClose }) => {
  if (!selectedCard) return null;

  return (
    <div className="dw-modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="dw-modal-content dw-modal--lg dw-modal--action"
        onClick={e => e.stopPropagation()}
        style={{ borderColor: getRarityColor(selectedCard.rarity) }}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{selectedCard.name}</h2>
            <p className="dw-modal-header-subtitle">{selectedCard.type} Card</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Card Display + Info Layout */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* ActionCard Display */}
            <div style={{ flexShrink: 0 }}>
              <ActionCard card={selectedCard} />
            </div>

            {/* Card Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Meta Info */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--modal-text-secondary)' }}>Cost: </span>
                  <span style={{ color: 'var(--modal-action)', fontWeight: '600' }}>{selectedCard.cost}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--modal-text-secondary)' }}>Rarity: </span>
                  <span style={{ color: getRarityColor(selectedCard.rarity), fontWeight: '600' }}>
                    {selectedCard.rarity}
                  </span>
                </div>
              </div>

              {/* Quantity */}
              {selectedCard.discoveryState === 'owned' && (
                <div className="dw-modal-info-box" style={{
                  background: selectedCard.quantity === Infinity ? 'rgba(6, 182, 212, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  borderColor: selectedCard.quantity === Infinity ? 'rgba(6, 182, 212, 0.3)' : 'rgba(34, 197, 94, 0.3)'
                }}>
                  <span style={{ color: selectedCard.quantity === Infinity ? 'var(--modal-action)' : 'var(--modal-success)' }}>
                    Owned: {selectedCard.quantity === Infinity ? '∞' : selectedCard.quantity}
                    {selectedCard.isFromSlot0 && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--modal-text-secondary)' }}>
                        (Starter Deck)
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Description */}
              <div className="dw-modal-info-box">
                <p style={{ fontSize: '13px', color: 'var(--modal-text-primary)', margin: 0, lineHeight: 1.5 }}>
                  {selectedCard.description}
                </p>
              </div>
            </div>
          </div>
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

export default CardDetailPopup;
