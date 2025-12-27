/**
 * ReputationService.js
 * Centralized reputation management service
 * Handles awarding reputation and claiming rewards
 */

import gameStateManager from '../../managers/GameStateManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import { calculateReputationResult, calculateLoadoutValue } from './ReputationCalculator.js';
import { REPUTATION } from '../../data/reputationData.js';
import { getLevelData, REPUTATION_LEVELS, EXTRACTION_LIMIT_BONUS_RANKS, getNewlyUnlockedLevels } from '../../data/reputationRewardsData.js';

class ReputationService {
  /**
   * Get current reputation state
   * @returns {Object} Reputation state { current, level, unclaimedRewards }
   */
  getReputation() {
    const profile = gameStateManager.getState().singlePlayerProfile;
    if (!profile || !profile.reputation) {
      return { current: 0, level: 1, unclaimedRewards: [] };
    }
    return profile.reputation;
  }

  /**
   * Get detailed level data for current reputation
   * @returns {Object} Level data including progress
   */
  getLevelData() {
    const rep = this.getReputation();
    return getLevelData(rep.current);
  }

  /**
   * Get list of unclaimed rewards
   * @returns {Array} Array of reward objects with level info
   */
  getUnclaimedRewards() {
    const rep = this.getReputation();
    const rewards = [];

    for (const levelNum of rep.unclaimedRewards) {
      const levelData = REPUTATION_LEVELS.find(l => l.level === levelNum);
      if (levelData && levelData.reward) {
        rewards.push({
          level: levelNum,
          reward: levelData.reward,
        });
      }
    }

    return rewards;
  }

  /**
   * Check if there are unclaimed rewards
   * @returns {boolean}
   */
  hasUnclaimedRewards() {
    const rep = this.getReputation();
    return rep.unclaimedRewards && rep.unclaimedRewards.length > 0;
  }

  /**
   * Award reputation for a completed run
   * @param {Object} shipSlot - The ship slot used for the run
   * @param {number} tier - Map tier (1, 2, or 3)
   * @param {boolean} success - Whether extraction was successful
   * @param {number} combatReputation - Total combat rep earned during run (default: 0)
   * @returns {Object} Result including rep gained and level changes
   */
  awardReputation(shipSlot, tier, success, combatReputation = 0) {
    const state = gameStateManager.getState();
    const profile = state.singlePlayerProfile;

    if (!profile) {
      debugLog('REPUTATION', 'Award failed: No profile found');
      return { success: false, error: 'No player profile found' };
    }

    // Ensure reputation object exists
    if (!profile.reputation) {
      profile.reputation = { current: 0, level: 1, unclaimedRewards: [] };
    }

    const currentRep = profile.reputation.current;

    // Calculate loadout-based reputation (existing system)
    const loadoutResult = calculateReputationResult(shipSlot, tier, success, currentRep);

    // Add combat reputation (new system)
    // Combat rep is reduced by 25% on MIA (same as loadout rep)
    const finalCombatRep = success
      ? combatReputation
      : Math.floor(combatReputation * REPUTATION.MIA_MULTIPLIER);

    // Total rep gain = loadout rep + combat rep
    const totalRepGain = loadoutResult.repGained + finalCombatRep;
    const newRep = currentRep + totalRepGain;

    // Get level data before and after total rep gain
    const levelBefore = getLevelData(currentRep);
    const levelAfter = getLevelData(newRep);

    // Get newly unlocked levels (for rewards)
    const unlockedLevels = getNewlyUnlockedLevels(currentRep, newRep);

    // Skip if starter deck (no rep gain)
    if (loadoutResult.loadout.isStarterDeck) {
      debugLog('REPUTATION', 'Starter deck used - no reputation awarded');
      return {
        success: true,
        repGained: 0,
        loadoutRepGained: 0,
        combatRepGained: 0,
        isStarterDeck: true,
        ...loadoutResult,
      };
    }

    // Update profile
    profile.reputation.current = newRep;
    profile.reputation.level = levelAfter.level;

    // Add newly unlocked levels to unclaimed rewards
    for (const unlockedLevel of unlockedLevels) {
      if (unlockedLevel.reward && !profile.reputation.unclaimedRewards.includes(unlockedLevel.level)) {
        profile.reputation.unclaimedRewards.push(unlockedLevel.level);
      }
    }

    // Update state
    gameStateManager.setState({
      singlePlayerProfile: { ...profile }
    });

    debugLog('REPUTATION', `Awarded ${totalRepGain} reputation (Loadout: ${loadoutResult.repGained}, Combat: ${finalCombatRep}). ` +
      `Total: ${currentRep} → ${newRep}. ` +
      `Level: ${levelBefore.level} → ${levelAfter.level}. ` +
      `New rewards: ${unlockedLevels.filter(l => l.reward).length}`);

    return {
      success: true,
      repGained: totalRepGain,
      loadoutRepGained: loadoutResult.repGained,
      combatRepGained: finalCombatRep,
      previousRep: currentRep,
      newRep,
      previousLevel: levelBefore.level,
      newLevel: levelAfter.level,
      leveledUp: levelAfter.level > levelBefore.level,
      levelsGained: levelAfter.level - levelBefore.level,
      progress: levelAfter.progress,
      currentInLevel: levelAfter.currentInLevel,
      requiredForNext: levelAfter.requiredForNext,
      nextLevelThreshold: levelAfter.nextLevelThreshold,
      unlockedLevels,
      newRewards: unlockedLevels.filter(l => l.reward !== null).map(l => ({
        level: l.level,
        reward: l.reward,
      })),
      loadout: loadoutResult.loadout,
      tierCap: loadoutResult.tierCap,
      wasCapped: loadoutResult.wasCapped,
      multiplier: loadoutResult.multiplier,
    };
  }

  /**
   * Claim a specific reward by level
   * @param {number} level - The level reward to claim
   * @returns {Object} Result including the reward claimed
   */
  claimReward(level) {
    const state = gameStateManager.getState();
    const profile = state.singlePlayerProfile;

    if (!profile || !profile.reputation) {
      debugLog('REPUTATION', 'Claim failed: No profile or reputation found');
      return { success: false, error: 'No player profile found' };
    }

    const unclaimedIndex = profile.reputation.unclaimedRewards.indexOf(level);
    if (unclaimedIndex === -1) {
      debugLog('REPUTATION', `Claim failed: Level ${level} not in unclaimed rewards`);
      return { success: false, error: 'Reward not available' };
    }

    // Get the reward data
    const levelData = REPUTATION_LEVELS.find(l => l.level === level);
    if (!levelData || !levelData.reward) {
      debugLog('REPUTATION', `Claim failed: No reward defined for level ${level}`);
      return { success: false, error: 'No reward for this level' };
    }

    // Remove from unclaimed
    profile.reputation.unclaimedRewards.splice(unclaimedIndex, 1);

    // Update state
    gameStateManager.setState({
      singlePlayerProfile: { ...profile }
    });

    debugLog('REPUTATION', `Claimed reward for level ${level}: ${JSON.stringify(levelData.reward)}`);

    return {
      success: true,
      level,
      reward: levelData.reward,
    };
  }

  /**
   * Claim all unclaimed rewards
   * @returns {Object} Result including all rewards claimed
   */
  claimAllRewards() {
    const state = gameStateManager.getState();
    const profile = state.singlePlayerProfile;

    if (!profile || !profile.reputation) {
      debugLog('REPUTATION', 'Claim all failed: No profile or reputation found');
      return { success: false, error: 'No player profile found', rewards: [] };
    }

    const rewards = [];
    const levelsToClaim = [...profile.reputation.unclaimedRewards];

    for (const level of levelsToClaim) {
      const levelData = REPUTATION_LEVELS.find(l => l.level === level);
      if (levelData && levelData.reward) {
        rewards.push({
          level,
          reward: levelData.reward,
        });
      }
    }

    // Clear unclaimed rewards
    profile.reputation.unclaimedRewards = [];

    // Update state
    gameStateManager.setState({
      singlePlayerProfile: { ...profile }
    });

    debugLog('REPUTATION', `Claimed ${rewards.length} rewards`);

    return {
      success: true,
      rewards,
    };
  }

  /**
   * Preview reputation gain without awarding (for UI display)
   * @param {Object} shipSlot - The ship slot to preview
   * @param {number} tier - Map tier
   * @param {boolean} success - Whether to calculate for success or failure
   * @returns {Object} Preview of reputation gain
   */
  previewReputation(shipSlot, tier, success = true) {
    const rep = this.getReputation();
    return calculateReputationResult(shipSlot, tier, success, rep.current);
  }

  /**
   * Get loadout value breakdown for a ship slot
   * @param {Object} shipSlot - The ship slot to evaluate
   * @returns {Object} Loadout value breakdown
   */
  getLoadoutValue(shipSlot) {
    return calculateLoadoutValue(shipSlot);
  }

  /**
   * Get extraction limit bonus based on reputation level
   * Counts how many bonus rank thresholds have been reached
   * @returns {number} Bonus extraction slots from reputation milestones (0 or more)
   */
  getExtractionBonus() {
    const levelData = this.getLevelData();
    const bonusRanks = EXTRACTION_LIMIT_BONUS_RANKS || [];
    return bonusRanks.filter(rank => levelData.level >= rank).length;
  }
}

export default new ReputationService();
