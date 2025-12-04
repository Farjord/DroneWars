// ========================================
// CARD BACK PLACEHOLDER COMPONENT
// ========================================
// Matches ActionCard base dimensions (225×275px)
// Used for deck and empty discard pile display

import React, { useState } from 'react';

// Color schemes for different variants
const getColors = (variant) => {
  switch (variant) {
    case 'discard':
      return {
        background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 25%, #1f1f35 50%, #2a2a40 75%, #12121f 100%)',
        border: 'rgba(156, 163, 175, 0.6)',
        glow: 'rgba(156, 163, 175, 0.3)',
        glowInner: 'rgba(156, 163, 175, 0.1)',
        hoverGlow: 'rgba(156, 163, 175, 0.8)',
        hoverBorder: 'rgba(209, 213, 219, 0.9)',
        accent: 'rgba(156, 163, 175, 0.7)',
        accentMid: 'rgba(107, 114, 128, 0.35)',
        accentBright: 'rgba(156, 163, 175, 0.5)',
        accentBrightest: 'rgba(156, 163, 175, 0.7)',
        fill: 'rgba(107, 114, 128, 0.15)',
        circuit: '#9ca3af',
        circuitNode: '#6b7280',
        circuitNodeBright: '#9ca3af',
        dot: 'rgba(156, 163, 175, 0.6)',
        line: 'rgba(156, 163, 175, 0.4)'
      };
    case 'deck':
    default:
      return {
        background: 'linear-gradient(135deg, #0a1628 0%, #0e2a4a 25%, #0c1929 50%, #0a2540 75%, #061018 100%)',
        border: 'rgba(6, 182, 212, 0.6)',
        glow: 'rgba(6, 182, 212, 0.4)',
        glowInner: 'rgba(6, 182, 212, 0.15)',
        hoverGlow: 'rgba(34, 211, 238, 0.8)',
        hoverBorder: 'rgba(34, 211, 238, 0.9)',
        accent: 'rgba(34, 211, 238, 0.7)',
        accentMid: 'rgba(6, 182, 212, 0.35)',
        accentBright: 'rgba(34, 211, 238, 0.5)',
        accentBrightest: 'rgba(34, 211, 238, 0.7)',
        fill: 'rgba(6, 182, 212, 0.15)',
        circuit: '#22d3ee',
        circuitNode: '#06b6d4',
        circuitNodeBright: '#22d3ee',
        dot: 'rgba(34, 211, 238, 0.6)',
        line: 'rgba(34, 211, 238, 0.4)'
      };
  }
};

function CardBackPlaceholder({
  scale = 1,
  variant = 'deck',
  onClick = () => {},
  isHovered: externalHovered = null  // Optional external hover control
}) {
  const [internalHovered, setInternalHovered] = useState(false);
  const isHovered = externalHovered !== null ? externalHovered : internalHovered;
  const colors = getColors(variant);

  // Use transform: scale() like ActionCard does
  // This ensures same layout space is occupied
  // Only apply hover scale if using internal hover (not controlled externally by wrapper)
  const hoverScale = (externalHovered === null && isHovered) ? 1.05 : 1;
  const scaleStyle = {
    transform: `scale(${scale * hoverScale})`,
    transformOrigin: 'center center'
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setInternalHovered(true)}
      onMouseLeave={() => setInternalHovered(false)}
      style={{
        width: '225px',
        height: '275px',
        flexShrink: 0,
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)',
        background: colors.background,
        border: isHovered
          ? `4px solid ${colors.hoverBorder}`
          : `4px solid ${colors.border}`,
        boxShadow: isHovered
          ? `0 0 25px ${colors.hoverGlow}, 0 0 40px ${colors.hoverGlow}`
          : `0 0 20px ${colors.glow}, inset 0 0 40px ${colors.glowInner}`,
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        ...scaleStyle
      }}
    >
      {/* Background circuit pattern */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 130"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0.12 }}
      >
        {/* Horizontal circuit lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke={colors.circuit} strokeWidth="0.5" />
        <line x1="0" y1="65" x2="100" y2="65" stroke={colors.circuit} strokeWidth="0.5" />
        <line x1="0" y1="105" x2="100" y2="105" stroke={colors.circuit} strokeWidth="0.5" />
        {/* Vertical circuit lines */}
        <line x1="20" y1="0" x2="20" y2="130" stroke={colors.circuit} strokeWidth="0.5" />
        <line x1="50" y1="0" x2="50" y2="130" stroke={colors.circuit} strokeWidth="0.5" />
        <line x1="80" y1="0" x2="80" y2="130" stroke={colors.circuit} strokeWidth="0.5" />
        {/* Circuit nodes */}
        <circle cx="20" cy="25" r="2" fill={colors.circuitNode} opacity="0.6" />
        <circle cx="80" cy="25" r="2" fill={colors.circuitNode} opacity="0.6" />
        <circle cx="50" cy="65" r="3" fill={colors.circuitNodeBright} opacity="0.8" />
        <circle cx="20" cy="105" r="2" fill={colors.circuitNode} opacity="0.6" />
        <circle cx="80" cy="105" r="2" fill={colors.circuitNode} opacity="0.6" />
      </svg>

      {/* Corner accents - top left */}
      <div style={{
        position: 'absolute', top: '4px', left: '4px',
        width: '16px', height: '16px',
        borderTop: `2px solid ${colors.accent}`,
        borderLeft: `2px solid ${colors.accent}`
      }} />
      {/* Corner accents - top right */}
      <div style={{
        position: 'absolute', top: '4px', right: '4px',
        width: '16px', height: '16px',
        borderTop: `2px solid ${colors.accent}`,
        borderRight: `2px solid ${colors.accent}`
      }} />
      {/* Corner accents - bottom left */}
      <div style={{
        position: 'absolute', bottom: '4px', left: '4px',
        width: '16px', height: '16px',
        borderBottom: `2px solid ${colors.accent}`,
        borderLeft: `2px solid ${colors.accent}`
      }} />

      {/* Layered hexagon pattern */}
      <svg
        width="70"
        height="80"
        viewBox="0 0 100 115"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Outermost hexagon - faint */}
        <polygon
          points="50,2 95,27 95,88 50,113 5,88 5,27"
          fill="none"
          stroke={colors.accentMid}
          strokeWidth="1"
        />
        {/* Middle hexagon */}
        <polygon
          points="50,12 85,32 85,83 50,103 15,83 15,32"
          fill="none"
          stroke={colors.accentMid}
          strokeWidth="1.5"
        />
        {/* Inner hexagon - brighter */}
        <polygon
          points="50,22 75,37 75,78 50,93 25,78 25,37"
          fill="none"
          stroke={colors.accentBright}
          strokeWidth="2"
        />
        {/* Center hexagon - brightest */}
        <polygon
          points="50,35 62,43 62,72 50,80 38,72 38,43"
          fill={colors.fill}
          stroke={colors.accentBrightest}
          strokeWidth="1.5"
        />
        {/* Central dot */}
        <circle cx="50" cy="57.5" r="4" fill={colors.dot} />
        <circle cx="50" cy="57.5" r="2" fill="rgba(255, 255, 255, 0.8)" />

        {/* Decorative lines radiating from center */}
        <line x1="50" y1="35" x2="50" y2="22" stroke={colors.line} strokeWidth="1" />
        <line x1="62" y1="43" x2="75" y2="37" stroke={colors.line} strokeWidth="1" />
        <line x1="62" y1="72" x2="75" y2="78" stroke={colors.line} strokeWidth="1" />
        <line x1="50" y1="80" x2="50" y2="93" stroke={colors.line} strokeWidth="1" />
        <line x1="38" y1="72" x2="25" y2="78" stroke={colors.line} strokeWidth="1" />
        <line x1="38" y1="43" x2="25" y2="37" stroke={colors.line} strokeWidth="1" />
      </svg>

      {/* Glow effect overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${colors.glowInner} 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} />
    </div>
  );
}

export default CardBackPlaceholder;
