/**
 * Shared positioning and perspective utilities for animation handlers.
 * Extracts repeated patterns from useNotificationAnimations, useCardAnimations,
 * and useProjectileAnimations into testable, single-source-of-truth functions.
 */

/**
 * Check if a player ID matches the local player.
 * Mirrors GameStateManager.isLocalPlayer() but callable without a `this` binding,
 * making it convenient for use in plain handler functions (non-React context).
 * @param {object} gameStateManager
 * @param {string} playerId
 * @returns {boolean}
 */
export function isLocalPlayer(gameStateManager, playerId) {
  return playerId === gameStateManager.getLocalPlayerId();
}

/**
 * Parse a lane name (e.g. 'lane1') to a zero-based index.
 * Returns -1 for null/undefined input.
 * @param {string|null|undefined} laneName
 * @returns {number}
 */
export function parseLaneIndex(laneName) {
  if (laneName == null) return -1;
  const index = parseInt(laneName.replace('lane', '')) - 1;
  return Number.isNaN(index) ? -1 : index;
}

/**
 * Get the top-center position of a DOM element in viewport coordinates.
 * @param {Element|null} element
 * @returns {{ x: number, y: number }|null}
 */
export function getTopCenterPosition(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top };
}
