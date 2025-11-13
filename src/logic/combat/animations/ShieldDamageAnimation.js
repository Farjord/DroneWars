// ========================================
// SHIELD DAMAGE ANIMATION BUILDER
// ========================================
// Creates SHIELD_DAMAGE animation events for combat system
// - Used when shields absorb damage
// - Applies to both drones and ship sections

/**
 * Create a shield damage animation event
 *
 * @param {Object} finalTarget - The target that had shields damaged
 * @param {string} defendingPlayerId - ID of defending player
 * @param {string|null} targetLane - Lane of target (null for ship sections)
 * @param {string} finalTargetType - Type of target ('drone' or 'section')
 * @param {number} shieldDamage - Amount of shield damage dealt
 * @param {string|undefined} sourceCardInstanceId - Card instance ID if attack triggered by card
 * @returns {Object} Animation event object
 */
export const createShieldDamageAnimation = (
  finalTarget,
  defendingPlayerId,
  targetLane,
  finalTargetType,
  shieldDamage,
  sourceCardInstanceId
) => ({
  type: 'SHIELD_DAMAGE',
  targetId: finalTarget.id,
  targetPlayer: defendingPlayerId,
  targetLane: targetLane,
  targetType: finalTargetType,
  amount: shieldDamage,
  sourceCardInstanceId,  // Include for card-triggered attacks
  timestamp: Date.now()
});
