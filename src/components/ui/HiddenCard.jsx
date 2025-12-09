// ========================================
// HIDDEN CARD COMPONENT
// ========================================
// Displays an unrevealed/hidden card with rarity-based styling
// Used in InventoryModal (undiscovered cards) and LootRevealModal (card backs)

import React from 'react';
import { Package } from 'lucide-react';
import { RARITY_COLORS } from '../../data/cardData';
import './HiddenCard.css';

// Gold/amber color scheme for salvage variant
const SALVAGE_COLORS = {
  primary: '#d97706',    // amber-600
  secondary: '#b45309',  // amber-700
  dark: '#92400e',       // amber-800
  highlight: '#fbbf24'   // amber-400
};

/**
 * HiddenCard Component
 * Renders a card-back style placeholder for unrevealed cards
 *
 * @param {string} rarity - Card rarity: "Common", "Uncommon", "Rare", "Mythic"
 * @param {string} size - "full" (225x275px) or "sm" (scaled for grids)
 * @param {string} className - Additional CSS classes for positioning
 * @param {object} style - Additional inline styles
 * @param {string} variant - "default" for rarity-based cards, "salvage" for gold salvage items
 */
const HiddenCard = ({ rarity = 'Common', size = 'full', className = '', style = {}, variant = 'default' }) => {
  const isSalvage = variant === 'salvage';

  // Use gold for salvage, rarity color otherwise
  const cardColor = isSalvage ? SALVAGE_COLORS.primary : (RARITY_COLORS[rarity] || RARITY_COLORS.Common);

  // Shimmer intensity - higher for salvage to give it a valuable feel
  const shimmerIntensity = isSalvage ? 0.3 : ({
    Common: 0.12,
    Uncommon: 0.18,
    Rare: 0.25,
    Mythic: 0.35
  }[rarity] || 0.12);

  // Random delay so cards don't all shimmer at once
  const shimmerDelay = `${Math.random() * 5}s`;

  // Label for salvage or rarity
  const label = isSalvage ? 'Salvage' : rarity;

  return (
    <div
      className={`dw-hidden-card ${size === 'sm' ? 'dw-hidden-card--sm' : ''} ${isSalvage ? 'dw-hidden-card--salvage' : ''} ${className}`}
      style={{
        '--rarity-color': cardColor,
        '--shimmer-intensity': shimmerIntensity,
        '--shimmer-delay': shimmerDelay,
        backgroundColor: isSalvage
          ? undefined  // Let CSS handle gradient background
          : cardColor,
        ...style
      }}
    >
      <div className="dw-hidden-card__pattern">
        {isSalvage ? (
          <Package size={size === 'sm' ? 28 : 48} className="dw-hidden-card__icon dw-hidden-card__icon--package" />
        ) : (
          <span className="dw-hidden-card__icon">?</span>
        )}
      </div>
      <span className="dw-hidden-card__rarity">{label}</span>
    </div>
  );
};

export default HiddenCard;
