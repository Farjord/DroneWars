// ========================================
// HIDDEN CARD COMPONENT
// ========================================
// Displays an unrevealed/hidden card with rarity-based styling
// Used in InventoryModal (undiscovered cards) and LootRevealModal (card backs)

import React from 'react';
import { RARITY_COLORS } from '../../data/cardData';
import './HiddenCard.css';

/**
 * HiddenCard Component
 * Renders a card-back style placeholder for unrevealed cards
 *
 * @param {string} rarity - Card rarity: "Common", "Uncommon", "Rare", "Mythic"
 * @param {string} size - "full" (225x275px) or "sm" (scaled for grids)
 * @param {string} className - Additional CSS classes for positioning
 * @param {object} style - Additional inline styles
 */
const HiddenCard = ({ rarity = 'Common', size = 'full', className = '', style = {} }) => {
  const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.Common;

  // Shimmer intensity scales with rarity (subtle)
  const shimmerIntensity = {
    Common: 0.12,
    Uncommon: 0.18,
    Rare: 0.25,
    Mythic: 0.35
  }[rarity] || 0.12;

  // Random delay so cards don't all shimmer at once
  const shimmerDelay = `${Math.random() * 5}s`;

  return (
    <div
      className={`dw-hidden-card ${size === 'sm' ? 'dw-hidden-card--sm' : ''} ${className}`}
      style={{
        '--rarity-color': rarityColor,
        '--shimmer-intensity': shimmerIntensity,
        '--shimmer-delay': shimmerDelay,
        backgroundColor: rarityColor,
        ...style
      }}
    >
      <div className="dw-hidden-card__pattern">
        <span className="dw-hidden-card__icon">?</span>
      </div>
      <span className="dw-hidden-card__rarity">{rarity}</span>
    </div>
  );
};

export default HiddenCard;
