// ========================================
// HEALTH BAR COMPONENT
// ========================================
// Segmented health strip with faction-colored segments
// Opponent: number LEFT, bar RIGHT | Player: bar LEFT, number RIGHT

import React from 'react';

const MAX_SEGMENTS = 30;

const HealthBar = ({ current, max, side, factionColors }) => {
  const segmentCount = Math.min(max, MAX_SEGMENTS);
  const filledCount = max > MAX_SEGMENTS
    ? Math.round((current / max) * MAX_SEGMENTS)
    : Math.min(current, max);

  const segments = Array.from({ length: segmentCount }, (_, i) => {
    const isFilled = i < filledCount;
    return (
      <div
        key={i}
        data-testid={isFilled ? 'health-segment-filled' : 'health-segment-empty'}
        style={{
          flex: 1,
          minWidth: '2px',
          maxWidth: '10px',
          height: '8px',
          borderRadius: '1px',
          background: isFilled ? factionColors.filledSeg : factionColors.emptySeg,
          boxShadow: isFilled ? factionColors.filledGlow : 'none',
          border: isFilled ? 'none' : `1px solid ${factionColors.emptyBorder}`,
        }}
      />
    );
  });

  const numberEl = (
    <div
      data-testid="health-number"
      style={{
        color: factionColors.primary,
        fontFamily: 'monospace',
        fontSize: '13px',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        letterSpacing: '0.5px',
      }}
    >
      {current}/{max}
    </div>
  );

  const barEl = (
    <div
      data-testid="health-segments"
      style={{
        display: 'flex',
        gap: '2px',
        flex: 1,
        alignItems: 'center',
      }}
    >
      {segments}
    </div>
  );

  const isOpponent = side === 'opponent';

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderTop: '1px solid rgba(60, 80, 120, 0.2)',
        padding: '4px 10px',
      }}
    >
      <div
        data-testid="health-bar-content"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {isOpponent ? numberEl : barEl}
        {isOpponent ? barEl : numberEl}
      </div>
    </div>
  );
};

export default HealthBar;
