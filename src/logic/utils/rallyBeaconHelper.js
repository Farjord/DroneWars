// ========================================
// RALLY BEACON GO-AGAIN HELPER
// ========================================
// Checks if a Rally Beacon in the destination lane grants go-again
// after a friendly drone moves into that lane.

/**
 * Check if a Rally Beacon in the destination lane grants go-again.
 * Only triggers for the token owner's own drones moving INTO the lane.
 * Does not trigger if the effect already has goAgain.
 *
 * @param {Object} playerState - The moving drone's owner state
 * @param {string} destinationLane - Lane the drone moved into
 * @param {boolean} existingGoAgain - Whether the effect already grants go-again
 * @param {Function} logCallback - Optional log callback
 * @returns {boolean} True if Rally Beacon grants go-again
 */
export const checkRallyBeaconGoAgain = (playerState, destinationLane, existingGoAgain, logCallback) => {
  if (existingGoAgain) return false;

  const dronesInLane = playerState.dronesOnBoard[destinationLane] || [];
  const rallyBeacon = dronesInLane.find(d => d.isToken && d.name === 'Rally Beacon');

  if (rallyBeacon) {
    if (logCallback) {
      logCallback({
        player: playerState.name,
        actionType: 'RALLY_BEACON',
        source: 'Rally Beacon',
        outcome: `Rally Beacon in ${destinationLane} grants go again!`
      });
    }
    return true;
  }

  return false;
};
