/**
 * Calculates the insertion index for a drone being placed in a lane,
 * based on horizontal mouse position relative to existing drone midpoints.
 *
 * Co-located with UI (not src/utils/) because it uses DOM queries.
 *
 * @param {number} mouseX - The clientX position of the mouse
 * @param {HTMLElement} laneContentElement - The lane's content container element
 * @param {string|null} excludeDroneId - For same-lane reorder, skip this drone's element
 * @returns {number} The insertion index (0-based position in the lane array)
 */
export function calculateInsertionIndex(mouseX, laneContentElement, excludeDroneId = null) {
  if (!laneContentElement) return 0;

  const droneElements = laneContentElement.querySelectorAll('[data-drone-index]');
  if (droneElements.length === 0) return 0;

  // Build midpoints, optionally excluding the dragged drone
  const midpoints = [];
  for (const el of droneElements) {
    const droneId = el.getAttribute('data-drone-id');
    if (excludeDroneId && droneId === excludeDroneId) continue;

    const rect = el.getBoundingClientRect();
    midpoints.push(rect.left + rect.width / 2);
  }

  if (midpoints.length === 0) return 0;

  // Find where mouseX falls relative to drone midpoints
  for (let i = 0; i < midpoints.length; i++) {
    if (mouseX < midpoints[i]) return i;
  }

  // Right of all drones — append at end
  return midpoints.length;
}
