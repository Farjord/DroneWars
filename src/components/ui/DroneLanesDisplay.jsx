// ========================================
// DRONE LANES DISPLAY COMPONENT
// ========================================
// Renders the three battlefield lanes with their drone contents.
// Thin wrapper over SingleLaneView — preserves the external API for
// GameBattlefield and QuickDeployEditorScreen consumers.

import React from 'react';
import SingleLaneView from './SingleLaneView.jsx';

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
  interceptedBadge = null,
}) => {
  const sharedProps = {
    isPlayer,
    player,
    onLaneClick,
    getLocalPlayerId,
    getOpponentPlayerId,
    abilityMode,
    validAbilityTargets,
    selectedCard,
    validCardTargets,
    affectedDroneIds,
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
    draggedCard,
    handleCardDragEnd,
    draggedDrone,
    handleDroneDragStart,
    handleDroneDragEnd,
    draggedActionCard,
    handleActionCardDragEnd,
    hoveredLane,
    setHoveredLane,
    onLaneDrop,
    onLaneDragOver,
    laneControl,
    interceptedBadge,
  };

  return (
    <div
      className="flex w-full justify-between gap-8"
      style={{ minHeight: 'max(15.5vh, clamp(140px, 7.292vw, 190px))' }}
    >
      {['lane1', 'lane2', 'lane3'].map((laneId) => (
        <SingleLaneView
          key={laneId}
          laneId={laneId}
          {...sharedProps}
        />
      ))}
    </div>
  );
};

export default DroneLanesDisplay;
