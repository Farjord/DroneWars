/**
 * Ship Data Helpers
 *
 * Logic functions for querying ship data.
 * Extracted from shipData.js to separate data from logic.
 */

import { shipCollection } from './shipData.js';

/**
 * The default ship ID used for backward compatibility
 */
export const DEFAULT_SHIP_ID = 'SHIP_001';

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
 * Get the default ship card
 * @returns {Object} The default ship card (Reconnaissance Corvette)
 */
export const getDefaultShip = () => getShipById(DEFAULT_SHIP_ID);
