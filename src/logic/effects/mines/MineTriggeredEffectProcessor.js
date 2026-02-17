// ========================================
// MINE TRIGGERED EFFECT PROCESSOR
// ========================================
// Central processor for mine trigger resolution.
// Scans lanes for mine tokens with matching trigger types,
// executes their effects, and handles self-destruction.
//
// This is a standalone utility class — NOT routed through EffectRouter.
// Called directly from trigger hooks in Movement, Deployment, and Attack processors.

import { onDroneDestroyed } from '../../utils/droneStateUtils.js';
import { updateAuras } from '../../utils/auraManager.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * Process a mine trigger event.
 *
 * @param {string} triggerType - The trigger type (ON_LANE_MOVEMENT_IN, ON_LANE_DEPLOYMENT, ON_LANE_ATTACK)
 * @param {Object} triggerContext - Context about what triggered the mine
 * @param {string} triggerContext.lane - The lane where the trigger occurred
 * @param {Object} triggerContext.triggeringDrone - The drone that triggered the mine
 * @param {string} triggerContext.triggeringPlayerId - The player who owns the triggering drone
 * @param {Object} effectContext - State context for applying effects
 * @param {Object} effectContext.playerStates - Current player states (will be mutated)
 * @param {Object} effectContext.placedSections - Placed ship sections
 * @param {Function} effectContext.logCallback - Logging callback
 * @returns {Object} { triggered: boolean, animationEvents: [], statModsApplied: boolean }
 */
export const processTrigger = (triggerType, triggerContext, effectContext) => {
  const { lane, triggeringDrone, triggeringPlayerId } = triggerContext;
  const { playerStates, placedSections, logCallback } = effectContext;

  const result = {
    triggered: false,
    animationEvents: [],
    statModsApplied: false
  };

  // The mine lives on the triggering player's board (it was placed on the opponent's board,
  // and now that opponent's drones are performing actions — those drones are the "triggering" ones).
  // So scan the triggering player's state for mines.
  const mineOwnerState = playerStates[triggeringPlayerId];
  const dronesInLane = mineOwnerState.dronesOnBoard[lane] || [];

  // Find mines with matching trigger type
  for (const drone of dronesInLane) {
    if (!drone.abilities) continue;

    for (const ability of drone.abilities) {
      if (ability.type !== 'TRIGGERED' || ability.trigger !== triggerType) continue;

      // Validate triggerOwner
      // LANE_OWNER: triggers when the lane owner's drones perform the action
      // The mine is on triggeringPlayerId's board, and triggeringPlayerId's drones triggered it
      if (ability.triggerOwner === 'LANE_OWNER') {
        // This is correct — the mine is on the triggering player's board,
        // and their drones (which are actually the opponent of whoever placed the mine)
        // are performing the action.
      } else if (ability.triggerOwner === 'LANE_ENEMY') {
        // Future use: triggers when the opposing player's drones act
        // For now, skip
        continue;
      }

      debugLog('MINE', `💥 Mine triggered: ${drone.name} (${ability.name})`, {
        triggerType,
        lane,
        triggeringDrone: triggeringDrone.name,
        mineEffect: ability.effect?.type
      });

      result.triggered = true;

      // Execute the mine's effect on the triggering drone
      applyMineEffect(ability.effect, triggeringDrone, triggeringPlayerId, lane, playerStates, logCallback);

      // Check if the triggering drone was destroyed by the mine effect
      const mineOwnerState2 = playerStates[triggeringPlayerId];
      const droneStillAlive = mineOwnerState2.dronesOnBoard[lane]?.some(d => d.id === triggeringDrone.id);
      if (!droneStillAlive) {
        result.animationEvents.push({
          type: 'DRONE_DESTROYED',
          targetId: triggeringDrone.id,
          targetPlayer: triggeringPlayerId,
          targetLane: lane,
          targetType: 'drone',
          timestamp: Date.now()
        });
      }

      // Check if MODIFY_STAT was applied (for attack recalculation in AttackProcessor)
      if (ability.effect.type === 'MODIFY_STAT') {
        result.statModsApplied = true;
      }

      // Log the trigger
      if (logCallback) {
        logCallback({
          player: mineOwnerState.name,
          actionType: 'MINE_TRIGGER',
          source: drone.name,
          target: triggeringDrone.name,
          outcome: `${drone.name} triggered by ${triggeringDrone.name} in ${lane}! ${ability.name} activated.`
        }, 'mineTriggeredEffect');
      }

      // Self-destruct if configured
      if (ability.destroyAfterTrigger) {
        const destructionResult = destroyMine(drone, triggeringPlayerId, lane, playerStates, placedSections, logCallback);
        result.animationEvents.push(...destructionResult.animationEvents);
      }

      // Only one mine triggers per event (mines self-destruct, and maxPerLane: 1)
      return result;
    }
  }

  return result;
};

/**
 * Apply a mine's effect to the triggering drone.
 *
 * @param {Object} effect - The mine's effect definition
 * @param {Object} triggeringDrone - The drone that triggered the mine
 * @param {string} triggeringPlayerId - Owner of the triggering drone
 * @param {string} lane - Lane where the trigger occurred
 * @param {Object} playerStates - Current player states (mutated)
 * @param {Function} logCallback - Logging callback
 */
const applyMineEffect = (effect, triggeringDrone, triggeringPlayerId, lane, playerStates, logCallback) => {
  const ownerState = playerStates[triggeringPlayerId];
  const droneInLane = ownerState.dronesOnBoard[lane]?.find(d => d.id === triggeringDrone.id);

  if (!droneInLane) {
    debugLog('MINE', '⚠️ Triggering drone not found in lane for mine effect', {
      droneId: triggeringDrone.id,
      lane
    });
    return;
  }

  switch (effect.type) {
    case 'DAMAGE': {
      const damage = effect.value || 0;
      // Apply damage: shields first, then hull
      const shieldDmg = Math.min(damage, droneInLane.currentShields || 0);
      const remainingDmg = damage - shieldDmg;
      const hullDmg = Math.min(remainingDmg, droneInLane.hull);

      droneInLane.currentShields -= shieldDmg;
      droneInLane.hull -= hullDmg;

      if (logCallback) {
        logCallback({
          player: ownerState.name,
          actionType: 'MINE_DAMAGE',
          source: 'Mine',
          target: droneInLane.name,
          outcome: `Mine dealt ${shieldDmg} shield and ${hullDmg} hull damage to ${droneInLane.name}.`
        }, 'mineEffect');
      }

      // Check if drone was destroyed
      if (droneInLane.hull <= 0) {
        const opponentId = triggeringPlayerId === 'player1' ? 'player2' : 'player1';
        ownerState.dronesOnBoard[lane] = ownerState.dronesOnBoard[lane].filter(d => d.id !== droneInLane.id);
        Object.assign(ownerState, onDroneDestroyed(ownerState, droneInLane));

        if (logCallback) {
          logCallback({
            player: ownerState.name,
            actionType: 'DRONE_DESTROYED',
            source: 'Mine',
            target: droneInLane.name,
            outcome: `${droneInLane.name} was destroyed by mine damage.`
          }, 'mineEffect');
        }
      }
      break;
    }

    case 'EXHAUST_DRONE': {
      droneInLane.isExhausted = true;

      if (logCallback) {
        logCallback({
          player: ownerState.name,
          actionType: 'MINE_EXHAUST',
          source: 'Mine',
          target: droneInLane.name,
          outcome: `${droneInLane.name} was exhausted by mine.`
        }, 'mineEffect');
      }
      break;
    }

    case 'MODIFY_STAT': {
      const { mod } = effect;
      if (!droneInLane.statMods) {
        droneInLane.statMods = [];
      }
      droneInLane.statMods.push({ ...mod });

      if (logCallback) {
        logCallback({
          player: ownerState.name,
          actionType: 'MINE_STAT_MOD',
          source: 'Mine',
          target: droneInLane.name,
          outcome: `${droneInLane.name} received ${mod.value > 0 ? '+' : ''}${mod.value} ${mod.stat} from mine.`
        }, 'mineEffect');
      }
      break;
    }

    default:
      debugLog('MINE', `⚠️ Unknown mine effect type: ${effect.type}`);
      break;
  }
};

/**
 * Destroy a mine token (self-destruct after triggering).
 *
 * @param {Object} mine - The mine drone to destroy
 * @param {string} mineOwnerPlayerId - Player whose board the mine is on
 * @param {string} lane - Lane the mine is in
 * @param {Object} playerStates - Current player states (mutated)
 * @param {Object} placedSections - Placed ship sections
 * @param {Function} logCallback - Logging callback
 * @returns {Object} { animationEvents: [] }
 */
const destroyMine = (mine, mineOwnerPlayerId, lane, playerStates, placedSections, logCallback) => {
  const animationEvents = [];
  const ownerState = playerStates[mineOwnerPlayerId];
  const opponentId = mineOwnerPlayerId === 'player1' ? 'player2' : 'player1';

  // Remove the mine from the lane
  ownerState.dronesOnBoard[lane] = ownerState.dronesOnBoard[lane].filter(d => d.id !== mine.id);
  Object.assign(ownerState, onDroneDestroyed(ownerState, mine));

  // Update auras after mine removal
  ownerState.dronesOnBoard = updateAuras(
    ownerState,
    playerStates[opponentId],
    placedSections
  );

  // Generate destruction animation
  animationEvents.push({
    type: 'DRONE_DESTROYED',
    targetId: mine.id,
    targetPlayer: mineOwnerPlayerId,
    targetLane: lane,
    targetType: 'drone',
    timestamp: Date.now()
  });

  if (logCallback) {
    logCallback({
      player: ownerState.name,
      actionType: 'MINE_DESTROYED',
      source: mine.name,
      target: mine.name,
      outcome: `${mine.name} self-destructed after triggering.`
    }, 'mineEffect');
  }

  return { animationEvents };
};
