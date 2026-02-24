// ========================================
// SHIP SECTION IMAGE RESOLVER
// ========================================
// Resolves the correct image path for ship sections based on ship type.
// Returns ship-specific images when available, falls back to generic images.

import { getShipById } from '../../data/shipData.js';

// ========================================
// SHIP NAME MAPPINGS
// ========================================
// Maps ship IDs and full names to folder names (last word of full name)
const SHIP_ID_TO_NAME = {
  'SHIP_001': 'Corvette',
  'SHIP_002': 'Carrier',
  'SHIP_003': 'Scout'
};

const SHIP_FULL_NAME_TO_FOLDER = {
  'Reconnaissance Corvette': 'Corvette',
  'Heavy Assault Carrier': 'Carrier',
  'Scout': 'Scout',
  // Also accept folder names directly
  'Corvette': 'Corvette',
  'Carrier': 'Carrier'
};

// ========================================
// SECTION TYPE MAPPINGS
// ========================================
// Maps section types and legacy keys to normalized filename format
const SECTION_TYPE_MAP = {
  // Type names (from shipSectionData.type)
  'Bridge': 'Bridge',
  'Power Cell': 'Power_Cell',
  'Drone Control Hub': 'Drone_Control_Hub',
  // Legacy keys (from shipSectionData.key)
  'bridge': 'Bridge',
  'tacticalBridge': 'Bridge',
  'powerCell': 'Power_Cell',
  'droneControlHub': 'Drone_Control_Hub'
};

// ========================================
// FALLBACK IMAGE PATHS
// ========================================
const FALLBACK_PATHS = {
  'Bridge': '/DroneWars/img/Bridge.png',
  'Power_Cell': '/DroneWars/img/Power_Cell.png',
  'Drone_Control_Hub': '/DroneWars/img/Drone_Control_Hub.png'
};

// ========================================
// EXPORTED CONSTANTS FOR ASSET PRELOADING
// ========================================
// These arrays are used by assetManifest.js to dynamically generate
// the list of ship section images to preload.

/** All ship folder names that have custom section images */
export const SHIP_FOLDER_NAMES = ['Corvette', 'Carrier', 'Scout'];

/** All section file names (normalized format used in image paths) */
export const SECTION_FILE_NAMES = ['Bridge', 'Power_Cell', 'Drone_Control_Hub'];

/** Fallback paths for each section type */
export { FALLBACK_PATHS };

// ========================================
// NORMALIZE SECTION TYPE
// ========================================
/**
 * Normalizes section type to filename format (e.g., "Power Cell" -> "Power_Cell")
 * @param {string} sectionType - Section type or legacy key
 * @returns {string|null} Normalized section type or null if unknown
 */
export const normalizeSectionType = (sectionType) => {
  if (sectionType == null) {
    return null;
  }
  return SECTION_TYPE_MAP[sectionType] || null;
};

// ========================================
// NORMALIZE SHIP NAME
// ========================================
/**
 * Normalizes ship identifier to folder name (e.g., "Reconnaissance Corvette" -> "Corvette")
 * @param {string|Object} shipOrId - Ship ID, full name, or ship object
 * @returns {string|null} Normalized ship folder name or null if unknown
 */
export const normalizeShipName = (shipOrId) => {
  if (shipOrId == null) {
    return null;
  }

  // Handle ship object
  if (typeof shipOrId === 'object') {
    // Try ID first, then name
    if (shipOrId.id && SHIP_ID_TO_NAME[shipOrId.id]) {
      return SHIP_ID_TO_NAME[shipOrId.id];
    }
    if (shipOrId.name) {
      return SHIP_FULL_NAME_TO_FOLDER[shipOrId.name] || null;
    }
    return null;
  }

  // Handle string input
  if (typeof shipOrId === 'string') {
    // Check if it's a ship ID
    if (SHIP_ID_TO_NAME[shipOrId]) {
      return SHIP_ID_TO_NAME[shipOrId];
    }

    // Check if it's a full ship name
    if (SHIP_FULL_NAME_TO_FOLDER[shipOrId]) {
      return SHIP_FULL_NAME_TO_FOLDER[shipOrId];
    }

    // Try to look up by ID using shipData
    const ship = getShipById(shipOrId);
    if (ship && ship.name) {
      return SHIP_FULL_NAME_TO_FOLDER[ship.name] || null;
    }

    return null;
  }

  return null;
};

// ========================================
// GET FALLBACK IMAGE PATH
// ========================================
/**
 * Gets the fallback (generic) image path for a section type
 * @param {string} normalizedSection - Normalized section type (e.g., "Bridge", "Power_Cell")
 * @returns {string|null} Fallback image path or null if unknown
 */
export const getFallbackImagePath = (normalizedSection) => {
  if (normalizedSection == null) {
    return null;
  }
  return FALLBACK_PATHS[normalizedSection] || null;
};

// ========================================
// GET SHIP SPECIFIC IMAGE PATH
// ========================================
/**
 * Constructs ship-specific image path
 * @param {string} shipName - Normalized ship folder name (e.g., "Corvette")
 * @param {string} normalizedSection - Normalized section type (e.g., "Bridge")
 * @returns {string|null} Ship-specific image path or null if inputs invalid
 */
export const getShipSpecificImagePath = (shipName, normalizedSection) => {
  if (!shipName || !normalizedSection) {
    return null;
  }
  return `/DroneWars/Ships/${shipName}/${normalizedSection}.png`;
};

// ========================================
// RESOLVE SHIP SECTION IMAGE
// ========================================
/**
 * Resolves the correct image path for a ship section based on ship type.
 * Returns ship-specific path if ship is known, otherwise returns fallback.
 * @param {string|Object} ship - Ship ID, name, or ship object
 * @param {string} sectionType - Section type or legacy key
 * @returns {string|null} Image path (ship-specific or fallback) or null if section unknown
 */
export const resolveShipSectionImage = (ship, sectionType) => {
  const normalizedSection = normalizeSectionType(sectionType);

  // If section type is unknown, return null
  if (!normalizedSection) {
    return null;
  }

  // If no ship provided, return fallback
  if (ship == null) {
    return getFallbackImagePath(normalizedSection);
  }

  const shipName = normalizeShipName(ship);

  // If ship is unknown, return fallback
  if (!shipName) {
    return getFallbackImagePath(normalizedSection);
  }

  return getShipSpecificImagePath(shipName, normalizedSection);
};

// ========================================
// RESOLVE SHIP SECTION STATS
// ========================================
/**
 * Creates a new section stats object with resolved image path.
 * Does not mutate the original stats object.
 * @param {Object} sectionStats - Original section stats from shipSectionData
 * @param {string|Object} ship - Ship ID, name, or ship object
 * @returns {Object} New stats object with resolved image property
 */
export const resolveShipSectionStats = (sectionStats, ship) => {
  // Return null/undefined as-is
  if (sectionStats == null) {
    return sectionStats;
  }

  // Get section type from stats (prefer 'type', fallback to 'key')
  const sectionType = sectionStats.type || sectionStats.key;

  // Resolve the image path
  const resolvedImage = resolveShipSectionImage(ship, sectionType);

  // If resolution failed, keep original image
  if (resolvedImage == null) {
    return { ...sectionStats };
  }

  // Return new object with resolved image
  return {
    ...sectionStats,
    image: resolvedImage
  };
};

export default resolveShipSectionImage;
