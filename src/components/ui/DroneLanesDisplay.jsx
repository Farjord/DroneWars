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
  setHoveredTarget,
  interceptedBadge
) => {
  return (
    <div
      className="flex flex-wrap gap-8 justify-center items-center"
      style={{ minHeight: 'clamp(130px, 6.77vw, 175px)', paddingTop: '2px' }}
    >
     {drones.map((drone) => {
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
              isActionTarget={validAbilityTargets.some(t => t.id === drone.id) || validCardTargets.some(t => t.id === drone.id)}
              onMouseEnter={() => !isPlayer && setHoveredTarget({ target: drone, type: 'drone', lane })}
              onMouseLeave={() => !isPlayer && setHoveredTarget(null)}
              interceptedBadge={interceptedBadge}
              enableFloatAnimation={true}
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
  interceptedBadge
}) => {
  // Use GameDataService for computed data
  const { getEffectiveStats } = useGameData();
  return (
    <div
      className="flex w-full justify-between gap-8"
      style={{ minHeight: 'clamp(140px, 7.292vw, 190px)' }}
    >
      {['lane1', 'lane2', 'lane3'].map((lane) => {
        const owner = isPlayer ? getLocalPlayerId() : getOpponentPlayerId();
        const isTargetable = (abilityMode && validAbilityTargets.some(t => t.id === lane && t.owner === owner)) ||
                             (selectedCard && validCardTargets.some(t => t.id === lane && t.owner === owner)) ||
                             (multiSelectState && validCardTargets.some(t => t.id === lane && t.owner === owner));

        // Debug logging for movement lanes
        if (multiSelectState && validCardTargets.length > 0) {
          debugLog('MOVEMENT_LANES', `Lane ${lane}: isPlayer=${isPlayer}, owner=${owner}, isTargetable=${isTargetable}`, {
            validTargetsForThisLane: validCardTargets.filter(t => t.id === lane)
          });
        }

        const isInteractivePlayerLane = isPlayer && (turnPhase === 'deployment' || turnPhase === 'action');
        const baseBackgroundColor = isPlayer ? 'bg-cyan-400/10' : 'bg-pink-500/10';

        return (
          <div
            key={lane}
            onClick={(e) => onLaneClick(e, lane, isPlayer)}
            className={`flex-1 rounded-lg transition-all duration-200 p-2
              ${isTargetable ? 'bg-purple-900/40 ring-2 ring-purple-400 animate-pulse' : baseBackgroundColor}
              ${isInteractivePlayerLane ? 'cursor-pointer hover:bg-cyan-900/20' : ''}
            `}
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
              setHoveredTarget,
              interceptedBadge
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DroneLanesDisplay;