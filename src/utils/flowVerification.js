// ========================================
// FLOW VERIFICATION
// ========================================
// Lightweight checkpoint logging for verifying game flow correctness.
// Enable FLOW_VERIFICATION in debugLogger.js to produce a numbered
// sequential trace proving the system follows GAME_FLOW_SPECIFICATION.md.

import { debugLog } from './debugLogger.js';

let seq = 0;

/**
 * Emit a numbered flow checkpoint.
 * @param {string} name - Checkpoint name (e.g. 'SERVER_ACTION_RECEIVED')
 * @param {Object} data - Key-value pairs summarising the checkpoint
 */
export function flowCheckpoint(name, data = {}) {
  seq += 1;
  const pairs = Object.entries(data).map(([k, v]) => `${k}=${v}`).join(' | ');
  const line = `[FLOW seq=${seq} t=${Date.now()}] ${name}${pairs ? ' | ' + pairs : ''}`;
  debugLog('FLOW_VERIFICATION', line);
}

/**
 * Reset the sequence counter. Call at the start of each processAction cycle.
 */
export function resetFlowSeq() {
  seq = 0;
}
