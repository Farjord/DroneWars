// ========================================
// CONDITIONAL SECTION DAMAGE PROCESSOR
// ========================================
// Handles CONDITIONAL_SECTION_DAMAGE effect type for lane-control cards
// Applies damage to ship sections based on lane control conditions

import BaseEffectProcessor from './BaseEffectProcessor.js';
import { LaneControlCalculator } from '../combat/LaneControlCalculator.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * Calculate damage distribution based on damage type
 * (Copied from DamageEffectProcessor for consistency)
 * @param {number} damageValue - Total damage to apply
 * @param {number} shields - Target's current shields
 * @param {number} hull - Target's current hull
 * @param {string} damageType - NORMAL|PIERCING|SHIELD_BREAKER|ION|KINETIC
 * @returns {Object} { shieldDamage, hullDamage }
 */
const calculateDamageByType = (damageValue, shields, hull, damageType) => {
  switch (damageType) {
    case 'PIERCING':
      return { shieldDamage: 0, hullDamage: Math.min(damageValue, hull) };

    case 'SHIELD_BREAKER': {
      const effectiveShieldDmg = Math.min(damageValue * 2, shields);
      const dmgUsedOnShields = Math.ceil(effectiveShieldDmg / 2);
      const remainingDmg = damageValue - dmgUsedOnShields;
      return {
        shieldDamage: effectiveShieldDmg,
        hullDamage: Math.min(Math.floor(remainingDmg), hull)
      };
    }

    case 'ION':
      return { shieldDamage: Math.min(damageValue, shields), hullDamage: 0 };

    case 'KINETIC':
      if (shields > 0) {
        return { shieldDamage: 0, hullDamage: 0 };
      }
      return { shieldDamage: 0, hullDamage: Math.min(damageValue, hull) };

    default: {
      // NORMAL damage
      const shieldDmg = Math.min(damageValue, shields);
      const remainingDamage = damageValue - shieldDmg;
      return {
        shieldDamage: shieldDmg,
        hullDamage: Math.min(remainingDamage, hull)
      };
    }
  }
};

/**
 * Processor for CONDITIONAL_SECTION_DAMAGE effect type
 * Used by lane-control cards to apply damage conditionally based on lane control
 *
 * @extends BaseEffectProcessor
 */
class ConditionalSectionDamageProcessor extends BaseEffectProcessor {
  /**
   * Process conditional section damage effect
   *
   * @param {Object} effect - Effect definition
   * @param {string} effect.type - 'CONDITIONAL_SECTION_DAMAGE'
   * @param {Object} effect.condition - Condition to check (CONTROL_LANES or CONTROL_LANE_EMPTY)
   * @param {number} effect.damage - Damage value
   * @param {string} effect.targets - Target type (FLANK_SECTIONS, MIDDLE_SECTION, etc.)
   * @param {string} effect.damageType - Damage type (NORMAL, PIERCING, etc.)
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with newPlayerStates and animationEvents
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, placedSections, target, card } = context;
    const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    // Calculate current lane control
    const laneControl = LaneControlCalculator.calculateLaneControl(
      playerStates.player1,
      playerStates.player2
    );

    // Check if condition is met
    const conditionMet = this.checkCondition(
      effect.condition,
      actingPlayerId,
      laneControl,
      target,
      playerStates
    );

    if (!conditionMet) {
      debugLog('LANE_CONTROL', `[ConditionalSectionDamage] Condition not met for ${card.name}`);
      return this.createResult(playerStates, []);
    }

    // Clone states for mutation
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const opponentSections = newPlayerStates[opponentId].shipSections;
    const opponentPlacedSections = placedSections[opponentId];

    // Determine target sections
    const targetSections = this.resolveTargetSections(
      effect.targets,
      opponentPlacedSections,
      target
    );

    // Apply damage and generate animations
    const animationEvents = [];

    targetSections.forEach(sectionName => {
      if (!sectionName || !opponentSections[sectionName]) {
        debugLog('LANE_CONTROL', `[ConditionalSectionDamage] Section ${sectionName} not found, skipping`);
        return;
      }

      // Apply damage to this section
      const { shieldDamage, hullDamage } = this.applyDamageToSection(
        opponentSections[sectionName],
        effect.damage,
        effect.damageType || 'NORMAL'
      );

      debugLog('LANE_CONTROL', `[ConditionalSectionDamage] Dealt ${effect.damage} damage to ${sectionName} (${shieldDamage} shields, ${hullDamage} hull)`);

      // Generate staggered explosion animations (1 per damage point, like Railgun)
      for (let i = 0; i < effect.damage; i++) {
        animationEvents.push({
          type: 'SECTION_DAMAGED',
          targetId: sectionName,         // Fixed: targetSection → targetId
          targetPlayer: opponentId,
          targetLane: this.mapSectionToLane(sectionName),  // Added: required for positioning
          targetType: 'section',         // Added: required for element lookup
          config: { size: 'large' },     // Added: explosion size config
          delay: i * 200,                // Keep: 200ms stagger between explosions
          sourceCardInstanceId: card?.instanceId,
          timestamp: Date.now()
        });
      }
    });

    return this.createResult(newPlayerStates, animationEvents);
  }

  /**
   * Check if the effect's condition is met
   *
   * @param {Object} condition - Condition object
   * @param {string} actingPlayerId - Player executing the effect
   * @param {Object} laneControl - Current lane control state
   * @param {Object} target - Target (for CONTROL_LANE_EMPTY with TARGET lane)
   * @param {Object} playerStates - Player states
   * @returns {boolean} True if condition met
   */
  checkCondition(condition, actingPlayerId, laneControl, target, playerStates) {
    switch (condition.type) {
      case 'CONTROL_LANES':
        // Check if player controls all/any of the specified lanes
        return LaneControlCalculator.checkLaneControl(
          actingPlayerId,
          condition.lanes,
          laneControl,
          condition.operator || 'ALL'
        );

      case 'CONTROL_LANE_EMPTY':
        // Check if player controls the target lane AND no enemy drones present
        const targetLane = condition.lane === 'TARGET' ? target.id : condition.lane;
        return LaneControlCalculator.checkLaneControlEmpty(
          actingPlayerId,
          targetLane,
          playerStates.player1,
          playerStates.player2,
          laneControl
        );

      default:
        debugLog('LANE_CONTROL', `[ConditionalSectionDamage] Unknown condition type: ${condition.type}`);
        return false;
    }
  }

  /**
   * Resolve target sections based on target type
   *
   * @param {string} targets - Target type (FLANK_SECTIONS, MIDDLE_SECTION, etc.)
   * @param {Array} placedSections - Opponent's placed sections [left, middle, right]
   * @param {Object} target - Target object (for CORRESPONDING_SECTION)
   * @returns {Array<string>} Array of section names to damage
   */
  resolveTargetSections(targets, placedSections, target) {
    switch (targets) {
      case 'FLANK_SECTIONS':
        // Both left and right sections (lanes 1 and 3)
        return [placedSections[0], placedSections[2]];

      case 'MIDDLE_SECTION':
        // Middle section only (lane 2)
        return [placedSections[1]];

      case 'CORRESPONDING_SECTION':
        // Section corresponding to the targeted lane
        const laneIndex = parseInt(target.id.replace('lane', '')) - 1;
        return [placedSections[laneIndex]];

      case 'ALL_SECTIONS':
        // All three sections
        return [...placedSections];

      default:
        debugLog('LANE_CONTROL', `[ConditionalSectionDamage] Unknown target type: ${targets}`);
        return [];
    }
  }

  /**
   * Apply damage to a ship section (mutates section object)
   *
   * @param {Object} section - Ship section object
   * @param {number} damage - Damage amount
   * @param {string} damageType - Damage type (NORMAL, PIERCING, etc.)
   * @returns {Object} { shieldDamage, hullDamage } - Actual damage dealt
   */
  applyDamageToSection(section, damage, damageType) {
    const { shieldDamage, hullDamage } = calculateDamageByType(
      damage,
      section.allocatedShields,
      section.hull,
      damageType
    );

    // Apply damage (mutate section)
    section.allocatedShields -= shieldDamage;
    section.hull -= hullDamage;

    return { shieldDamage, hullDamage };
  }

  /**
   * Maps section name to corresponding lane
   * @param {string} sectionName - 'left', 'middle', or 'right'
   * @returns {string} - 'lane1', 'lane2', or 'lane3'
   */
  mapSectionToLane(sectionName) {
    const sectionToLane = {
      'left': 'lane1',
      'middle': 'lane2',
      'right': 'lane3'
    };
    return sectionToLane[sectionName] || 'lane2';  // Default to middle if unknown
  }
}

export default ConditionalSectionDamageProcessor;
