import React from 'react';

const POLYGON_POINTS = {
  opponent: '20,0 460,0 460,64 20,64 0,32',
  player: '0,0 440,0 460,32 440,64 0,64',
};

export default function HeaderPanel({ side, label, factionColors, isFirst, hasPassed, children }) {
  const isOpponent = side === 'opponent';

  const labelStyle = {
    position: 'absolute',
    top: '-1.1em',
    ...(isOpponent ? { left: '18%' } : { right: '18%' }),
    textTransform: 'uppercase',
    letterSpacing: '2.5px',
    fontSize: 'clamp(8px, 0.9vw, 11px)',
    fontWeight: 700,
    color: factionColors.primary,
    textShadow: `0 0 10px ${factionColors.glow}, 0 0 20px ${factionColors.glow}`,
    zIndex: 4,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const contentMargin = isOpponent
    ? { marginLeft: '17%', marginRight: '2%' }
    : { marginRight: '17%', marginLeft: '2%' };

  const points = POLYGON_POINTS[side];

  return (
    <div style={{ display: 'flex', justifyContent: isOpponent ? 'flex-start' : 'flex-end' }}>
      <div style={{ position: 'relative', width: '90%', height: '100%', display: 'flex', alignItems: 'center' }}>
        {/* Floating label */}
        <div style={labelStyle}>
          <span>{label}</span>
          {isFirst && <span data-testid="first-badge" style={{ color: 'yellow' }}>(1st)</span>}
          {hasPassed && <span data-testid="passed-badge" style={{ color: 'red' }}>(Passed)</span>}
        </div>

        {/* SVG bar container */}
        <div style={{ position: 'relative', width: '100%', height: '68%' }}>
          <svg
            viewBox="0 0 460 64"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            <polygon points={points} fill="rgba(10, 14, 24, 0.9)" />
            <polygon points={points} fill="none" stroke={factionColors.border} strokeWidth={1.5} />
          </svg>

          {/* Bar content area */}
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', height: '100%', ...contentMargin }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
