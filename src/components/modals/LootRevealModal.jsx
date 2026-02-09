/**
 * LootRevealModal.jsx
 * Displays loot rewards with face-down cards that reveal on click
 * Used for both combat salvage and POI loot encounters
 */

import { useState, useEffect } from 'react';
import { RARITY_COLORS } from '../../data/cardPackData.js';
import fullCardCollection from '../../data/cardData.js';
import ActionCard from '../ui/ActionCard.jsx';
import HiddenCard from '../ui/HiddenCard.jsx';
import ResourceCard from '../ui/ResourceCard.jsx';
import { Gift, X, Star, Shield, Cpu } from 'lucide-react';
import SoundManager from '../../managers/SoundManager.js';
import './LootRevealModal.css'; // Keep for card flip animations

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

  const { cards = [], salvageItems = [], aiCores = 0, blueprint, token, tokens = [] } = loot;
  // Count total revealable items (cards + salvageItems + tokens)
  const totalRevealableItems = cards.length + salvageItems.length + tokens.length;
  const allRevealed = revealedCards.size >= totalRevealableItems || totalRevealableItems === 0;

  const handleCardClick = (index) => {
    if (revealedCards.has(index) || isAnimating) return;
    SoundManager.getInstance().play('card_flip');

    setIsAnimating(true);
    setRevealedCards(prev => new Set([...prev, index]));

    // Brief delay to prevent rapid clicking
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleRevealAll = () => {
    SoundManager.getInstance().play('card_flip');
    // Include all cards + salvageItems + tokens
    const allIndices = new Set([
      ...cards.map((_, i) => i),
      ...salvageItems.map((_, i) => cards.length + i),
      ...tokens.map((_, i) => `token-${i}`)
    ]);
    setRevealedCards(allIndices);
  };

  const handleContinue = () => {
    setRevealedCards(new Set());
    onCollect(loot);
  };

  return (
    <div className="dw-modal-overlay">
      <div className="dw-modal-content dw-modal--xl dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Gift size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">SALVAGE ACQUIRED</h2>
            <p className="dw-modal-header-subtitle">Click cards to reveal your rewards</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Card Grid - uses custom CSS for flip animations */}
          <div className="loot-card-grid">
            {/* Regular cards */}
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
                    <HiddenCard
                      rarity={item.rarity}
                      size="full"
                      className="loot-card-back"
                    />

                    {/* Card Front (revealed) - Full ActionCard */}
                    <div className="loot-card-front">
                      {card ? (
                        <ActionCard card={card} isPlayable={true} />
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

            {/* Salvage Items - each displayed as a flippable card using ResourceCard */}
            {salvageItems.map((item, i) => {
              const salvageIndex = cards.length + i;
              const isRevealed = revealedCards.has(salvageIndex);

              return (
                <div
                  key={`salvage-${i}`}
                  className={`loot-card-container ${isRevealed ? 'revealed' : ''}`}
                  onClick={() => handleCardClick(salvageIndex)}
                  style={{ '--rarity-color': '#d97706' }}
                >
                  <div className="loot-card-flipper">
                    {/* Card Back (face-down) - gold salvage themed */}
                    <HiddenCard
                      variant="salvage"
                      size="full"
                      className="loot-card-back"
                    />

                    {/* Card Front (revealed) - Salvage item using ResourceCard */}
                    <div className="loot-card-front">
                      <ResourceCard
                        resourceType="salvageItem"
                        salvageItem={item}
                        scale={1.0}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Token items - rendered as clickable cards */}
            {tokens.map((tokenItem, i) => {
              const tokenKey = `token-${i}`;
              const isRevealed = revealedCards.has(tokenKey);

              return (
                <div
                  key={tokenKey}
                  className={`loot-card-container ${isRevealed ? 'revealed' : ''}`}
                  onClick={() => handleCardClick(tokenKey)}
                  style={{ '--rarity-color': '#06b6d4' }}
                >
                  <div className="loot-card-flipper">
                    {/* Card Back (face-down) - cyan token themed */}
                    <HiddenCard
                      variant="token"
                      size="full"
                      className="loot-card-back"
                    />

                    {/* Card Front (revealed) - Token display */}
                    <div className="loot-card-front">
                      <ResourceCard
                        resourceType="token"
                        tokenData={tokenItem}
                        scale={1.0}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Cores Display */}
          {aiCores > 0 && (
            <div className="dw-modal-info-box" style={{
              marginTop: '12px',
              textAlign: 'center',
              '--modal-theme': '#f97316',
              '--modal-theme-bg': 'rgba(249, 115, 22, 0.08)',
              '--modal-theme-border': 'rgba(249, 115, 22, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Cpu size={20} style={{ color: '#f97316' }} />
                <span style={{ color: '#f97316', fontWeight: 700, fontSize: '18px' }}>
                  +{aiCores} AI Core{aiCores > 1 ? 's' : ''}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
                Used for blueprint crafting
              </p>
            </div>
          )}

          {/* Token Display */}
          {token && (
            <div className="dw-modal-info-box" style={{
              marginTop: '12px',
              textAlign: 'center',
              '--modal-theme': '#06b6d4',
              '--modal-theme-bg': 'rgba(6, 182, 212, 0.08)',
              '--modal-theme-border': 'rgba(6, 182, 212, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Shield size={20} style={{ color: '#06b6d4' }} />
                <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: '18px' }}>
                  +{token.amount} Security Token{token.amount > 1 ? 's' : ''}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
                Used for special transactions
              </p>
            </div>
          )}

          {/* Blueprint (rare drop or drone blueprint) */}
          {blueprint && (
            <div className="dw-modal-info-box" style={{
              marginTop: '12px',
              '--modal-theme': '#a855f7',
              '--modal-theme-bg': 'rgba(168, 85, 247, 0.08)',
              '--modal-theme-border': 'rgba(168, 85, 247, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Star size={20} style={{ color: '#a855f7' }} />
                <span style={{ color: '#a855f7', fontWeight: 700 }}>
                  {blueprint.blueprintType === 'drone' ? 'DRONE BLUEPRINT ACQUIRED!' : 'BLUEPRINT ACQUIRED!'}
                </span>
              </div>
              <p style={{ margin: '8px 0 0', textAlign: 'center', color: 'var(--modal-text-primary)', fontSize: '16px', fontWeight: 600 }}>
                {blueprint.blueprintId}
                {blueprint.rarity && (
                  <span style={{
                    marginLeft: '8px',
                    color: RARITY_COLORS[blueprint.rarity] || RARITY_COLORS.Common,
                    fontSize: '14px'
                  }}>
                    ({blueprint.rarity})
                  </span>
                )}
              </p>
              {/* Drone stats preview */}
              {blueprint.droneData && (
                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '16px',
                  fontSize: '13px',
                  color: 'var(--modal-text-secondary)'
                }}>
                  <span><strong style={{ color: '#ef4444' }}>ATK:</strong> {blueprint.droneData.attack}</span>
                  <span><strong style={{ color: '#3b82f6' }}>HULL:</strong> {blueprint.droneData.hull}</span>
                  <span><strong style={{ color: '#22c55e' }}>SPD:</strong> {blueprint.droneData.speed}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          {!allRevealed && (
            <button
              className="dw-btn dw-btn-secondary"
              onClick={handleRevealAll}
            >
              Reveal All ({totalRevealableItems - revealedCards.size} remaining)
            </button>
          )}
          <button
            className="dw-btn dw-btn-confirm"
            onClick={handleContinue}
            disabled={!allRevealed}
            style={{ opacity: allRevealed ? 1 : 0.5 }}
          >
            {allRevealed ? 'Continue' : 'Reveal cards to continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LootRevealModal;
