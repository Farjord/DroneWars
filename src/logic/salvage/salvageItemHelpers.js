/**
 * Salvage Item Helpers
 * Logic functions for salvage item selection and generation
 * Extracted from src/data/salvageItemData.js (Phase D refactor)
 */

import { SALVAGE_ITEMS } from '../../data/salvageItemData.js';

/**
 * Find all salvage items that can be assigned a specific credit value
 * @param {number} creditValue - The rolled credit amount
 * @returns {Array} Array of eligible salvage items
 */
export function findEligibleItems(creditValue) {
  return SALVAGE_ITEMS.filter(
    item => creditValue >= item.creditRange.min && creditValue <= item.creditRange.max
  );
}

/**
 * Select a random salvage item for a given credit value
 * Uses the provided RNG for deterministic results
 * @param {number} creditValue - The rolled credit amount
 * @param {Object} rng - Random number generator with random() method
 * @returns {Object|null} Selected salvage item or null if none eligible
 */
export function selectSalvageItem(creditValue, rng) {
  const eligible = findEligibleItems(creditValue);

  if (eligible.length === 0) {
    // Fallback: find closest item by expanding search
    // This handles edge cases where a value falls in a gap
    let closest = null;
    let closestDistance = Infinity;

    for (const item of SALVAGE_ITEMS) {
      const distToMin = Math.abs(creditValue - item.creditRange.min);
      const distToMax = Math.abs(creditValue - item.creditRange.max);
      const dist = Math.min(distToMin, distToMax);

      if (dist < closestDistance) {
        closestDistance = dist;
        closest = item;
      }
    }

    return closest;
  }

  const index = Math.floor(rng.random() * eligible.length);
  return eligible[index];
}

/**
 * Generate a salvage item from a credit value
 * @param {number} creditValue - The credit amount this item is worth
 * @param {Object} rng - Random number generator
 * @returns {Object} Salvage item loot object
 */
export function generateSalvageItemFromValue(creditValue, rng) {
  const item = selectSalvageItem(creditValue, rng);

  if (!item) {
    // Ultimate fallback - should never happen with proper data coverage
    return {
      type: 'salvageItem',
      itemId: 'SALVAGE_SCRAP_METAL',
      name: 'Scrap Metal',
      creditValue: creditValue,
      image: '/DroneWars/Credits/scrap-metal.png',
      description: 'Twisted hull plating suitable for recycling.'
    };
  }

  return {
    type: 'salvageItem',
    itemId: item.id,
    name: item.name,
    creditValue: creditValue,
    image: item.image,
    description: item.description
  };
}
