// ========================================
// TRIGGER PROCESSOR
// ========================================
// Unified trigger processing for all triggered abilities.
// Replaces fragmented patterns: abilityHelpers, MineTriggeredEffectProcessor,
// AttackProcessor AFTER_ATTACK handler (deleted Phase 6),
// RoundManager inline, DeploymentProcessor inline, rallyBeaconHelper (deleted Phase 7).
//
// Call sites remain distributed (movement fires ON_MOVE, combat fires ON_ATTACK, etc.)
// but they all call TriggerProcessor.fireTrigger() instead of bespoke logic.

import EffectRouter from '../EffectRouter.js';
import fullDroneCollection from '../../data/droneData.js';
import { onDroneDestroyed } from '../utils/droneStateUtils.js';
import { updateAuras } from '../utils/auraManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import {
  TRIGGER_TYPES,
  TRIGGER_OWNERS,
  SELF_TRIGGER_TYPES,
  CONTROLLER_TRIGGER_TYPES,
  LANE_TRIGGER_TYPES
} from './triggerConstants.js';

class TriggerProcessor {
  constructor() {
    this.effectRouter = new EffectRouter();
  }

  /**
   * Main entry point — called by MovementEffectProcessor, AttackProcessor, etc.
   *
   * Collects all matching triggers for the event, resolves them in priority order
   * (Self > Actor > Reactor, left-to-right within tiers), and handles cascades
   * depth-first with per-(reactor, source) pair loop guard.
   *
   * @param {string} triggerType - One of TRIGGER_TYPES values
   * @param {Object} context - Trigger context
   * @param {string} context.lane - Lane where action occurred
   * @param {Object} context.triggeringDrone - The drone that performed the action
   * @param {string} context.triggeringPlayerId - Player who owns the triggering drone
   * @param {string} context.actingPlayerId - Player who initiated the original action
   * @param {Object} context.playerStates - Current player states { player1, player2 }
   * @param {Object} context.placedSections - Placed ship sections
   * @param {Function} context.logCallback - Callback for game log entries
   * @param {Object} [context.card] - For ON_CARD_PLAY: the card that was played
   * @param {number} [context.scalingAmount] - For ON_CARD_DRAWN/ON_ENERGY_GAINED: count for scaling
   * @param {Set} [context.pairSet] - Set of "reactorId:sourceId" strings (cascade tracking)
   * @param {number} [context.chainDepth=0] - Current nesting depth
   * @returns {Object} { triggered, newPlayerStates, animationEvents, statModsApplied, goAgain }
   */
  fireTrigger(triggerType, context) {
    const {
      lane,
      triggeringDrone,
      triggeringPlayerId,
      actingPlayerId,
      playerStates,
      placedSections,
      logCallback,
      card = null,
      scalingAmount = null,
      pairSet = new Set(),
      chainDepth = 0
    } = context;

    let currentStates = playerStates;
    const allAnimationEvents = [];
    let anyTriggered = false;
    let anyStatMods = false;
    let goAgain = false;

    const matchingTriggers = this.findMatchingTriggers(
      triggerType, lane, triggeringDrone, triggeringPlayerId, actingPlayerId, currentStates, card
    );

    debugLog('TRIGGERS', `fireTrigger: ${triggerType} in ${lane}, found ${matchingTriggers.length} matching triggers`, {
      triggeringDrone: triggeringDrone?.name,
      chainDepth,
      pairSetSize: pairSet.size
    });

    for (const match of matchingTriggers) {
      const { drone: reactorDrone, ability, playerId: reactorPlayerId, lane: reactorLane } = match;

      // Drone liveness check — verify reactor still exists on the board
      if (!this._isDroneAlive(reactorDrone.id, reactorPlayerId, reactorLane, currentStates)) {
        debugLog('TRIGGERS', `Skipping dead reactor: ${reactorDrone.name} (${reactorDrone.id})`);
        continue;
      }

      // Pair guard: (reactor, source) pair fires at most once per chain
      const sourceId = triggeringDrone?.id || 'system';
      if (!this.checkPairGuard(reactorDrone.id, sourceId, pairSet)) {
        debugLog('TRIGGERS', `Pair guard blocked: ${reactorDrone.name} <- ${triggeringDrone?.name || 'system'}`);
        continue;
      }

      // Record pair
      pairSet.add(`${reactorDrone.id}:${sourceId}`);

      debugLog('TRIGGERS', `Executing trigger: ${reactorDrone.name}.${ability.name} (depth ${chainDepth})`, {
        reactorId: reactorDrone.id,
        sourceId,
        triggerType
      });

      // Execute trigger effects
      const result = this.executeTriggerEffects(
        ability, reactorDrone, reactorPlayerId, reactorLane,
        triggeringDrone, triggeringPlayerId, actingPlayerId, currentStates, placedSections,
        logCallback, pairSet, chainDepth, scalingAmount
      );

      if (result.triggered) {
        anyTriggered = true;
        currentStates = result.newPlayerStates;

        // Build STATE_SNAPSHOT event (JSON clone for codebase consistency)
        const snapshot = {
          type: 'STATE_SNAPSHOT',
          snapshotPlayerStates: JSON.parse(JSON.stringify(currentStates)),
          timestamp: Date.now()
        };

        // Events first, then snapshot:
        // - Destructive: targets stay in DOM for damage animations
        // - Additive: state change appears when announcement completes
        allAnimationEvents.push(...result.animationEvents, snapshot);

        if (result.statModsApplied) {
          anyStatMods = true;
        }

        if (result.goAgain) {
          goAgain = true;
        }
      }
    }

    return {
      triggered: anyTriggered,
      newPlayerStates: currentStates,
      animationEvents: allAnimationEvents,
      statModsApplied: anyStatMods,
      goAgain
    };
  }

  /**
   * Scan board for drones with matching TRIGGERED abilities.
   * Returns matches in priority order: Self > Actor's lane (L→R) > Opponent's lane (L→R).
   *
   * @param {string} triggerType - Trigger type to match
   * @param {string} lane - Lane where the action occurred
   * @param {Object} triggeringDrone - The drone that performed the action
   * @param {string} triggeringPlayerId - Player who owns the triggering drone
   * @param {string} actingPlayerId - Player who initiated the action
   * @param {Object} playerStates - Current player states { player1, player2 }
   * @param {Object} [card] - For ON_CARD_PLAY: the card
   * @returns {Array<Object>} Sorted array of { drone, ability, playerId, lane }
   */
  findMatchingTriggers(triggerType, lane, triggeringDrone, triggeringPlayerId, actingPlayerId, playerStates, card = null) {
    const matches = [];

    // Tier 1: Self-triggers on the acting drone
    if (SELF_TRIGGER_TYPES.has(triggerType) && triggeringDrone) {
      const baseDrone = fullDroneCollection.find(d => d.name === triggeringDrone.name);
      if (baseDrone?.abilities) {
        for (const ability of baseDrone.abilities) {
          if (ability.type === 'TRIGGERED' && ability.trigger === triggerType) {
            matches.push({
              drone: triggeringDrone,
              ability,
              playerId: triggeringPlayerId,
              lane,
              tier: 0 // Self
            });
          }
        }
      }
    }

    // Tier 2 & 3: Lane triggers (actor's drones first, then opponent's)
    if (LANE_TRIGGER_TYPES.has(triggerType)) {
      const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';

      // Actor's lane triggers (Tier 2)
      this._collectLaneTriggers(
        triggerType, lane, triggeringDrone, triggeringPlayerId,
        actingPlayerId, playerStates[actingPlayerId], card, matches, 1
      );

      // Opponent's lane triggers (Tier 3)
      this._collectLaneTriggers(
        triggerType, lane, triggeringDrone, triggeringPlayerId,
        opponentId, playerStates[opponentId], card, matches, 2
      );
    }

    // Controller triggers (scan all lanes for matching drones)
    if (CONTROLLER_TRIGGER_TYPES.has(triggerType)) {
      const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';

      // Actor's drones first (Tier 2), then opponent's (Tier 3)
      for (const [playerId, tier] of [[actingPlayerId, 1], [opponentId, 2]]) {
        this._collectControllerTriggers(
          triggerType, triggeringPlayerId, playerId,
          playerStates[playerId], card, matches, tier, lane
        );
      }
    }

    // Sort by tier, then by lane order (left-to-right is natural array order)
    matches.sort((a, b) => a.tier - b.tier);

    return matches;
  }

  /**
   * Route effects through EffectRouter. Handles destroyAfterTrigger, GO_AGAIN effects,
   * scalingDivisor, and cascading triggers.
   *
   * @returns {Object} { triggered, newPlayerStates, animationEvents, statModsApplied, goAgain }
   */
  executeTriggerEffects(
    ability, reactorDrone, reactorPlayerId, reactorLane,
    triggeringDrone, triggeringPlayerId, actingPlayerId, playerStates, placedSections,
    logCallback, pairSet, chainDepth, scalingAmount = null
  ) {
    let currentStates = playerStates;
    const animationEvents = [];
    let statModsApplied = false;
    let goAgain = false;

    // Normalize effects: support both effect{} and effects[]
    const effects = ability.effects || (ability.effect ? [ability.effect] : []);

    // Calculate repeat count for scaling triggers (ON_CARD_DRAWN, ON_ENERGY_GAINED)
    let repeatCount = 1;
    if (scalingAmount !== null && scalingAmount > 0) {
      const divisor = ability.scalingDivisor || 1;
      repeatCount = Math.floor(scalingAmount / divisor);
      if (repeatCount <= 0) {
        return { triggered: false, newPlayerStates: currentStates, animationEvents: [], statModsApplied: false, goAgain: false };
      }
    }

    // Log the trigger firing
    if (logCallback) {
      const outcomeDetail = repeatCount > 1
        ? `Activated '${ability.name}' — x${repeatCount} from ${scalingAmount} ${ability.trigger === 'ON_CARD_DRAWN' ? 'card(s) drawn' : 'energy gained'}.`
        : `Activated '${ability.name}'.`;
      logCallback({
        player: currentStates[reactorPlayerId]?.name || reactorPlayerId,
        actionType: 'ABILITY',
        source: reactorDrone.name,
        target: triggeringDrone?.name || 'Self',
        outcome: outcomeDetail
      }, 'triggerProcessor_fire');
    }

    // Emit TRIGGER_FIRED animation event (before effects, so it appears first in the queue)
    animationEvents.push({
      type: 'TRIGGER_FIRED',
      targetId: reactorDrone.id,
      targetPlayer: reactorPlayerId,
      targetLane: reactorLane,
      targetType: 'drone',
      droneName: reactorDrone.name,
      abilityName: ability.name,
      triggerType: ability.trigger,
      chainDepth,
      eventId: `${reactorDrone.id}:${ability.name}:${chainDepth}`,
      timestamp: Date.now()
    });

    // Repeat effects for scaling triggers (e.g., Odin: +1 attack per card drawn)
    for (let rep = 0; rep < repeatCount; rep++) {
      for (const effect of effects) {
        // Route TRIGGERING_DRONE scope: mine effects target the triggering drone
        if (effect.scope === 'TRIGGERING_DRONE') {
          if (effect.type === 'DAMAGE') {
            // DAMAGE handled inline — DamageEffectProcessor uses resolveAttack which is overkill for flat mine damage
            const directResult = this._applyMineDamage(
              effect, triggeringDrone, triggeringPlayerId, reactorLane,
              reactorDrone, currentStates, placedSections, logCallback
            );
            if (directResult.newPlayerStates) currentStates = directResult.newPlayerStates;
            if (directResult.animationEvents?.length > 0) animationEvents.push(...directResult.animationEvents);
            continue;
          }

          // EXHAUST_DRONE, MODIFY_STAT, etc. route through EffectRouter
          const triggeringTarget = {
            type: 'DRONE',
            id: triggeringDrone.id,
            droneId: triggeringDrone.id,
            name: triggeringDrone.name,
            lane: reactorLane,
            owner: triggeringPlayerId,
            playerId: triggeringPlayerId
          };
          const triggeringContext = {
            actingPlayerId: triggeringPlayerId,
            playerStates: currentStates,
            placedSections,
            sourceDroneName: reactorDrone.name,
            sourceDroneId: reactorDrone.id,
            lane: reactorLane,
            target: triggeringTarget,
            callbacks: { logCallback }
          };
          const routeResult = this.effectRouter.routeEffect(effect, triggeringContext);
          if (routeResult?.newPlayerStates) currentStates = routeResult.newPlayerStates;
          if (routeResult?.animationEvents?.length > 0) animationEvents.push(...routeResult.animationEvents);
          // Propagate cascading trigger events (e.g., DRAW -> ON_CARD_DRAWN -> Odin)
          if (routeResult?.triggerAnimationEvents?.length > 0) {
            if (routeResult.preTriggerState) {
              animationEvents.push({
                type: 'STATE_SNAPSHOT',
                snapshotPlayerStates: JSON.parse(JSON.stringify(routeResult.preTriggerState)),
                timestamp: Date.now()
              });
            }
            animationEvents.push(...routeResult.triggerAnimationEvents);
          }
          if (effect.type === 'MODIFY_STAT') {
            statModsApplied = true;
          }
          continue;
        }

        // GO_AGAIN is a control flow signal, not a state mutation — handle before EffectRouter
        if (effect.type === 'GO_AGAIN') {
          goAgain = true;
          if (logCallback) {
            logCallback({
              actionType: 'TRIGGER',
              source: reactorDrone.name,
              outcome: `${reactorDrone.name} in ${reactorLane} grants go again!`
            });
          }
          continue;
        }

        // Preprocess scope: 'SELF' → target the reactor drone
        const processedEffect = this._preprocessEffect(effect, reactorDrone, reactorLane);

        const context = {
          actingPlayerId: reactorPlayerId,
          playerStates: currentStates,
          placedSections,
          sourceDroneName: reactorDrone.name,
          sourceDroneId: reactorDrone.id,
          lane: reactorLane,
          target: this._buildTarget(processedEffect, reactorDrone, reactorPlayerId, reactorLane, currentStates),
          callbacks: { logCallback }
        };

        const result = this.effectRouter.routeEffect(processedEffect, context);

        if (result?.newPlayerStates) {
          currentStates = result.newPlayerStates;
        }

        if (result?.animationEvents?.length > 0) {
          animationEvents.push(...result.animationEvents);
        }

        // Propagate cascading trigger events (e.g., DRAW -> ON_CARD_DRAWN -> Odin)
        if (result?.triggerAnimationEvents?.length > 0) {
          if (result.preTriggerState) {
            animationEvents.push({
              type: 'STATE_SNAPSHOT',
              snapshotPlayerStates: JSON.parse(JSON.stringify(result.preTriggerState)),
              timestamp: Date.now()
            });
          }
          animationEvents.push(...result.triggerAnimationEvents);
        }

        debugLog('TRIGGERS', `Effect routed: ${processedEffect.type}`, {
          animEvents: result?.animationEvents?.length || 0,
          triggerAnimEvents: result?.triggerAnimationEvents?.length || 0,
          cascadeTypes: result?.triggerAnimationEvents?.map(e => e.type) || []
        });

        if (processedEffect.type === 'MODIFY_STAT') {
          statModsApplied = true;
        }
      }
    }

    // Handle destroyAfterTrigger (mines self-destruct)
    if (ability.destroyAfterTrigger) {
      const destroyResult = this._destroyDrone(reactorDrone.id, reactorPlayerId, reactorLane, currentStates, placedSections, logCallback);
      currentStates = destroyResult.newStates;
      if (destroyResult.animationEvents.length > 0) {
        animationEvents.push(...destroyResult.animationEvents);
      }
    }

    return {
      triggered: true,
      newPlayerStates: currentStates,
      animationEvents,
      statModsApplied,
      goAgain
    };
  }

  /**
   * Per-(reactor, source) pair loop prevention.
   * Returns true if this pair has NOT fired yet (allowed to fire).
   *
   * @param {string} reactorId - ID of the reacting drone
   * @param {string} sourceId - ID of the source drone
   * @param {Set} pairSet - Set of "reactorId:sourceId" strings
   * @returns {boolean} True if pair is allowed to fire
   */
  checkPairGuard(reactorId, sourceId, pairSet) {
    const key = `${reactorId}:${sourceId}`;
    return !pairSet.has(key);
  }

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  /**
   * Check if a drone still exists on the board.
   */
  _isDroneAlive(droneId, playerId, lane, playerStates) {
    const drones = playerStates[playerId]?.dronesOnBoard?.[lane] || [];
    return drones.some(d => d.id === droneId);
  }

  /**
   * Collect lane triggers from a player's board for a specific lane.
   * Drones are iterated in array order (left-to-right = deployment order).
   */
  _collectLaneTriggers(triggerType, eventLane, triggeringDrone, triggeringPlayerId, scanPlayerId, playerState, card, matches, tier) {
    const drones = playerState?.dronesOnBoard?.[eventLane] || [];

    for (const drone of drones) {
      // Skip the triggering drone (self-triggers handled in Tier 1)
      if (drone.id === triggeringDrone?.id) continue;

      const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
      if (!baseDrone?.abilities) continue;

      for (const ability of baseDrone.abilities) {
        if (ability.type !== 'TRIGGERED' || ability.trigger !== triggerType) continue;

        // Validate triggerOwner
        if (!this._validateTriggerOwner(ability.triggerOwner, scanPlayerId, triggeringPlayerId, drone, playerState)) {
          continue;
        }

        // Validate triggerFilter (card filters, drone stat filters)
        if (!this._validateTriggerFilter(ability.triggerFilter, card, triggeringDrone)) {
          continue;
        }

        matches.push({ drone, ability, playerId: scanPlayerId, lane: eventLane, tier });
      }
    }
  }

  /**
   * Collect controller triggers from a player's drones across all lanes.
   * @param {string|null} eventLane - Lane where the triggering event occurred (for SAME_LANE filtering)
   */
  _collectControllerTriggers(triggerType, triggeringPlayerId, scanPlayerId, playerState, card, matches, tier, eventLane = null) {
    for (const lane of ['lane1', 'lane2', 'lane3']) {
      const drones = playerState?.dronesOnBoard?.[lane] || [];

      for (const drone of drones) {
        const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
        if (!baseDrone?.abilities) continue;

        for (const ability of baseDrone.abilities) {
          if (ability.type !== 'TRIGGERED' || ability.trigger !== triggerType) continue;

          // Validate triggerOwner for controller triggers
          if (!this._validateControllerOwner(ability.triggerOwner, scanPlayerId, triggeringPlayerId)) {
            continue;
          }

          // Validate triggerScope
          if (ability.triggerScope === 'SAME_LANE') {
            if (!eventLane || lane !== eventLane) continue;
          }

          // Validate triggerFilter
          if (!this._validateTriggerFilter(ability.triggerFilter, card, null)) {
            continue;
          }

          matches.push({ drone, ability, playerId: scanPlayerId, lane, tier });
        }
      }
    }
  }

  /**
   * Validate triggerOwner for lane triggers.
   * LANE_OWNER: triggering drone belongs to the same player who owns this board slot
   * LANE_ENEMY: triggering drone belongs to the opponent
   * ANY: always matches
   */
  _validateTriggerOwner(triggerOwner, reactorPlayerId, triggeringPlayerId, reactorDrone, playerState) {
    if (!triggerOwner || triggerOwner === TRIGGER_OWNERS.ANY) return true;

    if (triggerOwner === TRIGGER_OWNERS.LANE_OWNER) {
      // "Board-owner's drones trigger it" — the triggering drone belongs to the same player as the reactor
      return triggeringPlayerId === reactorPlayerId;
    }

    if (triggerOwner === TRIGGER_OWNERS.LANE_ENEMY) {
      return triggeringPlayerId !== reactorPlayerId;
    }

    return true;
  }

  /**
   * Validate triggerOwner for controller triggers.
   * CONTROLLER: the drone's owner is the one performing the action
   * OPPONENT: the drone's owner's opponent is performing the action
   * ANY: always matches
   */
  _validateControllerOwner(triggerOwner, reactorOwnerPlayerId, triggeringPlayerId) {
    if (!triggerOwner || triggerOwner === TRIGGER_OWNERS.ANY) return true;

    if (triggerOwner === TRIGGER_OWNERS.CONTROLLER) {
      return reactorOwnerPlayerId === triggeringPlayerId;
    }

    if (triggerOwner === TRIGGER_OWNERS.OPPONENT) {
      return reactorOwnerPlayerId !== triggeringPlayerId;
    }

    return true;
  }

  /**
   * Validate trigger filter (card type, card subType, drone stat filter).
   * Returns true if filter passes or no filter is defined.
   */
  _validateTriggerFilter(triggerFilter, card, triggeringDrone) {
    if (!triggerFilter) return true;

    if (triggerFilter.cardType && card?.type !== triggerFilter.cardType) {
      return false;
    }

    if (triggerFilter.cardSubType && card?.subType !== triggerFilter.cardSubType) {
      return false;
    }

    if (triggerFilter.droneStatFilter && triggeringDrone) {
      const { stat, comparator, value } = triggerFilter.droneStatFilter;
      const droneStatValue = triggeringDrone[stat] || 0;

      switch (comparator) {
        case '>=': if (!(droneStatValue >= value)) return false; break;
        case '<=': if (!(droneStatValue <= value)) return false; break;
        case '==': if (!(droneStatValue === value)) return false; break;
        default: return false;
      }
    }

    return true;
  }

  /**
   * Preprocess effect before routing. Handles scope: 'SELF' → target reactor drone.
   */
  _preprocessEffect(effect, reactorDrone, reactorLane) {
    if (effect.scope === 'SELF' && effect.type === 'DESTROY') {
      // DESTROY with scope SELF → target the reactor drone
      return {
        ...effect,
        _targetDroneId: reactorDrone.id,
        _targetLane: reactorLane
      };
    }
    return effect;
  }

  /**
   * Build target object for EffectRouter context.
   */
  _buildTarget(effect, reactorDrone, reactorPlayerId, reactorLane, playerStates) {
    if (effect._targetDroneId) {
      return {
        type: 'DRONE',
        id: effect._targetDroneId,
        droneId: effect._targetDroneId,
        name: reactorDrone.name,
        lane: effect._targetLane,
        owner: reactorPlayerId,
        playerId: reactorPlayerId
      };
    }

    // Default: target the reactor drone itself
    return {
      type: 'DRONE',
      id: reactorDrone.id,
      droneId: reactorDrone.id,
      name: reactorDrone.name,
      lane: reactorLane,
      owner: reactorPlayerId,
      playerId: reactorPlayerId
    };
  }

  /**
   * Apply flat mine damage to the triggering drone (scope: 'TRIGGERING_DRONE', type: 'DAMAGE').
   * Shields absorb first, then hull. Destroys drone if hull reaches 0.
   * Other TRIGGERING_DRONE effect types (EXHAUST_DRONE, MODIFY_STAT) route through EffectRouter.
   *
   * Mutates currentStates directly (already a working copy from callers).
   *
   * @returns {Object} { newPlayerStates, animationEvents }
   */
  _applyMineDamage(effect, triggeringDrone, triggeringPlayerId, lane, reactorDrone, currentStates, placedSections, logCallback) {
    const ownerState = currentStates[triggeringPlayerId];
    const droneInLane = ownerState.dronesOnBoard[lane]?.find(d => d.id === triggeringDrone.id);

    if (!droneInLane) {
      debugLog('TRIGGERS', 'Triggering drone not found for mine damage', { droneId: triggeringDrone.id, lane });
      return { newPlayerStates: currentStates, animationEvents: [] };
    }

    const animationEvents = [];
    const damage = effect.value || 0;
    const shieldDmg = Math.min(damage, droneInLane.currentShields || 0);
    const remainingDmg = damage - shieldDmg;
    const hullDmg = Math.min(remainingDmg, droneInLane.hull);

    droneInLane.currentShields -= shieldDmg;
    droneInLane.hull -= hullDmg;

    if (logCallback) {
      logCallback({
        player: ownerState.name,
        actionType: 'MINE_DAMAGE',
        source: reactorDrone.name,
        target: droneInLane.name,
        outcome: `${reactorDrone.name} dealt ${shieldDmg} shield and ${hullDmg} hull damage to ${droneInLane.name}.`
      }, 'triggerProcessor_directEffect');
    }

    if (droneInLane.hull <= 0) {
      ownerState.dronesOnBoard[lane] = ownerState.dronesOnBoard[lane].filter(d => d.id !== droneInLane.id);
      Object.assign(ownerState, onDroneDestroyed(ownerState, droneInLane));

      const opponentId = triggeringPlayerId === 'player1' ? 'player2' : 'player1';
      ownerState.dronesOnBoard = updateAuras(ownerState, currentStates[opponentId], placedSections);

      animationEvents.push({
        type: 'DRONE_DESTROYED',
        targetId: droneInLane.id,
        targetPlayer: triggeringPlayerId,
        targetLane: lane,
        targetType: 'drone',
        timestamp: Date.now()
      });

      if (logCallback) {
        logCallback({
          player: ownerState.name,
          actionType: 'DRONE_DESTROYED',
          source: reactorDrone.name,
          target: droneInLane.name,
          outcome: `${droneInLane.name} was destroyed by ${reactorDrone.name}.`
        }, 'triggerProcessor_directEffect');
      }
    }

    return { newPlayerStates: currentStates, animationEvents };
  }

  /**
   * Remove a drone from the board (used for destroyAfterTrigger).
   * Calls onDroneDestroyed for availability tracking, updateAuras for recalculation,
   * and generates DRONE_DESTROYED animation event.
   *
   * Mutates playerStates directly (already a working copy from callers).
   *
   * @returns {Object} { newStates, animationEvents }
   */
  _destroyDrone(droneId, playerId, lane, playerStates, placedSections, logCallback) {
    const drones = playerStates[playerId]?.dronesOnBoard?.[lane];
    const animationEvents = [];

    if (drones) {
      const index = drones.findIndex(d => d.id === droneId);
      if (index !== -1) {
        const drone = drones[index];
        debugLog('TRIGGERS', `Destroying drone after trigger: ${drone.name} (${droneId})`);
        drones.splice(index, 1);

        // Update availability/rebuild tracking
        Object.assign(playerStates[playerId], onDroneDestroyed(playerStates[playerId], drone));

        // Update auras after removal
        const opponentId = playerId === 'player1' ? 'player2' : 'player1';
        playerStates[playerId].dronesOnBoard = updateAuras(playerStates[playerId], playerStates[opponentId], placedSections);

        // Generate destruction animation
        animationEvents.push({
          type: 'DRONE_DESTROYED',
          targetId: droneId,
          targetPlayer: playerId,
          targetLane: lane,
          targetType: 'drone',
          timestamp: Date.now()
        });

        if (logCallback) {
          logCallback({
            player: playerStates[playerId].name,
            actionType: 'MINE_DESTROYED',
            source: drone.name,
            target: drone.name,
            outcome: `${drone.name} self-destructed after triggering.`
          }, 'triggerProcessor_destroy');
        }
      }
    }

    return { newStates: playerStates, animationEvents };
  }
}

export default TriggerProcessor;
