import React from 'react';

export default function HeaderPanel({ side, label, factionColors, hexPortrait, children }) {
  const isOpponent = side === 'opponent';
  const childArray = React.Children.toArray(children);
  const kpiChild = childArray[0];
  const healthChild = childArray[1];

  const labelStyle = {
    position: 'relative',
    zIndex: 4,
    textTransform: 'uppercase',
    letterSpacing: '2.5px',
    fontSize: 'clamp(12px, 1.3vw, 16px)',
    marginBottom: 'clamp(4px, 0.6vh, 8px)',
    fontWeight: 700,
    color: factionColors.primary,
    textShadow: `0 0 10px ${factionColors.glow}, 0 0 20px ${factionColors.glow}`,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: isOpponent ? '0 2% 0 8%' : '0 8% 0 2%',
    justifyContent: isOpponent ? 'flex-start' : 'flex-end',
  };

  // Trapezoid clip paths — KPI bar narrower on top, health bar wider below
  const kpiClip = isOpponent
    ? 'polygon(0% 0%, 96% 0%, 100% 100%, 0% 100%)'
    : 'polygon(4% 0%, 100% 0%, 100% 100%, 0% 100%)';

  const healthClip = isOpponent
    ? 'polygon(0% 0%, 96% 0%, 100% 100%, 0% 100%)'
    : 'polygon(4% 0%, 100% 0%, 100% 100%, 0% 100%)';

  const barBase = {
    position: 'relative',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '80%',
      justifyContent: isOpponent ? 'flex-start' : 'flex-end' }}>

      {/* Opponent: hex first */}
      {isOpponent && hexPortrait}

      {/* Content column: label + KPI + health */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        flex: 1, minWidth: 0, position: 'relative' }}>

        {/* Label — above KPI bar */}
        <div style={labelStyle}>
          <span>{label}</span>
        </div>

        {/* KPI bar — narrower (top) */}
        <div style={{
          ...barBase,
          width: '95%',
          clipPath: kpiClip,
          background: 'linear-gradient(180deg, rgba(12,30,48,0.6), rgba(0, 0, 0, 0.6))',
          border: `0.06vw solid ${factionColors.border}`,
          padding: 'clamp(4px, 0.5vh, 8px) 0',
          alignSelf: isOpponent ? 'flex-start' : 'flex-end',
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
          {/* KPI content */}
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', overflow: 'hidden',
            padding: '0 2%', ...(isOpponent ? { paddingLeft: '8%' } : { paddingRight: '8%' }) }}>
            {kpiChild}
          </div>
        </div>

        {/* Health bar — wider (bottom) */}
        {healthChild && (
          <div style={{
            ...barBase,
            width: '100%',
            clipPath: healthClip,
            background: 'linear-gradient(180deg, rgba(8,20,32,0.4), rgba(0, 0, 0, 0.4))',
            border: `0.05vw solid ${factionColors.border}44`,
            marginTop: '-1px',
            padding: 'clamp(3px, 0.4vh, 6px) 0',
          }}>
            {/* Bottom accent line */}
            <div style={{
              position: 'absolute', bottom: 0, left: '6%', right: '6%', height: '0.05vw',
              background: `linear-gradient(90deg, transparent, ${factionColors.primary}20, transparent)`,
              pointerEvents: 'none',
            }} />
            {/* Sheen overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03), transparent 50%, rgba(255,255,255,0.01))',
              pointerEvents: 'none',
            }} />
            {/* Health content */}
            <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', overflow: 'hidden',
              padding: '0 2%', ...(isOpponent ? { paddingLeft: '8%' } : { paddingRight: '8%' }) }}>
              {healthChild}
            </div>
          </div>
        )}
      </div>

      {/* Player: hex last */}
      {!isOpponent && hexPortrait}
    </div>
  );
}
