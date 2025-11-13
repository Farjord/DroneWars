// ========================================
// DEFAULT MOVEMENT ANIMATION BUILDER
// ========================================
// Creates animation events for movement effects
// Extracted from gameLogic.js Phase 7B

/**
 * Build default movement animation
 * Optional visual enhancement showing drone sliding between lanes
 *
 * @param {Object} context - Animation context
 * @param {Object} context.drone - Drone being moved
 * @param {string} context.fromLane - Source lane ID
 * @param {string} context.toLane - Destination lane ID
 * @param {string} context.actingPlayerId - Player executing the move
 * @returns {Array} Array of animation event objects
 */
export function buildDefaultMovementAnimation(context) {
  const { drone, fromLane, toLane, actingPlayerId } = context;

  return [{
    type: 'DRONE_MOVEMENT',
    droneId: drone.id,
    sourcePlayer: actingPlayerId,
    sourceLane: fromLane,
    targetLane: toLane,
    duration: 800,
    timestamp: Date.now()
  }];
}
