// ========================================
// RAILGUN ANIMATION BUILDER
// ========================================
// Builds Railgun Strike special animation sequence
// Turret deployment → charge → beam → overflow damage

/**
 * Build Railgun Strike animation sequence
 *
 * Creates the complete Railgun animation:
 * 1. RAILGUN_TURRET - Turret deploys, charges, shoots, retracts (2700ms)
 * 2. RAILGUN_BEAM - Beam fires at 1600ms, travels to target
 * 3. Damage feedback - Shield damage, hull damage, or destruction (synchronized at 1600ms)
 *
 * @param {Object} context - Animation context
 * @param {Object} context.target - Target drone
 * @param {Object} context.card - Source card (Railgun Strike)
 * @param {number} context.totalDamage - Total damage dealt
 * @param {number} context.shieldDamage - Shield damage portion
 * @param {number} context.hullDamage - Hull damage portion
 * @param {boolean} context.droneDestroyed - Whether drone was destroyed
 * @param {number} context.overflowDamage - Overflow damage to ship section
 * @param {string} context.sourcePlayer - Source player ID (turret owner)
 * @param {string} context.sourceLane - Source lane (turret location)
 * @param {string} context.targetPlayer - Target player ID
 * @param {string} context.targetLane - Target lane
 * @returns {Array} Array of animation event objects
 */
export function buildRailgunAnimation(context) {
  const {
    target,
    card,
    shieldDamage,
    hullDamage,
    droneDestroyed,
    overflowDamage,
    sourcePlayer,
    sourceLane,
    targetPlayer,
    targetLane
  } = context;

  const animations = [];
  const TURRET_SHOOT_TIME = 1600; // When turret fires and damage is applied

  // Animation 1: Railgun turret (deploy → charge → shoot → retract)
  animations.push({
    type: 'RAILGUN_TURRET',
    targetId: target.id,
    sourcePlayer,
    sourceLane,
    targetPlayer,
    targetLane,
    sourceCardInstanceId: card?.instanceId,
    onComplete: null
  });

  // Animation 2: Railgun beam (appears at turret shoot time, hits drone)
  animations.push({
    type: 'RAILGUN_BEAM',
    targetId: target.id,
    sourcePlayer,
    sourceLane,
    targetPlayer,
    targetLane,
    delay: TURRET_SHOOT_TIME,
    overflowDamage: overflowDamage,
    sourceCardInstanceId: card?.instanceId,
    onComplete: null
  });

  // Animation 3: Drone shield damage (if any)
  if (shieldDamage > 0) {
    animations.push({
      type: 'SHIELD_DAMAGE',
      targetId: target.id,
      targetPlayer,
      targetLane,
      targetType: 'drone',
      amount: shieldDamage,
      delay: TURRET_SHOOT_TIME,
      sourceCardInstanceId: card?.instanceId,
      timestamp: Date.now()
    });
  }

  // Animation 4: Drone destruction or hull damage
  if (droneDestroyed) {
    animations.push({
      type: 'DRONE_DESTROYED',
      targetId: target.id,
      targetPlayer,
      targetLane,
      targetType: 'drone',
      delay: TURRET_SHOOT_TIME,
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
      delay: TURRET_SHOOT_TIME,
      sourceCardInstanceId: card?.instanceId,
      timestamp: Date.now()
    });
  }

  return animations;
}
