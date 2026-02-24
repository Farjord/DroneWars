// ========================================
// DAMAGE CALCULATION UTILITIES
// ========================================
// Shared damage type calculation used across combat and effect processors.
// Single source of truth for how each damage type distributes between shields and hull.

/**
 * Calculate damage distribution based on damage type
 * @param {number} damageValue - Total damage to apply
 * @param {number} shields - Target's current shields
 * @param {number} hull - Target's current hull
 * @param {string} damageType - NORMAL|PIERCING|SHIELD_BREAKER|ION|KINETIC
 * @returns {Object} { shieldDamage, hullDamage }
 */
export const calculateDamageByType = (damageValue, shields, hull, damageType) => {
  switch (damageType) {
    case 'PIERCING':
      // Bypass shields entirely
      return { shieldDamage: 0, hullDamage: Math.min(damageValue, hull) };

    case 'SHIELD_BREAKER': {
      // Each point of damage removes 2 shield points
      // Remaining damage after shields are gone hits hull at 1:1
      const effectiveShieldDmg = Math.min(damageValue * 2, shields);
      const dmgUsedOnShields = Math.ceil(effectiveShieldDmg / 2);
      const remainingDmg = damageValue - dmgUsedOnShields;
      return {
        shieldDamage: effectiveShieldDmg,
        hullDamage: Math.min(Math.floor(remainingDmg), hull)
      };
    }

    case 'ION':
      // Only damages shields, excess is wasted
      return { shieldDamage: Math.min(damageValue, shields), hullDamage: 0 };

    case 'KINETIC':
      // Only damages hull, but completely blocked by any shields
      if (shields > 0) {
        return { shieldDamage: 0, hullDamage: 0 };
      }
      return { shieldDamage: 0, hullDamage: Math.min(damageValue, hull) };

    default: {
      // NORMAL: Damage shields first, then hull
      const shieldDmg = Math.min(damageValue, shields);
      const remainingDamage = damageValue - shieldDmg;
      return {
        shieldDamage: shieldDmg,
        hullDamage: Math.min(remainingDamage, hull)
      };
    }
  }
};
