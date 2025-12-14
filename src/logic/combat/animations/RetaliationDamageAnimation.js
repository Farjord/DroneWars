// ========================================
// RETALIATION DAMAGE ANIMATION
// ========================================
// Animation event for when a drone with RETALIATE deals damage back to its attacker
// after surviving an attack.

/**
 * Create a retaliation damage animation event
 * @param {Object} retaliator - The drone with RETALIATE that dealt the damage
 * @param {string} retaliatorPlayerId - The player who owns the retaliator
 * @param {string} retaliatorLane - The lane the retaliator is in
 * @param {Object} attacker - The drone that was attacking and received retaliate damage
 * @param {string} attackingPlayerId - The player who owns the attacker
 * @param {string} attackerLane - The lane the attacker is in
 * @param {number} damage - Total damage dealt
 * @param {number} shieldDamage - Damage absorbed by shields
 * @param {number} hullDamage - Damage dealt to hull
 * @param {string} sourceCardInstanceId - Optional card instance ID for tracking
 * @returns {Object} Animation event object
 */
export const createRetaliationDamageAnimation = (
  retaliator,
  retaliatorPlayerId,
  retaliatorLane,
  attacker,
  attackingPlayerId,
  attackerLane,
  damage,
  shieldDamage,
  hullDamage,
  sourceCardInstanceId = null
) => ({
  type: 'RETALIATE_DAMAGE',
  sourceId: retaliator.id,
  sourceName: retaliator.name,
  sourcePlayer: retaliatorPlayerId,
  sourceLane: retaliatorLane,
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
