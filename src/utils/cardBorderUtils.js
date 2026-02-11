/**
 * Card Border Rarity System Utilities
 * Generates CSS class names based on card type and rarity
 *
 * TYPE determines border COLOR (Ordnance=red, Tactic=cyan, Support=green, Upgrade=purple)
 * RARITY determines border EFFECTS:
 *   - Common: Static gradient
 *   - Uncommon: Slow rotating gradient (15s)
 *   - Rare: Gentle breathing glow pulse (4s)
 *   - Mythic: Diagonal shimmer sweep (6s) + steady glow
 */

/**
 * Get a random animation delay class to desync card animations
 * @returns {string} A delay class name (card-delay-0 through card-delay-3)
 */
export const getRandomDelayClass = () => {
  const delayIndex = Math.floor(Math.random() * 4);
  return `card-delay-${delayIndex}`;
};

/**
 * Get the border CSS classes for a card based on type and rarity
 * @param {string} type - Card type: 'Ordnance', 'Tactic', 'Support', 'Upgrade'
 * @param {string} rarity - Card rarity: 'Common', 'Uncommon', 'Rare', 'Mythic'
 * @param {boolean} isDisabled - Whether the card is disabled/unplayable
 * @param {boolean} includeDelay - Whether to include a random delay class (default: true)
 * @returns {string} Space-separated CSS class names
 */
export const getCardBorderClasses = (type, rarity = 'Common', isDisabled = false, includeDelay = true) => {
  if (isDisabled) {
    return 'card-border-disabled';
  }

  // Normalize type to lowercase for class name
  const typeKey = type?.toLowerCase() || 'upgrade';
  const rarityKey = rarity?.toLowerCase() || 'common';

  // Validate type
  const validTypes = ['ordnance', 'tactic', 'support', 'upgrade'];
  const normalizedType = validTypes.includes(typeKey) ? typeKey : 'upgrade';

  // Validate rarity
  const validRarities = ['common', 'uncommon', 'rare', 'mythic'];
  const normalizedRarity = validRarities.includes(rarityKey) ? rarityKey : 'common';

  const borderClass = `card-border-${normalizedType}-${normalizedRarity}`;

  // Add random delay for animated rarities (uncommon, rare, mythic)
  if (includeDelay && normalizedRarity !== 'common') {
    return `${borderClass} ${getRandomDelayClass()}`;
  }

  return borderClass;
};

/**
 * Get the border CSS classes for a ship card based on rarity
 * Ships use cyan-themed borders with rarity determining effects
 * @param {string} rarity - Ship rarity: 'Common', 'Uncommon', 'Rare', 'Mythic'
 * @param {boolean} isSelected - Whether the ship is selected
 * @param {boolean} includeDelay - Whether to include a random delay class (default: true)
 * @returns {string} Space-separated CSS class names
 */
export const getShipBorderClasses = (rarity = 'Common', isSelected = false, includeDelay = true) => {
  if (isSelected) {
    return 'ship-border-selected';
  }

  const rarityKey = rarity?.toLowerCase() || 'common';
  const validRarities = ['common', 'uncommon', 'rare', 'mythic'];
  const normalizedRarity = validRarities.includes(rarityKey) ? rarityKey : 'common';

  const borderClass = `ship-border-${normalizedRarity}`;

  // Add random delay for animated rarities (uncommon, rare, mythic)
  if (includeDelay && normalizedRarity !== 'common') {
    return `${borderClass} ${getRandomDelayClass()}`;
  }

  return borderClass;
};

/**
 * Get inner border colors based on card type (for image/description borders)
 * These are the Tailwind classes used inside the card
 * @param {string} type - Card type
 * @returns {Object} Object with imageBorder, descBorder, footerBorder, typeText classes
 */
export const getTypeInnerColors = (type) => {
  switch (type) {
    case 'Ordnance':
      return {
        imageBorder: 'border-red-400/50',
        descBorder: 'border-red-800/70',
        footerBorder: 'border-red-800/70',
        typeText: 'text-red-400'
      };
    case 'Tactic':
      return {
        imageBorder: 'border-cyan-400/50',
        descBorder: 'border-cyan-800/70',
        footerBorder: 'border-cyan-800/70',
        typeText: 'text-cyan-400'
      };
    case 'Support':
      return {
        imageBorder: 'border-emerald-400/50',
        descBorder: 'border-emerald-800/70',
        footerBorder: 'border-emerald-800/70',
        typeText: 'text-emerald-400'
      };
    case 'Upgrade':
    default:
      return {
        imageBorder: 'border-purple-400/50',
        descBorder: 'border-purple-800/70',
        footerBorder: 'border-purple-800/70',
        typeText: 'text-purple-400'
      };
  }
};
