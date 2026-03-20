/**
 * Faction helper functions.
 * Logic separated from data (factionData.js).
 */

import { FACTIONS, HANGAR_REGIONS } from '../../data/factionData.js';

/**
 * Determine which factions a map's faction grants card access to.
 * Faction maps grant access to their own faction + NEUTRAL_1.
 * Neutral maps only grant access to NEUTRAL_1.
 * @param {string} mapFaction - The faction assigned to the map
 * @returns {string[]} Array of accessible faction IDs
 */
export function getAccessibleFactions(mapFaction) {
  const faction = FACTIONS[mapFaction];
  if (!faction || faction.type === 'neutral') {
    return ['NEUTRAL_1'];
  }
  return [mapFaction, 'NEUTRAL_1'];
}

/**
 * Look up which faction a hex cell belongs to.
 * Checks HANGAR_REGIONS using angle-based distorted radius for organic shapes.
 * @param {number} col - Hex column
 * @param {number} row - Hex row
 * @returns {string} Faction ID
 */
export function getRegionFaction(col, row) {
  for (const region of HANGAR_REGIONS) {
    const [cx, cy] = region.center;
    const dx = col - cx;
    const dy = row - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return region.faction;

    const angle = Math.atan2(dy, dx);
    let effectiveRadius = region.radius;
    for (const [amp, freq, phase] of region.distortion) {
      effectiveRadius += amp * Math.sin(freq * angle + phase);
    }

    if (distance <= effectiveRadius) {
      return region.faction;
    }
  }
  return 'NEUTRAL_1';
}

/**
 * Check if two adjacent hex cells are in different regions (for border rendering).
 * @param {number} col1 - First cell column
 * @param {number} row1 - First cell row
 * @param {number} col2 - Second cell column
 * @param {number} row2 - Second cell row
 * @returns {boolean} True if the cells are in different faction regions
 */
export function isRegionBoundary(col1, row1, col2, row2) {
  return getRegionFaction(col1, row1) !== getRegionFaction(col2, row2);
}
