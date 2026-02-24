/**
 * State Comparison Utilities
 * Shared functions for comparing game state arrays and drone collections
 * Used by GuestMessageQueueService for optimistic state validation
 */

import { debugLog } from './debugLogger.js';

/**
 * Compare two arrays for shallow equality
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @param {string} context - Context label for debug logging
 * @returns {boolean} True if arrays match
 */
export function arraysMatch(arr1, arr2, context = 'arrays') {
  if (!arr1 || !arr2) {
    const match = arr1 === arr2;
    if (!match) {
      debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${context} - null/undefined mismatch:`, {
        arr1: arr1,
        arr2: arr2
      });
    }
    return match;
  }

  if (arr1.length !== arr2.length) {
    debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${context} - length mismatch:`, {
      current: arr1.length,
      host: arr2.length
    });
    return false;
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${context}[${i}] - element mismatch:`, {
        current: arr1[i],
        host: arr2[i]
      });
      return false;
    }
  }

  return true;
}

/**
 * Compare two drone arrays for equality on gameplay-critical fields
 * @param {Array} drones1 - First drone array
 * @param {Array} drones2 - Second drone array
 * @param {string} lane - Lane identifier for logging (e.g., 'player1.lane1')
 * @returns {boolean} True if drone arrays match
 */
export function dronesMatch(drones1, drones2, lane = 'lane') {
  if (drones1.length !== drones2.length) {
    debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${lane} - drone count mismatch:`, {
      current: drones1.length,
      host: drones2.length
    });
    return false;
  }

  for (let i = 0; i < drones1.length; i++) {
    const d1 = drones1[i];
    const d2 = drones2[i];

    if (d1.id !== d2.id) {
      debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${lane}[${i}].id - mismatch:`, {
        current: d1.id,
        host: d2.id
      });
      return false;
    }

    if (d1.health !== d2.health) {
      debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${lane}[${i}].health - mismatch:`, {
        droneId: d1.id,
        current: d1.health,
        host: d2.health
      });
      return false;
    }

    if (d1.name !== d2.name) {
      debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${lane}[${i}].name - mismatch:`, {
        droneId: d1.id,
        current: d1.name,
        host: d2.name
      });
      return false;
    }

    if (d1.isTeleporting !== d2.isTeleporting) {
      debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${lane}[${i}].isTeleporting - mismatch:`, {
        droneId: d1.id,
        current: d1.isTeleporting,
        host: d2.isTeleporting
      });
      return false;
    }

    // Note: Not comparing all properties to avoid false negatives
    // Focus on gameplay-critical fields that affect rendering
  }

  return true;
}
