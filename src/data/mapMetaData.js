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
