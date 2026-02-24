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
    cost: 300,
    maxCapacity: 2,
    image: '/DroneWars/Items/evade.png',
    description: 'Skip an encounter without combat or damage.',
    effectDescription: 'Instantly evade the current encounter.'
  },
  {
    id: 'ITEM_EXTRACT',
    name: 'Clearance Override',
    type: 'extract',
    cost: 500,
    maxCapacity: 1,
    image: '/DroneWars/Items/extract.png',
    description: 'Bypass extraction blockade checks.',
    effectDescription: 'Extract without rolling for blockade.'
  },
  {
    id: 'ITEM_THREAT_REDUCE',
    name: 'Signal Dampener',
    type: 'threatReduce',
    cost: 50,
    maxCapacity: 5,
    image: '/DroneWars/Items/threat.png',
    description: 'Reduce current detection level.',
    effectDescription: 'Reduce detection by random amount.',
    effectValueMin: 5,   // Minimum reduction (percentage points)
    effectValueMax: 15   // Maximum reduction (percentage points)
  }
];

// Backward-compatible re-exports (logic moved to tacticalItemDataHelpers)
export { getTacticalItemById, getTacticalItemsByType, getAllTacticalItemIds } from './tacticalItemDataHelpers.js';

export default tacticalItemCollection;
