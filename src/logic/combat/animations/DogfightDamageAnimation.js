// ========================================
// DOGFIGHT DAMAGE ANIMATION
// ========================================
// Animation event for when a drone with DOGFIGHT deals damage to an attacker
// during interception.

/**
 * Create a dogfight damage animation event
 * @param {Object} interceptor - The drone with DOGFIGHT that dealt the damage
 * @param {string} interceptorPlayerId - The player who owns the interceptor
 * @param {string} interceptorLane - The lane the interceptor is in
 * @param {Object} attacker - The drone that was attacking and received dogfight damage
 * @param {string} attackingPlayerId - The player who owns the attacker
 * @param {string} attackerLane - The lane the attacker is in
 * @param {number} damage - Total damage dealt
 * @param {number} shieldDamage - Damage absorbed by shields
 * @param {number} hullDamage - Damage dealt to hull
 * @param {string} sourceCardInstanceId - Optional card instance ID for tracking
 * @returns {Object} Animation event object
 */
export const createDogfightDamageAnimation = (
  interceptor,
  interceptorPlayerId,
  interceptorLane,
  attacker,
  attackingPlayerId,
  attackerLane,
  damage,
  shieldDamage,
  hullDamage,
  sourceCardInstanceId = null
) => ({
  type: 'DOGFIGHT_DAMAGE',
  sourceId: interceptor.id,
  sourceName: interceptor.name,
  sourcePlayer: interceptorPlayerId,
  sourceLane: interceptorLane,
  targetId: attacker.id,
  targetName: attacker.name,
  targetPlayer: attackingPlayerId,
  targetLane: attackerLane,
  damage,
  shieldDamage,
  hullDamage,
  timestamp: Date.now(),
  ...(sourceCardInstanceId && { sourceCardInstanceId })
});
