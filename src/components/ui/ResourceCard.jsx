// ========================================
// RESOURCE CARD COMPONENT
// ========================================
// Displays resource-type loot (credits, tokens, AI cores) at 225×275px
// Simple design with header bar, background image, and footer value bar
// Matches DroneToken header/footer style

import React from 'react';

// Resource type configuration
const RESOURCE_CONFIG = {
  credits: {
    name: 'Credits',
    headerBg: 'bg-yellow-900',
    footerBg: 'bg-yellow-900',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-100',
    bgColor: 'bg-yellow-800/80',
    // Placeholder background - will be replaced with PNG
    bgImage: null
  },
  token: {
    name: 'Token',
    headerBg: 'bg-cyan-900',
    footerBg: 'bg-cyan-900',
    borderColor: 'border-cyan-400',
    textColor: 'text-cyan-100',
    bgColor: 'bg-cyan-800/80',
    bgImage: null
  },
  aiCores: {
    name: 'AI Core',
    headerBg: 'bg-purple-900',
    footerBg: 'bg-purple-900',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-100',
    bgColor: 'bg-purple-800/80',
    bgImage: null
  }
};

/**
 * RESOURCE CARD COMPONENT
 * @param {string} resourceType - Type of resource ('credits', 'token', 'aiCores')
 * @param {number} amount - Amount of the resource
 * @param {boolean} isSelected - Whether card is selected
 * @param {Function} onClick - Click handler
 * @param {number} scale - Optional scale multiplier (default: 1.0)
 */
const ResourceCard = ({
  resourceType = 'credits',
  amount = 0,
  isSelected = false,
  onClick,
  scale = 1.0
}) => {
  const config = RESOURCE_CONFIG[resourceType] || RESOURCE_CONFIG.credits;

  // Apply scale transform if provided
  const scaleStyle = scale !== 1.0 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'center center'
  } : {};

  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg p-[4px] relative group
        transition-all duration-200
        cursor-pointer hover:scale-105
        ${isSelected ? 'bg-green-400 ring-2 ring-green-300' : config.bgColor}
      `}
      style={{
        width: '225px',
        height: '275px',
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)',
        ...scaleStyle
      }}
    >
      <div
        className={`w-full h-full relative flex flex-col font-orbitron overflow-hidden border ${config.borderColor}`}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
      >
        {/* Background - placeholder gradient until PNG provided */}
        {config.bgImage ? (
          <img
            src={config.bgImage}
            alt={config.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-black/20" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header Bar */}
          <div className={`${config.headerBg} flex items-center justify-center border-b ${config.borderColor} h-8`}>
            <span className={`font-orbitron text-sm uppercase tracking-widest ${config.textColor}`}>
              {config.name}
            </span>
          </div>

          {/* Spacer - fills middle area */}
          <div className="flex-1" />

          {/* Footer Bar - Value Display */}
          <div className={`${config.footerBg} flex items-center justify-center border-t ${config.borderColor} h-10`}>
            <span className={`font-orbitron text-2xl font-bold ${config.textColor}`}>
              {amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Selected Indicator Overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-green-500/20 pointer-events-none" />
        )}
      </div>
    </div>
  );
};

export default ResourceCard;
