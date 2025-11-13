// ========================================
// HEAL ANIMATION BUILDER
// ========================================
// Builds heal effect animations for both hull and shield healing
// Used by HullHealProcessor and ShieldHealProcessor

/**
 * Build heal animation event
 *
 * Creates HEAL_EFFECT animation for healing effects:
 * - Hull healing (drones and ship sections)
 * - Shield healing (drones)
 *
 * @param {Object} context - Animation context
 * @param {Object} context.target - Target entity (drone or ship section)
 * @param {number} context.healAmount - Amount of healing applied
 * @param {string} context.targetPlayer - Target player ID
 * @param {string|null} context.targetLane - Target lane (null for ship sections)
 * @param {string} context.targetType - Target type ('drone' or 'section')
 * @param {Object} context.card - Source card (for animation matching)
 * @returns {Array} Array with single HEAL_EFFECT animation event
 */
export function buildHealAnimation(context) {
  const {
    target,
    healAmount,
    targetPlayer,
    targetLane,
    targetType,
    card
  } = context;

  // Always emit heal animation based on effect value (not actual heal amount)
  // This provides visual feedback even if target is at full health
  return [{
    type: 'HEAL_EFFECT',
    targetId: targetType === 'drone' ? target.id : target.name,
    targetPlayer,
    targetLane,
    targetType,
    healAmount,
    sourceCardInstanceId: card?.instanceId,
    config: {},
    onComplete: null
  }];
}
