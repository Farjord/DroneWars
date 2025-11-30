// ========================================
// POINTS OF INTEREST UTILITY FUNCTIONS
// ========================================
// Helper functions for PoI selection and lookup

import { poiTypes } from '../../data/pointsOfInterestData.js';

/**
 * Get random PoI type using weighted selection
 * Boss PoIs have lower probability (5% weight) than regular PoIs (1.0 weight)
 * Core-only PoIs (like drone blueprints) only spawn in core zone
 * @param {number} tier - Map tier (currently tier 1 only for MVP)
 * @param {Function} [rng=Math.random] - Random number generator function
 * @param {string} [zone=null] - Current zone ('core', 'mid', 'perimeter')
 * @returns {Object} Selected PoI type configuration
 */
export function getRandomPoIType(tier = 1, rng = Math.random, zone = null) {
  // Filter PoIs by zone restriction
  const eligiblePoIs = poiTypes.filter(poi => {
    // If PoI is coreOnly, only include it when zone is 'core'
    if (poi.coreOnly && zone !== 'core') return false;
    return true;
  });

  // Assign weights: use custom weight if defined, boss PoIs get 5%, regular get 1.0
  const weightedPoIs = eligiblePoIs.map(poi => ({
    ...poi,
    weight: poi.weight ?? (poi.isBoss ? 0.05 : 1)
  }));

  const totalWeight = weightedPoIs.reduce((sum, poi) => sum + poi.weight, 0);
  let roll = rng() * totalWeight;

  for (const poi of weightedPoIs) {
    roll -= poi.weight;
    if (roll <= 0) {
      return poi;
    }
  }

  // Fallback to first eligible PoI type
  return eligiblePoIs[0] || poiTypes[0];
}

/**
 * Get PoI configuration by ID
 * @param {string} id - PoI ID to lookup
 * @returns {Object|undefined} PoI configuration or undefined if not found
 */
export function getPoIById(id) {
  return poiTypes.find(poi => poi.id === id);
}
