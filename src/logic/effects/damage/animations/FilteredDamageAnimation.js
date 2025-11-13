// ========================================
// FILTERED DAMAGE ANIMATION BUILDER
// ========================================
// Builds filtered damage animations (FRONT_MOST, BACK_MOST, etc.)
// Used for cards like Sidewinder Missiles, Strafe Run

/**
 * Build filtered damage animation events
 *
 * Creates damage feedback animations for each affected drone in filtered damage:
 * - SHIELD_DAMAGE (if shields were damaged)
 * - DRONE_DESTROYED or HULL_DAMAGE (based on destruction status)
 *
 * Used for filtered damage effects that target multiple drones based on criteria
 * (e.g., FRONT_MOST, BACK_MOST, ALL in lane)
 *
 * @param {Object} context - Animation context
 * @param {Array} context.affectedDrones - Array of affected drones with damage results
 * @param {Object} context.affectedDrones[].drone - Drone object
 * @param {number} context.affectedDrones[].shieldDamage - Shield damage dealt
 * @param {number} context.affectedDrones[].hullDamage - Hull damage dealt
 * @param {boolean} context.affectedDrones[].destroyed - Whether drone was destroyed
 * @param {Object} context.card - Source card (for animation matching)
 * @param {string} context.targetPlayer - Target player ID
 * @param {string} context.targetLane - Target lane
 * @returns {Array} Array of animation event objects
 */
export function buildFilteredDamageAnimation(context) {
  const {
    affectedDrones,
    card,
    targetPlayer,
    targetLane
  } = context;

  const animations = [];

  // Generate damage feedback for each affected drone
  affectedDrones.forEach(({ drone, shieldDamage, hullDamage, destroyed }) => {
    // Shield damage feedback (if any)
    if (shieldDamage > 0) {
      animations.push({
        type: 'SHIELD_DAMAGE',
        targetId: drone.id,
        targetPlayer,
        targetLane,
        targetType: 'drone',
        amount: shieldDamage,
        sourceCardInstanceId: card?.instanceId,
        timestamp: Date.now()
      });
    }

    // Destruction or hull damage feedback
    if (destroyed) {
      animations.push({
        type: 'DRONE_DESTROYED',
        targetId: drone.id,
        targetPlayer,
        targetLane,
        targetType: 'drone',
        sourceCardInstanceId: card?.instanceId,
        timestamp: Date.now()
      });
    } else if (hullDamage > 0) {
      animations.push({
        type: 'HULL_DAMAGE',
        targetId: drone.id,
        targetPlayer,
        targetLane,
        targetType: 'drone',
        amount: hullDamage,
        sourceCardInstanceId: card?.instanceId,
        timestamp: Date.now()
      });
    }
  });

  return animations;
}
