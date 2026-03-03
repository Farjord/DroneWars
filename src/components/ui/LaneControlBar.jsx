import React, { useId } from 'react';
import { FACTION_COLORS } from './ShipSectionLayers.jsx';

const NEUTRAL_COLOR = '#8899AA';

const LaneControlBar = ({ laneControlState, localPlayerId }) => {
  const filterId = `lcb-glow-${useId()}`;

  const isPlayer = laneControlState === localPlayerId;
  const isOpponent = laneControlState && !isPlayer;

  const barColor = isPlayer ? FACTION_COLORS.player.primary
                 : isOpponent ? FACTION_COLORS.opponent.primary
                 : NEUTRAL_COLOR;
  const glowColor = isPlayer ? FACTION_COLORS.player.glow
                  : isOpponent ? FACTION_COLORS.opponent.glow
                  : NEUTRAL_COLOR;
  const barOpacity = laneControlState ? 0.85 : 0.3;
  const glowOpacity = laneControlState ? 0.5 : 0.15;
  const glowDy = isPlayer ? 6 : isOpponent ? -6 : 0;

  return (
    <svg viewBox="0 0 200 30" preserveAspectRatio="none"
         style={{ position: 'absolute', left: '12%', width: '76%',
                  top: '50%', transform: 'translateY(-50%)',
                  height: '100%', pointerEvents: 'none', zIndex: 10,
                  overflow: 'visible' }}>
      <defs>
        <filter id={filterId} x="-50%" y="-150%" width="200%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3 5" />
          <feOffset dx="0" dy={glowDy} />
        </filter>
      </defs>
      {/* Glow layer */}
      <ellipse cx="100" cy="15" rx="96" ry="5"
               fill={glowColor} opacity={glowOpacity}
               filter={`url(#${filterId})`}
               style={{ transition: 'fill 300ms ease, opacity 300ms ease' }} />
      {/* Crisp bar */}
      <ellipse cx="100" cy="15" rx="96" ry="2.5"
               fill={barColor} opacity={barOpacity}
               style={{ transition: 'fill 300ms ease, opacity 300ms ease' }} />
    </svg>
  );
};

export default LaneControlBar;
