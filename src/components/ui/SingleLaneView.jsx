// ========================================
// SINGLE LANE VIEW COMPONENT
// ========================================
// Renders a single battlefield lane with its drone contents.
// Handles lane targeting, deployment, drag-and-drop, and visual states.
// Extracted from DroneLanesDisplay for reuse in BattleColumn (3-column grid).

import React from 'react';
import DroneToken from './DroneToken.jsx';
import { debugLog } from '../../utils/debugLogger.js';

/** Check if an effect is compound (needs target + destination selection). Inlined to avoid circular imports. */
const isCompoundEffect = (effect) =>
  (effect.type === 'SINGLE_MOVE' || effect.type === 'MULTI_MOVE') && !!effect.destination;

// Hex grid SVG patterns for lane backgrounds
const createHexGridPattern = (strokeColor) => {
  const svg = `<svg width="56" height="32" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,0 L42,0 L56,16 L42,32 L14,32 L0,16 Z" fill="none" stroke="${strokeColor}" stroke-width="0.5" opacity="0.2"/>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const cyanHexGrid = createHexGridPattern('#06b6d4');
const redHexGrid = createHexGridPattern('#ef4444');

/**
 * Renders all drones within a lane with proper positioning and interaction handlers.
 */
const renderDronesOnBoard = ({
  drones, isPlayer, lane, localPlayerState, opponentPlayerState,
  localPlacedSections, opponentPlacedSections, gameEngine, getPlacedSectionsForEngine,
  handleTokenClick, handleAbilityIconClick, selectedDrone, recentlyHitDrones,
  potentialInterceptors, potentialGuardians, droneRefs, mandatoryAction,
  validAbilityTargets, validCardTargets, affectedDroneIds, setHoveredTarget,
  hoveredTarget, interceptedBadge, draggedDrone, handleDroneDragStart,
  handleDroneDragEnd, draggedActionCard, handleActionCardDragEnd,
  getLocalPlayerId, getOpponentPlayerId, abilityMode, effectChainState,
  selectedCard, hoveredLane,
}) => {
  return (
    <div
      className="flex flex-wrap gap-8 justify-center items-center"
      style={{ minHeight: 'clamp(130px, 6.77vw, 175px)', paddingTop: '2px' }}
    >
     {drones.map((drone) => {
          const droneOwner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
          const abilityTargetMatch = validAbilityTargets.some(t => t.id === drone.id && t.owner === droneOwner);
          const cardTargetMatch = validCardTargets.some(t => t.id === drone.id && t.owner === droneOwner);
          const affectedDroneMatch = affectedDroneIds?.includes(drone.id) ?? false;
          const isActionTarget = abilityTargetMatch || cardTargetMatch || affectedDroneMatch;

          const activeCostTargeting = null;

          const targetingAffinity = activeCostTargeting?.affinity || selectedCard?.targeting?.affinity || selectedCard?.effects?.[0]?.targeting?.affinity || draggedActionCard?.card?.targeting?.affinity || abilityMode?.ability?.targeting?.affinity;
          const targetingType = activeCostTargeting?.type || selectedCard?.targeting?.type || selectedCard?.effects?.[0]?.targeting?.type || draggedActionCard?.card?.targeting?.type || abilityMode?.ability?.targeting?.type;

          const currentEffect = effectChainState?.effects?.[effectChainState.currentIndex]
            || draggedActionCard?.card?.effects?.[0]
            || selectedCard?.effects?.[0];

          const isInvalidTarget = (() => {
            if (targetingType === 'DRONE' && !isActionTarget) {
              if (currentEffect && isCompoundEffect(currentEffect)) return false;
              return true;
            }
            if (affectedDroneIds === null) return false;
            if (targetingType === 'LANE' && hoveredLane?.id === lane) {
              if (!affectedDroneIds.includes(drone.id)) {
                switch (targetingAffinity) {
                  case 'ENEMY': return !isPlayer;
                  case 'FRIENDLY': return isPlayer;
                  case 'ANY': return true;
                  default: return false;
                }
              }
            }
            return false;
          })();

          if (isActionTarget) {
            debugLog('LANE_TARGETING', '🎯 Drone action target match', {
              droneId: drone.id,
              droneName: drone.name,
              lane,
              isPlayer,
              abilityTargetMatch,
              cardTargetMatch,
              affectedDroneMatch,
              validCardTargetIds: validCardTargets.map(t => t.id).slice(0, 5),
              affectedDroneIds: affectedDroneIds?.slice(0, 5) ?? []
            });
          }

          return (
              <DroneToken
              key={drone.id}
              drone={drone}
              lane={lane}
              isPlayer={isPlayer}
              onClick={handleTokenClick}
              onAbilityClick={handleAbilityIconClick}
              isSelected={selectedDrone && selectedDrone.id === drone.id}
              isSelectedForMove={
                (effectChainState?.subPhase === 'multi-target' && effectChainState.pendingMultiTargets?.some(d => d.id === drone.id)) ||
                (effectChainState?.subPhase === 'destination' && (
                  effectChainState.pendingTarget?.id === drone.id ||
                  (Array.isArray(effectChainState.pendingTarget) && effectChainState.pendingTarget.some(d => d.id === drone.id))
                ))
              }
              isHit={recentlyHitDrones.includes(drone.id)}
              isPotentialInterceptor={potentialInterceptors.includes(drone.id)}
              isPotentialGuardian={potentialGuardians.includes(drone.id)}
              droneRefs={droneRefs}
              mandatoryAction={mandatoryAction}
              localPlayerState={localPlayerState}
              isActionTarget={isActionTarget}
              onMouseEnter={() => {
                setHoveredTarget({ target: drone, type: 'drone', lane });
              }}
              onMouseLeave={() => {
                setHoveredTarget(null);
              }}
              interceptedBadge={interceptedBadge}
              enableFloatAnimation={true}
              deploymentOrderNumber={drone.deploymentOrderNumber}
              onDragStart={isPlayer ? handleDroneDragStart : undefined}
              onDragDrop={!isPlayer && draggedDrone ?
                (targetDrone) => {
                  debugLog('CHECKPOINT_FLOW', '🔌 CHECKPOINT 3-FIRE: onDragDrop callback executing', {
                    targetDrone: targetDrone.name,
                    targetId: targetDrone.id,
                    lane: lane,
                    willCallHandleDroneDragEnd: true,
                    params: { target: targetDrone.name, targetLane: lane, isOpponentTarget: true, targetType: 'drone' }
                  });
                  handleDroneDragEnd(targetDrone, lane, true, 'drone');
                }
                : undefined}
              isDragging={draggedDrone?.drone?.id === drone.id}
              isHovered={
                hoveredTarget?.target?.id === drone.id &&
                !(selectedDrone && selectedDrone.id === drone.id) &&
                !(effectChainState?.subPhase === 'multi-target' && effectChainState.pendingMultiTargets?.some(d => d.id === drone.id))
              }
              draggedActionCard={draggedActionCard}
              onActionCardDrop={handleActionCardDragEnd}
              getLocalPlayerId={getLocalPlayerId}
              getOpponentPlayerId={getOpponentPlayerId}
              isAbilitySource={abilityMode?.drone?.id === drone.id}
              isElevated={false}
              isInvalidTarget={isInvalidTarget}
               />
          );
      })}
    </div>
  );
};

/**
 * Renders a single battlefield lane with drone contents and interaction handling.
 * @param {string} laneId - Lane identifier ('lane1'|'lane2'|'lane3')
 * @param {boolean} isPlayer - Whether this is the current player's lane
 * @param {Object} player - Player state data (must have dronesOnBoard)
 */
const SingleLaneView = ({
  laneId,
  isPlayer,
  player,
  onLaneClick,
  getLocalPlayerId,
  getOpponentPlayerId,
  abilityMode,
  validAbilityTargets,
  selectedCard,
  validCardTargets,
  affectedDroneIds = [],
  effectChainState,
  turnPhase,
  localPlayerState,
  opponentPlayerState,
  localPlacedSections,
  opponentPlacedSections,
  gameEngine,
  getPlacedSectionsForEngine,
  handleTokenClick,
  handleAbilityIconClick,
  selectedDrone,
  recentlyHitDrones,
  potentialInterceptors,
  potentialGuardians,
  droneRefs,
  mandatoryAction,
  setHoveredTarget,
  hoveredTarget,
  interceptedBadge,
  draggedCard,
  handleCardDragEnd,
  draggedDrone,
  handleDroneDragStart,
  handleDroneDragEnd,
  draggedActionCard = null,
  handleActionCardDragEnd = null,
  hoveredLane = null,
  setHoveredLane = null,
  onLaneDrop = null,
  onLaneDragOver = null,
  laneControl = { lane1: null, lane2: null, lane3: null },
}) => {
  const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();

  // Check if this lane is a valid target for action card LANE targeting
  const isActionCardLaneTarget = draggedActionCard &&
    draggedActionCard.card?.targeting?.type === 'LANE' &&
    validCardTargets.some(t => t.id === laneId && t.owner === owner);

  const isTargetable = (abilityMode && validAbilityTargets.some(t => t.id === laneId && t.owner === owner)) ||
                       (selectedCard && validCardTargets.some(t => t.id === laneId && t.owner === owner)) ||
                       (draggedCard && isPlayer) ||
                       isActionCardLaneTarget;

  const isHoveredTarget = isTargetable && hoveredLane?.id === laneId && hoveredLane?.owner === owner;

  const isInteractivePlayerLane = isPlayer && (turnPhase === 'deployment' || turnPhase === 'action');
  const baseBackgroundColor = isPlayer ? 'bg-cyan-400/10' : 'bg-red-500/10';

  // Lane control state for visual indicators
  const laneControlState = laneControl[laneId];
  const localPlayerId = getLocalPlayerId();
  const opponentPlayerId = getOpponentPlayerId();
  const isPlayerControlled = laneControlState === localPlayerId;
  const isOpponentControlled = laneControlState === opponentPlayerId;

  let laneBorderClass = 'border-2 border-gray-700/30';
  let laneBackgroundClass = baseBackgroundColor;

  if (isPlayer && isPlayerControlled) {
    laneBorderClass = 'border-[3px] border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.4)]';
    laneBackgroundClass = 'bg-cyan-400/15';
  } else if (!isPlayer && isOpponentControlled) {
    laneBorderClass = 'border-[3px] border-red-400/70 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
  }

  return (
    <div
      data-testid={`lane-drop-zone-${laneId === 'lane1' ? 'left' : laneId === 'lane2' ? 'middle' : 'right'}`}
      onClick={(e) => onLaneClick(e, laneId, isPlayer)}
      onDragOver={(e) => onLaneDragOver?.(e)}
      onDrop={(e) => onLaneDrop?.(e, laneId)}
      onMouseEnter={() => {
        if (draggedActionCard &&
            draggedActionCard.card?.targeting?.type === 'LANE' &&
            isActionCardLaneTarget &&
            setHoveredLane) {
          setHoveredLane({ id: laneId, owner });
        }
      }}
      onMouseLeave={() => {
        if (draggedActionCard &&
            draggedActionCard.card?.targeting?.type === 'LANE' &&
            setHoveredLane) {
          setHoveredLane(null);
        }
      }}
      onMouseUp={(e) => {
        debugLog('CHECKPOINT_FLOW', '🏁 CHECKPOINT 4: Lane mouseUp fired', {
          lane: laneId,
          isPlayer: isPlayer,
          hasDraggedCard: draggedCard !== null,
          hasDraggedDrone: draggedDrone !== null,
          hasDraggedActionCard: draggedActionCard !== null,
          timestamp: Date.now()
        });

        if (draggedActionCard && handleActionCardDragEnd) {
          const card = draggedActionCard.card;
          if (card?.targeting?.type === 'LANE') {
            debugLog('CHECKPOINT_FLOW', '🏁 CHECKPOINT 4A: Action card lane drop');
            handleActionCardDragEnd({ id: laneId, name: laneId }, 'lane', owner);
            e.stopPropagation();
            debugLog('CHECKPOINT_FLOW', '🏁 CHECKPOINT 4A-STOP: stopPropagation called');
            return;
          }
        }

        if (draggedCard && isPlayer && handleCardDragEnd) {
          debugLog('CHECKPOINT_FLOW', '🏁 CHECKPOINT 4B: Drone card drop on lane');
          handleCardDragEnd(laneId);
          e.stopPropagation();
          debugLog('CHECKPOINT_FLOW', '🏁 CHECKPOINT 4B-STOP: stopPropagation called');
          return;
        }

        if (draggedDrone && handleDroneDragEnd && isPlayer) {
          debugLog('CHECKPOINT_FLOW', '🏁 CHECKPOINT 4C: Drone drop on lane', {
            lane: laneId,
            willCallWith: { target: null, targetLane: laneId, isOpponentTarget: false, targetType: 'lane' }
          });
          handleDroneDragEnd(null, laneId, false, 'lane');
          e.stopPropagation();
          debugLog('CHECKPOINT_FLOW', '🏁 CHECKPOINT 4C-STOP: stopPropagation called');
        } else {
          debugLog('CHECKPOINT_FLOW', '🏁 CHECKPOINT 4D: Lane conditions not met, propagating', {
            hasDraggedDrone: !!draggedDrone,
            hasHandler: !!handleDroneDragEnd,
            isPlayer: isPlayer
          });
        }
      }}
      className={`flex-1 rounded-lg p-2 relative ${laneBorderClass}
        ${laneBackgroundClass}
        ${isInteractivePlayerLane ? 'cursor-pointer hover:bg-cyan-900/20' : ''}
       ${isHoveredTarget ? 'scale-[1.01] z-10 transition-transform duration-200 ease-out' : 'transition-transform duration-200 ease-in-out'}
      `}
      style={{
        backgroundImage: isPlayer ? cyanHexGrid : redHexGrid,
        backgroundSize: '56px 32px'
      }}
    >
      {isTargetable && (
        <div
          className="absolute inset-0 rounded-lg lane-target-pulse pointer-events-none z-[-1]"
          style={{
            backgroundImage: isPlayer ? cyanHexGrid : redHexGrid,
            backgroundSize: '56px 32px',
            backgroundColor: isPlayer ? 'rgba(34, 211, 238, 0.1)' : 'rgba(239, 68, 68, 0.1)'
          }}
        />
      )}
      <div className="relative">
      {renderDronesOnBoard({
        drones: player.dronesOnBoard[laneId],
        isPlayer,
        lane: laneId,
        localPlayerState,
        opponentPlayerState,
        localPlacedSections,
        opponentPlacedSections,
        gameEngine,
        getPlacedSectionsForEngine,
        handleTokenClick,
        handleAbilityIconClick,
        selectedDrone,
        recentlyHitDrones,
        potentialInterceptors,
        potentialGuardians,
        droneRefs,
        mandatoryAction,
        validAbilityTargets,
        validCardTargets,
        affectedDroneIds,
        setHoveredTarget,
        hoveredTarget,
        interceptedBadge,
        draggedDrone,
        handleDroneDragStart,
        handleDroneDragEnd,
        draggedActionCard,
        handleActionCardDragEnd,
        getLocalPlayerId,
        getOpponentPlayerId,
        abilityMode,
        effectChainState,
        selectedCard,
        hoveredLane,
      })}
      </div>
    </div>
  );
};

export default SingleLaneView;
