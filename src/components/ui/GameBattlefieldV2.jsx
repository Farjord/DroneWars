// ========================================
// GAME BATTLEFIELD COMPONENT V2
// ========================================
// Main battlefield area showing ship sections and drone lanes
// V2: Experimental UI redesign - safe to modify without affecting original
// Original: GameBattlefield.jsx remains as fallback

import React from 'react';
import ShipSectionsDisplay from './ShipSectionsDisplay.jsx';
import DroneLanesDisplay from './DroneLanesDisplay.jsx';
import { debugLog } from '../../utils/debugLogger.js';
import styles from './GameBattlefieldV2.module.css';

/**
 * GameBattlefieldV2 - Experimental UI redesign of the battlefield
 * @param {Object} props - Component props (same interface as GameBattlefield)
 */
function GameBattlefieldV2({
  localPlayerState,
  opponentPlayerState,
  localPlacedSections,
  opponentPlacedSections,
  selectedCard,
  validCardTargets,
  abilityMode,
  validAbilityTargets,
  multiSelectState,
  turnPhase,
  reallocationPhase,
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
  interceptedBadge
}) {
  // Calculate isInteractive for player ship sections
  const playerShipInteractive = turnPhase === 'allocateShields' || reallocationPhase;

  return (
    <main className={styles.battlefield}>
      {/* V2 UI: You can experiment with new layouts here */}
      <div className={styles.battlefieldContainer}>
        {/* Opponent Ship Sections */}
        <ShipSectionsDisplay
          player={opponentPlayerState}
          isPlayer={false}
          placedSections={opponentPlacedSections}
          onTargetClick={handleTargetClick}
          isInteractive={false}
          selectedCard={selectedCard}
          validCardTargets={validCardTargets}
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
          multiSelectState={multiSelectState}
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
          interceptedBadge={interceptedBadge}
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
          multiSelectState={multiSelectState}
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
          interceptedBadge={interceptedBadge}
        />

        {/* Player Ship Sections */}
        <ShipSectionsDisplay
          player={localPlayerState}
          isPlayer={true}
          placedSections={localPlacedSections}
          onSectionClick={handleShipSectionClick}
          onAbilityClick={handleShipAbilityClick}
          onTargetClick={handleTargetClick}
          isInteractive={playerShipInteractive}
          selectedCard={selectedCard}
          validCardTargets={validCardTargets}
          reallocationPhase={reallocationPhase}
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
        />
      </div>
    </main>
  );
}

export default GameBattlefieldV2;
