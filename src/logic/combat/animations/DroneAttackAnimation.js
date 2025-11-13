// ========================================
// DRONE ATTACK ANIMATION BUILDER
// ========================================
// Creates DRONE_ATTACK_START animation events for combat system
// - Used when a drone initiates an attack
// - Includes attacker info, target info, and attack value

/**
 * Create a drone attack start animation event
 *
 * @param {Object} attacker - The attacking drone
 * @param {string} attackingPlayerId - ID of attacking player ('player1' or 'player2')
 * @param {string} attackerLane - Lane the attacker is in
 * @param {Object} finalTarget - The target being attacked
 * @param {string} defendingPlayerId - ID of defending player
 * @param {string|null} targetLane - Lane of target (null for ship sections)
 * @param {string} finalTargetType - Type of target ('drone' or 'section')
 * @param {number} attackValue - Effective attack value
 * @param {string|undefined} sourceCardInstanceId - Card instance ID if attack triggered by card
 * @returns {Object} Animation event object
 */
export const createDroneAttackAnimation = (
  attacker,
  attackingPlayerId,
  attackerLane,
  finalTarget,
  defendingPlayerId,
  targetLane,
  finalTargetType,
  attackValue,
  sourceCardInstanceId
) => ({
  type: 'DRONE_ATTACK_START',
  sourceId: attacker.id,
  sourcePlayer: attackingPlayerId,
  sourceLane: attackerLane,
  targetId: finalTarget.id,
  targetPlayer: defendingPlayerId,
  targetLane: targetLane,
  targetType: finalTargetType,
  attackValue: attackValue,
  sourceCardInstanceId,  // Include for card-triggered attacks
  timestamp: Date.now()
});
