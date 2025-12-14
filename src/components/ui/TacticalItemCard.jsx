/**
 * TacticalItemCard Component
 * Displays a tactical item card (225×275px) similar to ResourceCard
 * Used in Shop modal and Inventory modal
 */

import React from 'react';

// Tactical item color theme (cyan/teal)
const TACTICAL_THEME = {
  headerBg: 'bg-cyan-900',
  footerBg: 'bg-cyan-900',
  borderColor: 'border-cyan-400',
  textColor: 'text-cyan-100',
  bgColor: 'bg-cyan-800/80'
};

/**
 * TacticalItemCard Component
 * @param {Object} item - Tactical item data { id, name, type, cost, maxCapacity, image, description }
 * @param {boolean} showCost - Show cost in footer (shop mode)
 * @param {boolean} showQuantity - Show owned/max quantity (inventory mode)
 * @param {number} owned - Current owned quantity
 * @param {boolean} isSelected - Whether card is selected
 * @param {boolean} disabled - Whether Buy button is disabled
 * @param {Function} onClick - Click handler for the card
 * @param {Function} onBuy - Buy button click handler
 * @param {number} scale - Optional scale multiplier (default: 1.0)
 */
const TacticalItemCard = ({
  item,
  showCost = false,
  showQuantity = false,
  owned = 0,
  isSelected = false,
  disabled = false,
  onClick,
  onBuy,
  scale = 1.0
}) => {
  if (!item) return null;

  const config = TACTICAL_THEME;

  // Apply scale transform if provided
  const scaleStyle = scale !== 1.0 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'center center'
  } : {};

  const handleCardClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const handleBuyClick = (e) => {
    e.stopPropagation();
    if (onBuy && !disabled) {
      onBuy(item);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        rounded-lg p-[4px] relative group
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:scale-105' : ''}
        ${isSelected ? 'bg-green-400 ring-2 ring-green-300 selected' : config.bgColor}
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
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            role="img"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              // Fallback to gradient if image fails to load
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-700 via-cyan-800 to-cyan-900" />
        )}
        <div className="absolute inset-0 bg-black/30" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header Bar - Item Name */}
          <div className={`${config.headerBg} flex items-center justify-center border-b ${config.borderColor} px-2 py-1 min-h-[32px]`}>
            <span
              className={`font-orbitron text-xs uppercase tracking-wide ${config.textColor} text-center leading-tight`}
              style={{
                fontSize: item.name.length > 20 ? '0.65rem' : '0.75rem'
              }}
            >
              {item.name}
            </span>
          </div>

          {/* Middle Area - Description */}
          <div className="flex-1 flex items-center justify-center p-3">
            <p className="text-xs text-gray-200 text-center leading-relaxed px-2">
              {item.description}
            </p>
          </div>

          {/* Footer Bar */}
          <div className={`${config.footerBg} flex flex-col items-center justify-center border-t ${config.borderColor} py-2 min-h-[50px]`}>
            {showCost && (
              <>
                <span className={`font-orbitron text-lg font-bold text-yellow-400`}>
                  {item.cost.toLocaleString()}
                  <span className="text-sm ml-1 opacity-80">cr</span>
                </span>
                {onBuy && (
                  <button
                    onClick={handleBuyClick}
                    disabled={disabled}
                    className={`
                      mt-1 px-4 py-1 text-xs font-orbitron uppercase tracking-wide rounded
                      transition-all duration-200
                      ${disabled
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer'
                      }
                    `}
                  >
                    Buy
                  </button>
                )}
              </>
            )}

            {showQuantity && (
              <div className="flex items-center gap-1">
                <span className={`font-orbitron text-lg font-bold ${config.textColor}`}>
                  {owned}
                </span>
                <span className={`font-orbitron text-sm opacity-70 ${config.textColor}`}>
                  / {item.maxCapacity}
                </span>
              </div>
            )}

            {!showCost && !showQuantity && (
              <span className={`font-orbitron text-sm ${config.textColor} opacity-70`}>
                Max: {item.maxCapacity}
              </span>
            )}
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

export default TacticalItemCard;
