// ========================================
// RARITY STATS BAR COMPONENT
// ========================================
// Reusable rarity stats grid used by Cards, Drones, Ships, and Sections tabs

import React from 'react';
import { getRarityColor } from './inventoryUtils';

/**
 * Displays a 4-column grid of rarity-based owned/total counts.
 * Used identically across all inventory category tabs.
 */
const RarityStatsBar = ({ byRarity }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
      marginBottom: '12px',
      flexShrink: 0
    }}>
      {Object.entries(byRarity).map(([rarity, stats]) => (
        <div
          key={rarity}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderLeft: `3px solid ${getRarityColor(rarity)}`,
            borderRadius: '2px'
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--modal-text-secondary)' }}>{rarity}</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: getRarityColor(rarity) }}>
            {stats.owned}/{stats.total}
          </span>
        </div>
      ))}
    </div>
  );
};

export default RarityStatsBar;
