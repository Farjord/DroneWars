// ========================================
// DRONE TOKEN COMPONENT
// ========================================
// Renders interactive drone cards on the battlefield with all visual states
// Handles animations, stats display, shield visualization, and ability access

import React, { useMemo } from 'react';
import fullDroneCollection from '../../data/droneData.js';
import { useGameData } from '../../hooks/useGameData.js';
import { useEditorStats } from '../../contexts/EditorStatsContext.jsx';
import useCardTilt from '../../hooks/useCardTilt.js';
import InterceptedBadge from './InterceptedBadge.jsx';
import LeftSideIcons from './LeftSideIcons.jsx';
import RightSideIcons from './RightSideIcons.jsx';
import DroneTooltipPanel, { buildTooltipItems } from './DroneTooltipPanel.jsx';
import { debugLog } from '../../utils/debugLogger.js';
import { FACTION_COLORS } from '../../utils/factionColors.js';

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
  enableFloatAnimation = false,
  deploymentOrderNumber = null,
  onDragStart,
  onDragDrop,
  isDragging = false,
  isHovered = false,
  isAbilitySource = false,
  isElevated = false,
  // Action card drag-and-drop props
  draggedActionCard = null,
  onActionCardDrop = null,
  getLocalPlayerId = () => 'player1',
  getOpponentPlayerId = () => 'player2',
  // Invalid target indicator prop
  isInvalidTarget = false,
  // Applied upgrades for this drone type (from playerState.appliedUpgrades)
  appliedUpgrades = [],
  // Whether any target is currently hovered/selected (dims unfocused drones)
  anyTargetFocused = false,
  // Prior chain target — highlighted but not draggable
  isPriorChainTarget = false,
  // Ghost drone preview for pending move
  isGhost = false,
  // Same-lane reorder ghost — full opacity + selected glow instead of faded
  isSameLaneGhost = false,
  // Positional index within the lane (for insertion calculator DOM queries)
  droneIndex = null,
  // Intercepted badge state — { droneId, timestamp } or null
  interceptedBadge = null,
}) => {
  // For tokens with deployedBy, color based on who deployed them, not whose board they sit on
  const isVisuallyOwned = drone.deployedBy
    ? drone.deployedBy === getLocalPlayerId()
    : isPlayer;

  const fc = isVisuallyOwned ? FACTION_COLORS.player : FACTION_COLORS.opponent;

  // 3D tilt parallax during drag + hover (subtler than ActionCard)
  const glowColor = `${fc.accent}59`; // 59 hex ≈ 0.35 opacity
  const glowFilter = drone.isExhausted ? null
    : `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 0 12px ${glowColor})`;
  const tiltRef = useCardTilt(isDragging, {
    maxTiltDrag: 10,
    maxTiltHover: 5,
    glowFilter
  });

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
  const activeAbilities = baseDrone?.abilities?.filter(a => a.type === 'ACTIVE') ?? [];
  const tooltipItems = buildTooltipItems(drone, effectiveStats, baseDrone, appliedUpgrades);

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
  const borderColor = isVisuallyOwned ? 'border-cyan-400' : 'border-red-500';
  const isToken = drone.isToken;
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
  const ghostEffect = isGhost
    ? (isSameLaneGhost ? 'pointer-events-none' : 'opacity-40 pointer-events-none')
    : '';
  const exhaustEffect = drone.isExhausted ? 'grayscale opacity-90' : '';
  const hitEffect = isHit ? 'animate-shake' : '';
  const isSelectedState = isSelected || isSelectedForMove || isSameLaneGhost;
  const selectedEffect = isSelectedState ? 'scale-110' : '';
  const selectedGlowStyle = isSelectedState ? {
    boxShadow: `0 0 6px 2px ${fc.glow}cc, 0 0 14px 6px ${fc.glow}66, 0 0 24px 10px ${fc.glow}33`,
  } : {};
  // When another target is focused, unfocused valid targets go static at 0.5
  const isUnfocusedTarget = isActionTarget && !isSelectedState && !isHovered && anyTargetFocused;
  const actionTargetEffect = (isActionTarget && !isSelectedState && !isHovered && !anyTargetFocused) ? 'animate-pulse' : '';
  const actionTargetStyle = isActionTarget ? {
    boxShadow: `0 0 8px 3px ${fc.glow}ee, 0 0 18px 8px ${fc.glow}77`,
  } : {};
  const dimmingStyle = (isUnfocusedTarget || isInvalidTarget) ? { opacity: 0.5 } : {};
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

        // Allow drag for player-owned drones that aren't exhausted,
        // or for enemy drones selected as move targets during destination phase
        const canDrag = (isSelectedForMove && !isPriorChainTarget) || (isPlayer && !drone.isExhausted) || (isActionTarget && !!onDragStart);

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
      className={`relative ${isDragging || isSelected ? 'z-[150]' : isElevated ? 'z-20' : 'z-10'} ${enableFloatAnimation ? 'drone-float' : ''} ${ghostEffect}`}
      data-drone-token=""
      data-dragging={isDragging || undefined}
      data-drone-index={droneIndex}
      style={{
        width: 'clamp(85px, 4.427vw, 115px)',
        height: 'clamp(115px, 5.99vw, 156px)',
        perspective: '400px',
        ...(isGhost ? { transition: 'none' } : {}),
        ...dimmingStyle,
      }}
    >
      {/* Scale Wrapper - Separates scale transforms from hover/selection effects */}
      <div className={`w-full h-full rounded-lg ${hoverEffect} ${selectedEffect} ${isGhost ? '' : 'transition-transform duration-200'}`} style={selectedGlowStyle}>
        {/* Tilt Wrapper - 3D tilt via useCardTilt, perspective provided by parent */}
        <div ref={tiltRef} className="w-full h-full">
        {/* Targeting/Visual Effects Container - handles pulse, hit, selection, hover, etc. */}
        <div className={`w-full h-full rounded-lg ${isGhost ? '' : 'transition-all duration-200'} ${hitEffect} ${actionTargetEffect} ${mandatoryDestroyEffect} ${teleportingEffect} ${abilitySourceEffect}`} style={actionTargetStyle}>
          {/* Grayscale Container - only applies exhausted effect */}
          <div className={`w-full h-full relative ${exhaustEffect}`}>
            {/* Main Token Body */}
            <div className={`relative w-full h-full rounded-lg shadow-lg border ${borderColor} cursor-pointer shadow-black overflow-hidden ${isPotentialGuardian ? 'guardian-glow' : ''} ${isPotentialInterceptor ? (isVisuallyOwned ? 'interceptor-card-glow-cyan' : 'interceptor-card-glow') : ''}`}>
              <img src={drone.image} alt={drone.name} className="absolute inset-0 w-full h-full object-cover"/>
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)' }} />
              {/* Faction-colour overlay on selection/targeting */}
              {(isSelectedState || isHovered) && (
                <div className="absolute inset-0" style={{
                  background: `radial-gradient(ellipse at center, ${fc.primary}25 0%, ${fc.primary}15 60%, transparent 100%)`,
                  pointerEvents: 'none',
                }} />
              )}
              <div className="relative z-10 h-full">
                <div className="absolute bottom-6 left-0 right-0 w-full flex flex-col gap-1 px-2">
                  <div className="flex w-full justify-center gap-1 min-h-[12px]">
                    {Array.from({ length: maxShields }).map((_, i) => (
                      i < currentShields
                        ? <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={FACTION_COLORS.player.accent}><path d="M12,0 L24,6 L24,18 L12,24 L0,18 L0,6 Z" stroke="rgba(0,0,0,0.5)" strokeWidth="2"></path></svg>
                        : <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={emptyShieldColor}><path d="M12,0 L24,6 L24,18 L12,24 L0,18 L0,6 Z"></path></svg>
                    ))}
                  </div>
                  <div className="flex w-full justify-center gap-0.5">
                    {Array.from({ length: baseDrone?.hull ?? drone.hull ?? 1 }).map((_, i) => {
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
              {/* Sheen overlay — slides via --sheen CSS variable set by useCardTilt */}
              <div
                style={{
                  position: 'absolute',
                  inset: '-50%',
                  background: 'linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.10) 50%, transparent 60%)',
                  transform: 'translateX(var(--sheen, -100%))',
                  transition: 'transform 0.3s ease',
                  pointerEvents: 'none',
                  zIndex: 20,
                }}
              />
            </div>
          </div>
          {/* End Grayscale Container */}

        </div>
        {/* End Targeting/Visual Effects Container */}

          {/* Invalid Target Indicator - shown when drone is in scope but not valid target */}
          <InvalidTargetIndicator show={isInvalidTarget} />

        {/* Overlapping Hexagons - Outside nested containers for proper filter rendering */}
        <div className={`stat-hex-attack absolute -top-3 left-[-14px] w-6 h-7 z-20 ${teleportingEffect} ${exhaustEffect}`}>
            <StatHexagon value={effectiveStats.attack} isFlat={false} bgColor={statBgColor} textColor={attackTextColor} borderColor={isVisuallyOwned ? 'bg-cyan-400' : 'bg-red-500'} />
        </div>
        <div className={`stat-hex-speed absolute -top-3 right-[-14px] w-7 h-7 z-20 ${isPotentialInterceptor ? (isVisuallyOwned ? 'interceptor-glow-cyan' : 'interceptor-glow') : ''} ${teleportingEffect} ${exhaustEffect}`}>
            <StatHexagon value={effectiveStats.speed} isFlat={true} bgColor={statBgColor} textColor={speedTextColor} borderColor={isVisuallyOwned ? 'bg-cyan-400' : 'bg-red-500'} />
        </div>

        {/* Left Side Icons (Marked/RAPID/ASSAULT/PASSIVE/INERT) */}
        <div className={teleportingEffect}>
            <LeftSideIcons drone={drone} effectiveStats={effectiveStats} isPlayer={isVisuallyOwned} />
        </div>

        {/* Right Side Icons (Ability button + status effects) */}
        <div className={teleportingEffect}>
            <RightSideIcons
              drone={drone}
              isPlayer={isPlayer}
              activeAbilities={isPlayer ? activeAbilities : []}
              isAbilityUsable={isAbilityUsable}
              onAbilityClick={onAbilityClick}
            />
        </div>

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
      {/* End Tilt Wrapper */}
      </div>
      {/* End Scale Wrapper */}

      {/* Intercepted Badge — centered on this drone */}
      {interceptedBadge && interceptedBadge.droneId === drone.id && (
        <InterceptedBadge
          droneId={interceptedBadge.droneId}
          timestamp={interceptedBadge.timestamp}
        />
      )}

      {/* Tooltip toasts — CSS-only hover visibility */}
      {tooltipItems.length > 0 && (
        <DroneTooltipPanel
          items={tooltipItems}
          position={lane === 'lane3' ? 'left' : 'right'}
        />
      )}

    </div>
  );
};

export default DroneToken;