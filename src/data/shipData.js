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
    baseHull: 15,
    baseShields: 3,
    baseThresholds: {
      damaged: 10,
      critical: 5
    },

    // DECK COMPOSITION LIMITS
    // Controls how many cards of each type can be in the deck
    deckLimits: {
      totalCards: 60,
      ordnanceLimit: 20,
      tacticLimit: 20,
      supportLimit: 20,
      upgradeLimit: 10
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
    description: 'Leightweight reconnocence craft.',
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

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get a ship card by its ID
 * @param {string} shipId - The ship ID (e.g., 'SHIP_001')
 * @returns {Object|null} The ship card or null if not found
 */
export const getShipById = (shipId) =>
  shipCollection.find(ship => ship.id === shipId) || null;

/**
 * Get all available ship cards
 * @returns {Array} Array of all ship cards
 */
export const getAllShips = () => shipCollection;

/**
 * The default ship ID used for backward compatibility
 */
export const DEFAULT_SHIP_ID = 'SHIP_001';

/**
 * Get the default ship card
 * @returns {Object} The default ship card (Reconnaissance Corvette)
 */
export const getDefaultShip = () => getShipById(DEFAULT_SHIP_ID);

export { shipCollection };
export default shipCollection;
