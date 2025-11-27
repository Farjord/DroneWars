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
