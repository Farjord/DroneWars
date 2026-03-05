// ========================================
// SHIP HEX PORTRAIT COMPONENT
// ========================================
// Double-layer SVG hexagonal portrait for ship display
// Used in game header for player and opponent ship images

import React from 'react';
import { Settings } from 'lucide-react';

// Flat-bottom hex orientation (flat edges on top and bottom)
const HEX_POINTS = '88,38 66,76 22,76 0,38 22,0 66,0';

const ShipHexPortrait = ({ side, shipImageUrl, isClickable = false, onClick, factionColors, children }) => {
  const handleClick = isClickable && onClick ? onClick : undefined;

  const positionStyle = side === 'opponent'
    ? { left: '-1%' }
    : { right: '-1%' };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-45%)',
        zIndex: 4,
        width: 'clamp(88px, 9.5vw, 120px)',
        height: 'clamp(76px, 8.2vw, 104px)',
        cursor: handleClick ? 'pointer' : 'default',
        ...positionStyle,
      }}
      onClick={handleClick}
    >
      <svg
        viewBox="0 0 88 76"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Hex with border */}
        <polygon
          points={HEX_POINTS}
          fill="rgba(10, 14, 24, 0.9)"
          stroke={factionColors.borderStrong}
          strokeWidth="2"
        />

        {/* Clipped ship image */}
        <defs>
          <clipPath id={`hex-clip-${side}`}>
            <polygon points={HEX_POINTS} />
          </clipPath>
        </defs>
        <image
          href={shipImageUrl}
          x="0"
          y="0"
          width="88"
          height="76"
          clipPath={`url(#hex-clip-${side})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </svg>

      {/* Cog badge for clickable (player) hex */}
      {isClickable && (
        <div
          data-testid="cog-badge"
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'rgba(10, 14, 24, 0.8)',
            border: `1px solid ${factionColors.border}`,
            opacity: 0.7,
            transition: 'opacity 0.2s ease',
          }}
        >
          <Settings size={11} color={factionColors.primary} />
        </div>
      )}

      {/* Children slot for dropdown positioning */}
      {children}
    </div>
  );
};

export default ShipHexPortrait;
