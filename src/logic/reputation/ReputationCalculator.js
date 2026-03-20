/**
 * Reputation Calculator
 *
 * Calculates reputation from event-driven sources:
 * combat wins, boss kills, PoI looting, and extraction bonuses.
 * Pure functions — no side effects, no state mutations.
 */

import { REPUTATION_EVENTS } from '../../data/reputationData.js';
import { getLevelData, getNewlyUnlockedLevels } from '../../data/reputationRewardsData.js';

/**
 * Sum the rep field from an array of reputation events
 * @param {Array} events - Array of { type, key, rep } objects
 * @returns {number} Total rep from events
 */
export function sumReputationEvents(events) {
  return events.reduce((sum, e) => sum + e.rep, 0);
}

/**
 * Calculate full reputation result for a completed run
 * @param {Array} events - Reputation events accumulated during the run
 * @param {boolean} success - Whether extraction was successful
 * @param {number} mapTier - Map tier (1, 2, or 3)
 * @param {number} currentRep - Current reputation before this run
 * @returns {Object} Complete reputation breakdown + level data
 */
export function calculateRunReputation(events, success, mapTier, currentRep) {
  const eventRep = sumReputationEvents(events);

  // Extraction bonus only on success
  const extractionBonus = success
    ? (REPUTATION_EVENTS.EXTRACTION_BONUS[mapTier] || 0)
    : 0;

  const totalRep = eventRep + extractionBonus;

  // Compute combat vs exploration breakdown
  const combatTypes = new Set(['COMBAT_WIN', 'BOSS_KILL']);
  const combatRep = events
    .filter(e => combatTypes.has(e.type))
    .reduce((sum, e) => sum + e.rep, 0);
  const explorationRep = events
    .filter(e => !combatTypes.has(e.type))
    .reduce((sum, e) => sum + e.rep, 0);

  // Level progression
  const newRep = currentRep + totalRep;
  const levelBefore = getLevelData(currentRep);
  const levelAfter = getLevelData(newRep);
  const unlockedLevels = getNewlyUnlockedLevels(currentRep, newRep);

  return {
    eventRep,
    extractionBonus,
    totalRep,
    combatRep,
    explorationRep,
    previousRep: currentRep,
    newRep,
    previousLevel: levelBefore.level,
    newLevel: levelAfter.level,
    leveledUp: levelAfter.level > levelBefore.level,
    levelsGained: levelAfter.level - levelBefore.level,
    progress: levelAfter.progress,
    unlockedLevels,
    newRewards: unlockedLevels
      .filter(l => l.reward !== null)
      .map(l => ({ level: l.level, reward: l.reward })),
  };
}

export default {
  sumReputationEvents,
  calculateRunReputation,
};
