// ========================================
// SPLASH ANIMATION BUILDER
// ========================================
// Builds Barrage-style splash damage animations
// Primary target + adjacent drones + barrage impact visuals

/**
 * Build splash damage animation sequence
 *
 * Creates animations for splash damage (e.g., Barrage card):
 * 1. SHIELD_DAMAGE - Per affected drone
 * 2. DRONE_DESTROYED or HULL_DAMAGE - Per affected drone
 * 3. BARRAGE_IMPACT - Visual peppered shot impacts per affected drone
 *
 * @param {Object} context - Animation context
 * @param {Array} context.damageResults - Array of damage results per drone
 * @param {Object} context.damageResults[].drone - Affected drone
 * @param {string} context.damageResults[].droneId - Drone ID
 * @param {number} context.damageResults[].shieldDamage - Shield damage dealt
 * @param {number} context.damageResults[].hullDamage - Hull damage dealt
 * @param {boolean} context.damageResults[].destroyed - Whether drone was destroyed
 * @param {string} context.targetPlayer - Target player ID
 * @param {string} context.targetLane - Target lane
 * @returns {Array} Array of animation event objects
 */
export function buildSplashAnimation(context) {
  const {
    damageResults,
    targetPlayer,
    targetLane
  } = context;

  const animations = [];

  // Generate damage feedback for each affected drone
  damageResults.forEach(({ droneId, shieldDamage, hullDamage, destroyed }) => {
    // Shield damage animation
    if (shieldDamage > 0) {
      animations.push({
        type: 'SHIELD_DAMAGE',
        targetId: droneId,
        targetPlayer,
        targetLane,
        targetType: 'drone',
        amount: shieldDamage,
        timestamp: Date.now()
      });
    }

    // Destruction or hull damage animation
    if (destroyed) {
      animations.push({
        type: 'DRONE_DESTROYED',
        targetId: droneId,
        targetPlayer,
        targetLane,
        targetType: 'drone',
        timestamp: Date.now()
      });
    } else if (hullDamage > 0) {
      animations.push({
        type: 'HULL_DAMAGE',
        targetId: droneId,
        targetPlayer,
        targetLane,
        targetType: 'drone',
        amount: hullDamage,
        timestamp: Date.now()
      });
    }
  });

  // Generate barrage impact visuals for each affected drone
  // Show multiple small "peppered shot" impacts scaling with damage
  damageResults.forEach(({ droneId, shieldDamage, hullDamage }) => {
    const totalDamage = shieldDamage + hullDamage;
    if (totalDamage > 0) {
      animations.push({
        type: 'BARRAGE_IMPACT',
        targetId: droneId,
        targetPlayer,
        targetLane,
        impactCount: totalDamage * 4,  // 4 impacts per damage (1 dmg = 4 hits, 2 dmg = 8 hits)
        timestamp: Date.now()
      });
    }
  });

  return animations;
}
