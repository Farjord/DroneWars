// ========================================
// CORVETTE ICON COMPONENT
// ========================================
// Animated Corvette Ship Icon for Tactical Map.
// Creates a simple line representation of a corvette that looks
// like a blueprint schematic with animated engine glow.
//
// Note: Rotation is handled by the parent ShipIconRenderer wrapper,
// so the internal rotate animation has been removed.

import React from 'react';

/**
 * CorvetteIcon - SVG ship icon for the Reconnaissance Corvette
 *
 * @param {number} size - Size of the icon in pixels (default: 40)
 * @param {number} speed - Animation speed multiplier (default: 1)
 * @param {string} color - Color of the ship lines (default: 'white')
 */
const CorvetteIcon = ({
  size = 40,
  speed = 1,
  color = 'white'
}) => {
  return (
    <div
      className="corvette-icon"
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg
        viewBox="0 0 60 20"
        width={size}
        height={size * 0.33}
        style={{
          filter: `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 8px ${color})`
        }}
      >
        {/* Main hull - elongated pointed shape */}
        <path
          d="M 2,10 L 15,10 L 20,7 L 35,7 L 35,13 L 20,13 L 15,10"
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bridge/superstructure detail */}
        <path
          d="M 15,8 L 15,12 M 18,7.5 L 18,10"
          stroke={color}
          strokeWidth="0.6"
          strokeLinecap="round"
        />

        {/* Engine section - the distinctive wide rear */}
        <rect
          x="35"
          y="5"
          width="10"
          height="10"
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          rx="1"
        />

        {/* Engine details - horizontal lines */}
        <path
          d="M 36,8 L 44,8 M 36,10 L 44,10 M 36,12 L 44,12"
          stroke={color}
          strokeWidth="0.4"
          opacity="0.7"
        />

        {/* Engine glow - animated pulse */}
        <circle
          cx="49"
          cy="10"
          r="2"
          fill={color}
          opacity="0.6"
        >
          <animate
            attributeName="opacity"
            values="0.3;0.8;0.3"
            dur={`${2 / speed}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="1.5;2.5;1.5"
            dur={`${2 / speed}s`}
            repeatCount="indefinite"
          />
        </circle>

        {/* Thruster trails */}
        <path
          d="M 50,10 L 58,10"
          stroke={color}
          strokeWidth="0.6"
          opacity="0.4"
          strokeLinecap="round"
        >
          <animate
            attributeName="opacity"
            values="0.2;0.5;0.2"
            dur={`${1.5 / speed}s`}
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  );
};

export default CorvetteIcon;
