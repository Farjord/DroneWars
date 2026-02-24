// ========================================
// BACKGROUNDS CONFIGURATION
// ========================================
// Centralized configuration for all available game backgrounds
// Supports both animated and static background types

/**
 * Available background configurations
 * @typedef {Object} Background
 * @property {string} id - Unique identifier for the background
 * @property {string} name - Display name shown in UI
 * @property {('animated'|'static')} type - Background type
 * @property {string} [component] - Component name for animated backgrounds
 * @property {string} [path] - Image path for static backgrounds
 */

export const BACKGROUNDS = [
  {
    id: 'animated',
    name: 'Animated Space',
    type: 'animated',
    component: 'SpaceBackground'
  },
  {
    id: 'nebula_1',
    name: 'Purple Nebula',
    type: 'static',
    path: '/DroneWars/Backgrounds/Nebula_1.jpg'
  },
  {
    id: 'orbit_1',
    name: 'Orbiting',
    type: 'static',
    path: '/DroneWars/Backgrounds/Orbit_1.jpg'
  },
  {
    id: 'deep_space_1',
    name: 'Deep Space',
    type: 'static',
    path: '/DroneWars/Backgrounds/Deep_Space_1.png'
  }
];

export const DEFAULT_BACKGROUND = 'orbit_1';

/**
 * Get background configuration by ID
 * @param {string} id - Background ID
 * @returns {Background} Background configuration object
 */
export const getBackgroundById = (id) => {
  return BACKGROUNDS.find(bg => bg.id === id) || BACKGROUNDS.find(bg => bg.id === DEFAULT_BACKGROUND) || BACKGROUNDS[0];
};
