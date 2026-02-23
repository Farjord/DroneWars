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
