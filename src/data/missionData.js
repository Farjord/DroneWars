/**
 * Mission Data
 * Configurable missions with conditions, rewards, and prerequisites
 *
 * This file defines all missions in the game, including:
 * - Introduction missions that guide new players through game screens
 * - Combat missions for defeating enemies
 * - Extraction missions for completing runs
 * - Collection missions for gathering resources
 */

// ========================================
// MISSION CATEGORIES
// ========================================

export const MISSION_CATEGORIES = {
  INTRO: 'intro',           // Introduction/tutorial missions
  COMBAT: 'combat',         // Combat-based missions
  EXTRACTION: 'extraction', // Extraction-based missions
  COLLECTION: 'collection', // Collection-based missions
};

// ========================================
// MISSION CONDITIONS
// ========================================

export const MISSION_CONDITIONS = {
  // Screen visit conditions (for intro missions)
  VISIT_SCREEN: 'VISIT_SCREEN',

  // Combat conditions
  WIN_COMBATS: 'WIN_COMBATS',
  DESTROY_DRONES: 'DESTROY_DRONES',
  DEAL_DAMAGE: 'DEAL_DAMAGE',
  WIN_WITHOUT_LOSING_DRONE: 'WIN_WITHOUT_LOSING_DRONE',

  // Extraction conditions
  COMPLETE_EXTRACTIONS: 'COMPLETE_EXTRACTIONS',
  EXTRACT_WITH_FULL_LOOT: 'EXTRACT_WITH_FULL_LOOT',
  VISIT_POI: 'VISIT_POI',

  // Collection conditions
  COLLECT_CARDS: 'COLLECT_CARDS',
  COLLECT_CREDITS: 'COLLECT_CREDITS',
  CRAFT_ITEM: 'CRAFT_ITEM',
};

// ========================================
// MISSION DEFINITIONS
// ========================================

export const MISSIONS = [
  // ========================================
  // INTRO MISSIONS (Guide player through screens)
  // ========================================
  {
    id: 'intro_inventory',
    category: MISSION_CATEGORIES.INTRO,
    title: 'Survey Your Supplies',
    description: 'Visit the Inventory to review your collected cards, drones, and equipment. Your inventory stores everything you acquire during salvage runs - knowing what you have is the first step to survival.',
    condition: {
      type: MISSION_CONDITIONS.VISIT_SCREEN,
      screen: 'inventory',
    },
    reward: { credits: 50 },
    prerequisites: [],
    isIntroMission: true,
    sortOrder: 1,
  },
  {
    id: 'intro_blueprints',
    category: MISSION_CATEGORIES.INTRO,
    title: 'Discover Blueprints',
    description: 'Visit the Blueprints screen to see schematics available for crafting. Blueprints allow you to manufacture powerful new equipment - essential for tackling higher-tier zones.',
    condition: {
      type: MISSION_CONDITIONS.VISIT_SCREEN,
      screen: 'blueprints',
    },
    reward: { credits: 50 },
    prerequisites: [],
    isIntroMission: true,
    sortOrder: 2,
  },
  {
    id: 'intro_replicator',
    category: MISSION_CATEGORIES.INTRO,
    title: 'Initialize the Replicator',
    description: 'Visit the Replicator to duplicate exiting cards. The Replicator converts raw materials into valuable equipment - a key part of your progression.',
    condition: {
      type: MISSION_CONDITIONS.VISIT_SCREEN,
      screen: 'replicator',
    },
    reward: { credits: 50 },
    prerequisites: [],
    isIntroMission: true,
    sortOrder: 3,
  },
  {
    id: 'intro_shop',
    category: MISSION_CATEGORIES.INTRO,
    title: 'Browse the Market',
    description: 'Visit the Shop to purchase card packs and tactical items. Spending credits wisely here can give you the edge you need for difficult encounters.',
    condition: {
      type: MISSION_CONDITIONS.VISIT_SCREEN,
      screen: 'shop',
    },
    reward: { credits: 75 },
    prerequisites: [],
    isIntroMission: true,
    sortOrder: 4,
  },
  {
    id: 'intro_repairBay',
    category: MISSION_CATEGORIES.INTRO,
    title: 'Inspect the Repair Bay',
    description: 'Visit the Repair Bay to restore damaged drones and ship components. Combat takes its toll - keeping your fleet in fighting condition is critical for sustained operations.',
    condition: {
      type: MISSION_CONDITIONS.VISIT_SCREEN,
      screen: 'repairBay',
    },
    reward: { credits: 50 },
    prerequisites: [],
    isIntroMission: true,
    sortOrder: 5,
  },
  {
    id: 'intro_deckBuilder',
    category: MISSION_CATEGORIES.INTRO,
    title: 'Configure Your Loadout',
    description: 'Buy your first Ship Slot and then enter the Deck Builder to customise your ship\'s deck and drone lineup. The more valuable your ship, the more reputation you earn.',
    condition: {
      type: MISSION_CONDITIONS.VISIT_SCREEN,
      screen: 'deckBuilder',
    },
    reward: { credits: 100 },
    prerequisites: [],
    isIntroMission: true,
    sortOrder: 6,
  },

  // ========================================
  // COMBAT MISSIONS
  // ========================================
  {
    id: 'combat_first_victory',
    category: MISSION_CATEGORIES.COMBAT,
    title: 'First Blood',
    description: 'Win your first combat encounter. Every prospector has to start somewhere.',
    condition: {
      type: MISSION_CONDITIONS.WIN_COMBATS,
      count: 1,
    },
    reward: { credits: 100 },
    prerequisites: ['extraction_first'],
    isIntroMission: false,
    sortOrder: 10,
  },
  {
    id: 'combat_veteran',
    category: MISSION_CATEGORIES.COMBAT,
    title: 'Veteran Pilot',
    description: 'Win 10 combat encounters. Experience is the best teacher in the Eremos - those who survive learn quickly.',
    condition: {
      type: MISSION_CONDITIONS.WIN_COMBATS,
      count: 10,
    },
    reward: { credits: 300 },
    prerequisites: ['combat_first_victory'],
    isIntroMission: false,
    sortOrder: 11,
  },
  {
    id: 'combat_drone_hunter',
    category: MISSION_CATEGORIES.COMBAT,
    title: 'Drone Hunter',
    description: 'Destroy 25 enemy drones across all encounters. The automated defenders of the Eremos are relentless - be more so.',
    condition: {
      type: MISSION_CONDITIONS.DESTROY_DRONES,
      count: 25,
    },
    reward: { credits: 250 },
    prerequisites: ['combat_first_victory'],
    isIntroMission: false,
    sortOrder: 12,
  },
  {
    id: 'combat_ace',
    category: MISSION_CATEGORIES.COMBAT,
    title: 'Combat Ace',
    description: 'Win 25 combat encounters. Your reputation precedes you now - hostiles should fear your approach.',
    condition: {
      type: MISSION_CONDITIONS.WIN_COMBATS,
      count: 25,
    },
    reward: { credits: 500 },
    prerequisites: ['combat_veteran'],
    isIntroMission: false,
    sortOrder: 13,
  },

  // ========================================
  // EXTRACTION MISSIONS
  // ========================================
  {
    id: 'extraction_first',
    category: MISSION_CATEGORIES.EXTRACTION,
    title: 'Safe Return',
    description: 'Successfully extract from the Eremos for the first time. Getting in is easy - getting out alive is the challenge.',
    condition: {
      type: MISSION_CONDITIONS.COMPLETE_EXTRACTIONS,
      count: 1,
    },
    reward: { credits: 150 },
    prerequisites: [],
    isIntroMission: false,
    sortOrder: 20,
  },
  {
    id: 'extraction_seasoned',
    category: MISSION_CATEGORIES.EXTRACTION,
    title: 'Seasoned Explorer',
    description: 'Complete 5 successful extractions. You\'re starting to know your way around the Eremos.',
    condition: {
      type: MISSION_CONDITIONS.COMPLETE_EXTRACTIONS,
      count: 5,
    },
    reward: { credits: 400 },
    prerequisites: ['extraction_first'],
    isIntroMission: false,
    sortOrder: 21,
  },
  {
    id: 'extraction_explorer',
    category: MISSION_CATEGORIES.EXTRACTION,
    title: 'Deep Explorer',
    description: 'Complete 15 successful extractions. Few pilots have ventured as far into the Eremos as you.',
    condition: {
      type: MISSION_CONDITIONS.COMPLETE_EXTRACTIONS,
      count: 15,
    },
    reward: { credits: 750 },
    prerequisites: ['extraction_seasoned'],
    isIntroMission: false,
    sortOrder: 22,
  },
  {
    id: 'extraction_poi_hunter',
    category: MISSION_CATEGORIES.EXTRACTION,
    title: 'Point of Interest',
    description: 'Visit and loot 10 Points of Interest. The best salvage is often found off the beaten path.',
    condition: {
      type: MISSION_CONDITIONS.VISIT_POI,
      count: 10,
    },
    reward: { credits: 300 },
    prerequisites: ['extraction_first'],
    isIntroMission: false,
    sortOrder: 23,
  },

  // ========================================
  // COLLECTION MISSIONS
  // ========================================
  {
    id: 'collection_scavenger',
    category: MISSION_CATEGORIES.COLLECTION,
    title: 'Scavenger',
    description: 'Accumulate 1,000 credits total (lifetime earnings). Credits keep you flying - every bit of salvage counts.',
    condition: {
      type: MISSION_CONDITIONS.COLLECT_CREDITS,
      count: 1000,
    },
    reward: { credits: 200 },
    prerequisites: ['extraction_first'],
    isIntroMission: false,
    sortOrder: 30,
  },
  {
    id: 'collection_wealthy',
    category: MISSION_CATEGORIES.COLLECTION,
    title: 'Prosperous Pilot',
    description: 'Accumulate 5,000 credits total (lifetime earnings). Your operations are becoming profitable.',
    condition: {
      type: MISSION_CONDITIONS.COLLECT_CREDITS,
      count: 5000,
    },
    reward: { credits: 400 },
    prerequisites: ['collection_scavenger'],
    isIntroMission: false,
    sortOrder: 31,
  },
  {
    id: 'collection_crafter',
    category: MISSION_CATEGORIES.COLLECTION,
    title: 'First Craft',
    description: 'Craft your first item using the Replicator. Self-sufficiency is key to long-term survival.',
    condition: {
      type: MISSION_CONDITIONS.CRAFT_ITEM,
      count: 1,
    },
    reward: { credits: 150 },
    prerequisites: ['extraction_first'],
    isIntroMission: false,
    sortOrder: 32,
  },
];

// ========================================
// RE-EXPORTS: Logic functions moved to src/logic/missions/missionHelpers.js
// Kept here for backward compatibility
// ========================================
export { getMissionById, getIntroMissions, getMissionsByCategory } from '../logic/missions/missionHelpers.js';

export default MISSIONS;
