// ========================================
// SHATTER CARD
// ========================================
// Renders a card split into 6 CSS clip-path polygon shards.
// When `triggered` becomes true all shards simultaneously fly outward and fade.
// Card size is fixed at 225×275px (ActionCard default).

import React from 'react';
import ActionCard from '../ui/ActionCard.jsx';
import './ShatterCard.css';

const SHARD_IDS = [1, 2, 3, 4, 5, 6];

/**
 * ShatterCard
 * @param {Object} card - Full card object passed to ActionCard
 * @param {boolean} triggered - When true, starts the shatter animation
 * @param {number} shatterDurationMs - Animation duration in ms (default 600)
 */
const ShatterCard = ({ card, triggered, shatterDurationMs = 600 }) => (
  // --shard-duration CSS custom property cascades into .shatter-shard-N--active rules
  <div
    className="shatter-card-container"
    style={triggered ? { '--shard-duration': `${shatterDurationMs}ms` } : undefined}
  >
    {SHARD_IDS.map((id) => (
      <div
        key={id}
        className={`shatter-shard shatter-shard-${id}${triggered ? ` shatter-shard-${id}--active` : ''}`}
      >
        <ActionCard card={card} isPlayable={false} />
      </div>
    ))}
  </div>
);

export default ShatterCard;
