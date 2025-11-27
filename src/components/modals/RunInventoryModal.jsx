/**
 * RunInventoryModal.jsx
 * Shows loot collected during the current extraction run
 * Accessible via inventory button on TacticalMapHUD
 */

import React from 'react';
import fullCardCollection from '../../data/cardData';
import { RARITY_COLORS } from '../../data/cardPackData';
import ActionCard from '../ui/ActionCard.jsx';
import './RunInventoryModal.css';

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
    <div className="run-inventory-overlay">
      <div className="run-inventory-modal">
        {/* Header */}
        <div className="run-inventory-header">
          <h2 className="run-inventory-title">RUN INVENTORY</h2>
          <p className="run-inventory-subtitle">
            Cards collected this run - added to collection upon extraction
          </p>
          <button className="run-inventory-close" onClick={onClose}>×</button>
        </div>

        {/* Stats Bar */}
        <div className="run-inventory-stats">
          <div className="stat-item">
            <span className="stat-value">{cardLoot.length}</span>
            <span className="stat-label">Cards</span>
          </div>
          <div className="stat-item credits">
            <span className="stat-value">${creditsEarned}</span>
            <span className="stat-label">Credits</span>
          </div>
          {blueprints.length > 0 && (
            <div className="stat-item blueprints">
              <span className="stat-value">{blueprints.length}</span>
              <span className="stat-label">Blueprints</span>
            </div>
          )}
        </div>

        {/* Empty State */}
        {cardLoot.length === 0 && (
          <div className="run-inventory-empty">
            <p>No cards collected yet</p>
            <p className="empty-hint">Win combat encounters or loot POIs to collect cards</p>
          </div>
        )}

        {/* Cards by Rarity */}
        {cardLoot.length > 0 && (
          <div className="run-inventory-cards">
            {['Common', 'Uncommon', 'Rare', 'Mythic'].map(rarity => {
              const cards = cardsByRarity[rarity];
              if (cards.length === 0) return null;

              return (
                <div key={rarity} className="rarity-section">
                  <div
                    className="rarity-header"
                    style={{ borderColor: getRarityColor(rarity) }}
                  >
                    <span
                      className="rarity-name"
                      style={{ color: getRarityColor(rarity) }}
                    >
                      {rarity}
                    </span>
                    <span className="rarity-count">×{cards.length}</span>
                  </div>

                  <div className="cards-grid">
                    {cards.map((item, index) => {
                      const cardData = fullCardCollection.find(c => c.id === item.cardId);

                      return cardData ? (
                        <div
                          key={`${item.cardId}-${index}`}
                          className="inventory-card-wrapper"
                        >
                          <ActionCard card={cardData} />
                        </div>
                      ) : (
                        <div
                          key={`${item.cardId}-${index}`}
                          className="inventory-card-fallback"
                          style={{ borderColor: getRarityColor(rarity) }}
                        >
                          <p className="card-name">{item.cardName || 'Unknown Card'}</p>
                          <p className="card-type">{item.cardType || 'Unknown'}</p>
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
          <div className="blueprints-section">
            <h3 className="blueprints-title">Blueprints</h3>
            <div className="blueprints-grid">
              {blueprints.map((bp, i) => (
                <div key={i} className="blueprint-item">
                  <span className="blueprint-icon">★</span>
                  <span className="blueprint-name">{bp.blueprintId}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button className="run-inventory-btn" onClick={onClose}>
          Return to Map
        </button>
      </div>
    </div>
  );
};

export default RunInventoryModal;
