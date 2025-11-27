// ========================================
// POINTS OF INTEREST UTILITY FUNCTIONS
// ========================================
// Helper functions for PoI selection and lookup

import { poiTypes } from '../../data/pointsOfInterestData.js';

/**
 * Get random PoI type using weighted selection
 * Boss PoIs have lower probability (5% weight) than regular PoIs (1.0 weight)
 * @param {number} tier - Map tier (currently tier 1 only for MVP)
 * @param {Function} [rng=Math.random] - Random number generator function
 * @returns {Object} Selected PoI type configuration
 */
export function getRandomPoIType(tier = 1, rng = Math.random) {
  // Assign weights: boss PoIs get 5% chance, regular PoIs get normal weight
  const weightedPoIs = poiTypes.map(poi => ({
    ...poi,
    weight: poi.isBoss ? 0.05 : 1
  }));

  const totalWeight = weightedPoIs.reduce((sum, poi) => sum + poi.weight, 0);
  let roll = rng() * totalWeight;

  for (const poi of weightedPoIs) {
    roll -= poi.weight;
    if (roll <= 0) {
      return poi;
    }
  }

  // Fallback to first PoI type
  return poiTypes[0];
}

/**
 * Get PoI configuration by ID
 * @param {string} id - PoI ID to lookup
 * @returns {Object|undefined} PoI configuration or undefined if not found
 */
export function getPoIById(id) {
  return poiTypes.find(poi => poi.id === id);
}
