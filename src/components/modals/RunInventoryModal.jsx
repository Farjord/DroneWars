/**
 * RunInventoryModal.jsx
 * Shows loot collected during the current extraction run
 * Accessible via inventory button on TacticalMapHUD
 */

import React from 'react';
import fullCardCollection from '../../data/cardData';
import { RARITY_COLORS } from '../../data/cardPackData';
import ActionCard from '../ui/ActionCard.jsx';
import { Package, Star } from 'lucide-react';

const RunInventoryModal = ({ currentRunState, onClose }) => {
  if (!currentRunState) return null;

  const { collectedLoot = [], creditsEarned = 0 } = currentRunState;

  // Filter to just card items
  const cardLoot = collectedLoot.filter(item => item.type === 'card');

  // Group cards by rarity for display
  const cardsByRarity = {
    Common: cardLoot.filter(c => c.rarity === 'Common'),
    Uncommon: cardLoot.filter(c => c.rarity === 'Uncommon'),
    Rare: cardLoot.filter(c => c.rarity === 'Rare'),
    Mythic: cardLoot.filter(c => c.rarity === 'Mythic'),
  };

  // Check for blueprints
  const blueprints = collectedLoot.filter(item => item.type === 'blueprint');

  const getRarityColor = (rarity) => RARITY_COLORS[rarity] || '#808080';

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--xl dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Package size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">RUN INVENTORY</h2>
            <p className="dw-modal-header-subtitle">Cards collected this run - added to collection upon extraction</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Stats Bar */}
          <div className="dw-modal-grid dw-modal-grid--3" style={{ marginBottom: '20px' }}>
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-value">{cardLoot.length}</div>
              <div className="dw-modal-stat-label">Cards</div>
            </div>
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-value" style={{ color: '#eab308' }}>${creditsEarned}</div>
              <div className="dw-modal-stat-label">Credits</div>
            </div>
            {blueprints.length > 0 && (
              <div className="dw-modal-stat">
                <div className="dw-modal-stat-value" style={{ color: '#a855f7' }}>{blueprints.length}</div>
                <div className="dw-modal-stat-label">Blueprints</div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {cardLoot.length === 0 && (
            <div className="dw-modal-info-box" style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--modal-text-primary)' }}>No cards collected yet</p>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--modal-text-muted)' }}>
                Win combat encounters or loot POIs to collect cards
              </p>
            </div>
          )}

          {/* Cards by Rarity */}
          {cardLoot.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {['Common', 'Uncommon', 'Rare', 'Mythic'].map(rarity => {
                const cards = cardsByRarity[rarity];
                if (cards.length === 0) return null;

                return (
                  <div key={rarity}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: `2px solid ${getRarityColor(rarity)}`,
                      paddingBottom: '8px',
                      marginBottom: '12px'
                    }}>
                      <span style={{ fontWeight: 700, color: getRarityColor(rarity), fontSize: '14px' }}>
                        {rarity}
                      </span>
                      <span style={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>×{cards.length}</span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: '12px'
                    }}>
                      {cards.map((item, index) => {
                        const cardData = fullCardCollection.find(c => c.id === item.cardId);

                        return cardData ? (
                          <div key={`${item.cardId}-${index}`} style={{ transform: 'scale(0.9)' }}>
                            <ActionCard card={cardData} />
                          </div>
                        ) : (
                          <div
                            key={`${item.cardId}-${index}`}
                            style={{
                              padding: '12px',
                              backgroundColor: 'rgba(0, 0, 0, 0.3)',
                              borderRadius: '6px',
                              border: `1px solid ${getRarityColor(rarity)}`,
                              textAlign: 'center'
                            }}
                          >
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--modal-text-primary)' }}>
                              {item.cardName || 'Unknown Card'}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--modal-text-muted)' }}>
                              {item.cardType || 'Unknown'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Blueprints Section */}
          {blueprints.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#a855f7', marginBottom: '12px' }}>Blueprints</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {blueprints.map((bp, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      borderRadius: '4px',
                      border: '1px solid rgba(168, 85, 247, 0.4)'
                    }}
                  >
                    <Star size={14} style={{ color: '#a855f7' }} />
                    <span style={{ fontSize: '13px', color: 'var(--modal-text-primary)' }}>{bp.blueprintId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button onClick={onClose} className="dw-btn dw-btn-confirm dw-btn--full">
            Return to Map
          </button>
        </div>
      </div>
    </div>
  );
};

export default RunInventoryModal;
