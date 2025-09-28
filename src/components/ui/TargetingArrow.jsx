// ========================================
// TARGETING ARROW COMPONENT
// ========================================
// Renders a visual arrow from attacking drone to target during combat.
// Uses SVG with dynamic positioning and dashed line animation.

import React from 'react';

/**
 * TARGETING ARROW COMPONENT
 * Renders a visual arrow from attacking drone to target during combat.
 * Uses SVG with dynamic positioning and dashed line animation.
 * @param {boolean} visible - Whether arrow should be displayed
 * @param {Object} start - Starting position {x, y}
 * @param {Object} end - Ending position {x, y}
 * @param {Object} lineRef - React ref for the SVG line element
 */
const TargetingArrow = ({ visible, start, end, lineRef }) => {
  if (!visible) return null;

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-40">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7"
        refX="0" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#ff0055" />
        </marker>
      </defs>
      <line
        ref={lineRef}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="#ff0055"
        strokeWidth="4"
        markerEnd="url(#arrowhead)"
        strokeDasharray="10, 5"
      />
    </svg>
  );
};

export default TargetingArrow;