// ========================================
// RARITY SYMBOL COMPONENT
// ========================================
// Renders rarity indicator symbols for cards and drones
// Uses SVG shapes: circle (Common), triangle (Uncommon),
// diamond (Rare), hexagon (Mythic)

import React from 'react';
import { RARITY_COLORS } from '../../data/cardData.js';

/**
 * RARITY SYMBOL COMPONENT
 * @param {string} rarity - Rarity level: 'Common', 'Uncommon', 'Rare', 'Mythic'
 * @param {number} size - Size in pixels (default: 16)
 * @param {string} className - Additional CSS classes
 */
const RaritySymbol = ({ rarity, size = 16, className = '' }) => {
  const color = RARITY_COLORS[rarity] || RARITY_COLORS.Common;

  const renderShape = () => {
    switch (rarity) {
      case 'Common':
        // Circle
        return <circle cx="8" cy="8" r="6" fill={color} />;
      case 'Uncommon':
        // Triangle (pointing up)
        return <polygon points="8,2 14,14 2,14" fill={color} />;
      case 'Rare':
        // Diamond (rotated square)
        return <polygon points="8,1 15,8 8,15 1,8" fill={color} />;
      case 'Mythic':
        // Hexagon
        return <polygon points="8,1 14,4 14,12 8,15 2,12 2,4" fill={color} />;
      default:
        // Default to circle
        return <circle cx="8" cy="8" r="6" fill={color} />;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      title={rarity}
    >
      {renderShape()}
    </svg>
  );
};

export default RaritySymbol;
