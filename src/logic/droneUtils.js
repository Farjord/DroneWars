/**
 * Extract drone name from drone ID.
 * ID format: "player2_Talon_0006" → "Talon"
 * Handles multi-word names: "player1_Assault_Hawk_0003" → "Assault_Hawk"
 * @param {string} droneId
 * @returns {string}
 */
export const extractDroneNameFromId = (droneId) => {
  if (!droneId) return '';
  const parts = droneId.split('_');
  return parts.slice(1, -1).join('_');
};

/**
 * Get friendly drones as targeting objects for card selection UI.
 * @param {Object} playerState - Player state with dronesOnBoard
 * @param {string} playerId - Player ID for ownership
 * @param {{ excludeExhausted?: boolean }} options
 * @returns {Array<{ id: string, type: string, owner: string }>}
 */
export const getFriendlyDroneTargets = (playerState, playerId, { excludeExhausted = false } = {}) => {
  let drones = Object.values(playerState.dronesOnBoard).flat();
  if (excludeExhausted) {
    drones = drones.filter(drone => !drone.isExhausted);
  }
  return drones.map(drone => ({ id: drone.id, type: 'drone', owner: playerId }));
};
