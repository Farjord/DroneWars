// ========================================
// SHIP CARD COMPONENT
// ========================================
// Displays a ship card with stats and deck limits
// Similar structure to DroneCard.jsx
// Base size: 225px × 275px

import React from 'react';
import { Shield, Heart, Crosshair, Layers } from 'lucide-react';
import ScalingText from './ScalingText.jsx';

/**
 * SHIP CARD COMPONENT
 * @param {Object} ship - Ship data from shipData.js
 * @param {Function} onClick - Click handler
 * @param {boolean} isSelectable - Whether card can be selected
 * @param {boolean} isSelected - Whether card is selected
 * @param {number} scale - Optional scale multiplier (default: 1.0)
 */
const ShipCard = ({
  ship,
  onClick,
  isSelectable = true,
  isSelected = false,
  scale = 1.0
}) => {
  if (!ship) return null;

  const {
    name,
    description,
    image,
    rarity,
    baseHull,
    baseShields,
    baseThresholds,
    deckLimits
  } = ship;

  const isInteractive = isSelectable;

  // Apply scale transform if provided
  const scaleStyle = scale !== 1.0 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'center center'
  } : {};

  // Rarity colors
  const rarityColors = {
    Common: 'text-gray-300',
    Uncommon: 'text-green-400',
    Rare: 'text-blue-400',
    Mythic: 'text-purple-400'
  };

  return (
    <div
      onClick={isInteractive ? () => onClick(ship) : undefined}
      className={`
        rounded-lg p-[4px] relative group
        transition-all duration-200
        ${isInteractive ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}
        ${isSelected ? 'bg-cyan-400 ring-2 ring-cyan-300' : 'bg-cyan-800/80'}
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
        {/* Background - placeholder gradient for now */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-black/30" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="text-center py-1 px-2 bg-black/50 flex-shrink-0 h-8 flex items-center justify-center">
            <ScalingText text={name} className="font-orbitron text-sm uppercase tracking-widest whitespace-nowrap text-white" />
          </div>

          {/* Rarity Badge */}
          <div className="absolute top-8 right-2">
            <span className={`text-[10px] font-bold ${rarityColors[rarity] || 'text-gray-400'}`}>
              {rarity}
            </span>
          </div>

          {/* Combat Stats Section */}
          <div className="flex justify-around items-center px-2 py-3 flex-shrink-0 bg-black/30 mt-1">
            {/* Hull */}
            <div className="flex flex-col items-center">
              <Heart size={20} className="text-green-500 mb-1" />
              <span className="text-white font-bold text-lg">{baseHull}</span>
              <span className="text-[9px] text-gray-400">HULL</span>
            </div>

            {/* Shields */}
            <div className="flex flex-col items-center">
              <Shield size={20} className="text-cyan-400 mb-1" />
              <span className="text-white font-bold text-lg">{baseShields}</span>
              <span className="text-[9px] text-gray-400">SHIELDS</span>
            </div>

            {/* Thresholds */}
            <div className="flex flex-col items-center">
              <Crosshair size={20} className="text-orange-400 mb-1" />
              <span className="text-white font-bold text-lg">{baseThresholds.damaged}</span>
              <span className="text-[9px] text-gray-400">DMG THR</span>
            </div>
          </div>

          {/* Description */}
          <div className="mx-2 mt-2 px-2 py-1 bg-black/40 rounded text-[10px] text-gray-300 leading-tight flex-shrink-0">
            {description}
          </div>

          {/* Deck Limits Section */}
          <div className="mx-2 mt-auto mb-2 bg-black/60 backdrop-blur-sm border border-cyan-800/70 p-2 rounded-md">
            <div className="flex items-center gap-1 mb-1">
              <Layers size={12} className="text-cyan-400" />
              <span className="text-[10px] text-cyan-400 font-bold">DECK LIMITS</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-red-400">Ordnance:</span>
                <span className="text-white font-bold">{deckLimits.ordnanceLimit}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-blue-400">Tactic:</span>
                <span className="text-white font-bold">{deckLimits.tacticLimit}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-green-400">Support:</span>
                <span className="text-white font-bold">{deckLimits.supportLimit}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-purple-400">Upgrade:</span>
                <span className="text-white font-bold">{deckLimits.upgradeLimit}</span>
              </div>
            </div>
          </div>

          {/* Footer - Total Cards */}
          <div className="flex justify-center items-center p-1 border-t border-cyan-800/70 flex-shrink-0 h-8 bg-black/40">
            <span className="text-[10px] text-gray-400 mr-2">Total Cards:</span>
            <span className="text-white font-bold">{deckLimits.totalCards}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipCard;
