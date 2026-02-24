/**
 * Teleport Utilities
 * Shared logic for adding isTeleporting flags to drones during TELEPORT_IN animations
 */

import { debugLog } from './debugLogger.js';

/**
 * Add isTeleporting flags to drones that are being teleported.
 * Returns deep-cloned player states with flags applied.
 *
 * @param {{ player1: Object, player2: Object }} playerStates - Player states to modify
 * @param {Array} animations - Animation events to check for TELEPORT_IN
 * @returns {{ player1: Object, player2: Object }} New player states with isTeleporting flags
 */
export function addTeleportingFlags(playerStates, animations) {
  const teleportAnimations = animations.filter(anim => anim.animationName === 'TELEPORT_IN');

  if (teleportAnimations.length === 0) {
    return playerStates;
  }

  debugLog('ANIMATIONS', '🌀 [TELEPORT PREP] Adding isTeleporting flags to drones:', {
    animationCount: teleportAnimations.length
  });

  // Deep clone player states
  const modifiedStates = {
    player1: structuredClone(playerStates.player1),
    player2: structuredClone(playerStates.player2)
  };

  teleportAnimations.forEach((anim, index) => {
    const { targetPlayer, targetLane, targetId } = anim.payload || {};

    if (!targetPlayer || !targetLane || !targetId) {
      debugLog('ANIMATIONS', '⚠️ [TELEPORT PREP] Missing payload data in TELEPORT_IN animation:', anim);
      return;
    }

    const playerState = modifiedStates[targetPlayer];
    const lane = playerState?.dronesOnBoard?.[targetLane];

    if (lane && Array.isArray(lane)) {
      const droneIndex = lane.findIndex(d => d.id === targetId);
      if (droneIndex !== -1) {
        lane[droneIndex].isTeleporting = true;
        debugLog('ANIMATIONS', `🌀 [TELEPORT PREP ${index + 1}/${teleportAnimations.length}] Marked drone as invisible:`, {
          targetPlayer,
          targetLane,
          targetId,
          droneName: lane[droneIndex].name
        });
      } else {
        debugLog('ANIMATIONS', '⚠️ [TELEPORT PREP] Drone not found in lane:', {
          targetPlayer,
          targetLane,
          targetId
        });
      }
    }
  });

  return modifiedStates;
}
