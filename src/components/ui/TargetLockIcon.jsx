// ========================================
// TARGET LOCK ICON COMPONENT
// ========================================
// Custom SVG icon for marked drones with tactical HUD style
// Features corner brackets and center crosshair with black outline for contrast

import React from 'react';

/**
 * TARGET LOCK ICON
 * Military/sci-fi style target lock indicator with corner brackets
 * @param {number} size - Icon size in pixels (default: 24)
 */
const TargetLockIcon = ({ size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="target-lock-icon"
    >
      {/* TOP-LEFT CORNER - Black outline then red */}
      <path
        d="M3 3 L3 8 M3 3 L8 3"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M3 3 L3 8 M3 3 L8 3"
        stroke="#ef4444"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* TOP-RIGHT CORNER - Black outline then red */}
      <path
        d="M21 3 L21 8 M21 3 L16 3"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M21 3 L21 8 M21 3 L16 3"
        stroke="#ef4444"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* BOTTOM-LEFT CORNER - Black outline then red */}
      <path
        d="M3 21 L3 16 M3 21 L8 21"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M3 21 L3 16 M3 21 L8 21"
        stroke="#ef4444"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* BOTTOM-RIGHT CORNER - Black outline then red */}
      <path
        d="M21 21 L21 16 M21 21 L16 21"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M21 21 L21 16 M21 21 L16 21"
        stroke="#ef4444"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* CENTER CROSSHAIR - Black outline then red */}
      <circle
        cx="12"
        cy="12"
        r="2"
        stroke="black"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="12"
        cy="12"
        r="2"
        stroke="#ef4444"
        strokeWidth="1"
        fill="none"
      />

      {/* CENTER DOT - Pulsing indicator */}
      <circle
        cx="12"
        cy="12"
        r="0.75"
        fill="#ef4444"
        className="animate-ping"
      />
      <circle
        cx="12"
        cy="12"
        r="0.75"
        fill="#ef4444"
      />
    </svg>
  );
};

export default TargetLockIcon;
