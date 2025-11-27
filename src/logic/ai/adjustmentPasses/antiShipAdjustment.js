// ========================================
// ANTI-SHIP ADJUSTMENT PASS
// ========================================
// Removes the anti-ship penalty when no alternatives exist
// This ensures anti-ship drones can still be useful when attacking
// drones is their only option.

import fullDroneCollection from '../../../data/droneData.js';
import { PENALTIES } from '../aiConstants.js';

/**
 * Check if a drone has anti-ship ability (BONUS_DAMAGE_VS_SHIP)
 * @param {Object} drone - Drone to check
 * @returns {boolean} True if drone has anti-ship ability
 */
const isAntiShipDrone = (drone) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  return baseDrone?.abilities.some(ability =>
    ability.type === 'PASSIVE' && ability.effect?.type === 'BONUS_DAMAGE_VS_SHIP'
  );
};

/**
 * Apply anti-ship penalty removal when no alternatives exist
 *
 * This adjustment pass removes the anti-ship penalty from drone attacks
 * when there are no better alternatives available (other ready drones,
 * playable cards, or ship attacks).
 *
 * @param {Array} possibleActions - All possible actions being evaluated
 * @param {Object} context - Evaluation context (unused but kept for consistency)
 */
export const applyAntiShipAdjustments = (possibleActions, context) => {
  // Find all actions where anti-ship drones attacked drones
  const antiShipDroneAttacks = possibleActions.filter(action =>
    action.type === 'attack' &&
    action.targetType === 'drone' &&
    isAntiShipDrone(action.attacker)
  );

  // No anti-ship drone attacks to adjust
  if (antiShipDroneAttacks.length === 0) return;

  // Check for alternative actions (excluding anti-ship drone attacks on drones)
  const hasAlternatives = possibleActions.some(action => {
    // Card plays are alternatives
    if (action.type === 'play_card') return true;

    // Ship attacks are alternatives (the preferred use for anti-ship drones)
    if (action.type === 'attack' && action.targetType === 'section') return true;

    // Non-anti-ship drone attacks on drones are alternatives
    if (action.type === 'attack' && action.targetType === 'drone' && !isAntiShipDrone(action.attacker)) {
      return true;
    }

    // Moves are not considered alternatives (moving doesn't accomplish attack goals)
    return false;
  });

  // If no alternatives exist, remove the penalty from anti-ship drone attacks
  if (!hasAlternatives) {
    antiShipDroneAttacks.forEach(action => {
      // Remove the -100 penalty by subtracting it (effectively adding 100)
      action.score -= PENALTIES.ANTI_SHIP_ATTACKING_DRONE;
      action.logic.push(`🔄 No alternatives - penalty removed: +${Math.abs(PENALTIES.ANTI_SHIP_ATTACKING_DRONE)}`);
    });
  }
};
