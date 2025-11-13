// ========================================
// DEFAULT DESTROY ANIMATION BUILDER
// ========================================
// Generates standard destruction animations (explosions at drone positions)
//
// Used for basic destroy effects without custom visuals

/**
 * Build default destroy animation events
 *
 * Generates DRONE_DESTROYED events for each destroyed drone,
 * which trigger explosion effects at their positions
 *
 * @param {Object} config - Animation configuration
 * @param {Array<Object>} config.destroyedDrones - Drones that were destroyed
 * @param {string} config.targetPlayer - Player who owns the destroyed drones
 * @param {string} config.targetLane - Lane where destruction occurred
 * @returns {Array<Object>} Array of animation event objects
 */
export function buildDefaultDestroyAnimation(config) {
  const { destroyedDrones, targetPlayer, targetLane } = config;
  const animations = [];

  // Generate DRONE_DESTROYED event for each destroyed drone
  destroyedDrones.forEach(drone => {
    animations.push({
      type: 'DRONE_DESTROYED',
      targetId: drone.id,
      targetPlayer: targetPlayer,
      targetLane: targetLane,
      targetType: 'drone',
      timestamp: Date.now()
    });
  });

  return animations;
}
