import { mapTiers } from '../../data/mapData.js';
import { mapTypes } from '../../data/mapMetaData.js';
import { SeededRandom } from '../../utils/seededRandom.js';
import { hexesInRadius, getZone, axialDistance } from '../../utils/hexGrid.js';
import { getRandomPoIType } from '../extraction/poiUtils.js';
import PathValidator from './PathValidator.js';
import aiPersonalities from '../../data/aiData.js';

/**
 * Get starting detection value from tier config based on POI count
 * @param {number} poiCount - Number of POIs on map
 * @param {Object} tierConfig - Tier configuration
 * @param {SeededRandom} rng - Random number generator
 * @returns {number} Starting detection percentage
 */
function getStartingDetection(poiCount, tierConfig, rng) {
  const tiers = tierConfig.startingDetection || [];
  for (const tier of tiers) {
    if (poiCount <= tier.maxPois) {
      if (tier.min === tier.max) return tier.min;
      return Math.round(rng.random() * (tier.max - tier.min) + tier.min);
    }
  }
  return 0;
}

/**
 * Get base encounter chance from tier config
 * @param {Object} tierConfig - Tier configuration
 * @param {SeededRandom} rng - Random number generator
 * @returns {number} Base encounter chance percentage
 */
function getBaseEncounterChance(tierConfig, rng) {
  const range = tierConfig.encounterChance?.empty;
  if (typeof range === 'object' && range.min !== undefined) {
    return Math.round(rng.random() * (range.max - range.min) + range.min);
  }
  // Fallback for fixed value (backwards compatibility)
  return typeof range === 'number' ? range : 5;
}

/**
 * Generate procedural map data with full hex grid
 * Uses two-layer architecture:
 * - Tier (from mapData.js) determines quantity/quality of rewards
 * - Type (from mapMetaData.js) determines PoI type distribution
 *
 * Implements retry logic (up to 10 attempts) to ensure generated maps pass validation:
 * - All PoIs reachable from all gates
 * - Path costs within detection limits
 *
 * @param {number} seed - Seed for deterministic generation
 * @param {number} tier - Map tier (1-3) - determines quality/quantity from mapData.js
 * @param {string} typeId - Map type ID from mapMetaData.js - determines PoI type distribution
 * @returns {Object} Generated map data with hex grid coordinates
 */
export function generateMapData(seed, tier, typeId = 'GENERIC') {
  const tierConfig = mapTiers[tier - 1];
  const mapType = mapTypes[typeId] || mapTypes.GENERIC;

  if (!tierConfig) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  // Try up to 10 times to generate a valid map
  for (let attempt = 0; attempt < 10; attempt++) {
    // Create new RNG for this attempt (deterministic based on seed + attempt)
    const rng = new SeededRandom(seed + attempt);

    try {
      const mapData = generateAttempt(tierConfig, mapType, rng, seed);

      // Validate map
      const validator = new PathValidator();
      if (validator.validateMap(mapData, tierConfig)) {
        console.log(`Map generated successfully on attempt ${attempt + 1}`);
        return mapData;
      }

      console.log(`Map generation attempt ${attempt + 1} failed validation`);
    } catch (error) {
      console.warn(`Map generation attempt ${attempt + 1} threw error:`, error.message);
    }
  }

  throw new Error('Failed to generate valid map after 10 attempts');
}

/**
 * Generate single map attempt
 * @param {Object} tierConfig - Tier configuration from mapData.js
 * @param {Object} mapType - Map type configuration from mapMetaData.js
 * @param {SeededRandom} rng - Seeded random number generator
 * @param {number} seed - Original seed for return data
 * @returns {Object} Generated map data
 */
function generateAttempt(tierConfig, mapType, rng, seed) {
  // Generate sector designation
  const sector = String.fromCharCode(65 + Math.floor(rng.random() * 26)); // A-Z
  const subsector = rng.randomInt(1, 10); // 1-9

  // Generate hex grid
  const hexes = hexesInRadius(tierConfig.radius).map(hex => ({
    ...hex,
    type: 'empty',
    zone: getZone(hex.q, hex.r, tierConfig.radius)
  }));

  // Determine gate count (support both fixed number and {min, max} range)
  const gateCountConfig = tierConfig.gateCount;
  const gateCount = typeof gateCountConfig === 'object'
    ? rng.randomInt(gateCountConfig.min, gateCountConfig.max + 1)
    : gateCountConfig;

  // Place gates equidistantly on perimeter with random starting position
  const gates = placeGates(hexes, gateCount, tierConfig.radius, rng);

  // Place PoIs with zone distribution and spacing constraints
  const pois = placePOIs(hexes, tierConfig, mapType, gates, rng);

  // Calculate PoI type breakdown for return data
  const poiTypeBreakdown = {};
  for (const poi of pois) {
    const rewardType = poi.poiData.rewardType;
    // Map reward types to card types for breakdown
    const cardType = mapRewardTypeToCardType(rewardType);
    poiTypeBreakdown[cardType] = (poiTypeBreakdown[cardType] || 0) + 1;
  }

  // Track drone blueprint PoIs for map overview highlighting
  const dronePoiCount = pois.filter(p => p.poiData.rewardType?.startsWith('DRONE_BLUEPRINT_')).length;
  const hasDroneBlueprints = dronePoiCount > 0;

  // Track if map requires security token for entry (any PoI with requiresToken flag)
  const requiresToken = pois.some(p => p.poiData.requiresToken === true);

  // Calculate map variance values
  const rawBaseDetection = getStartingDetection(pois.length, tierConfig, rng);

  // Add detection increase from drone blueprint PoIs (cumulative, capped at 50%)
  const dronePoiDetectionBonus = pois.reduce((sum, poi) => {
    return sum + (poi.poiData.baseDetectionIncrease || 0);
  }, 0);
  const baseDetection = Math.min(rawBaseDetection + dronePoiDetectionBonus, 50);
  const baseEncounterChance = getBaseEncounterChance(tierConfig, rng);

  // Build zone encounter chances from base + modifiers
  const zoneModifiers = tierConfig.encounterZoneModifiers || { perimeter: 0, mid: 5, core: 10 };
  const encounterByZone = {
    perimeter: baseEncounterChance + zoneModifiers.perimeter,
    mid: baseEncounterChance + zoneModifiers.mid,
    core: baseEncounterChance + zoneModifiers.core
  };

  return {
    tier: tierConfig.tier,
    name: `Sector ${sector}-${subsector}`,
    type: mapType.id,
    seed,

    // Hex grid data
    hexes,
    gates,
    pois,
    playerPosition: gates[0], // Start at first gate

    // Metadata (for UI display)
    poiCount: pois.length,
    poiTypeBreakdown,
    radius: tierConfig.radius,
    gateCount: gates.length,

    // Map variance - real calculated values
    baseDetection,           // Starting detection meter %
    baseEncounterChance,     // Base encounter % for perimeter
    encounterByZone,         // Encounter % by zone (perimeter/mid/core)

    // Bridge data for MapOverviewModal
    entryCost: tierConfig.entryCost.amount,
    nodeCounts: {
      combat: poiTypeBreakdown.Ordnance || 0,
      treasure: poiTypeBreakdown.Support || 0,
      event: poiTypeBreakdown.Tactic || 0,
      boss: poiTypeBreakdown.Upgrade || 0
    },
    difficulty: tierConfig.name,

    // Drone blueprint PoI tracking for map overview highlighting
    hasDroneBlueprints,
    dronePoiCount,

    // Token entry requirement (true if any PoI requires token)
    requiresToken,

    // Background persistence - randomly selected once per map, persists across encounters
    backgroundIndex: rng.randomInt(0, 5)  // 5 backgrounds available (0-4)
  };
}

/**
 * Place gates equidistantly on perimeter with random starting position
 * @param {Array<Object>} hexes - All hexes on map
 * @param {number} gateCount - Number of gates to place
 * @param {number} radius - Map radius
 * @param {SeededRandom} rng - Random number generator for consistent placement
 * @returns {Array<Object>} Array of gate hexes
 */
function placeGates(hexes, gateCount, radius, rng) {
  const gates = [];
  const angleStep = (2 * Math.PI) / gateCount;
  // Random starting angle so gates aren't always in the same positions
  const startAngle = rng.random() * 2 * Math.PI;

  for (let i = 0; i < gateCount; i++) {
    const angle = startAngle + (i * angleStep);

    // Convert polar to axial coordinates
    // For flat-top hexagons, we need to adjust the conversion
    const q = Math.round(radius * Math.cos(angle) * (2 / Math.sqrt(3)));
    const r = Math.round(radius * Math.sin(angle) * (2 / Math.sqrt(3)));

    // Find closest hex on perimeter
    let closestHex = null;
    let closestDist = Infinity;

    for (const hex of hexes) {
      const dist = axialDistance(0, 0, hex.q, hex.r);
      if (dist >= radius - 0.5 && dist <= radius + 0.5) {
        const targetDist = Math.hypot(hex.q - q, hex.r - r);
        if (targetDist < closestDist) {
          closestDist = targetDist;
          closestHex = hex;
        }
      }
    }

    if (closestHex) {
      closestHex.type = 'gate';
      closestHex.gateId = i;
      closestHex.isActive = false; // Gates become active during extraction
      gates.push(closestHex);
    }
  }

  return gates;
}

/**
 * Place PoIs with zone distribution and spacing constraints
 * @param {Array<Object>} hexes - All hexes on map
 * @param {Object} tierConfig - Tier configuration
 * @param {Object} mapType - Map type configuration
 * @param {Array<Object>} gates - Gate hexes
 * @param {SeededRandom} rng - Random number generator
 * @returns {Array<Object>} Array of PoI hexes
 */
function placePOIs(hexes, tierConfig, mapType, gates, rng) {
  const pois = [];

  // Determine total PoI count
  const poiCount = rng.randomInt(tierConfig.poiCount.min, tierConfig.poiCount.max + 1);

  // Separate hexes by zone
  const coreHexes = hexes.filter(h => h.zone === 'core' && h.type === 'empty');
  const midHexes = hexes.filter(h => h.zone === 'mid' && h.type === 'empty');
  const perimeterHexes = hexes.filter(h => h.zone === 'perimeter' && h.type === 'empty');

  // Calculate zone counts based on distribution
  const coreCount = Math.floor(poiCount * tierConfig.poiDistribution.core);
  const midCount = Math.floor(poiCount * tierConfig.poiDistribution.mid);
  const perimeterCount = poiCount - coreCount - midCount;

  // Place PoIs in each zone (pass zone name for coreOnly PoI filtering)
  placeInZone(coreHexes, coreCount, pois, gates, tierConfig, rng, 'core');
  placeInZone(midHexes, midCount, pois, gates, tierConfig, rng, 'mid');
  placeInZone(perimeterHexes, perimeterCount, pois, gates, tierConfig, rng, 'perimeter');

  return pois;
}

/**
 * Place PoIs in a specific zone with spacing constraints
 * @param {Array<Object>} hexes - Hexes in this zone
 * @param {number} count - Number of PoIs to place
 * @param {Array<Object>} pois - Array of already placed PoIs (mutated)
 * @param {Array<Object>} gates - Gate hexes
 * @param {Object} tierConfig - Tier configuration
 * @param {SeededRandom} rng - Random number generator
 * @param {string} zoneName - Zone name ('core', 'mid', 'perimeter')
 */
function placeInZone(hexes, count, pois, gates, tierConfig, rng, zoneName) {
  // Shuffle hexes deterministically
  const shuffled = rng.shuffle(hexes);

  // Track how many PoIs we've placed in THIS zone
  let placedInZone = 0;

  for (const hex of shuffled) {
    if (placedInZone >= count) {
      // We've placed enough PoIs in this zone
      break;
    }

    // Check gate buffer constraint
    const tooCloseToGate = gates.some(g =>
      axialDistance(hex.q, hex.r, g.q, g.r) < tierConfig.gateBuffer
    );
    if (tooCloseToGate) continue;

    // Check PoI spacing constraint
    const tooCloseToPOI = pois.some(p =>
      axialDistance(hex.q, hex.r, p.q, p.r) < tierConfig.poiMinSpacing
    );

    // Twin node chance - occasionally allow adjacent PoIs
    const allowTwin = rng.random() < tierConfig.twinNodeChance;
    if (tooCloseToPOI && !allowTwin) continue;

    // Select PoI type using weighted random, passing zone for coreOnly filtering
    const poiType = getRandomPoIType(tierConfig.tier, () => rng.random(), zoneName);

    // Clone poiType to avoid mutating original data
    const poiData = { ...poiType };

    // For drone blueprint PoIs, assign pre-determined guardian AI
    if (poiData.rewardType?.startsWith('DRONE_BLUEPRINT_')) {
      // CRITICAL: Read AI from tierAIMapping in data file only - no hardcoding!
      // The tierAIMapping is defined in pointsOfInterestData.js
      if (poiData.tierAIMapping) {
        const tier = tierConfig.tier || 1;
        const guardianAIName = poiData.tierAIMapping[tier];

        if (guardianAIName) {
          // Look up AI data for full information
          const guardianAI = aiPersonalities.find(ai => ai.name === guardianAIName);

          poiData.guardianAI = {
            id: guardianAIName,
            name: guardianAI?.name || guardianAIName
          };
        } else {
          console.warn(`[MapGenerator] No AI mapping for tier ${tier} in ${poiData.id}`);
        }
      } else {
        // Fallback for backward compatibility (if tierAIMapping not defined)
        const threatTable = tierConfig.threatTables?.high || tierConfig.threatTables?.medium || ['Rogue Scout Pattern'];
        const guardianAIName = threatTable[Math.floor(rng.random() * threatTable.length)];

        const guardianAI = aiPersonalities.find(ai => ai.name === guardianAIName);

        poiData.guardianAI = {
          id: guardianAIName,
          name: guardianAI?.name || guardianAIName
        };
      }
    }

    // Place PoI
    hex.type = 'poi';
    hex.poiId = pois.length;
    hex.poiType = poiData.id;
    hex.poiData = poiData;
    pois.push(hex);
    placedInZone++; // Increment count for this zone
  }
}

/**
 * Map reward type to card type for breakdown
 * @param {string} rewardType - Reward type from PoI data
 * @returns {string} Card type (Ordnance, Tactic, Support, Upgrade)
 */
function mapRewardTypeToCardType(rewardType) {
  const mapping = {
    'ORDNANCE_PACK': 'Ordnance',
    'TACTICAL_PACK': 'Tactic',
    'SUPPORT_PACK': 'Support',
    'UPGRADE_PACK': 'Upgrade',
    'BLUEPRINT_GUARANTEED': 'Upgrade',
    'DRONE_BLUEPRINT_LIGHT': 'Drone',
    'DRONE_BLUEPRINT_FIGHTER': 'Drone',
    'DRONE_BLUEPRINT_HEAVY': 'Drone',
    'CREDITS_PACK': 'Resource',
    'TOKEN_REWARD': 'Resource'
  };

  return mapping[rewardType] || 'Unknown';
}
