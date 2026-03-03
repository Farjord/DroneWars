// ========================================
// BATTLE COLUMN COMPONENT
// ========================================
// Renders one vertical column of the battlefield:
// Opponent Ship Section → Opponent Lane → Player Lane → Player Ship Section
// Used by GameBattlefield's 3-column CSS Grid layout.

import React from 'react';
import ShipSectionCompact from './ShipSectionCompact.jsx';
import SingleLaneView from './SingleLaneView.jsx';
import TechSlots from './TechSlots.jsx';
import LaneControlBar from './LaneControlBar.jsx';
import { debugLog } from '../../utils/debugLogger.js';
import { resolveShipSectionStats } from '../../logic/cards/shipSectionImageResolver.js';

const SECTION_SLOT_HEIGHT = 'clamp(143px, 6.25vw, 184px)';

/**
 * Renders the ShipSectionCompact for a single section within a column.
 * Extracts per-section stat resolution, shield display, and targeting logic
 * previously in ShipSectionsDisplay.
 */
const ShipSectionSlot = ({
  player,
  isPlayer,
  sectionIndex,
  columnIndex,
  placedSections,
  onSectionClick,
  onAbilityClick,
  onTargetClick,
  onViewFullCard,
  isInteractive,
  validCardTargets,
  selectedDrone,
  reallocationPhase,
  pendingShieldAllocations,
  pendingShieldChanges,
  gameEngine,
  turnPhase,
  isMyTurn,
  passInfo,
  getLocalPlayerId,
  localPlayerState,
  shipAbilityMode,
  hoveredTarget,
  setHoveredTarget,
  sectionRefs,
  draggedDrone,
  handleDroneDragEnd,
  draggedActionCard,
  handleActionCardDragEnd,
  playerEffectiveStats,
}) => {
  const sectionName = placedSections[sectionIndex];

  if (!sectionName) {
    debugLog('STATE_SYNC', `Lane ${sectionIndex} rendering EMPTY div - no hover possible:`, {
      sectionName,
      sectionNameType: typeof sectionName,
      sectionNameValue: JSON.stringify(sectionName),
      isPlayer,
      entirePlacedSections: placedSections,
      playerShipSections: player?.shipSections ? Object.keys(player.shipSections) : 'NO_SHIP_SECTIONS'
    });
    return (
      <div
        className="bg-black/20 rounded-lg border-2 border-dashed border-gray-700"
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    );
  }

  const sectionStats = player.shipSections[sectionName];
  const resolvedSectionStats = resolveShipSectionStats(sectionStats, player.shipId);

  // Calculate display stats based on phase
  let displayStats;
  if (turnPhase === 'allocateShields' && isPlayer && pendingShieldAllocations) {
    displayStats = {
      ...resolvedSectionStats,
      allocatedShields: pendingShieldAllocations[sectionName] || 0
    };
  } else if (reallocationPhase && isPlayer && pendingShieldChanges) {
    const delta = pendingShieldChanges[sectionName] || 0;
    displayStats = {
      ...resolvedSectionStats,
      allocatedShields: resolvedSectionStats.allocatedShields + delta
    };
  } else {
    displayStats = resolvedSectionStats;
  }

  const localPlayerId = getLocalPlayerId();
  const currentPlayerId = isPlayer ? localPlayerId : (localPlayerId === 'player1' ? 'player2' : 'player1');

  // Targeting mode prevents modal from opening during targeting
  const isTargetingMode = validCardTargets.length > 0 || (selectedDrone && !isPlayer);
  const isCardTarget = validCardTargets.some(t => t.id === sectionName && t.owner === currentPlayerId);

  // Shield reallocation visual state
  let reallocationState = null;
  if (reallocationPhase && isPlayer) {
    if (reallocationPhase === 'removing') {
      reallocationState = displayStats.allocatedShields > 0 ? 'can-remove' : 'cannot-remove';
    } else if (reallocationPhase === 'adding') {
      const effectiveMaxShields = gameEngine.getEffectiveSectionMaxShields(sectionName, player, placedSections);
      reallocationState = displayStats.allocatedShields < effectiveMaxShields ? 'can-add' : 'cannot-add';
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%'
      }}
      onMouseUp={() => {
        if (draggedActionCard && handleActionCardDragEnd) {
          const card = draggedActionCard.card;
          if (card?.targeting?.type === 'SHIP_SECTION') {
            const targetSection = { id: sectionName, name: sectionName };
            debugLog('DRAG_DROP_DEPLOY', '🎯 Ship section action card drop detected', { sectionName, card: card.name });
            handleActionCardDragEnd(targetSection, 'section', currentPlayerId);
          }
        }
        if (draggedDrone && !isPlayer && handleDroneDragEnd) {
          const targetLane = `lane${sectionIndex + 1}`;
          const targetSection = { ...sectionStats, id: sectionName, name: sectionName };
          debugLog('DRAG_DROP_DEPLOY', '🎯 Ship section mouseUp detected', { sectionName, targetLane });
          handleDroneDragEnd(targetSection, targetLane, true, 'section');
        }
      }}
    >
      <ShipSectionCompact
        section={sectionName}
        stats={displayStats}
        isPlayer={isPlayer}
        isOpponent={!isPlayer}
        columnIndex={columnIndex}
        isTargetingMode={isTargetingMode}
        onClick={() => {
          debugLog('SHIELD_CLICKS', `🖱️ ShipSection clicked: ${sectionName}`, {
            isInteractive,
            hasOnSectionClick: !!onSectionClick,
            hasOnTargetClick: !!onTargetClick,
            isPlayer,
            turnPhase,
            willCallOnSectionClick: isInteractive && onSectionClick,
            willCallOnTargetClick: !isInteractive && onTargetClick
          });
          if (isInteractive && onSectionClick) {
            debugLog('SHIELD_CLICKS', `✅ Calling onSectionClick for ${sectionName}`);
            onSectionClick(sectionName);
            return true;
          } else if (onTargetClick && (isCardTarget || (selectedDrone && !isPlayer))) {
            debugLog('SHIELD_CLICKS', `🎯 Calling onTargetClick for ${sectionName}`);
            onTargetClick({ ...sectionStats, id: sectionName, name: sectionName }, 'section', isPlayer);
            return true;
          }
          return false;
        }}
        onAbilityClick={onAbilityClick}
        onViewFullCard={() => {
          if (onViewFullCard) {
            onViewFullCard({
              sectionName,
              sectionStats: resolvedSectionStats,
              effectiveStats: playerEffectiveStats.bySection[sectionName],
              isInMiddleLane: sectionIndex === 1,
              isPlayer
            });
          }
        }}
        isInteractive={isInteractive || (turnPhase === 'action' && isPlayer && sectionStats.ability && localPlayerState.energy >= sectionStats.ability.cost.energy)}
        isCardTarget={isCardTarget}
        isInMiddleLane={sectionIndex === 1}
        isHovered={hoveredTarget?.type === 'section' && hoveredTarget?.target.name === sectionName && hoveredTarget?.isOpponent === !isPlayer}
        onMouseEnter={() => !isPlayer && setHoveredTarget({ target: { ...sectionStats, name: sectionName }, type: 'section', isOpponent: true })}
        onMouseLeave={() => !isPlayer && setHoveredTarget(null)}
        reallocationState={reallocationState}
        gameEngine={gameEngine}
        turnPhase={turnPhase}
        isMyTurn={isMyTurn}
        passInfo={passInfo}
        getLocalPlayerId={getLocalPlayerId}
        localPlayerState={localPlayerState}
        shipAbilityMode={shipAbilityMode}
        sectionRef={(el) => {
          if (sectionRefs && el) {
            const refKey = `${isPlayer ? 'local' : 'opponent'}-${sectionName}`;
            sectionRefs.current[refKey] = el;
          }
        }}
      />
    </div>
  );
};

/**
 * BattleColumn renders one vertical column of the battlefield.
 * Layout: Opponent Ship → Opponent Lane → [LaneEffects placeholder] → Player Lane → Player Ship
 */
const BattleColumn = ({
  laneId,
  sectionIndex,
  // Player states
  localPlayerState,
  opponentPlayerState,
  localPlacedSections,
  opponentPlacedSections,
  // Card/ability targeting
  selectedCard,
  validCardTargets,
  affectedDroneIds,
  abilityMode,
  validAbilityTargets,
  effectChainState,
  // Game state
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
  // Callbacks
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
  // Drag-and-drop
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
  // Computed stats (passed from parent to avoid per-column hook calls)
  opponentEffectiveStats,
  localEffectiveStats,
}) => {
  const playerShipInteractive = turnPhase === 'allocateShields' || reallocationPhase;

  // Shared props for SingleLaneView (both opponent and player lanes)
  const sharedLaneProps = {
    onLaneClick: handleLaneClick,
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
    interceptedBadge,
    draggedDrone,
    handleDroneDragStart,
    handleDroneDragEnd,
    draggedActionCard,
    handleActionCardDragEnd,
    hoveredLane,
    setHoveredLane,
    laneControl,
  };

  // Shared props for ShipSectionSlot
  const sharedSectionProps = {
    sectionIndex,
    columnIndex: sectionIndex,
    validCardTargets,
    selectedDrone,
    gameEngine,
    turnPhase,
    isMyTurn,
    passInfo,
    getLocalPlayerId,
    localPlayerState,
    shipAbilityMode,
    hoveredTarget,
    setHoveredTarget,
    sectionRefs,
    draggedActionCard,
    handleActionCardDragEnd,
  };

  return (
    <div className="flex flex-col items-center min-w-0" style={{ overflow: 'visible', height: '100%' }}>
      {/* Opponent Ship Section — 30% height, behind lanes */}
      <div style={{ height: '27.5%', width: '100%', marginTop: '2.5%', position: 'relative', zIndex: 1 }}>
        <ShipSectionSlot
          player={opponentPlayerState}
          isPlayer={false}
          placedSections={opponentPlacedSections}
          onTargetClick={handleTargetClick}
          onViewFullCard={onViewShipSection}
          isInteractive={false}
          reallocationPhase={null}
          pendingShieldAllocations={null}
          pendingShieldChanges={null}
          draggedDrone={draggedDrone}
          handleDroneDragEnd={handleDroneDragEnd}
          playerEffectiveStats={opponentEffectiveStats}
          {...sharedSectionProps}
        />
      </div>

      {/* Opponent Lane — 29% height, overlaps ship by -10% margin */}
      <div style={{ height: '29%', width: '100%', marginTop: '-10%', position: 'relative', zIndex: 5 }}>
        <SingleLaneView
          laneId={laneId}
          isPlayer={false}
          player={opponentPlayerState}
          {...sharedLaneProps}
        />
        <TechSlots
          faction="opponent"
          techDrones={opponentPlayerState.techSlots?.[laneId] || []}
          onTechClick={onViewTechDetail}
        />
      </div>

      {/* Centre gap — sized so tech-slot translateY(50%) from each lane doesn't overlap */}
      <div style={{ height: '6%', width: '100%', position: 'relative' }}>
        <LaneControlBar
          laneControlState={laneControl[laneId]}
          localPlayerId={getLocalPlayerId()}
        />
      </div>

      {/* Player Lane — 29% height */}
      <div style={{ height: '29%', width: '100%', position: 'relative', zIndex: 5 }}>
        <SingleLaneView
          laneId={laneId}
          isPlayer={true}
          player={localPlayerState}
          draggedCard={draggedCard}
          handleCardDragEnd={handleCardDragEnd}
          {...sharedLaneProps}
        />
        <TechSlots
          faction="player"
          techDrones={localPlayerState.techSlots?.[laneId] || []}
          onTechClick={onViewTechDetail}
        />
      </div>

      {/* Player Ship Section — 27.5% height, overlaps lane by -10% margin, behind lanes */}
      <div style={{ height: '27.5%', width: '100%', marginTop: '-10%', marginBottom: '2.5%', position: 'relative', zIndex: 1 }}>
        <ShipSectionSlot
          player={localPlayerState}
          isPlayer={true}
          placedSections={localPlacedSections}
          onSectionClick={handleShipSectionClick}
          onAbilityClick={handleShipAbilityClick}
          onTargetClick={handleTargetClick}
          onViewFullCard={onViewShipSection}
          isInteractive={playerShipInteractive}
          reallocationPhase={reallocationPhase}
          pendingShieldAllocations={pendingShieldAllocations}
          pendingShieldChanges={pendingShieldChanges}
          draggedDrone={null}
          handleDroneDragEnd={null}
          playerEffectiveStats={localEffectiveStats}
          {...sharedSectionProps}
        />
      </div>
    </div>
  );
};

export default BattleColumn;
