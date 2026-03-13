// ========================================
// ABILITY RESOLVER
// ========================================
// Handles drone and ship ability resolution
// Extracted from gameLogic.js Phase 9.10

import EffectRouter from '../EffectRouter.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * AbilityResolver
 * Orchestrates ability execution for drones and ship sections
 *
 * Key responsibilities:
 * - Resolve drone abilities (exhaust, cost payment, effect routing)
 * - Route ability effects through EffectRouter
 * - Generate animation events
 *
 * This is a stateless singleton - all methods are pure orchestration functions
 * that route to effect processors without side effects.
 */
class AbilityResolver {
  /**
   * Resolve a drone ability
   *
   * Handles cost payment (energy, exhaustion), routes effect through processors,
   * and generates animation events.
   *
   * @param {Object} ability - Ability definition { effect, cost, targeting, name }
   * @param {Object} userDrone - Drone using the ability
   * @param {Object} targetDrone - Target drone or lane
   * @param {Object} playerStates - { player1, player2 } current states
   * @param {Object} placedSections - Placed ship sections for calculations
   * @param {Function} logCallback - Logging callback
   * @param {Function} resolveAttackCallback - Attack resolution callback
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents }
   */
  resolveAbility(ability, userDrone, targetDrone, playerStates, placedSections, logCallback, resolveAttackCallback) {
    const { effect, cost } = ability;

    // Determine the actual owner of the drone using the ability
    // Search both player states to find which player owns this drone
    let actingPlayerId = 'player1'; // Default fallback
    for (const playerId of ['player1', 'player2']) {
      for (const lane in playerStates[playerId].dronesOnBoard) {
        if (playerStates[playerId].dronesOnBoard[lane].some(d => d.id === userDrone.id)) {
          actingPlayerId = playerId;
          break;
        }
      }
    }
    const actingPlayerState = playerStates[actingPlayerId];

    // Generate outcome message
    let targetName = '';
    let outcome = 'Ability effect applied.';

    if (ability.targeting?.type === 'SELF') {
      targetName = userDrone.name;
      outcome = `${ability.name} activated.`;
    } else if (ability.targeting?.type === 'LANE') {
      targetName = `Lane ${targetDrone.id.slice(-1)}`;
    } else if (targetDrone) {
      targetName = targetDrone.name;
    }

    if (effect.type === 'HEAL') {
      outcome = `Healed ${effect.value} hull on targets in ${targetName}.`;
      if (effect.scope !== 'LANE') {
        outcome = `Healed ${effect.value} hull on ${targetName}.`;
      }
    } else if (effect.type === 'DAMAGE') {
      outcome = `Dealt ${effect.value} damage to ${targetName}.`;
    }

    // Log the ability
    if (logCallback) {
      logCallback({
        player: actingPlayerState.name,
        actionType: 'ABILITY',
        source: `${userDrone.name}'s ${ability.name}`,
        target: targetName,
        outcome: outcome
      });
    }

    // Create updated player state
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    // Pay costs (from the actual acting player)
    if (cost.energy) {
      newPlayerStates[actingPlayerId].energy -= cost.energy;
    }

    if (cost.exhausts) {
      for (const lane in newPlayerStates[actingPlayerId].dronesOnBoard) {
        const droneIndex = newPlayerStates[actingPlayerId].dronesOnBoard[lane].findIndex(d => d.id === userDrone.id);
        if (droneIndex !== -1) {
          newPlayerStates[actingPlayerId].dronesOnBoard[lane][droneIndex].isExhausted = true;
          break;
        }
      }
    }

    // Increment ability activation counter for per-round limits
    const abilityIndex = userDrone.abilities?.findIndex(a => a.name === ability.name) ?? -1;
    if (abilityIndex !== -1) {
      for (const lane in newPlayerStates[actingPlayerId].dronesOnBoard) {
        const droneIndex = newPlayerStates[actingPlayerId].dronesOnBoard[lane].findIndex(d => d.id === userDrone.id);
        if (droneIndex !== -1) {
          const drone = newPlayerStates[actingPlayerId].dronesOnBoard[lane][droneIndex];
          if (!drone.abilityActivations) {
            drone.abilityActivations = [];
          }
          drone.abilityActivations[abilityIndex] = (drone.abilityActivations[abilityIndex] || 0) + 1;
          break;
        }
      }
    }

    // Apply effects using modular handler
    const effectResult = this.resolveDroneAbilityEffect(effect, userDrone, targetDrone, newPlayerStates, placedSections, { resolveAttackCallback }, actingPlayerId, {});

    // Update states from effect result
    newPlayerStates.player1 = effectResult.newPlayerStates.player1;
    newPlayerStates.player2 = effectResult.newPlayerStates.player2;

    // Collect animation events
    const animationEvents = effectResult.animationEvents || [];

    return {
      newPlayerStates,
      shouldEndTurn: !effect.goAgain,
      animationEvents
    };
  }

  /**
   * Route drone ability effect through EffectRouter
   *
   * Creates context and routes effect to appropriate processor.
   *
   * @param {Object} effect - Effect definition
   * @param {Object} userDrone - Drone using ability
   * @param {Object} targetDrone - Target drone/lane
   * @param {Object} playerStates - { player1, player2 }
   * @param {Object} placedSections - Placed ship sections
   * @param {Object} callbacks - Callback functions
   * @returns {Object} { newPlayerStates, additionalEffects, animationEvents }
   */
  resolveDroneAbilityEffect(effect, userDrone, targetDrone, playerStates, placedSections, callbacks, actingPlayerId = 'player1', { isPlayerAI } = {}) {
    // Route ability effects through EffectRouter (uses extracted processors)
    const effectRouter = new EffectRouter();

    const context = {
      actingPlayerId,
      playerStates,
      target: targetDrone,
      source: userDrone,
      placedSections,
      callbacks,
      localPlayerId: actingPlayerId,
      isPlayerAI
    };

    const result = effectRouter.routeEffect(effect, context);

    // Handle effects not yet extracted to processors
    if (result === null) {
      debugLog('SHIP_ABILITY', `Drone ability effect ${effect.type} not yet extracted to processor`);
      return { newPlayerStates: playerStates, additionalEffects: [], animationEvents: [] };
    }

    return result;
  }

}

// Export singleton instance
export default new AbilityResolver();
