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

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 4,
        width: 'clamp(88px, 9.5vw, 120px)',
        height: 'clamp(76px, 8.2vw, 104px)',
        cursor: handleClick ? 'pointer' : 'default',
        alignSelf: 'center',
        flexShrink: 0,
        marginBottom: 'clamp(-18px, -2vw, -12px)',
        ...(side === 'opponent'
          ? { marginRight: 'clamp(-40px, -4vw, -30px)' }
          : { marginLeft: 'clamp(-40px, -4vw, -30px)' }),
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
            bottom: '14px',
            right: '12px',
            transform: 'translate(25%, 25%)',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'rgba(10, 14, 24, 0.85)',
            border: `1.5px solid ${factionColors.border}`,
            opacity: 0.8,
            transition: 'opacity 0.2s ease',
          }}
        >
          <Settings size={17} color={factionColors.primary} />
        </div>
      )}

      {/* Children slot for dropdown positioning */}
      {children}
    </div>
  );
};

export default ShipHexPortrait;
