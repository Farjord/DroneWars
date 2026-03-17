// ========================================
// TECH SLOTS COMPONENT
// ========================================
// Renders 5 circular Tech Slots at the centre-facing edge of a lane.
// Positioned to straddle the gap between opponent and player lanes.
// Empty slots show a subtle ring; filled slots show Tech drone art with faction border.
// Filled slots include data-drone-id for animation system targeting and a subtle shimmer.

import React from 'react';
import { FACTION_COLORS } from './ShipSectionLayers.jsx';
import fullTechCollection from '../../data/techData.js';
import { debugLog } from '../../utils/debugLogger.js';
import DroneTooltipPanel, { buildTechTooltipItems } from './DroneTooltipPanel.jsx';

const SLOT_COUNT = 5;

const SLOT_SIZE = 'clamp(18px, 1.8vw, 36px)';

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

// Inject shimmer keyframes (updates on HMR reload)
const SHIMMER_STYLE_ID = 'tech-slot-shimmer';
const SHIMMER_CSS = `
  @keyframes techSlotShimmer {
    0%, 100% { opacity: 0.85; }
    50% { opacity: 1; }
  }
  @keyframes techSlotHighlight {
    0%, 100% { box-shadow: 0 0 0.6vw var(--tech-glow), 0 0 1.2vw var(--tech-glow-dim); }
    50% { box-shadow: 0 0 1vw var(--tech-glow), 0 0 2vw var(--tech-glow-dim); }
  }
  @keyframes techSlotWarning {
    0%, 100% { box-shadow: 0 0 0.6vw #ff4400, 0 0 1.2vw #ff440060; }
    50% { box-shadow: 0 0 1.2vw #ff6600, 0 0 2.4vw #ff660080; }
  }
  .tech-slot-filled:hover {
    transform: scale(1.15);
  }
`;
if (typeof document !== 'undefined') {
  let style = document.getElementById(SHIMMER_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = SHIMMER_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = SHIMMER_CSS;
}

/**
 * TechSlotItem — renders a single filled Tech Slot.
 * Circular image + faction-colored border + optional glow.
 * Exposes data-drone-id for animation system targeting.
 */
const TechSlotItem = ({ techDrone, techDef, faction, highlighted, exhausted, warned, onClick, draggedActionCard, onActionCardDrop, owner }) => {
  const fc = FACTION_COLORS[faction];
  const tooltipItems = techDef ? buildTechTooltipItems(techDef) : [];

  return (
    <div
      className="tech-slot-filled"
      data-drone-id={techDrone.id}
      data-tech-slot=""
      style={{
        position: 'relative',
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        borderRadius: '50%',
        background: exhausted ? 'rgba(40,40,50,0.7)' : fc.bg,
        border: `0.15vw solid ${exhausted ? 'rgba(100,100,120,0.4)' : warned ? '#ff4400' : fc.primary}`,
        '--tech-glow': fc.glow,
        '--tech-glow-dim': `${fc.glow}60`,
        boxShadow: exhausted
          ? 'none'
          : warned
            ? '0 0 0.6vw #ff4400, 0 0 1.2vw #ff440060'
            : highlighted
              ? `0 0 0.6vw ${fc.glow}, 0 0 1.2vw ${fc.glow}60`
              : `0 0 0.4vw ${fc.glow}40`,
        overflow: 'visible',
        pointerEvents: 'auto',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease, transform 0.15s ease, filter 0.3s ease',
        animation: exhausted
          ? 'none'
          : warned
            ? 'techSlotWarning 0.6s ease-in-out infinite'
            : highlighted
              ? 'techSlotHighlight 0.8s ease-in-out infinite'
              : 'techSlotShimmer 3s ease-in-out infinite',
      }}
      onClick={onClick ? () => onClick(techDrone) : undefined}
      onMouseUp={(e) => {
        if (draggedActionCard && onActionCardDrop) {
          debugLog('DRAG_DROP_DEPLOY', '🎯 Tech slot action card drop detected', { techName: techDrone.name, owner });
          onActionCardDrop(techDrone, 'tech', owner);
          e.stopPropagation();
        }
      }}
    >
      <img
        src={techDrone.image}
        alt={techDrone.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '50%',
          filter: exhausted
            ? 'grayscale(1) opacity(0.5)'
            : faction === 'opponent' ? 'hue-rotate(0deg) saturate(1.2)' : 'none',
        }}
        draggable={false}
      />
      {tooltipItems.length > 0 && <DroneTooltipPanel items={tooltipItems} position="right" />}
    </div>
  );
};

export default function TechSlots({ faction, techDrones = [], highlightedSlots = [], warnedSlots = [], onTechClick, draggedActionCard, onActionCardDrop, owner }) {
  return (
    <div style={getContainerStyle(faction)}>
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const tech = techDrones[i];
        if (tech) {
          const techDef = fullTechCollection.find(t => t.name === tech.name);
          const ability = techDef?.abilities?.[0];
          const isExhausted = ability?.usesPerRound != null &&
            (tech.triggerUsesMap?.[ability.name] ?? tech.triggerUsesThisRound ?? 0) >= ability.usesPerRound;

          return (
            <TechSlotItem
              key={tech.id}
              techDrone={tech}
              techDef={techDef}
              faction={faction}
              highlighted={highlightedSlots.includes(tech.id)}
              exhausted={isExhausted}
              warned={warnedSlots.includes(tech.id)}
              onClick={onTechClick}
              draggedActionCard={draggedActionCard}
              onActionCardDrop={onActionCardDrop}
              owner={owner}
            />
          );
        }
        return <div key={`empty-${i}`} style={emptySlotStyle} />;
      })}
    </div>
  );
}
