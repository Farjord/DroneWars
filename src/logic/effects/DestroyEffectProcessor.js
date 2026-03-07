// ========================================
// DESTROY EFFECT PROCESSOR
// ========================================
// Handles DESTROY effect type
// Extracts destroy logic from gameLogic.js resolveDestroyEffect()
// Supports multiple scopes: SELF, SINGLE, FILTERED, LANE, ALL
//
// REFACTORED: Animation logic extracted to animations/ builders

import BaseEffectProcessor from './BaseEffectProcessor.js';
import { getLaneOfDrone } from '../utils/gameEngineUtils.js';
import { gameEngine } from '../gameLogic.js';
import { calculateEffectiveStats } from '../statsCalculator.js';
import { buildDefaultDestroyAnimation } from './destroy/animations/DefaultDestroyAnimation.js';
import { buildNukeAnimation } from './destroy/animations/NukeAnimation.js';
import { debugLog } from '../../utils/debugLogger.js';
import { selectTargets } from '../targeting/TargetSelector.js';
import { SeededRandom } from '../../utils/seededRandom.js';

/**
 * Processor for DESTROY effect type
 *
 * Instantly removes drones from the battlefield with optional filtering.
 * Supports:
 * - Single drone targeting
 * - Filtered targeting (destroy drones matching criteria in a lane)
 * - Lane-wide targeting (destroy all drones in a lane from BOTH players)
 * - Card-specific animation overrides (Nuke, Purge Protocol)
 *
 * @extends BaseEffectProcessor
 */
class DestroyEffectProcessor extends BaseEffectProcessor {
  /**
   * Apply drone destruction cleanup: update deployment counts and availability
   *
   * @private
   * @param {Object} playerState - Owner's player state (mutated)
   * @param {Object} drone - Drone being destroyed
   */
  applyDestroyCleanup(playerState, drone) {
    const updates = gameEngine.onDroneDestroyed(playerState, drone);
    playerState.deployedDroneCounts = {
      ...(playerState.deployedDroneCounts || {}),
      ...updates.deployedDroneCounts
    };
    if (updates.droneAvailability) {
      playerState.droneAvailability = updates.droneAvailability;
    }
  }

  /**
   * Process DESTROY effect
   *
   * @param {Object} effect - Effect definition { type: 'DESTROY', scope?, filter? }
   * @param {Object} context - Effect context
   * @param {string} context.actingPlayerId - Player performing the action
   * @param {Object} context.playerStates - Current player states
   * @param {Object} context.target - Target of the effect
   * @param {Object} context.card - Source card (for animation routing)
   * @returns {Object} Result { newPlayerStates, additionalEffects, animationEvents }
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    const { actingPlayerId, playerStates, target, card, placedSections } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    const animationEvents = [];
    const destroyedDrones = [];

    // Route based on effect scope and targeting configuration
    const affectedFilter = effect?.targeting?.affectedFilter || card?.targeting?.affectedFilter;
    const targetSelection = effect?.targeting?.targetSelection || card?.targeting?.targetSelection;
    if ((affectedFilter || targetSelection) && target?.id?.startsWith('lane')) {
      // Filtered lane destroy: Destroy drones in a lane matching targeting criteria
      const result = this.processFilteredDestroy(effect, target, actingPlayerId, newPlayerStates, card, placedSections, context);
      destroyedDrones.push(...result.destroyedDrones);
      animationEvents.push(...result.animationEvents);

    } else if (effect.scope === 'LANE' && target.id) {
      // LANE scope: Destroy all drones in a lane (BOTH sides - area effect like Nuke)
      const result = this.processLaneDestroy(target, actingPlayerId, opponentId, newPlayerStates);
      destroyedDrones.push(...result.destroyedDrones);
      animationEvents.push(...result.animationEvents);

    } else if (effect.scope === 'SELF' && target) {
      // SELF scope: Drone destroys itself (e.g., Firefly after attacking)
      const result = this.processSingleDestroy(target, actingPlayerId, newPlayerStates);
      if (result.droneDestroyed) {
        destroyedDrones.push(result.droneDestroyed);
      }
      animationEvents.push(...result.animationEvents);

    } else if (effect.scope === 'SINGLE' && target && target.owner !== actingPlayerId) {
      // SINGLE scope: Destroy one specific drone
      const result = this.processSingleDestroy(target, opponentId, newPlayerStates);
      if (result.droneDestroyed) {
        destroyedDrones.push(result.droneDestroyed);
      }
      animationEvents.push(...result.animationEvents);

    } else if (effect.scope === 'ALL') {
      // ALL scope: Destroy all marked enemy drones (Purge Protocol)
      const result = this.processAllMarkedDestroy(card, actingPlayerId, opponentId, newPlayerStates);
      destroyedDrones.push(...result.destroyedDrones);
      animationEvents.push(...result.animationEvents);
    }

    // Route to appropriate animation builder based on card's visualEffect
    // Note: For ALL scope (Purge Protocol), animations are already added per-drone in processAllMarkedDestroy
    // Only add extra NUKE_BLAST animation if NOT ALL scope (since ALL scope may span multiple lanes)
    if (destroyedDrones.length > 0 && effect.scope !== 'ALL') {
      const visualType = card?.visualEffect?.type;

      if (visualType === 'NUKE_BLAST') {
        // Use Nuke-specific animation (large blast + individual explosions)
        animationEvents.push(...buildNukeAnimation({
          destroyedDrones,
          targetPlayer: target?.owner || opponentId,
          targetLane: target?.id,
          card,
          actingPlayerId
        }));
      } else if (animationEvents.length === 0) {
        // Use default animation if no animations generated yet
        animationEvents.push(...buildDefaultDestroyAnimation({
          destroyedDrones,
          targetPlayer: target?.owner || opponentId,
          targetLane: target?.id
        }));
      }
    }

    const result = {
      newPlayerStates,
      additionalEffects: [],
      animationEvents
    };

    this.logProcessComplete(effect, result, context);
    return result;
  }

  /**
   * Process FILTERED scope destruction (destroy drones matching criteria)
   *
   * @private
   */
  processFilteredDestroy(effect, target, actingPlayerId, newPlayerStates, card, placedSections, context = {}) {
    const laneId = target.id;
    const affinity = effect?.targeting?.affinity || card?.targeting?.affinity || effect.affinity;
    const targetPlayer = affinity === 'ENEMY'
      ? (actingPlayerId === 'player1' ? 'player2' : 'player1')
      : actingPlayerId;
    const targetPlayerState = newPlayerStates[targetPlayer];
    const actingPlayerState = newPlayerStates[actingPlayerId];
    const dronesInLane = targetPlayerState.dronesOnBoard[laneId] || [];

    // Read filter from targeting.affectedFilter (may be absent if only targetSelection)
    const filterSource = (effect?.targeting?.affectedFilter || card?.targeting?.affectedFilter)?.[0];

    debugLog('EFFECT_PROCESSING', `[DESTROY] Filtered destroy - ${actingPlayerId} targeting ${targetPlayer} ${laneId}`, {
      filter: filterSource ? `${filterSource.stat} ${filterSource.comparison} ${filterSource.value}` : 'none',
      dronesInLane: dronesInLane.length
    });

    // Phase 1: Collect drones matching filter criteria
    let candidateDrones = [...dronesInLane];
    if (filterSource) {
      const { stat, comparison, value } = filterSource;
      candidateDrones = dronesInLane.filter(droneInLane => {
        const effectiveStats = calculateEffectiveStats(
          droneInLane, laneId, targetPlayerState, actingPlayerState, placedSections || {}
        );
        const effectiveStatValue = effectiveStats[stat] !== undefined ? effectiveStats[stat] : droneInLane[stat];

        let meetsCondition = false;
        switch (comparison) {
          case 'GTE': meetsCondition = effectiveStatValue >= value; break;
          case 'LTE': meetsCondition = effectiveStatValue <= value; break;
          case 'EQ': meetsCondition = effectiveStatValue === value; break;
          case 'GT': meetsCondition = effectiveStatValue > value; break;
          case 'LT': meetsCondition = effectiveStatValue < value; break;
        }

        debugLog('EFFECT_PROCESSING', `[DESTROY] ${droneInLane.name} ${stat}=${effectiveStatValue} (base: ${droneInLane[stat]}) ${comparison} ${value} = ${meetsCondition}`);
        return meetsCondition;
      });
    }

    // Phase 2: Apply targetSelection (RANDOM, HIGHEST, LOWEST)
    const tsConfig = effect?.targeting?.targetSelection || card?.targeting?.targetSelection;
    if (tsConfig) {
      const discriminator = card?.instanceId || candidateDrones.length;
      const rng = SeededRandom.forTargetSelection(
        { gameSeed: context.gameSeed ?? 12345, roundNumber: context.roundNumber },
        typeof discriminator === 'string' ? discriminator.length : discriminator
      );
      candidateDrones = selectTargets(candidateDrones, tsConfig, rng, (drone) => {
        if (!tsConfig.stat) return 0;
        const effectiveStats = calculateEffectiveStats(drone, laneId, targetPlayerState, actingPlayerState, placedSections || {});
        return effectiveStats[tsConfig.stat] ?? drone[tsConfig.stat];
      });
    }

    // Phase 3: Destroy selected drones
    const destroyedDrones = [];
    const animationEvents = [];
    const selectedIds = new Set(candidateDrones.map(d => d.id));

    for (let i = dronesInLane.length - 1; i >= 0; i--) {
      const droneInLane = dronesInLane[i];
      if (!selectedIds.has(droneInLane.id)) continue;

      destroyedDrones.push(droneInLane);
      debugLog('EFFECT_PROCESSING', `[DESTROY] ${droneInLane.name} marked for destruction`);

      animationEvents.push({
        type: 'DRONE_DESTROYED',
        targetId: droneInLane.id,
        targetPlayer: targetPlayer,
        targetLane: laneId,
        targetType: 'drone',
        timestamp: Date.now()
      });

      this.applyDestroyCleanup(targetPlayerState, droneInLane);
      dronesInLane.splice(i, 1);
    }

    debugLog('EFFECT_PROCESSING', `[DESTROY] Destroyed ${destroyedDrones.length} drones via filter`);

    return { destroyedDrones, animationEvents };
  }

  /**
   * Process LANE scope destruction (destroy all drones in lane, BOTH sides)
   *
   * @private
   */
  processLaneDestroy(target, actingPlayerId, opponentId, newPlayerStates) {
    const laneId = target.id;
    const destroyedDrones = [];
    const animationEvents = [];

    debugLog('EFFECT_PROCESSING', `[DESTROY] Lane-wide destroy in ${laneId} (BOTH sides)`);

    // Destroy opponent's drones in this lane
    const opponentDrones = newPlayerStates[opponentId].dronesOnBoard[laneId] || [];
    opponentDrones.forEach(drone => {
      destroyedDrones.push(drone);

      // Add destruction animation event
      animationEvents.push({
        type: 'DRONE_DESTROYED',
        targetId: drone.id,
        targetPlayer: opponentId,
        targetLane: laneId,
        targetType: 'drone',
        timestamp: Date.now()
      });

      // Update deployment counts and availability
      this.applyDestroyCleanup(newPlayerStates[opponentId], drone);
    });
    newPlayerStates[opponentId].dronesOnBoard[laneId] = [];

    // Destroy acting player's own drones in this lane (for area effect cards like Nuke)
    const actingPlayerDrones = newPlayerStates[actingPlayerId].dronesOnBoard[laneId] || [];
    actingPlayerDrones.forEach(drone => {
      destroyedDrones.push(drone);

      // Add destruction animation event
      animationEvents.push({
        type: 'DRONE_DESTROYED',
        targetId: drone.id,
        targetPlayer: actingPlayerId,
        targetLane: laneId,
        targetType: 'drone',
        timestamp: Date.now()
      });

      // Update deployment counts and availability
      this.applyDestroyCleanup(newPlayerStates[actingPlayerId], drone);
    });
    newPlayerStates[actingPlayerId].dronesOnBoard[laneId] = [];

    debugLog('EFFECT_PROCESSING', `[DESTROY] Destroyed ${destroyedDrones.length} drones in lane ${laneId}`);

    return { destroyedDrones, animationEvents };
  }

  /**
   * Process SINGLE scope destruction (destroy one specific drone)
   *
   * @private
   */
  processSingleDestroy(target, opponentId, newPlayerStates) {
    const targetPlayerState = newPlayerStates[opponentId];
    const laneId = getLaneOfDrone(target.id, targetPlayerState);
    const animationEvents = [];
    let droneDestroyed = null;

    if (laneId) {
      const droneToDestroy = targetPlayerState.dronesOnBoard[laneId]?.find(d => d.id === target.id);

      if (droneToDestroy) {
        droneDestroyed = droneToDestroy;

        debugLog('EFFECT_PROCESSING', `[DESTROY] Single drone destroy: ${droneToDestroy.name} in ${laneId}`);

        animationEvents.push({
          type: 'DRONE_DESTROYED',
          targetId: droneToDestroy.id,
          targetPlayer: opponentId,
          targetLane: laneId,
          targetType: 'drone',
          timestamp: Date.now()
        });

        this.applyDestroyCleanup(targetPlayerState, droneToDestroy);
        targetPlayerState.dronesOnBoard[laneId] = targetPlayerState.dronesOnBoard[laneId].filter(d => d.id !== target.id);
      }
    }

    return { droneDestroyed, animationEvents };
  }

  /**
   * Process ALL scope destruction (destroy all marked enemy drones)
   * Used by Purge Protocol card (NONE targeting, scope: ALL)
   *
   * @private
   */
  processAllMarkedDestroy(card, actingPlayerId, opponentId, newPlayerStates) {
    const destroyedDrones = [];
    const animationEvents = [];

    // Determine target player based on card's targeting affinity
    const affinity = card?.targeting?.affinity || 'ENEMY';
    const targetPlayerId = affinity === 'ENEMY' ? opponentId : actingPlayerId;
    const targetPlayerState = newPlayerStates[targetPlayerId];

    debugLog('EFFECT_PROCESSING', `[DESTROY] ALL scope - destroying all marked drones for ${targetPlayerId}`);

    // Search all lanes for marked drones
    for (const laneId of ['lane1', 'lane2', 'lane3']) {
      const dronesInLane = targetPlayerState.dronesOnBoard[laneId] || [];

      // Iterate in reverse for safe removal
      for (let i = dronesInLane.length - 1; i >= 0; i--) {
        const drone = dronesInLane[i];

        if (drone.isMarked) {
          destroyedDrones.push(drone);

          debugLog('EFFECT_PROCESSING', `[DESTROY] ${drone.name} (marked) in ${laneId} destroyed`);

          // Add destruction animation event
          animationEvents.push({
            type: 'DRONE_DESTROYED',
            targetId: drone.id,
            targetPlayer: targetPlayerId,
            targetLane: laneId,
            targetType: 'drone',
            timestamp: Date.now()
          });

          // Update deployment counts and availability
          this.applyDestroyCleanup(targetPlayerState, drone);

          // Remove drone from lane
          dronesInLane.splice(i, 1);
        }
      }
    }

    debugLog('EFFECT_PROCESSING', `[DESTROY] ALL scope destroyed ${destroyedDrones.length} marked drones`);

    return { destroyedDrones, animationEvents };
  }
}

export default DestroyEffectProcessor;
