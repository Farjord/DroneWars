/**
 * Insert a drone at a specific position in a lane array, or append if no index given.
 * For same-lane reorder, adjusts index to account for the drone's removal.
 *
 * @param {Array} laneArray - The lane's drone array to insert into
 * @param {Object} drone - The drone object to insert
 * @param {number|null|undefined} insertionIndex - Target position, or null/undefined to append
 * @param {number|null} originalIndex - Drone's original index in the same lane (for reorder adjustment)
 */
export function insertDroneInLane(laneArray, drone, insertionIndex, originalIndex = null) {
  let adjustedIndex = insertionIndex;

  // Same-lane reorder: if drone was removed from before the insertion point, adjust
  if (originalIndex != null && insertionIndex != null && insertionIndex > originalIndex) {
    adjustedIndex = insertionIndex - 1;
  }

  if (adjustedIndex != null && adjustedIndex <= laneArray.length) {
    laneArray.splice(adjustedIndex, 0, drone);
  } else {
    laneArray.push(drone);
  }
}
