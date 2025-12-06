// ========================================
// SHIP CARD COMPONENT - HORIZONTAL LAYOUT
// ========================================
// Large format ship card for deck builder
// Layout: Image (left) | Stats & Abilities (right) | Deck Bars (bottom)
// Size: ~800px wide × ~280px tall

import React from 'react';
import { Crosshair, Layers } from 'lucide-react';
import ScalingText from './ScalingText.jsx';
import RaritySymbol from './RaritySymbol.jsx';
import { getShipBorderClasses } from '../../utils/cardBorderUtils.js';

/**
 * Deck Composition Bars Sub-component
 * Shows proportional bars for ordnance/tactic/support/upgrade limits
 */
const DeckCompositionBars = ({ limits }) => {
  const totalLimits = limits.ordnanceLimit + limits.tacticLimit +
                      limits.supportLimit + limits.upgradeLimit;

  const barData = [
    { key: 'ordnance', label: 'Ordnance', value: limits.ordnanceLimit, bgColor: 'bg-red-500', textColor: 'text-red-400' },
    { key: 'tactic', label: 'Tactic', value: limits.tacticLimit, bgColor: 'bg-cyan-500', textColor: 'text-cyan-400' },
    { key: 'support', label: 'Support', value: limits.supportLimit, bgColor: 'bg-emerald-500', textColor: 'text-emerald-400' },
    { key: 'upgrade', label: 'Upgrade', value: limits.upgradeLimit, bgColor: 'bg-purple-500', textColor: 'text-purple-400' },
  ];

  return (
    <div className="ship-card-deck-bars ship-card-section">
      <div className="flex items-center gap-1 mb-1">
        <Layers size={12} className="text-cyan-400" />
        <span className="text-[10px] text-cyan-400 font-orbitron uppercase tracking-wider">
          Deck ({limits.totalCards})
        </span>
      </div>
      <div className="flex h-5 rounded overflow-hidden border border-cyan-800/50">
        {barData.map(({ key, label, value, bgColor }) => (
          <div
            key={key}
            className={`${bgColor} flex items-center justify-center relative transition-all`}
            style={{ width: `${(value / totalLimits) * 100}%` }}
            title={`${label}: ${value}`}
          >
            <span className="text-[10px] text-white font-bold drop-shadow-md">{value}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] mt-0.5 px-0.5">
        {barData.map(({ key, label, textColor }) => (
          <span key={key} className={`${textColor} font-exo`}>{label}</span>
        ))}
      </div>
    </div>
  );
};

/**
 * SHIP CARD COMPONENT - HORIZONTAL LAYOUT
 * @param {Object} ship - Ship data from shipData.js
 * @param {Function} onClick - Click handler
 * @param {boolean} isSelectable - Whether card can be selected
 * @param {boolean} isSelected - Whether card is selected
 */
const ShipCard = ({
  ship,
  onClick,
  isSelectable = true,
  isSelected = false,
  scale = 1.0,
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
    deckLimits,
    shipAbility
  } = ship;

  const isInteractive = isSelectable;

  // Get rarity-based border classes
  const borderClasses = getShipBorderClasses(rarity, isSelected);

  // Rarity text colors
  const rarityColors = {
    Common: 'text-gray-300',
    Uncommon: 'text-green-400',
    Rare: 'text-blue-400',
    Mythic: 'text-purple-400'
  };

  // Base dimensions for scaling calculations
  const baseWidth = 800;
  const baseHeight = 280;

  // The card JSX (used in both scaled and non-scaled renders)
  const cardContent = (
    <div
        onClick={isInteractive ? () => onClick(ship) : undefined}
        className={`
          ship-card-horizontal
          rounded-lg
          ${isInteractive ? 'cursor-pointer' : 'cursor-not-allowed'}
          ${isSelected ? 'ship-card-selected' : ''}
          ${borderClasses}
        `}
      >
        {/* LEFT: Ship Image Section */}
      <div className="ship-card-image-section">
        {image ? (
          <img src={image} alt={name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <span className="text-gray-500 text-sm font-orbitron">No Image</span>
          </div>
        )}
      </div>

      {/* RIGHT: Content Area */}
      <div className="ship-card-content">
        {/* Header Row - Name and Rarity */}
        <div className="ship-card-header">
          <ScalingText
            text={name}
            className="font-orbitron text-xl uppercase tracking-widest text-white"
          />
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${rarityColors[rarity] || 'text-gray-400'}`}>
              {rarity}
            </span>
            <RaritySymbol rarity={rarity} size={20} />
          </div>
        </div>

        {/* Middle Row - Stats and Abilities */}
        <div className="ship-card-middle">
          {/* Stats Column - wrapped in section box */}
          <div className="ship-card-stats ship-card-section">
            {/* Hull */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-cyan-400 border border-black/50 shadow-sm" />
              <span className="text-gray-400 text-xs font-exo">Hull:</span>
              <span className="text-white font-bold text-lg font-orbitron">{baseHull}</span>
            </div>

            {/* Shields */}
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.6" className="text-cyan-400">
                <path d="M12,0 L24,6 L24,18 L12,24 L0,18 L0,6 Z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className="text-gray-400 text-xs font-exo">Shields:</span>
              <span className="text-white font-bold text-lg font-orbitron">{baseShields}</span>
            </div>

            {/* Thresholds */}
            <div className="flex items-center gap-2">
              <Crosshair size={16} className="text-orange-400" />
              <span className="text-gray-400 text-xs font-exo">Breakpoints:</span>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400 text-[10px]">Dmg:</span>
                  <span className="text-white font-bold text-sm font-orbitron">{baseThresholds.damaged}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-400 text-[10px]">Crit:</span>
                  <span className="text-white font-bold text-sm font-orbitron">{baseThresholds.critical}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Abilities / Flavor Text Column - wrapped in section box */}
          <div className="ship-card-abilities ship-card-section">
            {shipAbility ? (
              <div className="text-sm">
                <span className="text-purple-400 font-orbitron uppercase text-xs tracking-wider">Ability</span>
                <p className="text-white font-bold mt-1">{shipAbility.name}</p>
                <p className="text-gray-300 text-xs mt-1">{shipAbility.description}</p>
              </div>
            ) : (
              <div>
                <span className="text-cyan-500/70 font-orbitron uppercase text-xs tracking-wider">Description</span>
                <p className="text-gray-300 text-sm mt-1 leading-relaxed italic">{description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row - Deck Composition Bars */}
        <DeckCompositionBars limits={deckLimits} />
      </div>
    </div>
  );

  // Scaled render - wrap in container with correct layout dimensions
  if (scale !== 1.0) {
    return (
      <div
        style={{
          width: baseWidth * scale + 16,
          height: baseHeight * scale + 16,
          overflow: 'visible',
          padding: '8px',
          margin: '0 auto'
        }}
      >
        <div
          className="relative flex justify-center"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: baseWidth,
            height: baseHeight
          }}
        >
          {cardContent}
        </div>
      </div>
    );
  }

  // Normal render - no wrapper needed
  return (
    <div className="relative flex justify-center">
      {cardContent}
    </div>
  );
};

export default ShipCard;
