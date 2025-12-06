// ========================================
// SHIP SECTION CARD COMPONENT
// ========================================
// Displays a ship section card with stats and ability
// Similar structure to ShipCard.jsx
// Base size: 225px × 275px

import React from 'react';
import { HardDrive, Cpu, Zap, Command } from 'lucide-react';
import ScalingText from './ScalingText.jsx';
import RaritySymbol from './RaritySymbol.jsx';
import { getCardBorderClasses } from '../../utils/cardBorderUtils.js';

/**
 * SHIP SECTION CARD COMPONENT
 * @param {Object} section - Ship section data from shipSectionData.js
 * @param {Function} onClick - Click handler
 * @param {boolean} isSelectable - Whether card can be selected
 * @param {boolean} isSelected - Whether card is selected
 * @param {number} scale - Optional scale multiplier (default: 1.0)
 */
const ShipSectionCard = ({
  section,
  onClick,
  isSelectable = true,
  isSelected = false,
  scale = 1.0
}) => {
  if (!section) return null;

  const {
    name,
    type,
    description,
    rarity,
    hull,
    maxHull,
    shields,
    thresholds,
    ability
  } = section;

  const isInteractive = isSelectable && onClick;

  // Apply scale transform if provided
  const scaleStyle = scale !== 1.0 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'center center'
  } : {};

  // Type-specific colors and icons
  const typeConfig = {
    'Bridge': { color: 'cyan', icon: Command, bgGradient: 'from-cyan-900 via-slate-900 to-slate-950' },
    'Power Cell': { color: 'yellow', icon: Zap, bgGradient: 'from-yellow-900/50 via-slate-900 to-slate-950' },
    'Drone Control Hub': { color: 'green', icon: Cpu, bgGradient: 'from-green-900/50 via-slate-900 to-slate-950' }
  };

  const config = typeConfig[type] || typeConfig['Bridge'];
  const TypeIcon = config.icon;

  // Rarity colors
  const rarityColors = {
    Common: 'text-gray-300',
    Uncommon: 'text-green-400',
    Rare: 'text-blue-400',
    Mythic: 'text-purple-400'
  };

  // Map section types to card types for border color
  const getSectionTypeForBorder = (sectionType) => {
    switch (sectionType) {
      case 'Bridge': return 'Tactic';           // Cyan
      case 'Power Cell': return 'Ordnance';     // Red
      case 'Drone Control Hub': return 'Support'; // Green
      default: return 'Tactic';
    }
  };

  // Get rarity-based border classes
  const isDisabled = !isInteractive;
  const borderClasses = getCardBorderClasses(getSectionTypeForBorder(type), rarity, isDisabled);

  return (
    <div
      onClick={isInteractive ? () => onClick(section) : undefined}
      className={`
        rounded-lg p-[4px] relative group
        transition-all duration-200
        ${isInteractive ? 'cursor-pointer hover:scale-105' : ''}
        ${isSelected ? 'bg-cyan-400 ring-2 ring-cyan-300' : borderClasses}
        ${isDisabled ? 'saturate-50' : ''}
      `}
      style={{
        width: '225px',
        height: '275px',
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)',
        ...scaleStyle
      }}
    >
      <div
        className="w-full h-full relative flex flex-col font-orbitron text-cyan-300 overflow-hidden"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
      >
        {/* Background gradient based on type */}
        <div className={`absolute inset-0 bg-gradient-to-b ${config.bgGradient}`} />
        <div className="absolute inset-0 bg-black/30" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header with name */}
          <div className="text-center py-1 px-2 bg-black/50 flex-shrink-0 h-8 flex items-center justify-center">
            <ScalingText text={name} className="font-orbitron text-sm uppercase tracking-widest whitespace-nowrap text-white" />
          </div>

          {/* Rarity Badge */}
          <div className="absolute top-8 right-2 flex items-center gap-1">
            <RaritySymbol rarity={rarity} size={12} />
            <span className={`text-[10px] font-bold ${rarityColors[rarity] || 'text-gray-400'}`}>
              {rarity}
            </span>
          </div>

          {/* Type Icon & Label */}
          <div className="flex items-center justify-center gap-2 mt-2 px-2">
            <TypeIcon size={24} className={`text-${config.color}-400`} />
            <span className="text-[11px] text-gray-300 uppercase tracking-wide">{type}</span>
          </div>

          {/* Stats Section */}
          <div className="flex justify-around items-center px-2 py-2 flex-shrink-0 bg-black/30 mt-2">
            {/* Hull */}
            <div className="flex flex-col items-center">
              <HardDrive size={16} className="text-cyan-400 mb-1" />
              <span className="text-white font-bold text-sm">{hull}/{maxHull || hull}</span>
              <span className="text-[8px] text-gray-400">HULL</span>
            </div>

            {/* Shields */}
            <div className="flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.6" className="text-cyan-400 mb-1">
                <path d="M12,0 L24,6 L24,18 L12,24 L0,18 L0,6 Z" stroke="currentColor" strokeWidth="1.5"></path>
              </svg>
              <span className="text-white font-bold text-sm">{shields}</span>
              <span className="text-[8px] text-gray-400">SHIELDS</span>
            </div>

            {/* Damage Threshold */}
            <div className="flex flex-col items-center">
              <span className="text-orange-400 text-xs font-bold mb-1">!</span>
              <span className="text-white font-bold text-sm">{thresholds?.damaged || 5}</span>
              <span className="text-[8px] text-gray-400">DMG THR</span>
            </div>
          </div>

          {/* Description */}
          <div className="mx-2 mt-1 px-2 py-1 bg-black/40 rounded text-[9px] text-gray-300 leading-tight flex-shrink-0">
            {description}
          </div>

          {/* Ability Section */}
          {ability && (
            <div className="mx-2 mt-auto mb-2 bg-black/60 backdrop-blur-sm border border-cyan-800/70 p-2 rounded-md">
              <div className="flex items-center gap-1 mb-1">
                <Zap size={10} className="text-yellow-400" />
                <span className="text-[9px] text-yellow-400 font-bold uppercase">{ability.name}</span>
                {ability.cost?.energy && (
                  <span className="ml-auto text-[9px] text-yellow-300 bg-yellow-900/50 px-1 rounded">
                    {ability.cost.energy}⚡
                  </span>
                )}
              </div>
              <p className="text-[8px] text-gray-300 leading-tight">
                {ability.description}
              </p>
            </div>
          )}

          {/* Footer - Type Label */}
          <div className="flex justify-center items-center p-1 border-t border-slate-700/70 flex-shrink-0 h-6 bg-black/40 mt-auto">
            <span className="text-[9px] text-gray-400 uppercase tracking-wider">{type}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipSectionCard;
