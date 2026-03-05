// ========================================
// SHIP HEX PORTRAIT COMPONENT
// ========================================
// Double-layer SVG hexagonal portrait for ship display
// Used in game header for player and opponent ship images

import React from 'react';
import { Settings } from 'lucide-react';

const OUTER_HEX = '39,0 78,22 78,66 39,88 0,66 0,22';
const INNER_HEX = '39,8 70,26 70,62 39,80 8,62 8,26';

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
        transform: 'translateY(-50%)',
        zIndex: 4,
        width: 'clamp(60px, 6.5vw, 82px)',
        height: 'clamp(68px, 7.5vw, 92px)',
        cursor: handleClick ? 'pointer' : 'default',
        ...positionStyle,
      }}
      onClick={handleClick}
    >
      <svg
        viewBox="0 0 78 88"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer hex border */}
        <polygon
          points={OUTER_HEX}
          fill="none"
          stroke={factionColors.borderStrong}
          strokeWidth="2"
        />

        {/* Inner hex with background */}
        <polygon
          points={INNER_HEX}
          fill="rgba(10, 14, 24, 0.9)"
          stroke={factionColors.border}
          strokeWidth="1.5"
        />

        {/* Clipped ship image */}
        <defs>
          <clipPath id={`hex-clip-${side}`}>
            <polygon points={INNER_HEX} />
          </clipPath>
        </defs>
        <image
          href={shipImageUrl}
          x="4"
          y="4"
          width="70"
          height="80"
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
