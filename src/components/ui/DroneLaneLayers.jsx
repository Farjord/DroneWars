// ========================================
// DRONE LANE DECORATIVE LAYERS
// ========================================
// Pure presentational components for the drone lane trapezoid reskin.
// All components are visual-only with pointer-events: none.
// No game logic or state — imported by SingleLaneView.

import React from 'react';
import { ScanLines, FACTION_COLORS } from './ShipSectionLayers.jsx';

// ─── Clip-Path Generator ───
export const getLaneClipPath = (isOpponent) =>
  isOpponent
    ? 'polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%)'
    : 'polygon(0% 0%, 100% 0%, 88% 100%, 12% 100%)';

// ─── Chevron Arrows (decorative, at centre-facing edge) ───
export const ChevronArrows = ({ color, direction = 'down' }) => (
  <div style={{
    display: 'flex', justifyContent: 'center', gap: '2vw',
    position: 'absolute', left: 0, right: 0,
    ...(direction === 'down' ? { bottom: '-0.3vw' } : { top: '-0.3vw' }),
    zIndex: 6, pointerEvents: 'none',
  }}>
    {[0, 1, 2].map(i => (
      <svg key={i} viewBox="0 0 12 8" style={{ width: '0.8vw', height: '0.5vw', opacity: i === 1 ? 0.6 : 0.3 }}>
        {direction === 'down' ? (
          <polyline points="0,0 6,8 12,0" fill="none" stroke={color} strokeWidth="1.5" />
        ) : (
          <polyline points="0,8 6,0 12,8" fill="none" stroke={color} strokeWidth="1.5" />
        )}
      </svg>
    ))}
  </div>
);

// ─── Decorative Layers ───
export const DroneLaneVisualLayers = ({ isOpponent, clipPath, laneControlState = null }) => {
  const fc = isOpponent ? FACTION_COLORS.opponent : FACTION_COLORS.player;
  const { primary: pri } = fc;
  const isControlled = laneControlState != null;
  const borderColor = isControlled ? `${pri}88` : `${pri}55`;
  const svgPoints = isOpponent
    ? '12,0 88,0 100,100 0,100'
    : '0,0 100,0 88,100 12,100';

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Outer border — SVG stroke outline (no interior fill) */}
      <svg style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        overflow: 'visible',
      }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon
          points={svgPoints}
          fill="none"
          stroke={borderColor}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Main body — transparent container for scan lines + chevrons */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath,
        background: 'transparent',
        overflow: 'hidden',
      }}>
        {/* Scan lines */}
        <ScanLines opacity={0.005} />

        {/* Chevron arrows at centre-facing edge */}
        <ChevronArrows color={pri} direction={isOpponent ? 'down' : 'up'} />
      </div>
    </div>
  );
};
