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
      Ordnance: 25,
      Tactic: 25,
      Support: 25,
      Upgrade: 25
    }
  },
  MUNITIONS_FACTORY: {
    id: 'MUNITIONS_FACTORY',
    name: 'Ruined Munitions Factory',
    description: 'Abandoned weapons facility - high Ordnance PoI concentration',
    icon: '💣',
    color: '#dc2626',  // Red
    poiDistribution: {
      Ordnance: 60,
      Tactic: 15,
      Support: 15,
      Upgrade: 10
    }
  },
  // Additional map types: NEBULA, ASTEROID, STATION — to be designed when map variety is prioritized
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
