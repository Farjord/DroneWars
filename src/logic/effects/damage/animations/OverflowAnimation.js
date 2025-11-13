// ========================================
// OVERFLOW ANIMATION BUILDER
// ========================================
// Builds standard overflow projectile animation
// Used for overflow damage cards (non-Railgun)

/**
 * Build standard overflow projectile animation
 *
 * Creates the overflow animation sequence:
 * 1. OVERFLOW_PROJECTILE - Projectile travels to drone, then to ship if overflow occurs
 * 2. Damage feedback - Shield damage, hull damage, or destruction (synchronized with impact)
 *
 * Impact timing varies based on whether overflow occurs:
 * - With overflow: DRONE_IMPACT_TIME = PROJECTILE_DURATION / 3 (400ms)
 * - Without overflow: DRONE_IMPACT_TIME = PROJECTILE_DURATION / 2 (600ms)
 *
 * @param {Object} context - Animation context
 * @param {Object} context.target - Target drone
 * @param {Object} context.card - Source card
 * @param {number} context.totalDamage - Total damage dealt
 * @param {number} context.shieldDamage - Shield damage portion
 * @param {number} context.hullDamage - Hull damage portion
 * @param {boolean} context.droneDestroyed - Whether drone was destroyed
 * @param {number} context.overflowDamage - Overflow damage to ship section
 * @param {string} context.targetPlayer - Target player ID
 * @param {string} context.targetLane - Target lane
 * @returns {Array} Array of animation event objects
 */
export function buildOverflowAnimation(context) {
  const {
    target,
    card,
    shieldDamage,
    hullDamage,
    droneDestroyed,
    overflowDamage,
    targetPlayer,
    targetLane
  } = context;

  const animations = [];
  const PROJECTILE_DURATION = 1200;

  // Calculate impact timing based on overflow status (matches OverflowProjectile.jsx logic)
  const hasOverflowDamage = overflowDamage > 0;
  const DRONE_IMPACT_TIME = hasOverflowDamage
    ? PROJECTILE_DURATION / 3  // 400ms - projectile travels faster with overflow
    : PROJECTILE_DURATION / 2; // 600ms - projectile travels slower without overflow

  // Animation 1: Overflow projectile (handles both drone and ship damage)
  animations.push({
    type: 'OVERFLOW_PROJECTILE',
    targetId: target.id,
    targetPlayer,
    targetLane,
    overflowDamage: overflowDamage,
    duration: PROJECTILE_DURATION,
    sourceCardInstanceId: card?.instanceId,
    onComplete: null
  });

  // Animation 2: Shield damage (synchronized with drone impact)
  if (shieldDamage > 0) {
    animations.push({
      type: 'SHIELD_DAMAGE',
      targetId: target.id,
      targetPlayer,
      targetLane,
      targetType: 'drone',
      amount: shieldDamage,
      delay: DRONE_IMPACT_TIME,
      sourceCardInstanceId: card?.instanceId,
      timestamp: Date.now()
    });
  }

  // Animation 3: Destruction or hull damage (synchronized with drone impact)
  if (droneDestroyed) {
    animations.push({
      type: 'DRONE_DESTROYED',
      targetId: target.id,
      targetPlayer,
      targetLane,
      targetType: 'drone',
      delay: DRONE_IMPACT_TIME,
      sourceCardInstanceId: card?.instanceId,
      timestamp: Date.now()
    });
  } else if (hullDamage > 0) {
    animations.push({
      type: 'HULL_DAMAGE',
      targetId: target.id,
      targetPlayer,
      targetLane,
      targetType: 'drone',
      amount: hullDamage,
      delay: DRONE_IMPACT_TIME,
      sourceCardInstanceId: card?.instanceId,
      timestamp: Date.now()
    });
  }

  return animations;
}
