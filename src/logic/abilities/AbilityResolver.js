// ========================================
// ABILITY RESOLVER
// ========================================
// Handles drone and ship ability resolution
// Extracted from gameLogic.js Phase 9.10

import EffectRouter from '../EffectRouter.js';
import { updateAuras } from '../utils/auraManager.js';
import { getLaneOfDrone } from '../utils/gameEngineUtils.js';
import { onDroneRecalled } from '../utils/droneStateUtils.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * AbilityResolver
 * Orchestrates ability execution for drones and ship sections
 *
 * Key responsibilities:
 * - Resolve drone abilities (exhaust, cost payment, effect routing)
 * - Resolve ship abilities (special cases, effect routing)
 * - Route ability effects through EffectRouter
 * - Handle RECALL_DRONE effect (ship-specific)
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
    } else if (effect.type === 'DESTROY_TOKEN_SELF') {
      outcome = `${userDrone.name} was purged.`;
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

    // Handle DESTROY_TOKEN_SELF directly (self-destruction doesn't go through EffectRouter)
    if (effect.type === 'DESTROY_TOKEN_SELF') {
      return this.resolveDestroyTokenSelf(userDrone, actingPlayerId, newPlayerStates, placedSections);
    }

    // Apply effects using modular handler
    const effectResult = this.resolveDroneAbilityEffect(effect, userDrone, targetDrone, newPlayerStates, placedSections, { resolveAttackCallback }, actingPlayerId);

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
   * Resolve a ship section ability
   *
   * Handles special cases (REALLOCATE_SHIELDS, mandatory discard), routes effect
   * through processors, and generates animation events.
   *
   * @param {Object} ability - Ability definition { effect, cost, name }
   * @param {string} sectionName - Name of ship section using ability
   * @param {Object} target - Target drone/lane
   * @param {Object} playerStates - { player1, player2 } current states
   * @param {Object} placedSections - Placed ship sections for calculations
   * @param {Object} callbacks - { logCallback, resolveAttackCallback }
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents, requiresShieldReallocation?, mandatoryAction? }
   */
  resolveShipAbility(ability, sectionName, target, playerStates, placedSections, callbacks, playerId) {
    const { logCallback, resolveAttackCallback } = callbacks || {};
    const { cost, effect } = ability;
    const actingPlayerState = playerStates[playerId];

    // Log the ability
    if (logCallback) {
      logCallback({
        player: actingPlayerState.name,
        actionType: 'SHIP_ABILITY',
        source: `${sectionName}'s ${ability.name}`,
        target: target?.name || 'N/A',
        outcome: `Activated ${ability.name}.`
      });
    }

    // Add animation events for opponent notification
    const animationEvents = [{
      type: 'SHIP_ABILITY_REVEAL',
      abilityName: ability.name,
      sectionName: sectionName,
      actingPlayerId: playerId
    }];

    // Create updated player state
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    // Increment ship section ability activation counter for per-round limits
    if (newPlayerStates[playerId].shipSections?.[sectionName]) {
      const section = newPlayerStates[playerId].shipSections[sectionName];
      section.abilityActivationCount = (section.abilityActivationCount || 0) + 1;
    }

    // NOTE: Energy cost is NOT deducted here - it's deducted in processShipAbilityCompletion
    // This ensures energy is only paid when the action completes and the turn ends

    // Use modular handler for ship ability effects
    if (effect.type === 'REALLOCATE_SHIELDS') {
      // Shield reallocation will be handled separately
      return {
        newPlayerStates,
        shouldEndTurn: false,
        requiresShieldReallocation: true,
        animationEvents
      };
    } else {
      // Handle other ship ability effects using modular handler
      const effectResult = this.resolveShipAbilityEffect(effect, sectionName, target, newPlayerStates, placedSections, { resolveAttackCallback }, playerId);

      // Update states from effect result
      newPlayerStates.player1 = effectResult.newPlayerStates.player1;
      newPlayerStates.player2 = effectResult.newPlayerStates.player2;

      // Collect animation events from effect result
      animationEvents.push(...(effectResult.animationEvents || []));

      // Handle special return cases
      if (effectResult.needsDiscardSelection) {
        // Don't show "Opponent Used..." popup until after mandatory discard is complete
        // Store ability info for later animation emission and completion
        return {
          newPlayerStates,
          shouldEndTurn: false,
          mandatoryAction: {
            type: 'discard',
            player: playerId,
            count: effectResult.needsDiscardSelection,
            fromAbility: true,
            ability: ability,           // Store full ability object for completion
            abilityName: ability.name,  // Store for animation after discard
            sectionName: sectionName,   // Store for animation and completion
            actingPlayerId: playerId    // Store for animation and completion
          },
          animationEvents: []  // Suppress SHIP_ABILITY_REVEAL until discard completes
        };
      }

      return {
        newPlayerStates,
        shouldEndTurn: true,
        animationEvents
      };
    }
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
  resolveDroneAbilityEffect(effect, userDrone, targetDrone, playerStates, placedSections, callbacks, actingPlayerId = 'player1') {
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
      gameMode: 'local'
    };

    const result = effectRouter.routeEffect(effect, context);

    // Handle effects not yet extracted to processors
    if (result === null) {
      console.warn(`Drone ability effect ${effect.type} not yet extracted to processor`);
      return { newPlayerStates: playerStates, additionalEffects: [], animationEvents: [] };
    }

    return result;
  }

  /**
   * Route ship ability effect through EffectRouter
   *
   * Routes effect to appropriate processor, with fallback for ship-specific effects.
   *
   * @param {Object} effect - Effect definition
   * @param {string} sectionName - Ship section name
   * @param {Object} target - Target drone/lane
   * @param {Object} playerStates - { player1, player2 }
   * @param {Object} placedSections - Placed ship sections
   * @param {Object} callbacks - Callback functions
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {Object} { newPlayerStates, additionalEffects, animationEvents, needsDiscardSelection? }
   */
  resolveShipAbilityEffect(effect, sectionName, target, playerStates, placedSections, callbacks, playerId) {
    const shipSource = { name: sectionName };

    // Try routing through EffectRouter for extracted effect types (DAMAGE, DRAW, HEAL, etc.)
    const effectRouter = new EffectRouter();

    const context = {
      actingPlayerId: playerId,
      playerStates,
      target,
      source: shipSource,
      placedSections,
      callbacks,
      localPlayerId: playerId,
      gameMode: 'local'
    };

    const result = effectRouter.routeEffect(effect, context);

    // If routed successfully, return result
    if (result !== null) {
      return result;
    }

    // Fallback for ship-specific abilities not yet extracted to processors
    switch (effect.type) {
      case 'RECALL_DRONE':
        return this.resolveShipRecallEffect(effect, sectionName, target, playerStates, placedSections, callbacks, playerId);
      case 'MARK_DRONE':
        // MARK_DRONE is now handled by MarkingEffectProcessor
        console.warn('MARK_DRONE should be handled by MarkingEffectProcessor');
        return { newPlayerStates: playerStates, additionalEffects: [], animationEvents: [] };
      default:
        console.warn(`Unknown ship ability effect type: ${effect.type}`);
        return { newPlayerStates: playerStates, additionalEffects: [], animationEvents: [] };
    }
  }

  /**
   * Resolve DESTROY_TOKEN_SELF ability
   * Removes the token from the board and generates destruction animation.
   *
   * @param {Object} userDrone - The token drone destroying itself
   * @param {string} actingPlayerId - Owner of the token
   * @param {Object} newPlayerStates - Already cloned player states
   * @param {Object} placedSections - Placed ship sections
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents }
   */
  resolveDestroyTokenSelf(userDrone, actingPlayerId, newPlayerStates, placedSections) {
    const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';
    const animationEvents = [];

    // Find which lane the token is in
    const lane = getLaneOfDrone(userDrone.id, newPlayerStates[actingPlayerId]);
    if (lane) {
      // Remove the token from the board
      newPlayerStates[actingPlayerId].dronesOnBoard[lane] =
        newPlayerStates[actingPlayerId].dronesOnBoard[lane].filter(d => d.id !== userDrone.id);

      // Update deployed drone count
      Object.assign(newPlayerStates[actingPlayerId], onDroneRecalled(newPlayerStates[actingPlayerId], userDrone));

      // Update auras
      newPlayerStates[actingPlayerId].dronesOnBoard = updateAuras(
        newPlayerStates[actingPlayerId], newPlayerStates[opponentId], placedSections
      );

      // Generate destruction animation
      animationEvents.push({
        type: 'DRONE_DESTROYED',
        targetId: userDrone.id,
        targetPlayer: actingPlayerId,
        laneId: lane,
        timestamp: Date.now()
      });
    }

    return {
      newPlayerStates,
      shouldEndTurn: true,
      animationEvents
    };
  }

  /**
   * Resolve RECALL_DRONE ship ability effect
   *
   * Removes drone from board, updates deployed counts, updates auras, and generates animation.
   *
   * @param {Object} effect - Effect definition
   * @param {string} sectionName - Ship section name
   * @param {string} target - Target drone ID
   * @param {Object} playerStates - { player1, player2 }
   * @param {Object} placedSections - Placed ship sections
   * @param {Object} callbacks - Callback functions
   * @param {string} playerId - 'player1' or 'player2'
   * @returns {Object} { newPlayerStates, additionalEffects, animationEvents }
   */
  resolveShipRecallEffect(effect, sectionName, target, playerStates, placedSections, callbacks, playerId) {
    const newPlayerStates = {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };

    // Determine opponent for aura updates
    const opponentId = playerId === 'player1' ? 'player2' : 'player1';

    // target is the drone ID string (e.g., "SCOUT_001")
    const lane = getLaneOfDrone(target, newPlayerStates[playerId]);
    if (lane) {
      // Find the actual drone object
      const droneToRecall = newPlayerStates[playerId].dronesOnBoard[lane].find(d => d.id === target);

      if (!droneToRecall) {
        console.warn('⚠️ [RECALL DEBUG] Drone not found in lane:', target, 'lane:', lane);
        return {
          newPlayerStates,
          additionalEffects: [],
          animationEvents: []
        };
      }

      // Remove drone from board
      newPlayerStates[playerId].dronesOnBoard[lane] = newPlayerStates[playerId].dronesOnBoard[lane].filter(d => d.id !== target);

      // Update deployed drone count (increment available drones)
      // onDroneRecalled expects drone object with .name property
      Object.assign(newPlayerStates[playerId], onDroneRecalled(newPlayerStates[playerId], droneToRecall));

      // Update auras with correct player order
      newPlayerStates[playerId].dronesOnBoard = updateAuras(newPlayerStates[playerId], newPlayerStates[opponentId], placedSections);

      // Create recall animation event
      const animationEvents = [{
        type: 'TELEPORT_OUT',
        targetId: target,
        laneId: lane,
        playerId: playerId,
        timestamp: Date.now()
      }];

      return {
        newPlayerStates,
        additionalEffects: [],
        animationEvents
      };
    }

    return {
      newPlayerStates,
      additionalEffects: [],
      animationEvents: []
    };
  }
}

// Export singleton instance
export default new AbilityResolver();
