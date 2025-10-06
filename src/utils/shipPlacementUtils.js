// ========================================
// SHIP PLACEMENT UTILITIES
// ========================================
// Standalone utility functions for ship placement phase logic
// Handles initialization and management of ship section placement data

import { debugLog } from './debugLogger.js';

/**
 * Initialize ship placement data for the beginning of a game
 * @returns {Object} Object containing placement state data
 */
export const initializeShipPlacement = () => {
  // Standard ship sections available for placement
  const availableSections = ['bridge', 'powerCell', 'droneControlHub'];

  debugLog('PLACEMENT', `🚢 Initialized ship placement: ${availableSections.length} sections available`);
  debugLog('PLACEMENT', `🎯 Available sections: ${availableSections.join(', ')}`);

  return {
    unplacedSections: [...availableSections],
    placedSections: Array(3).fill(null),
    opponentPlacedSections: Array(3).fill(null)
  };
};

/**
 * Reset placement state for a new game
 * @returns {Object} Object containing reset placement state
 */
export const resetPlacementState = () => {
  debugLog('PLACEMENT', '🔄 Resetting ship placement state');
  return initializeShipPlacement();
};

/**
 * Validate that placement is complete
 * @param {Array} placedSections - Current placed sections array
 * @param {Array} unplacedSections - Current unplaced sections array
 * @returns {boolean} True if placement is valid and complete
 */
export const validatePlacement = (placedSections, unplacedSections) => {
  if (!placedSections || !unplacedSections) {
    return false;
  }

  // Check that all sections are placed (no nulls in placedSections)
  const allPlaced = placedSections.every(section => section !== null && section !== undefined);

  // Check that no sections remain unplaced
  const noneUnplaced = unplacedSections.length === 0;

  // Check that we have exactly 3 sections placed
  const correctCount = placedSections.length === 3;

  const isValid = allPlaced && noneUnplaced && correctCount;

  if (!isValid) {
    console.warn(`⚠️ Invalid placement: placed=${placedSections.length}, unplaced=${unplacedSections.length}, allPlaced=${allPlaced}`);
  }

  return isValid;
};

/**
 * Get available ship sections list
 * @returns {Array} Array of available ship section names
 */
export const getAvailableShipSections = () => {
  return ['bridge', 'powerCell', 'droneControlHub'];
};

/**
 * Check if a section name is valid
 * @param {string} sectionName - Name of the section to validate
 * @returns {boolean} True if section name is valid
 */
export const isValidShipSection = (sectionName) => {
  return getAvailableShipSections().includes(sectionName);
};

/**
 * Validate ship placement data structure
 * @param {Object} placementData - Placement data object to validate
 * @returns {boolean} True if data structure is valid
 */
export const validatePlacementData = (placementData) => {
  if (!placementData || typeof placementData !== 'object') {
    return false;
  }

  const { unplacedSections, placedSections, opponentPlacedSections } = placementData;

  // Check that all required properties exist and are arrays
  if (!Array.isArray(unplacedSections) ||
      !Array.isArray(placedSections) ||
      !Array.isArray(opponentPlacedSections)) {
    return false;
  }

  // Check that placedSections arrays have correct length
  if (placedSections.length !== 3 || opponentPlacedSections.length !== 3) {
    return false;
  }

  // Check that unplaced sections are valid section names
  const validSections = getAvailableShipSections();
  const invalidUnplaced = unplacedSections.some(section =>
    section && !validSections.includes(section)
  );

  if (invalidUnplaced) {
    return false;
  }

  // Check that placed sections are valid section names (or null)
  const allPlaced = [...placedSections, ...opponentPlacedSections];
  const invalidPlaced = allPlaced.some(section =>
    section && !validSections.includes(section)
  );

  return !invalidPlaced;
};