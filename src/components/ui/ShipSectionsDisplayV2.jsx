// ========================================
// SHIP SECTIONS DISPLAY V2 COMPONENT
// ========================================
// Renders ship sections with full-width spaceship background
// Compact section overlays positioned over ship image
// Supports responsive scaling and opponent flip

import React from 'react';
import ShipSectionV2 from './ShipSectionV2.jsx';
import { useGameData } from '../../hooks/useGameData.js';
import { debugLog } from '../../utils/debugLogger.js';
import styles from './ShipSectionsDisplayV2.module.css';

/**
 * SHIP SECTIONS DISPLAY V2
 * Container component that displays spaceship background with section overlays
 * @param {Object} player - Player state data
 * @param {boolean} isPlayer - Whether this is the current player's ship
 * @param {Array} placedSections - Array of placed section names
 * @param {Function} onSectionClick - Callback for shield allocation interactions
 * @param {Function} onAbilityClick - Callback for ship ability activation
 * @param {Function} onTargetClick - Callback for targeting interactions
 * @param {boolean} isInteractive - Whether sections should be interactive
 * @param {Array} validCardTargets - Array of valid targets for current action
 * @param {string} reallocationPhase - Current shield reallocation state
 * @param {Object} gameEngine - Game engine instance
 * @param {string} turnPhase - Current turn phase
 * @param {Function} isMyTurn - Function to check if it's player's turn
 * @param {Object} passInfo - Pass information object
 * @param {Function} getLocalPlayerId - Function to get local player ID
 * @param {Object} localPlayerState - Local player state
 * @param {Object} shipAbilityMode - Current ship ability mode
 * @param {Object} hoveredTarget - Currently hovered target
 * @param {Function} setHoveredTarget - Function to set hovered target
 * @param {Object} sectionRefs - Refs for section DOM elements
 */
const ShipSectionsDisplayV2 = ({
  player,
  isPlayer,
  placedSections,
  onSectionClick,
  onAbilityClick,
  onTargetClick,
  isInteractive,
  validCardTargets,
  reallocationPhase,
  gameEngine,
  turnPhase,
  isMyTurn,
  passInfo,
  getLocalPlayerId,
  localPlayerState,
  shipAbilityMode,
  hoveredTarget,
  setHoveredTarget,
  sectionRefs
}) => {
  // Get GameDataService for effective stats calculation
  const { getEffectiveShipStats } = useGameData();

  // Calculate effective ship stats
  const playerEffectiveStats = getEffectiveShipStats(player, placedSections);

  // Determine ship image (future: could be player-specific)
  const shipImageSrc = '/DroneWars/Ships/PlayerShip.png';

  // Determine if opponent (for flipping)
  const isOpponent = !isPlayer;

  return (
    <div className={`${styles.shipContainer} ${isOpponent ? styles.opponentShip : styles.playerShip}`}>
      {/* Background spaceship image */}
      <img
        src={shipImageSrc}
        alt={isPlayer ? 'Player Ship' : 'Opponent Ship'}
        className={styles.shipBackground}
      />

      {/* Section overlays */}
      <div className={styles.sectionOverlays}>
        {[0, 1, 2].map((laneIndex) => {
          const sectionName = placedSections[laneIndex];

          // Empty slot
          if (!sectionName) {
            debugLog('STATE_SYNC', `Lane ${laneIndex} - empty section:`, {
              sectionName,
              isPlayer,
              placedSections
            });
            return (
              <div
                key={laneIndex}
                className={styles.emptySection}
              >
                {/* Empty placeholder */}
              </div>
            );
          }

          const sectionStats = player.shipSections[sectionName];
          const isCardTarget = validCardTargets.some(t => t.id === sectionName);
          const isInMiddleLane = laneIndex === 1;

          // Determine shield reallocation visual state
          let reallocationState = null;
          if (reallocationPhase && isPlayer) {
            if (reallocationPhase === 'removing') {
              if (sectionStats.allocatedShields > 0) {
                reallocationState = 'can-remove';
              } else {
                reallocationState = 'cannot-remove';
              }
            } else if (reallocationPhase === 'adding') {
              if (sectionStats.allocatedShields < sectionStats.shields) {
                reallocationState = 'can-add';
              } else {
                reallocationState = 'cannot-add';
              }
            }
          }

          // Handlers
          const handleSectionClick = () => {
            if (isInteractive && onSectionClick) {
              onSectionClick(sectionName);
            } else if (onTargetClick) {
              onTargetClick({ type: 'section', id: sectionName, player: isPlayer ? 'player' : 'opponent' });
            }
          };

          const handleAbilityClick = (e, section, ability) => {
            e.stopPropagation();
            if (onAbilityClick) {
              onAbilityClick(e, section, ability);
            }
          };

          const handleMouseEnter = () => {
            setHoveredTarget && setHoveredTarget({ type: 'section', id: sectionName });
          };

          const handleMouseLeave = () => {
            setHoveredTarget && setHoveredTarget(null);
          };

          // Get ref for this section
          const sectionRef = sectionRefs?.current?.[`${isPlayer ? 'player' : 'opponent'}-section-${sectionName}`];

          return (
            <ShipSectionV2
              key={laneIndex}
              section={sectionName}
              stats={sectionStats}
              isPlayer={isPlayer}
              onClick={handleSectionClick}
              onAbilityClick={handleAbilityClick}
              isInteractive={isInteractive}
              isCardTarget={isCardTarget}
              isInMiddleLane={isInMiddleLane}
              reallocationState={reallocationState}
              gameEngine={gameEngine}
              turnPhase={turnPhase}
              isMyTurn={isMyTurn}
              passInfo={passInfo}
              getLocalPlayerId={getLocalPlayerId}
              localPlayerState={localPlayerState}
              shipAbilityMode={shipAbilityMode}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              sectionRef={sectionRef}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ShipSectionsDisplayV2;
