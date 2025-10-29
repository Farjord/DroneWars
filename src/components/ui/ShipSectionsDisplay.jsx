// ========================================
// SHIP SECTIONS DISPLAY COMPONENT
// ========================================
// Renders the ship sections area with interactive sections for each player
// Handles shield allocation, abilities, and targeting states

import React from 'react';
import ShipSectionCompact from './ShipSectionCompact.jsx';
import { useGameData } from '../../hooks/useGameData.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * SHIP SECTIONS DISPLAY COMPONENT
 * Renders the ship sections area with interactive sections for each player.
 * Handles shield allocation, abilities, and targeting states.
 * @param {Object} player - Player state data
 * @param {boolean} isPlayer - Whether this is the current player's ship
 * @param {Array} placedSections - Array of placed section names
 * @param {Function} onSectionClick - Callback for shield allocation interactions
 * @param {Function} onAbilityClick - Callback for ship ability activation
 * @param {Function} onTargetClick - Callback for targeting interactions
 * @param {Function} onViewFullCard - Callback to open modal with full card details
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
 */
const ShipSectionsDisplay = ({
  player,
  isPlayer,
  placedSections,
  onSectionClick,
  onAbilityClick,
  onTargetClick,
  onViewFullCard,
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
  // Get GameDataService for direct effective stats calculation
  const { getEffectiveShipStats } = useGameData();

  // Calculate effective ship stats internally instead of receiving as prop
  const playerEffectiveStats = getEffectiveShipStats(player, placedSections);

  return (
    <div className="flex w-full justify-between gap-8">
      {[0, 1, 2].map((laneIndex) => {
        const sectionName = placedSections[laneIndex];
        if (!sectionName) {
          debugLog('STATE_SYNC', `Lane ${laneIndex} rendering EMPTY div - no hover possible:`, {
            sectionName,
            sectionNameType: typeof sectionName,
            sectionNameValue: JSON.stringify(sectionName),
            isPlayer,
            entirePlacedSections: placedSections,
            playerShipSections: player?.shipSections ? Object.keys(player.shipSections) : 'NO_SHIP_SECTIONS'
          });
          return (
            <div
              key={laneIndex}
              className="bg-black/20 rounded-lg border-2 border-dashed border-gray-700"
              style={{
                width: 'clamp(640px, 31.25vw, 850px)',
                height: 'clamp(152px, 6.25vw, 194px)'
              }}
            ></div>
          );
        }

        const sectionStats = player.shipSections[sectionName];

        const isCardTarget = validCardTargets.some(t => t.id === sectionName);

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
            const effectiveMaxShields = gameEngine.getEffectiveSectionMaxShields(sectionName, player, placedSections);
            if (sectionStats.allocatedShields < effectiveMaxShields) {
              reallocationState = 'can-add';
            } else {
              reallocationState = 'cannot-add';
            }
          }
        }

        return (
          <div
            key={laneIndex}
            style={{
              width: 'clamp(640px, 31.25vw, 850px)',
              height: 'clamp(152px, 6.25vw, 194px)'
            }}
          >
            <ShipSectionCompact
              section={sectionName}
              stats={sectionStats}
              isPlayer={isPlayer}
              isOpponent={!isPlayer}
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
                if (isInteractive && onSectionClick) { // Specifically for shield allocation
                  debugLog('SHIELD_CLICKS', `✅ Calling onSectionClick for ${sectionName}`);
                  onSectionClick(sectionName);
                } else if (onTargetClick) { // For attacks and card/ability targeting
                  debugLog('SHIELD_CLICKS', `🎯 Calling onTargetClick for ${sectionName}`);
                  onTargetClick({ ...sectionStats, id: sectionName, name: sectionName }, 'section', isPlayer);
                }
              }}
              onAbilityClick={onAbilityClick}
              onViewFullCard={() => {
                if (onViewFullCard) {
                  onViewFullCard({
                    sectionName,
                    sectionStats,
                    effectiveStats: playerEffectiveStats.bySection[sectionName],
                    isInMiddleLane: laneIndex === 1,
                    isPlayer
                  });
                }
              }}
              isInteractive={isInteractive || (turnPhase === 'action' && isPlayer && sectionStats.ability && localPlayerState.energy >= sectionStats.ability.cost.energy)}
              isCardTarget={isCardTarget}
              isInMiddleLane={laneIndex === 1}
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
      })}
    </div>
  );
};

export default ShipSectionsDisplay;