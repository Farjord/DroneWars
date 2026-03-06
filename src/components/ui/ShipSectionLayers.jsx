// ========================================
// SHIP SECTION DECORATIVE LAYERS
// ========================================
// Pure presentational components for the ship section chevron reskin.
// All components are visual-only with pointer-events: none.
// No game logic or state — imported by ShipSectionCompact.

import React from 'react';

// ─── Faction Colour Tokens ───
export const FACTION_COLORS = {
  player: {
    primary: '#00D4FF',
    glow: '#00B8FF',
    bright: '#40E8FF',
    bg: 'rgba(11, 46, 66, 0.7)',
    bgDark: 'rgba(6, 26, 40, 0.75)',
  },
  opponent: {
    primary: '#FF2A2A',
    glow: '#FF4444',
    bright: '#FF6666',
    bg: 'rgba(90, 16, 21, 0.7)',
    bgDark: 'rgba(42, 5, 8, 0.75)',
  },
};

// ─── Clip-Path Generator ───
export const getShipClipPath = (isOpponent, columnIndex) => {
  const lWing = columnIndex > 0 ? '1.5%' : '0%';
  const rWing = columnIndex < 2 ? '98.5%' : '100%';
  return isOpponent
    ? `polygon(5% 0%, 95% 0%, ${rWing} 45%, 93% 100%, 7% 100%, ${lWing} 45%)`
    : `polygon(7% 0%, 93% 0%, ${rWing} 55%, 95% 100%, 5% 100%, ${lWing} 55%)`;
};

// ─── Scan Lines ───
export const ScanLines = ({ opacity = 0.018 }) => (
  <div style={{
    position: 'absolute', inset: 0,
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,${opacity}) 2px, rgba(255,255,255,${opacity}) 3px)`,
    pointerEvents: 'none', zIndex: 2,
  }} />
);

// ─── Corner Bracket ───
export const CornerBracket = ({ position, color, size = '1.2vw' }) => {
  const rotations = { tl: 0, tr: 90, bl: -90, br: 180 };
  const positions = {
    tl: { top: '3%', left: '9%' },
    tr: { top: '3%', right: '9%' },
    bl: { bottom: '3%', left: '9%' },
    br: { bottom: '3%', right: '9%' },
  };
  return (
    <svg viewBox="0 0 20 20" style={{
      position: 'absolute', ...positions[position],
      width: size, height: size,
      transform: `rotate(${rotations[position]}deg)`,
      opacity: 0.6, filter: `drop-shadow(0 0 3px ${color}66)`, zIndex: 4,
    }}>
      <path d="M0,10 L0,0 L10,0" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="0" cy="0" r="2" fill={color} opacity="0.9" />
    </svg>
  );
};

// ─── Edge Ticks ───
export const EdgeTicks = ({ orientation, color, count = 7 }) => (
  <div style={{
    position: 'absolute',
    ...(orientation === 'top' ? { top: '1%', left: '20%', right: '20%' } : {}),
    ...(orientation === 'bottom' ? { bottom: '1%', left: '20%', right: '20%' } : {}),
    display: 'flex', justifyContent: 'space-between',
    pointerEvents: 'none', zIndex: 4,
  }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{
        width: '0.12vw', height: '0.5vw',
        background: `linear-gradient(${orientation === 'top' ? '180deg' : '0deg'}, ${color}55, transparent)`,
      }} />
    ))}
  </div>
);

// ─── All 11 Decorative Layers ───
export const ShipSectionVisualLayers = ({ isOpponent, columnIndex, clipPath, shipImage }) => {
  const fc = isOpponent ? FACTION_COLORS.opponent : FACTION_COLORS.player;
  const { primary: pri, glow, bright, bg: bgA, bgDark: bgB } = fc;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Layer 1: Outer glow bloom */}
      <div style={{
        position: 'absolute', inset: 0,
        filter: `drop-shadow(0 0 1.2vw ${glow}55) drop-shadow(0 0 2.5vw ${glow}30)`,
      }}>
        <div style={{
          width: '100%', height: '100%',
          clipPath,
          background: `${pri}18`,
        }} />
      </div>

      {/* Layer 2: Bright outer border */}
      <div style={{
        position: 'absolute', inset: '-0.2%',
        clipPath,
        background: `linear-gradient(${isOpponent ? '180deg' : '0deg'}, ${pri}88, ${pri}44, ${pri}88)`,
      }} />

      {/* Layer 3: Panel body with ship art (no faction colour fill) */}
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        clipPath,
        background: '#0a0a12',
        boxSizing: 'border-box', overflow: 'hidden',
      }}>
        {shipImage && (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${shipImage})`,
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '100% auto',
              opacity: 0.7,
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
            }} />
          </>
        )}

        {/* Layer 4: Inner border line */}
        <div style={{
          position: 'absolute', inset: '0.3%',
          border: `0.06vw solid ${pri}20`,
          pointerEvents: 'none', zIndex: 3,
        }} />

        {/* Layer 5: Glassy sheen */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(${isOpponent ? '135deg' : '225deg'},
            rgba(255,255,255,0.06) 0%,
            rgba(255,255,255,0.02) 20%,
            transparent 40%,
            transparent 60%,
            rgba(255,255,255,0.01) 80%,
            rgba(255,255,255,0.03) 100%
          )`,
          pointerEvents: 'none', zIndex: 2,
        }} />

        {/* Layer 6a: Top/bottom edge highlight */}
        <div style={{
          position: 'absolute',
          left: '8%', right: '8%',
          ...(isOpponent ? { top: 0, height: '0.15vw' } : { bottom: 0, height: '0.15vw' }),
          background: `linear-gradient(90deg, transparent, ${bright}66, ${bright}aa, ${bright}66, transparent)`,
          zIndex: 4, pointerEvents: 'none',
        }} />

        {/* Layer 6b: Side edge highlights */}
        <div style={{ position: 'absolute', left: 0, top: '10%', bottom: '10%', width: '0.1vw', background: `linear-gradient(180deg, transparent, ${pri}40, ${pri}55, ${pri}40, transparent)`, zIndex: 4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: '10%', bottom: '10%', width: '0.1vw', background: `linear-gradient(180deg, transparent, ${pri}40, ${pri}55, ${pri}40, transparent)`, zIndex: 4, pointerEvents: 'none' }} />


        {/* Layer 8: Diagonal hatch */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${pri}02 10px, ${pri}02 11px)`,
          pointerEvents: 'none', zIndex: 1, opacity: 0.4,
        }} />

        {/* Layer 10: Corner brackets */}
        {isOpponent ? (
          <><CornerBracket position="tl" color={pri} /><CornerBracket position="tr" color={pri} /></>
        ) : (
          <><CornerBracket position="bl" color={pri} /><CornerBracket position="br" color={pri} /></>
        )}

        {/* Layer 11: Edge tick marks */}
        <EdgeTicks orientation={isOpponent ? 'top' : 'bottom'} color={pri} count={7} />
      </div>
    </div>
  );
};
