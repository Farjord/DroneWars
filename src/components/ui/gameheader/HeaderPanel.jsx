import React from 'react';

const POLYGON_POINTS = {
  opponent: '0,0 440,0 460,64 0,64',
  player: '20,0 460,0 460,64 0,64',
};

export default function HeaderPanel({ side, label, factionColors, isFirst, hasPassed, hexPortrait, children }) {
  const isOpponent = side === 'opponent';

  const labelStyle = {
    position: 'absolute',
    top: '2%',
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

  const kpiMargin = isOpponent
    ? { marginLeft: '17%', marginRight: '2%' }
    : { marginRight: '17%', marginLeft: '2%', justifyContent: 'flex-end' };

  const healthMargin = isOpponent
    ? { marginLeft: '17%' }
    : { marginRight: '17%' };

  const points = POLYGON_POINTS[side];

  return (
    <div style={{ display: 'flex', justifyContent: isOpponent ? 'flex-start' : 'flex-end', height: '80%' }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
        {/* Floating label */}
        <div style={labelStyle}>
          <span>{label}</span>
          {isFirst && <span data-testid="first-badge" style={{ color: 'yellow' }}>(1st)</span>}
          {hasPassed && <span data-testid="passed-badge" style={{ color: 'red' }}>(Passed)</span>}
        </div>

        {/* Bar container */}
        <div style={{
          position: 'relative',
          width: '92%',
          height: '68%',
          clipPath: isOpponent
            ? 'polygon(0% 0%, 96% 0%, 100% 100%, 0% 100%)'
            : 'polygon(4% 0%, 100% 0%, 100% 100%, 0% 100%)',
          background: 'linear-gradient(180deg, rgba(12,30,48,0.6), rgba(0, 0, 0, 0.6))',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          border: `0.06vw solid ${factionColors.border}`,
          ...(isOpponent ? { marginLeft: '8%' } : { marginRight: '8%' }),
        }}>
          {/* Top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: '3%', right: '3%', height: '0.1vw',
            background: `linear-gradient(90deg, transparent, ${factionColors.primary}44, ${factionColors.primary}66, ${factionColors.primary}44, transparent)`,
            pointerEvents: 'none',
          }} />
          {/* Bottom accent line */}
          <div style={{
            position: 'absolute', bottom: 0, left: '8%', right: '8%', height: '0.06vw',
            background: `linear-gradient(90deg, transparent, ${factionColors.primary}22, transparent)`,
            pointerEvents: 'none',
          }} />
          {/* Sheen overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03), transparent 50%, rgba(255,255,255,0.01))',
            pointerEvents: 'none',
          }} />
          {/* Bar content area — children split 50/50 */}
          <div style={{ position: 'relative', zIndex: 3, display: 'grid', gridTemplateRows: '1fr 1fr', height: '100%', width: '100%', overflow: 'hidden' }}>
            {React.Children.map(children, (child, index) => (
              <div style={{ overflow: 'hidden', minHeight: 0, display: 'flex', alignItems: 'center', width: '100%', ...(index === 0 ? kpiMargin : healthMargin) }}>{child}</div>
            ))}
          </div>
        </div>

        {/* Hex portrait — overlaps the bar, positioned at outer edge */}
        {hexPortrait}
      </div>
    </div>
  );
}
