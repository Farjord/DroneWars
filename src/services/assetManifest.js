// ========================================
// ASSET MANIFEST
// ========================================
// Centralized asset path extraction for preloading
// Collects all image paths from data files and static assets

import fullDroneCollection from '../data/droneData.js';
import fullCardCollection from '../data/cardData.js';
import { shipComponentCollection } from '../data/shipSectionData.js';
import { poiTypes } from '../data/pointsOfInterestData.js';
import aiPersonalities from '../data/aiData.js';
import { BACKGROUNDS } from '../config/backgrounds.js';
import { shipCollection } from '../data/shipData.js';
import {
  SHIP_FOLDER_NAMES,
  SECTION_FILE_NAMES,
  FALLBACK_PATHS
} from '../utils/shipSectionImageResolver.js';

/**
 * Extract unique, non-null values from an array of objects
 * @param {Array} items - Array of objects
 * @param {string} key - Property key to extract
 * @returns {string[]} Unique path values
 */
const extractUniquePaths = (items, key) => {
  if (!Array.isArray(items)) return [];
  return [...new Set(
    items
      .map(item => item?.[key])
      .filter(path => typeof path === 'string' && path.length > 0)
  )];
};

// Extract paths from each data source
const droneImages = extractUniquePaths(fullDroneCollection, 'image');
const cardImages = extractUniquePaths(fullCardCollection, 'image');
const shipSectionImages = extractUniquePaths(shipComponentCollection, 'image');
const poiImages = extractUniquePaths(poiTypes, 'image');
const aiImages = extractUniquePaths(aiPersonalities, 'imagePath');
const shipImages = extractUniquePaths(shipCollection, 'image');

// Extract background paths (only static backgrounds have paths)
const backgroundImages = BACKGROUNDS
  .filter(bg => bg.type === 'static' && bg.path)
  .map(bg => bg.path);

// Generate ship-specific section images dynamically from resolver mappings
// This ensures new ships added to SHIP_FOLDER_NAMES are automatically preloaded
const dynamicShipSectionImages = SHIP_FOLDER_NAMES.flatMap(ship =>
  SECTION_FILE_NAMES.map(section => `/DroneWars/Ships/${ship}/${section}.png`)
);

// Add fallback images for sections
const fallbackSectionImages = Object.values(FALLBACK_PATHS);

// Combined ship section images (ship-specific + fallbacks)
const allShipSectionImages = [...dynamicShipSectionImages, ...fallbackSectionImages];

// Static assets not referenced in data files
// These are manually listed based on public folder contents
const staticAssets = {
  menu: [
    '/DroneWars/Menu/Eremos.png',
    '/DroneWars/Menu/VSAI.png',
    '/DroneWars/Menu/VSMultiplayer.png',
    '/DroneWars/Menu/Deck.png',
    '/DroneWars/Menu/Train.png',
    '/DroneWars/Menu/NewGame.png',
    '/DroneWars/Menu/LoadGame.png'
  ],
  hanger: [
    '/DroneWars/Hanger/Inventory.png',
    '/DroneWars/Hanger/Replicator.png',
    '/DroneWars/Hanger/Blueprints.png',
    '/DroneWars/Hanger/RepairBay.png'
  ],
  tactical: [
    '/DroneWars/Tactical/Tactical1.jpg',
    '/DroneWars/Tactical/Tactical2.jpg',
    '/DroneWars/Tactical/Tactical3.jpg',
    '/DroneWars/Tactical/Tactical4.jpg',
    '/DroneWars/Tactical/Tactical15.jpg'
  ],
  eremos: [
    '/DroneWars/Eremos/Eremos.jpg',
    '/DroneWars/Eremos/Eremos_2.jpg'
    // Note: Eremos.mp4 intentionally omitted - video streams better
  ]
};

/**
 * Categorized asset manifest
 * Each category contains an array of image paths to preload
 */
export const assetManifest = {
  drones: droneImages,
  cards: cardImages,
  shipSections: shipSectionImages,
  shipSectionImages: allShipSectionImages,
  pointsOfInterest: poiImages,
  aiPortraits: aiImages,
  backgrounds: backgroundImages,
  ships: shipImages,
  menu: staticAssets.menu,
  hanger: staticAssets.hanger,
  tactical: staticAssets.tactical,
  eremos: staticAssets.eremos
};

/**
 * Get flat list of all asset paths
 * @returns {string[]} All asset paths combined
 */
export const getAllAssetPaths = () => {
  return Object.values(assetManifest).flat();
};

/**
 * Get asset counts by category
 * @returns {Object} Counts per category plus total
 */
export const getAssetCounts = () => {
  const counts = {};
  for (const [category, paths] of Object.entries(assetManifest)) {
    counts[category] = paths.length;
  }
  counts.total = getAllAssetPaths().length;
  return counts;
};

/**
 * Category display labels for UI
 */
export const CATEGORY_LABELS = {
  drones: 'Drone Assets',
  cards: 'Card Artwork',
  shipSections: 'Ship Components',
  shipSectionImages: 'Ship Section Images',
  pointsOfInterest: 'Locations',
  aiPortraits: 'AI Profiles',
  backgrounds: 'Backgrounds',
  ships: 'Ship Models',
  menu: 'Menu Graphics',
  hanger: 'Hangar Interface',
  tactical: 'Tactical Maps',
  eremos: 'Eremos Assets'
};

export default assetManifest;
