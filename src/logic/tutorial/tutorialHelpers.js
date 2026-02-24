/**
 * Tutorial Helpers
 * Logic functions for querying tutorial data
 * Extracted from src/data/tutorialData.js (Phase D refactor)
 */

import { TUTORIALS, TUTORIAL_SCREENS } from '../../data/tutorialData.js';

/**
 * Get tutorial content by screen ID
 * @param {string} screenId - Screen ID from TUTORIAL_SCREENS
 * @returns {Object|undefined} Tutorial content or undefined if not found
 */
export function getTutorialByScreen(screenId) {
  return TUTORIALS[screenId];
}

/**
 * Get all tutorial screen IDs
 * @returns {Array} Array of screen IDs
 */
export function getAllTutorialScreenIds() {
  return Object.values(TUTORIAL_SCREENS);
}

/**
 * Create default tutorial dismissal state (all false)
 * @returns {Object} Default dismissal state object
 */
export function createDefaultTutorialDismissals() {
  const dismissals = {};
  Object.values(TUTORIAL_SCREENS).forEach(screenId => {
    dismissals[screenId] = false;
  });
  return dismissals;
}
