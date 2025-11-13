// ========================================
// MARKING EFFECT PROCESSOR
// ========================================
// Handles MARK_DRONE and MARK_RANDOM_ENEMY card effects
// Extracted from gameLogic.js Phase 9.4A

import BaseEffectProcessor from '../BaseEffectProcessor.js';
import { debugLog } from '../../../utils/debugLogger.js';

/**
 * MarkingEffectProcessor
 * Processes MARK_DRONE and MARK_RANDOM_ENEMY effects for marking system
 *
 * MARK_DRONE: Marks a specific targeted enemy drone (ship ability)
 * MARK_RANDOM_ENEMY: Marks a random unmarked enemy in specified lane (Scanner ON_DEPLOY)
 *
 * Key features:
 * - Filters valid targets (unmarked drones only for random marking)
 * - Updates drone isMarked property
 * - Silently fails if no valid targets (Scanner deployment)
 * - No animations (state-only effect)
 */
class MarkingEffectProcessor extends BaseEffectProcessor {
  /**
   * Process marking effect - routes to specific marking type
   *
   * @param {Object} effect - Effect configuration (type: 'MARK_DRONE' | 'MARK_RANDOM_ENEMY')
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with newPlayerStates
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    if (effect.type === 'MARK_DRONE') {
      return this.processMarkDrone(effect, context);
    } else if (effect.type === 'MARK_RANDOM_ENEMY') {
      return this.processMarkRandomEnemy(effect, context);
    }

    debugLog('MARKING', `⚠️ Unknown marking effect type: ${effect.type}`);
    return this.createResult(context.playerStates);
  }

  /**
   * Mark a specific targeted drone
   * Used by ship abilities that target specific enemy drones
   *
   * @param {Object} effect - Effect configuration
   * @param {Object} context - Effect execution context
   * @param {Object} context.target - Target drone with id property
   * @returns {Object} Result with updated states
   */
  processMarkDrone(effect, context) {
    const { actingPlayerId, playerStates, target } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);

    // Determine opponent (target will be an enemy drone)
    const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    // Find the drone in opponent's lanes
    let droneFound = false;
    for (const lane in newPlayerStates[opponentId].dronesOnBoard) {
      const droneIndex = newPlayerStates[opponentId].dronesOnBoard[lane].findIndex(
        d => d.id === target.id
      );
      if (droneIndex !== -1) {
        // Mark the drone
        newPlayerStates[opponentId].dronesOnBoard[lane][droneIndex].isMarked = true;
        droneFound = true;

        debugLog('MARKING', `✅ Marked drone ${target.id} in ${lane}`, {
          droneId: target.id,
          lane,
          opponentId
        });
        break;
      }
    }

    if (!droneFound) {
      debugLog('MARKING', `⚠️ Target drone not found: ${target.id}`, {
        targetId: target.id,
        opponentId
      });
    }

    return this.createResult(newPlayerStates);
  }

  /**
   * Mark a random unmarked enemy drone in specified lane
   * Used by Scanner drone's ON_DEPLOY trigger
   *
   * @param {Object} effect - Effect configuration
   * @param {string} effect.lane - Lane to search for targets
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with updated states
   */
  processMarkRandomEnemy(effect, context) {
    const { actingPlayerId, playerStates } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);

    // Lane comes from effect configuration or context
    const lane = effect.lane || context.lane;

    if (!lane) {
      debugLog('MARKING', `⚠️ No lane specified for MARK_RANDOM_ENEMY`);
      return this.createResult(playerStates);
    }

    // Determine opponent
    const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    // Get all enemy drones in the specified lane
    const enemyDronesInLane = newPlayerStates[opponentId].dronesOnBoard[lane] || [];

    // Filter to only unmarked drones
    const validTargets = enemyDronesInLane.filter(drone => !drone.isMarked);

    // If there are valid targets, randomly select one and mark it
    if (validTargets.length > 0) {
      const randomIndex = Math.floor(Math.random() * validTargets.length);
      const targetDrone = validTargets[randomIndex];

      // Find the drone in the lane array and mark it
      const droneIndex = newPlayerStates[opponentId].dronesOnBoard[lane].findIndex(
        d => d.id === targetDrone.id
      );
      if (droneIndex !== -1) {
        newPlayerStates[opponentId].dronesOnBoard[lane][droneIndex].isMarked = true;

        debugLog('MARKING', `✅ Randomly marked enemy drone in ${lane}`, {
          droneId: targetDrone.id,
          droneName: targetDrone.name,
          lane,
          validTargetsCount: validTargets.length
        });
      }
    } else {
      // Silently fail if no valid targets (per Scanner drone requirements)
      debugLog('MARKING', `ℹ️ No valid unmarked targets in ${lane}`, {
        lane,
        totalEnemies: enemyDronesInLane.length
      });
    }

    return this.createResult(newPlayerStates);
  }
}

export default MarkingEffectProcessor;
