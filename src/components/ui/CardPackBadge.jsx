/**
 * CardPackBadge.jsx
 * Reusable component for displaying card pack information
 * Used in HexInfoPanel (tactical map) and ReputationProgressModal
 */

import { packTypes } from '../../data/cardPackData';

/**
 * CardPackBadge - Displays a card pack with color-coded styling
 *
 * @param {Object} props
 * @param {string} props.packType - Pack type key (e.g., 'ORDNANCE_PACK')
 * @param {number} [props.tier] - Optional tier number to display
 * @param {boolean} [props.compact=false] - If true, hides description
 * @param {string} [props.className] - Additional CSS class
 */
function CardPackBadge({ packType, tier, compact = false, className = '' }) {
  const pack = packTypes[packType];
  if (!pack) return null;

  // Generate description from pack data
  const description = pack.cardCount.max === 0
    ? `${pack.creditsRange.min}-${pack.creditsRange.max} credits`
    : `${pack.cardCount.min}-${pack.cardCount.max} cards + credits`;

  return (
    <div
      className={`card-pack-badge ${className}`}
      style={{ borderLeftColor: pack.color }}
    >
      <div className="pack-header">
        <span className="pack-name">{pack.name}</span>
        {tier && (
          <span className="pack-tier">T{tier}</span>
        )}
      </div>
      {!compact && (
        <div className="pack-desc">{description}</div>
      )}
    </div>
  );
}

export default CardPackBadge;
