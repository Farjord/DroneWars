// ========================================
// SHIP ICON RENDERER
// ========================================
// Renders the appropriate ship icon based on shipId.
// Handles faction coloring, heading rotation, and SVG positioning.
// Designed for multi-ship support - uses foreignObject for HTML-in-SVG.

import React from 'react';
import CorvetteIcon from './CorvetteIcon.jsx';

/**
 * Faction color mapping
 * player = blue, enemy = red, neutral = white
 */
const FACTION_COLORS = {
  player: '#3b82f6',   // Blue-500
  enemy: '#ef4444',    // Red-500
  neutral: '#ffffff',  // White
};

/**
 * Ship icon component mapping
 * Maps shipId to the appropriate icon component.
 * All currently use CorvetteIcon as placeholder - future ship icons
 * can be added here.
 */
const SHIP_ICON_MAP = {
  'SHIP_001': CorvetteIcon,    // Reconnaissance Corvette
  'SHIP_002': CorvetteIcon,    // Heavy Assault Carrier (TODO: CarrierIcon)
  'SHIP_003': CorvetteIcon,    // Scout (TODO: ScoutIcon)
};

/**
 * ShipIconRenderer - Renders ship icon at a position on the tactical map SVG.
 *
 * Uses foreignObject to embed HTML content (the ship icon component) within
 * an SVG context. This allows for complex HTML/CSS animations within the
 * tactical map's SVG hex grid.
 *
 * @param {string} shipId - Ship ID from shipData (e.g., 'SHIP_001')
 * @param {number} x - SVG x coordinate (center point)
 * @param {number} y - SVG y coordinate (center point)
 * @param {number} heading - Rotation angle in degrees (0 = East/right)
 * @param {string} faction - 'player', 'enemy', or 'neutral'
 * @param {number} size - Icon size in pixels (default: 40)
 */
function ShipIconRenderer({
  shipId,
  x,
  y,
  heading = 0,
  faction = 'neutral',
  size = 40
}) {
  // Select icon component (fallback to Corvette for unknown ships)
  const IconComponent = SHIP_ICON_MAP[shipId] || CorvetteIcon;

  // Get faction color
  const color = FACTION_COLORS[faction] || FACTION_COLORS.neutral;

  // Calculate foreignObject position (center the icon on x, y)
  const foreignX = x - size / 2;
  const foreignY = y - size / 2;

  return (
    <foreignObject
      x={foreignX}
      y={foreignY}
      width={size}
      height={size}
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <div
        data-testid="ship-icon-wrapper"
        data-faction={faction}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: `rotate(${heading + 180}deg)`,
          transformOrigin: 'center center',
        }}
      >
        <div data-testid="ship-icon">
          <IconComponent
            size={size * 0.9}
            color={color}
            speed={1}
          />
        </div>
      </div>
    </foreignObject>
  );
}

export default ShipIconRenderer;
