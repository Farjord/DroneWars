// ========================================
// NUKE DESTROY ANIMATION BUILDER
// ========================================
// Generates Nuke card-specific destruction animations
//
// Card-specific override for cards with visualEffect.type === 'NUKE_BLAST'
// (Nuke card, Purge Protocol card)
//
// Generates two animation layers:
// 1. CARD_VISUAL_EFFECT event for the large nuke blast visual
// 2. DRONE_DESTROYED events for individual explosion feedback

/**
 * Build Nuke animation events
 *
 * Creates a two-stage animation:
 * - Stage 1: Large nuclear blast visual at target lane center
 * - Stage 2: Individual explosions for each destroyed drone
 *
 * @param {Object} config - Animation configuration
 * @param {Array<Object>} config.destroyedDrones - Drones that were destroyed
 * @param {string} config.targetPlayer - Player who owns the destroyed drones
 * @param {string} config.targetLane - Lane where destruction occurred
 * @param {Object} config.card - Source card (for tracking)
 * @param {string} config.actingPlayerId - Player who played the card
 * @returns {Array<Object>} Array of animation event objects
 */
export function buildNukeAnimation(config) {
  const { destroyedDrones, targetPlayer, targetLane, card, actingPlayerId } = config;
  const animations = [];

  // Stage 1: Large nuke blast visual
  // This creates the distinctive Nuke card effect (large expanding blast wave)
  animations.push({
    type: 'CARD_VISUAL_EFFECT',
    visualType: 'NUKE_BLAST',
    sourcePlayer: actingPlayerId,
    targetPlayer: 'center', // Special: nuke appears at center of lane
    targetLane: targetLane,
    targetType: 'lane',
    timestamp: Date.now()
  });

  // Stage 2: Individual drone destruction explosions
  // These provide feedback for each destroyed drone
  destroyedDrones.forEach(drone => {
    animations.push({
      type: 'DRONE_DESTROYED',
      targetId: drone.id,
      targetPlayer: targetPlayer,
      targetLane: targetLane,
      targetType: 'drone',
      delay: 400, // Slight delay so explosions happen after nuke blast
      timestamp: Date.now()
    });
  });

  return animations;
}
