// ========================================
// DEFAULT DAMAGE ANIMATION BUILDER
// ========================================
// Builds standard damage feedback animations (Laser Blast style)
// Used as the default animation for all DAMAGE effects without specific visualEffect

/**
 * Build default damage animation events
 *
 * Creates basic damage feedback animations:
 * - SHIELD_DAMAGE (if shields were damaged)
 * - DRONE_DESTROYED or HULL_DAMAGE (based on destruction status)
 *
 * This is the default animation style for all DAMAGE effects.
 * Cards can override with specific visualEffect.type in cardData.js
 *
 * @param {Object} context - Animation context
 * @param {Object} context.target - Target entity (drone/ship)
 * @param {Object} context.card - Source card (for animation matching)
 * @param {number} context.shieldDamage - Amount of shield damage dealt
 * @param {number} context.hullDamage - Amount of hull damage dealt
 * @param {boolean} context.destroyed - Whether target was destroyed
 * @param {string} context.targetPlayer - Target player ID ('player1' or 'player2')
 * @param {string} context.targetLane - Target lane ('lane1', 'lane2', 'lane3')
 * @returns {Array} Array of animation event objects
 */
export function buildDefaultDamageAnimation(context) {
  const {
    target,
    card,
    shieldDamage,
    hullDamage,
    destroyed,
    targetPlayer,
    targetLane
  } = context;

  const animations = [];

  // Shield damage feedback (if any)
  if (shieldDamage > 0) {
    animations.push({
      type: 'SHIELD_DAMAGE',
      targetId: target.id,
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
      targetId: target.id,
      targetPlayer,
      targetLane,
      targetType: 'drone',
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
      sourceCardInstanceId: card?.instanceId,
      timestamp: Date.now()
    });
  }

  return animations;
}
