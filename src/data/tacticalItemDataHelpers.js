/**
 * Tactical Item Data Helpers
 *
 * Logic functions for querying tactical item data.
 * Extracted from tacticalItemData.js to separate data from logic.
 */

import { tacticalItemCollection } from './tacticalItemData.js';

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
