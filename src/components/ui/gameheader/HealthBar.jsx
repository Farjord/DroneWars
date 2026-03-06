// ========================================
// HEALTH BAR COMPONENT
// ========================================
// Segmented health strip with faction-colored segments
// Opponent: number then bar; Player: bar then number (segments grow toward hex)

import React from 'react';
import { Shield } from 'lucide-react';

const MAX_SEGMENTS = 30;

const HealthBar = ({ current, max, side, factionColors }) => {
  const isPlayer = side === 'player';
  const segmentCount = Math.min(max, MAX_SEGMENTS);
  const filledCount = max > MAX_SEGMENTS
    ? Math.round((current / max) * MAX_SEGMENTS)
    : Math.min(current, max);

  const segments = Array.from({ length: segmentCount }, (_, i) => {
    const isFilled = i < filledCount;
    const bgColor = isFilled
      ? (isPlayer ? '#22d3ee' : '#ef4444')
      : '#9ca3af';
    return (
      <div
        key={i}
        data-testid={isFilled ? 'health-segment-filled' : 'health-segment-empty'}
        style={{
          flexShrink: 0,
          width: '0.65vw',
          height: '0.7vw',
          minWidth: '5px',
          minHeight: '5px',
          borderRadius: '2px',
          background: bgColor,
          border: '1px solid rgba(0,0,0,0.5)',
        }}
      />
    );
  });

  const numberEl = (
    <div
      data-testid="health-number"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(2px, 0.25vw, 4px)',
        flexShrink: 0,
      }}
    >
      <Shield size={14} color={isPlayer ? '#22d3ee' : '#ef4444'} />
      <span style={{
        color: '#b8bcc8',
        fontSize: 'clamp(11px, 1.1vw, 16px)',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}>
        {current}/{max}
      </span>
    </div>
  );

  const barEl = (
    <div
      data-testid="health-segments"
      style={{
        display: 'flex',
        gap: '1px',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        alignItems: 'center',
      }}
    >
      {segments}
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
      }}
    >
      <div
        data-testid="health-bar-content"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(3px, 0.4vw, 6px)',
        }}
      >
        {numberEl}{barEl}
      </div>
    </div>
  );
};

export default HealthBar;
