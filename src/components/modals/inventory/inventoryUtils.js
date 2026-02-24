// ========================================
// INVENTORY UTILITY FUNCTIONS
// ========================================
// Shared helpers for inventory tab components

import { RARITY_COLORS } from '../../../data/rarityColors';

/**
 * Get card visual style based on discovery state
 * Note: ActionCard handles grayscale via isPlayable prop
 */
export const getCardStyle = (card) => {
  if (card.discoveryState === 'undiscovered') {
    return { opacity: 0.5, cursor: 'default' };
  }
  if (card.discoveryState === 'discovered') {
    return { opacity: 0.7, cursor: 'pointer' };
  }
  return { cursor: 'pointer' };
};

/**
 * Get rarity badge color
 */
export const getRarityColor = (rarity) => {
  return RARITY_COLORS[rarity] || '#808080';
};
