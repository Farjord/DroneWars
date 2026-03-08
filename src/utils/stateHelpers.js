// Shared state query helpers — pure functions, no side effects.

/**
 * Count total drones across all lanes for a player.
 * @param {Object} playerState - Player state with dronesOnBoard
 * @returns {number} Total drone count
 */
export function countDrones(playerState) {
  if (!playerState?.dronesOnBoard) return 0;
  return Object.values(playerState.dronesOnBoard).reduce((sum, lane) => sum + (lane?.length || 0), 0);
}
