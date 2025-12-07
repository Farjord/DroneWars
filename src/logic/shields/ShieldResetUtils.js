// ========================================
// SHIELD RESET UTILITIES
// ========================================
// Encapsulates reset logic for shield allocation and reallocation
// Extracted from App.jsx for testability

import { debugLog } from '../../utils/debugLogger.js';

/**
 * Calculates the new state after reset during round start allocation.
 *
 * @param {Object} initialSnapshot - Snapshot of shields at phase start
 * @param {number} shieldsToAllocate - Total shields available to allocate
 * @returns {Object} { newPending, newRemaining }
 */
export function calculateRoundStartReset(initialSnapshot, shieldsToAllocate) {
  // FIXED: Restore to initial snapshot, not empty
  debugLog('SHIELD_CLICKS', '🔄 Reset pending shield allocations to initial snapshot');

  // Calculate used shields from initial snapshot
  const usedShields = Object.values(initialSnapshot).reduce((sum, count) => sum + count, 0);

  return {
    newPending: { ...initialSnapshot },
    newRemaining: shieldsToAllocate - usedShields
  };
}

/**
 * Calculates the new state after reset during reallocation removal phase.
 *
 * @param {number} maxShieldsToRemove - Maximum shields that can be removed
 * @returns {Object} { newPendingChanges, shieldsToRemove, shieldsToAdd }
 */
export function calculateReallocationRemovalReset(maxShieldsToRemove) {
  // This behavior is correct - clear pending changes
  return {
    newPendingChanges: {},
    shieldsToRemove: maxShieldsToRemove,
    shieldsToAdd: 0
  };
}

/**
 * Calculates the new state after reset during reallocation adding phase.
 *
 * @param {Object} postRemovalChanges - Snapshot of changes after removal phase
 * @returns {Object} { newPendingChanges, shieldsToAdd }
 */
export function calculateReallocationAddingReset(postRemovalChanges) {
  // Calculate how many shields were removed
  const removedCount = Object.values(postRemovalChanges)
    .filter(delta => delta < 0)
    .reduce((sum, delta) => sum + Math.abs(delta), 0);

  return {
    newPendingChanges: { ...postRemovalChanges },
    shieldsToAdd: removedCount
  };
}

/**
 * Calculates the display value for shields during reallocation.
 * Applies pending deltas to the game state value.
 *
 * CURRENT BUG: This function is not called - display uses game state directly
 *
 * @param {number} gameStateShields - Current shields in game state
 * @param {Object} pendingChanges - Pending shield changes (deltas)
 * @param {string} sectionName - Section to get display value for
 * @returns {number} Display value for shields
 */
export function calculateReallocationDisplayShields(gameStateShields, pendingChanges, sectionName) {
  const delta = pendingChanges[sectionName] || 0;
  return gameStateShields + delta;
}
