// ========================================
// GAME BATTLEFIELD COMPONENT
// ========================================
// Main battlefield area — 3-column CSS Grid layout.
// Each column (BattleColumn) renders: opponent ship → opponent lane → player lane → player ship.

import React from 'react';
import BattleColumn from './BattleColumn.jsx';
import { useGameData } from '../../hooks/useGameData.js';
import useMineWarning from '../../hooks/useMineWarning.js';

function GameBattlefield({
  localPlayerState,
  opponentPlayerState,
  localPlacedSections,
  opponentPlacedSections,
  selectedCard,
  validCardTargets,
  affectedDroneIds = [],
  affectedSectionIds = [],
  abilityMode,
  validAbilityTargets,
  effectChainState,
  turnPhase,
  reallocationPhase,
  pendingShieldAllocations,
  pendingShieldChanges,
  shipAbilityMode,
  hoveredTarget,
  selectedDrone,
  recentlyHitDrones,
  potentialInterceptors,
  potentialGuardians,
  droneRefs,
  sectionRefs,
  mandatoryAction,
  gameEngine,
  getLocalPlayerId,
  getOpponentPlayerId,
  isMyTurn,
  getPlacedSectionsForEngine,
  passInfo,
  handleTargetClick,
  handleLaneClick,
  handleShipSectionClick,
  handleShipAbilityClick,
  handleTokenClick,
  handleAbilityIconClick,
  setHoveredTarget,
  onViewShipSection,
  onViewTechDetail,
  interceptedBadge,
  draggedCard,
  handleCardDragEnd,
  draggedDrone,
  handleDroneDragStart,
  handleDroneDragEnd,
  draggedActionCard,
  handleActionCardDragEnd,
  hoveredLane,
  setHoveredLane,
  laneControl,
  insertionPreview,
  setInsertionPreview,
  onLaneMouseMove,
}) {
  // Compute effective ship stats once, pass down to all columns
  const { getEffectiveShipStats } = useGameData();
  const opponentEffectiveStats = getEffectiveShipStats(opponentPlayerState, opponentPlacedSections);
  const localEffectiveStats = getEffectiveShipStats(localPlayerState, localPlacedSections);

  // Mine warning — detects when hover/drag would trigger opponent mines
  const { warnedMineIds } = useMineWarning({
    draggedCard,
    draggedDrone,
    insertionPreview,
    selectedDrone,
    hoveredTarget,
    turnPhase,
    localPlayerState,
    opponentPlayerState,
  });

  // Shared props passed to every BattleColumn
  const sharedProps = {
    localPlayerState,
    opponentPlayerState,
    localPlacedSections,
    opponentPlacedSections,
    selectedCard,
    validCardTargets,
    affectedDroneIds,
    affectedSectionIds,
    abilityMode,
    validAbilityTargets,
    effectChainState,
    turnPhase,
    reallocationPhase,
    pendingShieldAllocations,
    pendingShieldChanges,
    shipAbilityMode,
    hoveredTarget,
    selectedDrone,
    recentlyHitDrones,
    potentialInterceptors,
    potentialGuardians,
    droneRefs,
    sectionRefs,
    mandatoryAction,
    gameEngine,
    getLocalPlayerId,
    getOpponentPlayerId,
    isMyTurn,
    getPlacedSectionsForEngine,
    passInfo,
    handleTargetClick,
    handleLaneClick,
    handleShipSectionClick,
    handleShipAbilityClick,
    handleTokenClick,
    handleAbilityIconClick,
    setHoveredTarget,
    onViewShipSection,
    onViewTechDetail,
    interceptedBadge,
    draggedCard,
    handleCardDragEnd,
    draggedDrone,
    handleDroneDragStart,
    handleDroneDragEnd,
    draggedActionCard,
    handleActionCardDragEnd,
    hoveredLane,
    setHoveredLane,
    laneControl,
    opponentEffectiveStats,
    localEffectiveStats,
    insertionPreview,
    setInsertionPreview,
    onLaneMouseMove,
    warnedMineIds,
  };

  return (
    <main
      className="flex-grow min-h-0 w-full overflow-visible px-5 pb-4"
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr', gap: '1%' }}
    >
      {['lane1', 'lane2', 'lane3'].map((laneId, idx) => (
        <BattleColumn
          key={laneId}
          laneId={laneId}
          sectionIndex={idx}
          {...sharedProps}
        />
      ))}
    </main>
  );
}

export default GameBattlefield;
