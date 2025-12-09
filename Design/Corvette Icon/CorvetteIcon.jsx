import React from 'react';

/**
 * Animated Corvette Ship Icon for Tactical Map
 * 
 * This creates a simple white-line representation of your corvette that looks
 * like a blueprint schematic. The ship drifts and rotates slightly to show movement.
 * 
 * Props:
 * - size: number (default 40) - Size of the icon in pixels
 * - speed: number (default 1) - Animation speed multiplier
 * - color: string (default 'white') - Color of the ship lines
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
        position: 'relative'
      }}
    >
      <svg
        viewBox="0 0 60 20"
        width={size}
        height={size * 0.33}
        style={{
          filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.3))'
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

      <style>{`
        .corvette-icon {
          animation: drift ${8 / speed}s ease-in-out infinite,
                     rotate ${12 / speed}s ease-in-out infinite;
        }
        
        @keyframes drift {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(2px, -1px);
          }
          50% {
            transform: translate(1px, 1px);
          }
          75% {
            transform: translate(-1px, 0px);
          }
        }
        
        @keyframes rotate {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }
      `}</style>
    </div>
  );
};

export default CorvetteIcon;
