/**
 * Map Data
 * Defines tactical map configurations by tier
 * MVP: Tier 1 (The Shallows) only
 */

export const mapTiers = [
  {
    tier: 1,
    name: 'The Shallows',
    description: 'Outer perimeter of the Eremos. Low-risk reconnaissance zone with scattered debris fields.',

    // Topology
    radius: 5,  // Hexes from center
    gateCount: 3,  // Extraction points

    // PoI configuration
    poiCount: { min: 6, max: 8 },
    poiDistribution: {
      core: 0.70,   // 70% spawn in core zone (0-40% radius)
      mid: 0.25,    // 25% spawn in mid zone (41-80% radius)
      perimeter: 0.05  // 5% spawn in perimeter (81-100% radius)
    },

    // Spacing rules
    gateBuffer: 3,  // Min hexes from PoI to gate
    poiMinSpacing: 2,  // Min hexes between PoIs
    twinNodeChance: 0.05,  // 5% chance for adjacent PoIs

    // Entry cost
    entryCost: {
      type: 'credits',
      amount: 0  // Free for Tier 1
    },

    // Detection configuration (zone-based movement costs)
    detectionTriggers: {
      movementPerHex: 1.5,  // Default flat rate (fallback)
      movementByZone: {
        core: 2.5,        // % per hex in core zone (0-40% radius) - highest near POIs
        mid: 1.5,         // % per hex in mid zone (41-80% radius)
        perimeter: 0.5    // % per hex in perimeter (81-100% radius) - safest edges
      },
      looting: 10,          // % when looting PoI (fallback if POI has no threatIncrease)
      combatEnd: 20,        // % after combat resolves
      timePerTurn: 5        // % per turn (optional for MVP)
    },

    // Encounter chance by hex type (% per hex entered)
    // empty is now a range - generator picks random value within range
    encounterChance: {
      empty: { min: 3, max: 7 },  // Random 3-7% base for perimeter
      gate: 0                     // 0% for extraction gates (safe zones)
    },

    // Zone modifiers for encounter chance (added to base)
    encounterZoneModifiers: {
      perimeter: 0,   // Base value (no modifier)
      mid: 5,         // +5%
      core: 10        // +10%
    },

    // Starting detection ranges (by POI count thresholds)
    // Detection meter starts at this value instead of 0
    startingDetection: [
      { maxPois: 4, min: 0, max: 0 },        // 0-4 POIs: 0%
      { maxPois: 6, min: 3, max: 10 },       // 5-6 POIs: 3-10%
      { maxPois: 8, min: 10, max: 20 },      // 7-8 POIs: 10-20%
      { maxPois: Infinity, min: 15, max: 30 } // 9+ POIs: 15-30%
    ],

    // Threat escalation (AI names from aiData.js extraction mode)
    threatTables: {
      low: ['Rogue Scout Pattern', 'Automated Patrol Unit'],           // 0-49% detection
      medium: ['Heavy Cruiser Defense Pattern', 'Specialized Hunter Group'],  // 50-79% detection
      high: ['Heavy Cruiser Defense Pattern', 'Specialized Hunter Group']     // 80-100% detection (reuse until Hard AIs added)
    },

    // Validation
    maxPathCostPercent: 70,  // Max detection cost for critical path

    // Visual
    backgroundColor: '#1a1a2e',
    gridColor: '#16213e',
    dangerZoneColor: '#ff4444',
  }
];

// Future tiers (post-MVP)
/*
{
  tier: 2,
  name: 'The Deep',
  radius: 8,
  gateCount: 4,
  poiCount: { min: 12, max: 15 },
  entryCost: { type: 'credits', amount: 100 },
  detectionTriggers: {
    movementPerHex: 2.5,
    looting: 10,
    combatEnd: 20,
    timePerTurn: 5
  },
  threatTables: {
    low: ['AI_SCOUT_2', 'AI_PATROL_2'],
    medium: ['AI_CRUISER_2', 'AI_HUNTER_2'],
    high: ['AI_BLOCKADE_2', 'AI_DREADNOUGHT_1']
  },
  maxPathCostPercent: 70,
  backgroundColor: '#0f0f1e',
  gridColor: '#0a0a1e',
  dangerZoneColor: '#ff2222',
},
{
  tier: 3,
  name: 'The Core',
  radius: 12,
  gateCount: 5,
  poiCount: { min: 20, max: 25 },
  entryCost: { type: 'tokens', amount: 1 },
  detectionTriggers: {
    movementPerHex: 3.0,
    looting: 10,
    combatEnd: 20,
    timePerTurn: 5
  },
  threatTables: {
    low: ['AI_SCOUT_3', 'AI_PATROL_3'],
    medium: ['AI_CRUISER_3', 'AI_HUNTER_3'],
    high: ['AI_BLOCKADE_3', 'AI_DREADNOUGHT_2', 'AI_TITAN_1']
  },
  maxPathCostPercent: 70,
  backgroundColor: '#050510',
  gridColor: '#020208',
  dangerZoneColor: '#ff0000',
}
*/

export default mapTiers;
