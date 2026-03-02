// ========================================
// LANE EFFECTS COMPONENT
// ========================================
// Renders 5 circular effect token slots at the centre-facing edge of a lane.
// Positioned to straddle the gap between opponent and player lanes.
// Currently renders empty slots only — active effect styling deferred until game logic ships.

import React from 'react';
import { FACTION_COLORS } from './ShipSectionLayers.jsx';

const SLOT_COUNT = 5;

const SLOT_SIZE = 'clamp(14px, 1.4vw, 28px)';

const getContainerStyle = (faction) => ({
  position: 'absolute',
  left: 0,
  right: 0,
  ...(faction === 'opponent'
    ? { bottom: 0, transform: 'translateY(50%)' }
    : { top: 0, transform: 'translateY(-50%)' }),
  display: 'flex',
  justifyContent: 'center',
  gap: '0.5vw',
  zIndex: 15,
  pointerEvents: 'none',
});

const getSlotStyle = (effect, faction) => {
  if (effect) {
    const fc = FACTION_COLORS[faction];
    return {
      width: SLOT_SIZE,
      height: SLOT_SIZE,
      borderRadius: '50%',
      background: fc.bg,
      border: `0.08vw solid ${fc.primary}`,
      boxShadow: `0 0 0.4vw ${fc.glow}40`,
    };
  }

  return {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: '50%',
    background: '#2a2a32',
    border: '0.08vw solid #48485a',
  };
};

export default function LaneEffects({ faction, effects = [] }) {
  return (
    <div style={getContainerStyle(faction)}>
      {Array.from({ length: SLOT_COUNT }, (_, i) => (
        <div key={i} style={getSlotStyle(effects[i], faction)} />
      ))}
    </div>
  );
}
