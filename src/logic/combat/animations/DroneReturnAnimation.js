// ========================================
// DRONE RETURN ANIMATION BUILDER
// ========================================
// Creates DRONE_RETURN animation events for combat system
// - Used when attacking drone returns to its position after attack
// - Only applies when target survives and attack was from a drone

/**
 * Create a drone return animation event
 *
 * @param {Object} attacker - The attacking drone returning to position
 * @param {string} attackingPlayerId - ID of attacking player
 * @param {string} attackerLane - Lane the attacker returns to
 * @param {string|undefined} sourceCardInstanceId - Card instance ID if attack triggered by card
 * @returns {Object} Animation event object
 */
export const createDroneReturnAnimation = (
  attacker,
  attackingPlayerId,
  attackerLane,
  sourceCardInstanceId
) => ({
  type: 'DRONE_RETURN',
  sourceId: attacker.id,
  sourcePlayer: attackingPlayerId,
  sourceLane: attackerLane,
  sourceCardInstanceId,  // Include for card-triggered attacks (will be undefined for normal drone attacks)
  timestamp: Date.now()
});
