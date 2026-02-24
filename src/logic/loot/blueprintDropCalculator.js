/**
 * Blueprint Drop Calculator Utility
 *
 * Provides functions to calculate which POIs and tiers can drop specific drones,
 * and the probability of obtaining them. Uses shared constants with LootGenerator
 * to ensure consistency and prevent configuration drift.
 */

import fullDroneCollection from '../../data/droneData.js';
import { starterPoolDroneNames } from '../../data/saveGameSchema.js';

/**
 * POI type → class band weights
 * Shared with LootGenerator.generateDroneBlueprint()
 */
export const CLASS_BAND_WEIGHTS = {
  'DRONE_BLUEPRINT_LIGHT': { 0: 60, 1: 40, 2: 0 },
  'DRONE_BLUEPRINT_MEDIUM': { 1: 60, 2: 30, 3: 10 },
  'DRONE_BLUEPRINT_HEAVY': { 2: 60, 3: 30, 4: 10 }
};

/**
 * Tier-based rarity weights
 * Shared with LootGenerator.generateDroneBlueprint()
 */
export const RARITY_WEIGHTS = {
  tier1: { Common: 90, Uncommon: 10, Rare: 0 },
  tier2: { Common: 60, Uncommon: 35, Rare: 5 },
  tier3: { Common: 40, Uncommon: 45, Rare: 15 }
};

/**
 * Get POI types where this drone class can drop (weight > 0)
 * @param {number} droneClass - The drone's class (0-4)
 * @returns {Array<string>} Array of POI type strings
 */
export function getEligiblePOIs(droneClass) {
  const poiTypes = ['DRONE_BLUEPRINT_LIGHT', 'DRONE_BLUEPRINT_MEDIUM', 'DRONE_BLUEPRINT_HEAVY'];
  return poiTypes.filter(poi => {
    const weights = CLASS_BAND_WEIGHTS[poi];
    return weights && weights[droneClass] > 0;
  });
}

/**
 * Get tiers where this drone rarity can drop (weight > 0)
 * @param {string} droneRarity - The drone's rarity (Common, Uncommon, Rare, Mythic)
 * @returns {Array<number>} Array of tier numbers
 */
export function getEligibleTiers(droneRarity) {
  const tiers = [1, 2, 3];
  return tiers.filter(tier => {
    const weights = RARITY_WEIGHTS[`tier${tier}`];
    return weights && weights[droneRarity] > 0;
  });
}

/**
 * Calculate pool size: count of selectable non-starter drones matching class+rarity
 * @param {number} droneClass - The drone's class
 * @param {string} droneRarity - The drone's rarity
 * @returns {number} Count of drones in this pool
 */
export function calculatePoolSize(droneClass, droneRarity) {
  return fullDroneCollection.filter(d => {
    if (starterPoolDroneNames.includes(d.name)) return false;
    if (d.selectable === false) return false;
    if (d.class !== droneClass) return false;
    if ((d.rarity || 'Common') !== droneRarity) return false;
    return true;
  }).length;
}

/**
 * Calculate drop probability for specific POI+tier combination
 * Formula: P(class) × P(rarity) × (1 / pool_size)
 * @param {Object} drone - The drone object with class and rarity
 * @param {string} poiType - POI type (DRONE_BLUEPRINT_LIGHT/MEDIUM/HEAVY)
 * @param {number} tier - Tier number (1, 2, or 3)
 * @returns {number} Probability (0.0 to 1.0)
 */
export function calculateDropProbability(drone, poiType, tier) {
  const classBandWeights = CLASS_BAND_WEIGHTS[poiType];
  const rarityWeights = RARITY_WEIGHTS[`tier${tier}`];

  if (!classBandWeights || !rarityWeights) return 0;

  const classWeight = classBandWeights[drone.class];
  const rarityWeight = rarityWeights[drone.rarity || 'Common'];

  if (!classWeight || !rarityWeight) return 0;

  // Calculate total weights
  const totalClassWeight = Object.values(classBandWeights).reduce((a, b) => a + b, 0);
  const totalRarityWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);

  // Get pool size for this class+rarity combination
  const poolSize = calculatePoolSize(drone.class, drone.rarity || 'Common');

  if (poolSize === 0) return 0;

  // P(class) × P(rarity) × (1/pool)
  return (classWeight / totalClassWeight)
       * (rarityWeight / totalRarityWeight)
       * (1 / poolSize);
}

/**
 * Get all drop sources for a drone with probabilities
 * @param {Object} drone - The drone object
 * @returns {Object} { sources: [{poiType, tier, probability}], poolSize }
 */
export function getDroneDropInfo(drone) {
  const eligiblePOIs = getEligiblePOIs(drone.class);
  const eligibleTiers = getEligibleTiers(drone.rarity || 'Common');

  const sources = [];

  for (const poi of eligiblePOIs) {
    for (const tier of eligibleTiers) {
      const probability = calculateDropProbability(drone, poi, tier);
      if (probability > 0) {
        sources.push({ poiType: poi, tier, probability });
      }
    }
  }

  const poolSize = calculatePoolSize(drone.class, drone.rarity || 'Common');

  return { sources, poolSize };
}
