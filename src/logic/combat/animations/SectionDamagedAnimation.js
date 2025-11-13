// ========================================
// SECTION DAMAGED ANIMATION BUILDER
// ========================================
// Creates SECTION_DAMAGED animation events for combat system
// - Used for ship section shake/damage visual feedback
// - Only applies to ship sections that survive damage

/**
 * Create a section damaged animation event (shake effect)
 *
 * @param {Object} finalTarget - The ship section that was damaged
 * @param {string} defendingPlayerId - ID of defending player
 * @param {string|undefined} sourceCardInstanceId - Card instance ID if attack triggered by card
 * @returns {Object} Animation event object
 */
export const createSectionDamagedAnimation = (
  finalTarget,
  defendingPlayerId,
  sourceCardInstanceId
) => ({
  type: 'SECTION_DAMAGED',
  targetId: finalTarget.id,
  targetPlayer: defendingPlayerId,
  targetType: 'section',
  sourceCardInstanceId,  // Include for card-triggered attacks
  timestamp: Date.now()
});
