// ========================================
// EFFECT ROUTER
// ========================================
// Routes effect types to their corresponding processors
// Phase 1: DRAW, GAIN_ENERGY, READY_DRONE
// Phase 3: HEAL_HULL, HEAL_SHIELDS
// Phase 4: DAMAGE, DAMAGE_SCALING, SPLASH_DAMAGE, OVERFLOW_DAMAGE
// Phase 6: DESTROY

import DrawEffectProcessor from './effects/cards/DrawEffectProcessor.js';
import GainEnergyEffectProcessor from './effects/energy/GainEnergyEffectProcessor.js';
import ReadyDroneEffectProcessor from './effects/state/ReadyDroneEffectProcessor.js';
import HullHealProcessor from './effects/healing/HullHealProcessor.js';
import ShieldHealProcessor from './effects/healing/ShieldHealProcessor.js';
import ShipShieldRestoreProcessor from './effects/healing/ShipShieldRestoreProcessor.js';
import DamageEffectProcessor from './effects/damage/DamageEffectProcessor.js';
import DestroyEffectProcessor from './effects/destroy/DestroyEffectProcessor.js';
import ModifyStatEffectProcessor from './effects/ModifyStatEffectProcessor.js';
import ModifyDroneBaseEffectProcessor from './effects/upgrades/ModifyDroneBaseEffectProcessor.js';
import DestroyUpgradeEffectProcessor from './effects/upgrades/DestroyUpgradeEffectProcessor.js';
import RepeatingEffectProcessor from './effects/meta/RepeatingEffectProcessor.js';
import CompositeEffectProcessor from './effects/meta/CompositeEffectProcessor.js';
import TokenCreationProcessor from './effects/TokenCreationProcessor.js';
import SearchAndDrawProcessor from './effects/cards/SearchAndDrawProcessor.js';
import DrawThenDiscardProcessor from './effects/cards/DrawThenDiscardProcessor.js';
import MovementEffectProcessor from './effects/movement/MovementEffectProcessor.js';
import MarkingEffectProcessor from './effects/MarkingEffectProcessor.js';
import IncreaseThreatEffectProcessor from './effects/IncreaseThreatEffectProcessor.js';
import DiscardEffectProcessor from './effects/cards/DiscardEffectProcessor.js';
import DrainEnergyEffectProcessor from './effects/energy/DrainEnergyEffectProcessor.js';
import ExhaustDroneEffectProcessor from './effects/state/ExhaustDroneEffectProcessor.js';
import StatusEffectProcessor from './effects/state/StatusEffectProcessor.js';
import ConditionalSectionDamageProcessor from './effects/ConditionalSectionDamageProcessor.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * EffectRouter - Dispatches effects to modular processors
 *
 * Phase 1 Implementation: DRAW, GAIN_ENERGY, READY_DRONE
 * Phase 3 Implementation: HEAL_HULL, HEAL_SHIELDS
 * Phase 4 Implementation: DAMAGE, DAMAGE_SCALING, SPLASH_DAMAGE, OVERFLOW_DAMAGE
 * Phase 6 Implementation: DESTROY, MODIFY_STAT, MODIFY_DRONE_BASE, DESTROY_UPGRADE (COMPLETE)
 * Phase 8 Implementation: REPEATING_EFFECT, CREATE_TOKENS, SEARCH_AND_DRAW (COMPLETE)
 * Future: Will route all 27+ effect types to their processors
 *
 * Usage:
 *   const router = new EffectRouter();
 *   const result = router.routeEffect(effect, context);
 */
class EffectRouter {
  constructor() {
    // Initialize processors for extracted effects
    const damageProcessor = new DamageEffectProcessor();
    const movementProcessor = new MovementEffectProcessor();
    const markingProcessor = new MarkingEffectProcessor();

    this.processors = {
      // Phase 1: Card and state effects
      DRAW: new DrawEffectProcessor(),
      GAIN_ENERGY: new GainEnergyEffectProcessor(),
      READY_DRONE: new ReadyDroneEffectProcessor(),
      // Phase 3: Healing effects
      HEAL_HULL: new HullHealProcessor(),
      HEAL_SHIELDS: new ShieldHealProcessor(),
      RESTORE_SECTION_SHIELDS: new ShipShieldRestoreProcessor(),
      // Phase 4: Damage effects (all handled by DamageEffectProcessor)
      DAMAGE: damageProcessor,
      DAMAGE_SCALING: damageProcessor,
      SPLASH_DAMAGE: damageProcessor,
      OVERFLOW_DAMAGE: damageProcessor,
      CONDITIONAL_SECTION_DAMAGE: new ConditionalSectionDamageProcessor(),
      // Phase 6: Stat modification effects (destroy, modify, upgrades)
      DESTROY: new DestroyEffectProcessor(),
      MODIFY_STAT: new ModifyStatEffectProcessor(),
      MODIFY_DRONE_BASE: new ModifyDroneBaseEffectProcessor(),
      DESTROY_UPGRADE: new DestroyUpgradeEffectProcessor(),
      // Phase 7: Movement effects - COMPLETE
      SINGLE_MOVE: movementProcessor,
      MULTI_MOVE: movementProcessor,
      // Phase 8: Special effects (meta-processors, tokens, search) - COMPLETE
      REPEATING_EFFECT: new RepeatingEffectProcessor(),
      COMPOSITE_EFFECT: new CompositeEffectProcessor(),
      CREATE_TOKENS: new TokenCreationProcessor(),
      SEARCH_AND_DRAW: new SearchAndDrawProcessor(),
      DRAW_THEN_DISCARD: new DrawThenDiscardProcessor(),
      // Phase 9.4A: Marking effects - COMPLETE
      MARK_DRONE: markingProcessor,
      MARK_RANDOM_ENEMY: markingProcessor,
      // Detection/Threat effects (Extraction mode)
      INCREASE_THREAT: new IncreaseThreatEffectProcessor(),
      // Phase 10: New tactics card effects
      DISCARD: new DiscardEffectProcessor(),
      DRAIN_ENERGY: new DrainEnergyEffectProcessor(),
      EXHAUST_DRONE: new ExhaustDroneEffectProcessor(),
      // Status effects - restriction/control effects
      APPLY_CANNOT_MOVE: new StatusEffectProcessor(),
      APPLY_CANNOT_ATTACK: new StatusEffectProcessor(),
      APPLY_CANNOT_INTERCEPT: new StatusEffectProcessor(),
      APPLY_DOES_NOT_READY: new StatusEffectProcessor(),
      APPLY_SNARED: new StatusEffectProcessor(),
      APPLY_SUPPRESSED: new StatusEffectProcessor(),
      CLEAR_ALL_STATUS: new StatusEffectProcessor()
    };
  }

  /**
   * Route an effect to its processor
   *
   * @param {Object} effect - Effect configuration with type property
   * @param {string} effect.type - Effect type (DRAW, GAIN_ENERGY, READY_DRONE, etc.)
   * @param {Object} context - Effect execution context
   * @param {string} context.actingPlayerId - Player executing the effect
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.placedSections - Placed ship sections (optional)
   * @param {Object} context.target - Target for the effect (optional)
   * @param {Object} context.callbacks - Callback functions (optional)
   * @returns {Object|null} Result from processor, or null if not routed
   */
  routeEffect(effect, context) {
    const processor = this.processors[effect.type];

    if (processor) {
      // Route to modular processor (Phase 1 effects)
      debugLog('EFFECT_ROUTING', `✅ Routing ${effect.type} to ${processor.constructor.name}`, {
        effectType: effect.type,
        processor: processor.constructor.name,
        actingPlayer: context.actingPlayerId
      });
      return processor.process(effect, context);
    }

    // Effect type not yet extracted - return null to signal fallback needed
    debugLog('EFFECT_ROUTING', `⚠️ No processor for ${effect.type} - falling back to monolithic`, {
      effectType: effect.type,
      actingPlayer: context.actingPlayerId
    });
    return null;
  }

  /**
   * Check if an effect type is handled by a modular processor
   *
   * @param {string} effectType - Effect type to check
   * @returns {boolean} True if processor exists for this type
   */
  hasProcessor(effectType) {
    return this.processors.hasOwnProperty(effectType);
  }
}

export default EffectRouter;
