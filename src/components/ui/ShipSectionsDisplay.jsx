// ========================================
// SHIP SECTIONS DISPLAY COMPONENT
// ========================================
// Renders the ship sections area with interactive sections for each player
// Handles shield allocation, abilities, and targeting states

import React from 'react';
import ShipSectionCompact from './ShipSectionCompact.jsx';
import { useGameData } from '../../hooks/useGameData.js';
import { debugLog } from '../../utils/debugLogger.js';
import { resolveShipSectionStats } from '../../utils/shipSectionImageResolver.js';

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
  handleDroneDragEnd
}) => {
  // Get GameDataService for direct effective stats calculation
  const { getEffectiveShipStats } = useGameData();

  // Calculate effective ship stats internally instead of receiving as prop
  const playerEffectiveStats = getEffectiveShipStats(player, placedSections);

  // Determine if we're in targeting mode (prevents modal from opening during targeting)
  // Card-based attacks: validCardTargets.length > 0
  // Standard drone attacks: selectedDrone exists AND this is opponent ship (!isPlayer)
  const isTargetingMode = validCardTargets.length > 0 || (selectedDrone && !isPlayer);

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
                height: 'clamp(143px, 6.25vw, 184px)'
              }}
            ></div>
          );
        }

        const sectionStats = player.shipSections[sectionName];

        // Resolve ship-specific image for the section based on player's ship
        const resolvedSectionStats = resolveShipSectionStats(sectionStats, player.shipId);

        // Calculate display stats based on phase
        // - allocateShields: Use pending absolute values (privacy: show local allocations only)
        // - reallocation: Apply pending deltas to game state values
        let displayStats;
        if (turnPhase === 'allocateShields' && isPlayer && pendingShieldAllocations) {
          // Round start allocation: use pending absolute values
          displayStats = {
            ...resolvedSectionStats,
            allocatedShields: pendingShieldAllocations[sectionName] || 0
          };
        } else if (reallocationPhase && isPlayer && pendingShieldChanges) {
          // Reallocation: apply pending deltas to game state
          const delta = pendingShieldChanges[sectionName] || 0;
          displayStats = {
            ...resolvedSectionStats,
            allocatedShields: resolvedSectionStats.allocatedShields + delta
          };
        } else {
          displayStats = resolvedSectionStats;
        }

        // Derive the correct player ID for this ship sections display
        const localPlayerId = getLocalPlayerId();
        const currentPlayerId = isPlayer ? localPlayerId : (localPlayerId === 'player1' ? 'player2' : 'player1');
        const isCardTarget = validCardTargets.some(t => t.id === sectionName && t.owner === currentPlayerId);

        // Determine shield reallocation visual state
        let reallocationState = null;
        if (reallocationPhase && isPlayer) {
          if (reallocationPhase === 'removing') {
            if (displayStats.allocatedShields > 0) {
              reallocationState = 'can-remove';
            } else {
              reallocationState = 'cannot-remove';
            }
          } else if (reallocationPhase === 'adding') {
            const effectiveMaxShields = gameEngine.getEffectiveSectionMaxShields(sectionName, player, placedSections);
            if (displayStats.allocatedShields < effectiveMaxShields) {
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
              height: 'clamp(143px, 6.25vw, 184px)'
            }}
            onMouseUp={() => {
              // Handle drone drop for ship section attack
              if (draggedDrone && !isPlayer && handleDroneDragEnd) {
                const targetLane = `lane${laneIndex + 1}`;
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
                if (isInteractive && onSectionClick) { // Specifically for shield allocation
                  debugLog('SHIELD_CLICKS', `✅ Calling onSectionClick for ${sectionName}`);
                  onSectionClick(sectionName);
                  return true; // Click consumed for shield allocation
                } else if (onTargetClick && (isCardTarget || (selectedDrone && !isPlayer))) { // For attacks and card/ability targeting
                  debugLog('SHIELD_CLICKS', `🎯 Calling onTargetClick for ${sectionName}`);
                  onTargetClick({ ...sectionStats, id: sectionName, name: sectionName }, 'section', isPlayer);
                  return true; // Click consumed for targeting
                }
                return false; // Click not consumed, allow modal to open
              }}
              onAbilityClick={onAbilityClick}
              onViewFullCard={() => {
                if (onViewFullCard) {
                  onViewFullCard({
                    sectionName,
                    sectionStats: resolvedSectionStats,
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