// ========================================
// TARGETING ARROW COMPONENT
// ========================================
// Renders a sci-fi styled targeting arrow with tapered body, glow effect, and animated pulses.
// Used for drag-and-drop deployment and drone targeting.

import React from 'react';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * Calculate polygon points for a tapered arrow body with integrated arrowhead.
 * Exported for use in App.jsx mouse tracking.
 * @param {Object} start - Starting position {x, y}
 * @param {Object} end - Ending position {x, y}
 * @param {number} baseWidth - Half-width at start (default: 10 = 20px total)
 * @param {number} tipWidth - Half-width before arrowhead (default: 4 = 8px total)
 * @returns {string} SVG polygon points string (7 points forming body + arrowhead)
 */
export const calculatePolygonPoints = (start, end, baseWidth = 10, tipWidth = 4) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1; // Avoid division by zero

  // Unit vectors
  const dirX = dx / length;  // Direction unit vector X
  const dirY = dy / length;  // Direction unit vector Y
  const perpX = -dirY;       // Perpendicular unit vector X
  const perpY = dirX;        // Perpendicular unit vector Y

  // Arrowhead dimensions
  const arrowLength = 24;    // How far back the arrowhead wings extend
  const arrowWidth = 12;     // Half-width of arrowhead wings (24px total)

  // Calculate key points
  const arrowBase = {        // Where arrowhead wings attach (set back from tip)
    x: end.x - dirX * arrowLength,
    y: end.y - dirY * arrowLength
  };

  // 7-point polygon: body (4 corners) + arrowhead (3 points)
  return [
    // Body - starting from base left, going clockwise
    `${start.x + perpX * baseWidth},${start.y + perpY * baseWidth}`,      // 1. Base left
    `${start.x - perpX * baseWidth},${start.y - perpY * baseWidth}`,      // 2. Base right
    `${arrowBase.x - perpX * tipWidth},${arrowBase.y - perpY * tipWidth}`, // 3. Body tip right
    // Arrowhead
    `${arrowBase.x - perpX * arrowWidth},${arrowBase.y - perpY * arrowWidth}`, // 4. Arrow wing right
    `${end.x},${end.y}`,                                                   // 5. Arrow point (tip)
    `${arrowBase.x + perpX * arrowWidth},${arrowBase.y + perpY * arrowWidth}`, // 6. Arrow wing left
    // Back to body
    `${arrowBase.x + perpX * tipWidth},${arrowBase.y + perpY * tipWidth}`  // 7. Body tip left
  ].join(' ');
};

/**
 * TARGETING ARROW COMPONENT
 * Renders a sci-fi styled arrow with tapered body, glow effect, and animated pulses.
 * @param {boolean} visible - Whether arrow should be displayed
 * @param {Object} start - Starting position {x, y}
 * @param {Object} end - Ending position {x, y}
 * @param {Object} lineRef - React ref for the SVG polygon element (updates dynamically via setAttribute('points', ...))
 * @param {string} color - Optional color for the arrow (default: #ff0055)
 */
const TargetingArrow = ({ visible, start, end, lineRef, color = '#ff0055', zIndex = 15, showPulses = true }) => {
  debugLog('DRAG_DROP_DEPLOY', '🏹 TargetingArrow render', { visible, start, end, hasRef: !!lineRef, color });
  if (!visible) return null;

  // Generate unique ID for glow filter
  const colorId = color.replace('#', '');
  const glowId = `glow-${colorId}`;

  // Create SVG path string for animateMotion (from start to end)
  const pathD = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

  // Calculate tapered body polygon points (includes integrated arrowhead)
  const bodyPoints = calculatePolygonPoints(start, end);

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex }}>
      <defs>
        {/* Glow filter for energy effect */}
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow - tapered polygon with arrowhead */}
      <polygon
        points={bodyPoints}
        fill={color}
        filter={`url(#${glowId})`}
        opacity="0.3"
      />

      {/* Core tapered body with arrowhead - tracked by ref for dynamic updates */}
      <polygon
        ref={lineRef}
        points={bodyPoints}
        fill={color}
        opacity="0.8"
      />

      {/* Animated pulses - can be disabled for drone drag arrow */}
      {showPulses && (
        <>
          <circle r="6" fill={color} opacity="0.9">
            <animateMotion dur="0.5s" repeatCount="indefinite" path={pathD} />
          </circle>
          <circle r="5" fill={color} opacity="0.7">
            <animateMotion dur="0.5s" repeatCount="indefinite" path={pathD} begin="0.17s" />
          </circle>
          <circle r="4" fill={color} opacity="0.5">
            <animateMotion dur="0.5s" repeatCount="indefinite" path={pathD} begin="0.33s" />
          </circle>
        </>
      )}
    </svg>
  );
};

// Memoize to prevent re-renders during active drag operations.
// When the arrow is visible and controlled via lineRef (direct DOM updates),
// skip re-renders to avoid visual snap/jump artifacts.
export default React.memo(TargetingArrow, (prevProps, nextProps) => {
  // If visibility changed, allow re-render
  if (prevProps.visible !== nextProps.visible) return false;

  // If arrow is visible and has a lineRef, skip re-render
  // (the ref is being updated directly via DOM manipulation)
  if (nextProps.visible && nextProps.lineRef?.current) return true;

  // Otherwise, use default shallow comparison
  return (
    prevProps.start?.x === nextProps.start?.x &&
    prevProps.start?.y === nextProps.start?.y &&
    prevProps.end?.x === nextProps.end?.x &&
    prevProps.end?.y === nextProps.end?.y &&
    prevProps.color === nextProps.color &&
    prevProps.zIndex === nextProps.zIndex &&
    prevProps.showPulses === nextProps.showPulses
  );
});