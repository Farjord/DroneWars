// ========================================
// DRONE TOKEN COMPONENT
// ========================================
// Renders interactive drone cards on the battlefield with all visual states
// Handles animations, stats display, shield visualization, and ability access

import React, { useMemo } from 'react';
import fullDroneCollection from '../../data/droneData.js';
import { useGameData } from '../../hooks/useGameData.js';
import InterceptedBadge from './InterceptedBadge.jsx';
import TargetLockIcon from './TargetLockIcon.jsx';

/**
 * STAT HEXAGON COMPONENT
 * Renders stat values in hexagonal containers for drone tokens.
 * @param {number} value - The stat value to display
 * @param {boolean} isFlat - Whether to use flat hexagon style
 * @param {string} bgColor - Background color class
 * @param {string} textColor - Text color class
 */
const StatHexagon = ({ value, isFlat, bgColor, textColor }) => (
  <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-full h-full bg-black flex items-center justify-center`}>
    <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-[calc(100%-2px)] h-[calc(100%-2px)] ${bgColor} flex items-center justify-center text-xs font-bold font-orbitron ${textColor}`}>
      {value}
    </div>
  </div>
);

/**
 * ABILITY ICON COMPONENT
 * Renders clickable ability button for drone tokens.
 * @param {Function} onClick - Callback when ability button is clicked
 */
const AbilityIcon = ({ onClick }) => (
  <button onClick={onClick} className="absolute top-5 -right-3.5 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center border-2 border-black/50 z-20 hover:bg-purple-500 transition-colors">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
  </button>
);

/**
 * DRONE TOKEN COMPONENT
 * Renders interactive drone cards on the battlefield with all visual states.
 * Handles animations, stats display, shield visualization, and ability access.
 * @param {Object} drone - The drone data object
 * @param {Function} onClick - Callback when drone is clicked
 * @param {boolean} isPlayer - Whether this is a player-owned drone
 * @param {boolean} isSelected - Whether drone is currently selected
 * @param {boolean} isSelectedForMove - Whether drone is selected for movement
 * @param {boolean} isHit - Whether drone was recently hit (for animation)
 * @param {boolean} isPotentialInterceptor - Whether drone can intercept current attack
 * @param {boolean} isPotentialGuardian - Whether drone has GUARDIAN and is blocking attacks in this lane
 * @param {Function} onMouseEnter - Mouse enter event handler
 * @param {Function} onMouseLeave - Mouse leave event handler
 * @param {string} lane - Lane identifier for stats calculation
 * @param {Function} onAbilityClick - Callback when ability icon is clicked
 * @param {boolean} isActionTarget - Whether drone is target of current action
 * @param {Object} droneRefs - Ref object for drone DOM elements
 * @param {Object} mandatoryAction - Current mandatory action state
 * @param {Object} localPlayerState - Local player state
 * @param {Object} interceptedBadge - Interception badge data ({ droneId, timestamp })
 */
const DroneToken = ({
  drone,
  onClick,
  isPlayer,
  isSelected,
  isSelectedForMove,
  isHit,
  isPotentialInterceptor,
  isPotentialGuardian,
  onMouseEnter,
  onMouseLeave,
  lane,
  onAbilityClick,
  isActionTarget,
  droneRefs,
  mandatoryAction,
  localPlayerState,
  interceptedBadge,
  enableFloatAnimation = false
}) => {
  // Get GameDataService for direct effective stats calculation
  const { getEffectiveStats } = useGameData();

  const baseDrone = useMemo(() => fullDroneCollection.find(d => d.name === drone.name), [drone.name]);

  // Calculate effective stats internally instead of receiving as prop
  const effectiveStats = getEffectiveStats(drone, lane);
  const { maxShields } = effectiveStats;
  const currentShields = drone.currentShields ?? maxShields;
  const activeAbilities = baseDrone.abilities.filter(a => a.type === 'ACTIVE');

  // --- Dynamic Class Calculation ---
  const borderColor = isPlayer ? 'border-cyan-400' : 'border-pink-500';
  const nameBgColor = isPlayer ? 'bg-cyan-900' : 'bg-pink-950';
  const nameTextColor = isPlayer ? 'text-cyan-100' : 'text-pink-100';
  const statBgColor = isPlayer ? 'bg-cyan-900' : 'bg-pink-950';
  const shieldColor = isPlayer ? 'text-cyan-400' : 'text-pink-500';
  const emptyShieldColor = isPlayer ? 'text-cyan-300 opacity-50' : 'text-pink-400 opacity-60';

  const isAttackBuffed = effectiveStats.attack > effectiveStats.baseAttack;
  const isAttackDebuffed = effectiveStats.attack < effectiveStats.baseAttack;
  const attackTextColor = isAttackBuffed ? 'text-green-400' : isAttackDebuffed ? 'text-red-400' : 'text-white';

  const isSpeedBuffed = effectiveStats.speed > effectiveStats.baseSpeed;
  const isSpeedDebuffed = effectiveStats.speed < effectiveStats.baseSpeed;
  const speedTextColor = isSpeedBuffed ? 'text-green-400' : isSpeedDebuffed ? 'text-red-400' : 'text-white';

  // --- State Effects ---
  const exhaustEffect = drone.isExhausted ? 'grayscale opacity-60' : '';
  const hitEffect = isHit ? 'animate-shake' : '';
  const selectedEffect = (isSelected || isSelectedForMove) ? 'scale-105 ring-2 ring-cyan-400 shadow-xl shadow-cyan-400/50' : '';
  const actionTargetEffect = isActionTarget ? 'scale-105 ring-2 ring-purple-400 shadow-xl shadow-purple-500/50 animate-pulse' : '';
  const mandatoryDestroyEffect = mandatoryAction?.type === 'destroy' && isPlayer ? 'ring-2 ring-red-500 animate-pulse' : '';

  const isAbilityUsable = (ability) => {
    if (drone.isExhausted && ability.cost.exhausts !== false) return false;
    if (ability.cost.energy && localPlayerState.energy < ability.cost.energy) return false;
    return true;
  };

  // Check if drone is currently teleporting (invisible placeholder)
  const teleportingEffect = drone.isTeleporting ? 'opacity-0 pointer-events-none' : '';

  return (
    <div
      ref={el => droneRefs.current[drone.id] = el}
      data-drone-id={drone.id}
      onClick={(e) => onClick && onClick(e, drone, isPlayer)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative"
      style={{
        width: 'clamp(85px, 4.427vw, 115px)',
        height: 'clamp(115px, 5.99vw, 156px)'
      }}
    >
      {/* Animation Container - moves with all visual effects */}
      <div className={`w-full h-full transition-all duration-200 ${hitEffect} ${selectedEffect} ${actionTargetEffect} ${mandatoryDestroyEffect} ${teleportingEffect} ${enableFloatAnimation ? 'drone-float' : ''}`}>
        {/* Grayscale Container - only applies exhausted effect */}
        <div className={`w-full h-full relative ${exhaustEffect}`}>
      {/* Main Token Body */}
      <div className={`relative w-full h-full rounded-lg shadow-lg border ${borderColor} cursor-pointer shadow-black overflow-hidden ${isPotentialGuardian ? 'guardian-glow' : ''}`}>
        <img src={drone.image} alt={drone.name} className="absolute inset-0 w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 h-full">
          <div className="absolute bottom-6 left-0 right-0 w-full flex flex-col gap-1 px-2">
            <div className="flex w-full justify-center gap-1 min-h-[12px]">
              {Array.from({ length: maxShields }).map((_, i) => (
                i < currentShields
                  ? <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={shieldColor}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                  : <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={emptyShieldColor}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
              ))}
            </div>
            <div className="flex w-full justify-center gap-0.5">
              {Array.from({ length: baseDrone.hull }).map((_, i) => {
                const isFullHull = i < drone.hull;
                const fullHullColor = drone.isExhausted ? 'bg-green-800' : 'bg-green-500';
                const damagedHullColor = 'bg-gray-400';
                return (
                  <div key={i} className={`h-2 w-2 rounded-sm ${isFullHull ? fullHullColor : damagedHullColor} border border-black/50`}></div>
                );
              })}
            </div>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-5 ${nameBgColor} flex items-center justify-center border-t ${borderColor}`}>
            <span className={`font-orbitron text-[8px] uppercase ${nameTextColor} tracking-wider w-full text-center`}>{drone.name}</span>
          </div>
        </div>
      </div>

      {/* Overlapping Hexagons */}
      <div className="absolute -top-3 left-[-14px] w-6 h-7 z-20">
          <StatHexagon value={effectiveStats.attack} isFlat={false} bgColor={statBgColor} textColor={attackTextColor} />
      </div>
      <div className={`absolute -top-3 right-[-14px] w-7 h-7 z-20 ${isPotentialInterceptor ? 'interceptor-glow' : ''}`}>
          <StatHexagon value={effectiveStats.speed} isFlat={true} bgColor={statBgColor} textColor={speedTextColor} />
      </div>

      {/* Overlapping Ability Icon */}
      {isPlayer && activeAbilities.length > 0 && isAbilityUsable(activeAbilities[0]) && (
          <AbilityIcon onClick={(e) => onAbilityClick && onAbilityClick(e, drone, activeAbilities[0])} />
      )}

      {/* Intercepted Badge */}
      {interceptedBadge && interceptedBadge.droneId === drone.id && (
        <InterceptedBadge
          droneId={drone.id}
          timestamp={interceptedBadge.timestamp}
        />
      )}
        </div>
        {/* End Grayscale Container */}

        {/* Marked Indicator - Inside animation container, outside grayscale container */}
        {drone.isMarked && (
          <div
            className="absolute top-5 left-[-14px] z-30 pointer-events-none"
            style={{
              animation: 'targetGlow 2s ease-in-out infinite',
            }}
          >
            <TargetLockIcon size={24} />
            <style>{`
              @keyframes targetGlow {
                0%, 100% {
                  filter: brightness(1) drop-shadow(0 0 2px rgba(239, 68, 68, 0.8));
                }
                50% {
                  filter: brightness(1.5) drop-shadow(0 0 8px rgba(239, 68, 68, 1));
                }
              }
            `}</style>
          </div>
        )}
      </div>
      {/* End Animation Container */}
    </div>
  );
};

export default DroneToken;