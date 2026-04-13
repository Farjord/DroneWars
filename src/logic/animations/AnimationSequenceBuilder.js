// ========================================
// ANIMATION SEQUENCE BUILDER
// ========================================
// Enforces the architectural contract: action animations always precede
// trigger animations, with STATE_SNAPSHOT + TRIGGER_CHAIN_PAUSE bridge.

import { debugLog } from '../../utils/debugLogger.js';
import { flowCheckpoint } from '../../utils/flowVerification.js';
import { STATE_SNAPSHOT, TRIGGER_CHAIN_PAUSE } from '../../config/animationTypes.js';

const TRIGGER_CHAIN_PAUSE_MS = 400;

/**
 * Build a properly-ordered animation sequence enforcing the architectural
 * contract: action animations always precede trigger animations, with
 * STATE_SNAPSHOT + TRIGGER_CHAIN_PAUSE bridge between them.
 *
 * Works with RAW event format (pre-mapAnimationEvents).
 *
 * @param {Array<Object>} steps - One step per effect/action
 * @param {Array} steps[].actionEvents - Primary action animations
 * @param {Array} steps[].triggerEvents - Trigger animations from TriggerProcessor
 * @param {Object} [steps[].intermediateState] - { player1, player2 } for STATE_SNAPSHOT
 * @param {Array} [steps[].postSnapshotEvents] - Events needing DOM update first (e.g., TELEPORT_IN)
 * @param {Object} [options] - Optional sequence-level options
 * @param {string} [options.triggerTimingOverride] - When set, applies this timing to all trigger
 *   events and the TRIGGER_CHAIN_PAUSE. Used by deployment with TELEPORT_IN to ensure trigger
 *   notifications play after the teleport animation rather than before it.
 * @returns {Array} Ordered raw event sequence
 */
export function buildAnimationSequence(steps, { triggerTimingOverride } = {}) {
  const sequence = [];
  for (const step of steps) {
    const { actionEvents = [], triggerEvents = [], intermediateState = null, postSnapshotEvents = [] } = step;

    sequence.push(...actionEvents);

    if (intermediateState) {
      sequence.push({ type: STATE_SNAPSHOT, snapshotPlayerStates: intermediateState });
    }
    if (postSnapshotEvents.length > 0) {
      sequence.push(...postSnapshotEvents);
    }

    if (triggerEvents.length > 0) {
      sequence.push({
        type: TRIGGER_CHAIN_PAUSE,
        duration: TRIGGER_CHAIN_PAUSE_MS,
        ...(triggerTimingOverride && { timingOverride: triggerTimingOverride }),
      });
      sequence.push(...triggerEvents.map(e =>
        triggerTimingOverride ? { ...e, timingOverride: triggerTimingOverride } : e
      ));
    }
  }

  flowCheckpoint('ANIMATION_SEQUENCE_BUILT', {
    steps: steps.length,
    events: sequence.length,
    order: sequence.map(e => e.type).join(','),
  });
  debugLog('ANIM_TRACE', '[seq-built] buildAnimationSequence', {
    stepCount: steps.length,
    totalEvents: sequence.length,
    snapshots: sequence.filter(e => e.type === STATE_SNAPSHOT).length,
    pauses: sequence.filter(e => e.type === TRIGGER_CHAIN_PAUSE).length,
    eventTypes: sequence.map(e => e.type),
  });

  return sequence;
}
