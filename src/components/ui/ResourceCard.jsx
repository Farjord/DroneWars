// ========================================
// RESOURCE CARD COMPONENT
// ========================================
// Displays resource-type loot (salvage items, credits, tokens, AI cores) at 225×275px
// Simple design with header bar, background image, and footer value bar
// Matches DroneToken header/footer style
//
// Salvage items display:
// - Custom name in header
// - Unique image as background
// - Credit value in footer

import React from 'react';

// Resource type configuration for non-salvage items
const RESOURCE_CONFIG = {
  credits: {
    name: 'Credits',
    headerBg: 'bg-yellow-900',
    footerBg: 'bg-yellow-900',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-100',
    bgColor: 'bg-yellow-800/80',
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
  },
  // Salvage item styling (used when salvageItem prop is provided)
  salvageItem: {
    headerBg: 'bg-amber-900',
    footerBg: 'bg-amber-900',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-100',
    bgColor: 'bg-amber-800/80'
  }
};

/**
 * RESOURCE CARD COMPONENT
 * @param {string} resourceType - Type of resource ('credits', 'token', 'aiCores', 'salvageItem')
 * @param {number} amount - Amount of the resource (used for credits/token/aiCores)
 * @param {Object} salvageItem - Salvage item data { name, creditValue, image, description }
 * @param {boolean} isSelected - Whether card is selected
 * @param {Function} onClick - Click handler
 * @param {number} scale - Optional scale multiplier (default: 1.0)
 */
const ResourceCard = ({
  resourceType = 'credits',
  amount = 0,
  salvageItem = null,
  isSelected = false,
  onClick,
  scale = 1.0
}) => {
  // Determine if this is a salvage item
  const isSalvageItem = resourceType === 'salvageItem' || salvageItem !== null;

  // Get config based on type
  const config = isSalvageItem
    ? RESOURCE_CONFIG.salvageItem
    : (RESOURCE_CONFIG[resourceType] || RESOURCE_CONFIG.credits);

  // For salvage items, use item-specific data
  const displayName = isSalvageItem
    ? (salvageItem?.name || 'Unknown Item')
    : config.name;

  const displayValue = isSalvageItem
    ? (salvageItem?.creditValue || 0)
    : amount;

  const backgroundImage = isSalvageItem
    ? salvageItem?.image
    : config.bgImage;

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
        {/* Background - custom image or placeholder gradient */}
        {backgroundImage ? (
          <img
            src={backgroundImage}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              // Fallback to gradient if image fails to load
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-black/20" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header Bar - Item Name */}
          <div className={`${config.headerBg} flex items-center justify-center border-b ${config.borderColor} px-2 py-1 min-h-[32px]`}>
            <span
              className={`font-orbitron text-xs uppercase tracking-wide ${config.textColor} text-center leading-tight`}
              style={{
                // Scale down text for longer names
                fontSize: displayName.length > 20 ? '0.65rem' : '0.75rem'
              }}
            >
              {displayName}
            </span>
          </div>

          {/* Middle Area - Description for salvage items */}
          <div className="flex-1 flex items-center justify-center p-2">
            {isSalvageItem && salvageItem?.description && (
              <p className="text-xs text-gray-300 text-center italic opacity-80 px-2">
                {salvageItem.description}
              </p>
            )}
          </div>

          {/* Footer Bar - Credit Value Display */}
          <div className={`${config.footerBg} flex items-center justify-center border-t ${config.borderColor} h-10`}>
            <span className={`font-orbitron text-xl font-bold ${config.textColor}`}>
              {displayValue.toLocaleString()}
              {isSalvageItem && <span className="text-sm ml-1 opacity-80">cr</span>}
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
