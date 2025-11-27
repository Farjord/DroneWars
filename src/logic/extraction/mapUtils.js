// ========================================
// MAP UTILITY FUNCTIONS
// ========================================
// Helper functions for map tier lookup and navigation

import { mapTiers } from '../../data/mapData.js';

/**
 * Get map tier configuration by tier number
 * @param {number} tier - Tier number (1-3)
 * @returns {Object|undefined} Map tier configuration or undefined if not found
 */
export function getMapTier(tier) {
  return mapTiers.find(t => t.tier === tier);
}
