/**
 * Tactical Item Data
 * Defines consumable items for use on the tactical map
 */

/**
 * Collection of all tactical items
 * Each item can be purchased in the shop and used during tactical map runs
 */
export const tacticalItemCollection = [
  {
    id: 'ITEM_EVADE',
    name: 'Emergency Jammer',
    type: 'evade',
    cost: 1500,
    maxCapacity: 3,
    image: '/DroneWars/Items/evade.png',
    description: 'Skip an encounter without combat or damage.',
    effectDescription: 'Instantly evade the current encounter.'
  },
  {
    id: 'ITEM_EXTRACT',
    name: 'Clearance Override',
    type: 'extract',
    cost: 2000,
    maxCapacity: 2,
    image: '/DroneWars/Items/extract.png',
    description: 'Bypass extraction blockade checks.',
    effectDescription: 'Extract without rolling for blockade.'
  },
  {
    id: 'ITEM_THREAT_REDUCE',
    name: 'Signal Dampener',
    type: 'threatReduce',
    cost: 1000,
    maxCapacity: 5,
    image: '/DroneWars/Items/threat.png',
    description: 'Reduce current detection level.',
    effectDescription: 'Reduce detection by configured amount.',
    effectValue: 20  // Configurable reduction amount (percentage points)
  }
];

/**
 * Get a tactical item by its ID
 * @param {string} id - The item ID (e.g., 'ITEM_EVADE')
 * @returns {Object|undefined} The item object or undefined if not found
 */
export const getTacticalItemById = (id) =>
  tacticalItemCollection.find(item => item.id === id);

/**
 * Get all tactical items of a specific type
 * @param {string} type - The item type (e.g., 'evade', 'extract', 'threatReduce')
 * @returns {Array} Array of items matching the type
 */
export const getTacticalItemsByType = (type) =>
  tacticalItemCollection.filter(item => item.type === type);

/**
 * Get all tactical item IDs
 * @returns {Array<string>} Array of all item IDs
 */
export const getAllTacticalItemIds = () =>
  tacticalItemCollection.map(item => item.id);

export default tacticalItemCollection;
