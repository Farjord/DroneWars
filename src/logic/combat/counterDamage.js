// ========================================
// COUNTER DAMAGE
// ========================================
// Shared helper for applying counter damage (dogfight or retaliate)
// from one drone to another. Used by TriggerProcessor's COUNTER_DAMAGE
// effect handler.

import { onDroneDestroyed } from '../utils/droneStateUtils.js';
import { updateAuras } from '../utils/auraManager.js';
import { createDogfightDamageAnimation } from './animations/DogfightDamageAnimation.js';
import { createRetaliationDamageAnimation } from './animations/RetaliationDamageAnimation.js';
import { createDestructionAnimation } from './animations/DroneDestroyedAnimation.js';

/**
 * Apply counter damage (dogfight or retaliate) from one drone to another
 *
 * @param {Object} source - The drone dealing the counter damage
 * @param {Object} sourceEffectiveStats - The effective stats of the source drone
 * @param {string} sourcePlayerId - The player who owns the source drone
 * @param {string} sourceLane - The lane the source drone is in
 * @param {Object} target - The drone receiving the counter damage
 * @param {string} targetPlayerId - The player who owns the target drone
 * @param {Object} playerStates - Current player states (will be modified)
 * @param {Object} placedSections - Placed ship sections
 * @param {string} damageType - 'DOGFIGHT' or 'RETALIATE'
 * @returns {Object} { animationEvents, attackerDestroyed }
 */
const applyCounterDamage = (
  source,
  sourceEffectiveStats,
  sourcePlayerId,
  sourceLane,
  target,
  targetPlayerId,
  playerStates,
  placedSections,
  damageType
) => {
  const animationEvents = [];
  let attackerDestroyed = false;

  const damage = sourceEffectiveStats.attack || 0;
  if (damage <= 0) {
    return { animationEvents, attackerDestroyed };
  }

  const isPiercing = sourceEffectiveStats.keywords && sourceEffectiveStats.keywords.has('PIERCING');

  // Find the target drone in state
  for (const laneKey in playerStates[targetPlayerId].dronesOnBoard) {
    const targetIndex = playerStates[targetPlayerId].dronesOnBoard[laneKey].findIndex(d => d.id === target.id);
    if (targetIndex !== -1) {
      const targetDrone = playerStates[targetPlayerId].dronesOnBoard[laneKey][targetIndex];

      // Calculate damage distribution
      let shieldDamage = 0;
      let hullDamage = 0;
      let remainingDamage = damage;

      if (!isPiercing) {
        shieldDamage = Math.min(remainingDamage, targetDrone.currentShields || 0);
        remainingDamage -= shieldDamage;
      }
      hullDamage = Math.min(remainingDamage, targetDrone.hull);

      const wasDestroyed = (targetDrone.hull - hullDamage) <= 0;

      // Generate appropriate animation event
      if (damageType === 'DOGFIGHT') {
        animationEvents.push(createDogfightDamageAnimation(
          source,
          sourcePlayerId,
          sourceLane,
          target,
          targetPlayerId,
          laneKey,
          damage,
          shieldDamage,
          hullDamage
        ));
      } else {
        animationEvents.push(createRetaliationDamageAnimation(
          source,
          sourcePlayerId,
          sourceLane,
          target,
          targetPlayerId,
          laneKey,
          damage,
          shieldDamage,
          hullDamage
        ));
      }

      if (wasDestroyed) {
        // Remove destroyed drone
        attackerDestroyed = true;
        animationEvents.push(createDestructionAnimation(target, targetPlayerId, laneKey, 'drone'));
        const destroyedDrone = playerStates[targetPlayerId].dronesOnBoard[laneKey][targetIndex];
        playerStates[targetPlayerId].dronesOnBoard[laneKey] =
          playerStates[targetPlayerId].dronesOnBoard[laneKey].filter(d => d.id !== target.id);
        Object.assign(playerStates[targetPlayerId], onDroneDestroyed(playerStates[targetPlayerId], destroyedDrone));

        // Update auras after drone destruction
        const opponentPlayerId = targetPlayerId === 'player1' ? 'player2' : 'player1';
        playerStates[targetPlayerId].dronesOnBoard = updateAuras(
          playerStates[targetPlayerId],
          playerStates[opponentPlayerId],
          placedSections
        );
      } else {
        // Apply damage
        playerStates[targetPlayerId].dronesOnBoard[laneKey][targetIndex].hull -= hullDamage;
        playerStates[targetPlayerId].dronesOnBoard[laneKey][targetIndex].currentShields -= shieldDamage;
      }
      break;
    }
  }

  return { animationEvents, attackerDestroyed };
};

export { applyCounterDamage };
