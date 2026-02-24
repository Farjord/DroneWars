/**
 * Reputation Rewards Helpers
 *
 * Logic functions for querying reputation level data.
 * Extracted from reputationRewardsData.js to separate data from logic.
 */

import { REPUTATION_LEVELS } from '../../data/reputationRewardsData.js';

/**
 * Get the level data for a given reputation amount
 * @param {number} reputation - Current reputation points
 * @returns {Object} Level data including level number and progress
 */
export function getLevelData(reputation) {
  let currentLevel = REPUTATION_LEVELS[0];
  let nextLevel = REPUTATION_LEVELS[1] || null;

  for (let i = 0; i < REPUTATION_LEVELS.length; i++) {
    if (reputation >= REPUTATION_LEVELS[i].threshold) {
      currentLevel = REPUTATION_LEVELS[i];
      nextLevel = REPUTATION_LEVELS[i + 1] || null;
    } else {
      break;
    }
  }

  // Calculate progress to next level
  let progress = 1; // Default to 100% if at max level
  let currentInLevel = 0;
  let requiredForNext = 0;

  if (nextLevel) {
    const levelStart = currentLevel.threshold;
    const levelEnd = nextLevel.threshold;
    currentInLevel = reputation - levelStart;
    requiredForNext = levelEnd - levelStart;
    progress = currentInLevel / requiredForNext;
  }

  return {
    level: currentLevel.level,
    currentRep: reputation,
    levelStart: currentLevel.threshold,
    nextLevelThreshold: nextLevel ? nextLevel.threshold : null,
    progress,
    currentInLevel,
    requiredForNext,
    isMaxLevel: !nextLevel,
  };
}

/**
 * Get all levels that would be unlocked by gaining reputation
 * @param {number} oldRep - Reputation before gain
 * @param {number} newRep - Reputation after gain
 * @returns {Array} Array of level data for newly unlocked levels
 */
export function getNewlyUnlockedLevels(oldRep, newRep) {
  const unlockedLevels = [];

  for (const levelData of REPUTATION_LEVELS) {
    // Skip level 0 (no reward) and levels already passed
    if (levelData.level === 0 || levelData.threshold <= oldRep) {
      continue;
    }

    // Check if this level was crossed
    if (levelData.threshold <= newRep) {
      unlockedLevels.push(levelData);
    }
  }

  return unlockedLevels;
}
