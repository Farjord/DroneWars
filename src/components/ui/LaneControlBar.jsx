import React, { useId } from 'react';
import { FACTION_COLORS } from './ShipSectionLayers.jsx';

const BAR_COLOR = '#C0CCE0';

const LaneControlBar = ({ laneControlState, localPlayerId }) => {
  const filterId = `lcb-glow-${useId()}`;

  const isPlayer = laneControlState === localPlayerId;
  const isOpponent = laneControlState && !isPlayer;

  // Both bar and glow take faction colour when controlled, but bar stays very subtle
  const factionColor = isPlayer ? FACTION_COLORS.player.glow
                     : isOpponent ? FACTION_COLORS.opponent.glow
                     : null;
  const barColor = factionColor || BAR_COLOR;
  const glowColor = factionColor || '#8899AA';
  const barOpacity = laneControlState ? 0.18 : 0.15;
  const glowOpacity = laneControlState ? 0.85 : 0.12;
  const glowDy = isPlayer ? 12 : isOpponent ? -12 : 0;

  return (
    <svg viewBox="0 0 200 30" preserveAspectRatio="none"
         style={{ position: 'absolute', left: 0, width: '100%',
                  top: '50%', transform: 'translateY(-50%)',
                  height: '500%', pointerEvents: 'none', zIndex: 10,
                  overflow: 'visible' }}>
      <defs>
        <filter id={filterId} x="-50%" y="-300%" width="200%" height="700%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4 8" />
          <feOffset dx="0" dy={glowDy} />
        </filter>
      </defs>
      {/* Glow — coloured light emanation */}
      <ellipse cx="100" cy="15" rx="96" ry="6"
               fill={glowColor} opacity={glowOpacity}
               filter={`url(#${filterId})`}
               style={{ transition: 'fill 300ms ease, opacity 300ms ease' }} />
      {/* Bar — thin neutral slit (the "fixture") */}
      <ellipse cx="100" cy="15" rx="96" ry="0.5"
               fill={barColor} opacity={barOpacity}
               style={{ transition: 'fill 300ms ease, opacity 300ms ease' }} />
    </svg>
  );
};

export default LaneControlBar;
