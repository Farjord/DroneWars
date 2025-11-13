// ========================================
// HULL DAMAGE ANIMATION BUILDER
// ========================================
// Creates HULL_DAMAGE animation events for combat system
// - Used when hull takes damage but target survives
// - Applies to both drones and ship sections

/**
 * Create a hull damage animation event
 *
 * @param {Object} finalTarget - The target that had hull damaged
 * @param {string} defendingPlayerId - ID of defending player
 * @param {string|null} targetLane - Lane of target (null for ship sections)
 * @param {string} finalTargetType - Type of target ('drone' or 'section')
 * @param {number} hullDamage - Amount of hull damage dealt
 * @param {string|undefined} sourceCardInstanceId - Card instance ID if attack triggered by card
 * @returns {Object} Animation event object
 */
export const createHullDamageAnimation = (
  finalTarget,
  defendingPlayerId,
  targetLane,
  finalTargetType,
  hullDamage,
  sourceCardInstanceId
) => ({
  type: 'HULL_DAMAGE',
  targetId: finalTarget.id,
  targetPlayer: defendingPlayerId,
  targetLane: targetLane,
  targetType: finalTargetType,
  amount: hullDamage,
  sourceCardInstanceId,  // Include for card-triggered attacks
  timestamp: Date.now()
});
