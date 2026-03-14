// ========================================
// MARKING EFFECT PROCESSOR
// ========================================
// Handles MARK_DRONE effects — marks a pre-resolved target drone.
// Target resolution (random selection, lane filtering) is handled upstream
// by TriggerProcessor._buildTarget via targetSelection.

import BaseEffectProcessor from './BaseEffectProcessor.js';
import { debugLog } from '../../utils/debugLogger.js';
import { SeededRandom } from '../../utils/seededRandom.js';
import { selectTargets, hashString } from '../targeting/TargetSelector.js';

/**
 * MarkingEffectProcessor
 * Processes MARK_DRONE effects for the marking system.
 *
 * Marks a specific drone identified by context.target.id.
 * Random target selection for Scanner's ON_DEPLOY is handled by
 * TriggerProcessor._buildTarget → _resolveDronePool → selectTargets.
 *
 * Key features:
 * - Updates drone isMarked property
 * - Silently fails if target not found
 * - No animations (state-only effect)
 */
class MarkingEffectProcessor extends BaseEffectProcessor {
  /**
   * Process marking effect
   *
   * @param {Object} effect - Effect configuration (type: 'MARK_DRONE')
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with newPlayerStates
   */
  process(effect, context) {
    this.logProcessStart(effect, context);

    if (effect.type === 'MARK_DRONE') {
      if (effect.scope === 'ALL') {
        return this.processMarkAllRandom(effect, context);
      }
      return this.processMarkDrone(effect, context);
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
   * Mark random unmarked enemy drones across all lanes
   * Used by Target Acquisition card (scope: ALL, targeting.type: NONE)
   *
   * @param {Object} effect - Effect with targetSelection.count and targetSelection.method
   * @param {Object} context - Effect execution context
   * @returns {Object} Result with updated states
   */
  processMarkAllRandom(effect, context) {
    const { actingPlayerId, playerStates, gameSeed, roundNumber, card } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);
    const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    // Gather all unmarked enemy drones across all lanes
    const candidates = [];
    for (const lane of ['lane1', 'lane2', 'lane3']) {
      for (const drone of newPlayerStates[opponentId].dronesOnBoard[lane]) {
        if (!drone.isMarked) {
          candidates.push(drone);
        }
      }
    }

    if (candidates.length === 0) {
      debugLog('MARKING', '⚠️ No unmarked enemy drones to mark');
      return this.createResult(newPlayerStates);
    }

    // Use seeded RNG for deterministic random selection
    const discriminator = card?.instanceId || candidates.length;
    const rng = SeededRandom.forTargetSelection(
      { gameSeed: gameSeed ?? 12345, roundNumber },
      typeof discriminator === 'string' ? hashString(discriminator) : discriminator
    );

    const selected = selectTargets(candidates, effect.targetSelection, rng);

    // Mark the selected drones
    for (const drone of selected) {
      drone.isMarked = true;
      debugLog('MARKING', `✅ Marked drone ${drone.id}`, { droneId: drone.id, opponentId });
    }

    debugLog('MARKING', `🎯 Target Acquisition marked ${selected.length} drones`, {
      candidates: candidates.length,
      marked: selected.length
    });

    return this.createResult(newPlayerStates);
  }
}

export default MarkingEffectProcessor;
