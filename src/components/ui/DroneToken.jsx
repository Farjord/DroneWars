// ========================================
// DRONE TOKEN COMPONENT
// ========================================
// Renders interactive drone cards on the battlefield with all visual states
// Handles animations, stats display, shield visualization, and ability access

import React, { useMemo } from 'react';
import fullDroneCollection from '../../data/droneData.js';
import { useGameData } from '../../hooks/useGameData.js';
import { useEditorStats } from '../../contexts/EditorStatsContext.jsx';
import InterceptedBadge from './InterceptedBadge.jsx';
import TargetLockIcon from './TargetLockIcon.jsx';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * STAT HEXAGON COMPONENT
 * Renders stat values in hexagonal containers for drone tokens.
 * @param {number} value - The stat value to display
 * @param {boolean} isFlat - Whether to use flat hexagon style
 * @param {string} bgColor - Background color class
 * @param {string} textColor - Text color class
 * @param {string} borderColor - Border/outer color class (default: 'bg-black')
 */
const StatHexagon = ({ value, isFlat, bgColor, textColor, borderColor = 'bg-black' }) => (
  <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-full h-full ${borderColor} flex items-center justify-center`}>
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
  <button onClick={onClick} className="absolute top-5 -right-3.5 w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center border border-cyan-400 z-20 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-400/50 transition-all">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
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
 * @param {number|null} deploymentOrderNumber - Deployment order number (1-based) to display as badge, or null to hide
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
  enableFloatAnimation = false,
  deploymentOrderNumber = null,
  onDragStart,
  onDragDrop,
  isDragging = false,
  isHovered = false
}) => {
  // Performance logging for drag investigation - only log when dragging is active
  if (isDragging) {
    debugLog('DRAG_PERF', '🔄 DroneToken RENDER (dragging)', {
      droneId: drone.id,
      droneName: drone.name,
      isPlayer,
      lane
    });
  }

  // Get GameDataService for direct effective stats calculation
  const { getEffectiveStats } = useGameData();
  const editorStats = useEditorStats();

  const baseDrone = useMemo(() => fullDroneCollection.find(d => d.name === drone.name), [drone.name]);

  // Use editor context if available, otherwise fetch from global state
  const effectiveStats = editorStats
    ? editorStats.getEffectiveStats(drone, lane)
    : getEffectiveStats(drone, lane);
  const { maxShields } = effectiveStats;
  const currentShields = drone.currentShields ?? maxShields;
  const activeAbilities = baseDrone.abilities.filter(a => a.type === 'ACTIVE');

  // Debug log interceptor glow state
  if (isPotentialInterceptor) {
    debugLog('INTERCEPTOR_GLOW', `DroneToken render - ${drone.name} (${drone.id})`, {
      isPlayer,
      isPotentialInterceptor,
      lane,
      speed: effectiveStats.speed,
      classApplied: 'interceptor-glow'
    });
  }

  // --- Dynamic Class Calculation ---
  const borderColor = isPlayer ? 'border-cyan-400' : 'border-red-500';
  const nameBgColor = isPlayer ? 'bg-cyan-900' : 'bg-red-950';
  const nameTextColor = isPlayer ? 'text-cyan-100' : 'text-red-100';
  const statBgColor = isPlayer ? 'bg-cyan-900' : 'bg-red-950';
  const shieldColor = drone.isExhausted ? 'text-white' : 'text-cyan-200';
  const emptyShieldColor = drone.isExhausted ? 'text-gray-500' : 'text-cyan-200 opacity-50';

  const isAttackBuffed = effectiveStats.attack > effectiveStats.baseAttack;
  const isAttackDebuffed = effectiveStats.attack < effectiveStats.baseAttack;
  const attackTextColor = isAttackBuffed ? 'text-green-400' : isAttackDebuffed ? 'text-red-400' : 'text-white';

  const isSpeedBuffed = effectiveStats.speed > effectiveStats.baseSpeed;
  const isSpeedDebuffed = effectiveStats.speed < effectiveStats.baseSpeed;
  const speedTextColor = isSpeedBuffed ? 'text-green-400' : isSpeedDebuffed ? 'text-red-400' : 'text-white';

  // --- State Effects ---
  const exhaustEffect = drone.isExhausted ? 'grayscale opacity-90' : '';
  const hitEffect = isHit ? 'animate-shake' : '';
  const selectedEffect = (isSelected || isSelectedForMove) ? 'scale-105 ring-2 ring-cyan-400 shadow-xl shadow-cyan-400/50' : '';
  const actionTargetEffect = isActionTarget ? 'shadow-xl shadow-red-500/95 animate-pulse' : '';
  const mandatoryDestroyEffect = mandatoryAction?.type === 'destroy' && isPlayer ? 'ring-2 ring-red-500 animate-pulse' : '';
  const hoverEffect = isHovered ? 'scale-105' : '';

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
      onMouseDown={(e) => {
        // Initiate drag for player drones during action phase
        if (onDragStart && isPlayer && !drone.isExhausted) {
          e.preventDefault();
          onDragStart(drone, lane, e);
        }
      }}
      onMouseUp={() => {
        // Handle drop on enemy drone for attack
        if (onDragDrop) {
          onDragDrop(drone);
        }
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative ${isDragging ? 'z-50' : 'z-10'} ${enableFloatAnimation ? 'drone-float' : ''}`}
      style={{
        width: 'clamp(85px, 4.427vw, 115px)',
        height: 'clamp(115px, 5.99vw, 156px)'
      }}
    >
      {/* Visual Effects Wrapper */}
      <div className="w-full h-full">
        {/* Targeting/Visual Effects Container - handles pulse, hit, selection, hover, etc. */}
        <div className={`w-full h-full transition-all duration-200 ${hitEffect} ${selectedEffect} ${hoverEffect} ${actionTargetEffect} ${mandatoryDestroyEffect} ${teleportingEffect}`}>
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
                  ? <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#22d3ee"><path d="M12,0 L24,6 L24,18 L12,24 L0,18 L0,6 Z" stroke="rgba(0,0,0,0.5)" strokeWidth="2"></path></svg>
                  : <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={emptyShieldColor}><path d="M12,0 L24,6 L24,18 L12,24 L0,18 L0,6 Z"></path></svg>
              ))}
            </div>
            <div className="flex w-full justify-center gap-0.5">
              {Array.from({ length: baseDrone.hull }).map((_, i) => {
                const isFullHull = i < drone.hull;
                const fullHullColor = drone.isExhausted ? 'bg-white' : 'bg-cyan-400';
                const damagedHullColor = drone.isExhausted ? 'bg-gray-500' : 'bg-gray-400';
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
        {/* End Targeting/Visual Effects Container */}
      </div>
      {/* End Visual Effects Wrapper */}

      {/* Overlapping Hexagons - Outside nested containers for proper filter rendering */}
      <div className={`absolute -top-3 left-[-14px] w-6 h-7 z-20 ${teleportingEffect}`}>
          <StatHexagon value={effectiveStats.attack} isFlat={false} bgColor={statBgColor} textColor={attackTextColor} borderColor={isPlayer ? 'bg-cyan-400' : 'bg-red-500'} />
      </div>
      <div className={`absolute -top-3 right-[-14px] w-7 h-7 z-20 ${isPotentialInterceptor ? 'interceptor-glow' : ''} ${teleportingEffect}`}>
          <StatHexagon value={effectiveStats.speed} isFlat={true} bgColor={statBgColor} textColor={speedTextColor} borderColor={isPlayer ? 'bg-cyan-400' : 'bg-red-500'} />
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

      {/* Deployment Order Badge - shown in quick deploy editor, centered underneath token */}
      {deploymentOrderNumber != null && (
        <div
          data-testid="deployment-order-badge"
          className="absolute left-1/2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center border border-white z-30 shadow-md"
          style={{
            bottom: '-10px',
            transform: 'translateX(-50%)'
          }}
        >
          <span className="text-white text-xs font-bold font-orbitron">
            {deploymentOrderNumber}
          </span>
        </div>
      )}
    </div>
  );
};

export default DroneToken;