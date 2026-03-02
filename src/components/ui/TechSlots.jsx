// ========================================
// TECH SLOTS COMPONENT
// ========================================
// Renders 5 circular Tech Slots at the centre-facing edge of a lane.
// Positioned to straddle the gap between opponent and player lanes.
// Empty slots show a subtle ring; filled slots show Tech drone art with faction border.

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

const emptySlotStyle = {
  width: SLOT_SIZE,
  height: SLOT_SIZE,
  borderRadius: '50%',
  background: 'rgba(200,200,210,0.08)',
  border: '0.08vw solid rgba(200,200,210,0.7)',
};

/**
 * TechSlotItem — renders a single filled Tech Slot.
 * Circular image + faction-colored border + optional glow.
 */
const TechSlotItem = ({ techDrone, faction, highlighted, onClick }) => {
  // Determine visual faction based on who deployed the Tech
  const fc = FACTION_COLORS[faction];

  return (
    <div
      style={{
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        borderRadius: '50%',
        background: fc.bg,
        border: `0.15vw solid ${fc.primary}`,
        boxShadow: highlighted
          ? `0 0 0.6vw ${fc.glow}, 0 0 1.2vw ${fc.glow}60`
          : `0 0 0.4vw ${fc.glow}40`,
        overflow: 'hidden',
        pointerEvents: 'auto',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease',
      }}
      onClick={onClick ? () => onClick(techDrone) : undefined}
      title={techDrone.name}
    >
      <img
        src={techDrone.image}
        alt={techDrone.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '50%',
          filter: faction === 'opponent' ? 'hue-rotate(0deg) saturate(1.2)' : 'none',
        }}
        draggable={false}
      />
    </div>
  );
};

export default function TechSlots({ faction, techDrones = [], highlightedSlots = [], onTechClick }) {
  return (
    <div style={getContainerStyle(faction)}>
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const tech = techDrones[i];
        if (tech) {
          return (
            <TechSlotItem
              key={tech.id}
              techDrone={tech}
              faction={faction}
              highlighted={highlightedSlots.includes(tech.id)}
              onClick={onTechClick}
            />
          );
        }
        return <div key={`empty-${i}`} style={emptySlotStyle} />;
      })}
    </div>
  );
}
