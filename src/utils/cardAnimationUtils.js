// ========================================
// CARD ANIMATION UTILITIES
// ========================================
// Centralized configuration for card fan effects and hover animations
// Used by HandView.jsx and DronesView.jsx

/**
 * Configuration for card fan and hover effects
 * Adjust these values to change the effect across all card displays
 */
export const CARD_FAN_CONFIG = {
  // Fan rotation
  degreesPerCard: 2,  // Rotation angle per card position from center

  // Card spacing/overlap
  cardOverlapPx: -10,  // Negative = cards overlap, positive = gap between cards
                        // -100 = 100px overlap, 0 = no gap/overlap, 10 = 10px gap

  // Transform origin for rotation
  transformOrigin: '50% 50%',  // Pivot point for card rotation
                                 // '50% 100%' = center bottom (default)
                                 // '50% 110%' = 10% below card (better bottom alignment in fan)

  // Z-index layering
  zIndex: {
    normal: (index) => index,  // Normal card uses its index
    hovered: 800               // Hovered/selected card on top
  },

  // Animation timing
  transition: {
    duration: '300ms',
    easing: 'ease-in-out'
  },

  // Hover/selection effect
  hoverEffect: {
    translateY: -105,  // Pixels to raise card upward
    scale: 1.2        // Scale multiplier for zoom effect
  },

  // Arc effect for fan (inverted - center high, edges low)
  arcHeight: 5.0,  // Multiplier for vertical arc offset (pixels per degree of rotation)
  baselineOffset: 30  // Base offset to move all cards down (px)
};

/**
 * Calculate rotation angle for card fan effect
 * @param {number} index - Card index in array
 * @param {number} totalCards - Total number of cards
 * @returns {number} Rotation angle in degrees
 */
export const calculateCardFanRotation = (index, totalCards) => {
  const middleIndex = (totalCards - 1) / 2;
  return (index - middleIndex) * CARD_FAN_CONFIG.degreesPerCard;
};

/**
 * Get transform string for hovered/selected card
 * @returns {string} CSS transform value
 */
export const getHoverTransform = () => {
  const { translateY, scale } = CARD_FAN_CONFIG.hoverEffect;
  return `translateY(${translateY}px) scale(${scale})`;
};

/**
 * Calculate left margin for card spacing/overlap
 * @param {number} index - Card index in array
 * @returns {number} Margin in pixels (0 for first card, configured overlap for others)
 */
export const getCardSpacing = (index) => {
  // First card has no left margin, all others use configured overlap
  return index === 0 ? 0 : CARD_FAN_CONFIG.cardOverlapPx;
};

/**
 * Get CSS transition string for card animations
 * @returns {string} CSS transition value
 */
export const getCardTransition = () => {
  const { duration, easing } = CARD_FAN_CONFIG.transition;
  return `all ${duration} ${easing}`;
};

/**
 * Calculate vertical arc offset for card fan effect (inverted arc)
 * Creates effect where center cards are high and outer cards arc downward
 * @param {number} rotationDeg - Rotation angle in degrees
 * @param {number} totalCards - Total number of cards in hand (for calculating actual max rotation)
 * @returns {number} Vertical offset in pixels (positive = downward from baseline)
 */
export const calculateCardArcOffset = (rotationDeg, totalCards) => {
  // Inverted arc: less rotation = more negative (higher)
  // more rotation = closer to 0 (lower)
  // Calculate ACTUAL max rotation based on hand size
  const maxRotation = ((totalCards - 1) / 2) * CARD_FAN_CONFIG.degreesPerCard;
  const arcOffset = -(maxRotation - Math.abs(rotationDeg)) * CARD_FAN_CONFIG.arcHeight;
  // Add baseline to move all cards down
  return CARD_FAN_CONFIG.baselineOffset + arcOffset;
};
