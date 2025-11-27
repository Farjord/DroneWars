/**
 * Hex Grid Utilities
 * Axial coordinate system (q, r) for flat-top hexagon orientation
 * Used for procedural map generation in Exploring the Eremos mode
 */

/**
 * Calculate Manhattan distance between two hexes in axial coordinates
 * @param {number} q1 - Q coordinate of first hex
 * @param {number} r1 - R coordinate of first hex
 * @param {number} q2 - Q coordinate of second hex
 * @param {number} r2 - R coordinate of second hex
 * @returns {number} Distance in hex steps
 */
export function axialDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

/**
 * Generate all hexes within a given radius from center (0, 0)
 * @param {number} radius - Maximum distance from center
 * @returns {Array<{q: number, r: number}>} Array of hex coordinates
 */
export function hexesInRadius(radius) {
  const hexes = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}

/**
 * Get 6 neighboring hexes for a given hex
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 * @returns {Array<{q: number, r: number}>} Array of 6 neighbor coordinates
 */
export function hexNeighbors(q, r) {
  return [
    { q: q + 1, r: r },      // East
    { q: q - 1, r: r },      // West
    { q: q, r: r + 1 },      // Southeast
    { q: q, r: r - 1 },      // Northwest
    { q: q + 1, r: r - 1 },  // Northeast
    { q: q - 1, r: r + 1 },  // Southwest
  ];
}

/**
 * Classify hex into zone based on distance from center
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 * @param {number} radius - Map radius
 * @returns {string} Zone classification: 'core', 'mid', or 'perimeter'
 */
export function getZone(q, r, radius) {
  const distance = axialDistance(0, 0, q, r);
  const percent = (distance / radius) * 100;

  if (percent <= 40) return 'core';
  if (percent <= 80) return 'mid';
  return 'perimeter';
}

/**
 * Convert axial coordinates to pixel coordinates for rendering
 * @param {number} q - Q coordinate
 * @param {number} r - R coordinate
 * @param {number} hexSize - Size of hexagon (distance from center to corner)
 * @returns {{x: number, y: number}} Pixel coordinates
 */
export function axialToPixel(q, r, hexSize) {
  // Flat-top orientation formula
  const x = hexSize * (3 / 2 * q);
  const y = hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}
