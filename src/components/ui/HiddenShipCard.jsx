// ========================================
// HIDDEN SHIP CARD COMPONENT
// ========================================
// Displays an unrevealed/hidden ship card with rarity-based styling
// Used in InventoryModal for undiscovered ships
// Base size: 225px × 275px (matches ShipCard)

import React from 'react';
import { Rocket } from 'lucide-react';
import { RARITY_COLORS } from '../../data/cardData';
import './HiddenCard.css';

/**
 * HiddenShipCard Component
 * Renders a card-back style placeholder for unrevealed ships
 *
 * @param {string} rarity - Card rarity: "Common", "Uncommon", "Rare", "Mythic"
 * @param {string} size - "full" (225x275px) or "sm" (scaled for grids)
 * @param {number} scale - Optional scale multiplier (default: 1.0)
 * @param {string} className - Additional CSS classes for positioning
 * @param {object} style - Additional inline styles
 */
const HiddenShipCard = ({ rarity = 'Common', size = 'full', scale = 1.0, className = '', style = {} }) => {
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

  // Apply scale transform if provided
  const scaleStyle = scale !== 1.0 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'center center'
  } : {};

  return (
    <div
      className={`dw-hidden-card ${size === 'sm' ? 'dw-hidden-card--sm' : ''} ${className}`}
      style={{
        '--rarity-color': rarityColor,
        '--shimmer-intensity': shimmerIntensity,
        '--shimmer-delay': shimmerDelay,
        backgroundColor: rarityColor,
        ...scaleStyle,
        ...style
      }}
    >
      <div className="dw-hidden-card__pattern">
        <Rocket size={size === 'sm' ? 28 : 48} className="text-white/80" style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' }} />
      </div>
      <span className="dw-hidden-card__rarity">{rarity}</span>
    </div>
  );
};

export default HiddenShipCard;
