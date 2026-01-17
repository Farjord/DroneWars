// ========================================
// DRONE LANES DISPLAY COMPONENT
// ========================================
// Renders the three battlefield lanes with their drone contents
// Handles lane targeting, deployment, and visual states

import React from 'react';
import DroneToken from './DroneToken.jsx';
import { useGameData } from '../../hooks/useGameData.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * RENDER DRONES ON BOARD
 * Renders all drones within a specific lane with proper positioning.
 * Applies all visual states and interaction handlers.
 * @param {Array} drones - Array of drone objects in the lane
 * @param {boolean} isPlayer - Whether these are player-owned drones
 * @param {string} lane - The lane ID (lane1, lane2, lane3)
 * @param {Object} localPlayerState - Local player state
 * @param {Object} opponentPlayerState - Opponent player state
 * @param {Array} localPlacedSections - Local player placed sections
 * @param {Array} opponentPlacedSections - Opponent player placed sections
 * @param {Object} gameEngine - Game engine instance
 * @param {Function} getPlacedSectionsForEngine - Function to get placed sections
 * @param {Function} handleTokenClick - Token click handler
 * @param {Function} handleAbilityIconClick - Ability icon click handler
 * @param {Object} selectedDrone - Currently selected drone
 * @param {Object} multiSelectState - Multi-select state
 * @param {Array} recentlyHitDrones - Recently hit drone IDs
 * @param {Array} potentialInterceptors - Potential interceptor drone IDs
 * @param {Array} potentialGuardians - Potential guardian drone IDs
 * @param {Object} droneRefs - Drone DOM references
 * @param {Object} mandatoryAction - Mandatory action state
 * @param {Array} validAbilityTargets - Valid ability targets
 * @param {Array} validCardTargets - Valid card targets
 * @param {Function} setHoveredTarget - Function to set hovered target
 * @param {Object} interceptedBadge - Interception badge data ({ droneId, timestamp })
 */
const renderDronesOnBoard = (
  drones,
  isPlayer,
  lane,
  localPlayerState,
  opponentPlayerState,
  localPlacedSections,
  opponentPlacedSections,
  gameEngine,
  getPlacedSectionsForEngine,
  handleTokenClick,
  handleAbilityIconClick,
  selectedDrone,
  multiSelectState,
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
  abilityMode
) => {
  return (
    <div
      className="flex flex-wrap gap-8 justify-center items-center"
      style={{ minHeight: 'clamp(130px, 6.77vw, 175px)', paddingTop: '2px' }}
    >
     {drones.map((drone) => {
          // Calculate isActionTarget conditions for debugging
          const abilityTargetMatch = validAbilityTargets.some(t => t.id === drone.id);
          const cardTargetMatch = validCardTargets.some(t => t.id === drone.id);
          const affectedDroneMatch = affectedDroneIds.includes(drone.id);
          const isActionTarget = abilityTargetMatch || cardTargetMatch || affectedDroneMatch;

          // Log when action targeting is active (for diagnosing highlighting issues)
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
              affectedDroneIds: affectedDroneIds.slice(0, 5)
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
              isSelectedForMove={multiSelectState?.phase === 'select_drones' && multiSelectState.selectedDrones.some(d => d.id === drone.id)}
              isHit={recentlyHitDrones.includes(drone.id)}
              isPotentialInterceptor={potentialInterceptors.includes(drone.id)}
              isPotentialGuardian={potentialGuardians.includes(drone.id)}
              droneRefs={droneRefs}
              mandatoryAction={mandatoryAction}
              localPlayerState={localPlayerState}
              isActionTarget={isActionTarget}
              onMouseEnter={() => {
                if (!isPlayer) {
                  setHoveredTarget({ target: drone, type: 'drone', lane });
                }
              }}
              onMouseLeave={() => {
                if (!isPlayer) {
                  setHoveredTarget(null);
                }
              }}
              interceptedBadge={interceptedBadge}
              enableFloatAnimation={true}
              deploymentOrderNumber={drone.deploymentOrderNumber}
              onDragStart={isPlayer ? handleDroneDragStart : undefined}
              onDragDrop={!isPlayer && draggedDrone ? (targetDrone) => handleDroneDragEnd(targetDrone, lane, true) : undefined}
              isDragging={draggedDrone?.drone?.id === drone.id}
              isHovered={!isPlayer && hoveredTarget?.target?.id === drone.id}
              draggedActionCard={draggedActionCard}
              onActionCardDrop={handleActionCardDragEnd}
              getLocalPlayerId={getLocalPlayerId}
              getOpponentPlayerId={getOpponentPlayerId}
              isAbilitySource={abilityMode?.drone?.id === drone.id}
               />
          );
      })}
    </div>
  );
};

/**
 * DRONE LANES DISPLAY COMPONENT
 * Renders the three battlefield lanes with their drone contents.
 * Handles lane targeting, deployment, and visual states.
 * @param {Object} player - Player state data
 * @param {boolean} isPlayer - Whether this is the current player's lanes
 * @param {Function} onLaneClick - Callback when a lane is clicked
 * @param {Function} getLocalPlayerId - Function to get local player ID
 * @param {Function} getOpponentPlayerId - Function to get opponent player ID
 * @param {Object} abilityMode - Current ability mode
 * @param {Array} validAbilityTargets - Valid ability targets
 * @param {Object} selectedCard - Currently selected card
 * @param {Array} validCardTargets - Valid card targets
 * @param {Object} multiSelectState - Multi-select state
 * @param {string} turnPhase - Current turn phase
 * @param {Object} localPlayerState - Local player state
 * @param {Object} opponentPlayerState - Opponent player state
 * @param {Array} localPlacedSections - Local player placed sections
 * @param {Array} opponentPlacedSections - Opponent player placed sections
 * @param {Object} gameEngine - Game engine instance
 * @param {Function} getPlacedSectionsForEngine - Function to get placed sections
 * @param {Function} handleTokenClick - Token click handler
 * @param {Function} handleAbilityIconClick - Ability icon click handler
 * @param {Object} selectedDrone - Currently selected drone
 * @param {Array} recentlyHitDrones - Recently hit drone IDs
 * @param {Array} potentialInterceptors - Potential interceptor drone IDs
 * @param {Array} potentialGuardians - Potential guardian drone IDs
 * @param {Object} droneRefs - Drone DOM references
 * @param {Object} mandatoryAction - Mandatory action state
 * @param {Function} setHoveredTarget - Function to set hovered target
 * @param {Object} interceptedBadge - Interception badge data ({ droneId, timestamp })
 */
// Hex grid SVG patterns for lane backgrounds
const createHexGridPattern = (strokeColor) => {
  // Flat-topped hexagon grid pattern that tiles seamlessly
  const svg = `<svg width="56" height="32" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,0 L42,0 L56,16 L42,32 L14,32 L0,16 Z" fill="none" stroke="${strokeColor}" stroke-width="0.5" opacity="0.2"/>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const cyanHexGrid = createHexGridPattern('#06b6d4');
const redHexGrid = createHexGridPattern('#ef4444');

const DroneLanesDisplay = ({
  player,
  isPlayer,
  onLaneClick,
  getLocalPlayerId,
  getOpponentPlayerId,
  abilityMode,
  validAbilityTargets,
  selectedCard,
  validCardTargets,
  affectedDroneIds = [],
  multiSelectState,
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
  // Action card drag-and-drop props
  draggedActionCard = null,
  handleActionCardDragEnd = null,
  // Lane hover targeting props
  hoveredLane = null,
  setHoveredLane = null,
  // Lane drag-and-drop props (for Quick Deploy editor)
  onLaneDrop = null,
  onLaneDragOver = null,
  // Lane control for Doctrine cards
  laneControl = { lane1: null, lane2: null, lane3: null }
}) => {
  // Use GameDataService for computed data
  const { getEffectiveStats } = useGameData();
  return (
    <div
      className="flex w-full justify-between gap-8"
      style={{ minHeight: 'max(15.5vh, clamp(140px, 7.292vw, 190px))' }}
    >
      {['lane1', 'lane2', 'lane3'].map((lane) => {
        const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
        // Check if this lane is a valid target for action card LANE targeting
        const isActionCardLaneTarget = draggedActionCard &&
          draggedActionCard.card?.targeting?.type === 'LANE' &&
          validCardTargets.some(t => t.id === lane && t.owner === owner);

        const isTargetable = (abilityMode && validAbilityTargets.some(t => t.id === lane && t.owner === owner)) ||
                             (selectedCard && validCardTargets.some(t => t.id === lane && t.owner === owner)) ||
                             (multiSelectState && validCardTargets.some(t => t.id === lane && t.owner === owner)) ||
                             (draggedCard && isPlayer) || // Highlight player lanes when dragging a deployment card
                             isActionCardLaneTarget; // Highlight lanes when dragging a LANE targeting action card

        // Debug logging for movement lanes
        if (multiSelectState && validCardTargets.length > 0) {
          debugLog('MOVEMENT_LANES', `Lane ${lane}: isPlayer=${isPlayer}, owner=${owner}, isTargetable=${isTargetable}`, {
            validTargetsForThisLane: validCardTargets.filter(t => t.id === lane)
          });
        }

        const isInteractivePlayerLane = isPlayer && (turnPhase === 'deployment' || turnPhase === 'action');
        const baseBackgroundColor = isPlayer ? 'bg-cyan-400/10' : 'bg-red-500/10';

        // Determine lane control state for visual indicators (Doctrine cards)
        const laneControlState = laneControl[lane];
        const localPlayerId = getLocalPlayerId();
        const opponentPlayerId = getOpponentPlayerId();
        const isPlayerControlled = laneControlState === localPlayerId;
        const isOpponentControlled = laneControlState === opponentPlayerId;

        // Calculate lane border and background classes based on control
        let laneBorderClass = 'border-2 border-gray-700/30';  // Default neutral
        let laneBackgroundClass = baseBackgroundColor;

        // Apply control styling based on whose lanes we're rendering
        if (isPlayer && isPlayerControlled) {
          // Player controls this lane AND we're rendering player's lanes - show cyan
          laneBorderClass = 'border-[3px] border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.4)]';
          laneBackgroundClass = 'bg-cyan-400/15';
        } else if (!isPlayer && isOpponentControlled) {
          // Opponent controls this lane AND we're rendering opponent's lanes - show red
          laneBorderClass = 'border-[3px] border-red-400/70 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
          // DON'T change background - keep default opponent background
        }

        return (
          <div
            key={lane}
            data-testid={`lane-drop-zone-${lane === 'lane1' ? 'left' : lane === 'lane2' ? 'middle' : 'right'}`}
            onClick={(e) => onLaneClick(e, lane, isPlayer)}
            onDragOver={(e) => onLaneDragOver?.(e)}
            onDrop={(e) => onLaneDrop?.(e, lane)}
            onMouseEnter={() => {
              // Handle lane hover for LANE-targeting action cards
              if (draggedActionCard &&
                  draggedActionCard.card?.targeting?.type === 'LANE' &&
                  isActionCardLaneTarget &&
                  setHoveredLane) {
                setHoveredLane({ id: lane, owner });
              }
            }}
            onMouseLeave={() => {
              // Clear lane hover when mouse leaves during action card drag
              if (draggedActionCard &&
                  draggedActionCard.card?.targeting?.type === 'LANE' &&
                  setHoveredLane) {
                setHoveredLane(null);
              }
            }}
            onMouseUp={() => {
              // Handle card drop when dragging a card to player lanes
              debugLog('DRAG_DROP_DEPLOY', '🎯 Lane mouseUp detected', { lane, isPlayer, hasDraggedCard: !!draggedCard, hasDraggedDrone: !!draggedDrone });

              // Handle action card drop on lanes (LANE targeting)
              if (draggedActionCard && handleActionCardDragEnd) {
                const card = draggedActionCard.card;
                if (card?.targeting?.type === 'LANE') {
                  handleActionCardDragEnd({ id: lane, name: lane }, 'lane', owner);
                  return;
                }
              }

              if (draggedCard && isPlayer && handleCardDragEnd) {
                handleCardDragEnd(lane);
              }
              // Handle drone drop for movement (to player lanes)
              if (draggedDrone && isPlayer && handleDroneDragEnd) {
                handleDroneDragEnd(null, lane, false);
              }
            }}
            className={`flex-1 rounded-lg transition-all duration-1000 ease-in-out p-2 ${laneBorderClass}
              ${isTargetable ? 'bg-cyan-800/40 ring-2 ring-cyan-400/30' : laneBackgroundClass}
              ${isInteractivePlayerLane ? 'cursor-pointer hover:bg-cyan-900/20' : ''}
            `}
            style={{
              backgroundImage: isPlayer ? cyanHexGrid : redHexGrid,
              backgroundSize: '56px 32px'
            }}
          >
            {renderDronesOnBoard(
              player.dronesOnBoard[lane],
              isPlayer,
              lane,
              localPlayerState,
              opponentPlayerState,
              localPlacedSections,
              opponentPlacedSections,
              gameEngine,
              getPlacedSectionsForEngine,
              handleTokenClick,
              handleAbilityIconClick,
              selectedDrone,
              multiSelectState,
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
              abilityMode
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DroneLanesDisplay;