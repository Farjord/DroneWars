/**
 * LootRevealModal.jsx
 * Displays loot rewards with face-down cards that reveal on click
 * Used for both combat salvage and POI loot encounters
 */

import { useState, useEffect } from 'react';
import { RARITY_COLORS } from '../../data/cardPackData.js';
import fullCardCollection from '../../data/cardData.js';
import ActionCard from '../ui/ActionCard.jsx';
import './LootRevealModal.css';

function LootRevealModal({ loot, onCollect, show }) {
  const [revealedCards, setRevealedCards] = useState(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset revealed cards when loot changes
  useEffect(() => {
    if (show) {
      setRevealedCards(new Set());
    }
  }, [show, loot]);

  if (!show || !loot) return null;

  const { cards = [], credits = 0, blueprint } = loot;
  const allRevealed = revealedCards.size >= cards.length;

  const handleCardClick = (index) => {
    if (revealedCards.has(index) || isAnimating) return;

    setIsAnimating(true);
    setRevealedCards(prev => new Set([...prev, index]));

    // Brief delay to prevent rapid clicking
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleRevealAll = () => {
    const allIndices = new Set(cards.map((_, i) => i));
    setRevealedCards(allIndices);
  };

  const handleContinue = () => {
    setRevealedCards(new Set());
    onCollect(loot);
  };

  return (
    <div className="loot-reveal-overlay">
      <div className="loot-reveal-modal">
        <div className="loot-reveal-header">
          <h2 className="loot-reveal-title">SALVAGE ACQUIRED</h2>
          <p className="loot-reveal-subtitle">Click cards to reveal your rewards</p>
        </div>

        <div className="loot-card-grid">
          {cards.map((item, i) => {
            const isRevealed = revealedCards.has(i);
            const card = fullCardCollection.find(c => c.id === item.cardId);
            const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.Common;

            return (
              <div
                key={i}
                className={`loot-card-container ${isRevealed ? 'revealed' : ''}`}
                onClick={() => handleCardClick(i)}
                style={{ '--rarity-color': rarityColor }}
              >
                <div className="loot-card-flipper">
                  {/* Card Back (face-down) */}
                  <div className="loot-card-back" style={{ backgroundColor: rarityColor }}>
                    <div className="card-back-pattern">
                      <span className="card-back-icon">?</span>
                    </div>
                    <span className="card-back-rarity">{item.rarity}</span>
                  </div>

                  {/* Card Front (revealed) - Full ActionCard */}
                  <div className="loot-card-front">
                    {card ? (
                      <ActionCard card={card} />
                    ) : (
                      <div className="card-info-fallback">
                        <p className="card-name">{item.cardName || 'Unknown Card'}</p>
                        <span className="card-rarity-badge" style={{ backgroundColor: rarityColor }}>
                          {item.rarity}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Credits Display */}
        {credits > 0 && (
          <div className="loot-credits">
            <span className="credits-icon">$</span>
            <span className="credits-amount">+{credits} Credits</span>
          </div>
        )}

        {/* Blueprint (rare drop) */}
        {blueprint && (
          <div className="loot-blueprint">
            <span className="blueprint-icon">★</span>
            <span className="blueprint-text">BLUEPRINT ACQUIRED!</span>
            <span className="blueprint-name">{blueprint.blueprintId}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="loot-actions">
          {!allRevealed && (
            <button
              className="loot-btn loot-btn-secondary"
              onClick={handleRevealAll}
            >
              Reveal All ({cards.length - revealedCards.size} remaining)
            </button>
          )}
          <button
            className={`loot-btn loot-btn-primary ${!allRevealed ? 'disabled' : ''}`}
            onClick={handleContinue}
            disabled={!allRevealed}
          >
            {allRevealed ? 'Continue' : `Reveal cards to continue`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LootRevealModal;
