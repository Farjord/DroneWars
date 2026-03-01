// ========================================
// DRONE LANE DECORATIVE LAYERS
// ========================================
// Pure presentational components for the drone lane trapezoid reskin.
// All components are visual-only with pointer-events: none.
// No game logic or state — imported by SingleLaneView.

import React from 'react';
import { ScanLines, FACTION_COLORS } from './ShipSectionLayers.jsx';

// ─── Lane Background Colours ───
export const LANE_COLORS = {
  player: { bg: 'rgba(6, 15, 28, 0.55)' },
  opponent: { bg: 'rgba(15, 8, 25, 0.55)' },
};

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

// ─── All 9 Decorative Layers ───
export const DroneLaneVisualLayers = ({ isOpponent, clipPath, laneControlState = null }) => {
  const fc = isOpponent ? FACTION_COLORS.opponent : FACTION_COLORS.player;
  const { primary: pri, glow } = fc;
  const laneBg = isOpponent ? LANE_COLORS.opponent.bg : LANE_COLORS.player.bg;
  const dir = isOpponent ? '180deg' : '0deg';
  const isControlled = laneControlState != null;

  // Controlled lanes get stronger glow and border
  const glowBg = isControlled ? `${pri}20` : `${pri}08`;
  const glowShadow = isControlled
    ? `drop-shadow(0 0 1.2vw ${glow}30)`
    : `drop-shadow(0 0 0.8vw ${glow}15)`;
  const borderFrom = isControlled ? `${pri}88` : `${pri}44`;
  const borderTo = isControlled ? `${pri}44` : `${pri}15`;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Layer 1: Glow behind */}
      <div style={{
        position: 'absolute', inset: '-0.2%',
        clipPath,
        background: glowBg,
        filter: glowShadow,
      }} />

      {/* Layer 2: Outer border gradient */}
      <div style={{
        position: 'absolute', inset: '-0.1%',
        clipPath,
        background: `linear-gradient(${dir}, ${borderFrom}, ${borderTo})`,
      }} />

      {/* Layer 3: Main body — translucent, NO backdrop-filter */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath,
        background: laneBg,
        overflow: 'hidden',
      }}>
        {/* Layer 4: Inner border */}
        <div style={{
          position: 'absolute', inset: '0.4%',
          border: `0.05vw solid ${pri}12`,
          pointerEvents: 'none',
        }} />

        {/* Layer 5: Edge highlight */}
        <div style={{
          position: 'absolute', left: '2%', right: '2%',
          ...(isOpponent ? { bottom: 0, height: '0.1vw' } : { top: 0, height: '0.1vw' }),
          background: `linear-gradient(90deg, transparent, ${pri}44, ${pri}66, ${pri}44, transparent)`,
          pointerEvents: 'none', zIndex: 3,
        }} />

        {/* Layer 6: Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(0deg, ${pri}03 1px, transparent 1px), linear-gradient(90deg, ${pri}02 1px, transparent 1px)`,
          backgroundSize: '8% 20%',
          pointerEvents: 'none', opacity: 0.5,
        }} />

        {/* Layer 7: Glassy sheen */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(${isOpponent ? '160deg' : '200deg'}, rgba(255,255,255,0.04) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.02) 100%)`,
          pointerEvents: 'none',
        }} />

        {/* Layer 8: Scan lines */}
        <ScanLines opacity={0.01} />

        {/* Layer 9: Chevron arrows at centre-facing edge */}
        <ChevronArrows color={pri} direction={isOpponent ? 'down' : 'up'} />
      </div>
    </div>
  );
};
