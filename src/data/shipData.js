// ========================================
// SHIP CARD DATA
// ========================================
// Ship cards define baseline stats for the player's vessel.
// Ship Sections provide modifiers to these baselines.
// Final values: Ship.base + Section.modifier

const shipCollection = [
  {
    id: 'SHIP_001',
    name: 'Reconnaissance Corvette',
    rarity: 'Common',
    faction: null,
    description: 'A balanced ship designed for reconnaissance operations. Well-suited for any strategy.',
    image: '/DroneWars/Ships/corvette.png',

    // BASELINE COMBAT VALUES
    // These are the default values for all ship sections
    baseHull: 10,
    baseShields: 3,
    baseThresholds: {
      damaged: 6,
      critical: 3
    },

    // DECK COMPOSITION LIMITS
    // Controls how many cards of each type can be in the deck
    deckLimits: {
      totalCards: 40,
      ordnanceLimit: 15,
      tacticLimit: 15,
      supportLimit: 15,
      upgradeLimit: 6
    },

    // FUTURE PROPERTIES (not yet implemented)
    factionCardAllowances: {},
    shipBonus: null,
    shipAbility: null
  },

  {
    id: 'SHIP_002',
    name: 'Heavy Assault Carrier',
    rarity: 'Uncommon',
    faction: null,
    description: 'A heavily armored vessel optimized for direct assault. High durability with focus on damage-dealing cards.',
    image: '/DroneWars/Ships/carrier.png',

    // BASELINE COMBAT VALUES
    baseHull: 12,
    baseShields: 2,
    baseThresholds: {
      damaged: 5,
      critical: 2
    },

    // DECK COMPOSITION LIMITS
    deckLimits: {
      totalCards: 40,
      ordnanceLimit: 20,
      tacticLimit: 10,
      supportLimit: 15,
      upgradeLimit: 5
    },

    // FUTURE PROPERTIES
    factionCardAllowances: {},
    shipBonus: null,
    shipAbility: null
  },

  {
    id: 'SHIP_003',
    name: 'Scout',
    rarity: 'Common',
    faction: null,
    description: 'Lightweight reconnaissance craft.',
    image: '/DroneWars/Ships/Scout.png',

    // BASELINE COMBAT VALUES
    baseHull: 5,
    baseShields: 2,
    baseThresholds: {
      damaged: 3,
      critical: 0
    },

    // DECK COMPOSITION LIMITS
    deckLimits: {
      totalCards: 40,
      ordnanceLimit: 15,
      tacticLimit: 15,
      supportLimit: 15,
      upgradeLimit: 5
    },

    // FUTURE PROPERTIES
    factionCardAllowances: {},
    shipBonus: null,
    shipAbility: null
  }

];

// Backward-compatible re-exports (logic moved to shipDataHelpers)
export { getShipById, getAllShips, getDefaultShip, DEFAULT_SHIP_ID } from './shipDataHelpers.js';

export { shipCollection };
export default shipCollection;
