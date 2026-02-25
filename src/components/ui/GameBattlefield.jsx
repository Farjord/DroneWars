// ========================================
// GAME BATTLEFIELD COMPONENT
// ========================================
// Main battlefield area showing ship sections and drone lanes
// Extracted from App.jsx for better component organization

import React from 'react';
import ShipSectionsDisplay from './ShipSectionsDisplay.jsx';
import DroneLanesDisplay from './DroneLanesDisplay.jsx';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * GameBattlefield - Main game battlefield displaying ships and drone lanes
 * @param {Object} props - Component props
 * @param {Object} props.localPlayerState - Local player state data
 * @param {Object} props.opponentPlayerState - Opponent player state data
 * @param {Array} props.localPlacedSections - Local player placed sections
 * @param {Array} props.opponentPlacedSections - Opponent player placed sections
 * @param {Object} props.selectedCard - Currently selected card
 * @param {Array} props.validCardTargets - Valid targets for selected card
 * @param {Object} props.abilityMode - Current ability mode state
 * @param {Array} props.validAbilityTargets - Valid targets for ability
 * @param {string} props.turnPhase - Current turn phase
 * @param {string} props.reallocationPhase - Current reallocation phase
 * @param {Object} props.shipAbilityMode - Ship ability mode state
 * @param {Object} props.hoveredTarget - Currently hovered target
 * @param {Object} props.selectedDrone - Currently selected drone
 * @param {Array} props.recentlyHitDrones - Recently hit drones array
 * @param {Array} props.potentialInterceptors - Potential interceptor drones
 * @param {Array} props.potentialGuardians - Potential guardian drones blocking attacks
 * @param {Object} props.droneRefs - Drone reference objects
 * @param {boolean} props.mandatoryAction - Whether there's a mandatory action
 * @param {Object} props.gameEngine - Game engine instance
 * @param {Function} props.getLocalPlayerId - Get local player ID
 * @param {Function} props.getOpponentPlayerId - Get opponent player ID
 * @param {Function} props.isMyTurn - Check if it's local player's turn
 * @param {Function} props.getPlacedSectionsForEngine - Get placed sections for engine
 * @param {Object} props.passInfo - Pass information
 * @param {Function} props.handleTargetClick - Handle target click
 * @param {Function} props.handleLaneClick - Handle lane click
 * @param {Function} props.handleShipSectionClick - Handle ship section click
 * @param {Function} props.handleShipAbilityClick - Handle ship ability click
 * @param {Function} props.handleTokenClick - Handle token click
 * @param {Function} props.handleAbilityIconClick - Handle ability icon click
 * @param {Function} props.setHoveredTarget - Set hovered target
 * @param {Function} props.onViewShipSection - Handle view ship section full card
 * @param {Object} props.interceptedBadge - Interception badge data ({ droneId, timestamp })
 * @param {Object} props.draggedDrone - Currently dragged drone for attack/move
 * @param {Function} props.handleDroneDragStart - Handler to start drone drag
 * @param {Function} props.handleDroneDragEnd - Handler to end drone drag
 * @param {Object} props.laneControl - Lane control state ({ lane1: 'player1'|'player2'|null, lane2: ..., lane3: ... })
 */
function GameBattlefield({
  localPlayerState,
  opponentPlayerState,
  localPlacedSections,
  opponentPlacedSections,
  selectedCard,
  validCardTargets,
  affectedDroneIds = [],
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
  laneControl
}) {
  // Calculate isInteractive for player ship sections
  const playerShipInteractive = turnPhase === 'allocateShields' || reallocationPhase;

  return (
    <main className="flex-grow min-h-0 w-full flex flex-col items-center overflow-y-auto dw-modal-scroll px-5 pb-4">
      {/* All pre-game phases now handled by AppRouter - only active gameplay here */}
      <div className="flex flex-col items-center w-full space-y-2">
        {/* Opponent Ship Sections */}
        <ShipSectionsDisplay
          player={opponentPlayerState}
          isPlayer={false}
          placedSections={opponentPlacedSections}
          onTargetClick={handleTargetClick}
          onViewFullCard={onViewShipSection}
          isInteractive={false}
          selectedCard={selectedCard}
          validCardTargets={validCardTargets}
          selectedDrone={selectedDrone}
          gameEngine={gameEngine}
          turnPhase={turnPhase}
          isMyTurn={isMyTurn}
          passInfo={passInfo}
          getLocalPlayerId={getLocalPlayerId}
          localPlayerState={localPlayerState}
          shipAbilityMode={shipAbilityMode}
          hoveredTarget={hoveredTarget}
          setHoveredTarget={setHoveredTarget}
          sectionRefs={sectionRefs}
          draggedDrone={draggedDrone}
          handleDroneDragEnd={handleDroneDragEnd}
          draggedActionCard={draggedActionCard}
          handleActionCardDragEnd={handleActionCardDragEnd}
        />

        {/* Opponent Drone Lanes */}
        <DroneLanesDisplay
          player={opponentPlayerState}
          isPlayer={false}
          onLaneClick={handleLaneClick}
          getLocalPlayerId={getLocalPlayerId}
          getOpponentPlayerId={getOpponentPlayerId}
          abilityMode={abilityMode}
          validAbilityTargets={validAbilityTargets}
          selectedCard={selectedCard}
          validCardTargets={validCardTargets}
          affectedDroneIds={affectedDroneIds}
          effectChainState={effectChainState}
          turnPhase={turnPhase}
          localPlayerState={localPlayerState}
          opponentPlayerState={opponentPlayerState}
          localPlacedSections={localPlacedSections}
          opponentPlacedSections={opponentPlacedSections}
          gameEngine={gameEngine}
          getPlacedSectionsForEngine={getPlacedSectionsForEngine}
          handleTokenClick={handleTokenClick}
          handleAbilityIconClick={handleAbilityIconClick}
          selectedDrone={selectedDrone}
          recentlyHitDrones={recentlyHitDrones}
          potentialInterceptors={potentialInterceptors}
          potentialGuardians={potentialGuardians}
          droneRefs={droneRefs}
          mandatoryAction={mandatoryAction}
          setHoveredTarget={setHoveredTarget}
          hoveredTarget={hoveredTarget}
          interceptedBadge={interceptedBadge}
          draggedDrone={draggedDrone}
          handleDroneDragStart={handleDroneDragStart}
          handleDroneDragEnd={handleDroneDragEnd}
          draggedActionCard={draggedActionCard}
          handleActionCardDragEnd={handleActionCardDragEnd}
          hoveredLane={hoveredLane}
          setHoveredLane={setHoveredLane}
          laneControl={laneControl}
        />

        {/* Player Drone Lanes */}
        <DroneLanesDisplay
          player={localPlayerState}
          isPlayer={true}
          onLaneClick={handleLaneClick}
          getLocalPlayerId={getLocalPlayerId}
          getOpponentPlayerId={getOpponentPlayerId}
          abilityMode={abilityMode}
          validAbilityTargets={validAbilityTargets}
          selectedCard={selectedCard}
          validCardTargets={validCardTargets}
          affectedDroneIds={affectedDroneIds}
          effectChainState={effectChainState}
          turnPhase={turnPhase}
          localPlayerState={localPlayerState}
          opponentPlayerState={opponentPlayerState}
          localPlacedSections={localPlacedSections}
          opponentPlacedSections={opponentPlacedSections}
          gameEngine={gameEngine}
          getPlacedSectionsForEngine={getPlacedSectionsForEngine}
          handleTokenClick={handleTokenClick}
          handleAbilityIconClick={handleAbilityIconClick}
          selectedDrone={selectedDrone}
          recentlyHitDrones={recentlyHitDrones}
          potentialInterceptors={potentialInterceptors}
          potentialGuardians={potentialGuardians}
          droneRefs={droneRefs}
          mandatoryAction={mandatoryAction}
          setHoveredTarget={setHoveredTarget}
          hoveredTarget={hoveredTarget}
          interceptedBadge={interceptedBadge}
          draggedCard={draggedCard}
          handleCardDragEnd={handleCardDragEnd}
          draggedDrone={draggedDrone}
          handleDroneDragStart={handleDroneDragStart}
          handleDroneDragEnd={handleDroneDragEnd}
          draggedActionCard={draggedActionCard}
          handleActionCardDragEnd={handleActionCardDragEnd}
          hoveredLane={hoveredLane}
          setHoveredLane={setHoveredLane}
          laneControl={laneControl}
        />

        {/* Player Ship Sections */}
        <ShipSectionsDisplay
          player={localPlayerState}
          isPlayer={true}
          placedSections={localPlacedSections}
          onSectionClick={handleShipSectionClick}
          onAbilityClick={handleShipAbilityClick}
          onTargetClick={handleTargetClick}
          onViewFullCard={onViewShipSection}
          isInteractive={playerShipInteractive}
          selectedCard={selectedCard}
          validCardTargets={validCardTargets}
          reallocationPhase={reallocationPhase}
          pendingShieldAllocations={pendingShieldAllocations}
          pendingShieldChanges={pendingShieldChanges}
          gameEngine={gameEngine}
          turnPhase={turnPhase}
          isMyTurn={isMyTurn}
          passInfo={passInfo}
          getLocalPlayerId={getLocalPlayerId}
          localPlayerState={localPlayerState}
          shipAbilityMode={shipAbilityMode}
          hoveredTarget={hoveredTarget}
          setHoveredTarget={setHoveredTarget}
          sectionRefs={sectionRefs}
          draggedActionCard={draggedActionCard}
          handleActionCardDragEnd={handleActionCardDragEnd}
        />
      </div>
    </main>
  );
}

export default GameBattlefield;