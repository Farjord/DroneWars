/**
 * Mission Helpers
 * Logic functions for querying mission data
 * Extracted from src/data/missionData.js (Phase D refactor)
 */

import { MISSIONS } from '../../data/missionData.js';

/**
 * Get mission by ID
 * @param {string} id - Mission ID
 * @returns {Object|undefined} Mission object or undefined if not found
 */
export function getMissionById(id) {
  if (!id) return undefined;
  return MISSIONS.find(m => m.id === id);
}

/**
 * Get all intro missions, sorted by sortOrder
 * @returns {Array} Array of intro missions
 */
export function getIntroMissions() {
  return MISSIONS
    .filter(m => m.isIntroMission === true)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get missions by category
 * @param {string} category - Category from MISSION_CATEGORIES
 * @returns {Array} Array of missions in that category
 */
export function getMissionsByCategory(category) {
  return MISSIONS.filter(m => m.category === category);
}
