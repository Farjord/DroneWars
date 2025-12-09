/**
 * Reputation Rewards Data
 *
 * Defines level thresholds and rewards for the reputation system.
 * Players unlock rewards as they accumulate reputation from runs.
 *
 * Players start at Level 0 and work towards Level 1, etc.
 *
 * Reward types:
 * - { type: 'pack', packType: 'ORDNANCE_PACK', tier: 1 } - Card pack reward
 * - null - No reward for this level (level 0 starting point)
 */

/**
 * Reputation levels that grant +1 extraction limit bonus (custom decks only)
 * Each level in this array adds +1 to the custom deck extraction capacity
 * Example: [3, 6, 9] means +1 at level 3, +2 at level 6, +3 at level 9
 *
 * Modify this array to adjust which reputation levels grant extraction bonuses
 */
export const EXTRACTION_LIMIT_BONUS_RANKS = [3, 6, 9];

export const REPUTATION_LEVELS = [
  // Level 0 - Starting level, no reward
  {
    level: 0,
    threshold: 0,
    reward: null,
  },

  // Level 1 - First milestone
  {
    level: 1,
    threshold: 5000,
    reward: { type: 'pack', packType: 'ORDNANCE_PACK', tier: 1 },
  },

  // Level 2
  {
    level: 2,
    threshold: 12000,
    reward: { type: 'pack', packType: 'SUPPORT_PACK', tier: 1 },
  },

  // Level 3
  {
    level: 3,
    threshold: 22000,
    reward: { type: 'pack', packType: 'TACTICAL_PACK', tier: 2 },
  },

  // Level 4
  {
    level: 4,
    threshold: 35000,
    reward: { type: 'pack', packType: 'ORDNANCE_PACK', tier: 2 },
  },

  // Level 5
  {
    level: 5,
    threshold: 52000,
    reward: { type: 'pack', packType: 'UPGRADE_PACK', tier: 2 },
  },

  // Level 6
  {
    level: 6,
    threshold: 75000,
    reward: { type: 'pack', packType: 'ORDNANCE_PACK', tier: 3 },
  },

  // Level 7
  {
    level: 7,
    threshold: 100000,
    reward: { type: 'pack', packType: 'SUPPORT_PACK', tier: 3 },
  },

  // Level 8
  {
    level: 8,
    threshold: 130000,
    reward: { type: 'pack', packType: 'TACTICAL_PACK', tier: 3 },
  },

  // Level 9
  {
    level: 9,
    threshold: 165000,
    reward: { type: 'pack', packType: 'UPGRADE_PACK', tier: 3 },
  },

  // Level 10
  {
    level: 10,
    threshold: 205000,
    reward: { type: 'pack', packType: 'ORDNANCE_PACK', tier: 3 },
  },

  // Level 11
  {
    level: 11,
    threshold: 250000,
    reward: { type: 'pack', packType: 'SUPPORT_PACK', tier: 3 },
  },

  // Level 12
  {
    level: 12,
    threshold: 300000,
    reward: { type: 'pack', packType: 'TACTICAL_PACK', tier: 3 },
  },

  // Level 13
  {
    level: 13,
    threshold: 355000,
    reward: { type: 'pack', packType: 'UPGRADE_PACK', tier: 3 },
  },

  // Level 14
  {
    level: 14,
    threshold: 415000,
    reward: { type: 'pack', packType: 'ORDNANCE_PACK', tier: 3 },
  },
];

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

export default REPUTATION_LEVELS;
