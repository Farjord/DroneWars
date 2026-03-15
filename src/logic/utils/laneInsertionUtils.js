/**
 * Insert a drone at a specific position in a lane array, or append if no index given.
 * Insertion indices are expected in filtered-array coordinates (dragged drone already excluded).
 *
 * @param {Array} laneArray - The lane's drone array to insert into
 * @param {Object} drone - The drone object to insert
 * @param {number|null|undefined} insertionIndex - Target position, or null/undefined to append
 */
export function insertDroneInLane(laneArray, drone, insertionIndex) {
  if (insertionIndex != null && insertionIndex <= laneArray.length) {
    laneArray.splice(insertionIndex, 0, drone);
  } else {
    laneArray.push(drone);
  }
}
