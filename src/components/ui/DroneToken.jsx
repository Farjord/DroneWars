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
import StatusEffectIcons from './StatusEffectIcons.jsx';
import TraitIndicators from './TraitIndicators.jsx';
import { debugLog } from '../../utils/debugLogger.js';
import { Gauge, Crosshair } from 'lucide-react';

/**
 * INVALID TARGET INDICATOR COMPONENT
 * Renders a red "no entry" symbol overlay on drones that are NOT valid targets.
 * @param {boolean} show - Whether to show the indicator
 */
const InvalidTargetIndicator = ({ show }) => {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="invalid-target-overlay">
        <svg viewBox="0 0 48 48" className="w-12 h-12">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#ef4444" strokeWidth="4" opacity="0.9" />
          <line x1="10" y1="10" x2="38" y2="38" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        </svg>
      </div>
    </div>
  );
};

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
const AbilityIcon = ({ onClick, disabled }) => (
  <button
    onClick={disabled ? undefined : onClick}
    className={`absolute top-5 -right-3.5 w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center border z-20 transition-all ${
      disabled
        ? 'border-gray-500 cursor-not-allowed opacity-60'
        : 'border-cyan-400 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-400/50 cursor-pointer'
    }`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={disabled ? 'text-gray-500' : 'text-cyan-400'}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  </button>
);

/**
 * SPECIAL ABILITY ICONS COMPONENT
 * Renders RAPID/ASSAULT status icons on left side of drone token.
 * Icons are full color when available, greyed out when used.
 * @param {Object} drone - The drone data object
 */
const SpecialAbilityIcons = ({ drone, isPlayer }) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);

  const hasRapid = baseDrone?.abilities?.some(
    a => a.effect?.type === 'GRANT_KEYWORD' && a.effect?.keyword === 'RAPID'
  );
  const hasAssault = baseDrone?.abilities?.some(
    a => a.effect?.type === 'GRANT_KEYWORD' && a.effect?.keyword === 'ASSAULT'
  );

  if (!hasRapid && !hasAssault) return null;

  const icons = [];

  if (hasRapid) {
    const isUsed = drone.rapidUsed;
    icons.push(
      <div
        key="rapid"
        className={`w-6 h-6 rounded-full flex items-center justify-center border ${
          isUsed
            ? 'bg-slate-700 border-slate-500'
            : isPlayer
              ? 'bg-cyan-900 border-cyan-400 shadow-lg shadow-cyan-400/30'
              : 'bg-red-950 border-red-500 shadow-lg shadow-red-500/30'
        }`}
        title={isUsed ? 'Rapid Response (used)' : 'Rapid Response (available)'}
      >
        <Gauge
          size={14}
          className={isUsed ? 'text-slate-500' : 'text-blue-400'}
        />
      </div>
    );
  }

  if (hasAssault) {
    const isUsed = drone.assaultUsed;
    icons.push(
      <div
        key="assault"
        className={`w-6 h-6 rounded-full flex items-center justify-center border ${
          isUsed
            ? 'bg-slate-700 border-slate-500'
            : isPlayer
              ? 'bg-cyan-900 border-cyan-400 shadow-lg shadow-cyan-400/30'
              : 'bg-red-950 border-red-500 shadow-lg shadow-red-500/30'
        }`}
        title={isUsed ? 'Assault Protocol (used)' : 'Assault Protocol (available)'}
      >
        <Crosshair
          size={14}
          className={isUsed ? 'text-slate-500' : 'text-red-400'}
        />
      </div>
    );
  }

  return (
    <div className="absolute top-5 -left-3.5 flex flex-col gap-1 z-20">
      {icons}
    </div>
  );
};

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
  isHovered = false,
  isAbilitySource = false,
  isElevated = false,
  secondaryTargetingState = null,
  // Action card drag-and-drop props
  draggedActionCard = null,
  onActionCardDrop = null,
  getLocalPlayerId = () => 'player1',
  getOpponentPlayerId = () => 'player2',
  // Invalid target indicator prop
  isInvalidTarget = false
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
  // For tokens with deployedBy, color based on who deployed them, not whose board they sit on
  const isVisuallyOwned = drone.deployedBy
    ? drone.deployedBy === getLocalPlayerId()
    : isPlayer;

  const borderColor = isVisuallyOwned ? 'border-cyan-400' : 'border-red-500';
  const isToken = baseDrone?.isToken;
  const nameBgColor = isToken
    ? (isVisuallyOwned ? 'bg-slate-600' : 'bg-stone-700')
    : (isVisuallyOwned ? 'bg-cyan-900' : 'bg-red-950');
  const nameTextColor = isVisuallyOwned ? 'text-cyan-100' : 'text-red-100';
  const statBgColor = isToken
    ? (isVisuallyOwned ? 'bg-slate-600' : 'bg-stone-700')
    : (isVisuallyOwned ? 'bg-cyan-900' : 'bg-red-950');
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
  const selectedEffect = (isSelected || isSelectedForMove) ? 'scale-105 selected-glow' : '';
  const actionTargetEffect = isActionTarget ? 'shadow-xl shadow-red-500/95 animate-pulse' : '';
  const mandatoryDestroyEffect = mandatoryAction?.type === 'destroy' && isPlayer ? 'ring-2 ring-red-500 animate-pulse' : '';
  const hoverEffect = isHovered ? 'scale-105' : '';
  const abilitySourceEffect = isAbilitySource ? 'ability-source-glow' : '';

  const isAbilityUsable = (ability) => {
    if (drone.isExhausted && ability.cost.exhausts !== false) return false;
    if (ability.cost.energy && localPlayerState.energy < ability.cost.energy) return false;
    // Check activation limit (per-round usage)
    if (ability.activationLimit != null) {
      const abilityIndex = drone.abilities?.findIndex(a => a.name === ability.name) ?? -1;
      const activations = drone.abilityActivations?.[abilityIndex] || 0;
      if (activations >= ability.activationLimit) return false;
    }
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
        // Don't initiate drag if clicking on ability button (or any button/interactive element)
        if (e.target.closest('button')) {
          return;
        }

        // Allow drag for player-owned drones that aren't exhausted
        const canDrag = isPlayer && !drone.isExhausted;

        if (onDragStart && canDrag) {
          e.preventDefault();
          onDragStart(drone, lane, e);
        }
      }}
      onMouseUp={(e) => {
        debugLog('CHECKPOINT_FLOW', '🎯 CHECKPOINT 2: DroneToken mouseup fired', {
          droneName: drone.name,
          droneId: drone.id,
          droneOwner: isPlayer ? 'player' : 'opponent',
          hasDraggedActionCard: !!draggedActionCard,
          hasOnDragDrop: !!onDragDrop,
          timestamp: Date.now()
        });

        // Handle action card targeting via drag-and-drop
        if (draggedActionCard && onActionCardDrop) {
          if (isInvalidTarget) {
            onActionCardDrop();
            e.stopPropagation();
            return;
          }
          const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
          debugLog('CHECKPOINT_FLOW', '🎯 CHECKPOINT 2A: Handling action card drop on drone', {
            drone: drone.name,
            owner
          });
          onActionCardDrop(drone, 'drone', owner);
          e.stopPropagation();
          debugLog('CHECKPOINT_FLOW', '🎯 CHECKPOINT 2A-STOP: stopPropagation called');
          return;
        }
        // Handle drop on enemy drone for attack (existing behavior)
        if (onDragDrop) {
          debugLog('CHECKPOINT_FLOW', '🎯 CHECKPOINT 2B: Calling onDragDrop callback', {
            drone: drone.name,
            droneId: drone.id,
            callback: 'onDragDrop(drone)'
          });
          onDragDrop(drone);
          e.stopPropagation();
          debugLog('CHECKPOINT_FLOW', '🎯 CHECKPOINT 2B-STOP: stopPropagation called');
        } else {
          debugLog('CHECKPOINT_FLOW', '🎯 CHECKPOINT 2C: No onDragDrop callback, propagating to lane');
        }
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative ${isDragging || isSelected ? 'z-50' : isElevated ? 'z-20' : 'z-10'} ${enableFloatAnimation ? 'drone-float' : ''}`}
      style={{
        width: 'clamp(85px, 4.427vw, 115px)',
        height: 'clamp(115px, 5.99vw, 156px)'
      }}
    >
      {/* Scale Wrapper - Separates scale transforms from hover/selection effects */}
      <div className={`w-full h-full ${hoverEffect} ${selectedEffect} transition-transform duration-200`}>
        {/* Visual Effects Wrapper */}
        <div className="w-full h-full">
        {/* Targeting/Visual Effects Container - handles pulse, hit, selection, hover, etc. */}
        <div className={`w-full h-full transition-all duration-200 ${hitEffect} ${actionTargetEffect} ${mandatoryDestroyEffect} ${teleportingEffect} ${abilitySourceEffect}`}>
          {/* Grayscale Container - only applies exhausted effect */}
          <div className={`w-full h-full relative ${exhaustEffect}`}>
            {/* Main Token Body */}
            <div className={`relative w-full h-full rounded-lg shadow-lg border ${borderColor} cursor-pointer shadow-black overflow-hidden ${isPotentialGuardian ? 'guardian-glow' : ''} ${isPotentialInterceptor ? (isVisuallyOwned ? 'interceptor-card-glow-cyan' : 'interceptor-card-glow') : ''}`}>
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

        </div>
        {/* End Targeting/Visual Effects Container */}

          {/* Invalid Target Indicator - shown when drone is in scope but not valid target */}
          <InvalidTargetIndicator show={isInvalidTarget} />
      </div>
      {/* End Visual Effects Wrapper */}

        {/* Overlapping Hexagons - Outside nested containers for proper filter rendering */}
        <div className={`absolute -top-3 left-[-14px] w-6 h-7 z-20 ${teleportingEffect} ${exhaustEffect}`}>
            <StatHexagon value={effectiveStats.attack} isFlat={false} bgColor={statBgColor} textColor={attackTextColor} borderColor={isVisuallyOwned ? 'bg-cyan-400' : 'bg-red-500'} />
        </div>
        <div className={`absolute -top-3 right-[-14px] w-7 h-7 z-20 ${isPotentialInterceptor ? (isVisuallyOwned ? 'interceptor-glow-cyan' : 'interceptor-glow') : ''} ${teleportingEffect} ${exhaustEffect}`}>
            <StatHexagon value={effectiveStats.speed} isFlat={true} bgColor={statBgColor} textColor={speedTextColor} borderColor={isVisuallyOwned ? 'bg-cyan-400' : 'bg-red-500'} />
        </div>

        {/* Overlapping Ability Icon */}
        {isPlayer && activeAbilities.length > 0 && (
            <div className={teleportingEffect}>
                <AbilityIcon
                  disabled={!isAbilityUsable(activeAbilities[0])}
                  onClick={(e) => onAbilityClick && onAbilityClick(e, drone, activeAbilities[0])}
                />
            </div>
        )}

        {/* Special Ability Icons (RAPID/ASSAULT) - Left side */}
        <div className={teleportingEffect}>
            <SpecialAbilityIcons drone={drone} isPlayer={isVisuallyOwned} />
        </div>

        {/* Trait Indicators (Marked/PASSIVE/INERT) - Top-left side */}
        <div className={teleportingEffect}>
            <TraitIndicators drone={drone} effectiveStats={effectiveStats} />
        </div>

        {/* Status Effect Icons - Right side */}
        <div className={teleportingEffect}>
            <StatusEffectIcons drone={drone} isPlayer={isPlayer} />
        </div>

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
      {/* End Scale Wrapper */}
    </div>
  );
};

export default DroneToken;