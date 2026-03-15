// ========================================
// GHOST SIDE HELPERS
// ========================================
// Pure functions for determining which lane side a ghost preview should render on.
// Ownership-based — uses drone identity, not mouse position.

/**
 * Determines whether a ghost preview belongs on the player (local) side.
 * @param {Object|null} draggedCard - The card being deployed (truthy = player deployment)
 * @param {Object|null} drone - The drone being moved
 * @param {Object} localPlayerState - Local player state with dronesOnBoard
 * @returns {boolean} true if ghost should render on the player side
 */
export function computeGhostIsPlayer(draggedCard, drone, localPlayerState) {
  if (draggedCard) return true;
  if (!drone) return false;
  return Object.values(localPlayerState.dronesOnBoard)
    .some(drones => drones.some(d => d.id === drone.id));
}

/**
 * Determines whether a chain ghost selection should render on the given lane side.
 * @param {Object|null} sel - Chain selection { target, destination, skipped }
 * @param {string} lane - Lane ID being rendered
 * @param {boolean} isPlayer - Whether this is the player side of the lane
 * @param {string} localPlayerId - Local player's ID
 * @returns {boolean} true if this chain ghost should render on this side
 */
export function shouldRenderChainGhost(sel, lane, isPlayer, localPlayerId) {
  if (!sel || sel.skipped || !sel.target?.id || sel.destination !== lane) return false;
  const ghostBelongsToLocal = sel.target.owner === localPlayerId;
  return ghostBelongsToLocal === isPlayer;
}
