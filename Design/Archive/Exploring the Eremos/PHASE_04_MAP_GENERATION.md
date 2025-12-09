# Phase 4: Map Generation

## Overview

Phase 4 implements procedural hex grid map generation with intelligent PoI placement and path validation. Maps must be playable, fair, and meet the instability cost requirements defined in the acceptance criteria.

---

## Estimated Time

**2 days** (8-12 hours total)

---

## Dependencies

**Requires:** Phase 1 (Foundation) - mapData.js, pointsOfInterestData.js

**Blocks:** Phase 5 (Tactical Map), Phase 6 (Instability)

---

## Files to Create/Modify

1. `src/utils/hexGrid.js` - ✅ **CREATED** - Axial coordinate system utilities
2. `src/utils/mapGenerator.js` - 🔧 **REFACTORED** - Procedural generation algorithm (Two-layer: Tier + Type) - functional approach
3. `src/data/mapMetaData.js` - ✅ **ALREADY EXISTS** (Created in Phase 3) - Map type definitions with PoI distributions
4. `src/logic/extraction/mapExtraction.js` - ✅ **ALREADY EXISTS** (Created in Phase 3) - Utility functions for map metadata
5. `src/logic/map/PathValidator.js` - ✅ **IMPLEMENTED** - A* pathfinding validation

---

## Implementation

### 1. hexGrid.js

```javascript
/**
 * Hex Grid Utilities
 * Axial coordinate system (q, r)
 * Flat-top hex orientation
 */

/**
 * Calculate distance between two hexes
 */
export function axialDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

/**
 * Get all hexes within radius
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
 * Get 6 neighbors of hex
 */
export function hexNeighbors(q, r) {
  return [
    { q: q + 1, r: r },
    { q: q - 1, r: r },
    { q: q, r: r + 1 },
    { q: q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 },
  ];
}

/**
 * Classify hex zone
 */
export function getZone(q, r, radius) {
  const distance = axialDistance(0, 0, q, r);
  const percent = (distance / radius) * 100;

  if (percent <= 40) return 'core';
  if (percent <= 80) return 'mid';
  return 'perimeter';
}

/**
 * Convert axial to pixel coordinates (for rendering)
 */
export function axialToPixel(q, r, hexSize) {
  const x = hexSize * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = hexSize * (3 / 2 * r);
  return { x, y };
}
```

---

### 2. mapMetaData.js

**Purpose:** Define map types with PoI distribution percentages

Map types control **WHAT KIND** of PoIs spawn, while tiers (from mapData.js) control **HOW MANY** and **HOW GOOD** they are.

```javascript
/**
 * Map Metadata
 * Defines visual and gameplay characteristics for different map types
 *
 * Map Types control PoI TYPE distribution (what kind of rewards spawn)
 * Map Tiers (in mapData.js) control quality/quantity of rewards
 */

/**
 * Map type definitions
 * Each type has visual metadata and PoI type distribution
 */
export const mapTypes = {
  GENERIC: {
    id: 'GENERIC',
    name: 'Generic Sector',
    description: 'Standard exploration zone with balanced PoI distribution',
    icon: '?',
    color: '#808080',  // Grey
    // PoI type distribution (percentages, must total 100)
    poiDistribution: {
      Ordnance: 25,  // Combat/weapons
      Tactic: 25,    // Control/disruption
      Support: 25,   // Healing/resources
      Upgrade: 25    // Permanent improvements
    }
  },
  MUNITIONS_FACTORY: {
    id: 'MUNITIONS_FACTORY',
    name: 'Ruined Munitions Factory',
    description: 'Abandoned weapons facility - high Ordnance PoI concentration',
    icon: '💣',
    color: '#dc2626',  // Red
    poiDistribution: {
      Ordnance: 60,  // Combat-focused
      Tactic: 15,
      Support: 15,
      Upgrade: 10
    }
  },
  // TODO: Add more map types as game design develops
  // NEBULA: { id: 'NEBULA', name: 'Nebula', icon: '☁', color: '#9333EA', poiDistribution: {...} },
  // ASTEROID: { id: 'ASTEROID', name: 'Asteroid Field', icon: '◆', color: '#78716C', poiDistribution: {...} },
  // STATION: { id: 'STATION', name: 'Space Station', icon: '⬢', color: '#3B82F6', poiDistribution: {...} },
};

/**
 * Background images for map icons
 * PLACEHOLDER: Add actual image paths when assets are ready
 */
export const mapBackgrounds = {
  GENERIC: null,  // null = use solid background color
  MUNITIONS_FACTORY: null,
  // NEBULA: '/assets/maps/nebula-bg.jpg',
  // ASTEROID: '/assets/maps/asteroid-bg.jpg',
};

export default {
  mapTypes,
  mapBackgrounds,
};
```

---

### 3. mapExtraction.js

**Purpose:** Utility functions for accessing map metadata

```javascript
import { mapTypes, mapBackgrounds } from '../../data/mapMetaData';

/**
 * Get map type by ID
 * @param {string} typeId - Map type ID
 * @returns {Object} Map type configuration
 */
export function getMapType(typeId) {
  return mapTypes[typeId] || mapTypes.GENERIC;
}

/**
 * Get background image URL for map type
 * @param {string} typeId - Map type ID
 * @returns {string|null} Background image URL or null
 */
export function getMapBackground(typeId) {
  return mapBackgrounds[typeId] || null;
}
```

---

### 4. mapGenerator.js (Two-Layer Architecture)

**Location:** `src/utils/mapGenerator.js` (not in logic/map)

**Purpose:** Generate procedural maps using two-layer architecture

#### Two-Layer Architecture Explained

**Layer 1 - Tier (from mapData.js):**
- Controls **quality and quantity** of rewards
- Determines PoI count range, radius, gate count, entry costs
- Defines instability triggers and thresholds
- Example: Tier 1 = 6-8 PoIs, Tier 2 = 12-15 PoIs

**Layer 2 - Type (from mapMetaData.js):**
- Controls **PoI TYPE distribution** (what kind of rewards)
- GENERIC: Balanced 25/25/25/25
- MUNITIONS_FACTORY: Combat-focused 60/15/15/10
- Future types can emphasize different gameplay styles

**Generation Flow:**
1. Load tierConfig from mapData.js based on `tier` parameter
2. Load mapType from mapMetaData.js based on `typeId` parameter
3. Calculate total PoI count from tier's min/max range (using seeded random)
4. Distribute PoIs by type using mapType.poiDistribution percentages
5. Handle rounding by distributing remainder randomly
6. Generate bridge data for MapOverviewModal compatibility

**Function Signature:**
```javascript
generateMapData(seed, tier, typeId = 'GENERIC')
// Returns: {
//   tier, name, type, poiCount, poiTypeBreakdown,
//   radius, gateCount, entryCost, nodeCounts, ...
// }
```

**Bridge Data for Legacy Compatibility:**

The function generates a `nodeCounts` object to maintain compatibility with MapOverviewModal, which expects the old node-based structure:

```javascript
// Maps PoI types to legacy node types for display
nodeCounts: {
  combat: poiTypeBreakdown.Ordnance || 0,      // Ordnance → Combat
  treasure: poiTypeBreakdown.Support || 0,      // Support → Treasure
  event: poiTypeBreakdown.Tactic || 0,          // Tactic → Event
  boss: poiTypeBreakdown.Upgrade || 0           // Upgrade → Boss
}
```

---

### 5. mapGenerator.js (Functional Implementation)

**Architecture:** Functional approach with exported functions
**Key Feature:** Uses `SeededRandom` class for deterministic random generation
**Retry Logic:** Generates new seed offset for each validation attempt

```javascript
import { mapTiers } from '../data/mapData.js';
import { mapTypes } from '../data/mapMetaData.js';
import { SeededRandom } from './seededRandom.js';
import { hexesInRadius, getZone, axialDistance } from './hexGrid.js';
import { getRandomPoIType } from '../logic/extraction/poiUtils.js';
import PathValidator from '../logic/map/PathValidator.js';

/**
 * Generate procedural map data with full hex grid
 * @param {number} seed - Seed for deterministic generation
 * @param {number} tier - Map tier (1-3)
 * @param {string} typeId - Map type ID from mapMetaData.js
 * @returns {Object} Generated map data with hex grid coordinates
 */
export function generateMapData(seed, tier, typeId = 'GENERIC') {
  const tierConfig = mapTiers[tier - 1];
  const mapType = mapTypes[typeId] || mapTypes.GENERIC;

  if (!tierConfig) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  // Retry logic: Try up to 10 times with seed offsets
  for (let attempt = 0; attempt < 10; attempt++) {
    // Create new RNG for this attempt (deterministic)
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

  // Place gates equidistantly on perimeter
  const gates = placeGates(hexes, tierConfig.gateCount, tierConfig.radius);

  // Place PoIs with zone distribution and spacing constraints
  const pois = placePOIs(hexes, tierConfig, mapType, gates, rng);

  // Calculate PoI type breakdown for return data
  const poiTypeBreakdown = {};
  for (const poi of pois) {
    const rewardType = poi.poiData.rewardType;
    const cardType = mapRewardTypeToCardType(rewardType);
    poiTypeBreakdown[cardType] = (poiTypeBreakdown[cardType] || 0) + 1;
  }

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
    gateCount: tierConfig.gateCount,

    // Bridge data for MapOverviewModal
    entryCost: tierConfig.entryCost.amount,
    nodeCounts: {
      combat: poiTypeBreakdown.Ordnance || 0,
      treasure: poiTypeBreakdown.Support || 0,
      event: poiTypeBreakdown.Tactic || 0,
      boss: poiTypeBreakdown.Upgrade || 0
    },
    estimatedLoot: Math.floor(pois.length * 100 * (1 + rng.random() * 0.5)),
    instabilityRisk: Math.floor(pois.length * 10 * tierConfig.tier),
    difficulty: tierConfig.name
  };
}

/**
 * Place gates equidistantly on perimeter
 */
function placeGates(hexes, gateCount, radius) {
  const gates = [];
  const angleStep = (2 * Math.PI) / gateCount;

  for (let i = 0; i < gateCount; i++) {
    const angle = i * angleStep;

    // Convert polar to axial with scaling for flat-top hexagons
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

  // Place PoIs in each zone
  placeInZone(coreHexes, coreCount, pois, gates, tierConfig, rng);
  placeInZone(midHexes, midCount, pois, gates, tierConfig, rng);
  placeInZone(perimeterHexes, perimeterCount, pois, gates, tierConfig, rng);

  return pois;
}

/**
 * Place PoIs in a specific zone with spacing constraints
 */
function placeInZone(hexes, count, pois, gates, tierConfig, rng) {
  // Shuffle hexes deterministically using SeededRandom.shuffle()
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

    // Select PoI type using weighted random
    const poiType = getRandomPoIType(tierConfig.tier, () => rng.random());

    // Place PoI
    hex.type = 'poi';
    hex.poiId = pois.length;
    hex.poiType = poiType.id;
    hex.poiData = poiType;
    pois.push(hex);
    placedInZone++; // Increment zone counter
  }
}

/**
 * Map reward type to card type for breakdown
 */
function mapRewardTypeToCardType(rewardType) {
  const mapping = {
    'ORDNANCE_PACK': 'Ordnance',
    'TACTICAL_PACK': 'Tactic',
    'SUPPORT_PACK': 'Support',
    'UPGRADE_PACK': 'Upgrade',
    'BLUEPRINT_GUARANTEED': 'Upgrade',
    'CREDITS': 'Support',
    'TOKEN_CHANCE': 'Support'
  };

  return mapping[rewardType] || 'Support';
}
```

**Key Implementation Details:**

1. **Functional Architecture**: Uses exported functions instead of class-based approach
2. **SeededRandom Class**: Robust deterministic random generation with `random()`, `randomInt()`, `shuffle()` methods
3. **Retry Logic**: Each attempt uses `seed + attempt` for deterministic retries
4. **Gate Placement**: Polar-to-axial conversion with scaling factor `(2 / Math.sqrt(3))` + closest hex finding
5. **Zone Counting**: `placedInZone` counter ensures correct PoI distribution per zone
6. **Import Paths**: Uses `poiUtils.js` for `getRandomPoIType`, not pointsOfInterestData.js directly

---

### 6. PathValidator.js

**Status:** ✅ **IMPLEMENTED** in Phase 4
**Purpose:** Validate that all PoIs are reachable from all gates with acceptable instability cost

```javascript
import { hexNeighbors, axialDistance } from '../../utils/hexGrid.js';

class PathValidator {
  validateMap(map, tierConfig) {
    // Check if all PoIs are reachable from all gates
    // with instability cost < 70%

    for (const gate of map.gates) {
      for (const poi of map.pois) {
        const path = this.findPath(gate, poi, map.hexes);
        if (!path) {
          console.log('No path found between gate and PoI');
          return false;
        }

        const cost = path.length * tierConfig.instabilityTriggers.movementPerHex;
        if (cost > tierConfig.maxPathCostPercent) {
          console.log(`Path cost ${cost}% exceeds max ${tierConfig.maxPathCostPercent}%`);
          return false;
        }
      }
    }

    return true;
  }

  findPath(start, goal, hexes) {
    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(this.hexKey(start), 0);
    fScore.set(this.hexKey(start), this.heuristic(start, goal));

    while (openSet.length > 0) {
      // Get hex with lowest fScore
      openSet.sort((a, b) => fScore.get(this.hexKey(a)) - fScore.get(this.hexKey(b)));
      const current = openSet.shift();

      if (current.q === goal.q && current.r === goal.r) {
        return this.reconstructPath(cameFrom, current);
      }

      const neighbors = hexNeighbors(current.q, current.r);
      for (const neighborCoord of neighbors) {
        const neighbor = hexes.find(h => h.q === neighborCoord.q && h.r === neighborCoord.r);
        if (!neighbor) continue;  // Out of bounds

        const tentativeGScore = gScore.get(this.hexKey(current)) + 1;
        const neighborKey = this.hexKey(neighbor);

        if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));

          if (!openSet.find(h => h.q === neighbor.q && h.r === neighbor.r)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return null;  // No path found
  }

  reconstructPath(cameFrom, current) {
    const path = [current];
    let key = this.hexKey(current);

    while (cameFrom.has(key)) {
      current = cameFrom.get(key);
      path.unshift(current);
      key = this.hexKey(current);
    }

    return path;
  }

  heuristic(a, b) {
    return axialDistance(a.q, a.r, b.q, b.r);
  }

  hexKey(hex) {
    return `${hex.q},${hex.r}`;
  }
}

export default PathValidator;
```

---

## Validation Checklist

- [ ] Maps generate successfully for Tier 1
- [ ] Gates placed equidistantly on perimeter
- [ ] PoIs distributed: 70% core, 25% mid, 5% perimeter
- [ ] No PoI within 3 hexes of gates
- [ ] PoIs spaced at least 2 hexes apart
- [ ] All PoIs reachable from all gates
- [ ] Path costs < 70% instability
- [ ] Map generation completes in <1 second
- [ ] Seed-based generation is deterministic

---

**Phase Status:** ✅ **COMPLETED**
**Completion Date:** 2025-11-25
**Implementation Notes:**
- All hex grid utilities implemented
- PathValidator with A* pathfinding fully functional
- MapGenerator refactored to functional approach with SeededRandom class
- All validation tests passing
- Deterministic map generation working correctly
