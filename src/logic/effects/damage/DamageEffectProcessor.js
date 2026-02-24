// ========================================
// DAMAGE EFFECT PROCESSOR
// ========================================
// Handles DAMAGE, DAMAGE_SCALING, SPLASH_DAMAGE, and OVERFLOW_DAMAGE effect types
// Extracted from gameLogic.js resolveDamageEffect, resolveDamageScalingEffect,
// resolveSplashDamageEffect, and resolveOverflowDamageEffect functions
//
// REFACTORED: Animation logic extracted to dedicated animation builders
// - animations/DefaultDamageAnimation.js
// - animations/RailgunAnimation.js
// - animations/OverflowAnimation.js
// - animations/SplashAnimation.js
// - animations/FilteredDamageAnimation.js

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { getLaneOfDrone } from '../../utils/gameEngineUtils.js';
import { calculateEffectiveStats } from '../../statsCalculator.js';
import { gameEngine } from '../../gameLogic.js';
import { resolveAttack } from '../../combat/AttackProcessor.js';
import { calculateDamageByType } from '../../utils/damageCalculation.js';
import { debugLog } from '../../../utils/debugLogger.js';
import { buildDefaultDamageAnimation } from './animations/DefaultDamageAnimation.js';
import { buildRailgunAnimation } from './animations/RailgunAnimation.js';
import { buildOverflowAnimation } from './animations/OverflowAnimation.js';
import { buildSplashAnimation } from './animations/SplashAnimation.js';
import { buildFilteredDamageAnimation } from './animations/FilteredDamageAnimation.js';

/**
 * Processor for all damage effect types
 *
 * Supports:
 * - DAMAGE: Direct damage to single target or filtered targets
 * - DAMAGE_SCALING: Damage that scales based on game state (e.g., ready drones)
 * - SPLASH_DAMAGE: Primary damage + splash to adjacent drones
 * - OVERFLOW_DAMAGE: Damage with overflow to ship sections
 *
 * @extends BaseEffectProcessor
 */
class DamageEffectProcessor extends BaseEffectProcessor {
  /**
   * Process damage effects
   *
   * @param {Object} effect - Effect definition { type, value, scope?, filter?, etc. }
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player performing the action
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.placedSections - Placed ship sections
   * @param {Object} context.target - Target of the effect
   * @param {Object} context.callbacks - Callback functions (resolveAttackCallback, logCallback)
   * @param {Object} context.card - Source card (for animation)
   * @param {Object} context.source - Source entity (drone/ship for abilities)
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    let result;

    switch (effect.type) {
      case 'DAMAGE':
        result = this.processDamage(effect, context);
        break;

      case 'DAMAGE_SCALING':
        result = this.processDamageScaling(effect, context);
        break;

      case 'SPLASH_DAMAGE':
        result = this.processSplashDamage(effect, context);
        break;

      case 'OVERFLOW_DAMAGE':
        result = this.processOverflowDamage(effect, context);
        break;

      default:
        debugLog('COMBAT', `[DamageEffectProcessor] Unknown damage effect type: ${effect.type}`);
        result = this.createResult(context.playerStates, []);
    }

    this.logProcessComplete(effect, result, context);
    return result;
  }

  /**
   * Process DAMAGE effect (single or filtered targets)
   *
   * @private
   */
  processDamage(effect, context) {
    const { actingPlayerId, playerStates, placedSections, target, callbacks, card } = context;

    // Handle filtered damage (scope: 'FILTERED')
    if (effect.scope === 'FILTERED' && target.id && target.id.startsWith('lane') && effect.filter) {
      return this.processFilteredDamage(effect, target, actingPlayerId, playerStates, placedSections, callbacks, card);
    }

    // Handle single target damage
    return this.processSingleTargetDamage(effect, context);
  }

  /**
   * Process filtered damage (multiple targets in lane)
   *
   * @private
   */
  processFilteredDamage(effect, laneTarget, actingPlayerId, playerStates, placedSections, callbacks, card) {
    const newPlayerStates = this.clonePlayerStates(playerStates);

    const laneId = laneTarget.id;
    const targetPlayerId = laneTarget.owner || (actingPlayerId === 'player1' ? 'player2' : 'player1');
    const targetPlayerState = newPlayerStates[targetPlayerId];
    const dronesInLane = targetPlayerState.dronesOnBoard[laneId] || [];

    // Snapshot the drones to avoid modification during iteration
    const droneSnapshot = dronesInLane.map(d => ({ ...d }));

    debugLog('COMBAT', `[DAMAGE FILTERED] Processing ${effect.filter.targetType} in ${laneId} (${droneSnapshot.length} drones)`);

    // Apply filter to determine which drones are affected
    let affectedDrones = droneSnapshot;
    if (effect.filter.targetType === 'FRONT_MOST') {
      affectedDrones = droneSnapshot.length > 0 ? [droneSnapshot[0]] : [];
    } else if (effect.filter.targetType === 'BACK_MOST') {
      affectedDrones = droneSnapshot.length > 0 ? [droneSnapshot[droneSnapshot.length - 1]] : [];
    }

    // Apply stat-based filtering (e.g., speed LTE 4 for Sidewinder Missiles)
    if (effect.filter.stat) {
      const { stat, comparison, value } = effect.filter;
      const actingPlayerState = newPlayerStates[actingPlayerId];

      affectedDrones = affectedDrones.filter(drone => {
        // Calculate effective stats to include upgrades, auras, and ability modifiers
        const effectiveStats = calculateEffectiveStats(
          drone,
          laneId,
          targetPlayerState,
          actingPlayerState,
          placedSections || {}
        );
        const statValue = effectiveStats[stat] !== undefined ? effectiveStats[stat] : drone[stat];

        let meetsCondition = false;
        switch (comparison) {
          case 'LTE':
            meetsCondition = statValue <= value;
            break;
          case 'GTE':
            meetsCondition = statValue >= value;
            break;
          case 'EQ':
            meetsCondition = statValue === value;
            break;
          case 'GT':
            meetsCondition = statValue > value;
            break;
          case 'LT':
            meetsCondition = statValue < value;
            break;
          default:
            meetsCondition = true;
        }

        debugLog('COMBAT', `[DAMAGE FILTERED] ${drone.name} ${stat}=${statValue} ${comparison} ${value} = ${meetsCondition}`);
        return meetsCondition;
      });
    }

    // Track damage results for animation
    const damageResults = [];

    // Apply damage to each affected drone
    affectedDrones.forEach(snapshotDrone => {
      const droneIndex = dronesInLane.findIndex(d => d.id === snapshotDrone.id);
      if (droneIndex === -1) return; // Drone already removed

      const drone = dronesInLane[droneIndex];

      // Calculate damage (with marked bonus if applicable)
      let damageValue = effect.value;
      if (effect.markedBonus && drone.isMarked) {
        damageValue += effect.markedBonus;
        debugLog('COMBAT', `[DAMAGE] Target ${drone.name} is marked - applying bonus: ${effect.value} + ${effect.markedBonus} = ${damageValue}`);
      }

      // Determine damage type from effect
      const damageType = effect.damageType || (effect.isPiercing ? 'PIERCING' : undefined);

      // Apply damage using damage type helper
      const damageResult = calculateDamageByType(
        damageValue,
        drone.currentShields,
        drone.hull,
        damageType
      );
      const shieldDamage = damageResult.shieldDamage;
      const hullDamage = damageResult.hullDamage;

      // Apply damage to drone state
      drone.currentShields -= shieldDamage;
      drone.hull -= hullDamage;

      const destroyed = drone.hull <= 0;

      debugLog('COMBAT', `[DAMAGE] ${drone.name}: shields ${shieldDamage}, hull ${hullDamage}, destroyed: ${destroyed}`);

      // Store damage result for animation
      damageResults.push({
        drone,
        shieldDamage,
        hullDamage,
        destroyed
      });
    });

    // Remove destroyed drones
    for (let i = dronesInLane.length - 1; i >= 0; i--) {
      if (dronesInLane[i].hull <= 0) {
        const destroyedDrone = dronesInLane[i];
        const updates = gameEngine.onDroneDestroyed(targetPlayerState, destroyedDrone);
        targetPlayerState.deployedDroneCounts = {
          ...(targetPlayerState.deployedDroneCounts || {}),
          ...updates.deployedDroneCounts
        };
        dronesInLane.splice(i, 1);
      }
    }

    // Build animations using animation builder
    const animationEvents = buildFilteredDamageAnimation({
      affectedDrones: damageResults,
      card,
      targetPlayer: targetPlayerId,
      targetLane: laneId
    });

    return this.createResult(newPlayerStates, animationEvents);
  }

  /**
   * Process single target damage (uses resolveAttack for consistency)
   *
   * @private
   */
  processSingleTargetDamage(effect, context) {
    const { actingPlayerId, playerStates, placedSections, target, card, source } = context;

    // Determine correct player state based on target owner
    const targetPlayerState = target.owner === 'player1' ? playerStates.player1 : playerStates.player2;
    const targetLane = getLaneOfDrone(target.id, targetPlayerState);

    if (targetLane) {
      // Calculate damage value with markedBonus if applicable
      let damageValue = effect.value;
      if (effect.markedBonus && target.isMarked) {
        damageValue += effect.markedBonus;
        debugLog('COMBAT', `[DAMAGE] Target is marked - applying bonus damage: ${effect.value} + ${effect.markedBonus} = ${damageValue}`);
      }

      const attackDetails = {
        attacker: source || null,  // Explicitly null for card attacks (no source drone)
        target: target,
        targetType: 'drone',
        attackingPlayer: actingPlayerId || 'player1',
        abilityDamage: damageValue,
        lane: targetLane,
        damageType: effect.damageType,
        sourceCardInstanceId: card?.instanceId
      };

      // Call the attack resolution directly from AttackProcessor (game logic layer)
      const attackResult = resolveAttack(
        attackDetails,
        playerStates,
        placedSections
      );

      // Build effectResult for POST conditional evaluation
      const effectResult = {
        wasDestroyed: attackResult.attackResult?.wasDestroyed || false,
        damageDealt: {
          shield: attackResult.attackResult?.shieldDamage || 0,
          hull: attackResult.attackResult?.hullDamage || 0
        },
        targetId: target.id
      };

      return {
        newPlayerStates: attackResult.newPlayerStates,
        additionalEffects: attackResult.afterAttackEffects || [],
        animationEvents: attackResult.animationEvents || [],
        effectResult
      };
    }

    // No target found - return null effectResult
    return {
      ...this.createResult(playerStates, []),
      effectResult: null
    };
  }

  /**
   * Process DAMAGE_SCALING effect
   *
   * @private
   */
  processDamageScaling(effect, context) {
    const { actingPlayerId, playerStates, target } = context;

    // Calculate damage based on scaling source
    let damageValue = 0;

    if (effect.source === 'READY_DRONES_IN_LANE') {
      // Count ready (non-exhausted) friendly drones in the same lane as the target
      const targetPlayerState = target.owner === 'player1' ? playerStates.player1 : playerStates.player2;
      const targetLane = getLaneOfDrone(target.id, targetPlayerState);

      if (targetLane) {
        const actingPlayerState = playerStates[actingPlayerId];
        const dronesInLane = actingPlayerState.dronesOnBoard[targetLane] || [];
        const readyDrones = dronesInLane.filter(d => !d.isExhausted);
        damageValue = readyDrones.length;

        debugLog('COMBAT', `[DAMAGE_SCALING] Counting ready drones in ${targetLane}: ${readyDrones.length} ready drones`);
      }
    }

    // If no damage, return early
    if (damageValue === 0) {
      debugLog('COMBAT', `[DAMAGE_SCALING] No damage calculated, returning unchanged state`);
      return this.createResult(playerStates, []);
    }

    // Apply the calculated damage using single target damage processing
    const scaledEffect = {
      ...effect,
      type: 'DAMAGE',
      value: damageValue
    };

    return this.processSingleTargetDamage(scaledEffect, context);
  }

  /**
   * Process SPLASH_DAMAGE effect
   *
   * @private
   */
  processSplashDamage(effect, context) {
    const { actingPlayerId, playerStates, target, callbacks } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);

    const { primaryDamage, splashDamage, conditional } = effect;
    const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';
    const animationEvents = [];

    // Find target drone and lane
    let targetLane = null;
    let targetIndex = -1;
    for (const lane in newPlayerStates[opponentId].dronesOnBoard) {
      const index = newPlayerStates[opponentId].dronesOnBoard[lane].findIndex(d => d.id === target.id);
      if (index !== -1) {
        targetLane = lane;
        targetIndex = index;
        break;
      }
    }

    if (targetLane === null || targetIndex === -1) {
      debugLog('COMBAT', '[SPLASH_DAMAGE] Target drone not found');
      return this.createResult(newPlayerStates, []);
    }

    const dronesInLane = newPlayerStates[opponentId].dronesOnBoard[targetLane];

    // Check conditional for bonus damage
    let bonusDamage = 0;
    if (conditional?.type === 'FRIENDLY_COUNT_IN_LANE') {
      const friendlyDronesInLane = newPlayerStates[actingPlayerId].dronesOnBoard[targetLane]?.length || 0;
      if (friendlyDronesInLane >= conditional.threshold) {
        bonusDamage = conditional.bonusDamage;
      }
    }

    const finalPrimaryDamage = primaryDamage + bonusDamage;
    const finalSplashDamage = splashDamage + bonusDamage;

    // Determine damage type from effect
    const damageType = effect.damageType || (effect.isPiercing ? 'PIERCING' : undefined);

    // Helper function to apply damage (uses damage type helper)
    const applyDamage = (drone, damage) => {
      const result = calculateDamageByType(
        damage,
        drone.currentShields,
        drone.hull,
        damageType
      );
      drone.currentShields -= result.shieldDamage;
      drone.hull -= result.hullDamage;

      return {
        shieldDamage: result.shieldDamage,
        hullDamage: result.hullDamage,
        destroyed: drone.hull <= 0
      };
    };

    // Track damage results for animation event generation
    const damageResults = [];

    // Apply primary damage to primary target
    const primaryResult = applyDamage(dronesInLane[targetIndex], finalPrimaryDamage);
    damageResults.push({
      drone: dronesInLane[targetIndex],
      droneId: target.id,
      ...primaryResult
    });

    // Calculate adjacent indices
    const adjacentIndices = [];
    if (targetIndex > 0) {
      adjacentIndices.push(targetIndex - 1); // Left neighbor
    }
    if (targetIndex < dronesInLane.length - 1) {
      adjacentIndices.push(targetIndex + 1); // Right neighbor
    }

    // Apply splash damage to adjacent drones
    adjacentIndices.forEach(index => {
      const adjacentDrone = dronesInLane[index];
      const result = applyDamage(adjacentDrone, finalSplashDamage);
      damageResults.push({
        drone: adjacentDrone,
        droneId: adjacentDrone.id,
        ...result
      });
    });

    // Remove all destroyed drones (iterate backwards to avoid index issues)
    for (let i = dronesInLane.length - 1; i >= 0; i--) {
      if (dronesInLane[i].hull <= 0) {
        const destroyedDrone = dronesInLane[i];
        const updates = gameEngine.onDroneDestroyed(newPlayerStates[opponentId], destroyedDrone);
        newPlayerStates[opponentId].deployedDroneCounts = {
          ...(newPlayerStates[opponentId].deployedDroneCounts || {}),
          ...updates.deployedDroneCounts
        };
        dronesInLane.splice(i, 1);
      }
    }

    // Build animations using animation builder
    animationEvents.push(...buildSplashAnimation({
      damageResults,
      targetPlayer: opponentId,
      targetLane
    }));

    // Log splash effect
    if (callbacks?.logCallback) {
      callbacks.logCallback({
        player: playerStates[actingPlayerId].name,
        actionType: 'SPLASH_DAMAGE',
        source: 'Ordnance Card',
        target: `${target.name} and ${adjacentIndices.length} adjacent drone(s)`,
        outcome: `${finalPrimaryDamage} to primary, ${finalSplashDamage} splash damage`
      });
    }

    return this.createResult(newPlayerStates, animationEvents);
  }

  /**
   * Process OVERFLOW_DAMAGE effect
   *
   * @private
   */
  processOverflowDamage(effect, context) {
    const { actingPlayerId, playerStates, placedSections, callbacks, card } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);

    const { baseDamage, isPiercing, markedBonus = 0 } = effect;
    const target = context.target;
    const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';
    const animationEvents = [];

    // Find target drone
    let targetDrone = null;
    let targetLane = null;
    for (const lane in newPlayerStates[opponentId].dronesOnBoard) {
      const droneIndex = newPlayerStates[opponentId].dronesOnBoard[lane].findIndex(d => d.id === target.id);
      if (droneIndex !== -1) {
        targetDrone = newPlayerStates[opponentId].dronesOnBoard[lane][droneIndex];
        targetLane = lane;
        break;
      }
    }

    if (!targetDrone || !targetLane) {
      debugLog('COMBAT', '[OVERFLOW_DAMAGE] Target drone not found');
      return this.createResult(newPlayerStates, []);
    }

    // Calculate total damage (including marked bonus)
    const totalDamage = baseDamage + (targetDrone.isMarked ? markedBonus : 0);
    const damageType = isPiercing ? 'PIERCING' : 'NORMAL';

    // Calculate damage needed to destroy drone
    const damageToKill = isPiercing
      ? targetDrone.hull
      : targetDrone.currentShields + targetDrone.hull;

    // Apply damage to drone using shared damage calculator
    const { shieldDamage, hullDamage } = calculateDamageByType(
      totalDamage,
      targetDrone.currentShields,
      targetDrone.hull,
      damageType
    );
    targetDrone.currentShields -= shieldDamage;
    targetDrone.hull -= hullDamage;

    const droneDestroyed = targetDrone.hull <= 0;

    // Calculate overflow
    let overflowDamage = 0;
    if (droneDestroyed && totalDamage > damageToKill) {
      overflowDamage = totalDamage - damageToKill;

      // Get ship section in same lane
      const laneIndex = targetLane === 'lane1' ? 0 : targetLane === 'lane2' ? 1 : 2;
      const sectionArray = placedSections[opponentId];
      const sectionName = sectionArray[laneIndex];

      if (sectionName && newPlayerStates[opponentId].shipSections[sectionName]) {
        const shipSection = newPlayerStates[opponentId].shipSections[sectionName];

        // Apply overflow damage to ship section using shared damage calculator
        // (inheriting piercing property; uses allocatedShields for ship sections)
        const sectionResult = calculateDamageByType(
          overflowDamage,
          shipSection.allocatedShields,
          shipSection.hull,
          damageType
        );
        shipSection.allocatedShields -= sectionResult.shieldDamage;
        shipSection.hull -= sectionResult.hullDamage;

        // Log overflow damage
        if (callbacks?.logCallback) {
          callbacks.logCallback({
            player: playerStates[actingPlayerId].name,
            actionType: 'OVERFLOW_DAMAGE',
            source: 'Ordnance Card',
            target: sectionName,
            outcome: `${overflowDamage} overflow damage to ${sectionName}`
          });
        }
      }
    }

    // Remove destroyed drone
    if (droneDestroyed) {
      const laneArray = newPlayerStates[opponentId].dronesOnBoard[targetLane];
      const droneIndex = laneArray.findIndex(d => d.id === target.id);
      if (droneIndex !== -1) {
        const destroyedDrone = laneArray[droneIndex];
        const updates = gameEngine.onDroneDestroyed(newPlayerStates[opponentId], destroyedDrone);
        newPlayerStates[opponentId].deployedDroneCounts = {
          ...(newPlayerStates[opponentId].deployedDroneCounts || {}),
          ...updates.deployedDroneCounts
        };
        laneArray.splice(droneIndex, 1);
      }
    }

    // Route to appropriate animation builder based on card's visualEffect
    // Default to standard overflow if no visualEffect specified
    const visualType = card?.visualEffect?.type;

    debugLog('RAILGUN_ANIMATION', '[BUILD] Detected visual type:', {
      visualType,
      cardName: card?.name,
      hasVisualEffect: !!card?.visualEffect,
      willUseRailgun: visualType === 'RAILGUN_ANIMATION'
    });

    if (visualType === 'RAILGUN_ANIMATION') {
      // Use Railgun-specific animation (turret + beam)
      animationEvents.push(...buildRailgunAnimation({
        target,
        card,
        shieldDamage,
        hullDamage,
        droneDestroyed,
        overflowDamage,
        sourcePlayer: actingPlayerId,
        sourceLane: targetLane,
        targetPlayer: opponentId,
        targetLane
      }));

      debugLog('RAILGUN_ANIMATION', '[BUILD] Railgun animation events created:', {
        eventCount: animationEvents.length,
        eventTypes: animationEvents.map(e => e.type),
        fullEvents: animationEvents
      });
    } else {
      // Use standard overflow projectile animation
      animationEvents.push(...buildOverflowAnimation({
        target,
        card,
        totalDamage,
        shieldDamage,
        hullDamage,
        droneDestroyed,
        overflowDamage,
        targetPlayer: opponentId,
        targetLane
      }));
    }

    return this.createResult(newPlayerStates, animationEvents);
  }
}

export default DamageEffectProcessor;
