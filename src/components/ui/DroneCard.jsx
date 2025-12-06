// ========================================
// DRONE CARD COMPONENT - CLEAN VERSION
// ========================================
// Base size: 225px × 275px (default footer size)
// Accepts optional scale prop for enlargement in modals

import React, { useMemo } from 'react';
import { Crosshair, Gauge, Power } from 'lucide-react';
import CardStatHexagon from './CardStatHexagon.jsx';
import ScalingText from './ScalingText.jsx';
import RaritySymbol from './RaritySymbol.jsx';
import { getCardBorderClasses } from '../../utils/cardBorderUtils.js';

/**
 * DRONE CARD COMPONENT
 * @param {Object} drone - Drone data
 * @param {Function} onClick - Click handler
 * @param {boolean} isSelectable - Whether card can be selected
 * @param {boolean} isSelected - Whether card is selected
 * @param {number} deployedCount - Number deployed
 * @param {boolean} ignoreDeployLimit - Ignore limit
 * @param {Array} appliedUpgrades - Applied upgrades
 * @param {boolean} isUpgradeTarget - Is upgrade target
 * @param {Function} onViewUpgrades - View upgrades handler
 * @param {number} scale - Optional scale multiplier (default: 1.0)
 * @param {boolean} isViewOnly - Display only mode (no opacity reduction)
 */
const DroneCard = ({
  drone,
  onClick,
  isSelectable,
  isSelected,
  deployedCount,
  ignoreDeployLimit = false,
  appliedUpgrades = [],
  isUpgradeTarget = false,
  onViewUpgrades,
  scale = 1.0,
  isViewOnly = false
}) => {
  // Calculate effective limit with upgrades
  let effectiveLimit = drone.limit;
  appliedUpgrades.forEach(upg => {
    if (upg.mod.stat === 'limit') effectiveLimit += upg.mod.value;
  });

  const atLimit = deployedCount >= effectiveLimit;
  const isInteractive = isSelectable && (!atLimit || ignoreDeployLimit);

  // Calculate effective stats
  const effectiveCardStats = useMemo(() => {
    const stats = { attack: drone.attack, speed: drone.speed, cost: drone.class };
    appliedUpgrades.forEach(upg => {
      if (upg.mod.stat === 'cost') {
        stats.cost = Math.max(0, stats.cost + upg.mod.value);
      } else if (stats.hasOwnProperty(upg.mod.stat)) {
        stats[upg.mod.stat] += upg.mod.value;
      }
    });
    return stats;
  }, [drone, appliedUpgrades]);

  const deploymentCost = effectiveCardStats.cost;

  // Color calculations
  const isAttackBuffed = effectiveCardStats.attack > drone.attack;
  const isAttackDebuffed = effectiveCardStats.attack < drone.attack;
  const attackTextColor = isAttackBuffed ? 'text-green-400' : isAttackDebuffed ? 'text-red-400' : 'text-white';

  const isSpeedBuffed = effectiveCardStats.speed > drone.speed;
  const isSpeedDebuffed = effectiveCardStats.speed < drone.speed;
  const speedTextColor = isSpeedBuffed ? 'text-green-400' : isSpeedDebuffed ? 'text-red-400' : 'text-white';

  const isCostReduced = effectiveCardStats.cost < drone.class;
  const isCostIncreased = effectiveCardStats.cost > drone.class;
  const costTextColor = isCostReduced ? 'text-green-400' : isCostIncreased ? 'text-red-400' : 'text-white';

  const isLimitBuffed = effectiveLimit > drone.limit;
  const limitTextColor = isLimitBuffed ? 'text-green-400' : 'text-white';

  const { name, image, hull, shields, abilities } = drone;

  // Apply scale transform if provided
  const scaleStyle = scale !== 1.0 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'center center'
  } : {};

  // Get rarity-based border classes (Drones use Tactic/cyan color)
  const isDisabled = !isInteractive && !isViewOnly;
  const borderClasses = getCardBorderClasses('Tactic', drone.rarity, isDisabled);

  return (
    <div
      onClick={isInteractive ? () => onClick(drone) : undefined}
      className={`
        rounded-lg p-[4px] relative group
        transition-all duration-200
        ${isInteractive ? 'cursor-pointer' : isViewOnly ? 'cursor-default' : 'cursor-not-allowed'}
        ${isSelected ? 'bg-cyan-400 ring-2 ring-cyan-300' : borderClasses}
        ${isUpgradeTarget ? 'ring-4 ring-purple-500 animate-pulse' : ''}
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
        {/* Background Image */}
        <img src={image} alt={name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="py-1 px-3 bg-black/40 flex-shrink-0 h-8 flex items-center justify-center gap-2">
            <RaritySymbol rarity={drone.rarity || 'Common'} size={14} />
            <ScalingText text={name} className="font-orbitron text-sm uppercase tracking-widest whitespace-nowrap text-white" />
          </div>

          {/* Stats Section */}
          <div className="flex justify-between items-center px-2 flex-shrink-0 mt-2 h-12">
            <div className="w-10 h-12">
              <CardStatHexagon
                value={effectiveCardStats.attack}
                isFlat={false}
                icon={Crosshair}
                iconColor="text-red-400"
                textColor={attackTextColor}
              />
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex w-full justify-center gap-1.5 min-h-[12px]">
                {shields > 0 && Array.from({ length: shields }).map((_, i) => (
                  <svg
                    key={`shield-${i}`}
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    fillOpacity="0.6"
                    className="text-cyan-300"
                  >
                    <path d="M12,0 L24,6 L24,18 L12,24 L0,18 L0,6 Z" stroke="currentColor" strokeWidth="1.5"></path>
                  </svg>
                ))}
              </div>
              <div className="flex w-full justify-center gap-1">
                {Array.from({ length: hull }).map((_, i) => (
                  <div key={`hull-${i}`} className="h-3 w-3 rounded-sm bg-cyan-400 border border-black/50"></div>
                ))}
              </div>
            </div>

            <div className="w-12 h-12">
              <CardStatHexagon
                value={effectiveCardStats.speed}
                isFlat={true}
                icon={Gauge}
                iconColor="text-blue-400"
                textColor={speedTextColor}
              />
            </div>
          </div>

          {/* Abilities Section */}
          <div className="mx-2 mt-auto mb-2 max-h-48 bg-black/60 backdrop-blur-sm border border-cyan-800/70 p-2 flex flex-col space-y-2 overflow-y-auto rounded-md">
            {abilities && abilities.length > 0 ? (
              abilities.map((ability, index) => (
                <div key={index}>
                  <h4 className="text-xs text-purple-400 tracking-wider font-bold">{ability.name}</h4>
                  <p className="text-white text-xs leading-tight font-exo">{ability.description}</p>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-cyan-700 italic opacity-70">[ No Abilities ]</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="grid grid-cols-3 items-center p-1 border-t border-cyan-800/70 flex-shrink-0 h-12">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-400">Cost</span>
              <div className="flex items-center">
                <Power size={14} className="text-yellow-300"/>
                <span className={`font-bold text-base ml-1 ${costTextColor}`}>{deploymentCost}</span>
              </div>
            </div>

            {drone.upgradeSlots > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewUpgrades) onViewUpgrades(drone, appliedUpgrades);
                }}
                className="flex flex-col items-center cursor-pointer group"
              >
                <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors">Upgrades</span>
                <div className="flex items-center">
                  <span className="font-bold text-base text-purple-400">
                    {appliedUpgrades.length}/{drone.upgradeSlots}
                  </span>
                </div>
              </button>
            )}

            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-400">Deployed</span>
              <div className="flex items-center">
                <span className={`font-bold text-base ${atLimit ? 'text-red-500' : limitTextColor}`}>
                  {deployedCount}/{effectiveLimit}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DroneCard;