// ========================================
// DRONE/SECTION DESTROYED ANIMATION BUILDER
// ========================================
// Creates DRONE_DESTROYED and SECTION_DESTROYED animation events
// - Used when a target is completely destroyed
// - Handles both drones and ship sections

/**
 * Create a destruction animation event (drone or section)
 *
 * @param {Object} finalTarget - The target that was destroyed
 * @param {string} defendingPlayerId - ID of defending player
 * @param {string|null} targetLane - Lane of target (null for ship sections)
 * @param {string} finalTargetType - Type of target ('drone' or 'section')
 * @param {string|undefined} sourceCardInstanceId - Card instance ID if attack triggered by card
 * @returns {Object} Animation event object
 */
export const createDestructionAnimation = (
  finalTarget,
  defendingPlayerId,
  targetLane,
  finalTargetType,
  sourceCardInstanceId
) => ({
  type: finalTargetType === 'drone' ? 'DRONE_DESTROYED' : 'SECTION_DESTROYED',
  targetId: finalTarget.id,
  targetPlayer: defendingPlayerId,
  targetLane: targetLane,
  targetType: finalTargetType,
  sourceCardInstanceId,  // Include for card-triggered attacks
  timestamp: Date.now()
});
